import { UserProfile, AuthResponse, RoadmapResponse } from '@/types';

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

  getClusters: () =>
    request<any>('/api/clusters'),

  getHistory: (userId: string) =>
    request<RoadmapResponse[]>(`/api/roadmap/history/${userId}`),

  getAnalytics: () =>
    request<any>('/api/analytics/summary'),
};
