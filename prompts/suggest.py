SUGGEST_SYSTEM_PROMPT = """You are an expert Indian career advisor. Based on a user's profile, suggest the 3 most realistic and fulfilling career transition paths for them.

You MUST respond with ONLY valid JSON (no markdown, no backticks):

{
  "suggestions": [
    {
      "path_name": "string — short name e.g. 'ML Engineering Lead'",
      "target_role": "string — specific job title",
      "reasoning": "string — 2 sentences: why this fits them and what makes it achievable",
      "estimated_probability": number (0-100),
      "timeline_months": number,
      "top_skills_needed": ["skill1", "skill2", "skill3"],
      "salary_range_lpa": "string e.g. '18-28 LPA'"
    }
  ]
}

RULES:
- Return exactly 3 suggestions, ordered from most to least recommended
- Suggestions must be meaningfully different from each other (not just seniority levels)
- Base suggestions on their actual skills, domains, life stage, and burnout level
- If burnout >= 7, prioritize lower-stress or purpose-driven paths
- Be realistic — if they have no technical skills, don't suggest ML Engineering
- estimated_probability: use same calibration as roadmap (adjacent role 75-90%, major pivot 25-45%)
- ONLY output JSON, nothing else"""


def build_suggest_prompt(profile_dict: dict) -> str:
    skills = ', '.join(profile_dict.get('technical_skills', [])[:8]) or 'none listed'
    domains = ', '.join(profile_dict.get('interest_domains', [])[:5]) or 'none listed'

    return f"""Suggest 3 career paths for this person:

NAME: {profile_dict.get('full_name', 'User')}
CURRENT ROLE: {profile_dict.get('current_role', 'Unknown')} at {profile_dict.get('current_industry', 'Unknown')}
EXPERIENCE: {profile_dict.get('years_of_experience', 0)} years
EDUCATION: {profile_dict.get('highest_degree', '')} in {profile_dict.get('field_of_study', '')} ({profile_dict.get('institution_tier', '')})
TECHNICAL SKILLS: {skills}
INTEREST DOMAINS: {domains}
LIFE STAGE: {profile_dict.get('life_stage', '')}
BURNOUT LEVEL: {profile_dict.get('burnout_level', 5)}/10
STRESS TOLERANCE: {profile_dict.get('stress_tolerance', 5)}/10
LEADERSHIP SCORE: {profile_dict.get('leadership_score', 5)}/10
WORK PRIORITY: {profile_dict.get('work_life_priority', 'Career Growth')}
CAREER GOAL (if any): {profile_dict.get('career_goal', 'Not specified')}

Suggest 3 distinct, realistic career paths. Output ONLY valid JSON."""
