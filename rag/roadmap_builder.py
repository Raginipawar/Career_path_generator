"""
rag/roadmap_builder.py — Data-driven roadmap builder.

Uses the career knowledge graph (NetworkX) + neural scorer (sentence-transformers)
to build personalized roadmap nodes from our knowledge base.

No fixed taxonomy. Any career goal works. The graph learned from our KB.
Groq writes ONE explanation paragraph only.
"""

from __future__ import annotations
import math
from rag.embedder import get_model, get_collection
from rag.neural_scorer import (
    classify_domain,
    semantic_skill_gap,
    neural_probability,
    DOMAIN_DESCRIPTIONS,
)
from rag.knowledge_graph import build_career_graph, find_career_path


# ─── Salary ranges from career_clusters (Indian market, LPA) ─────────────────
# Ordered: [entry, mid, senior, lead]
SALARY_RANGES = {
    # Keys match KB_DOMAIN_MAP normalised names
    "ai & ml":            [8,  16, 28, 45],
    "data analytics":     [5,  10, 18, 30],
    "full stack":         [6,  14, 24, 38],
    "cloud & devops":     [7,  14, 24, 40],
    "cybersecurity":      [7,  14, 22, 38],
    "product management": [10, 18, 30, 50],
    "ui/ux":              [5,  10, 18, 28],
    "fintech":            [8,  16, 28, 45],
    "edtech":             [5,  10, 16, 28],
    "healthcare it":      [6,  12, 20, 32],
    "embedded & iot":     [6,  12, 20, 35],
    "gaming":             [5,  11, 20, 32],
    "research":           [6,  12, 20, 35],
    "consulting":         [8,  14, 24, 40],
    "entrepreneurship":   [4,  12, 20, 35],
    "global delivery":    [10, 18, 28, 45],
    "hr technology":      [5,  10, 16, 26],
    "finance":            [8,  15, 25, 42],
    "sales":              [5,  12, 20, 35],
    "digital marketing":  [4,   8, 15, 25],
    "legal tech":         [6,  12, 20, 35],
    "supply chain":       [6,  12, 20, 35],
    "content":            [3,   7, 14, 25],
    "sustainability":     [5,  10, 18, 30],
    "civil engineering":  [5,  10, 18, 32],
}

# Timeline per seniority transition (months)
SENIORITY_TIMELINE = {
    (0, 1): 6,   (0, 2): 10, (0, 3): 14,
    (1, 2): 8,   (1, 3): 12, (1, 4): 18,
    (2, 3): 10,  (2, 4): 15, (2, 5): 20,
    (3, 4): 12,  (3, 5): 18, (3, 6): 24,
    (4, 5): 14,  (4, 6): 20,
    (5, 6): 16,
}


