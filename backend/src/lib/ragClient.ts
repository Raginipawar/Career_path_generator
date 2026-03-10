// src/lib/ragClient.ts
import { Profile } from '@prisma/client';

const RAG_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8000';
const TIMEOUT_MS = parseInt(process.env.RAG_TIMEOUT_MS ?? '30000', 10);

export interface RagResponse {
  roadmap: {
    title: string;
    summary: string;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      duration: string;
      skills: string[];
      resources: string[];
    }>;
    probability: number;
  };
  explanation: string;
  auditScores: Array<{
    dimension: string;
    score: number;
    risk: 'low' | 'medium' | 'high';
    explanation: string;
  }>;
}

export async function callRagGenerate(profile: Profile): Promise<RagResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${RAG_URL}/rag/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          id: profile.id,
          skills: profile.skills,
          domain: profile.domain,
          experience: profile.experience,
          lifeStage: profile.lifeStage,
        },
        topK: 5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RAG service responded with status ${response.status}`);
    }

    const data = (await response.json()) as RagResponse;
    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('RAG service timed out after 30 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkRagHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_URL}/rag/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
