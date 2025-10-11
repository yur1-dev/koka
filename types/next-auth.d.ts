// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      walletAddress?: string;
    } & DefaultSession["user"];
    customToken?: string;
    accessToken?: string;
    twitterId?: string;
    twitterHandle?: string;
    discordId?: string;
  }

  interface User {
    isAdmin?: boolean;
    walletAddress?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    walletAddress?: string;
    customToken?: string;
    accessToken?: string;
    twitterId?: string;
    twitterHandle?: string;
    discordId?: string;
  }
}
