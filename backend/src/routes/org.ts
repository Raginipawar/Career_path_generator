// src/routes/org.ts — Company mode: registration, employee management, bulk upload, quick analysis
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { callRagGenerate, prismaToRagProfile } from '../lib/ragClient';
import { cacheSet, profileCacheKey } from '../lib/redis';
import { chatWithProfile } from '../lib/groqClient';
import { z } from 'zod';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const SALT_ROUNDS = 12;

// ─── Middleware: require company_admin role ───────────────────────────────────
async function requireAdmin(req: Request, res: Response, next: import('express').NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user || user.role !== 'company_admin') {
    res.status(403).json({ error: 'Company admin access required' });
    return;
  }
  next();
}

// ─── POST /api/org/register — Create org + admin account ─────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const Schema = z.object({
    orgName:  z.string().min(2).max(100),
    industry: z.string().default(''),
    name:     z.string().min(2).max(100),
    email:    z.string().email(),
    password: z.string().min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { orgName, industry, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  // Create admin user first, then org
  const admin = await prisma.user.create({
    data: { name, email, password: hashed, role: 'company_admin' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const org = await prisma.organisation.create({
    data: { name: orgName, industry, adminId: admin.id },
  });

  // Link admin to org
  await prisma.user.update({ where: { id: admin.id }, data: { orgId: org.id } });

  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'company_admin', orgId: org.id },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
  );

  res.status(201).json({ token, user: { ...admin, orgId: org.id }, org });
});

// ─── POST /api/org/login — Company admin login ────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const Schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, role: true, orgId: true, createdAt: true },
  });

  if (!user || user.role !== 'company_admin') {
    await bcrypt.hash('dummy', SALT_ROUNDS);
    res.status(401).json({ error: 'Invalid credentials or not a company admin' });
    return;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, orgId: user.orgId },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
  );

  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── All routes below require auth + admin role ───────────────────────────────
router.use(requireAuth);
router.use(requireAdmin);

