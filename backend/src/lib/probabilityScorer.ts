// src/lib/probabilityScorer.ts
// Deterministic probability pre-scorer.
// Runs BEFORE the LLM call and produces a [min, max] range that the prompt enforces.
// Prevents LLM optimism from inflating probability.

interface ProfileForScoring {
  technicalSkills:   string[];
  currentRole:       string;
  currentIndustry:   string;
  yearsOfExperience: number;
  highestDegree:     string;
  fieldOfStudy:      string;
  interestDomains:   string[];
  careerGoal:        string;
  burnoutLevel:      number;
  hasDependents:     boolean;
  leadershipScore:   number;
  alignmentCategory: string;
}

// ─── Domain taxonomy ─────────────────────────────────────────────────────────
const TECH_DOMAINS = new Set([
  'ai & ml', 'machine learning', 'data science', 'data analytics', 'software',
  'engineering', 'full stack', 'frontend', 'backend', 'devops', 'cloud',
  'cybersecurity', 'product management', 'iot', 'embedded', 'ui/ux', 'fintech',
]);

const DOMAIN_SKILL_MAP: Record<string, string[]> = {
  'frontend':       ['react','vue','angular','javascript','typescript','css','html','next','tailwind'],
  'backend':        ['node','python','java','go','rust','django','fastapi','express','sql','postgres'],
  'ai & ml':        ['python','tensorflow','pytorch','scikit','pandas','numpy','ml','deep learning','llm'],
  'data science':   ['python','sql','r','tableau','spark','hadoop','pandas','statistics'],
  'devops':         ['docker','kubernetes','terraform','aws','gcp','azure','ci/cd','linux','bash'],
  'cybersecurity':  ['pentesting','security','kali','wireshark','splunk','siem','owasp','encryption'],
  'product':        ['jira','figma','analytics','sql','roadmapping','agile','scrum','okrs'],
  'ui/ux':          ['figma','sketch','adobe xd','prototyping','css','user research','wireframing'],
  'fintech':        ['python','sql','bloomberg','excel','finance','banking','payments','blockchain'],
  'mobile':         ['swift','kotlin','react native','flutter','ios','android'],
};

function normalizeLower(s: string): string {
  return s.toLowerCase().trim();
}

// ─── 1. Domain distance (0.05 → 1.0) ─────────────────────────────────────────
function domainDistance(currentRole: string, currentIndustry: string, targetGoal: string): number {
  const current = normalizeLower(currentRole + ' ' + currentIndustry);
  const target  = normalizeLower(targetGoal);

  const currentIsTech = [...TECH_DOMAINS].some(d => current.includes(d));
  const targetIsTech  = [...TECH_DOMAINS].some(d => target.includes(d));

  if (currentIsTech && targetIsTech) {
    // Both tech — check how close the sub-domains are
    const sameWords = target.split(' ').filter(w => w.length > 3 && current.includes(w));
    if (sameWords.length >= 2) return 0.90;   // very adjacent (e.g. SWE → Senior SWE)
    if (sameWords.length === 1) return 0.70;  // related tech (e.g. Backend → ML)
    return 0.50;                               // different tech domain
  }

  if (!currentIsTech && targetIsTech) return 0.12;  // non-tech → tech (major pivot)
  if (currentIsTech && !targetIsTech) return 0.30;  // tech → non-tech
  return 0.60;                                       // non-tech → non-tech (moderate)
}

// ─── 2. Technical skill overlap (0.0 → 1.0) ──────────────────────────────────
function skillOverlap(userSkills: string[], targetGoal: string): number {
  if (!userSkills.length) return 0.0;

  const goal = normalizeLower(targetGoal);
  const normalizedUserSkills = userSkills.map(normalizeLower);

  // Find which domain the target matches
  let relevantSkills: string[] = [];
  for (const [domain, skills] of Object.entries(DOMAIN_SKILL_MAP)) {
    if (goal.includes(domain)) {
      relevantSkills = skills;
      break;
    }
  }

  // Fall back to any tech keyword match
  if (!relevantSkills.length) {
    relevantSkills = Object.values(DOMAIN_SKILL_MAP).flat();
  }

  const matches = relevantSkills.filter(s =>
    normalizedUserSkills.some(u => u.includes(s) || s.includes(u))
  ).length;

  return Math.min(1.0, matches / Math.max(5, relevantSkills.length * 0.4));
}

