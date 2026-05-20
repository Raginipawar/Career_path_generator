import time
import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from models import (
    RagGenerateRequest, RagGenerateResponse,
    EmbedRequest, EmbedResponse,
    HealthResponse,
    RoadmapNode, RoadmapEdge, AlternativePath,
    EmotionalForecast, AuditScore,
)
from rag.embedder import get_model, get_collection, add_documents, get_doc_count
from rag.retriever import retrieve_career_docs
from rag.generator import generate_roadmap, generate_audit, generate_suggestions, is_groq_available, get_fallback_roadmap, get_fallback_audit
from rag.cache import get_cached_response, set_cached_response, is_connected as redis_connected

settings = get_settings()


# ──────────────────────────────────────────────
# App lifespan — preload models on startup
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("Starting RAG Service...")
    print("=" * 50)

    # Preload embedding model (takes a few seconds)
    get_model()

    # Initialize ChromaDB collection
    get_collection()

    # Auto-embed docs if collection is empty
    if get_doc_count() == 0:
        print("Collection is empty — auto-embedding career docs...")
        data_dir = os.path.join(os.path.dirname(__file__), "data", "processed")
        all_ids, all_texts, all_metas = [], [], []
        for fname in sorted(os.listdir(data_dir)):
            if not fname.endswith(".json"):
                continue
            try:
                with open(os.path.join(data_dir, fname), "r", encoding="utf-8") as f:
                    raw = json.load(f)
                docs = raw if isinstance(raw, list) else raw.get("documents", [])
                for doc in docs:
                    if not all(k in doc for k in ("doc_id", "text", "metadata")):
                        continue
                    text = doc["text"]
                    if isinstance(text, list):
                        text = " ".join(str(t) for t in text)
                    all_ids.append(doc["doc_id"])
                    all_texts.append(str(text))
                    all_metas.append(doc["metadata"])
                print(f"  Loaded {len(docs)} docs from {fname}")
            except Exception as e:
                print(f"  Skipping {fname}: {e}")
        if all_ids:
            added = add_documents(all_ids, all_texts, all_metas)
            print(f"Auto-embed complete. Added {added} docs. Total: {get_doc_count()}")

    print(f"Documents in collection: {get_doc_count()}")
    print(f"Redis connected: {redis_connected()}")
    print("RAG Service ready.")
    print("=" * 50)

    yield

    print("Shutting down RAG Service.")


# ──────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────