// ─── GET /api/org/employees — List all employees with latest roadmap ──────────
router.get('/employees', async (req: Request, res: Response) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!admin?.orgId) { res.status(404).json({ error: 'Organisation not found' }); return; }

  const employees = await prisma.user.findMany({
    where: { orgId: admin.orgId, role: 'company_employee' },
    select: {
      id: true, name: true, email: true, createdAt: true,
      profiles: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true, currentRole: true, alignmentCategory: true,
          interestDomains: true, yearsOfExperience: true,
          roadmaps: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, probability: true, createdAt: true, roadmapData: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = employees.map(emp => ({
    id:              emp.id,
    name:            emp.name,
    email:           emp.email,
    createdAt:       emp.createdAt,
    currentRole:     emp.profiles[0]?.currentRole ?? '—',
    alignment:       emp.profiles[0]?.alignmentCategory ?? '—',
    domains:         emp.profiles[0]?.interestDomains ?? [],
    experience:      emp.profiles[0]?.yearsOfExperience ?? 0,
    profileId:       emp.profiles[0]?.id ?? null,
    latestRoadmapId: emp.profiles[0]?.roadmaps[0]?.id ?? null,
    probability:     emp.profiles[0]?.roadmaps[0]?.probability
                       ? Math.round((emp.profiles[0].roadmaps[0].probability) * 100)
                       : null,
    targetRole:      (emp.profiles[0]?.roadmaps[0]?.roadmapData as any)?.target_role ?? null,
    lastGenerated:   emp.profiles[0]?.roadmaps[0]?.createdAt ?? null,
  }));

  res.json({ employees: mapped, count: mapped.length });
});

// ─── GET /api/org/employees/:employeeId — Full roadmap for one employee ───────
router.get('/employees/:employeeId', async (req: Request, res: Response) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!admin?.orgId) { res.status(404).json({ error: 'Organisation not found' }); return; }

  const employee = await prisma.user.findFirst({
    where: { id: req.params.employeeId, orgId: admin.orgId, role: 'company_employee' },
    select: {
      id: true, name: true, email: true,
      profiles: {
        orderBy: { createdAt: 'desc' }, take: 1,
        include: { roadmaps: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
  });

  if (!employee) { res.status(404).json({ error: 'Employee not found in your organisation' }); return; }

  const profile  = employee.profiles[0] ?? null;
  const roadmap  = profile?.roadmaps[0] ?? null;
  const d        = (roadmap?.roadmapData ?? {}) as Record<string, unknown>;

  res.json({
    employee: { id: employee.id, name: employee.name, email: employee.email },
    profile,
    roadmap: roadmap ? {
      roadmapId:               roadmap.id,
      roadmap_nodes:           d.nodes ?? [],
      roadmap_edges:           d.edges ?? [],
      current_role:            d.current_role ?? '',
      target_role:             d.target_role ?? '',
      success_probability:     Math.round((roadmap.probability ?? 0) * 100),
      total_transition_months: d.total_transition_months ?? 0,
      explanation:             d.explanation ?? '',
      emotional_forecast:      d.emotional_forecast ?? [],
      alternative_paths:       d.alternative_paths ?? [],
      audit_scores:            roadmap.auditScores ?? [],
      fromCache:               false,
    } : null,
  });
});

// ─── POST /api/org/roadmap/generate — Generate roadmap for an employee ────────
router.post('/roadmap/generate', async (req: Request, res: Response) => {
  const Schema = z.object({
    employeeId: z.string().uuid(),
    careerGoal: z.string().min(5).max(500),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

  const { employeeId, careerGoal } = parsed.data;
  const admin = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!admin?.orgId) { res.status(404).json({ error: 'Organisation not found' }); return; }

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, orgId: admin.orgId },
  });
  if (!employee) { res.status(404).json({ error: 'Employee not found in your organisation' }); return; }

  const profile = await prisma.profile.findFirst({
    where: { userId: employeeId },
    orderBy: { createdAt: 'desc' },
  });
  if (!profile) { res.status(404).json({ error: 'Employee has no profile yet. Upload via Excel first.' }); return; }

  // Override career goal with admin-specified goal
  const modifiedProfile = { ...profile, careerGoal };

  let ragResponse;
  try {
    ragResponse = await callRagGenerate(prismaToRagProfile(modifiedProfile));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(503).json({ error: 'Roadmap generation failed', details: msg });
    return;
  }

  const roadmap = await prisma.roadmap.create({
    data: {
      userId:      employeeId,
      profileId:   profile.id,
      roadmapData: { nodes: ragResponse.roadmap_nodes, edges: ragResponse.roadmap_edges, current_role: ragResponse.current_role, target_role: ragResponse.target_role, total_transition_months: ragResponse.total_transition_months, explanation: ragResponse.explanation, emotional_forecast: ragResponse.emotional_forecast, alternative_paths: ragResponse.alternative_paths } as object,
      auditScores: ragResponse.audit_scores as object,
      probability: ragResponse.success_probability / 100,
    },
  });

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

  await cacheSet(profileCacheKey(profile.id), responseData);
  res.json(responseData);
});

