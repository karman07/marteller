"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { AppUser, clearToken, fetchMe, getToken, setToken } from "@/lib/api";
import { trackFunnelStep } from "@/lib/analytics";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  setSession: (token: string, user: AppUser) => void;
  updateUser: (user: AppUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetchMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const setSession = useCallback((token: string, nextUser: AppUser) => {
    setToken(token);
    setUser(nextUser);
    // Fires for both a brand-new signup and a returning login — there's no
    // separate signal from the backend distinguishing the two at this
    // call site, so this approximates "browsing session ended in an
    // authenticated session" rather than a strict first-time-signup event.
    trackFunnelStep("signup_completed");
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginModalOpen,
        openLoginModal: () => {
          trackFunnelStep("signup_started");
          setLoginModalOpen(true);
        },
        closeLoginModal: () => setLoginModalOpen(false),
        setSession,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
