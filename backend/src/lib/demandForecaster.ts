// src/lib/demandForecaster.ts
// Time-series demand forecasting using Exponential Smoothing + Linear Trend.
// No external ML library needed — pure TypeScript math.
// Produces 4-week forward predictions with confidence intervals.

import { prisma } from './prisma';

interface DataPoint { date: Date; score: number; }
interface ForecastPoint {
  date:   string;
  score:  number;
  lower:  number;  // 80% confidence interval lower
  upper:  number;  // 80% confidence interval upper
}

// ─── Exponential Smoothing with Trend (Holt's Method) ────────────────────────

function holtSmoothing(
  data:   number[],
  alpha:  number = 0.3,   // level smoothing
  beta:   number = 0.1,   // trend smoothing
  steps:  number = 4,
): { fitted: number[]; forecast: number[]; stdErr: number } {
  if (data.length < 2) {
    const last = data[data.length - 1] ?? 50;
    return { fitted: data, forecast: Array(steps).fill(last), stdErr: 5 };
  }

  // Initialise
  let level = data[0];
  let trend = data[1] - data[0];
  const fitted: number[] = [];

  // Fit to historical data
  for (let i = 0; i < data.length; i++) {
    const observed = data[i];
    const prevLevel = level;
    level = alpha * observed + (1 - alpha) * (level + trend);
    trend = beta  * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(level + trend);
  }

  // Standard error of fitted values
  const errors = data.map((d, i) => (d - fitted[i]) ** 2);
  const stdErr = Math.sqrt(errors.reduce((a, b) => a + b, 0) / data.length);

  // Forecast h steps ahead
  const forecast: number[] = [];
  for (let h = 1; h <= steps; h++) {
    forecast.push(Math.max(0, Math.min(100, level + h * trend)));
  }

  return { fitted, forecast, stdErr };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function forecastDemand(weeksAhead: number = 4): Promise<{
  historical: Record<string, { date: string; score: number }[]>;
  forecasts:  Record<string, ForecastPoint[]>;
  clusterNames: string[];
}> {
  // Load historical snapshots from DB
  const snapshots = await prisma.demandSnapshot.findMany({
    include: { cluster: { select: { name: true } } },
    orderBy: { snapshotDate: 'asc' },
  });

  // Group by cluster
  const byCluster: Record<string, DataPoint[]> = {};
  for (const s of snapshots) {
    const name = s.cluster.name;
    if (!byCluster[name]) byCluster[name] = [];
    byCluster[name].push({ date: s.snapshotDate, score: s.demandScore });
  }

  const historical: Record<string, { date: string; score: number }[]> = {};
  const forecasts:  Record<string, ForecastPoint[]> = {};
  const clusterNames = Object.keys(byCluster).slice(0, 10);

  const lastDate = snapshots.length > 0
    ? new Date(Math.max(...snapshots.map(s => s.snapshotDate.getTime())))
    : new Date();

  for (const name of clusterNames) {
    const points = byCluster[name];
    const scores = points.map(p => p.score);

    // Historical
    historical[name] = points.map(p => ({
      date:  p.date.toISOString().slice(0, 10),
      score: Math.round(p.score * 10) / 10,
    }));

    // Forecast
    const { forecast, stdErr } = holtSmoothing(scores, 0.3, 0.1, weeksAhead);
    const z80 = 1.28;  // 80% confidence interval z-score

    forecasts[name] = forecast.map((score, i) => {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + (i + 1) * 7);
      return {
        date:  forecastDate.toISOString().slice(0, 10),
        score: Math.round(score * 10) / 10,
        lower: Math.max(0,   Math.round((score - z80 * stdErr) * 10) / 10),
        upper: Math.min(100, Math.round((score + z80 * stdErr) * 10) / 10),
      };
    });
  }

  return { historical, forecasts, clusterNames };
}

// ─── Anomaly detection ────────────────────────────────────────────────────────
// Flags domains whose demand changed significantly in the last 2 weeks.

export async function detectDemandAnomalies(): Promise<{
  domain: string; change: number; direction: 'rising' | 'falling' | 'stable';
}[]> {
  const snapshots = await prisma.demandSnapshot.findMany({
    include: { cluster: { select: { name: true } } },
    orderBy: { snapshotDate: 'desc' },
  });

  const byCluster: Record<string, number[]> = {};
  for (const s of snapshots) {
    const name = s.cluster.name;
    if (!byCluster[name]) byCluster[name] = [];
    if (byCluster[name].length < 4) byCluster[name].push(s.demandScore);
  }

  return Object.entries(byCluster)
    .map(([domain, scores]) => {
      const recent = scores.slice(0, 2).reduce((a, b) => a + b, 0) / Math.max(scores.slice(0, 2).length, 1);
      const older  = scores.slice(2, 4).reduce((a, b) => a + b, 0) / Math.max(scores.slice(2, 4).length, 1);
      const change = Math.round((recent - older) * 10) / 10;
      return {
        domain,
        change,
        direction: (change > 2 ? 'rising' : change < -2 ? 'falling' : 'stable') as 'rising' | 'falling' | 'stable',
      };
    })
    .filter(a => a.direction !== 'stable')
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}