def _get_salary(domain: str, seniority: int) -> float:
    ranges = SALARY_RANGES.get(domain, [6, 12, 22, 36])
    idx = min(seniority // 2, len(ranges) - 1)
    return float(ranges[idx])


def _timeline_between(s1: int, s2: int) -> int:
    key = (min(s1, s2), max(s1, s2))
    return SENIORITY_TIMELINE.get(key, abs(s2 - s1) * 8)


def _build_profile_query(profile: dict) -> str:
    """Build a rich text query for neural domain classification."""
    parts = [
        profile.get("career_goal", ""),
        " ".join(profile.get("interest_domains", [])),
        profile.get("current_role", ""),
        profile.get("current_industry", ""),
        " ".join(profile.get("technical_skills", [])[:5]),
    ]
    return " ".join(p for p in parts if p).strip()


def build_roadmap_from_data(
    profile:      dict,
    retrieved_docs: list[dict],
    prob_min:     int,
    prob_max:     int,
) -> dict:
    """
    Build complete roadmap structure using:
    1. Neural domain classifier → identifies target domain from any free text
    2. Career knowledge graph → finds real transition path from KB
    3. Semantic skill gap → embedding-based skill comparison, no string matching
    4. Neural probability → MLP on transformer features
    5. Groq explanation → ONE call, fills the explanation field after return

    Returns same schema as before — frontend unchanged.
    """
    current_role  = profile.get("current_role", "")
    user_skills   = profile.get("technical_skills", [])
    burnout       = profile.get("burnout_level", 5)
    years_exp     = profile.get("years_of_experience", 0)

    # ── Step 1: Neural domain classification ──────────────────────────────────
    query_text    = _build_profile_query(profile)
    domain_scores = classify_domain(query_text, top_k=3)
    target_domain = domain_scores[0][0]
    domain_conf   = domain_scores[0][1]
    print(f"Domain classifier: {target_domain} (confidence={round(domain_conf*100)}%)")

    # ── Step 2: Knowledge graph path finding ──────────────────────────────────
    graph_path = find_career_path(current_role, target_domain, max_steps=4)
    print(f"Graph path: {[n['role_title'] for n in graph_path]}")

    # ── Step 3: Fetch KB docs for skill enrichment ────────────────────────────
    try:
        collection = get_collection()
        kb_results = collection.query(
            query_texts=[f"{target_domain} skills requirements career"],
            n_results=min(8, collection.count()),
        )
        kb_skill_texts = " ".join(kb_results["documents"][0]) if kb_results["documents"] else ""
    except Exception:
        kb_skill_texts = ""

    # ── Step 4: Build nodes ───────────────────────────────────────────────────
    nodes   = []
    cumulative_months = 0
    domain_desc = DOMAIN_DESCRIPTIONS.get(target_domain, f"{target_domain} professional")

    # Node 1 — current position (always first, no skill gap)
    nodes.append({
        "node_id":           "node_1",
        "role_title":        current_role or "Current Role",
        "node_order":        1,
        "timeline_months":   0,
        "required_skills":   user_skills[:6],
        "skill_gap":         [],
        "salary_estimate_lpa": float(profile.get("current_salary_lpa", 0) or
                                     _get_salary(target_domain, 1)),
        "risk_level":        "Low",
        "description":       f"Starting point. Current expertise forms the foundation for transitioning into {target_domain}.",
    })

    # Graph-derived intermediate nodes
    path_to_use = graph_path if graph_path else []

    # Skip node if it matches current role
    path_to_use = [n for n in path_to_use if n["role_title"].lower() != current_role.lower()]

    for i, path_node in enumerate(path_to_use[:3]):
        role_title = path_node["role_title"]
        seniority  = path_node.get("seniority", i + 2)

        # Required skills: graph node skills + KB-extracted skills
        graph_skills   = path_node.get("skills", [])
        required_skills = list(dict.fromkeys(graph_skills))[:8]  # deduplicate

        # Semantic skill gap using embeddings
        _, skill_gap, overlap_ratio = semantic_skill_gap(
            user_skills, required_skills, threshold=0.60
        )

        # Timeline from seniority progression
        prev_seniority = nodes[-1].get("_seniority", 1) if nodes else 1
        stage_months   = _timeline_between(prev_seniority, seniority)
        if burnout >= 7:
            stage_months = round(stage_months * 1.3)  # slow down if burnt out
        cumulative_months += stage_months

        # Salary from domain + seniority
        salary = _get_salary(target_domain, seniority)

        # Risk from skill gap ratio
        gap_ratio  = 1 - overlap_ratio
        risk_level = "High" if gap_ratio > 0.65 else ("Medium" if gap_ratio > 0.35 else "Low")

        node = {
            "node_id":           f"node_{i+2}",
            "role_title":        role_title,
            "node_order":        i + 2,
            "timeline_months":   cumulative_months,
            "required_skills":   required_skills,
            "skill_gap":         skill_gap[:5],
            "salary_estimate_lpa": salary,
            "risk_level":        risk_level,
            "description":       f"Target milestone: {role_title}. "
                                  f"Skill coverage: {round(overlap_ratio*100)}%. "
                                  f"{len(skill_gap)} skills to build.",
            "_seniority":        seniority,  # internal, stripped before return
        }
        nodes.append(node)
        # Update user_skills for next iteration (cumulative)
        user_skills = list(dict.fromkeys(user_skills + required_skills))

    # If graph gave us nothing useful, ensure at least 3 nodes
    if len(nodes) < 3:
        _fill_with_domain_anchors(nodes, target_domain, user_skills, cumulative_months, burnout)
        cumulative_months = nodes[-1]["timeline_months"] if nodes else 18

    # Strip internal fields
    for node in nodes:
        node.pop("_seniority", None)

    # ── Step 5: Edges ─────────────────────────────────────────────────────────
    edges = []
    for i in range(len(nodes) - 1):
        gap_preview = nodes[i+1].get("skill_gap", [])
        label = f"Build: {', '.join(gap_preview[:2])}" if gap_preview else "Upskill & apply"
        edges.append({
            "source": nodes[i]["node_id"],
            "target": nodes[i+1]["node_id"],
            "label":  label,
        })

    # ── Step 6: Neural probability ────────────────────────────────────────────
    probability = neural_probability(profile, domain_desc, prob_min, prob_max)

    # ── Step 7: Emotional forecast (rule-based from profile) ─────────────────
    emotional_forecast = _build_emotional_forecast(burnout, cumulative_months, target_domain)

    # ── Step 8: Alternative paths (neural, top-2 other domains) ──────────────
    alternative_paths = _build_alternative_paths(
        domain_scores, user_skills, profile, prob_min, prob_max
    )

    return {
        "current_role":          current_role or "Current Role",
        "target_role":           nodes[-1]["role_title"] if nodes else target_domain.title(),
        "success_probability":   probability,
        "total_transition_months": cumulative_months,
        "roadmap_nodes":         nodes,
        "roadmap_edges":         edges,
        "emotional_forecast":    emotional_forecast,
        "alternative_paths":     alternative_paths,
        "explanation":           "",  # Groq fills this
        "retrieved_doc_ids":     [d.get("doc_id", "") for d in retrieved_docs[:5]],
    }


def _fill_with_domain_anchors(
    nodes: list, domain: str, user_skills: list,
    start_months: int, burnout: int
):
    """Fallback: add generic seniority stages if graph gave sparse results."""
    from rag.knowledge_graph import build_career_graph
    G = build_career_graph()

    domain_nodes = sorted(
        [(n, d) for n, d in G.nodes(data=True) if d.get("domain") == domain],
        key=lambda x: x[1].get("seniority", 3)
    )
    existing_titles = {n["role_title"] for n in nodes}
    cumulative = start_months

    for role, data in domain_nodes[:3]:
        if role in existing_titles:
            continue
        required = data.get("skills", [])[:6]
        _, gap, ratio = semantic_skill_gap(user_skills, required, threshold=0.60)
        cumulative += 12
        nodes.append({
            "node_id":           f"node_{len(nodes)+1}",
            "role_title":        role,
            "node_order":        len(nodes) + 1,
            "timeline_months":   cumulative,
            "required_skills":   required,
            "skill_gap":         gap[:5],
            "salary_estimate_lpa": _get_salary(domain, data.get("seniority", 3)),
            "risk_level":        "High" if (1-ratio) > 0.65 else ("Medium" if (1-ratio) > 0.35 else "Low"),
            "description":       f"{role} in {domain}. Skill coverage: {round(ratio*100)}%.",
        })


def _build_emotional_forecast(burnout: int, total_months: int, domain: str) -> list[dict]:
    phases = []
    if burnout >= 7:
        phases.append({
            "phase":        "Recovery & Grounding",
            "timeline":     "Months 1–2",
            "stress_level": "High",
            "description":  "High burnout detected. Prioritise recovery first. Light learning (30 min/day). No applications yet.",
        })
        offset = 3
    else:
        offset = 1

    third = max(2, total_months // 3)
    phases += [
        {
            "phase":        "Skill Foundation",
            "timeline":     f"Months {offset}–{offset + third - 1}",
            "stress_level": "Medium",
            "description":  f"Core {domain} learning phase. Build fundamentals, ship first project. Stress is manageable with consistent routine.",
        },
        {
            "phase":        "Portfolio & Network",
            "timeline":     f"Months {offset + third}–{offset + third*2 - 1}",
            "stress_level": "Medium",
            "description":  "Apply skills to real projects. Attend meetups, contribute to open source. Imposter syndrome peaks here — normal.",
        },
        {
            "phase":        "Active Transition",
            "timeline":     f"Months {offset + third*2}–{total_months}",
            "stress_level": "High" if burnout >= 5 else "Medium",
            "description":  "Interview prep and applications. Intense but goal is in sight. Negotiate from a position of demonstrated skills.",
        },
    ]
    return phases


def _build_alternative_paths(
    domain_scores: list[tuple[str, float]],
    user_skills:   list[str],
    profile:       dict,
    prob_min:      int,
    prob_max:      int,
) -> list[dict]:
    """Build 2 alternative paths from second/third best domains (neural-ranked)."""
    G = build_career_graph()
    alts = []

    for domain, sim in domain_scores[1:3]:
        domain_nodes = sorted(
            [(n, d) for n, d in G.nodes(data=True) if d.get("domain") == domain],
            key=lambda x: x[1].get("seniority", 3)
        )
        if not domain_nodes:
            continue

        roles = [n for n, _ in domain_nodes[:3]]
        required_all = [s for _, d in domain_nodes[:2] for s in d.get("skills", [])]
        _, _, ratio  = semantic_skill_gap(user_skills, required_all[:8], threshold=0.60)

        raw_prob = int(prob_min + ratio * (prob_max - prob_min))
        alt_prob = max(prob_min, min(prob_max, raw_prob))

        alts.append({
            "path_name":          f"{domain.title()} Track",
            "roles":              roles,
            "total_months":       12 + round((1 - ratio) * 18),
            "success_probability": alt_prob,
        })

    return alts
