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
  id: string;
  name?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  walletAddress?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  loading: boolean;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const fetchUserProfile = async (authToken: string, decoded: JWTPayload) => {
    try {
      console.log("AuthContext: Fetching full profile..."); // DEBUG: Track fetch
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        console.warn(
          "AuthContext: Profile fetch failed (status:",
          response.status,
          "), using JWT data"
        );
        return;
      }
      const data = await response.json();
      if (data.success) {
        // BASE: Always start from decoded (JWTPayload) to include userId, username, isAdmin, etc.
        const baseUser: User = {
          ...decoded,
          id: decoded.userId,
          walletAddress: decoded.walletAddress,
        };
        // MERGE: Add/override with profile data
        const fullUser: User = {
          ...baseUser,
          name: data.name || baseUser.name || baseUser.username, // Fallback to username if name missing
          email: data.email || baseUser.email,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
        };
        setUser(fullUser);
        console.log("AuthContext: Profile fetched & merged successfully", {
          avatarUrl: fullUser.avatarUrl,
          bio: fullUser.bio,
        }); // DEBUG: Confirm avatarUrl is set
      } else {
        console.warn("AuthContext: No success in profile response");
      }
    } catch (error) {
      console.error("AuthContext: Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem("koka_token");
    if (storedToken) {
      const decoded = decodeJWT(storedToken);
      if (decoded) {
        setToken(storedToken);
        // INITIAL: Set from JWT + map id
        const initialUser: User = {
          ...decoded,
          id: decoded.userId,
          walletAddress: decoded.walletAddress,
          avatarUrl: undefined, // FORCE full fetch for avatarUrl
        };
        setUser(initialUser);
        // ENSURE: Always fetch full profile on mount/refresh for persistence
        fetchUserProfile(storedToken, decoded);
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
      const initialUser: User = {
        ...decoded,
        id: decoded.userId,
        walletAddress: decoded.walletAddress,
        avatarUrl: undefined, // FORCE fetch
      };
      setUser(initialUser);
      fetchUserProfile(newToken, decoded);
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

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
    // ENHANCE: After update (e.g., new avatar), re-fetch to ensure DB sync on next refresh
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded) {
        setTimeout(() => fetchUserProfile(token, decoded), 500); // Short delay for API write
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser, loading, hydrated }}
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
