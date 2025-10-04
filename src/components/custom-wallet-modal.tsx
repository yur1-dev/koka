"use client";

import { useState, useEffect } from "react";
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
import { Wallet, CheckCircle, Copy, ExternalLink, X } from "lucide-react";
import Image from "next/image";
import {
  isPhantomInstalled,
  connectPhantomWallet,
  disconnectPhantomWallet,
  getPhantomPublicKey,
} from "@/lib/phantom-wallet";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

interface CustomWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomWalletModal({ isOpen, onClose }: CustomWalletModalProps) {
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPhantomDetected, setIsPhantomDetected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch balance from Solana
  const fetchBalance = async (address: string) => {
    setIsLoadingBalance(true);
    try {
      const connection = new Connection("https://api.devnet.solana.com");
      const publicKey = new PublicKey(address);
      const balanceInLamports = await connection.getBalance(publicKey);
      setBalance(balanceInLamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Check wallet connection status when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsPhantomDetected(isPhantomInstalled());
      const pubKey = getPhantomPublicKey();
      setWalletAddress(pubKey);

      if (pubKey) {
        fetchBalance(pubKey);
      }
    }
  }, [isOpen]);

  // Listen for wallet changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).solana) {
      const handleConnect = () => {
        const pubKey = getPhantomPublicKey();
        setWalletAddress(pubKey);
        if (pubKey) fetchBalance(pubKey);
      };

      const handleDisconnect = () => {
        setWalletAddress(null);
        setBalance(null);
      };

      (window as any).solana.on("connect", handleConnect);
      (window as any).solana.on("disconnect", handleDisconnect);
      (window as any).solana.on("accountChanged", handleConnect);

      return () => {
        (window as any).solana.off("connect", handleConnect);
        (window as any).solana.off("disconnect", handleDisconnect);
        (window as any).solana.off("accountChanged", handleConnect);
      };
    }
  }, []);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setError("");
    setIsConnecting(true);

    try {
      const address = await connectPhantomWallet();

      if (address) {
        setWalletAddress(address);
        await fetchBalance(address);
      } else {
        setError("Failed to connect to Phantom wallet");
      }
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.message || "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPhantomWallet();
      setWalletAddress(null);
      setBalance(null);
      onClose();
    } catch (err: any) {
      console.error("Disconnect error:", err);
      setError(err.message || "Disconnect failed");
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewOnExplorer = () => {
    if (walletAddress) {
      window.open(
        `https://solscan.io/account/${walletAddress}?cluster=devnet`,
        "_blank"
      );
    }
  };

  const isConnected = !!walletAddress;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-md shadow-2xl border-primary/20 animate-in zoom-in-95 duration-300">
        <CardHeader className="space-y-4 text-center pb-4 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex justify-center">
            <div className="relative">
              <Image
                src="/koka-logo.png"
                alt="KŌKA"
                width={80}
                height={80}
                className="object-contain"
              />
              {isConnected && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 animate-in zoom-in duration-200">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-primary cursor-pointer">
              {isConnected ? "Wallet Connected" : "Connect Wallet"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isConnected
                ? "Your KŌKA account is secured with Solana"
                : "Secure your KŌKA account on Solana"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert
              variant="destructive"
              className="animate-in slide-in-from-top duration-300"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isConnected ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
              {/* Success message */}
              <Alert className="bg-green-500/10 border-green-500/50">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-500 font-medium">
                  Successfully connected to Phantom!
                </AlertDescription>
              </Alert>

              {/* Wallet Info Card */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-center gap-2 pb-2 border-b border-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    Phantom Wallet
                  </span>
                </div>

                {/* Wallet Address */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Wallet Address
                  </p>
                  <div className="flex items-center gap-2 bg-background border border-primary/10 rounded-md p-3">
                    <code className="flex-1 text-xs font-mono text-foreground">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={handleCopyAddress}
                      title="Copy address"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={handleViewOnExplorer}
                      title="View on Solscan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Balance */}
                <div className="space-y-2 pt-2 border-t border-primary/10">
                  <p className="text-xs font-medium text-muted-foreground">
                    Balance
                  </p>
                  {isLoadingBalance ? (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-primary">
                      {balance?.toFixed(4) || "0.0000"} SOL
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">on Devnet</p>
                </div>
              </div>

              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive cursor-pointer"
              >
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleConnect}
                className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={isConnecting || !isPhantomDetected}
                size="lg"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 cursor-pointer">
                    <Wallet className="h-5 w-5" />
                    Connect Phantom Wallet
                  </span>
                )}
              </Button>

              {/* Install Phantom Link */}
              {!isPhantomDetected ? (
                <Alert>
                  <AlertDescription className="text-center text-sm">
                    Phantom wallet not detected.{" "}
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Install it here
                    </a>
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Click above to connect your Phantom wallet securely
                </p>
              )}
            </div>
          )}
        </CardContent>

        {!isConnected && (
          <CardFooter className="flex flex-col space-y-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
