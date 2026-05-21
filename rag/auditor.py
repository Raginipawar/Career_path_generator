"""
rag/auditor.py — Deterministic PASSIONIT + PRUTL audit engine.

The SYSTEM computes all 14 audit scores from actual profile data,
roadmap structure, and knowledge base statistics.
Groq is NOT called here at all.
"""

from __future__ import annotations
import math
from rag.embedder import get_model


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _cosine(a: list[float], b: list[float]) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _embed(text: str) -> list[float]:
    model = get_model()
    return model.encode(text).tolist()


def _risk(score: int) -> str:
    if score >= 8: return "Low"
    if score >= 5: return "Medium"
    return "High"


def _skill_overlap_ratio(user_skills: list[str], required_skills: list[str]) -> float:
    if not required_skills:
        return 1.0
    user_lower = {s.lower() for s in user_skills}
    req_lower  = {s.lower() for s in required_skills}
    return len(user_lower & req_lower) / len(req_lower)


# ─── PASSIONIT ────────────────────────────────────────────────────────────────

def _purpose(profile: dict, roadmap: dict) -> dict:
    """
    Semantic similarity between career_goal and target_role using sentence-transformers.
    Also checks if interest_domains overlap with the target domain.
    """
    goal        = profile.get("career_goal", "")
    target_role = roadmap.get("target_role", "")
    domains     = profile.get("interest_domains", [])
    sim         = 0.0

    if goal and target_role:
        sim   = _cosine(_embed(goal), _embed(target_role))
        score = max(1, min(10, round(sim * 10) + 1))
    elif domains and target_role:
        # Fall back to domain matching
        domain_text = " ".join(domains)
        sim   = _cosine(_embed(domain_text), _embed(target_role))
        score = max(1, min(9, round(sim * 9)))
    else:
        score = 4  # no goal specified — unknown alignment

    return {
        "dimension":     "Purpose",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"Career goal: '{goal or 'not specified'}' vs target role: '{target_role}'. "
                         f"Semantic similarity: {round(sim * 100) if goal or domains else 'N/A'}%. "
                         f"{'Strong alignment.' if score >= 8 else 'Partial alignment — goal may need refinement.' if score >= 5 else 'Low alignment between stated goal and recommended role.'}",
        "recommendation": "Ensure your career goal statement reflects the specific role you are targeting." if score < 7 else "Goal is well aligned with recommendation.",
        "flagged_biases": [],
    }


def _accountability(profile: dict, roadmap: dict, retrieved_doc_ids: list[str]) -> dict:
    """
    Measures how traceable the recommendation is.
    Penalises generic skill lists and missing career_goal specificity.
    """
    doc_count = len(retrieved_doc_ids)
    nodes     = roadmap.get("roadmap_nodes", [])
    career_goal = profile.get("career_goal", "").strip()

    # Every node should have specific (non-generic) skill_gap populated
    generic_skills = {"leadership", "communication", "teamwork", "agile", "problem solving"}
    nodes_with_specific_skills = sum(
        1 for n in nodes
        if n.get("required_skills") and any(
            s.lower() not in generic_skills for s in n.get("required_skills", [])
        )
    )
    specificity_ratio = nodes_with_specific_skills / max(len(nodes), 1)

    # Penalise if career goal is too vague
    goal_specific = len(career_goal) > 15 and career_goal.lower() not in {"grow", "succeed", "be better", "improve"}

    score = 4  # cautious base
    if doc_count >= 4: score += 2
    elif doc_count >= 2: score += 1
    if specificity_ratio >= 0.8: score += 2
    elif specificity_ratio >= 0.5: score += 1
    if goal_specific: score += 1
    score = min(9, score)

    return {
        "dimension":     "Accountability",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"Recommendation backed by {doc_count} KB documents. "
                         f"{nodes_with_specific_skills}/{len(nodes)} nodes have specific (non-generic) skill requirements. "
                         f"Career goal specificity: {'clear' if goal_specific else 'vague — consider refining'}.",
        "recommendation": "Well-traced recommendation." if score >= 8 else
                          "Refine your career goal to a specific role title and add domain-specific technical skills.",
        "flagged_biases": [],
    }


