from __future__ import annotations
import json
import time
import re
from groq import Groq
from config import get_settings
from prompts.roadmap import ROADMAP_SYSTEM_PROMPT, build_roadmap_prompt

settings = get_settings()

# ──────────────────────────────────────────────
# Groq client (initialized once)
# ──────────────────────────────────────────────

_groq_client: Groq | None = None


def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.groq_api_key)
        print("Groq client initialized.")
    return _groq_client


def is_groq_available() -> bool:
    """Quick check if Groq API is reachable."""
    try:
        client = get_groq_client()
        # Minimal test call
        client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
        )
        return True
    except Exception as e:
        print(f"Groq availability check failed: {e}")
        return False


# ──────────────────────────────────────────────
# JSON parsing helpers
# ──────────────────────────────────────────────

def _clean_json_response(text: str) -> str:
    """
    Strip markdown fences, leading/trailing whitespace,
    and any non-JSON preamble from LLM output.
    """
    text = text.strip()

    # Remove ```json ... ``` wrappers
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()

    # If there's text before the first {, strip it
    first_brace = text.find('{')
    if first_brace > 0:
        text = text[first_brace:]

    # If there's text after the last }, strip it
    last_brace = text.rfind('}')
    if last_brace >= 0 and last_brace < len(text) - 1:
        text = text[:last_brace + 1]

    return text


def _parse_json_safe(text: str) -> dict | None:
    """Attempt to parse JSON from LLM output, with cleanup."""
    cleaned = _clean_json_response(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"JSON parse failed: {e}")
        print(f"Raw output (first 500 chars): {text[:500]}")
        return None


# ──────────────────────────────────────────────
# Groq call with exponential backoff retry
# ──────────────────────────────────────────────

