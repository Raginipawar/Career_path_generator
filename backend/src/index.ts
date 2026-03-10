// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { requestLogger, zodErrorHandler, globalErrorHandler } from './middleware/logger';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import roadmapRouter from './routes/roadmap';
import { clustersRouter, analyticsRouter } from './routes/clusters';
import { checkRagHealth } from './lib/ragClient';
import { getRedis } from './lib/redis';
import { prisma } from './lib/prisma';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter for auth
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const ragOk = await checkRagHealth();
  
  let redisOk = false;
  try {
    const redis = getRedis();
    await redis.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const allOk = ragOk && redisOk && dbOk;
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      rag: ragOk ? 'ok' : 'error',
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/roadmap', roadmapRouter);
app.use('/api/clusters', clustersRouter);
app.use('/api/analytics', analyticsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(zodErrorHandler);
app.use(globalErrorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log('✅ PostgreSQL (Supabase) connected');

    // Warm up Redis
    getRedis();

    app.listen(PORT, () => {
      console.log(`\n🚀 Career Path Backend running at http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
      console.log(`   Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
