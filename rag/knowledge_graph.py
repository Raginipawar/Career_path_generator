"""
rag/knowledge_graph.py — Career Knowledge Graph

Builds a directed weighted graph from ChromaDB metadata fields.
Each document already has: role_title, domain, experience_level.
We use these directly — no regex needed.

Node = (domain, experience_level, role_title) with skill list from text.
Edge = progression within same domain: Entry → Mid → Senior → Leadership.

Works with ALL domains in the KB, not just pre-defined ones.
"""

from __future__ import annotations
import re
import math
from collections import defaultdict
from typing import Optional

import networkx as nx
from rag.embedder import get_model, get_collection

# ─── Experience level ordering ────────────────────────────────────────────────
LEVEL_ORDER = {"entry": 1, "mid": 2, "senior": 3, "leadership": 4}

def _level_int(level: str) -> int:
    return LEVEL_ORDER.get(level.lower().strip(), 2)

# ─── Domain normalisation: KB names → internal lowercase keys ─────────────────
# KB uses title-case, rest of system uses lowercase
KB_DOMAIN_MAP = {
    "AI & ML":                         "ai & ml",
    "Cloud & DevOps":                  "cloud & devops",
    "Data Analytics & Business Intelligence": "data analytics",
    "Full Stack Web Development":      "full stack",
    "FinTech & Banking Technology":    "fintech",
    "Cybersecurity":                   "cybersecurity",
    "Product Management":              "product management",
    "UI/UX Design":                    "ui/ux",
    "EdTech & Technical Education":    "edtech",
    "Healthcare IT & Health Tech":     "healthcare it",
    "Embedded Systems & IoT":          "embedded & iot",
    "Gaming & Interactive Media":      "gaming",
    "Research & Academia":             "research",
    "Consulting & Strategy":           "consulting",
    "Entrepreneurship & Startups":     "entrepreneurship",
    "GCC & Global Delivery Leadership": "global delivery",
    "HR Technology & People Analytics": "hr technology",
    "Finance & Investment":            "finance",
    "Sales & Business Development":    "sales",
    "Digital Marketing & Growth":      "digital marketing",
    "Legal Tech & Compliance":         "legal tech",
    "Supply Chain & Operations Tech":  "supply chain",
    "Content & Creator Economy":       "content",
    "Sustainability & ESG":            "sustainability",
    "Civil & Infrastructure Engineering": "civil engineering",
}

def normalise_domain(kb_domain: str) -> str:
    """Convert KB domain name to internal key."""
    return KB_DOMAIN_MAP.get(kb_domain, kb_domain.lower())

def kb_domain_from_internal(internal: str) -> str:
    """Reverse lookup: internal key → KB domain name."""
    for kb, norm in KB_DOMAIN_MAP.items():
        if norm == internal:
            return kb
    return internal.title()

# ─── Skill extraction from document text ─────────────────────────────────────
SKILL_PATTERN = re.compile(
    r'\b('
    r'Python|JavaScript|TypeScript|Java|Go|Rust|C\+\+|Swift|Kotlin|'
    r'React|Vue|Angular|Next\.js|Node\.js|Express|Django|FastAPI|Flask|Spring|'
    r'SQL|PostgreSQL|MySQL|MongoDB|Redis|Kafka|Elasticsearch|'
    r'AWS|GCP|Azure|Docker|Kubernetes|Terraform|Linux|CI/CD|'
    r'Machine Learning|Deep Learning|TensorFlow|PyTorch|scikit-learn|MLOps|'
    r'NLP|Computer Vision|LLM|pandas|NumPy|Spark|Hadoop|'
    r'Figma|Sketch|Adobe XD|Prototyping|'
    r'System Design|Microservices|REST API|GraphQL|'
    r'Agile|Scrum|Jira|OKRs|Product Management|Roadmapping|'
    r'Cybersecurity|Penetration Testing|SIEM|OWASP|'
    r'Data Analysis|Tableau|Power BI|Excel|Statistics|'
    r'Blockchain|Solidity|Web3|'
    r'iOS|Android|Flutter|React Native|'
    r'SAP|ERP|Supply Chain|Logistics'
    r')\b',
    re.IGNORECASE,
)

def _extract_skills(text: str) -> list[str]:
    found = SKILL_PATTERN.findall(text)
    # Deduplicate preserving order, normalise case
    seen, result = set(), []
    for s in found:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            result.append(s)
    return result


