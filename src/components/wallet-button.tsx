"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isPhantomInstalled } from "@/lib/phantom-wallet";

interface WalletButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

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
