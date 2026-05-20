// src/routes/trends.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { cacheGet, cacheSet } from '../lib/redis';

const router = Router();
router.use(requireAuth);

// ─── GET /api/clusters/trends — demand scores over last 8 weeks ───────────────
router.get('/', async (_req: Request, res: Response) => {
  const cached = await cacheGet<object>('trends:demand');
  if (cached) { res.json({ ...cached, fromCache: true }); return; }

  const snapshots = await prisma.demandSnapshot.findMany({
    include: { cluster: { select: { name: true } } },
    orderBy: { snapshotDate: 'asc' },
  });

  // Group by cluster name → array of { date, score }
  const byCluster: Record<string, { date: string; score: number }[]> = {};
  for (const s of snapshots) {
    const name = s.cluster.name;
    if (!byCluster[name]) byCluster[name] = [];
    byCluster[name].push({
      date:  s.snapshotDate.toISOString().slice(0, 10),
      score: s.demandScore,
    });
  }

  // Build a unified week-by-week table for Recharts
  const allDates = [...new Set(snapshots.map(s => s.snapshotDate.toISOString().slice(0, 10)))].sort();
  const clusterNames = Object.keys(byCluster).slice(0, 8); // top 8 for readability

  const chartData = allDates.map(date => {
    const row: Record<string, string | number> = { date };
    for (const name of clusterNames) {
      const point = byCluster[name]?.find(p => p.date === date);
      row[name] = point?.score ?? 0;
    }
    return row;
  });

  const result = { chartData, clusterNames, fromCache: false };
  await cacheSet('trends:demand', result, 3600);
  res.json(result);
});

export default router;
