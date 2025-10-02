// TypeScript types for KŌKA platform

export interface User {
  id: string;
  username: string;
  email?: string | null;
  passwordHash?: string | null;
  walletAddress?: string | null;
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
  isAdmin: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
  message?: string;
}
