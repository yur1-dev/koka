// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

// ============================================
// HELPER: Grant Starter Pack to New Users
// ============================================
async function grantStarterPack(userId: string) {
  try {
    console.log(`🎁 Granting starter pack to user ${userId}...`);

    // Get common/uncommon collectibles for starter pack
    const starterCollectibles = await prisma.collectible.findMany({
      where: {
        rarity: {
          in: ["common", "uncommon"],
        },
      },
      take: 3, // Give 3 starter collectibles
      orderBy: {
        rarity: "asc", // Start with common items
      },
    });

    if (starterCollectibles.length === 0) {
      console.warn("⚠️ No collectibles available for starter pack");
      return;
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Create inventory items for each starter collectible
      for (const collectible of starterCollectibles) {
        await tx.inventoryItem.create({
          data: {
            userId,
            collectibleId: collectible.id,
            quantity: 1,
            isClaimed: true,
            receivedVia: "starter-pack",
          },
        });

        // Update collectible supply
        await tx.collectible.update({
          where: { id: collectible.id },
          data: {
            currentSupply: {
              increment: 1,
            },
          },
        });
      }

      // Mark user as having claimed starter pack
      await tx.user.update({
        where: { id: userId },
        data: {
          hasClaimedStarter: true,
        },
      });
    });

    console.log(
      `✅ Successfully granted ${starterCollectibles.length} collectibles to user ${userId}`
    );
    console.log(
      `   Collectibles: ${starterCollectibles.map((c) => c.name).join(", ")}`
    );
  } catch (error) {
    console.error("❌ Failed to grant starter pack:", error);
    // Don't throw - user account should still be created even if starter pack fails
  }
}

