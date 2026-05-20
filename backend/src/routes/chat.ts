// src/routes/chat.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { chatWithProfile, ChatMessage } from '../lib/groqClient';
import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet } from '../lib/redis';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const ChatSchema = z.object({
  message:   z.string().min(1).max(1000),
  profileId: z.string().uuid(),
  roadmapId: z.string().uuid().optional(),
});

const CHAT_TTL = 60 * 60; // 1 hour conversation history

// ─── POST /api/chat ───────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { message, profileId, roadmapId } = parsed.data;
  const userId = req.user!.userId;

  // Load profile (verify ownership)
  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found or access denied' });
    return;
  }

  // Load latest roadmap for context (optional)
  let roadmapData: Record<string, unknown> | null = null;
  if (roadmapId) {
    const roadmap = await prisma.roadmap.findFirst({ where: { id: roadmapId, userId } });
    if (roadmap) {
      roadmapData = {
        ...(roadmap.roadmapData as object),
        current_role:        (roadmap.roadmapData as any)?.current_role ?? profile.currentRole,
        target_role:         (roadmap.roadmapData as any)?.target_role ?? '',
        success_probability: Math.round((roadmap.probability ?? 0) * 100),
        total_transition_months: (roadmap.roadmapData as any)?.total_transition_months ?? 0,
        explanation:         (roadmap.roadmapData as any)?.explanation ?? '',
      };
    }
  }

  // Load conversation history from Redis
  const historyKey = `chat:${userId}:${profileId}`;
  const history: ChatMessage[] = (await cacheGet<ChatMessage[]>(historyKey)) ?? [];

  // Call Groq
  let reply: string;
  try {
    reply = await chatWithProfile(
      message,
      history,
      profile as unknown as Record<string, unknown>,
      roadmapData,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Chat error: ${msg}`);
    res.status(503).json({ error: 'Chat service unavailable. Please try again.' });
    return;
  }

  // Append to history and save back to Redis (keep last 20 messages = 10 exchanges)
  const updatedHistory: ChatMessage[] = [
    ...history,
    { role: 'user' as const, content: message },
    { role: 'assistant' as const, content: reply },
  ].slice(-20);

  await cacheSet(historyKey, updatedHistory, CHAT_TTL);

  res.json({ reply, history: updatedHistory });
});

// ─── DELETE /api/chat/clear — clear conversation history ─────────────────────
router.delete('/clear', async (req: Request, res: Response) => {
  const { profileId } = req.query;
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'profileId query param required' });
    return;
  }

  const historyKey = `chat:${req.user!.userId}:${profileId}`;
  await cacheSet(historyKey, [], 1); // expire immediately
  res.json({ cleared: true });
});

export default router;
