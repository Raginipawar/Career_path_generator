# Career Path Generator — RAG Service

**Owner:** Sachi (Person 3 — AI/RAG Engineer)

FastAPI microservice powering the career roadmap generation pipeline using RAG (Retrieval-Augmented Generation) with ChromaDB, sentence-transformers, and Groq LLaMA 3.

## Architecture

```
Profile Input → Redis Cache Check → sentence-transformers (embed)
  → ChromaDB (retrieve top-K docs) → Groq LLaMA 3 (generate roadmap)
  → Groq LLaMA 3 (ethical audit) → Cache in Redis → Return JSON
```

## Setup

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env from template
cp .env.example .env
# Edit .env → add your GROQ_API_KEY and REDIS_URL

# 4. Embed career documents into ChromaDB
python scripts/embed_docs.py --files ../data/career_docs_starter.json ../data/career_docs_expanded.json

# 5. Run the server
python main.py
# or: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rag/generate` | Full RAG pipeline: profile → roadmap + audit |
| POST | `/rag/embed` | Bulk embed career documents into ChromaDB |
| GET | `/rag/health` | Health check (ChromaDB, Groq, Redis status) |

API docs auto-generated at: `http://localhost:8000/docs`

## Testing

```bash
# End-to-end test with demo scenario (Engineer → EdTech)
python scripts/test_pipeline.py

# Test with custom profile
python scripts/test_pipeline.py --profile ../data/sample_profile.json
```

## For Nikhil (Backend)

Your `POST /api/roadmap/generate` should call my `/rag/generate` like this:

```typescript
const response = await fetch(`${RAG_SERVICE_URL}/rag/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ profile: profileData, top_k: 5 }),
});
const data = await response.json();
// data.roadmap_nodes, data.roadmap_edges, data.audit_scores, etc.
```

## For Ragini (Data)

When you have new docs, either:
1. Push JSON files and I'll run `embed_docs.py` on them
2. Call the embed endpoint directly:

```bash
curl -X POST http://localhost:8000/rag/embed \
  -H "Content-Type: application/json" \
  -d '{"documents": [{"doc_id": "new_001", "text": "...", "metadata": {"source": "Naukri", "domain": "AI & ML", "doc_type": "role_description"}}]}'
```

## Docker (for Shakti)

```bash
docker build -t rag-service .
docker run -p 8000:8000 --env-file .env rag-service
```

## python scripts/create_quality_report.py
## 
python scripts/embedder.py