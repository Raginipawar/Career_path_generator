// src/schemas/index.ts
import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Profile Schemas ──────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  skills: z
    .array(z.string().min(1).max(50))
    .min(1, 'At least one skill is required')
    .max(20, 'Maximum 20 skills allowed'),
  domain: z.string().min(2, 'Domain is required').max(100),
  experience: z.enum(['0-2', '2-5', '5-10', '10+'], {
    errorMap: () => ({ message: 'Experience must be one of: 0-2, 2-5, 5-10, 10+' }),
  }),
  lifeStage: z.enum(['student', 'early', 'mid', 'senior', 'transition'], {
    errorMap: () => ({ message: 'Life stage must be one of: student, early, mid, senior, transition' }),
  }),
});

// ─── Roadmap Schemas ──────────────────────────────────────────────────────────

export const RoadmapRequestSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ProfileInput = z.infer<typeof ProfileSchema>;
export type RoadmapRequestInput = z.infer<typeof RoadmapRequestSchema>;