app = FastAPI(
    title="Career Path Generator — RAG Service",
    description="RAG pipeline: profile → retrieve → roadmap → audit",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Nikhil's backend and Sanat's frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# POST /rag/generate — Main endpoint
# ──────────────────────────────────────────────

@app.post("/rag/generate", response_model=RagGenerateResponse)
async def rag_generate(request: RagGenerateRequest):
    """
    Full RAG pipeline:
    1. Check Redis cache
    2. Embed profile → query ChromaDB → retrieve top-K docs
    3. Call Groq LLaMA 3 → generate roadmap
    4. Call Groq LLaMA 3 → generate ethical audit
    5. Cache result in Redis
    6. Return structured response
    """
    start_time = time.time()
    profile = request.profile
    profile_dict = profile.model_dump()

    # ── Step 1: Check cache ──
    cached = get_cached_response(profile_dict)
    if cached:
        cached["cached"] = True
        elapsed = time.time() - start_time
        print(f"Returned cached response in {elapsed:.2f}s")
        return RagGenerateResponse(**cached)

    # ── Step 2: Retrieve relevant docs ──
    retrieved_docs = retrieve_career_docs(profile, top_k=request.top_k)

    if not retrieved_docs:
        raise HTTPException(
            status_code=500,
            detail="No career documents found in knowledge base. Ensure ChromaDB is populated."
        )

    retrieved_doc_ids = [d["doc_id"] for d in retrieved_docs]

    # ── Step 3: Generate roadmap ──
    roadmap_json = generate_roadmap(profile_dict, retrieved_docs)

    if not roadmap_json:
        print("WARNING: Groq failed. Using fallback demo response.")
        roadmap_json = get_fallback_roadmap()
        audit_scores_raw = get_fallback_audit()
        # Skip the audit generation call since we have fallback
        response_dict = _build_response(
            profile_dict=profile_dict,
            roadmap_json=roadmap_json,
            audit_scores_raw=audit_scores_raw,
            retrieved_doc_ids=retrieved_doc_ids,
        )
        response_dict["model_used"] = "fallback-demo"
        return RagGenerateResponse(**response_dict)

    # ── Step 4: Generate ethical audit ──
    audit_scores_raw = generate_audit(profile_dict, roadmap_json)

    # ── Step 5: Build structured response ──
    response_dict = _build_response(
        profile_dict=profile_dict,
        roadmap_json=roadmap_json,
        audit_scores_raw=audit_scores_raw,
        retrieved_doc_ids=retrieved_doc_ids,
    )

    # ── Step 6: Cache the response ──
    set_cached_response(profile_dict, response_dict)

    elapsed = time.time() - start_time
    print(f"Full RAG pipeline completed in {elapsed:.2f}s")

    return RagGenerateResponse(**response_dict)


def _build_response(
    profile_dict: dict,
    roadmap_json: dict,
    audit_scores_raw: list[dict],
    retrieved_doc_ids: list[str],
) -> dict:
    """
    Convert raw LLM JSON output into the validated response structure.
    Handles missing fields gracefully.
    """
    # Parse roadmap nodes
    nodes = []
    for node in roadmap_json.get("roadmap_nodes", []):
        nodes.append({
            "node_id": node.get("node_id", f"node_{len(nodes)+1}"),
            "role_title": node.get("role_title", "Unknown"),
            "node_order": node.get("node_order", len(nodes) + 1),
            "timeline_months": node.get("timeline_months", 0),
            "required_skills": node.get("required_skills", []),
            "skill_gap": node.get("skill_gap", []),
            "salary_estimate_lpa": node.get("salary_estimate_lpa", 0),
            "risk_level": node.get("risk_level", "Medium"),
            "description": node.get("description", ""),
        })

    # Parse edges
    edges = []
    for edge in roadmap_json.get("roadmap_edges", []):
        edges.append({
            "source": edge.get("source", ""),
            "target": edge.get("target", ""),
            "label": edge.get("label", ""),
        })

    # Parse emotional forecast
    emotional = []
    for phase in roadmap_json.get("emotional_forecast", []):
        emotional.append({
            "phase": phase.get("phase", ""),
            "timeline": phase.get("timeline", ""),
            "stress_level": phase.get("stress_level", "Medium"),
            "description": phase.get("description", ""),
        })

    # Parse alternative paths
    alternatives = []
    for alt in roadmap_json.get("alternative_paths", []):
        alternatives.append({
            "path_name": alt.get("path_name", ""),
            "roles": alt.get("roles", []),
            "total_months": alt.get("total_months", 0),
            "success_probability": alt.get("success_probability", 0),
        })

    # Parse audit scores
    audit_scores = []
    for score in audit_scores_raw:
        audit_scores.append({
            "dimension": score.get("dimension", ""),
            "framework": score.get("framework", "PASSIONIT"),
            "score": max(1, min(10, score.get("score", 5))),
            "risk_level": score.get("risk_level", "Medium"),
            "explanation": score.get("explanation", ""),
            "recommendation": score.get("recommendation", ""),
            "flagged_biases": score.get("flagged_biases", []),
        })

    return {
        "roadmap_nodes": nodes,
        "roadmap_edges": edges,
        "current_role": roadmap_json.get("current_role", profile_dict.get("current_role", "")),
        "target_role": roadmap_json.get("target_role", ""),
        "success_probability": roadmap_json.get("success_probability", 0),
        "total_transition_months": roadmap_json.get("total_transition_months", 0),
        "explanation": roadmap_json.get("explanation", ""),
        "emotional_forecast": emotional,
        "alternative_paths": alternatives,
        "audit_scores": audit_scores,
        "retrieved_doc_ids": retrieved_doc_ids,
        "model_used": settings.groq_model,
        "cached": False,
    }


# ──────────────────────────────────────────────
# POST /rag/embed — Bulk embed documents
# ──────────────────────────────────────────────

@app.post("/rag/embed", response_model=EmbedResponse)
async def rag_embed(request: EmbedRequest):
    """
    Embed and store career documents into ChromaDB.
    Used by Ragini's data pipeline to ingest new docs.
    """
    if not request.documents:
        raise HTTPException(status_code=400, detail="No documents provided.")

    doc_ids = [d.doc_id for d in request.documents]
    texts = [d.text for d in request.documents]
    metadatas = [d.metadata.model_dump() for d in request.documents]

    added = add_documents(doc_ids, texts, metadatas)

    return EmbedResponse(
        embedded=added,
        collection_total=get_doc_count(),
    )


# ──────────────────────────────────────────────
# POST /rag/suggest — Suggest 3 career paths
# ──────────────────────────────────────────────

@app.post("/rag/suggest")
async def rag_suggest(request: RagGenerateRequest):
    """
    Given a profile with no specific goal, suggest 3 career paths.
    """
    profile_dict = request.profile.model_dump()
    suggestions = generate_suggestions(profile_dict)
    return {"suggestions": suggestions}


# ──────────────────────────────────────────────
# GET /rag/health — Health check
# ──────────────────────────────────────────────

@app.get("/rag/health", response_model=HealthResponse)
async def rag_health():
    """
    Health check endpoint. Returns status of all dependencies.
    """
    chroma_status = "ok"
    try:
        get_collection()
    except Exception:
        chroma_status = "error"

    groq_status = "ok" if is_groq_available() else "error"
    redis_status = "ok" if redis_connected() else "unavailable"

    return HealthResponse(
        status="ok" if chroma_status == "ok" else "degraded",
        chromadb=chroma_status,
        groq=groq_status,
        redis=redis_status,
        embedding_model=settings.embedding_model,
        doc_count=get_doc_count(),
    )


# ──────────────────────────────────────────────
# Run with: uvicorn main:app --host 0.0.0.0 --port 8000
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
