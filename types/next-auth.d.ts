// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import { DefaultSession } from "next-auth";

type Collectible = {
  id: string;
  name: string;
  rarity: string;
  description?: string;
  imageUrl?: string;
};

type AirdropData = {
  collectible: Collectible | null;
  twitterBonus: { collectible: Collectible | null } | null;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      username?: string;
      isAdmin: boolean;
      walletAddress?: string;
      isFounder: boolean;
      airdrop?: AirdropData;
    } & DefaultSession["user"];
    customToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    username?: string;
    isAdmin: boolean;
    walletAddress?: string;
    isFounder?: boolean;
    airdrop?: AirdropData;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string;
    image?: string;
    username?: string;
    isAdmin: boolean;
    walletAddress?: string;
    isFounder?: boolean;
    airdrop?: AirdropData;
    customToken?: string;
  }
}