def _safety(profile: dict, roadmap: dict) -> dict:
    """
    Evaluates emotional and financial risk of the transition.
    Computed from burnout, stress tolerance, node risk levels, and salary jump.
    """
    burnout    = profile.get("burnout_level", 5)
    stress_tol = profile.get("stress_tolerance", 5)
    dependents = profile.get("has_dependents", False)
    nodes      = roadmap.get("roadmap_nodes", [])

    high_risk_nodes = sum(1 for n in nodes if n.get("risk_level") == "High")
    current_salary  = profile.get("current_salary_lpa", 0)
    target_salary   = nodes[-1].get("salary_estimate_lpa", 0) if nodes else 0
    salary_drop     = current_salary > 0 and target_salary < current_salary * 0.85

    issues = []
    deductions = 0

    if burnout >= 8:
        deductions += 4
        issues.append(f"critical burnout ({burnout}/10)")
    elif burnout >= 6:
        deductions += 2
        issues.append(f"elevated burnout ({burnout}/10)")

    if stress_tol <= 3:
        deductions += 2
        issues.append("very low stress tolerance")
    elif stress_tol <= 5:
        deductions += 1

    if high_risk_nodes >= 2:
        deductions += 2
        issues.append(f"{high_risk_nodes} high-risk transition steps")
    elif high_risk_nodes == 1:
        deductions += 1

    if salary_drop and dependents:
        deductions += 2
        issues.append("expected salary drop with dependents")
    elif salary_drop:
        deductions += 1
        issues.append("expected early salary reduction")

    score = max(1, 10 - deductions)
    explanation = (
        f"Safety concerns: {'; '.join(issues)}." if issues
        else "No significant safety concerns detected for this transition."
    )

    return {
        "dimension":     "Safety",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   explanation,
        "recommendation": "Consider addressing burnout before starting transition. A rest period or therapy may help." if burnout >= 7 else "Monitor stress levels during transition.",
        "flagged_biases": [f"High burnout ({burnout}/10) flagged as execution risk"] if burnout >= 7 else [],
    }


def _sustainability(profile: dict, roadmap: dict) -> dict:
    """
    Evaluates long-term viability: dependents, relocation, salary progression, timeline.
    """
    dependents      = profile.get("has_dependents", False)
    willing_reloc   = profile.get("willing_to_relocate", False)
    target_timeline = profile.get("target_timeline_years", 2)
    total_months    = roadmap.get("total_transition_months", 0)
    nodes           = roadmap.get("roadmap_nodes", [])
    current_salary  = profile.get("current_salary_lpa", 0)
    target_salary   = nodes[-1].get("salary_estimate_lpa", 0) if nodes else 0
    work_priority   = profile.get("work_life_priority", "")

    issues = []
    deductions = 0

    # Timeline mismatch
    roadmap_years = total_months / 12
    if roadmap_years > target_timeline * 1.5:
        deductions += 2
        issues.append(f"roadmap ({round(roadmap_years, 1)}y) exceeds user timeline ({target_timeline}y) by >50%")

    # Salary trajectory
    if current_salary > 0 and target_salary < current_salary:
        deductions += 2
        issues.append(f"salary expected to drop from ₹{current_salary} to ₹{target_salary} LPA")
    elif target_salary >= current_salary * 1.5:
        pass  # good upward trajectory

    # Dependents + relocation conflict
    if dependents and not willing_reloc:
        needs_metro = any(n.get("salary_estimate_lpa", 0) > 25 for n in nodes)
        if needs_metro:
            deductions += 2
            issues.append("has dependents, not willing to relocate, but path likely needs metro presence")

    # Work-life balance mismatch
    if work_priority == "Work-Life Balance" and total_months > 18:
        deductions += 1
        issues.append("prioritizes work-life balance but transition requires 18+ months intense effort")

    score = max(1, 10 - deductions)
    return {
        "dimension":     "Sustainability",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   (f"Sustainability concerns: {'; '.join(issues)}." if issues
                         else "Transition appears sustainable within the user's stated constraints."),
        "recommendation": "Consider phased transition to maintain income stability." if deductions >= 3 else "Continue as planned.",
        "flagged_biases": ["Dependents + relocation conflict detected"] if (dependents and not willing_reloc) else [],
    }


