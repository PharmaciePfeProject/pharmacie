import React, { createContext, useContext, useEffect, useMemo, useState, } from "react";
import { api } from "../api/axios";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);
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
                if (token)
                    await refreshMe();
            }
            catch {
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
            }
            finally {
                setIsLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);
    const login = async (p) => {
        const res = await api.post("/api/auth/login", p);
        localStorage.setItem("token", res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
    };
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };
    const value = useMemo(() => ({ token, user, isLoading, login, logout, refreshMe }), [token, user, isLoading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