def _call_groq(
    system_prompt: str,
    user_message: str,
    max_retries: int = 3,
    temperature: float = 0.3,
) -> dict | None:
    """
    Call Groq LLaMA 3 with retry logic.
    Returns parsed JSON dict or None on failure.
    """
    client = get_groq_client()

    for attempt in range(max_retries):
        try:
            print(f"Groq call attempt {attempt + 1}/{max_retries}...")
            response = client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=temperature,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )

            raw_text = response.choices[0].message.content
            parsed = _parse_json_safe(raw_text)

            if parsed is not None:
                print(f"Groq call succeeded on attempt {attempt + 1}.")
                return parsed

            # JSON parse failed — retry with lower temperature
            print(f"Attempt {attempt + 1}: JSON parse failed, retrying...")
            temperature = max(0.1, temperature - 0.1)

        except Exception as e:
            error_str = str(e).lower()

            if "rate_limit" in error_str or "429" in error_str:
                wait_time = (2 ** attempt) * 5  # 5, 10, 20 seconds
                print(f"Rate limited. Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            elif "503" in error_str or "service unavailable" in error_str:
                wait_time = (2 ** attempt) * 3
                print(f"Service unavailable. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Groq error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)

    print("All Groq retry attempts exhausted.")
    return None


# ──────────────────────────────────────────────
# Public API: Generate roadmap
# ──────────────────────────────────────────────

def generate_roadmap(
    profile_dict: dict,
    retrieved_docs: list[dict],
    prob_min: int = 5,
    prob_max: int = 88,
) -> dict | None:
    """
    Build career roadmap from knowledge base (system is the brain).
    Groq writes ONE explanation paragraph — that's its only job here.
    """
    from rag.roadmap_builder import build_roadmap_from_data

    # System builds the full roadmap structure from data
    roadmap = build_roadmap_from_data(profile_dict, retrieved_docs, prob_min, prob_max)
    print(f"System built roadmap: {roadmap['current_role']} → {roadmap['target_role']}, "
          f"P={roadmap['success_probability']}%, {roadmap['total_transition_months']}mo")

    # Groq writes ONE explanation paragraph — only natural language job
    explanation = _generate_explanation(profile_dict, roadmap)
    roadmap["explanation"] = explanation

    return roadmap


def _generate_explanation(profile_dict: dict, roadmap: dict) -> str:
    """
    Single Groq call — writes ONE explanation paragraph.
    Everything else is already computed by the system.
    """
    prompt = (
        f"Write a 3-sentence career advisor explanation for this transition:\n"
        f"Person: {profile_dict.get('full_name', 'User')}, "
        f"currently {profile_dict.get('current_role', '')} with "
        f"{profile_dict.get('years_of_experience', 0)} years experience.\n"
        f"Transition: {roadmap['current_role']} → {roadmap['target_role']}\n"
        f"Timeline: {roadmap['total_transition_months']} months, "
        f"Probability: {roadmap['success_probability']}%\n"
        f"Key skill gaps: {', '.join(roadmap['roadmap_nodes'][-1].get('skill_gap', [])[:3])}\n"
        f"Write in second person ('Your background...'). Be specific, honest, and encouraging. "
        f"Reference actual numbers. Do NOT use markdown."
    )
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Explanation generation failed: {e}")
        return (
            f"Your background positions you for the {roadmap['current_role']} → "
            f"{roadmap['target_role']} transition with a {roadmap['success_probability']}% "
            f"success probability over {roadmap['total_transition_months']} months. "
            f"Focus on building the key skills identified in each stage."
        )


# ──────────────────────────────────────────────
# Public API: Generate ethical audit (now deterministic)
# ──────────────────────────────────────────────

def generate_audit(
    profile_dict: dict,
    roadmap_json: dict,
) -> list[dict]:
    """
    PASSIONIT/PRUTL audit computed deterministically from profile and roadmap data.
    Groq is NOT called here. The system is the auditor.
    """
    from rag.auditor import compute_full_audit
    retrieved_doc_ids = roadmap_json.get("retrieved_doc_ids", [])
    scores = compute_full_audit(profile_dict, roadmap_json, retrieved_doc_ids)
    print(f"Deterministic audit complete: {len(scores)} dimensions evaluated, no LLM used.")
    return scores

    # ──────────────────────────────────────────────
# Fallback: pre-generated demo response
# ──────────────────────────────────────────────

DEMO_FALLBACK = {
    "current_role": "Senior Software Engineer",
    "target_role": "Technical Educator / EdTech Curriculum Lead",
    "success_probability": 78,
    "total_transition_months": 36,
    "explanation": "Based on 11 years of engineering experience, strong mentoring skills, and stated interest in EdTech, a transition to technical education is highly viable. The burnout level and new parent status suggest a gradual part-time transition.",
    "roadmap_nodes": [
        {"node_id": "node_1", "role_title": "Senior Software Engineer", "node_order": 1, "timeline_months": 0, "required_skills": ["Python", "Java", "AWS"], "skill_gap": [], "salary_estimate_lpa": 28.5, "risk_level": "Low", "description": "Current role — use this phase for burnout recovery and part-time teaching."},
        {"node_id": "node_2", "role_title": "Part-time Technical Trainer", "node_order": 2, "timeline_months": 6, "required_skills": ["Curriculum Design", "Public Speaking"], "skill_gap": ["Curriculum Design", "Instructional Design"], "salary_estimate_lpa": 12.0, "risk_level": "Medium", "description": "Start teaching on weekends at bootcamps or platforms like Scaler/Coding Ninjas while still employed."},
        {"node_id": "node_3", "role_title": "Full-time Technical Educator", "node_order": 3, "timeline_months": 18, "required_skills": ["LMS Platforms", "Content Creation", "Assessment Design"], "skill_gap": ["LMS Platforms"], "salary_estimate_lpa": 15.0, "risk_level": "Medium", "description": "Transition to full-time teaching role at an EdTech company or university."},
        {"node_id": "node_4", "role_title": "EdTech Curriculum Lead", "node_order": 4, "timeline_months": 36, "required_skills": ["Team Leadership", "Program Management"], "skill_gap": ["Program Management"], "salary_estimate_lpa": 20.0, "risk_level": "Low", "description": "Lead curriculum design for a department or EdTech platform."},
    ],
    "roadmap_edges": [
        {"source": "node_1", "target": "node_2", "label": "6 months: build teaching portfolio + complete instructional design course"},
        {"source": "node_2", "target": "node_3", "label": "12 months: gain classroom experience + build reputation"},
        {"source": "node_3", "target": "node_4", "label": "18 months: demonstrate leadership in curriculum projects"},
    ],
    "emotional_forecast": [
        {"phase": "Burnout Recovery", "timeline": "Months 1-6", "stress_level": "High", "description": "Identity shift from engineer to educator. Financial anxiety about salary drop. Support from family is critical."},
        {"phase": "Skill Building", "timeline": "Months 7-18", "stress_level": "Medium", "description": "Growing confidence as a teacher. New parent routine stabilizing."},
        {"phase": "Growth Phase", "timeline": "Months 19-36", "stress_level": "Low", "description": "Established in new career. Better work-life balance achieved."},
    ],
    "alternative_paths": [
        {"path_name": "Developer Advocate Route", "roles": ["Senior Engineer", "Developer Advocate", "Head of DevRel"], "total_months": 24, "success_probability": 72},
        {"path_name": "Engineering Manager Route", "roles": ["Senior Engineer", "Tech Lead", "Engineering Manager"], "total_months": 30, "success_probability": 68},
    ],
}

DEMO_AUDIT_FALLBACK = [
    {"dimension": "Purpose", "framework": "PASSIONIT", "score": 9, "risk_level": "Low", "explanation": "Path aligns with stated goal of transitioning to teaching.", "recommendation": "Continue validating interest through part-time teaching.", "flagged_biases": []},
    {"dimension": "Accountability", "framework": "PASSIONIT", "score": 8, "risk_level": "Low", "explanation": "Recommendation traced to skills, experience, and market data.", "recommendation": "Document data sources used.", "flagged_biases": []},
    {"dimension": "Safety", "framework": "PASSIONIT", "score": 7, "risk_level": "Medium", "explanation": "Salary drop from 28.5 to 12 LPA in phase 2 is significant.", "recommendation": "Highlight financial planning steps.", "flagged_biases": ["Salary risk not prominently warned"]},
    {"dimension": "Sustainability", "framework": "PASSIONIT", "score": 8, "risk_level": "Low", "explanation": "EdTech is a growing industry in India with stable demand.", "recommendation": "Monitor industry trends quarterly.", "flagged_biases": []},
    {"dimension": "Inclusivity", "framework": "PASSIONIT", "score": 9, "risk_level": "Low", "explanation": "Recommendation works regardless of gender or location.", "recommendation": "Verify with diverse profile types.", "flagged_biases": []},
    {"dimension": "Objectivity", "framework": "PASSIONIT", "score": 8, "risk_level": "Low", "explanation": "Based on skills and market data, not assumptions.", "recommendation": "Add quantitative skill-match scoring.", "flagged_biases": []},
    {"dimension": "Non-bias", "framework": "PASSIONIT", "score": 9, "risk_level": "Low", "explanation": "No demographic biases detected.", "recommendation": "Continue fairness audits.", "flagged_biases": ["Gender-neutral language verified"]},
    {"dimension": "Integrity", "framework": "PASSIONIT", "score": 8, "risk_level": "Low", "explanation": "Data sources are current and accurate.", "recommendation": "Update market data quarterly.", "flagged_biases": []},
    {"dimension": "Transparency", "framework": "PASSIONIT", "score": 7, "risk_level": "Medium", "explanation": "Explanation provided but could include more detail.", "recommendation": "Add downloadable detailed roadmap.", "flagged_biases": []},
    {"dimension": "Privacy", "framework": "PRUTL", "score": 9, "risk_level": "Low", "explanation": "Personal data handled appropriately.", "recommendation": "Document data retention policy.", "flagged_biases": []},
    {"dimension": "Reliability", "framework": "PRUTL", "score": 8, "risk_level": "Low", "explanation": "Consistent results across similar profiles.", "recommendation": "Add reproducibility testing.", "flagged_biases": []},
    {"dimension": "Usability", "framework": "PRUTL", "score": 8, "risk_level": "Low", "explanation": "Output is actionable and clear.", "recommendation": "Add timeline visualization.", "flagged_biases": []},
    {"dimension": "Trustworthiness", "framework": "PRUTL", "score": 8, "risk_level": "Low", "explanation": "A career counselor would largely agree.", "recommendation": "Validate with domain experts.", "flagged_biases": []},
    {"dimension": "Legality", "framework": "PRUTL", "score": 9, "risk_level": "Low", "explanation": "Compliant with employment laws.", "recommendation": "No action needed.", "flagged_biases": []},
]


def apply_deterministic_audit(audit_scores: list[dict], profile_dict: dict, roadmap_json: dict) -> list[dict]:
    """
    Override/correct specific PASSIONIT/PRUTL dimensions using actual profile data.
    This prevents the LLM from self-grading generously on quantifiable dimensions.
    """
    burnout        = profile_dict.get('burnout_level', 5)
    stress_tol     = profile_dict.get('stress_tolerance', 5)
    has_dependents = profile_dict.get('has_dependents', False)
    willing_reloc  = profile_dict.get('willing_to_relocate', False)
    inst_tier      = profile_dict.get('institution_tier', 'Tier 2')
    career_goal    = (profile_dict.get('career_goal') or '').lower()
    target_role    = (roadmap_json.get('target_role') or '').lower()
    prob           = roadmap_json.get('success_probability', 50)
    nodes          = roadmap_json.get('roadmap_nodes', [])

    # Check if any node requires relocation (heuristic: high salary jump implies tier-1 city)
    needs_relocation = any(n.get('salary_estimate_lpa', 0) > 30 for n in nodes)

    # Check salary jump ratio
    current_salary = profile_dict.get('current_salary_lpa', 0)
    target_salary  = nodes[-1].get('salary_estimate_lpa', 0) if nodes else 0
    salary_jump    = (target_salary - current_salary) / max(current_salary, 1)

    # Purpose: keyword overlap between career_goal and target_role
    goal_words   = set(career_goal.split())
    target_words = set(target_role.split())
    overlap      = len(goal_words & target_words)
    purpose_score = 9 if overlap >= 2 else (7 if career_goal else 5)

    # Safety: burnout + stress + high-demand path
    if burnout >= 8:
        safety_score, safety_risk, safety_note = 3, 'High', f'Burnout at {burnout}/10 is critical. This transition adds significant stress.'
    elif burnout >= 6:
        safety_score, safety_risk, safety_note = 5, 'Medium', f'Moderate burnout ({burnout}/10). Monitor stress during transition.'
    else:
        safety_score, safety_risk, safety_note = 8, 'Low', 'Burnout levels manageable for this transition.'

    # Sustainability: dependents + relocation + salary dip risk
    if has_dependents and needs_relocation and not willing_reloc:
        sust_score, sust_risk = 3, 'High'
        sust_note = 'Has dependents but not willing to relocate — path requires metro presence. Significant sustainability risk.'
    elif has_dependents and salary_jump < -0.1:
        sust_score, sust_risk = 4, 'High'
        sust_note = 'Has dependents and expected salary drop. Financial sustainability risk.'
    elif burnout >= 7 and stress_tol <= 4:
        sust_score, sust_risk = 4, 'High'
        sust_note = 'High burnout + low stress tolerance makes long transition unsustainable.'
    else:
        sust_score, sust_risk = 7 if has_dependents else 8, 'Medium' if has_dependents else 'Low'
        sust_note = 'Transition appears sustainable given life context.'

    # Non-bias: institution tier check
    if inst_tier == 'Tier 3' and prob < 40:
        bias_score, bias_risk = 4, 'Medium'
        bias_note = 'Low probability may reflect institution tier bias. Tier 3 graduates face extra scrutiny in competitive roles.'
        bias_flags = ['Institution tier bias detected — Tier 3 may be disadvantaged']
    else:
        bias_score, bias_risk = 8, 'Low'
        bias_note = 'No significant demographic or institutional bias detected in this recommendation.'
        bias_flags = []

    deterministic_overrides = {
        'Purpose':       {'score': purpose_score, 'risk_level': 'Low' if purpose_score >= 7 else 'Medium', 'explanation': f'Career goal alignment with target role: {"strong" if purpose_score >= 7 else "partial"}. Goal: "{profile_dict.get("career_goal", "not specified")}", Target: "{roadmap_json.get("target_role", "")}"', 'flagged_biases': []},
        'Safety':        {'score': safety_score, 'risk_level': safety_risk, 'explanation': safety_note, 'flagged_biases': []},
        'Sustainability':{'score': sust_score,   'risk_level': sust_risk,   'explanation': sust_note,   'flagged_biases': []},
        'Non-bias':      {'score': bias_score,   'risk_level': bias_risk,   'explanation': bias_note,   'flagged_biases': bias_flags},
    }

    updated = []
    for score in audit_scores:
        dim = score.get('dimension', '')
        if dim in deterministic_overrides:
            override = deterministic_overrides[dim]
            score = {**score, **override}
        updated.append(score)

    return updated



def get_fallback_roadmap() -> dict:
    """Return pre-generated demo roadmap when Groq is unavailable."""
    return DEMO_FALLBACK.copy()


def get_fallback_audit() -> list[dict]:
    """Return pre-generated demo audit when Groq is unavailable."""
    return [s.copy() for s in DEMO_AUDIT_FALLBACK]