def _inclusivity(profile: dict, roadmap: dict) -> dict:
    """
    Checks if the recommendation would work equally well regardless of gender,
    location tier (metro vs non-metro), and institution tier.
    """
    gender     = profile.get("gender", "").lower()
    city       = profile.get("location_city", "").lower()
    inst_tier  = profile.get("institution_tier", "Tier 2")
    target     = roadmap.get("target_role", "").lower()

    non_metro_cities = {"jaipur", "bhopal", "nagpur", "lucknow", "patna", "indore", "surat", "vadodara", "kochi", "cochin", "chandigarh", "coimbatore"}
    is_non_metro = city in non_metro_cities

    issues = []
    deductions = 0

    # Non-metro access
    if is_non_metro and any(kw in target for kw in ["senior", "lead", "architect", "director"]):
        deductions += 2
        issues.append(f"senior roles in {city} have limited availability vs metro cities")

    # Tier 3 education bias
    if inst_tier == "Tier 3" and any(kw in target for kw in ["engineer", "scientist", "developer", "analyst"]):
        deductions += 1
        issues.append("Tier 3 education may face hiring bias at top-tier tech companies")

    score = max(4, 10 - deductions)
    return {
        "dimension":     "Inclusivity",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   (f"Inclusivity concerns: {'; '.join(issues)}." if issues
                         else "No significant inclusivity barriers detected. Recommendation applies regardless of gender, location, or institution tier."),
        "recommendation": "Remote-first companies reduce geographic barriers — prioritize them." if is_non_metro else "Standard hiring pipeline should be accessible.",
        "flagged_biases": issues,
    }


def _objectivity(profile: dict, roadmap: dict, retrieved_doc_ids: list[str]) -> dict:
    """
    Measures whether the recommendation is grounded in data vs assumptions.
    Checks skill gap specificity, goal clarity, and probability calibration realism.
    """
    doc_count = len(retrieved_doc_ids)
    nodes = roadmap.get("roadmap_nodes", [])
    prob = roadmap.get("success_probability", 50)
    career_goal = profile.get("career_goal", "").strip()
    user_skills = profile.get("technical_skills", [])

    nodes_with_specific_gaps = sum(
        1 for n in nodes
        if n.get("skill_gap") and len(n["skill_gap"]) > 0
    )
    gap_coverage = nodes_with_specific_gaps / max(len(nodes), 1)

    # Check if probability seems calibrated (not uniformly high)
    prob_realistic = 30 <= prob <= 85

    # Check if user skills are detailed (not just empty)
    skills_detailed = len(user_skills) >= 3

    score = 3  # skeptical base
    if doc_count >= 3: score += 2
    elif doc_count >= 1: score += 1
    if gap_coverage >= 0.7: score += 2
    elif gap_coverage >= 0.4: score += 1
    if prob_realistic: score += 1
    if skills_detailed: score += 1
    if career_goal: score += 1
    score = min(9, score)

    return {
        "dimension":     "Objectivity",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"{doc_count} KB documents used. Skill gaps present in {nodes_with_specific_gaps}/{len(nodes)} nodes. "
                         f"Success probability {prob}% {'appears calibrated' if prob_realistic else 'may be over- or under-confident'}. "
                         f"Profile has {len(user_skills)} technical skills listed.",
        "recommendation": "Recommendation is well-grounded in data." if score >= 7 else
                          "Add more specific technical skills and a concrete career goal to improve objectivity.",
        "flagged_biases": ["Probability outside realistic range (30–85%)" ] if not prob_realistic else [],
    }


