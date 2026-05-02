import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserProfile, RoadmapResponse } from '@/types';

interface AppStore {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
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
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      profileId: null,
      profileData: null,
      roadmapResponse: null,
      isGenerating: false,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, profileId: null, profileData: null, roadmapResponse: null }),
      setProfile: (id, data) => set({ profileId: id, profileData: data }),
      setRoadmap: (roadmap) => set({ roadmapResponse: roadmap }),
      setGenerating: (val) => set({ isGenerating: val }),
      clearRoadmap: () => set({ roadmapResponse: null }),
    }),
    {
      name: 'career-path-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        profileId: state.profileId,
        profileData: state.profileData,
        roadmapResponse: state.roadmapResponse,
        // isGenerating intentionally excluded — always resets to false on load
      }),
    }
  )
);
