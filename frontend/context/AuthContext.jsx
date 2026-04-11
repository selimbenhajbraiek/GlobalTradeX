"use client";

import Cookies from "js-cookie";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import api, { authApi } from "@/lib/api";

const TOKEN_COOKIE = "token";
const COOKIE_EXPIRES_DAYS = 1;

/** Role segments allowed under /dashboard/[role] */
const DASHBOARD_ROLE_ROUTES = new Set([
  "importateur",
  "exportateur",
  "transitaire",
  "courtier",
  "admin",
]);

function dashboardPathForRole(role) {
  const r = typeof role === "string" ? role : "";
  if (DASHBOARD_ROLE_ROUTES.has(r)) {
    return `/dashboard/${r}`;
  }
  return "/dashboard/importateur";
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const t = Cookies.get(TOKEN_COOKIE) || "";
    setToken(t);
    if (!t) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/api/users/me");
      setUser(data);
    } catch {
      Cookies.remove(TOKEN_COOKIE);
      setUser(null);
      setToken("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await authApi.login(email, password);
      const accessToken = data.access_token;
      const nextUser = data.user;

      Cookies.set(TOKEN_COOKIE, accessToken, {
        expires: COOKIE_EXPIRES_DAYS,
        sameSite: "lax",
      });
      setToken(accessToken);
      setUser(nextUser);

      router.replace(dashboardPathForRole(nextUser?.role));
      return data;
    },
    [router]
  );

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    return data;
  }, []);

  const logout = useCallback(() => {
    Cookies.remove(TOKEN_COOKIE);
    setUser(null);
    setToken("");
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser: bootstrap,
    }),
    [user, token, isLoading, login, register, logout, bootstrap]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