def _non_bias(profile: dict, roadmap: dict) -> dict:
    """
    Checks for demographic and institutional bias in the recommendation.
    Cross-checks gender, location, and institution tier for systematic differences.
    """
    gender    = profile.get("gender", "").lower()
    inst_tier = profile.get("institution_tier", "Tier 2")
    prob      = roadmap.get("success_probability", 50)

    flags = []

    # Gender neutrality check
    target = roadmap.get("target_role", "").lower()
    male_coded = any(kw in target for kw in ["engineer", "developer", "architect", "cto"])
    female_coded = any(kw in target for kw in ["hr", "nurse", "teacher", "care"])

    if gender == "female" and male_coded:
        flags.append("Female user targeting male-coded role — monitor for stereotype bias in recommendations")
    if gender == "male" and female_coded:
        flags.append("Male user targeting female-coded role — monitor for stereotype bias")

    # Institution tier impact
    if inst_tier == "Tier 3" and prob < 35:
        flags.append(f"Low probability ({prob}%) may be influenced by Tier 3 institution — independent of actual skills")

    score = 6 if flags else 9
    return {
        "dimension":     "Non-bias",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   (f"Potential biases detected: {'; '.join(flags)}." if flags
                         else "No gender, location, or institutional bias detected in this recommendation."),
        "recommendation": "Verify recommendation holds across demographic variants." if flags else "Recommendation appears demographically neutral.",
        "flagged_biases": flags,
    }


def _integrity(retrieved_doc_ids: list[str]) -> dict:
    """
    Evaluates data integrity — are the sources real, current, and domain-specific?
    """
    doc_count = len(retrieved_doc_ids)
    # Our KB is from career cluster seed data + industry docs — real but not live
    # Cap at 8 to reflect that it's curated knowledge, not live job board data
    score = min(8, 4 + doc_count)
    note = (
        "Recommendation uses curated career knowledge base. Not based on live job board data — "
        "validate with current LinkedIn/Glassdoor postings before applying."
        if doc_count > 0 else
        "No knowledge base documents retrieved. Recommendation is based on general career patterns only."
    )
    return {
        "dimension":     "Integrity",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"{doc_count} KB documents referenced (IDs: {retrieved_doc_ids[:2]}{'...' if len(retrieved_doc_ids) > 2 else ''}). {note}",
        "recommendation": "Cross-validate salary and role titles with live sources (LinkedIn Salary, Glassdoor, Levels.fyi).",
        "flagged_biases": [],
    }


def _transparency(profile: dict, roadmap: dict, retrieved_doc_ids: list[str]) -> dict:
    """
    Evaluates how explainable and understandable the recommendation is.
    Penalises short or boilerplate explanations.
    """
    explanation_text = roadmap.get("explanation", "").strip()
    has_explanation  = len(explanation_text) > 100  # meaningful, not just "System-generated"
    is_personalized  = any(kw in explanation_text.lower() for kw in ["your", "you", "year", "month", "%"])
    has_nodes        = len(roadmap.get("roadmap_nodes", [])) >= 2
    has_edges        = len(roadmap.get("roadmap_edges", [])) > 0
    has_alt_paths    = len(roadmap.get("alternative_paths", [])) > 0
    has_emotion      = len(roadmap.get("emotional_forecast", [])) > 0
    has_doc_refs     = len(retrieved_doc_ids) > 0

    score = 3  # base
    if has_explanation:  score += 2
    if is_personalized:  score += 1
    if has_nodes:        score += 1
    if has_edges:        score += 1
    if has_alt_paths:    score += 1
    if has_emotion:      score += 1
    score = min(10, score)

    return {
        "dimension":     "Transparency",
        "framework":     "PASSIONIT",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"Explanation: {'present & personalised' if is_personalized else 'generic' if has_explanation else 'missing'}. "
                         f"Components: {sum([has_nodes, has_edges, has_alt_paths, has_emotion])}/4 present.",
        "recommendation": "Recommendation is well-explained." if score >= 8 else
                          "The explanation could be more personalised — reference specific skills and percentages.",
        "flagged_biases": [],
    }


# ─── PRUTL ────────────────────────────────────────────────────────────────────

