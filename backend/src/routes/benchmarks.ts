// src/routes/benchmarks.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { cacheGet, cacheSet } from '../lib/redis';

const router = Router();
router.use(requireAuth);

// ─── GET /api/benchmarks/:profileId ──────────────────────────────────────────
router.get('/:profileId', async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const userId = req.user!.userId;

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

  const cacheKey = `benchmarks:${profileId}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.json({ ...cached, fromCache: true }); return; }

  // Find peers: same lifeStage + overlapping interestDomains
  const peers = await prisma.profile.findMany({
    where: {
      id:        { not: profileId },
      lifeStage: profile.lifeStage,
      interestDomains: { hasSome: profile.interestDomains.length > 0 ? profile.interestDomains : [''] },
    },
    select: {
      leadershipScore:   true,
      technicalSkills:   true,
      yearsOfExperience: true,
      alignmentCategory: true,
      roadmaps:          { select: { probability: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  // Need at least 5 peers for meaningful benchmarking
  const peerCount = peers.length;
  if (peerCount < 5) {
    res.json({
      message:   'Not enough peers yet for benchmarking. Come back as more users join.',
      peerCount,
      fromCache: false,
    });
    return;
  }

  const percentile = (arr: number[], value: number) => {
    const below = arr.filter(v => v < value).length;
    return Math.round((below / arr.length) * 100);
  };

  const leadershipScores  = peers.map(p => p.leadershipScore);
  const skillBreadths     = peers.map(p => p.technicalSkills.length);
  const experienceValues  = peers.map(p => p.yearsOfExperience);
  const probabilities     = peers
    .map(p => p.roadmaps[0]?.probability)
    .filter((p): p is number => p !== null && p !== undefined)
    .map(p => p * 100);

  const alignmentDist = { High: 0, Moderate: 0, Low: 0 };
  for (const p of peers) {
    const cat = p.alignmentCategory as keyof typeof alignmentDist;
    if (cat in alignmentDist) alignmentDist[cat]++;
  }

  const result = {
    peerCount,
    cohortLabel:  `${profile.lifeStage} · ${profile.interestDomains[0] ?? 'General'}`,
    percentiles: {
      leadershipScore: {
        yours:      profile.leadershipScore,
        percentile: percentile(leadershipScores, profile.leadershipScore),
        peerAvg:    Math.round(leadershipScores.reduce((a, b) => a + b, 0) / leadershipScores.length * 10) / 10,
      },
      skillBreadth: {
        yours:      profile.technicalSkills.length,
        percentile: percentile(skillBreadths, profile.technicalSkills.length),
        peerAvg:    Math.round(skillBreadths.reduce((a, b) => a + b, 0) / skillBreadths.length * 10) / 10,
      },
      experience: {
        yours:      profile.yearsOfExperience,
        percentile: percentile(experienceValues, profile.yearsOfExperience),
        peerAvg:    Math.round(experienceValues.reduce((a, b) => a + b, 0) / experienceValues.length * 10) / 10,
      },
      successProbability: probabilities.length >= 3 ? {
        yours:      null as number | null,
        percentile: null as number | null,
        peerAvg:    Math.round(probabilities.reduce((a, b) => a + b, 0) / probabilities.length),
      } : null,
    },
    alignmentDistribution: alignmentDist,
    yourAlignment: profile.alignmentCategory,
    fromCache: false,
  };

  await cacheSet(cacheKey, result, 3600); // 1hr cache
  res.json(result);
});

export default router;
