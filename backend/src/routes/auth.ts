// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { RegisterSchema, LoginSchema } from '../schemas';

const router = Router();
const SALT_ROUNDS = 12;

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Block company accounts from registering via personal route
  const existingCompany = await prisma.user.findFirst({
    where: { email, role: 'company_admin' },
  });
  if (existingCompany) {
    res.status(409).json({ error: 'This email is registered as a company admin. Use company login.' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'personal' }, // explicit role
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: 'personal' },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
  );

  res.status(201).json({ token, user });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, role: true, createdAt: true },
  });

  if (!user) {
    await bcrypt.hash('dummy', SALT_ROUNDS);
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Block company accounts from logging in via personal route
  if (user.role === 'company_admin') {
    res.status(403).json({ error: 'This is a company admin account. Please use company login at /company/login' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role ?? 'personal' },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
  );

  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

export default router;
