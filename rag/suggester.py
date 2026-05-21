"""
rag/suggester.py — Neural career path suggester.

Uses:
1. sentence-transformer embeddings for profile → domain similarity
2. Semantic skill overlap (embedding space, not string matching)
3. Career knowledge graph for real path data
4. Market demand scores

No Groq. Pure computation. Works for any career goal.
"""

from __future__ import annotations
import math
from rag.embedder import get_model
from rag.neural_scorer import (
    classify_domain,
    semantic_skill_gap,
    compute_skill_overlap_score,
    DOMAIN_DESCRIPTIONS,
)
from rag.knowledge_graph import build_career_graph, find_career_path

# Market demand scores (synced with career_clusters seed data)
DOMAIN_DEMAND = {
    # Keys match KB_DOMAIN_MAP normalised names
    "ai & ml":            95,
    "cybersecurity":      91,
    "cloud & devops":     88,
    "full stack":         85,
    "data analytics":     80,
    "fintech":            81,
    "product management": 73,
    "ui/ux":              65,
    "edtech":             60,
    "healthcare it":      62,
    "embedded & iot":     70,
    "gaming":             58,
    "research":           55,
    "consulting":         68,
    "entrepreneurship":   50,
    "global delivery":    72,
    "hr technology":      52,
    "finance":            75,
    "sales":              65,
    "digital marketing":  68,
    "legal tech":         55,
    "supply chain":       62,
    "content":            45,
    "sustainability":     60,
    "civil engineering":  55,
}

def _cosine(a: list[float], b: list[float]) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _build_profile_text(profile: dict) -> str:
    parts = [
        f"Current: {profile.get('current_role', '')}",
        f"Industry: {profile.get('current_industry', '')}",
        f"Education: {profile.get('highest_degree', '')} in {profile.get('field_of_study', '')}",
        f"Skills: {', '.join(profile.get('technical_skills', [])[:8])}",
        f"Domains: {', '.join(profile.get('interest_domains', []))}",
        f"Goal: {profile.get('career_goal', '')}",
    ]
    return ". ".join(p for p in parts if p.split(": ", 1)[-1].strip())


def suggest_career_paths(
    profile:  dict,
    prob_min: int,
    prob_max: int,
    top_n:    int = 3,
) -> list[dict]:
    """
    Suggest top N career paths using:
    - Transformer embedding similarity (profile ↔ domain)
    - Semantic skill overlap in embedding space
    - Knowledge graph for real role data
    - Market demand weighting
    """
    model        = get_model()
    profile_text = _build_profile_text(profile)
    profile_vec  = model.encode(profile_text).tolist()
    user_skills  = profile.get("technical_skills", [])
    burnout      = profile.get("burnout_level", 5)
    priority     = profile.get("work_life_priority", "Career Growth")
    G            = build_career_graph()

    # Current domain (exclude from suggestions)
    current_query   = profile.get("career_goal", "") + " " + profile.get("current_role", "")
    current_top     = classify_domain(current_query, top_k=1)
    current_domain  = current_top[0][0] if current_top else ""

    scored = []

    for domain, domain_desc in DOMAIN_DESCRIPTIONS.items():
        # 1. Embedding similarity: profile ↔ domain description
        domain_vec = model.encode(domain_desc).tolist()
        sem_sim    = _cosine(profile_vec, domain_vec)

        # 2. Semantic skill overlap
        # Extract required skills from knowledge graph nodes for this domain
        domain_roles = [(n, d) for n, d in G.nodes(data=True)
                        if d.get("domain") == domain and d.get("seniority", 0) >= 2]
        required_skills = list({
            s for _, d in domain_roles[:3]
            for s in d.get("skills", [])
        })
        skill_sim = compute_skill_overlap_score(user_skills, domain_desc) if not required_skills else 0.0
        if required_skills:
            _, _, skill_ratio = semantic_skill_gap(user_skills, required_skills[:8], threshold=0.60)
        else:
            skill_ratio = skill_sim

        # 3. Market demand (normalized)
        demand = DOMAIN_DEMAND.get(domain, 60) / 100

        # 4. Penalties
        stress_penalty = 0.0
        if priority == "Work-Life Balance" and demand > 0.85:
            stress_penalty = 0.08
        if burnout >= 7 and demand > 0.85:
            stress_penalty += 0.08
        same_domain_penalty = 0.2 if domain == current_domain else 0.0

        score = (
            sem_sim     * 0.40 +
            skill_ratio * 0.35 +
            demand      * 0.25 -
            stress_penalty -
            same_domain_penalty
        )

        # 5. Probability in this domain
        raw_prob = int(prob_min + (sem_sim * 0.5 + skill_ratio * 0.5) * (prob_max - prob_min))
        probability = max(prob_min, min(prob_max, raw_prob))

        # 6. Get real target role from knowledge graph
        path = find_career_path(profile.get("current_role", ""), domain, max_steps=3)
        target_role = path[-1]["role_title"] if path else f"Senior {domain.title()} Professional"
        path_roles  = [n["role_title"] for n in path] if path else [target_role]

        # 7. Top 3 skills to build (semantic gap)
        _, skills_needed, _ = semantic_skill_gap(user_skills, required_skills[:8], 0.60)
        skills_needed = skills_needed[:3]

        # 8. Salary from domain data
        from rag.roadmap_builder import SALARY_RANGES
        s = SALARY_RANGES.get(domain, [6, 14, 24])
        salary_str = f"₹{s[1]}–{s[min(2, len(s)-1)]} LPA"

        # 9. Timeline
        timeline = 12 if skill_ratio > 0.5 else (18 if skill_ratio > 0.25 else 24)

        scored.append({
            "_score":               score,
            "path_name":            f"{domain.title()} Track",
            "target_role":          target_role,
            "reasoning":            _build_reasoning(domain, sem_sim, skill_ratio, user_skills, target_role),
            "estimated_probability": probability,
            "timeline_months":      timeline,
            "top_skills_needed":    skills_needed,
            "salary_range_lpa":     salary_str,
            "_roles":               path_roles,
        })

    # Sort by score, return top N
    scored.sort(key=lambda x: x["_score"], reverse=True)
    result = []
    for item in scored[:top_n]:
        item.pop("_score", None)
        item.pop("_roles", None)
        result.append(item)

    return result


def _build_reasoning(
    domain:      str,
    sem_sim:     float,
    skill_ratio: float,
    user_skills: list[str],
    target_role: str,
) -> str:
    demand      = DOMAIN_DEMAND.get(domain, 60)
    sim_pct     = round(sem_sim * 100)
    overlap_pct = round(skill_ratio * 100)

    if overlap_pct >= 50:
        skill_note = f"Your existing skills cover {overlap_pct}% of what {target_role} requires — strong foundation."
    elif overlap_pct >= 20:
        skill_note = f"You have partial foundations ({overlap_pct}% skill match) — achievable with focused upskilling."
    else:
        skill_note = f"Significant skill pivot needed ({overlap_pct}% overlap) — high growth potential but longer timeline."

    demand_note = (
        "Exceptionally high market demand — top 5% of all domains." if demand >= 90 else
        "High market demand with strong hiring activity." if demand >= 80 else
        "Solid market with consistent job openings." if demand >= 70 else
        "Moderate market — niche but stable opportunities."
    )

    return f"{skill_note} {demand_note} Profile-to-domain neural similarity: {sim_pct}%."
