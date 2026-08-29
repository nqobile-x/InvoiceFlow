import { create } from "zustand";
import { storeToken, clearToken, getStoredToken } from "../services/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  hasBusinessProfile: boolean;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateHasBusinessProfile: (value: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (user, token) => {
    await storeToken(token);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await clearToken();
    set({ user: null, isAuthenticated: false });
  },

  updateHasBusinessProfile: (value) => {
    set((s) => s.user ? { user: { ...s.user, hasBusinessProfile: value } } : {});
  },

  initialize: async () => {
    const token = await getStoredToken();
    set({ isLoading: false, isAuthenticated: !!token });
  },
}));