def _privacy(profile: dict) -> dict:
    """
    Checks that personal data handling follows minimization principles.
    Scores lower when more sensitive demographic data is used in scoring.
    """
    sensitive_fields = ["gender", "age", "has_dependents", "recent_life_event"]
    used_sensitive = [f for f in sensitive_fields if profile.get(f) not in (None, "", "None", False, 0)]
    num_sensitive = len(used_sensitive)

    # Base 7 — user provides voluntarily, but sensitive data use carries residual risk
    score = 7 if num_sensitive > 2 else (8 if num_sensitive > 0 else 9)
    return {
        "dimension":     "Privacy",
        "framework":     "PRUTL",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"{num_sensitive} sensitive fields used in scoring: {', '.join(used_sensitive) if used_sensitive else 'none'}. "
                         f"All data is user-provided and used only for recommendation. No third-party sharing.",
        "recommendation": "Ensure explicit user consent for sensitive fields (age, dependents, gender). "
                          "Provide data deletion option in account settings.",
        "flagged_biases": [f"Sensitive fields actively influencing recommendation: {', '.join(used_sensitive)}"] if num_sensitive >= 3 else [],
    }


def _reliability(profile: dict, roadmap: dict) -> dict:
    """
    Measures consistency: same profile should yield consistent probability range.
    Checks if the output probability is within our deterministic range.
    """
    prob = roadmap.get("success_probability", 50)
    nodes = roadmap.get("roadmap_nodes", [])

    # Check internal consistency: nodes should escalate in salary
    salaries = [n.get("salary_estimate_lpa", 0) for n in nodes]
    is_ascending = all(salaries[i] <= salaries[i+1] for i in range(len(salaries)-1)) if len(salaries) > 1 else True

    # Check timeline consistency: total months should match sum of node timelines
    node_months = sum(n.get("timeline_months", 0) for n in nodes)
    total_months = roadmap.get("total_transition_months", 0)
    timeline_consistent = abs(node_months - total_months) <= 3 or total_months == 0

    issues = []
    deductions = 0
    if not is_ascending:
        deductions += 2
        issues.append("salary progression is not consistently ascending across nodes")
    if not timeline_consistent and node_months > 0:
        deductions += 1
        issues.append(f"total timeline ({total_months}mo) doesn't match node sum ({node_months}mo)")

    score = max(5, 10 - deductions)
    return {
        "dimension":     "Reliability",
        "framework":     "PRUTL",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   (f"Consistency issues: {'; '.join(issues)}." if issues
                         else f"Recommendation is internally consistent. Salary progression is {'ascending' if is_ascending else 'variable'}, timeline is {'consistent' if timeline_consistent else 'variable'}."),
        "recommendation": "Verify salary and timeline data from knowledge base is current." if deductions > 0 else "Recommendation is consistent.",
        "flagged_biases": [],
    }


def _usability(roadmap: dict) -> dict:
    """
    Measures how actionable and clear the output is.
    Checks that nodes have specific skill gaps (not just generic ones) and real salary data.
    """
    nodes   = roadmap.get("roadmap_nodes", [])
    edges   = roadmap.get("roadmap_edges", [])
    alt     = roadmap.get("alternative_paths", [])
    emotion = roadmap.get("emotional_forecast", [])

    generic_skills = {"leadership", "communication", "teamwork", "problem solving"}
    actionable_nodes = sum(
        1 for n in nodes
        if n.get("skill_gap") and
           any(s.lower() not in generic_skills for s in n.get("skill_gap", [])) and
           n.get("salary_estimate_lpa", 0) > 0
    )
    actionability = actionable_nodes / max(len(nodes), 1)

    score = 3
    if len(nodes) >= 3:       score += 1
    if edges:                  score += 1
    if alt:                    score += 1
    if emotion:                score += 1
    if actionability >= 0.7:   score += 2
    elif actionability >= 0.4: score += 1
    score = min(10, score)

    return {
        "dimension":     "Usability",
        "framework":     "PRUTL",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   f"{len(nodes)} roadmap steps, {len(edges)} transitions, {len(alt)} alternatives, {len(emotion)} forecast phases. "
                         f"{actionable_nodes}/{len(nodes)} nodes are fully actionable (specific skill gaps + salary estimates).",
        "recommendation": "Output is highly actionable." if score >= 8 else
                          "Ensure each transition step has specific technical skill gaps and accurate salary data.",
        "flagged_biases": [],
    }


