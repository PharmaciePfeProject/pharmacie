import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";

type User = {
  id: number;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  function: string;
  actived: number;
  roles: number[];
};

type LoginPayload = { emailOrUsername: string; password: string };
type RegisterPayload = {
  email: string;
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  functionName: string;
  roleId: number;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (p: LoginPayload) => Promise<void>;
  register: (p: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const res = await api.get("/api/auth/me");
    setUser(res.data.user);
  };

  useEffect(() => {
    (async () => {
      try {
        if (token) await refreshMe();
      } catch {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (p: LoginPayload) => {
    const res = await api.post("/api/auth/login", p);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (p: RegisterPayload) => {
    const res = await api.post("/api/auth/register", p);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, isLoading, login, register, logout, refreshMe }),
    [token, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}