// ============================================
// NEXTAUTH CONFIGURATION
// ============================================
const { handlers } = NextAuth({
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
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email", optional: true },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text", optional: true }, // 'signup' or 'login'
        whitelistData: {
          label: "Whitelist Data",
          type: "json",
          optional: true,
        },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          throw new Error("Password required");
        }

        const username = credentials.username as string;
        const email = credentials.email as string | undefined;
        const password = credentials.password as string;
        const action =
          (credentials.action as string) === "signup" ? "signup" : "login";
        const whitelistDataRaw = credentials.whitelistData as
          | string
          | undefined;

        try {
          let dbUser;

          if (action === "login") {
            // ============================================
            // LOGIN FLOW
            // ============================================
            const orConditions: any[] = [{ username }];
            if (email) {
              orConditions.push({ email });
            }
            dbUser = await prisma.user.findFirst({
              where: {
                OR: orConditions,
              },
              select: {
                id: true,
                email: true,
                username: true,
                password: true,
                name: true,
                image: true,
                isAdmin: true,
                walletAddress: true,
              },
            });

            if (
              !dbUser ||
              !dbUser.password ||
              !(await bcrypt.compare(password, dbUser.password))
            ) {
              throw new Error("Invalid credentials");
            }
          } else {
            // ============================================
            // SIGNUP FLOW
            // ============================================
            if (!email) {
              throw new Error("Email is required for signup");
            }

            // Check if user already exists
            const existing = await prisma.user.findFirst({
              where: {
                OR: [{ email }, { username }],
              },
            });

            if (existing) {
              throw new Error("User already exists");
            }

            // Whitelist validation
            let whitelistData = null;
            let isFounder = false;

            if (whitelistDataRaw) {
              try {
                whitelistData = JSON.parse(whitelistDataRaw);
                isFounder = true;

                // Check whitelist spots
                const spotsResponse = await fetch(
                  `${
                    process.env.NEXTAUTH_URL || "http://localhost:3000"
                  }/api/whitelist/status`
                );
                const spotsData = await spotsResponse.json();

                if (!spotsData.success || spotsData.spotsRemaining <= 0) {
                  throw new Error("Whitelist is full - no spots remaining");
                }
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message.includes("Whitelist is full")
                ) {
                  throw error;
                }
                throw new Error("Invalid whitelist data format");
              }
            }

            // Generate unique accountNumber
            const maxAccount = await prisma.user.aggregate({
              _max: { accountNumber: true },
            });
            const nextAccountNumber = (maxAccount._max.accountNumber ?? 0) + 1;

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create new user
            dbUser = await prisma.user.create({
              data: {
                email,
                username,
                password: hashedPassword,
                name: whitelistData?.fullName || username, // Use fullName from whitelist if available
                image: undefined,
                isAdmin: false,
                accountNumber: nextAccountNumber,
                points: 100, // Starting points
                hasClaimedStarter: false, // Will be set to true after granting starter pack
                hasReceivedAirdrop: false,
                whitelistData: whitelistData,
                isFounder: isFounder,
              },
              select: {
                id: true,
                email: true,
                username: true,
                name: true,
                image: true,
                isAdmin: true,
                walletAddress: true,
              },
            });

            console.log(
              `✅ Created new user: ${dbUser.username} (ID: ${dbUser.id})`
            );

            // ============================================
            // GRANT STARTER PACK FOR WHITELISTED USERS
            // ============================================
            if (isFounder && whitelistData) {
              console.log(`🎁 User is a founder - granting starter pack...`);
              await grantStarterPack(dbUser.id);
            }
          }

          if (!dbUser) {
            throw new Error("User not found");
          }

          // Return user for JWT/session
          return {
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username ?? undefined,
            name: dbUser.name ?? undefined,
            image: dbUser.image ?? undefined,
            isAdmin: dbUser.isAdmin,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error(
            error instanceof Error ? error.message : "Authentication failed"
          );
        }
      },
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
            console.error("No email from Google");
            return false;
          }

          const generatedUsername =
            user.name ?? user.email.split("@")[0] ?? undefined;

          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
            // Generate unique accountNumber
            const maxAccount = await prisma.user.aggregate({
              _max: { accountNumber: true },
            });
            const nextAccountNumber = (maxAccount._max.accountNumber ?? 0) + 1;

            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name ?? undefined,
                image: user.image ?? undefined,
                username: generatedUsername,
                isAdmin: false,
                accountNumber: nextAccountNumber,
                points: 100,
              },
            });

            // Optional: Grant starter pack to Google sign-ups too
            // await grantStarterPack(dbUser.id);
          }

          // Update user object for callbacks
          Object.assign(user, {
            id: dbUser.id,
            username: dbUser.username ?? generatedUsername,
            isAdmin: dbUser.isAdmin,
          });

          return true;
        } catch (error) {
          console.error("SignIn error:", error);
          return false;
        }
      }
      if (account?.provider === "credentials") {
        return true; // authorize() already succeeded
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.email = user.email ?? "";
        token.name = (user as any).name ?? undefined;
        token.image = (user as any).image ?? undefined;
        token.username = (user as any).username ?? undefined;
        token.isAdmin = (user as any).isAdmin ?? false;
      }

      // Fetch dbUser and add/update fields
      let dbUser;
      if (token.id) {
        dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        });
      } else if (token.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });
        if (dbUser) {
          token.id = dbUser.id;
        }
      }

      if (dbUser) {
        token.username = dbUser.username ?? undefined;
        token.isAdmin = dbUser.isAdmin;
        token.walletAddress = dbUser.walletAddress ?? undefined;
      }

      // Custom JWT
      const jwtSecret = process.env.JWT_SECRET!;
      if (jwtSecret && token.email) {
        const customToken = jwt.sign(
          {
            userId: token.id as string,
            email: token.email as string,
            isAdmin: (token.isAdmin as boolean) || false,
          },
          jwtSecret,
          { expiresIn: "30d" }
        );
        token.customToken = customToken;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name ?? undefined;
        session.user.image = token.image ?? undefined;
        session.user.username = token.username ?? undefined;
        session.user.isAdmin = (token.isAdmin as boolean) || false;
        session.user.walletAddress = token.walletAddress ?? undefined;
        session.customToken = token.customToken ?? undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});

export const { GET, POST } = handlers;
