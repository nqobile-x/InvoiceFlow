import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setAccessToken, clearAccessToken, clearRefreshToken } from "@/lib/api";

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
  login: (user: AuthUser, accessToken: string) => void;
  updateHasBusinessProfile: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login(user, accessToken) {
        setAccessToken(accessToken);
        set({ user, isAuthenticated: true });
      },

      updateHasBusinessProfile(value) {
        set((s) =>
          s.user ? { user: { ...s.user, hasBusinessProfile: value } } : {}
        );
      },

      logout() {
        clearAccessToken();
        clearRefreshToken();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "invoiceflow-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
