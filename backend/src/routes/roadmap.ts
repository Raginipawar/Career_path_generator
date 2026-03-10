// src/routes/roadmap.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { RoadmapRequestSchema } from '../schemas';
import { cacheGet, cacheSet, profileCacheKey } from '../lib/redis';
import { callRagGenerate } from '../lib/ragClient';

const router = Router();
router.use(requireAuth);

// ─── POST /api/roadmap/generate ───────────────────────────────────────────────
router.post('/generate', async (req: Request, res: Response) => {
  const parsed = RoadmapRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { profileId } = parsed.data;
  const userId = req.user!.userId;

  // Verify this profile belongs to the requesting user
  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found or access denied' });
    return;
  }

  // ── Check Redis cache first ──────────────────────────────────────────────────
  const cacheKey = profileCacheKey(profileId);
  const cached = await cacheGet<{
    roadmapId: string;
    roadmap: unknown;
    auditScores: unknown;
    probability: number;
    fromCache: boolean;
  }>(cacheKey);

  if (cached) {
    console.log(`🗃️ Cache HIT for profile ${profileId}`);
    res.json({ ...cached, fromCache: true });
    return;
  }

  console.log(`🤖 Cache MISS — calling RAG service for profile ${profileId}`);

  // ── Call RAG microservice ────────────────────────────────────────────────────
  let ragResponse;
  try {
    ragResponse = await callRagGenerate(profile);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ RAG service error: ${msg}`);
    res.status(503).json({
      error: 'Career roadmap generation failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? msg : undefined,
    });
    return;
  }

  // ── Save roadmap + audit results to DB ──────────────────────────────────────
  const roadmap = await prisma.roadmap.create({
    data: {
      userId,
      profileId,
      roadmapData: ragResponse.roadmap as object,
      auditScores: ragResponse.auditScores as object,
      probability: ragResponse.roadmap.probability,
    },
  });

  // Save individual audit results for analytics
  if (ragResponse.auditScores?.length) {
    await prisma.auditResult.createMany({
      data: ragResponse.auditScores.map((score) => ({
        roadmapId: roadmap.id,
        dimension: score.dimension,
        score: score.score,
        risk: score.risk,
        explanation: score.explanation,
      })),
    });
  }

  // ── Cache the result ─────────────────────────────────────────────────────────
  const responseData = {
    roadmapId: roadmap.id,
    roadmap: ragResponse.roadmap,
    auditScores: ragResponse.auditScores,
    probability: ragResponse.roadmap.probability,
    fromCache: false,
  };
  await cacheSet(cacheKey, responseData);

  res.json(responseData);
});

// ─── GET /api/roadmap/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const roadmap = await prisma.roadmap.findFirst({
    where: { id, userId },
    include: { profile: true },
  });

  if (!roadmap) {
    res.status(404).json({ error: 'Roadmap not found' });
    return;
  }

  res.json(roadmap);
});

// ─── GET /api/roadmap/history/:userId ─────────────────────────────────────────
router.get('/history/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const requestingUser = req.user!.userId;

  // Users can only access their own history
  if (userId !== requestingUser) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      profile: {
        select: { skills: true, domain: true, experience: true, lifeStage: true },
      },
    },
  });

  res.json({ roadmaps, count: roadmaps.length });
});

export default router;
