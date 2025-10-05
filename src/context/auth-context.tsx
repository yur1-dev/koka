"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const TOKEN_KEY = "koka_auth_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load token from localStorage on mount
  useEffect(() => {
    const loadAuth = () => {
      try {
        console.log("Loading auth from localStorage...");

        if (typeof window === "undefined") {
          setIsLoading(false);
          return;
        }

        const savedToken = localStorage.getItem(TOKEN_KEY);

        if (!savedToken) {
          console.log("No saved token found");
          setIsLoading(false);
          return;
        }

        console.log("Found saved token:", savedToken.substring(0, 20) + "...");

        // Decode and verify token
        const decoded = decodeJWT(savedToken);

        if (!decoded) {
          console.log("Token is invalid or expired");
          localStorage.removeItem(TOKEN_KEY);
          setIsLoading(false);
          return;
        }

        console.log("Token is valid, user:", decoded.username);
        setToken(savedToken);
        setUser(decoded);
      } catch (error) {
        console.error("Error loading auth:", error);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const login = (newToken: string) => {
    try {
      console.log("=== AUTH CONTEXT: Login called ===");
      console.log("Token received:", newToken.substring(0, 30) + "...");

      if (!newToken) {
        throw new Error("No token provided");
      }

      // Decode token to get user data
      const decoded = decodeJWT(newToken);

      if (!decoded) {
        console.error("Token decode failed");
        throw new Error("Invalid token - decode failed");
      }

      console.log("✅ Token decoded successfully");
      console.log("User ID:", decoded.userId);
      console.log("Username:", decoded.username);
      console.log("Email:", decoded.email);
      console.log("Is Admin:", decoded.isAdmin);

      // Save to state
      setToken(newToken);
      setUser(decoded);
      console.log("✅ State updated");

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, newToken);
        console.log("✅ Token saved to localStorage");
      }

      console.log("=== AUTH CONTEXT: Login complete ===");
    } catch (error) {
      console.error("=== AUTH CONTEXT: Login error ===");
      console.error(error);
      throw error;
    }
  };

  const logout = () => {
    console.log("Logout called");

    setToken(null);
    setUser(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      console.log("Token removed from localStorage");
    }

    router.push("/app/login");
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
