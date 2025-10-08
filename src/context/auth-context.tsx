// src/context/auth-context.tsx (UPDATED with wallet integration)
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { decodeJWT } from "@/lib/auth-helpers";
import { useWallet } from "@solana/wallet-adapter-react";
import type { JWTPayload } from "@/lib/types";

interface AuthContextType {
  user: JWTPayload | null;
  token: string | null;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  linkWallet: (address: string) => Promise<void>;
  login: (token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<JWTPayload>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "koka_auth_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { publicKey, connect, disconnect } = useWallet();
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Wallet connection effect
  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
      // Auto-link if user exists
      if (user) {
        linkWallet(publicKey.toBase58()).catch(console.error);
      }
    } else {
      setWalletAddress(null);
    }
  }, [publicKey, user]);

  const connectWallet = async () => {
    try {
      await connect();
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  };

  const linkWallet = async (address: string) => {
    if (!token) return;
    const res = await fetch("/api/wallet/link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletAddress: address }),
    });
    if (res.ok) {
      updateUser({ walletAddress: address });
    } else {
      console.error("Wallet link failed");
    }
  };

  // Load token from localStorage or NextAuth session
  useEffect(() => {
    const loadAuth = () => {
      try {
        console.log("Loading auth...");
        console.log("NextAuth status:", status);
        console.log("NextAuth session:", session ? "exists" : "null");

        if (typeof window === "undefined") {
          setIsLoading(false);
          return;
        }

        // First, check for NextAuth session
        if (session?.customToken && status === "authenticated") {
          console.log("✅ Found NextAuth session");
          console.log(
            "Custom token from session:",
            session.customToken.substring(0, 20) + "..."
          );

          // Decode the custom token
          const decoded = decodeJWT(session.customToken) as JWTPayload | null;

          if (decoded) {
            console.log("✅ NextAuth token decoded successfully");
            console.log("User from NextAuth:", decoded);
            setToken(session.customToken);
            setUser(decoded);
            localStorage.setItem(TOKEN_KEY, session.customToken);
            setIsLoading(false);
            return;
          }
        }

        // If no NextAuth session, check localStorage
        const savedToken = localStorage.getItem(TOKEN_KEY);

        if (!savedToken) {
          console.log("No saved token found");
          if (status === "unauthenticated") {
            setIsLoading(false);
          }
          return;
        }

        console.log("Found saved token:", savedToken.substring(0, 20) + "...");

        // Decode and verify token
        const decoded = decodeJWT(savedToken) as JWTPayload | null;

        if (!decoded) {
          console.log("Token is invalid or expired");
          localStorage.removeItem(TOKEN_KEY);
          setIsLoading(false);
          return;
        }

        console.log(
          "✅ Token is valid, user:",
          decoded.username || decoded.email
        );
        setToken(savedToken);
        setUser(decoded);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading auth:", error);
        localStorage.removeItem(TOKEN_KEY);
        setIsLoading(false);
      }
    };

    // Only load auth when NextAuth status is determined or immediately if no session
    if (status !== "loading") {
      loadAuth();
    } else if (!session && status === "loading") {
      // If NextAuth is still loading but we might have a localStorage token, check it
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        const decoded = decodeJWT(savedToken) as JWTPayload | null;
        if (decoded) {
          setToken(savedToken);
          setUser(decoded);
        }
      }
      setIsLoading(false);
    }
  }, [session, status]);

  const login = (newToken: string) => {
    try {
      console.log("=== AUTH CONTEXT: Login called ===");
      console.log("Token received:", newToken.substring(0, 30) + "...");

      if (!newToken) {
        throw new Error("No token provided");
      }

      // Decode token to get user data
      const decoded = decodeJWT(newToken) as JWTPayload | null;

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

  const logout = async () => {
    console.log("Logout called");

    setToken(null);
    setUser(null);
    setWalletAddress(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      console.log("Token removed from localStorage");
    }

    // If user was signed in with NextAuth (Google), sign them out
    if (session) {
      console.log("Signing out from NextAuth...");
      await nextAuthSignOut({ redirect: false });
    }

    // Disconnect wallet
    disconnect();

    router.push("/app/login");
  };

  const updateUser = (updates: Partial<JWTPayload>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  };

  const value: AuthContextType = {
    user,
    token,
    walletAddress,
    connectWallet,
    linkWallet,
    login,
    logout,
    updateUser,
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
