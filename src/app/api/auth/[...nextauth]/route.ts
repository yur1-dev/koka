// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import TwitterProvider from "next-auth/providers/twitter";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { handlers } = NextAuth({
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
            // User will be created automatically by PrismaAdapter
            return true;
          }
          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      // For Twitter and Discord, PrismaAdapter will handle user creation/update
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id as string;

        // Fetch full user data to get additional fields
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
        });

        if (dbUser) {
          token.name = dbUser.name ?? (user.name as string | undefined);
          token.image = dbUser.image ?? (user.image as string | undefined);
          token.isAdmin = dbUser.isAdmin ?? false;
          token.walletAddress = dbUser.walletAddress ?? undefined;
          token.email = dbUser.email ?? (user.email as string) ?? "";
        } else {
          token.name = user.name as string | undefined;
          token.image = user.image as string | undefined;
          token.email = (user.email as string) ?? "";
        }

        // Generate custom JWT token for your API
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

      // Handle provider-specific data
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
        session.user.name = token.name as string | undefined;
        session.user.image = token.image as string | undefined;
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

export const { GET, POST } = handlers;
