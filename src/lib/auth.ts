// src/auth.ts (UPDATED: Added verifyToken export for API auth verification)
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import TwitterProvider from "next-auth/providers/twitter";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Existing encodeJWT...
export function encodeJWT(payload: {
  userId: string;
  username: string;
  isAdmin: boolean;
}): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.sign(payload, jwtSecret, { expiresIn: "30d" });
}

export async function encodeJWTAsync(payload: {
  userId: string;
  username: string;
  isAdmin: boolean;
}): Promise<string> {
  return encodeJWT(payload);
}

// NEW: verifyToken for API routes (returns payload or null)
export function verifyToken(
  token: string
): { userId: string; username: string; isAdmin: boolean } | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  try {
    return jwt.verify(token, jwtSecret) as {
      userId: string;
      username: string;
      isAdmin: boolean;
    };
  } catch (err) {
    return null;
  }
}

// Optional async wrapper
export async function verifyTokenAsync(
  token: string
): Promise<{ userId: string; username: string; isAdmin: boolean } | null> {
  return verifyToken(token);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        try {
          const user = await prisma.user.findFirst({
            where: {
              email: username,
            },
          });

          if (!user || !user.password) {
            throw new Error("No user found");
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (isValid) {
            return {
              id: user.id,
              email: user.email || "",
              name: user.name || "",
              image: user.image || undefined,
            };
          }

          throw new Error("Invalid password");
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error("Authentication failed");
        }
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET!,
  pages: {
    signIn: "/app/login",
    error: "/app/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          if (!user.email) {
            console.error("No email provided by Google");
            return false;
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            return true;
          }
          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id as string;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
        });

        if (dbUser) {
          token.isAdmin = dbUser.isAdmin ?? false;
          token.walletAddress = dbUser.walletAddress ?? undefined;
          token.email = dbUser.email ?? (user.email as string) ?? "";
        } else {
          token.email = (user.email as string) ?? "";
        }

        const jwtSecret = process.env.JWT_SECRET!;
        if (jwtSecret) {
          const customToken = jwt.sign(
            {
              userId: user.id,
              email: token.email,
              isAdmin: token.isAdmin as boolean,
            },
            jwtSecret,
            { expiresIn: "30d" }
          );
          token.customToken = customToken;
        }
      }

      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (account?.provider === "twitter" && profile) {
        token.twitterId = (profile as { id: string }).id || "";
        token.twitterHandle = (profile as { username?: string }).username || "";
      }
      if (account?.provider === "discord" && profile) {
        token.discordId = (profile as { id: string }).id || "";
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.walletAddress = token.walletAddress as string | undefined;
        session.user.email = token.email as string;
        session.customToken = token.customToken as string | undefined;
        session.accessToken = token.accessToken as string | undefined;
        session.twitterId = token.twitterId as string | undefined;
        session.twitterHandle = token.twitterHandle as string | undefined;
        session.discordId = token.discordId as string | undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
