import bs58 from "bs58"; // NEW: For encoding signatures

export function isPhantomInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).solana && !!(window as any).solana.isPhantom;
}

export async function connectPhantomWallet(): Promise<string | null> {
  if (typeof window === "undefined" || !isPhantomInstalled()) {
    return null;
  }

  try {
    const provider = (window as any).solana;
    await provider.connect();
    return provider.publicKey.toString();
  } catch (err) {
    console.error("Failed to connect Phantom:", err);
    return null;
  }
}

export async function signMessageWithPhantom(
  message: string
): Promise<string | null> {
  if (typeof window === "undefined" || !isPhantomInstalled()) {
    return null;
  }

  try {
    const provider = (window as any).solana;
    const messageBytes = new TextEncoder().encode(message);
    const signedMessage = await provider.signMessage(messageBytes);
    return bs58.encode(signedMessage); // Encode to base58 string
  } catch (err) {
    console.error("Failed to sign message with Phantom:", err);
    return null;
  }
}
