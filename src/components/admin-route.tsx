"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context"; // Fixed import

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth(); // Fixed: Use 'loading' from context

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      router.push("/app/login");
    } else if (!user.isAdmin) {
      router.push("/app/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null; // Or a loading spinner/error
  }

  return <>{children}</>;
}
