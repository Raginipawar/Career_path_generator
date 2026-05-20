import { UserProfile, AuthResponse, RoadmapResponse, ResumeParseResponse, ChatResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  try {
    const store = JSON.parse(localStorage.getItem('career-path-store') || '{}');
    return store?.state?.token || null;
  } catch { return null; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    const details = err.details?.fieldErrors
      ? ' — ' + Object.entries(err.details.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ')
      : '';
    throw new Error((err.error || `HTTP ${res.status}`) + details);
  }
  return res.json();
}

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  saveProfile: (data: UserProfile) =>
    request<{ profileId: string }>('/api/profile', { method: 'POST', body: JSON.stringify(data) }),

  generateRoadmap: (profileId: string) =>
    request<RoadmapResponse>('/api/roadmap/generate', { method: 'POST', body: JSON.stringify({ profileId }) }),

  parseResume: (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('resume', file);
    return fetch(`${BASE_URL}/api/profile/parse-resume`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json() as Promise<ResumeParseResponse>;
    });
  },

  sendChatMessage: (data: { message: string; profileId: string; roadmapId?: string }) =>
    request<ChatResponse>('/api/chat', { method: 'POST', body: JSON.stringify(data) }),

  clearChat: (profileId: string) =>
    request<{ cleared: boolean }>(`/api/chat/clear?profileId=${profileId}`, { method: 'DELETE' }),

  getClusters: () =>
    request<any>('/api/clusters'),

  getProfiles: () =>
    request<{ profiles: any[]; count: number }>('/api/profile'),

  renameProfile: (profileId: string, label: string) =>
    request<{ id: string; label: string }>(`/api/profile/${profileId}/label`, {
      method: 'PATCH',
      body: JSON.stringify({ label }),
    }),

  generateRoadmapFromProfile: (profileId: string) =>
    request<any>('/api/roadmap/generate', { method: 'POST', body: JSON.stringify({ profileId }) }),

  importGithub: (username: string) =>
    request<{ technicalSkills: string[]; suggestedDomains: string[]; accountAgeYears: number | null; leadershipHint: number; bio: string }>('/api/github/import', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  suggestPaths: (profileId: string) =>
    request<{ suggestions: any[] }>('/api/roadmap/suggest', { method: 'POST', body: JSON.stringify({ profileId }) }),

  toggleProgress: (roadmapId: string, nodeId: string) =>
    request<{ completedNodes: string[] }>(`/api/roadmap/${roadmapId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ nodeId }),
    }),

  getHistory: (userId: string) =>
    request<RoadmapResponse[]>(`/api/roadmap/history/${userId}`),

  getAnalytics: () =>
    request<any>('/api/analytics/summary'),

  getBenchmarks: (profileId: string) =>
    request<any>(`/api/benchmarks/${profileId}`),

  getDemandTrends: () =>
    request<any>('/api/trends'),
};
