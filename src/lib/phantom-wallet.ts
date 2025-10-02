"use client";

// Phantom wallet types and utilities
export interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (
    message: Uint8Array,
    encoding: string
  ) => Promise<{ signature: Uint8Array }>;
  publicKey?: { toString: () => string };
}

// Define window extension type
declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider;
    };
  }
}

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;

  const provider = window.phantom?.solana;

  if (provider?.isPhantom) {
    return provider;
  }

  return null;
}

export function isPhantomInstalled(): boolean {
  return getPhantomProvider() !== null;
}

export async function connectPhantomWallet(): Promise<string | null> {
  const provider = getPhantomProvider();

  if (!provider) {
    return null;
  }

  try {
    const response = await provider.connect();
    return response.publicKey.toString();
  } catch (error) {
    console.error("[v0] Phantom connection error:", error);
    return null;
  }
}

export async function signMessageWithPhantom(
  message: string
): Promise<string | null> {
  const provider = getPhantomProvider();

  if (!provider) {
    return null;
  }

  try {
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await provider.signMessage(encodedMessage, "utf8");
    // Convert signature to base64
    return btoa(String.fromCharCode(...signedMessage.signature));
  } catch (error) {
    console.error("[v0] Phantom signing error:", error);
    return null;
  }
}
