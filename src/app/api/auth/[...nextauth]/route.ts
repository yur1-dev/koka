export const runtime = "nodejs";

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

// ============================================
// HELPER: Verify X Follow (New: Real API check for @koka)
// ============================================
async function verifyFollowsXAccount(
  xHandle: string,
  targetUsername: string = "koka"
): Promise<boolean> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn("⚠️ X_BEARER_TOKEN missing - skipping follow verification");
    return false; // No bonus if no token
  }

  try {
    // Step 1: Get source user ID from @handle (remove @)
    const cleanHandle = xHandle.trim().slice(1);
    if (!cleanHandle) return false;

    console.log(`🔍 Verifying X follow: @${cleanHandle} → @${targetUsername}`);
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanHandle}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!userRes.ok) {
      console.warn(
        `❌ X user lookup failed for @${cleanHandle}: ${userRes.status}`
      );
      return false;
    }

    const userData = await userRes.json();
    const sourceId = userData.data?.id;
    if (!sourceId) {
      console.warn(`❌ X user not found: @${cleanHandle}`);
      return false;
    }

    // Step 2: Fetch following list (paginated) and check for @koka
    let followsTarget = false;
    let nextToken: string | null = null;
    do {
      const params = new URLSearchParams({
        "user.fields": "username",
        max_results: "1000", // Max per page
      });
      if (nextToken) params.append("pagination_token", nextToken);

      const followRes = await fetch(
        `https://api.twitter.com/2/users/${sourceId}/following?${params.toString()}`
      );
      if (!followRes.ok) {
        console.warn(`❌ X following fetch failed: ${followRes.status}`);
        break;
      }

      const followData = await followRes.json();
      const followingUsernames =
        followData.data?.map((u: any) => u.username.toLowerCase()) || [];
      if (followingUsernames.includes(targetUsername.toLowerCase())) {
        followsTarget = true;
        break;
      }

      nextToken = followData.meta?.next_token;
    } while (nextToken && !followsTarget);

    console.log(
      `✅ X follow check: @${cleanHandle} ${
        followsTarget ? "FOLLOWS" : "does NOT follow"
      } @${targetUsername}`
    );
    return followsTarget;
  } catch (error) {
    console.error("❌ X verification error:", error);
    return false; // Fail safe: No bonus on error
  }
}

// ============================================
// UPDATED: Grant Starter Pack (1 base +1 X bonus if verified, cap 2)
// ============================================
async function grantStarterPack(userId: string, whitelistData?: any) {
  try {
    console.log(
      `🎁 Granting starter pack to user ${userId}... X Handle: ${
        whitelistData?.xHandle || "none"
      }`
    );

    // Fetch available common/uncommon for random picks
    const availableCollectibles = await prisma.collectible.findMany({
      where: {
        rarity: { in: ["common", "uncommon"] },
        currentSupply: { lt: prisma.collectible.fields.maxSupply ?? 999999 }, // Avoid exhausted
      },
      take: 10, // For randomness
      select: { id: true, name: true, rarity: true },
    });

    if (availableCollectibles.length === 0) {
      console.warn("⚠️ No collectibles available for starter pack");
      return 0;
    }

    let cardsGranted = 0;
    let xBonus = false;

    // Atomic transaction
    await prisma.$transaction(async (tx) => {
      // Base: Always 1 random card for whitelist
      const baseIndex = Math.floor(
        Math.random() * availableCollectibles.length
      );
      const baseCollectible = availableCollectibles[baseIndex];
      await tx.inventoryItem.create({
        data: {
          userId,
          collectibleId: baseCollectible.id,
          quantity: 1,
          isClaimed: true,
          receivedVia: "starter-pack",
        },
      });
      await tx.collectible.update({
        where: { id: baseCollectible.id },
        data: { currentSupply: { increment: 1 } },
      });
      cardsGranted = 1;
      console.log(`✅ Base card granted: ${baseCollectible.name}`);

      // X Bonus: Verify follow, then +1 if true
      if (
        whitelistData?.xHandle &&
        whitelistData.xHandle.trim().startsWith("@")
      ) {
        const follows = await verifyFollowsXAccount(whitelistData.xHandle);
        if (follows) {
          const bonusIndex = Math.floor(
            Math.random() * availableCollectibles.length
          );
          const bonusCollectible = availableCollectibles[bonusIndex];
          await tx.inventoryItem.create({
            data: {
              userId,
              collectibleId: bonusCollectible.id,
              quantity: 1,
              isClaimed: true,
              receivedVia: "x-bonus", // Renamed from twitter-bonus
            },
          });
          await tx.collectible.update({
            where: { id: bonusCollectible.id },
            data: { currentSupply: { increment: 1 } },
          });
          cardsGranted = 2;
          xBonus = true;
          console.log(`✅ X bonus granted: ${bonusCollectible.name}`);
        } else {
          console.log("ℹ️ No X follow verified - skipping bonus");
        }
      } else {
        console.log("ℹ️ No valid X handle provided - skipping bonus");
      }

      // Mark as claimed
      await tx.user.update({
        where: { id: userId },
        data: { hasClaimedStarter: true },
      });
    });

    console.log(
      `✅ Total cards granted to ${userId}: ${cardsGranted} ${
        xBonus ? "(with X bonus)" : ""
      }`
    );
    return cardsGranted;
  } catch (error) {
    console.error("❌ Starter pack grant failed:", error);
    return 0; // User still created
  }
}

// ============================================
// NEXTAUTH CONFIG (Rest unchanged, just integrated above)
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
            // LOGIN FLOW (unchanged)
            const orConditions: any[] = [{ username }];
            if (email) {
              orConditions.push({ email });
            }
            dbUser = await prisma.user.findFirst({
              where: { OR: orConditions },
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
            // SIGNUP FLOW (Updated: Renamed twitter → xHandle, integrated grant)
            if (!email) {
              throw new Error("Email is required for signup");
            }

            // Check existing
            const existing = await prisma.user.findFirst({
              where: { OR: [{ email }, { username }] },
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
                // Renamed for X
                if (whitelistData.twitter) {
                  whitelistData.xHandle = whitelistData.twitter;
                  delete whitelistData.twitter; // Clean up old key
                }
                isFounder = true;

                // Spots check (unchanged)
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

            // Generate accountNumber
            const maxAccount = await prisma.user.aggregate({
              _max: { accountNumber: true },
            });
            const nextAccountNumber = (maxAccount._max.accountNumber ?? 0) + 1;

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            dbUser = await prisma.user.create({
              data: {
                email,
                username,
                password: hashedPassword,
                name: whitelistData?.fullName || username,
                image: undefined,
                isAdmin: false,
                accountNumber: nextAccountNumber,
                points: 100,
                hasClaimedStarter: false,
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

            // Grant starter pack (now conditional + verified)
            if (isFounder && whitelistData) {
              console.log(
                `🎁 Founder detected - granting conditional starter pack...`
              );
              const granted = await grantStarterPack(dbUser.id, whitelistData);
              if (granted > 0) {
                console.log(
                  `Granted ${granted} cards (base ${1} + X bonus ${
                    granted === 2 ? "yes" : "no"
                  })`
                );
              }
            }
          }

          if (!dbUser) {
            throw new Error("User not found");
          }

          // Return for session
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
            // Generate accountNumber
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

            // No starter for Google (as before)
          }

          // Update user for callbacks
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
        return true; // authorize() succeeded
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

      // Fetch/update from DB
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
