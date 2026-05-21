// src/routes/profile.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ProfileSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

// ─── POST /api/profile ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const userId = req.user!.userId;
  const d = parsed.data;

  const profile = await prisma.profile.create({
    data: {
      userId,
      fullName:            d.fullName,
      age:                 d.age,
      gender:              d.gender,
      locationCity:        d.locationCity,
      locationState:       d.locationState,
      highestDegree:       d.highestDegree,
      fieldOfStudy:        d.fieldOfStudy,
      institutionTier:     d.institutionTier,
      currentRole:         d.currentRole,
      currentIndustry:     d.currentIndustry,
      yearsOfExperience:   d.yearsOfExperience,
      employmentStatus:    d.employmentStatus,
      currentSalaryLpa:    d.currentSalaryLpa,
      technicalSkills:     d.technicalSkills,
      softSkills:          d.softSkills,
      certifications:      d.certifications,
      interestDomains:     d.interestDomains,
      careerGoal:          d.careerGoal,
      preferredWorkStyle:  d.preferredWorkStyle,
      willingToRelocate:   d.willingToRelocate,
      targetTimelineYears: d.targetTimelineYears,
      lifeStage:           d.lifeStage,
      burnoutLevel:        d.burnoutLevel,
      stressTolerance:     d.stressTolerance,
      hasDependents:       d.hasDependents,
      recentLifeEvent:     d.recentLifeEvent,
      workLifePriority:    d.workLifePriority,
      leadershipScore:     d.leadershipScore,
      alignmentCategory:   d.alignmentCategory,
    },
  });

  res.status(201).json({ profileId: profile.id, saved: true, profile });
});

// ─── GET /api/profile/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const profile = await prisma.profile.findFirst({ where: { id, userId } });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json(profile);
});

// ─── PATCH /api/profile/:id/label — rename a profile ─────────────────────────
router.patch('/:id/label', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { label } = req.body as { label: string };
  const userId = req.user!.userId;

  const profile = await prisma.profile.findFirst({ where: { id, userId } });
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

  const updated = await prisma.profile.update({ where: { id }, data: { label: label ?? '' } });
  res.json({ id: updated.id, label: updated.label });
});

// ─── GET /api/profile ─────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ profiles, count: profiles.length });
});

export default router;