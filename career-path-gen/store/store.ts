import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserProfile, RoadmapResponse } from '@/types';

interface AppStore {
  // Auth
  user: User | null;
  token: string | null;
  sessionType: 'personal' | 'company' | null;
  setAuth: (user: User, token: string, sessionType?: 'personal' | 'company') => void;
  logout: () => void;

  // Profile
  profileId: string | null;
  profileData: UserProfile | null;
  setProfile: (id: string, data: UserProfile) => void;

  // Roadmap
  roadmapResponse: RoadmapResponse | null;
  isGenerating: boolean;
  setRoadmap: (roadmap: RoadmapResponse) => void;
  setGenerating: (val: boolean) => void;
  clearRoadmap: () => void;
  setCompletedNodes: (nodeIds: string[]) => void;
}

const EMPTY_STATE = {
  user: null,
  token: null,
  sessionType: null as 'personal' | 'company' | null,
  profileId: null,
  profileData: null,
  roadmapResponse: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...EMPTY_STATE,
      isGenerating: false,

      setAuth: (user, token, sessionType = 'personal') =>
        set({ user, token, sessionType }),

      logout: () => {
        // Also clear any company session from localStorage
        try {
          localStorage.removeItem('company-token');
          localStorage.removeItem('company-user');
          localStorage.removeItem('company-org');
        } catch { /* ignore */ }
        set({ ...EMPTY_STATE, isGenerating: false });
      },

      setProfile: (id, data) => set({ profileId: id, profileData: data }),
      setRoadmap: (roadmap) => set({ roadmapResponse: roadmap }),
      setGenerating: (val) => set({ isGenerating: val }),
      clearRoadmap: () => set({ roadmapResponse: null }),
      setCompletedNodes: (nodeIds) => set(state => ({
        roadmapResponse: state.roadmapResponse
          ? { ...state.roadmapResponse, completedNodes: nodeIds }
          : null,
      })),
    }),
    {
      name: 'career-path-store',
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        sessionType:     state.sessionType,
        profileId:       state.profileId,
        profileData:     state.profileData,
        roadmapResponse: state.roadmapResponse,
        // isGenerating intentionally excluded — always false on load
      }),
    }
  )
);
