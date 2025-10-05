// components/providers/wallet-provider.tsx
"use client";

import { useEffect } from "react";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress the ethereum property redefinition error
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("ethereum") &&
        args[0].includes("defineProperty")
      ) {
        // Suppress this specific error
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}
