// src/routes/profile.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ProfileSchema } from '../schemas';

const router = Router();

// All profile routes require authentication
router.use(requireAuth);

// ─── POST /api/profile ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const userId = req.user!.userId;
  const { skills, domain, experience, lifeStage } = parsed.data;

  const profile = await prisma.profile.create({
    data: { userId, skills, domain, experience, lifeStage },
  });

  res.status(201).json({ profileId: profile.id, saved: true, profile });
});

// ─── GET /api/profile/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const profile = await prisma.profile.findFirst({
    where: { id, userId }, // ensure user can only access own profile
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json(profile);
});

// ─── GET /api/profile (list all profiles for current user) ───────────────────
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ profiles, count: profiles.length });
});

export default router;
