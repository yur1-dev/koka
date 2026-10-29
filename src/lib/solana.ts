// Shared Solana settings so the browser and the API verify against the same cluster.
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const SOLANA_CLUSTER = "devnet";

export const solscanTx = (signature: string) =>
  `https://solscan.io/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
