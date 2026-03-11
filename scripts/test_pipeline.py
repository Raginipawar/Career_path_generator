"""
End-to-end test of the RAG pipeline.
Tests with the demo scenario: 35-year-old burned-out engineer interested in teaching.

Usage:
    python scripts/test_pipeline.py
    python scripts/test_pipeline.py --profile path/to/profile.json

Run from the rag-service/ directory.
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import UserProfile
from rag.retriever import retrieve_career_docs, build_profile_text
from rag.generator import generate_roadmap, generate_audit
from rag.embedder import get_doc_count
from rag.cache import is_connected as redis_connected


# ── Demo scenario profile ──
DEMO_PROFILE = {
    "user_id": "demo_001",
    "full_name": "Vikram Sharma",
    "age": 35,
    "gender": "Male",
    "location_city": "Bangalore",
    "location_state": "Karnataka",
    "highest_degree": "B.Tech",
    "field_of_study": "Computer Science",
    "institution_tier": "Tier 1",
    "current_role": "Senior Software Engineer",
    "current_industry": "IT",
    "years_of_experience": 11.0,
    "employment_status": "Employed Full-Time",
    "current_salary_lpa": 28.5,
    "technical_skills": ["Python", "Java", "SQL", "AWS", "Docker", "REST APIs", "Git"],
    "soft_skills": ["Team Leadership", "Mentoring", "Communication", "Problem Solving"],
    "certifications": ["AWS SAA"],
    "interest_domains": ["EdTech"],
    "career_goal": "Transition to teaching and education",
    "preferred_work_style": "Hybrid",
    "willing_to_relocate": False,
    "target_timeline_years": 3,
    "life_stage": "Mid Career",
    "burnout_level": 8,
    "stress_tolerance": 4,
    "has_dependents": True,
    "recent_life_event": "New Parent",
    "work_life_priority": "Work-Life Balance",
    "leadership_score": 7.5,
    "alignment_category": "Moderate",
    "created_at": "2026-03-08T00:00:00Z",
    "updated_at": "2026-03-08T00:00:00Z",
}


def run_test(profile_dict: dict):
    print("=" * 60)
    print("RAG PIPELINE END-TO-END TEST")
    print("=" * 60)

    # Status check
    print(f"\nChromaDB docs: {get_doc_count()}")
    print(f"Redis available: {redis_connected()}")

    if get_doc_count() == 0:
        print("\nERROR: ChromaDB is empty! Run embed_docs.py first.")
        sys.exit(1)

    # Parse profile
    profile = UserProfile(**profile_dict)
    print(f"\nProfile: {profile.full_name}, {profile.age}yo")
    print(f"Role: {profile.current_role} ({profile.years_of_experience}yr)")
    print(f"Goal: {profile.career_goal}")
    print(f"Burnout: {profile.burnout_level}/10, Life event: {profile.recent_life_event}")

    # Step 1: Profile text
    profile_text = build_profile_text(profile)
    print(f"\n{'─'*40}")
    print("STEP 1: Profile text for embedding")
    print(f"{'─'*40}")
    print(profile_text[:300] + "...")

    # Step 2: Retrieve docs
    print(f"\n{'─'*40}")
    print("STEP 2: Retrieving career documents...")
    print(f"{'─'*40}")
    start = time.time()
    docs = retrieve_career_docs(profile, top_k=5)
    print(f"Retrieved {len(docs)} docs in {time.time()-start:.2f}s")
    for d in docs:
        print(f"  [{d['metadata']['domain']}] {d['doc_id']} "
              f"({d['metadata']['doc_type']}) — dist: {d['distance']:.4f}")

    # Step 3: Generate roadmap
    print(f"\n{'─'*40}")
    print("STEP 3: Generating roadmap via Groq LLaMA 3...")
    print(f"{'─'*40}")
    start = time.time()
    roadmap = generate_roadmap(profile_dict, docs)
    elapsed = time.time() - start
    print(f"Roadmap generated in {elapsed:.2f}s")

    if not roadmap:
        print("FAILED: Roadmap generation returned None.")
        sys.exit(1)

    print(f"\nPath: {roadmap.get('current_role')} → {roadmap.get('target_role')}")
    print(f"Success probability: {roadmap.get('success_probability')}%")
    print(f"Total transition: {roadmap.get('total_transition_months')} months")
    print(f"Explanation: {roadmap.get('explanation', '')[:200]}...")

    print("\nRoadmap nodes:")
    for node in roadmap.get("roadmap_nodes", []):
        print(f"  {node.get('node_order')}. {node.get('role_title')} "
              f"(+{node.get('timeline_months')}mo, {node.get('salary_estimate_lpa')} LPA, "
              f"Risk: {node.get('risk_level')})")

    print("\nEmotional forecast:")
    for phase in roadmap.get("emotional_forecast", []):
        print(f"  {phase.get('timeline')}: {phase.get('phase')} — "
              f"Stress: {phase.get('stress_level')}")

    # Step 4: Generate ethical audit
    print(f"\n{'─'*40}")
    print("STEP 4: Generating ethical audit via Groq LLaMA 3...")
    print(f"{'─'*40}")
    start = time.time()
    audit = generate_audit(profile_dict, roadmap)
    elapsed = time.time() - start
    print(f"Audit generated in {elapsed:.2f}s — {len(audit)} dimensions")

    for score in audit:
        risk_emoji = {"Low": "🟢", "Medium": "🟡", "High": "🔴"}.get(score.get("risk_level"), "⚪")
        print(f"  {risk_emoji} {score.get('dimension')} ({score.get('framework')}): "
              f"{score.get('score')}/10 — {score.get('explanation', '')[:80]}")

    # Save full output
    output = {
        "profile": profile_dict,
        "retrieved_docs": [d["doc_id"] for d in docs],
        "roadmap": roadmap,
        "audit_scores": audit,
    }
    output_path = "test_output.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nFull output saved to {output_path}")

    print(f"\n{'='*60}")
    print("TEST COMPLETE — ALL STEPS PASSED")
    print(f"{'='*60}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", help="Path to custom profile JSON file")
    args = parser.parse_args()

    if args.profile:
        with open(args.profile) as f:
            profile = json.load(f)
        run_test(profile)
    else:
        run_test(DEMO_PROFILE)
