import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { api } from '../services/api';
import { notificationService } from '../services/notifications';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await api.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
      
      // Enregistrer le token push après connexion
      notificationService.registerToken();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erreur de connexion';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.register(data);
      // Auto-login après inscription
      await get().login(data.email, data.password);
    } catch (error: any) {
      const message = error.response?.data?.error || "Erreur d'inscription";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const { user } = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
      
      // Enregistrer le token push si connecté
      notificationService.registerToken();
    } catch (error) {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  
  updateUser: (user) => set({ user }),
}));