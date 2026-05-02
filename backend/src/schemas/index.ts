// src/schemas/index.ts
import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Profile Schema (matches Sachi's UserProfile exactly) ────────────────────

export const ProfileSchema = z.object({
  // Personal info
  fullName:      z.string().min(2).max(100),
  age:           z.number().int().min(16).max(80),
  gender:        z.string().default(''),
  locationCity:  z.string().default(''),
  locationState: z.string().default(''),

  // Education
  highestDegree:   z.string().default(''),
  fieldOfStudy:    z.string().default(''),
  institutionTier: z.enum(['Tier 1', 'Tier 2', 'Tier 3']),

  // Career current state
  currentRole:       z.string().default(''),
  currentIndustry:   z.string().default(''),
  yearsOfExperience: z.number().min(0).max(60),
  employmentStatus:  z.enum([
    'Employed Full-Time',
    'Employed Part-Time',
    'Self-Employed',
    'Unemployed',
    'Student',
    'Career Break',
  ]),
  currentSalaryLpa: z.number().min(0),

  // Skills
  technicalSkills: z.array(z.string()).max(30).default([]),
  softSkills:      z.array(z.string()).max(20).default([]),
  certifications:  z.array(z.string()).max(20).default([]),

  // Goals & preferences
  interestDomains:     z.array(z.string()).max(10).default([]),
  careerGoal:          z.string().max(500).default(''),
  preferredWorkStyle:  z.enum(['Remote', 'Hybrid', 'On-site']),
  willingToRelocate:   z.boolean(),
  targetTimelineYears: z.number().int().min(1).max(10),

  // Life context
  lifeStage: z.enum([
    'Early Career',
    'Mid Career',
    'Late Career',
    'Career Break',
    'Re-entering Workforce',
  ]),
  burnoutLevel:    z.number().int().min(1).max(10),
  stressTolerance: z.number().int().min(1).max(10),
  hasDependents:   z.boolean(),
  recentLifeEvent: z.string().default('None'),
  workLifePriority: z.enum([
    'Career Growth',
    'Work-Life Balance',
    'Financial Stability',
    'Personal Fulfilment',
  ]),

  // Assessment
  leadershipScore:   z.number().min(0).max(10),
  alignmentCategory: z.enum(['Low', 'Moderate', 'High']),
});

// ─── Roadmap Schema ───────────────────────────────────────────────────────────

export const RoadmapRequestSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type RegisterInput    = z.infer<typeof RegisterSchema>;
export type LoginInput       = z.infer<typeof LoginSchema>;
export type ProfileInput     = z.infer<typeof ProfileSchema>;
export type RoadmapRequestInput = z.infer<typeof RoadmapRequestSchema>;