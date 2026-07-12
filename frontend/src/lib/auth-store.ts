import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface IUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

interface IAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: IUser | null;
  setSession: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: IUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<IAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "studiodesk-auth" },
  ),
);
