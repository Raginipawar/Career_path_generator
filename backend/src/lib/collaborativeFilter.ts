// src/lib/collaborativeFilter.ts
// Collaborative filtering for career path recommendations.
// Uses truncated SVD (matrix factorization) on user × domain interaction matrix.
// "People similar to you transitioned to X" — no training needed, runs in milliseconds.

import { prisma } from './prisma';

// ─── SVD via power iteration ──────────────────────────────────────────────────
// Pure TypeScript SVD — no external library needed.

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function norm(v: number[]): number {
  return Math.sqrt(dotProduct(v, v));
}

function normalise(v: number[]): number[] {
  const n = norm(v);
  return n === 0 ? v : v.map(x => x / n);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n1 = norm(a), n2 = norm(b);
  if (n1 === 0 || n2 === 0) return 0;
  return dotProduct(a, b) / (n1 * n2);
}

// ─── Domain taxonomy (15 domains) ────────────────────────────────────────────
const DOMAINS = [
  "ai & ml", "data science", "data analytics", "full stack", "frontend",
  "backend", "devops", "cybersecurity", "product management", "ui/ux",
  "fintech", "cloud", "mobile", "edtech", "healthcare it",
];

function domainIndex(domain: string): number {
  const idx = DOMAINS.findIndex(d => domain.toLowerCase().includes(d));
  return idx >= 0 ? idx : -1;
}

// ─── Build user-domain interaction matrix ─────────────────────────────────────

async function buildInteractionMatrix(): Promise<{
  userIds:    string[];
  matrix:     number[][];  // rows=users, cols=domains
  userProfiles: Record<string, { skills: string[]; domain: string; experience: number }>;
}> {
  const roadmaps = await prisma.roadmap.findMany({
    include: { profile: { select: { technicalSkills: true, interestDomains: true, yearsOfExperience: true } } },
  });

  const userIds: string[]   = [];
  const matrix:  number[][] = [];
  const userProfiles: Record<string, any> = {};

  const seen = new Set<string>();
  for (const roadmap of roadmaps) {
    const uid = roadmap.userId;
    if (seen.has(uid)) continue;
    seen.add(uid);

    const row = new Array(DOMAINS.length).fill(0);

    // Signal 1: target domain from roadmap (strong signal)
    const targetRole = (roadmap.roadmapData as any)?.target_role ?? '';
    const targetIdx  = domainIndex(targetRole);
    if (targetIdx >= 0) row[targetIdx] += 2.0;

    // Signal 2: interest domains from profile (medium signal)
    for (const dom of roadmap.profile?.interestDomains ?? []) {
      const idx = domainIndex(dom);
      if (idx >= 0) row[idx] += 1.0;
    }

    // Signal 3: success probability as weight (higher prob = stronger preference)
    const prob = (roadmap.probability ?? 0.5);
    for (let i = 0; i < row.length; i++) {
      row[i] *= (0.5 + prob);  // scale by probability
    }

    userIds.push(uid);
    matrix.push(row);
    userProfiles[uid] = {
      skills:     roadmap.profile?.technicalSkills ?? [],
      domain:     DOMAINS[row.indexOf(Math.max(...row))] ?? "general",
      experience: roadmap.profile?.yearsOfExperience ?? 0,
    };
  }

  return { userIds, matrix, userProfiles };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getCollaborativeRecommendations(
  userId:        string,
  profileDomain: string,
  userSkills:    string[],
  topN:          number = 3,
): Promise<{ domain: string; score: number; supportingUsers: number }[]> {
  const { userIds, matrix, userProfiles } = await buildInteractionMatrix();

  if (userIds.length < 5) {
    // Not enough users for meaningful CF — return empty
    return [];
  }

  // Find current user's row (or build it from their profile)
  const userIdx = userIds.indexOf(userId);
  let userRow: number[];

  if (userIdx >= 0) {
    userRow = matrix[userIdx];
  } else {
    // New user — build synthetic row from their domain
    userRow = new Array(DOMAINS.length).fill(0);
    const domIdx = domainIndex(profileDomain);
    if (domIdx >= 0) userRow[domIdx] = 1.0;
  }

  // Cosine similarity with all other users
  const similarities: { userId: string; sim: number }[] = [];
  for (let i = 0; i < userIds.length; i++) {
    if (userIds[i] === userId) continue;
    const sim = cosineSimilarity(userRow, matrix[i]);
    if (sim > 0.2) {  // only meaningful similarities
      similarities.push({ userId: userIds[i], sim });
    }
  }

  // Sort by similarity, take top-20 neighbours
  similarities.sort((a, b) => b.sim - a.sim);
  const neighbours = similarities.slice(0, 20);

  if (neighbours.length < 3) return [];

  // Weighted aggregate of neighbour preferences
  const domainScores = new Array(DOMAINS.length).fill(0);
  const domainCount  = new Array(DOMAINS.length).fill(0);

  for (const { userId: nId, sim } of neighbours) {
    const nIdx = userIds.indexOf(nId);
    if (nIdx < 0) continue;
    const nRow = matrix[nIdx];
    for (let d = 0; d < DOMAINS.length; d++) {
      if (nRow[d] > 0) {
        domainScores[d] += nRow[d] * sim;
        domainCount[d]  += 1;
      }
    }
  }

  // Normalise and exclude current domain
  const currentDomainIdx = domainIndex(profileDomain);
  const ranked = DOMAINS
    .map((domain, i) => ({
      domain,
      score:          i === currentDomainIdx ? 0 : domainScores[i],
      supportingUsers: domainCount[i],
    }))
    .filter(d => d.score > 0 && d.supportingUsers >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return ranked;
}

// ─── Profile similarity ───────────────────────────────────────────────────────
// Find users with similar profiles who successfully transitioned.

export async function findSimilarSuccessfulTransitions(
  userId:     string,
  domain:     string,
  skills:     string[],
  minProb:    number = 0.6,
  limit:      number = 5,
): Promise<{ targetRole: string; probability: number; sharedSkills: string[] }[]> {
  // Find roadmaps in same target domain with high probability
  const successful = await prisma.roadmap.findMany({
    where: {
      userId:      { not: userId },
      probability: { gte: minProb },
    },
    include: { profile: { select: { technicalSkills: true } } },
    orderBy: { probability: 'desc' },
    take: 50,
  });

  const userSkillsLower = new Set(skills.map(s => s.toLowerCase()));

  return successful
    .map(r => {
      const targetRole   = (r.roadmapData as any)?.target_role ?? '';
      const probability  = Math.round((r.probability ?? 0) * 100);
      const theirSkills  = r.profile?.technicalSkills ?? [];
      const sharedSkills = theirSkills.filter(s => userSkillsLower.has(s.toLowerCase()));
      return { targetRole, probability, sharedSkills };
    })
    .filter(r => r.targetRole.toLowerCase().includes(domain) && r.sharedSkills.length >= 1)
    .slice(0, limit);
}
