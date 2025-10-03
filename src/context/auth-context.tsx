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
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch full user profile (graceful failure: don't logout on error)
  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        // FIX: On 401/ error, don't logout—just use JWT fallback
        console.warn("Profile fetch failed, using JWT data");
        return;
      }
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (error) {
      // FIX: Network/error page failure—don't clear token, log only
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("koka_token");
      if (storedToken) {
        const decoded = decodeJWT(storedToken);
        if (decoded) {
          setToken(storedToken);
          setUser(decoded as User); // FIX: Fallback to decoded data immediately
          fetchUserProfile(storedToken); // Async, won't block
        } else {
          // Invalid token—clear
          localStorage.removeItem("koka_token");
        }
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    const decoded = decodeJWT(newToken);
    if (decoded) {
      setToken(newToken);
      setUser(decoded as User); // Fallback immediately
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
