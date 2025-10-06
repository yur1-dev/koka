"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

// Import styles (add to globals.css if not already: @import '@solana/wallet-adapter-react-ui/styles.css';)
import "@solana/wallet-adapter-react-ui/styles.css";

export default function SolanaProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = clusterApiUrl("devnet"); // Change to 'mainnet-beta' for production
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || network;

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
