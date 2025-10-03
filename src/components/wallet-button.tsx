"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic"; // Add for lazy loading if needed

interface WalletButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

// Move isPhantomInstalled here if not in lib (or guard lib call)
const isPhantomInstalled = (): boolean => {
  if (typeof window === "undefined") return false; // SSR guard
  const { phantom } = window as any;
  return !!phantom?.isPhantom;
};

export function WalletButton({
  onClick,
  isLoading = false,
}: WalletButtonProps) {
  const [phantomInstalled, setPhantomInstalled] = useState(false);

  useEffect(() => {
    setPhantomInstalled(isPhantomInstalled());
  }, []);

  if (!phantomInstalled) {
    return (
      <Button
        asChild
        variant="outline"
        className="border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59]/10 bg-transparent"
        onClick={() => window.open("https://phantom.app/", "_blank")}
      >
        <a
          href="https://phantom.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Phantom
        </a>
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className="bg-[#4A7C59] hover:bg-[#3d6649]"
    >
      {isLoading ? "Connecting..." : "Connect Phantom"}
    </Button>
  );
}

// Export dynamic version for usage elsewhere
export const DynamicWalletButton = dynamic(
  () => Promise.resolve(WalletButton),
  { ssr: false }
);
