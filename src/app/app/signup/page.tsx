// app/signup/page.tsx
"use client";

import type React from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
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
import { Eye, EyeOff, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const passwordRequirements = useMemo((): PasswordRequirement[] => {
    return [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
      { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
      { label: "Contains a number", met: /\d/.test(password) },
      {
        label: "Contains special character (!@#$%^&*)",
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ];
  }, [password]);

  const isPasswordValid = passwordRequirements.every((req) => req.met);
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError("");

    try {
      await signIn("google", {
        callbackUrl: "/app/dashboard",
        redirect: true,
      });
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("An error occurred during Google sign-in");
      setIsGoogleLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    setOtpError("");
    setOtp("");

    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "signup" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error);
        return;
      }

      setMessage("Code resent successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setOtpError("Failed to resend code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    console.log("🔥 SUBMIT FIRED - Starting validation...");

    if (!isPasswordValid) {
      console.log("❌ Password invalid");
      setError("Please meet all password requirements");
      return;
    }

    if (password !== confirmPassword) {
      console.log("❌ Passwords mismatch");
      setError("Passwords do not match");
      return;
    }

    if (username.length < 3) {
      console.log("❌ Username too short:", username.length);
      setError("Username must be at least 3 characters");
      return;
    }

    if (!email) {
      console.log("❌ No email");
      setError("Email is required");
      return;
    }

    console.log("✅ All validations passed - Fetching OTP...");

    setIsLoading(true);

    try {
      console.log("🚀 Fetching /api/otp/send with body:", {
        email,
        action: "signup",
      });
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "signup" }),
      });
      const data = await res.json();
      console.log("📥 Fetch response:", {
        ok: res.ok,
        status: res.status,
        data,
      });

      if (!res.ok) {
        console.log("❌ API error:", data.error);
        setError(data.error);
        return;
      }

      console.log("✅ OTP sent - Opening modal");
      setShowOtpModal(true);
      setMessage(`Verification code sent to ${email}`);
    } catch (err) {
      console.error("Signup fetch error:", err);
      setError("An error occurred. Please try again.");
      console.error("Full error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setMessage("");

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    setOtpLoading(true);

    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          action: "signup",
          username,
          password, // Passed to /api/otp/verify for creation
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error);
        return;
      }

      // Complete sign-in with NextAuth using the real password (not "dummy")
      const result = await signIn("credentials", {
        username,
        email,
        password, // ← CHANGE: Use real password
        action: "otp-login",
        token: data.token,
        redirect: false,
        callbackUrl: "/app/dashboard",
      });

      if (result?.ok && data.user) {
        setShowOtpModal(false);
        router.push("/app/dashboard");
        router.refresh();
      } else {
        setOtpError(result?.error || "Failed to complete sign-up");
      }
    } catch (err) {
      setOtpError("An error occurred. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setOtpLoading(false);
    }
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setOtp("");
    setOtpError("");
    setMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Image
              src="/koka-logo.png"
              alt="KŌKA Logo"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Join KŌKA
          </CardTitle>
          <CardDescription className="text-base">
            Create your account to start collecting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Signing up with Google...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </div>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isGoogleLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isGoogleLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  disabled={isGoogleLoading}
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
              {password.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 ${
                        req.met ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {req.met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  required
                  disabled={isGoogleLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div
                  className={`text-xs flex items-center gap-2 ${
                    passwordsMatch ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {passwordsMatch ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  <span>
                    {passwordsMatch
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={
                isLoading ||
                !isPasswordValid ||
                !passwordsMatch ||
                !username ||
                !email ||
                isGoogleLoading
              }
            >
              {isLoading ? "Sending code..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/app/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* OTP Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Email</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to {email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {otpError && (
              <Alert variant="destructive">
                <AlertDescription>{otpError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                required
                disabled={otpLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={otpLoading || otp.length !== 6}
            >
              {otpLoading ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="link"
              size="sm"
              onClick={handleResendOtp}
              disabled={otpLoading}
            >
              Resend code
            </Button>
            <Button variant="ghost" size="sm" onClick={closeOtpModal}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
