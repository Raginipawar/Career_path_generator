// src/routes/trends.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { cacheGet, cacheSet } from '../lib/redis';
import { forecastDemand, detectDemandAnomalies } from '../lib/demandForecaster';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// ─── GET /api/trends — historical + forecast + anomalies ─────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const cached = await cacheGet<object>('trends:full');
  if (cached) { res.json({ ...cached, fromCache: true }); return; }

  const [forecastData, anomalies] = await Promise.all([
    forecastDemand(4),
    detectDemandAnomalies(),
  ]);

  // Build unified chart data (historical + forecast combined per cluster)
  const { historical, forecasts, clusterNames } = forecastData;

  // Chart data for Recharts: historical rows + forecast rows marked as predicted
  const allDates = new Set<string>();
  for (const name of clusterNames) {
    historical[name]?.forEach(p => allDates.add(p.date));
    forecasts[name]?.forEach(p => allDates.add(p.date));
  }

  const sortedDates = [...allDates].sort();
  const chartData = sortedDates.map(date => {
    const row: Record<string, string | number | boolean> = { date, predicted: false };
    for (const name of clusterNames) {
      const hist = historical[name]?.find(p => p.date === date);
      const fore = forecasts[name]?.find(p => p.date === date);
      if (hist) {
        row[name]          = hist.score;
      } else if (fore) {
        row[name]          = fore.score;
        row[`${name}_lower`] = fore.lower;
        row[`${name}_upper`] = fore.upper;
        row.predicted      = true;
      }
    }
    return row;
  });

  const result = { chartData, clusterNames, forecasts, anomalies, fromCache: false };
  await cacheSet('trends:full', result, 1800); // 30 min cache
  res.json(result);
});

// ─── GET /api/trends/anomalies — demand change alerts ────────────────────────
router.get('/anomalies', async (_req: Request, res: Response) => {
  const anomalies = await detectDemandAnomalies();
  res.json({ anomalies });
});

export default router;
