// TypeScript types for KŌKA platform

export interface User {
  id: string;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  passwordHash?: string | null;
  walletAddress?: string | null; // NEW: Wallet address
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
}

export interface WalletNonce {
  id: string;
  walletAddress: string;
  nonce: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  userId?: string | null;
}

export interface Collectible {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  mintAddress?: string | null;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  userId: string;
  collectibleId: string;
  acquiredAt: Date;
  quantity: number;
  collectible?: Collectible;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  walletAddress?: string; // NEW: Wallet address in JWT
  isAdmin: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    avatarUrl?: string;
    walletAddress?: string; // NEW: Wallet address in response
    isAdmin: boolean;
  };
  message?: string;
  error?: string;
  stack?: string;
}
