/**
 * ============================================
 * CONTEXT: Authentication (React Context)
 * ============================================
 * 
 * Purpose: Manage user authentication state across the entire app.
 * Provides login, register, logout, and user data to any component.
 * 
 * Features:
 * - Persistent login (token saved to localStorage)
 * - Automatic user fetch on app load
 * - Role and permission data included
 * - Error handling with automatic logout on auth failure
 * 
 * Usage in Components:
 *   const { token, user, login, logout } = useAuth();
 *   if (!user) return <Navigate to="/login" />;
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";
import type { PermissionKey, RoleKey } from "@/lib/roles";

/**
 * Structure of an authenticated user.
 * Includes personal info, role assignments, and derived permissions.
 */
export type AuthUser = {
  id: number;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  function: string | null;  // Job function (e.g., "DOCTOR")
  functionName?: string | null;
  actived: number;  // Is account active? 0 = inactive, 1 = active
  roleIds: number[];  // Database role IDs (e.g., [1, 2, 5])
  roles: RoleKey[];  // Role names (e.g., ["ADMIN", "PHARMACIEN"])
  permissions: PermissionKey[];  // All calculated permissions for this user
};

/**
 * Login request payload.
 * User can log in with email OR username.
 */
type LoginPayload = { emailOrUsername: string; password: string };

/**
 * Register request payload.
 * All fields required for new user creation.
 * functionName must be a valid role like "DOCTOR" or "PHARMACIEN".
 */
export type RegisterPayload = {
  email: string;
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  functionName: string;  // Job function for new user
};

/**
 * Type definition for the Auth Context value.
 * Describes all functions and state available to consuming components.
 */
type AuthContextType = {
  token: string | null;      // JWT token (null if not logged in)
  user: AuthUser | null;     // User info (null if not logged in)
  isLoading: boolean;        // App loading state on mount
  login: (p: LoginPayload) => Promise<void>;
  register: (p: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

/**
 * Create the React Context for authentication.
 * Initially null until AuthProvider wraps the app.
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider: Wraps the application to provide authentication context.
 * 
 * Manages:
 * - Token storage in localStorage (persists across page refreshes)
 * - User data fetching on app load
 * - Login/Register/Logout flows
 * - Loading state during initialization
 * 
 * Usage:
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Components wrapped by this provider
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize token from localStorage (persists across page reloads)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  // Current logged-in user (fetched from backend)
  const [user, setUser] = useState<AuthUser | null>(null);
  // Loading state: true while checking session on app mount
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch current user info from backend.
   * Only works if token exists.
   * Called: On app startup and after login.
   */
  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const res = await api.get("/api/auth/me");
    setUser(res.data.user);
  };

  /**
   * On component mount: Check if user is already logged in.
   * If token exists in localStorage, fetch user info.
   * This keeps users logged in across page refreshes.
   */
  useEffect(() => {
    (async () => {
      try {
        if (token) await refreshMe();
      } catch {
        // Auth failed: clear token and logout
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Login user with email/username and password.
   * On success: Store token in localStorage and update user state.
   * On failure: Exception is thrown (handled by route protection).
   * 
   * @throws Error if credentials invalid or network error
   */
  const login = async (p: LoginPayload) => {
    const res = await api.post("/api/auth/login", p);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  /**
   * Register new user.
   * On success: Automatically log in with returned token.
   * Creates UTILISATEUR, UTILISATEUR_ROLE, and DOCTOR (if applicable) records.
   * 
   * @throws Error if registration fails (duplicate email, invalid data, etc.)
   */
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
