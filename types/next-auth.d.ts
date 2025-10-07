// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      isAdmin?: boolean;
      walletAddress?: string;
    } & DefaultSession["user"];
    customToken?: string;
  }

  interface User extends DefaultUser {
    isAdmin?: boolean;
    walletAddress?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    isAdmin?: boolean;
    walletAddress?: string;
    customToken?: string;
  }
}
