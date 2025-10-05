"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    console.log("=== LOGIN ATTEMPT ===");
    console.log("Username:", username);
    console.log("Password length:", password.length);
    console.log("Current URL:", window.location.href);

    try {
      const apiUrl = "/api/auth/login";
      console.log("Sending request to:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });

      console.log("Response received:");
      console.log("- Status:", response.status);
      console.log("- OK:", response.ok);
      console.log("- Headers:", Object.fromEntries(response.headers.entries()));

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      let data;
      const contentType = response.headers.get("content-type");
      console.log("Content-Type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log("Response data:", data);
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }

      if (data.success && data.token) {
        console.log("Login successful, redirecting...");
        login(data.token);
        router.push("/app/dashboard");
      } else {
        console.error("Login failed:", data.message);
        setError(data.message || "Login failed");

        // Show detailed error in development
        if (data.error && process.env.NODE_ENV === "development") {
          console.error("Detailed error:", data.error);
          setError(`${data.message || "Login failed"}\n${data.error}`);
        }
      }
    } catch (err) {
      console.error("=== LOGIN ERROR ===");
      console.error("Error type:", err?.constructor?.name);
      console.error(
        "Error message:",
        err instanceof Error ? err.message : String(err)
      );
      console.error("Full error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center rounded-full">
            <Image
              src="/koka-logo.png"
              alt="KŌKA Logo"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to your KŌKA account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-wrap">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/app/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
          <div className="text-sm text-center text-muted-foreground">
            Or continue with{" "}
            <Link
              href="/app/wallet-login"
              className="text-primary hover:underline font-medium"
            >
              Phantom Wallet
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