// ─── POST /api/org/upload — Bulk Excel upload ─────────────────────────────────
router.post('/upload', upload.single('employees'), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded. Send Excel as "employees" field.' }); return; }

  const admin = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!admin?.orgId) { res.status(404).json({ error: 'Organisation not found' }); return; }

  // Parse Excel
  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

  if (!rawRows.length) { res.status(400).json({ error: 'Excel file is empty or unreadable' }); return; }

  // Normalise column names: trim whitespace, lowercase, replace spaces/hyphens with underscores
  const rows: any[] = rawRows.map(row => {
    const normalised: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const normKey = key.trim().toLowerCase().replace(/[\s\-]+/g, '_');
      normalised[normKey] = val;
    }
    return normalised;
  });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    // Accept common column name variants
    const email = String(row.email ?? row.email_address ?? row.work_email ?? '').trim().toLowerCase();
    const name  = String(row.full_name ?? row.name ?? row.employee_name ?? row.fullname ?? '').trim();
    if (!email || !name) { results.skipped++; continue; }

    try {
      // Create employee user account if not exists
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const tempPassword = await bcrypt.hash(`Temp@${Math.random().toString(36).slice(2, 8)}`, SALT_ROUNDS);
        user = await prisma.user.create({
          data: { name, email, password: tempPassword, role: 'company_employee', orgId: admin.orgId },
        });
      } else if (user.orgId !== admin.orgId) {
        results.errors.push(`${email}: already belongs to another org`);
        continue;
      }

      // Skip if profile already exists for this employee (idempotent upload)
      const existingProfile = await prisma.profile.findFirst({ where: { userId: user.id } });
      if (existingProfile) { results.skipped++; continue; }

      // Build profile from Excel columns with safe defaults + common column name variants
      const r = row; // already normalised
      const csv = (v: any) => v ? String(v).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const num = (v: any, def: number) => { const n = Number(v); return isNaN(n) ? def : n; };
      const str = (v: any, def = '') => v != null ? String(v).trim() : def;
      const bool = (v: any) => ['true', '1', 'yes', 'y'].includes(String(v ?? '').toLowerCase());

      await prisma.profile.create({
        data: {
          userId:             user.id,
          fullName:           name,
          age:                num(r.age, 25),
          gender:             str(r.gender),
          locationCity:       str(r.location_city ?? r.city),
          locationState:      str(r.location_state ?? r.state),
          highestDegree:      str(r.highest_degree ?? r.degree, 'B.Tech'),
          fieldOfStudy:       str(r.field_of_study ?? r.field, 'Engineering'),
          institutionTier:    str(r.institution_tier ?? r.tier, 'Tier 2'),
          currentRole:        str(r.current_role ?? r.role ?? r.designation, 'Professional'),
          currentIndustry:    str(r.current_industry ?? r.industry, 'Technology'),
          yearsOfExperience:  num(r.years_experience ?? r.years_of_experience ?? r.experience, 0),
          employmentStatus:   str(r.employment_status ?? r.status, 'Employed Full-Time'),
          currentSalaryLpa:   num(r.current_salary_lpa ?? r.salary_lpa ?? r.salary, 0),
          technicalSkills:    csv(r.technical_skills ?? r.skills ?? r.tech_skills),
          softSkills:         csv(r.soft_skills),
          certifications:     csv(r.certifications ?? r.certs),
          interestDomains:    csv(r.interest_domains ?? r.domains ?? r.interests),
          careerGoal:         str(r.career_goal ?? r.goal, 'Career growth in my field'),
          preferredWorkStyle: str(r.preferred_work_style ?? r.work_style, 'Hybrid'),
          willingToRelocate:  bool(r.willing_to_relocate ?? r.relocate),
          targetTimelineYears: num(r.target_timeline_years ?? r.timeline_years ?? r.timeline, 2),
          lifeStage:          str(r.life_stage, 'Early Career'),
          burnoutLevel:       num(r.burnout_level ?? r.burnout, 3),
          stressTolerance:    num(r.stress_tolerance ?? r.stress, 5),
          hasDependents:      bool(r.has_dependents ?? r.dependents),
          recentLifeEvent:    str(r.recent_life_event ?? r.life_event, 'None'),
          workLifePriority:   str(r.work_life_priority ?? r.priority, 'Career Growth'),
          leadershipScore:    num(r.leadership_score ?? r.leadership, 5),
          alignmentCategory:  str(r.alignment_category ?? r.alignment, 'Moderate'),
        },
      });

      results.created++;
    } catch (err) {
      results.errors.push(`${email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Respond immediately — don't make admin wait for roadmap generation
  res.json({
    ...results,
    total: rows.length,
    errorDetails: results.errors.slice(0, 5), // first 5 actual error messages for debugging
    roadmapsQueued: results.created > 0 ? 'Generating in background...' : 'No new employees created',
  });

  // Background: auto-generate roadmap for every employee who has a career_goal
  setImmediate(async () => {
    const employees = await prisma.user.findMany({
      where: { orgId: admin.orgId!, role: 'company_employee' },
      include: { profiles: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    for (const emp of employees) {
      const profile = emp.profiles[0];
      if (!profile || !profile.careerGoal) continue;

      // Skip if roadmap already exists for this profile
      const existing = await prisma.roadmap.findFirst({ where: { profileId: profile.id } });
      if (existing) continue;

      try {
        const ragResponse = await callRagGenerate(prismaToRagProfile(profile));
        const roadmap = await prisma.roadmap.create({
          data: {
            userId:      emp.id,
            profileId:   profile.id,
            roadmapData: {
              nodes:                   ragResponse.roadmap_nodes,
              edges:                   ragResponse.roadmap_edges,
              current_role:            ragResponse.current_role,
              target_role:             ragResponse.target_role,
              total_transition_months: ragResponse.total_transition_months,
              explanation:             ragResponse.explanation,
              emotional_forecast:      ragResponse.emotional_forecast,
              alternative_paths:       ragResponse.alternative_paths,
            } as object,
            auditScores: ragResponse.audit_scores as object,
            probability: ragResponse.success_probability / 100,
          },
        });

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
        await cacheSet(profileCacheKey(profile.id), responseData);
        console.log(`✅ Auto-generated roadmap for ${emp.email}`);
      } catch (err) {
        console.error(`❌ Failed roadmap for ${emp.email}:`, err instanceof Error ? err.message : err);
      }

      // 2-second gap between each call to stay within Groq free tier rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log(`🏁 Background roadmap generation complete for org ${admin.orgId}`);
  });
});

// ─── POST /api/org/quick-analysis — One-off hiring/promotion analysis ─────────
router.post('/quick-analysis', async (req: Request, res: Response) => {
  const Schema = z.object({
    profile:    z.object({}).passthrough(),  // accepts any profile-shaped object
    targetRole: z.string().min(2),
    purpose:    z.enum(['hiring', 'promotion']).default('hiring'),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

  const { profile, targetRole, purpose } = parsed.data;

  // Inject target role as career goal
  const enrichedProfile: any = {
    ...profile,
    careerGoal: `Transition to ${targetRole} (${purpose} evaluation)`,
  };

  let ragResponse;
  try {
    ragResponse = await callRagGenerate(prismaToRagProfile(enrichedProfile));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(503).json({ error: 'Analysis failed', details: msg });
    return;
  }

  // Compute readiness verdict
  const prob = ragResponse.success_probability;
  const verdict = prob >= 70 ? 'Ready' : prob >= 50 ? '3-6 months away' : prob >= 35 ? '6-12 months away' : 'Not recommended yet';

  // Same flat shape as personal roadmap generation — consistent across all entry points
  res.json({
    roadmapId:               null,   // no DB record for quick analysis
    roadmap_nodes:           ragResponse.roadmap_nodes,
    roadmap_edges:           ragResponse.roadmap_edges,
    current_role:            ragResponse.current_role,
    target_role:             ragResponse.target_role,
    success_probability:     prob,
    total_transition_months: ragResponse.total_transition_months,
    explanation:             ragResponse.explanation,
    emotional_forecast:      ragResponse.emotional_forecast,
    alternative_paths:       ragResponse.alternative_paths,
    audit_scores:            ragResponse.audit_scores,
    // Quick-analysis extras (additive — frontend can use or ignore)
    purpose,
    verdict,
    skill_gaps: ragResponse.roadmap_nodes.flatMap((n: any) => n.skill_gap ?? []),
    fromCache:  false,
  });
});

// ─── GET /api/org/dashboard — Org-wide aggregate stats ───────────────────────
router.get('/dashboard', async (req: Request, res: Response) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { adminOfOrg: true } });
  if (!admin?.orgId) { res.status(404).json({ error: 'Organisation not found' }); return; }

  const [totalEmployees, totalRoadmaps, profiles, org] = await Promise.all([
    prisma.user.count({ where: { orgId: admin.orgId, role: 'company_employee' } }),
    prisma.roadmap.count({ where: { user: { orgId: admin.orgId } } }),
    prisma.profile.findMany({
      where: { user: { orgId: admin.orgId } },
      select: { alignmentCategory: true, technicalSkills: true, leadershipScore: true },
    }),
    prisma.organisation.findUnique({ where: { id: admin.orgId } }),
  ]);

  // Alignment distribution
  const alignmentDist = { High: 0, Moderate: 0, Low: 0 };
  for (const p of profiles) {
    const cat = p.alignmentCategory as keyof typeof alignmentDist;
    if (cat in alignmentDist) alignmentDist[cat]++;
  }

  // Top skill gaps (most common skills across org)
  const skillCount: Record<string, number> = {};
  for (const p of profiles) {
    for (const s of p.technicalSkills) {
      skillCount[s] = (skillCount[s] ?? 0) + 1;
    }
  }
  const topSkills = Object.entries(skillCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  const avgLeadership = profiles.length
    ? profiles.reduce((s, p) => s + p.leadershipScore, 0) / profiles.length
    : 0;

  res.json({
    org: { id: org!.id, name: org!.name, industry: org!.industry },
    totalEmployees,
    totalRoadmaps,
    alignmentDistribution: alignmentDist,
    topSkillsInOrg: topSkills,
    avgLeadershipScore: Math.round(avgLeadership * 10) / 10,
  });
});

export default router;
