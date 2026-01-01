import { create } from 'zustand';
import { Mission, Parcel } from '../types';
import { api } from '../services/api';

interface AvailableMission {
  id: string;
  size: string;
  description: string | null;
  dropoffType: string;
  dropoffName: string;
  pickupSlot: { start: string; end: string };
  price: { total: number; carrierPayout: number };
  distance: number;
  pickupAddress: {
    id: string;
    latitude: number;
    longitude: number;
    city: string;
    postalCode: string;
    street: string;
  };
  vendor: { id: string; firstName: string; avatarUrl: string | null };
}
interface MissionState {
  availableMissions: AvailableMission[];
  currentMissions: Mission[];
  missionHistory: Mission[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAvailableMissions: (latitude: number, longitude: number, radius?: number) => Promise<void>;
  acceptMission: (parcelId: string) => Promise<void>;
  fetchCurrentMissions: () => Promise<void>;
  fetchMissionHistory: () => Promise<void>;
  pickupMission: (missionId: string) => Promise<void>;
  deliverMission: (missionId: string, data?: any) => Promise<void>;
  cancelMission: (missionId: string, reason?: string) => Promise<void>;
  clearError: () => void;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  availableMissions: [],
  currentMissions: [],
  missionHistory: [],
  isLoading: false,
  error: null,

  fetchAvailableMissions: async (latitude, longitude, radius = 5) => {
    set({ isLoading: true, error: null });
    try {
      const { missions } = await api.getAvailableMissions(latitude, longitude, radius);
      set({ availableMissions: missions || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  acceptMission: async (parcelId) => {
    set({ isLoading: true, error: null });
    try {
      await api.acceptMission(parcelId);
      // Rafraîchir les missions
      await get().fetchCurrentMissions();
      set((state) => ({
        availableMissions: state.availableMissions.filter((m) => m.id !== parcelId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchCurrentMissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { missions } = await api.getCurrentMissions();
      set({ currentMissions: missions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMissionHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const { missions } = await api.getMissionHistory();
      set({ missionHistory: missions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  pickupMission: async (missionId) => {
    set({ isLoading: true, error: null });
    try {
      const { mission } = await api.pickupMission(missionId);
      set((state) => ({
        currentMissions: state.currentMissions.map((m) =>
          m.id === missionId ? mission : m
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deliverMission: async (missionId, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.deliverMission(missionId, data);
      await get().fetchCurrentMissions();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  cancelMission: async (missionId, reason) => {
    set({ isLoading: true, error: null });
    try {
      await api.cancelMission(missionId, reason);
      await get().fetchCurrentMissions();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));    