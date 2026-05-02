// src/routes/roadmap.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { RoadmapRequestSchema } from '../schemas';
import { cacheGet, cacheSet, profileCacheKey } from '../lib/redis';
import { callRagGenerate, prismaToRagProfile, AuditScore } from '../lib/ragClient';

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

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found or access denied' });
    return;
  }

  // ── Redis cache check ────────────────────────────────────────────────────────
  const cacheKey = profileCacheKey(profileId);
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) {
    console.log(`🗃️ Cache HIT for profile ${profileId}`);
    res.json({ ...cached, fromCache: true });
    return;
  }

  console.log(`🤖 Cache MISS — calling RAG service for profile ${profileId}`);

  // ── Call RAG microservice ────────────────────────────────────────────────────
  let ragResponse;
  try {
    ragResponse = await callRagGenerate(prismaToRagProfile(profile));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ RAG service error: ${msg}`);
    res.status(503).json({
      error: 'Career roadmap generation failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? msg : undefined,
    });
    return;
  }

  // ── Save to DB ───────────────────────────────────────────────────────────────
  const roadmap = await prisma.roadmap.create({
    data: {
      userId,
      profileId,
      roadmapData: {
        nodes:                   ragResponse.roadmap_nodes,
        edges:                   ragResponse.roadmap_edges,
        current_role:            ragResponse.current_role,
        target_role:             ragResponse.target_role,
        total_transition_months: ragResponse.total_transition_months,
        explanation:             ragResponse.explanation,
        emotional_forecast:      ragResponse.emotional_forecast,
        alternative_paths:       ragResponse.alternative_paths,
        model_used:              ragResponse.model_used,
      } as object,
      auditScores: ragResponse.audit_scores as object,
      probability: ragResponse.success_probability / 100,
    },
  });

  // Save individual audit results
  if (ragResponse.audit_scores?.length) {
    await prisma.auditResult.createMany({
      data: ragResponse.audit_scores.map((score: AuditScore) => ({
        roadmapId:      roadmap.id,
        dimension:      score.dimension,
        framework:      score.framework ?? 'PASSIONIT',
        score:          score.score,
        risk:           score.risk_level,
        explanation:    score.explanation,
        recommendation: score.recommendation ?? '',
      })),
    });
  }

  // ── Flat response matching frontend RoadmapResponse type ────────────────────
  const responseData = {
    roadmapId:               roadmap.id,
    roadmap_nodes:           ragResponse.roadmap_nodes,
    roadmap_edges:           ragResponse.roadmap_edges,
    current_role:            ragResponse.current_role,
    target_role:             ragResponse.target_role,
    success_probability:     ragResponse.success_probability,
    total_transition_months: ragResponse.total_transition_months,
    explanation:             ragResponse.explanation,
    emotional_forecast:      ragResponse.emotional_forecast,
    alternative_paths:       ragResponse.alternative_paths,
    audit_scores:            ragResponse.audit_scores,
    fromCache:               false,
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
  if (userId !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Reconstruct flat RoadmapResponse shape from DB row
  const mapped = roadmaps.map(r => {
    const d = (r.roadmapData ?? {}) as Record<string, unknown>;
    return {
      roadmapId:               r.id,
      roadmap_nodes:           d.nodes ?? [],
      roadmap_edges:           d.edges ?? [],
      current_role:            d.current_role ?? '',
      target_role:             d.target_role ?? '',
      success_probability:     Math.round((r.probability ?? 0) * 100),
      total_transition_months: d.total_transition_months ?? 0,
      explanation:             d.explanation ?? '',
      emotional_forecast:      d.emotional_forecast ?? [],
      alternative_paths:       d.alternative_paths ?? [],
      audit_scores:            r.auditScores ?? [],
      fromCache:               false,
    };
  });

  res.json(mapped);
});

export default router;
