import { create } from 'zustand';
import { Parcel } from '../types';
import { api } from '../services/api';

interface ParcelState {
  parcels: Parcel[];
  currentParcel: Parcel | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchParcels: (status?: string) => Promise<void>;
  fetchParcel: (id: string) => Promise<void>;
  createParcel: (data: any) => Promise<Parcel>;
  cancelParcel: (id: string) => Promise<void>;
  confirmPickup: (parcelId: string, pickupCode: string) => Promise<void>;
  clearError: () => void;
}

export const useParcelStore = create<ParcelState>((set, get) => ({
  parcels: [],
  currentParcel: null,
  isLoading: false,
  error: null,

  fetchParcels: async (status) => {
    set({ isLoading: true, error: null });
    try {
      const { parcels } = await api.getParcels(status);
      set({ parcels, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchParcel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { parcel } = await api.getParcel(id);
      set({ currentParcel: parcel, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createParcel: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { parcel } = await api.createParcel(data);
      set((state) => ({
        parcels: [parcel, ...state.parcels],
        isLoading: false,
      }));
      return parcel;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  cancelParcel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.cancelParcel(id);
      set((state) => ({
        parcels: state.parcels.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  confirmPickup: async (parcelId, pickupCode) => {
    set({ isLoading: true, error: null });
    try {
      const { parcel } = await api.confirmPickup(parcelId, pickupCode);
      set((state) => ({
        parcels: state.parcels.map((p) => (p.id === parcelId ? parcel : p)),
        currentParcel: parcel,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));