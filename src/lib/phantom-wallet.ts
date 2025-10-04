import bs58 from "bs58";

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

    // Phantom returns an object with { signature: Uint8Array, publicKey: PublicKey }
    const signedMessage = await provider.signMessage(messageBytes, "utf8");

    // Extract the signature Uint8Array from the response
    const signature = signedMessage.signature;

    // Encode to base58 string
    return bs58.encode(signature);
  } catch (err) {
    console.error("Failed to sign message with Phantom:", err);
    return null;
  }
}

export async function disconnectPhantomWallet(): Promise<void> {
  if (typeof window === "undefined" || !isPhantomInstalled()) {
    return;
  }

  try {
    const provider = (window as any).solana;
    await provider.disconnect();
  } catch (err) {
    console.error("Failed to disconnect Phantom:", err);
  }
}

export function getPhantomPublicKey(): string | null {
  if (typeof window === "undefined" || !isPhantomInstalled()) {
    return null;
  }

  try {
    const provider = (window as any).solana;
    return provider.publicKey?.toString() || null;
  } catch (err) {
    console.error("Failed to get Phantom public key:", err);
    return null;
  }
}
