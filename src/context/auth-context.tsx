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

interface AuthContextType {
  user: JWTPayload | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean; // Changed from isLoading to loading
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Changed from isLoading to loading

  useEffect(() => {
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem("koka_token");
    if (storedToken) {
      const decoded = decodeJWT(storedToken);
      if (decoded) {
        setUser(decoded);
        setToken(storedToken);
      } else {
        localStorage.removeItem("koka_token");
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    const decoded = decodeJWT(newToken);
    if (decoded) {
      setUser(decoded);
      setToken(newToken);
      localStorage.setItem("koka_token", newToken);
    }
  };

  const logout = () => {
    // Clear token from localStorage
    localStorage.removeItem("token");

    // Clear user state
    setUser(null);

    // Optional: Clear any other auth-related data
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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
