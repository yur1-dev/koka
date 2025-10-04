"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { decodeJWT } from "@/lib/auth-helpers";
import type { JWTPayload } from "@/lib/types";

interface User extends JWTPayload {
  id: string; // Explicit id field
  name?: string;
  walletAddress?: string; // NEW: Wallet address
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Fetch full user profile (graceful failure: don't logout on error)
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        console.warn(
          "Profile fetch failed (status:",
          response.status,
          "), using JWT data"
        );
        return;
      }
      const data = await response.json();
      if (data.success && data.user) {
        setUser({
          ...data.user,
          id: data.user.id || data.user.userId,
          walletAddress: data.user.walletAddress, // NEW: Include wallet
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem("koka_token");
    if (storedToken) {
      const decoded = decodeJWT(storedToken);
      if (decoded) {
        setToken(storedToken);
        // Map userId to id and include wallet
        setUser({
          ...decoded,
          id: decoded.userId,
          walletAddress: decoded.walletAddress, // NEW
        } as User);
        fetchUserProfile(storedToken);
      } else {
        localStorage.removeItem("koka_token");
      }
    }
    setLoading(false);
    setHydrated(true);
  }, []);

  const login = (newToken: string) => {
    const decoded = decodeJWT(newToken);
    if (decoded) {
      setToken(newToken);
      // Map userId to id and include wallet
      setUser({
        ...decoded,
        id: decoded.userId,
        walletAddress: decoded.walletAddress, // NEW
      } as User);
      fetchUserProfile(newToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("koka_token", newToken);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("koka_token");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, loading, hydrated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