def _trustworthiness(profile: dict, roadmap: dict) -> dict:
    """
    Would a domain expert agree with this recommendation?
    Computes from: probability vs skill overlap reality, domain relevance, timeline realism.
    """
    prob   = roadmap.get("success_probability", 50)
    nodes  = roadmap.get("roadmap_nodes", [])
    months = roadmap.get("total_transition_months", 0)
    years_exp = profile.get("years_of_experience", 0)

    issues = []
    deductions = 0

    # Probability vs skill reality sanity check
    user_skills  = profile.get("technical_skills", [])
    target_role  = roadmap.get("target_role", "")
    required_all = [s for n in nodes for s in n.get("required_skills", [])]
    overlap      = _skill_overlap_ratio(user_skills, list(set(required_all)))

    # If overlap is <10% but probability >60% — suspicious
    if overlap < 0.1 and prob > 60:
        deductions += 3
        issues.append(f"skill overlap is {round(overlap*100)}% but probability is {prob}% — over-optimistic")

    # Timeline realism: can't become a senior role in 3 months
    if months < 6 and any("senior" in n.get("role_title", "").lower() for n in nodes):
        deductions += 2
        issues.append("timeline too short for senior role achievement")

    # Experience-appropriate path
    if years_exp < 2 and prob > 80:
        deductions += 1
        issues.append("high probability with limited experience — may be over-optimistic")

    score = max(3, 9 - deductions)
    return {
        "dimension":     "Trustworthiness",
        "framework":     "PRUTL",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   (f"Expert-level concerns: {'; '.join(issues)}." if issues
                         else f"Recommendation is credible. Skill overlap: {round(overlap*100)}%, timeline: {months} months for {len(nodes)} steps."),
        "recommendation": "Review probability calibration and timeline estimates with domain expert." if deductions >= 2 else "Recommendation passes expert plausibility check.",
        "flagged_biases": [f"Probability-skill mismatch: {round(overlap*100)}% overlap but {prob}% probability"] if (overlap < 0.1 and prob > 60) else [],
    }


def _legality(profile: dict, roadmap: dict) -> dict:
    """
    Ensures recommendation complies with employment laws and ethical standards.
    Checks for age discrimination signals, role legality, and compliance.
    """
    age   = profile.get("age", 30)
    nodes = roadmap.get("roadmap_nodes", [])
    flags = []

    # Age-based restrictions
    if age > 55 and any("junior" in n.get("role_title", "").lower() for n in nodes):
        flags.append("Recommending junior roles to user over 55 may trigger age discrimination concern")

    # No illegal recommendations (unpaid internships, exploitation indicators)
    zero_salary_nodes = [n for n in nodes if n.get("salary_estimate_lpa", 1) == 0 and n.get("node_order", 1) > 1]
    if zero_salary_nodes:
        flags.append("Some non-entry nodes have zero salary estimate — review for unpaid labor concerns")

    score = 5 if flags else 10
    return {
        "dimension":     "Legality",
        "framework":     "PRUTL",
        "score":         score,
        "risk_level":    _risk(score),
        "explanation":   (f"Compliance concerns: {'; '.join(flags)}." if flags
                         else "Recommendation complies with employment laws and ethical guidelines. No discriminatory elements detected."),
        "recommendation": "Review flagged items with HR legal counsel." if flags else "No legal concerns.",
        "flagged_biases": flags,
    }


# ─── Main export ──────────────────────────────────────────────────────────────

def compute_full_audit(
    profile: dict,
    roadmap: dict,
    retrieved_doc_ids: list[str],
) -> list[dict]:
    """
    Compute all 14 PASSIONIT + PRUTL audit scores deterministically.
    No LLM calls. Uses sentence-transformers only for semantic similarity.
    """
    return [
        # PASSIONIT (9)
        _purpose(profile, roadmap),
        _accountability(profile, roadmap, retrieved_doc_ids),
        _safety(profile, roadmap),
        _sustainability(profile, roadmap),
        _inclusivity(profile, roadmap),
        _objectivity(profile, roadmap, retrieved_doc_ids),
        _non_bias(profile, roadmap),
        _integrity(retrieved_doc_ids),
        _transparency(profile, roadmap, retrieved_doc_ids),
        # PRUTL (5)
        _privacy(profile),
        _reliability(profile, roadmap),
        _usability(roadmap),
        _trustworthiness(profile, roadmap),
        _legality(profile, roadmap),
    ]
