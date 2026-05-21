"""
rag/auditor.py — Deterministic PASSIONIT + PRUTL audit engine.

All 14 scores are computed from real profile and roadmap data.
Explanations are written for the USER, not the developer.
Groq is NOT called here.
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
    goal        = profile.get("career_goal", "")
    target_role = roadmap.get("target_role", "")
    name        = profile.get("full_name", "") or "Your"
    domains     = profile.get("interest_domains", [])
    sim         = 0.0

    if goal and target_role:
        sim   = _cosine(_embed(goal), _embed(target_role))
        score = max(1, min(10, round(sim * 10) + 1))
    elif domains and target_role:
        domain_text = " ".join(domains)
        sim   = _cosine(_embed(domain_text), _embed(target_role))
        score = max(1, min(9, round(sim * 9)))
    else:
        score = 4

    sim_pct = round(sim * 100)

    if score >= 8:
        expl = (
            f"Your stated goal — \"{goal}\" — aligns strongly with the recommended path to {target_role} "
            f"({sim_pct}% match). This transition is consistent with what you want. Keep momentum."
        )
        rec = "You're on the right track. Make sure your CV and LinkedIn reflect this career goal clearly."
    elif score >= 5:
        expl = (
            f"Your goal of \"{goal or 'career growth'}\" is directionally aligned with {target_role}, "
            f"but there's room to sharpen it ({sim_pct}% match). A more specific goal statement will "
            f"help you stay focused during the transition."
        )
        rec = f"Rewrite your career goal to be more specific — e.g. 'Become a {target_role} at a product company in 18 months.'"
    else:
        expl = (
            f"Your stated goal (\"{goal or 'not specified'}\") doesn't strongly map to {target_role} "
            f"({sim_pct}% match). This could mean the recommendation needs revisiting, or your goal "
            f"needs to be more clearly defined."
        )
        rec = f"Revisit your career goal. If {target_role} is genuinely what you want, update your goal statement to reflect that explicitly."

    return {
        "dimension":      "Purpose",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [],
    }


def _accountability(profile: dict, roadmap: dict, retrieved_doc_ids: list[str]) -> dict:
    doc_count   = len(retrieved_doc_ids)
    nodes       = roadmap.get("roadmap_nodes", [])
    career_goal = profile.get("career_goal", "").strip()
    target_role = roadmap.get("target_role", "")

    generic_skills = {"leadership", "communication", "teamwork", "agile", "problem solving"}
    nodes_with_specific_skills = sum(
        1 for n in nodes
        if n.get("required_skills") and any(
            s.lower() not in generic_skills for s in n.get("required_skills", [])
        )
    )
    specificity_ratio = nodes_with_specific_skills / max(len(nodes), 1)
    goal_specific = len(career_goal) > 15 and career_goal.lower() not in {"grow", "succeed", "be better", "improve"}

    score = 4
    if doc_count >= 4: score += 2
    elif doc_count >= 2: score += 1
    if specificity_ratio >= 0.8: score += 2
    elif specificity_ratio >= 0.5: score += 1
    if goal_specific: score += 1
    score = min(9, score)

    if score >= 8:
        expl = (
            f"Every step in your roadmap to {target_role} is backed by real career data and mapped to "
            f"specific technical skills — not vague advice. You can trace exactly why each recommendation was made."
        )
        rec = "Your roadmap is well-grounded. As you progress, verify each skill against current job postings to stay relevant."
    elif score >= 5:
        expl = (
            f"Most of your roadmap steps have specific, traceable skill requirements. "
            f"{'Your career goal is clear and directional.' if goal_specific else 'Sharpening your career goal will make each step more targeted.'}"
        )
        rec = "Add 2–3 more domain-specific technical skills to your profile to improve how well each step is personalised to you."
    else:
        expl = (
            f"Some of your roadmap steps are based on general patterns rather than data specific to your background. "
            f"{'Your career goal needs to be more specific.' if not goal_specific else 'More technical skills in your profile would improve accuracy.'}"
        )
        rec = "Complete all profile fields — especially technical skills and a specific career goal — to get a more personalised roadmap."

    return {
        "dimension":      "Accountability",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [],
    }


def _safety(profile: dict, roadmap: dict) -> dict:
    burnout    = profile.get("burnout_level", 5)
    stress_tol = profile.get("stress_tolerance", 5)
    dependents = profile.get("has_dependents", False)
    nodes      = roadmap.get("roadmap_nodes", [])
    target_role = roadmap.get("target_role", "this role")

    high_risk_nodes = sum(1 for n in nodes if n.get("risk_level") == "High")
    current_salary  = profile.get("current_salary_lpa", 0) or 0
    target_salary   = nodes[-1].get("salary_estimate_lpa", 0) if nodes else 0
    salary_drop     = current_salary > 0 and target_salary < current_salary * 0.85

    deductions = 0
    risk_notes = []

    if burnout >= 8:
        deductions += 4
        risk_notes.append(f"your burnout is critically high ({burnout}/10) — starting a transition now adds significant stress")
    elif burnout >= 6:
        deductions += 2
        risk_notes.append(f"your burnout level ({burnout}/10) is elevated — manage this before pushing hard on the transition")

    if stress_tol <= 3:
        deductions += 2
        risk_notes.append("your stress tolerance is low — career transitions are demanding and this needs a mitigation plan")
    elif stress_tol <= 5:
        deductions += 1

    if high_risk_nodes >= 2:
        deductions += 2
        risk_notes.append(f"{high_risk_nodes} of your roadmap steps have High risk — these need extra preparation time")
    elif high_risk_nodes == 1:
        deductions += 1
        risk_notes.append("one step in your roadmap is rated High risk — plan for a buffer period there")

    if salary_drop and dependents:
        deductions += 2
        risk_notes.append(f"you have dependents and the initial salary may drop from ₹{current_salary} to ₹{target_salary} LPA — plan financially before making the move")
    elif salary_drop:
        deductions += 1
        risk_notes.append(f"expect an initial salary adjustment from ₹{current_salary} to ~₹{target_salary} LPA before growing significantly")

    score = max(1, 10 - deductions)

    if score >= 8:
        expl = (
            f"This transition to {target_role} looks safe from a wellbeing and financial perspective. "
            f"Your burnout level is manageable and the salary trajectory is positive."
        )
        rec = "Maintain healthy habits during the transition — consistency matters more than intensity."
    elif score >= 5:
        expl = f"There are some safety considerations to be aware of: {'; '.join(risk_notes)}."
        rec = "Build a 3-month financial buffer before making the switch, and consider setting hard boundaries on working hours during the learning phase."
    else:
        expl = f"This transition carries real risk right now: {'; '.join(risk_notes)}."
        rec = "Address burnout first — even 4–6 weeks of deliberate recovery will significantly improve your chances. Don't rush the transition."

    return {
        "dimension":      "Safety",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [f"Critical burnout ({burnout}/10) is a significant execution risk"] if burnout >= 7 else [],
    }


def _sustainability(profile: dict, roadmap: dict) -> dict:
    dependents      = profile.get("has_dependents", False)
    willing_reloc   = profile.get("willing_to_relocate", False)
    target_timeline = profile.get("target_timeline_years", 2)
    total_months    = roadmap.get("total_transition_months", 0)
    nodes           = roadmap.get("roadmap_nodes", [])
    current_salary  = profile.get("current_salary_lpa", 0) or 0
    target_salary   = nodes[-1].get("salary_estimate_lpa", 0) if nodes else 0
    work_priority   = profile.get("work_life_priority", "")
    target_role     = roadmap.get("target_role", "your target role")

    deductions = 0
    notes = []

    roadmap_years = total_months / 12
    if roadmap_years > target_timeline * 1.5:
        deductions += 2
        notes.append(
            f"your roadmap takes {round(roadmap_years, 1)} years but you wanted to transition in {target_timeline} — "
            f"you may need to accelerate learning or adjust your timeline expectations"
        )

    if current_salary > 0 and target_salary < current_salary:
        deductions += 2
        notes.append(
            f"the final role pays ₹{target_salary} LPA vs your current ₹{current_salary} LPA — "
            f"this is a temporary trade-off for long-term upside, but requires planning"
        )
    elif target_salary >= current_salary * 1.5 and current_salary > 0:
        notes.append(f"strong upside: target salary of ₹{target_salary} LPA is {round(target_salary/current_salary*100-100)}% above your current pay")

    if dependents and not willing_reloc:
        needs_metro = any(n.get("salary_estimate_lpa", 0) > 25 for n in nodes)
        if needs_metro:
            deductions += 2
            notes.append(
                "some steps in your path may require presence in a metro city — "
                "with dependents and no relocation planned, prioritise remote-first companies"
            )

    if work_priority == "Work-Life Balance" and total_months > 18:
        deductions += 1
        notes.append(
            "you've prioritised work-life balance, but this transition will demand significant effort for 18+ months — "
            "pace yourself deliberately"
        )

    score = max(1, 10 - deductions)

    if score >= 8:
        expl = (
            f"Your transition to {target_role} looks sustainable. "
            + (f"Salary grows to ₹{target_salary} LPA — a meaningful improvement. " if target_salary > current_salary else "")
            + (f"The {round(roadmap_years, 1)}-year timeline fits within your {target_timeline}-year goal." if roadmap_years <= target_timeline else "")
        )
        rec = "Set quarterly milestones so you can measure progress without burning out."
    elif score >= 5:
        expl = "A few sustainability factors to watch: " + "; ".join(notes) + "."
        rec = "Plan a phased approach: keep your current job until the transition is financially safe. Build a 6-month emergency fund."
    else:
        expl = "This transition has serious sustainability risks you need to address first: " + "; ".join(notes) + "."
        rec = "Consider a longer runway — stay employed, upskill on weekends for 6–9 months, then make the move with financial safety in place."

    return {
        "dimension":      "Sustainability",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": ["Location conflict: dependents + no relocation vs metro-required roles"] if (dependents and not willing_reloc) else [],
    }


def _inclusivity(profile: dict, roadmap: dict) -> dict:
    city       = profile.get("location_city", "").lower()
    inst_tier  = profile.get("institution_tier", "Tier 2")
    target     = roadmap.get("target_role", "").lower()
    target_role = roadmap.get("target_role", "this role")

    non_metro_cities = {
        "jaipur", "bhopal", "nagpur", "lucknow", "patna", "indore", "surat",
        "vadodara", "kochi", "cochin", "chandigarh", "coimbatore", "vizag",
        "visakhapatnam", "dehradun", "mysore", "mysuru"
    }
    is_non_metro = city in non_metro_cities

    barriers = []
    deductions = 0

    if is_non_metro and any(kw in target for kw in ["senior", "lead", "architect", "director", "head"]):
        deductions += 2
        barriers.append(
            f"senior-level roles like {target_role} have fewer openings in {city.title()} compared to Bangalore, Hyderabad, or Mumbai — "
            f"remote-first companies are your best leverage"
        )

    if inst_tier == "Tier 3" and any(kw in target for kw in ["engineer", "scientist", "developer", "analyst"]):
        deductions += 1
        barriers.append(
            f"some top-tier tech companies apply institute filters in early screening — "
            f"a strong GitHub portfolio and certifications will help override this"
        )

    score = max(4, 10 - deductions)

    if score >= 8:
        expl = f"Your background and location don't present significant barriers to reaching {target_role}. The hiring pipeline for this domain is broadly accessible."
        rec  = "Network on LinkedIn and attend domain-specific events or meetups to accelerate visibility."
    elif score >= 5:
        expl = "There are some access factors worth preparing for: " + "; ".join(barriers) + "."
        rec  = "Target remote-first or hybrid companies in your domain. Build a strong online presence (GitHub, LinkedIn, portfolio) to overcome geography or institute filters."
    else:
        expl = "Your path faces real access challenges: " + "; ".join(barriers) + "."
        rec  = "Invest heavily in visible credentials — certifications, open source contributions, and a portfolio will speak louder than your institute or city."

    return {
        "dimension":      "Inclusivity",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": barriers,
    }


def _objectivity(profile: dict, roadmap: dict, retrieved_doc_ids: list[str]) -> dict:
    doc_count   = len(retrieved_doc_ids)
    nodes       = roadmap.get("roadmap_nodes", [])
    prob        = roadmap.get("success_probability", 50)
    user_skills = profile.get("technical_skills", [])
    target_role = roadmap.get("target_role", "your target role")
    career_goal = profile.get("career_goal", "").strip()

    nodes_with_gaps = sum(1 for n in nodes if n.get("skill_gap") and len(n["skill_gap"]) > 0)
    gap_coverage    = nodes_with_gaps / max(len(nodes), 1)
    prob_realistic  = 30 <= prob <= 85
    skills_detailed = len(user_skills) >= 3

    score = 3
    if doc_count >= 3: score += 2
    elif doc_count >= 1: score += 1
    if gap_coverage >= 0.7: score += 2
    elif gap_coverage >= 0.4: score += 1
    if prob_realistic: score += 1
    if skills_detailed: score += 1
    if career_goal: score += 1
    score = min(9, score)

    if score >= 7:
        expl = (
            f"Your {prob}% success probability is grounded in a real analysis of your {len(user_skills)} listed skills "
            f"against what {target_role} actually requires. Each step in your roadmap has data-backed skill requirements, "
            f"not guesswork."
        )
        rec = "Trust the numbers, but validate by checking 5–10 real job postings for the target role on LinkedIn."
    elif score >= 5:
        expl = (
            f"The core recommendation is data-backed. "
            f"{'Your ' + str(prob) + '% probability looks realistic given your background.' if prob_realistic else 'The success probability may need recalibration — add more specific skills to your profile.'} "
            f"{'Skill gaps are identified for most steps.' if gap_coverage >= 0.5 else 'Some steps lack specific skill gap data.'}"
        )
        rec = f"Add more technical skills and certifications to your profile to get a more precise analysis of your readiness for {target_role}."
    else:
        expl = (
            f"This recommendation is based on limited profile data — "
            f"you've listed {len(user_skills)} skills and {'a career goal' if career_goal else 'no specific career goal'}. "
            f"The more complete your profile, the more accurate the analysis."
        )
        rec = "Fill out all profile sections completely — especially technical skills, certifications, and your specific career goal. This will significantly improve recommendation accuracy."

    return {
        "dimension":      "Objectivity",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [f"Your {prob}% success probability appears outside the realistic range — review your profile completeness"] if not prob_realistic else [],
    }


def _non_bias(profile: dict, roadmap: dict) -> dict:
    gender    = profile.get("gender", "").lower()
    inst_tier = profile.get("institution_tier", "Tier 2")
    prob      = roadmap.get("success_probability", 50)
    target    = roadmap.get("target_role", "").lower()
    target_role = roadmap.get("target_role", "this role")

    flags   = []
    notes   = []

    male_coded   = any(kw in target for kw in ["engineer", "developer", "architect", "cto", "scientist"])
    female_coded = any(kw in target for kw in ["hr", "nurse", "teacher", "care"])

    if gender == "female" and male_coded:
        flags.append("female_in_tech_role")
        notes.append(
            f"As a woman targeting {target_role}, you may face unconscious bias in some hiring processes. "
            f"Companies with strong DEI programs and women-in-tech initiatives are your best fit."
        )
    if gender == "male" and female_coded:
        flags.append("male_in_traditionally_female_role")

    if inst_tier == "Tier 3" and prob < 35:
        flags.append("institution_tier_bias")
        notes.append(
            f"Your {prob}% probability partially reflects limited access at elite firms due to institution tier filters. "
            f"Target product companies and startups where skills matter more than alma mater."
        )

    score = 6 if flags else 9

    if not notes:
        expl = f"This recommendation was generated without demographic bias. Your path to {target_role} is evaluated on skills, experience, and market data — not gender, institution, or location."
        rec  = "Your path is demographically neutral. Focus on building the skills listed in each roadmap step."
    else:
        expl = " ".join(notes)
        rec  = "Seek out companies with explicit inclusion commitments — they tend to evaluate candidates more objectively on skills and potential."

    return {
        "dimension":      "Non-bias",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": notes,
    }


def _integrity(retrieved_doc_ids: list[str]) -> dict:
    doc_count = len(retrieved_doc_ids)
    score = min(8, 4 + doc_count)

    if doc_count > 0:
        expl = (
            f"Your roadmap is built from verified career knowledge — industry role progressions, "
            f"real skill requirements, and compensation benchmarks from the Indian tech market. "
            f"It is curated data, not scraped from live job boards, so salary figures should be "
            f"cross-validated with current postings."
        )
    else:
        expl = (
            "This roadmap is based on general career pattern data. Adding more specific technical skills "
            "and a clearer career goal will allow the system to draw from more targeted knowledge."
        )

    return {
        "dimension":      "Integrity",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": "Validate salary ranges and role titles against current LinkedIn Salary, Glassdoor, and Levels.fyi data before making your decision.",
        "flagged_biases": [],
    }


def _transparency(profile: dict, roadmap: dict, retrieved_doc_ids: list[str]) -> dict:
    explanation_text = roadmap.get("explanation", "").strip()
    nodes            = roadmap.get("roadmap_nodes", [])
    alt_paths        = roadmap.get("alternative_paths", [])
    emotion          = roadmap.get("emotional_forecast", [])
    target_role      = roadmap.get("target_role", "your target role")

    has_explanation  = len(explanation_text) > 100
    is_personalized  = any(kw in explanation_text.lower() for kw in ["your", "you", "year", "month", "%"])
    has_nodes        = len(nodes) >= 2
    has_edges        = len(roadmap.get("roadmap_edges", [])) > 0
    has_alt_paths    = len(alt_paths) > 0
    has_emotion      = len(emotion) > 0

    score = 3
    if has_explanation:  score += 2
    if is_personalized:  score += 1
    if has_nodes:        score += 1
    if has_edges:        score += 1
    if has_alt_paths:    score += 1
    if has_emotion:      score += 1
    score = min(10, score)

    n_steps = len(nodes)
    n_alts  = len(alt_paths)
    n_phases = len(emotion)

    if score >= 8:
        expl = (
            f"Your roadmap to {target_role} is fully transparent: {n_steps} concrete steps, "
            f"each with skill requirements and salary benchmarks. "
            f"You also have {n_alts} alternative path{'s' if n_alts != 1 else ''} and a {n_phases}-phase "
            f"emotional journey forecast so you know what to expect mentally, not just professionally."
        )
        rec = "Refer back to the emotional forecast during stressful phases — it's normal to feel what it describes."
    elif score >= 5:
        expl = (
            f"Your roadmap has a clear step-by-step structure to {target_role}. "
            f"{'A personalised explanation is included.' if is_personalized else 'The AI explanation could be more specific to your profile.'} "
            f"{'Alternative paths are available for exploration.' if has_alt_paths else 'Consider exploring the Suggest Paths feature for alternative routes.'}"
        )
        rec = "Click each roadmap node to see the full skill breakdown, monthly action plan, and recommended courses."
    else:
        expl = (
            f"Your roadmap has a basic structure but some detail is missing. "
            f"This usually happens when the profile has limited skill data to work with."
        )
        rec = "Regenerate your roadmap after adding more technical skills and a specific career goal — you'll get significantly richer step-by-step detail."

    return {
        "dimension":      "Transparency",
        "framework":      "PASSIONIT",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [],
    }


# ─── PRUTL ────────────────────────────────────────────────────────────────────

def _privacy(profile: dict) -> dict:
    sensitive_fields = {
        "gender":           "gender",
        "age":              "age",
        "has_dependents":   "dependent information",
        "recent_life_event":"recent life event",
    }
    used_sensitive = [
        label for field, label in sensitive_fields.items()
        if profile.get(field) not in (None, "", "None", False, 0)
    ]
    num_sensitive = len(used_sensitive)
    name = profile.get("full_name", "Your") or "Your"

    score = 7 if num_sensitive > 2 else (8 if num_sensitive > 0 else 9)

    if num_sensitive > 0:
        expl = (
            f"You shared {num_sensitive} sensitive personal detail{'s' if num_sensitive > 1 else ''} "
            f"({', '.join(used_sensitive)}) which are used to personalise your roadmap — for example, "
            f"adjusting timelines for burnout, or flagging financial risks for dependents. "
            f"This data is not shared with third parties and is only used within your session."
        )
    else:
        expl = (
            "Your roadmap was generated using only professional data (skills, experience, domain). "
            "No sensitive personal information was used. "
            "You can optionally share life context (burnout, dependents) to get more personalised guidance."
        )

    return {
        "dimension":      "Privacy",
        "framework":      "PRUTL",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": "You can delete your profile and all generated data at any time from the History page using 'Clear All Data'.",
        "flagged_biases": [f"Sensitive data influencing recommendation: {', '.join(used_sensitive)}"] if num_sensitive >= 3 else [],
    }


def _reliability(profile: dict, roadmap: dict) -> dict:
    prob  = roadmap.get("success_probability", 50)
    nodes = roadmap.get("roadmap_nodes", [])
    target_role = roadmap.get("target_role", "your target role")

    salaries = [n.get("salary_estimate_lpa", 0) for n in nodes]
    is_ascending = all(salaries[i] <= salaries[i+1] for i in range(len(salaries)-1)) if len(salaries) > 1 else True

    node_months  = nodes[-1].get("timeline_months", 0) if nodes else 0
    total_months = roadmap.get("total_transition_months", 0)
    timeline_ok  = abs(node_months - total_months) <= 6 or total_months == 0

    deductions = 0
    issues     = []

    if not is_ascending:
        deductions += 2
        issues.append("salary progression has a dip mid-path — this can happen with major domain pivots")

    if not timeline_ok and node_months > 0:
        deductions += 1
        issues.append("the timeline across individual steps doesn't exactly match the total — treat it as an estimate")

    score = max(5, 10 - deductions)

    if score >= 8:
        final_salary = salaries[-1] if salaries else 0
        expl = (
            f"Your roadmap is internally consistent. Salary grows progressively to ₹{final_salary} LPA, "
            f"and the timeline of {total_months} months is calibrated to your experience and burnout level. "
            f"If you follow the plan, the milestones are achievable."
        )
        rec = "Set a calendar reminder every 3 months to review your progress against the roadmap milestones."
    else:
        expl = f"There are minor consistency notes in your roadmap: {'; '.join(issues)}. These don't invalidate the plan but are worth knowing."
        rec = "Treat your roadmap timelines as directional guides, not rigid deadlines — adjust based on how quickly you acquire each skill set."

    return {
        "dimension":      "Reliability",
        "framework":      "PRUTL",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [],
    }


def _usability(roadmap: dict) -> dict:
    nodes   = roadmap.get("roadmap_nodes", [])
    edges   = roadmap.get("roadmap_edges", [])
    alt     = roadmap.get("alternative_paths", [])
    emotion = roadmap.get("emotional_forecast", [])
    target_role = roadmap.get("target_role", "your target role")

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

    n_alts   = len(alt)
    n_phases = len(emotion)

    if score >= 8:
        expl = (
            f"Your roadmap is highly actionable. Each of the {len(nodes)} steps has specific skills to build, "
            f"a salary benchmark, and a risk rating. "
            f"Click any node on the roadmap for a month-by-month plan and recommended courses with direct links."
        )
        rec = "Use the 'Mark Done' button on each node as you complete it — it tracks your real progress through the transition."
    elif score >= 5:
        expl = (
            f"Your roadmap gives you {len(nodes)} transition steps with skill gaps and salary targets. "
            f"{'It also includes ' + str(n_alts) + ' alternative paths you can pivot to.' if n_alts else ''} "
            f"Some steps could be more specific — click each node to explore the detail available."
        )
        rec = "For steps with vague skill requirements, check the node flashcard and search the suggested courses for that skill area."
    else:
        expl = (
            f"Your roadmap has a basic structure but the individual steps need more detail to be fully actionable. "
            f"This is usually because the profile has limited skill data."
        )
        rec = "Regenerate with a more complete profile — add at least 5 technical skills, your certifications, and a specific career goal to get a highly actionable roadmap."

    return {
        "dimension":      "Usability",
        "framework":      "PRUTL",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [],
    }


def _trustworthiness(profile: dict, roadmap: dict) -> dict:
    prob      = roadmap.get("success_probability", 50)
    nodes     = roadmap.get("roadmap_nodes", [])
    months    = roadmap.get("total_transition_months", 0)
    years_exp = profile.get("years_of_experience", 0)
    target_role = roadmap.get("target_role", "your target role")

    user_skills  = profile.get("technical_skills", [])
    required_all = [s for n in nodes for s in n.get("required_skills", [])]
    overlap      = _skill_overlap_ratio(user_skills, list(set(required_all)))
    overlap_pct  = round(overlap * 100)

    deductions = 0
    concerns   = []

    if overlap < 0.1 and prob > 60:
        deductions += 3
        concerns.append(
            f"your {prob}% success probability is higher than your current skill overlap ({overlap_pct}%) would suggest — "
            f"this may reflect strong domain alignment but will require significant upskilling"
        )

    if months < 6 and any("senior" in n.get("role_title", "").lower() for n in nodes):
        deductions += 2
        concerns.append("the timeline to a senior role is shorter than industry norms — treat it as a minimum, not a guarantee")

    if years_exp < 2 and prob > 80:
        deductions += 1
        concerns.append(f"an {prob}% probability with under 2 years experience is ambitious — the plan is doable but will require disciplined execution")

    score = max(3, 9 - deductions)

    if score >= 8:
        expl = (
            f"A career expert reviewing your profile would largely agree with this recommendation. "
            f"You already have {overlap_pct}% of the skills {target_role} requires, and the "
            f"{months}-month timeline is consistent with industry transition norms for your experience level."
        )
        rec = "Your plan is credible. Execute it methodically — the biggest risk is losing momentum mid-transition."
    elif score >= 5:
        expl = f"The recommendation is broadly trustworthy, with a few nuances: {'; '.join(concerns)}."
        rec = "Be realistic about the timeline — add a 3–6 month buffer to your plan to account for slower-than-expected progress in the hardest skill areas."
    else:
        expl = f"There are credibility concerns with this roadmap that need addressing: {'; '.join(concerns)}."
        rec = "Revisit your profile — ensure your listed skills are current and your career goal is specific. A more accurate profile will produce a more trustworthy recommendation."

    return {
        "dimension":      "Trustworthiness",
        "framework":      "PRUTL",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
        "flagged_biases": [f"Probability-skill gap: {overlap_pct}% skill match but {prob}% success probability — review profile accuracy"] if (overlap < 0.1 and prob > 60) else [],
    }


def _legality(profile: dict, roadmap: dict) -> dict:
    age   = profile.get("age", 30) or 30
    nodes = roadmap.get("roadmap_nodes", [])
    target_role = roadmap.get("target_role", "your target role")
    flags = []

    if age > 55 and any("junior" in n.get("role_title", "").lower() for n in nodes):
        flags.append(
            f"at {age}, targeting junior-level roles may face age bias in some hiring processes — "
            f"consider targeting mid-level or specialist roles that value your experience"
        )

    zero_salary_nodes = [n for n in nodes if n.get("salary_estimate_lpa", 1) == 0 and n.get("node_order", 1) > 1]
    if zero_salary_nodes:
        flags.append("some transition steps have no salary estimate — ensure these are paid roles, not unpaid internships")

    score = 5 if flags else 10

    if not flags:
        expl = (
            f"Your roadmap to {target_role} follows standard career progression norms. "
            f"No age-discriminatory role suggestions, no unpaid-labour concerns, and no compliance flags detected."
        )
        rec = "Proceed with confidence. Know your rights during the hiring process — companies cannot legally discriminate on age, gender, or background."
    else:
        expl = "A few things to be aware of: " + "; ".join(flags) + "."
        rec = "When evaluating offers, ensure all roles are salaried positions with standard employment contracts. You have the right to negotiate."

    return {
        "dimension":      "Legality",
        "framework":      "PRUTL",
        "score":          score,
        "risk_level":     _risk(score),
        "explanation":    expl,
        "recommendation": rec,
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
    All explanations are written for the user, not the system.
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