// ─── 3. Education alignment (0.2 → 1.0) ──────────────────────────────────────
function educationAlignment(degree: string, fieldOfStudy: string, targetGoal: string): number {
  const field  = normalizeLower(fieldOfStudy);
  const target = normalizeLower(targetGoal);
  const deg    = normalizeLower(degree);

  const techFields = ['computer', 'software', 'information', 'electronics', 'data', 'math', 'statistics', 'engineering'];
  const isTechField = techFields.some(f => field.includes(f));
  const isTechTarget = [...TECH_DOMAINS].some(d => target.includes(d));

  if (isTechField && isTechTarget)   return 1.0;
  if (!isTechField && !isTechTarget) return 0.85;  // non-tech to non-tech fine
  if (!isTechField && isTechTarget)  return 0.25;  // non-tech background for tech role
  return 0.70;                                      // tech background, non-tech target
}

// ─── 4. Experience relevance (0.05 → 1.0) ────────────────────────────────────
function experienceRelevance(
  currentRole: string,
  currentIndustry: string,
  yearsOfExperience: number,
  targetGoal: string,
): number {
  const dist = domainDistance(currentRole, currentIndustry, targetGoal);
  if (dist < 0.25) return Math.min(0.15, yearsOfExperience * 0.02);  // irrelevant experience
  if (dist < 0.55) return 0.3 + Math.min(0.4, yearsOfExperience * 0.05);
  return 0.5 + Math.min(0.45, yearsOfExperience * 0.04);
}

// ─── 5. Penalties ─────────────────────────────────────────────────────────────
function penalties(burnout: number, hasDependents: boolean, skills: string[]): number {
  let penalty = 0;
  if (burnout >= 8) penalty += 0.12;
  else if (burnout >= 6) penalty += 0.06;
  if (hasDependents && burnout >= 6) penalty += 0.05;  // extra risk if burnt out + dependents
  if (!skills.length) penalty += 0.10;                  // no technical skills at all
  return penalty;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function computeProbabilityRange(profile: ProfileForScoring): { min: number; max: number; rationale: string } {
  const goal = profile.careerGoal || profile.interestDomains.join(', ');

  const dd  = domainDistance(profile.currentRole, profile.currentIndustry, goal);
  const so  = skillOverlap(profile.technicalSkills, goal);
  const ea  = educationAlignment(profile.highestDegree, profile.fieldOfStudy, goal);
  const er  = experienceRelevance(profile.currentRole, profile.currentIndustry, profile.yearsOfExperience, goal);
  const pen = penalties(profile.burnoutLevel, profile.hasDependents, profile.technicalSkills);

  // Weighted blend
  const raw = (dd * 0.30) + (so * 0.30) + (ea * 0.20) + (er * 0.20) - pen;
  const base = Math.max(0.05, Math.min(0.90, raw));

  const basePct = Math.round(base * 100);
  const spread  = dd > 0.6 ? 8 : dd > 0.3 ? 12 : 15;  // tighter range for adjacent roles

  const min = Math.max(5,  basePct - spread);
  const max = Math.min(88, basePct + spread);

  const rationale = [
    `Domain distance: ${Math.round(dd * 100)}%`,
    `Skill overlap: ${Math.round(so * 100)}%`,
    `Education alignment: ${Math.round(ea * 100)}%`,
    `Experience relevance: ${Math.round(er * 100)}%`,
    `Penalties: -${Math.round(pen * 100)}%`,
    `→ Constrained range: ${min}–${max}%`,
  ].join(' | ');

  return { min, max, rationale };
}
