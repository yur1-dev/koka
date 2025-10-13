"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function AppPage() {
  const { user, isLoading } = useAuth(); // FIXED: Changed 'loading' to 'isLoading'
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // FIXED: Changed 'loading' to 'isLoading'
      if (user) {
        router.push("/app/dashboard");
      } else {
        router.push("/app/login");
      }
    }
  }, [user, isLoading, router]); // FIXED: Changed 'loading' to 'isLoading'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
