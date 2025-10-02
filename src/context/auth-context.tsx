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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(false);
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
    setUser(null);
    setToken(null);
    localStorage.removeItem("koka_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