# ─── Graph builder ────────────────────────────────────────────────────────────

_graph: Optional[nx.DiGraph] = None

def _cosine(a: list[float], b: list[float]) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def build_career_graph() -> nx.DiGraph:
    """
    Build career graph directly from ChromaDB metadata.
    No regex guessing — uses role_title, domain, experience_level fields.
    """
    global _graph
    if _graph is not None:
        return _graph

    print("Building career knowledge graph from ChromaDB metadata...")
    G = nx.DiGraph()

    # domain → level → {role_titles, skills}
    domain_levels: dict[str, dict[int, dict]] = defaultdict(lambda: defaultdict(lambda: {"roles": set(), "skills": set()}))

    try:
        collection = get_collection()
        count = collection.count()
        if count == 0:
            print("  ChromaDB empty — using anchor nodes only")
        else:
            # Fetch all docs with metadata
            results = collection.get(
                limit=min(count, 2000),
                include=["documents", "metadatas"],
            )
            docs   = results.get("documents", [])
            metas  = results.get("metadatas", [])

            for text, meta in zip(docs, metas):
                if not meta:
                    continue

                # Use metadata fields directly
                kb_domain   = meta.get("domain", "")
                role_title  = meta.get("role_title", "")
                exp_level   = meta.get("experience_level", "Mid")

                if not kb_domain or not role_title:
                    continue

                internal_domain = normalise_domain(kb_domain)
                level_int       = _level_int(exp_level)
                skills          = _extract_skills(text or "")

                domain_levels[internal_domain][level_int]["roles"].add(role_title)
                domain_levels[internal_domain][level_int]["skills"].update(skills)

            print(f"  Extracted data from {count} ChromaDB documents")
            print(f"  Domains found: {sorted(domain_levels.keys())}")

    except Exception as e:
        print(f"  ChromaDB read error (non-fatal): {e}")

    # Build graph nodes and edges from domain_levels
    model = get_model()
    node_count = 0

    for domain, levels in domain_levels.items():
        sorted_levels = sorted(levels.keys())  # [1, 2, 3, 4] = Entry, Mid, Senior, Leadership

        prev_node_key = None
        for level_int in sorted_levels:
            data      = levels[level_int]
            roles     = list(data["roles"])
            skills    = list(data["skills"])
            role_title = roles[0] if roles else f"{domain.title()} Professional"

            level_name = {1: "Entry", 2: "Mid", 3: "Senior", 4: "Leadership"}.get(level_int, "Mid")
            node_key   = f"{domain}::{level_name}"

            # Embed the role title for semantic operations
            try:
                embedding = model.encode(role_title).tolist()
            except Exception:
                embedding = []

            G.add_node(
                node_key,
                role_title=role_title,
                all_roles=roles,         # all role titles at this level
                domain=domain,
                seniority=level_int,
                experience_level=level_name,
                skills=skills,
                embedding=embedding,
            )
            node_count += 1

            # Edge from previous level in same domain
            if prev_node_key is not None:
                G.add_edge(prev_node_key, node_key, weight=0.3, frequency=10)

            prev_node_key = node_key

    print(f"  Graph nodes from KB metadata: {node_count}")

    # Always add comprehensive anchor nodes (guaranteed paths for all major domains)
    _add_anchors(G, model)

    print(f"  Final graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    _graph = G
    return _graph


def _add_anchors(G: nx.DiGraph, model):
    """
    Add anchor progressions for all major domains.
    These are always present regardless of KB content.
    """
    anchors = {
        "ai & ml": [
            ("ai & ml::Entry",      "Junior ML Engineer",         ["Python", "pandas", "NumPy", "Statistics", "scikit-learn"]),
            ("ai & ml::Mid",        "ML Engineer",                 ["TensorFlow", "PyTorch", "MLOps", "Feature Engineering"]),
            ("ai & ml::Senior",     "Senior ML Engineer",          ["System Design", "Deep Learning", "LLM", "NLP"]),
            ("ai & ml::Leadership", "ML Lead / Principal Scientist",["Research Direction", "Team Leadership", "Architecture"]),
        ],
        "data analytics": [
            ("data analytics::Entry",      "Data Analyst",         ["SQL", "Excel", "Tableau", "Statistics"]),
            ("data analytics::Mid",        "Senior Data Analyst",   ["Python", "Power BI", "A/B Testing", "Advanced SQL"]),
            ("data analytics::Senior",     "Analytics Manager",     ["Data Storytelling", "Predictive Analytics", "Stakeholder Comms"]),
            ("data analytics::Leadership", "Head of Analytics",     ["Strategy", "Team Leadership", "Data Governance"]),
        ],
        "full stack": [
            ("full stack::Entry",      "Junior Developer",          ["HTML", "CSS", "JavaScript", "Git", "SQL"]),
            ("full stack::Mid",        "Software Engineer",          ["React", "Node.js", "PostgreSQL", "Docker", "REST API"]),
            ("full stack::Senior",     "Senior Software Engineer",   ["System Design", "Microservices", "AWS", "CI/CD"]),
            ("full stack::Leadership", "Tech Lead / Principal",      ["Architecture", "Mentoring", "Cross-team Coordination"]),
        ],
        "cybersecurity": [
            ("cybersecurity::Entry",      "Security Analyst",        ["Networking", "Linux", "OWASP Top 10"]),
            ("cybersecurity::Mid",        "Security Engineer",        ["Penetration Testing", "SIEM", "Incident Response"]),
            ("cybersecurity::Senior",     "Senior Security Engineer", ["Cloud Security", "Threat Intelligence", "SOC2"]),
            ("cybersecurity::Leadership", "Security Architect",       ["CISO Advisory", "Security Strategy", "Compliance"]),
        ],
        "cloud & devops": [
            ("cloud & devops::Entry",      "DevOps Engineer",         ["Linux", "Docker", "Git", "Bash"]),
            ("cloud & devops::Mid",        "Senior DevOps Engineer",   ["Kubernetes", "Terraform", "AWS", "CI/CD"]),
            ("cloud & devops::Senior",     "Platform Engineer",        ["Multi-cloud", "SRE", "Cost Optimization"]),
            ("cloud & devops::Leadership", "DevOps Architect",         ["Platform Strategy", "Team Leadership"]),
        ],
        "product management": [
            ("product management::Entry",      "Associate PM",         ["Agile", "Jira", "User Research", "SQL basics"]),
            ("product management::Mid",        "Product Manager",       ["Roadmapping", "OKRs", "Stakeholder Management"]),
            ("product management::Senior",     "Senior PM",             ["Product Strategy", "P&L", "Market Analysis"]),
            ("product management::Leadership", "Director of Product",   ["Company Vision", "Org Leadership"]),
        ],
        "fintech": [
            ("fintech::Entry",      "FinTech Analyst",             ["Python", "SQL", "Excel", "Finance basics"]),
            ("fintech::Mid",        "FinTech Engineer",             ["Payments", "Blockchain", "APIs", "Compliance"]),
            ("fintech::Senior",     "Senior FinTech Engineer",      ["System Design", "Risk", "Cloud", "Security"]),
            ("fintech::Leadership", "FinTech Architect",            ["Platform Strategy", "Regulatory", "Leadership"]),
        ],
        "ui/ux": [
            ("ui/ux::Entry",      "UI/UX Designer",               ["Figma", "User Research", "Wireframing"]),
            ("ui/ux::Mid",        "Product Designer",              ["Prototyping", "Design Systems", "Usability Testing"]),
            ("ui/ux::Senior",     "Senior Designer",              ["Strategic Design", "Accessibility", "Cross-functional"]),
            ("ui/ux::Leadership", "Design Lead",                   ["Design Direction", "Team Building", "Brand Strategy"]),
        ],
        "entrepreneurship": [
            ("entrepreneurship::Entry",      "Startup Intern / Founding Member",  ["Lean Startup", "Market Research", "Customer Development", "Excel"]),
            ("entrepreneurship::Mid",        "Product / Growth Manager",           ["Growth Hacking", "Product Management", "Fundraising Basics", "Analytics"]),
            ("entrepreneurship::Senior",     "Startup Founder / Co-Founder",       ["Business Strategy", "Investor Relations", "Team Building", "P&L Management"]),
            ("entrepreneurship::Leadership", "CEO / Managing Director",            ["Company Vision", "Board Management", "M&A", "Scaling Operations"]),
        ],
        "consulting": [
            ("consulting::Entry",      "Business Analyst",            ["Excel", "PowerPoint", "Data Analysis", "Problem Solving"]),
            ("consulting::Mid",        "Consultant",                  ["Client Management", "Structured Thinking", "Project Delivery", "SQL"]),
            ("consulting::Senior",     "Senior Consultant / Manager", ["P&L Ownership", "Team Leadership", "Strategy Decks", "Stakeholder Management"]),
            ("consulting::Leadership", "Principal / Partner",         ["Business Development", "Practice Leadership", "Revenue Ownership"]),
        ],
        "digital marketing": [
            ("digital marketing::Entry",      "Digital Marketing Executive",  ["SEO", "Google Ads", "Social Media", "Content Writing"]),
            ("digital marketing::Mid",        "Growth Marketer",               ["Performance Marketing", "A/B Testing", "Email Marketing", "Analytics"]),
            ("digital marketing::Senior",     "Marketing Manager",             ["Brand Strategy", "Team Leadership", "Budget Management", "CRM"]),
            ("digital marketing::Leadership", "CMO / Head of Marketing",       ["Revenue Marketing", "Go-to-Market Strategy", "Brand Direction"]),
        ],
        "hr technology": [
            ("hr technology::Entry",      "HR Analyst",               ["Excel", "HRIS", "Talent Acquisition", "Data Analysis"]),
            ("hr technology::Mid",        "HR Business Partner",       ["People Analytics", "OKRs", "Compensation Planning", "SQL"]),
            ("hr technology::Senior",     "HR Manager / HRBP Lead",    ["Org Design", "Strategic Workforce Planning", "Change Management"]),
            ("hr technology::Leadership", "CHRO / VP People",          ["Culture Strategy", "Board Reporting", "Talent Strategy"]),
        ],
    }

    for domain, stages in anchors.items():
        prev = None
        for node_key, role_title, skills in stages:
            if not G.has_node(node_key):
                try:
                    emb = model.encode(role_title).tolist()
                except Exception:
                    emb = []
                level_name = node_key.split("::")[-1]
                G.add_node(
                    node_key,
                    role_title=role_title,
                    all_roles=[role_title],
                    domain=domain,
                    seniority=_level_int(level_name),
                    experience_level=level_name,
                    skills=skills,
                    embedding=emb,
                )
            if prev and not G.has_edge(prev, node_key):
                G.add_edge(prev, node_key, weight=0.4, frequency=5)
            prev = node_key


# ─── Path finding ─────────────────────────────────────────────────────────────

def find_career_path(
    current_role:    str,
    target_domain:   str,
    max_steps:       int = 4,
) -> list[dict]:
    """
    Find career path nodes from current_role to target_domain.
    Returns list of role dicts with skills from knowledge graph.
    """
    G = build_career_graph()

    # All nodes for the target domain, ordered by seniority
    domain_nodes = sorted(
        [(key, data) for key, data in G.nodes(data=True) if data.get("domain") == target_domain],
        key=lambda x: x[1].get("seniority", 2),
    )

    if not domain_nodes:
        print(f"  No nodes found for domain '{target_domain}' — using adjacent domain")
        # Try partial match
        for key, data in G.nodes(data=True):
            if target_domain in data.get("domain", ""):
                domain_nodes.append((key, data))
        domain_nodes.sort(key=lambda x: x[1].get("seniority", 2))

    if not domain_nodes:
        return []

    result = []
    for node_key, data in domain_nodes[:max_steps]:
        result.append({
            "node_key":   node_key,
            "role_title": data.get("role_title", ""),
            "all_roles":  data.get("all_roles", []),
            "skills":     data.get("skills", []),
            "domain":     data.get("domain", target_domain),
            "seniority":  data.get("seniority", 2),
            "experience_level": data.get("experience_level", "Mid"),
        })

    return result


def get_role_skills(domain: str, experience_level: str = "Mid") -> list[str]:
    """Get skills for a role at a given level from the knowledge graph."""
    G = build_career_graph()
    node_key = f"{domain}::{experience_level}"
    data = G.nodes.get(node_key, {})
    return data.get("skills", [])


def get_all_domains() -> list[str]:
    """Return all domains present in the knowledge graph."""
    G = build_career_graph()
    return list({data.get("domain", "") for _, data in G.nodes(data=True) if data.get("domain")})


def get_graph_stats() -> dict:
    G = build_career_graph()
    domains = list({d.get("domain") for _, d in G.nodes(data=True) if d.get("domain")})
    return {
        "nodes":   G.number_of_nodes(),
        "edges":   G.number_of_edges(),
        "domains": domains,
        "density": round(nx.density(G), 4) if G.number_of_nodes() > 1 else 0.0,
    }
