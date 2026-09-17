"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { AppUser, clearToken, fetchMe, getToken, setToken } from "@/lib/api";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  setSession: (token: string, user: AppUser) => void;
  updateUser: (user: AppUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    Promise.resolve()
      .then(() => (token ? fetchMe() : null))
      .then((me) => {
        if (me) setUser(me);
        else if (token) clearToken();
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const setSession = useCallback((token: string, nextUser: AppUser) => {
    setToken(token);
    setUser(nextUser);
  }, []);

  const updateUser = useCallback((nextUser: AppUser) => {
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    signOut(firebaseAuth).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setSession, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
