// src/routes/clusters.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { cacheGet, cacheSet } from '../lib/redis';

const router = Router();
router.use(requireAuth);

// ─── GET /api/clusters ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const cached = await cacheGet<{ clusters: unknown[]; demandScores: unknown[] }>('clusters:all');
  if (cached) {
    res.json({ ...cached, fromCache: true });
    return;
  }

  const clusters = await prisma.careerCluster.findMany({
    orderBy: { demandScore: 'desc' },
  });

  const demandScores = clusters.map((c) => ({
    name: c.name,
    demandScore: c.demandScore,
    growthTrend: c.growthTrend,
  }));

  const payload = { clusters, demandScores };
  await cacheSet('clusters:all', payload, 3600); // cache for 1 hour

  res.json({ ...payload, fromCache: false });
});

// ─── GET /api/analytics/summary ───────────────────────────────────────────────
const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get('/summary', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const [totalProfiles, totalRoadmaps, auditResults] = await Promise.all([
    prisma.profile.count({ where: { userId } }),
    prisma.roadmap.count({ where: { userId } }),
    prisma.auditResult.findMany({
      where: { roadmap: { userId } },
      select: { dimension: true, score: true, risk: true },
    }),
  ]);

  // Calculate average audit scores per dimension
  const dimensionMap: Record<string, number[]> = {};
  for (const result of auditResults) {
    if (!dimensionMap[result.dimension]) {
      dimensionMap[result.dimension] = [];
    }
    dimensionMap[result.dimension].push(result.score);
  }

  const alignmentDistribution = Object.entries(dimensionMap).map(([dimension, scores]) => ({
    dimension,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    count: scores.length,
  }));

  // Get the latest roadmap probability
  const latestRoadmap = await prisma.roadmap.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { probability: true, createdAt: true },
  });

  res.json({
    totalProfiles,
    totalRoadmaps,
    latestProbability: latestRoadmap?.probability ?? null,
    alignmentDistribution,
    lastUpdated: latestRoadmap?.createdAt ?? null,
  });
});

export { router as clustersRouter, analyticsRouter };
