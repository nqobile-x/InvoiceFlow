import { create } from "zustand";
import {
  storeToken,
  clearToken,
  getStoredToken,
  storeUserJson,
  getStoredUserJson,
  registerSessionExpiredHandler,
} from "../services/api";

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
  login: (user: AuthUser, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateHasBusinessProfile: (value: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => {
  registerSessionExpiredHandler(() => {
    set({ user: null, isAuthenticated: false });
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (user, token, refreshToken) => {
      await Promise.all([
        storeToken(token, refreshToken),
        storeUserJson(JSON.stringify(user)),
      ]);
      set({ user, isAuthenticated: true });
    },

    logout: async () => {
      await clearToken();
      set({ user: null, isAuthenticated: false });
    },

    updateHasBusinessProfile: (value) => {
      set((state) => {
        if (!state.user) return {};
        const nextUser = { ...state.user, hasBusinessProfile: value };
        storeUserJson(JSON.stringify(nextUser)).catch(() => {});
        return { user: nextUser };
      });
    },

    initialize: async () => {
      const [token, userJson] = await Promise.all([
        getStoredToken(),
        getStoredUserJson(),
      ]);
      let parsedUser: AuthUser | null = null;
      if (userJson) {
        try {
          parsedUser = JSON.parse(userJson) as AuthUser;
        } catch {
          parsedUser = null;
        }
      }
      set({
        isLoading: false,
        isAuthenticated: !!token,
        user: token ? parsedUser : null,
      });
    },
  };
});
