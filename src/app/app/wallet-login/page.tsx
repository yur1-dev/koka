"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  isPhantomInstalled,
  connectPhantomWallet,
  signMessageWithPhantom,
} from "@/lib/phantom-wallet";

export default function WalletLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phantomInstalled, setPhantomInstalled] = useState(false);

  useEffect(() => {
    setPhantomInstalled(isPhantomInstalled());
  }, []);

  const handlePhantomLogin = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Connect to Phantom wallet
      const walletAddress = await connectPhantomWallet();

      if (!walletAddress) {
        setError("Failed to connect to Phantom wallet");
        setIsLoading(false);
        return;
      }

      // Request nonce from server
      const nonceResponse = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const nonceData = await nonceResponse.json();

      if (!nonceData.success) {
        setError(nonceData.message || "Failed to get nonce");
        setIsLoading(false);
        return;
      }

      // Sign the message with Phantom
      const signature = await signMessageWithPhantom(nonceData.message);

      if (!signature) {
        setError("Failed to sign message");
        setIsLoading(false);
        return;
      }

      // Verify signature with server
      const verifyResponse = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          signature,
          nonce: nonceData.nonce,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success && verifyData.token) {
        login(verifyData.token);
        router.push("/app/dashboard");
      } else {
        setError(verifyData.message || "Verification failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Wallet login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Image
              src="/koka-logo.png" // Fixed: Use your logo or add phantom-logo.png
              alt="KŌKA Wallet Login"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Connect Wallet
          </CardTitle>
          <CardDescription className="text-base">
            Sign in with your Phantom wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!phantomInstalled ? (
            <Alert>
              <AlertDescription className="space-y-2">
                <p>Phantom wallet is not installed.</p>
                <Button
                  asChild
                  variant="link"
                  className="p-0 h-auto text-primary hover:text-primary/80"
                  onClick={() => window.open("https://phantom.app/", "_blank")}
                >
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Install Phantom Wallet
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Button
              onClick={handlePhantomLogin}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Connecting..." : "Connect Phantom Wallet"}
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/app/login">Sign in with Username</Link>
            </Button>
          </div>
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
        </CardFooter>
      </Card>
    </div>
  );
}
