"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";
import type { AdminUser, LoginResponse } from "@/types";

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("erp_token");
    const userRaw = window.localStorage.getItem("erp_user");
    let user: AdminUser | null = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as AdminUser;
      } catch {
        user = null;
      }
    }
    set({ token, user, hydrated: true });
  },

  login: async (email, password) => {
    const data = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    console.log(data)
    window.localStorage.setItem("erp_token", data.token);
    window.localStorage.setItem("erp_user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user, hydrated: true });
  },

  logout: () => {
    window.localStorage.removeItem("erp_token");
    window.localStorage.removeItem("erp_user");
    set({ token: null, user: null });
  },
}));
