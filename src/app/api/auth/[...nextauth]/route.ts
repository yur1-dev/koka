import NextAuth, { CredentialsSignin } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getWhitelistStatus } from "@/lib/whitelist";

// Surfaces the real message to the client (result.code) instead of "Configuration"
class AuthFail extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.code = message;
    this.message = message;
  }
}

// ============================================
// Starter pack: 1 card for every founder, 2 if they gave an X handle.
// Cards are picked at random, weighted towards common, and never from a
// series that has run out of supply.
// ============================================
const STARTER_WEIGHTS: Record<string, number> = {
  common: 70,
  uncommon: 25,
  rare: 5,
};

type StarterCandidate = { id: string; name: string; rarity: string };

function pickWeighted(pool: StarterCandidate[]): StarterCandidate {
  const total = pool.reduce((sum, c) => sum + (STARTER_WEIGHTS[c.rarity] ?? 1), 0);
  let roll = Math.random() * total;
  for (const card of pool) {
    roll -= STARTER_WEIGHTS[card.rarity] ?? 1;
    if (roll <= 0) return card;
  }
  return pool[pool.length - 1];
}

async function grantStarterPack(userId: string, whitelistData?: any) {
  try {
    const handle = String(whitelistData?.xHandle ?? "").trim();
    const cardsToGrant = handle.startsWith("@") && handle.length > 1 ? 2 : 1;

    const all = await prisma.collectible.findMany({
      where: { rarity: { in: Object.keys(STARTER_WEIGHTS) } },
      select: {
        id: true,
        name: true,
        rarity: true,
        maxSupply: true,
        currentSupply: true,
      },
    });
    const pool: StarterCandidate[] = all.filter(
      (c) => c.maxSupply == null || c.currentSupply < c.maxSupply
    );

    if (pool.length < cardsToGrant) {
      console.warn(
        `Starter pack: need ${cardsToGrant} cards but only ${pool.length} are available`
      );
      return 0;
    }

    const picks: StarterCandidate[] = [];
    while (picks.length < cardsToGrant) {
      const remaining = pool.filter((c) => !picks.some((p) => p.id === c.id));
      picks.push(pickWeighted(remaining));
    }

    await prisma.$transaction(async (tx) => {
      for (const [i, card] of picks.entries()) {
        await tx.inventoryItem.create({
          data: {
            userId,
            collectibleId: card.id,
            quantity: 1,
            isClaimed: true,
            // The whitelist page filters on these two values
            receivedVia: i === 0 ? "starter-pack" : "x-bonus",
          },
        });
        await tx.collectible.update({
          where: { id: card.id },
          data: { currentSupply: { increment: 1 } },
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { hasClaimedStarter: true },
      });
    });

    return picks.length;
  } catch (error) {
    console.error("Starter pack grant failed:", error);
    return 0;
  }
}

// ============================================
// NEXTAUTH CONFIG
// ============================================
const { handlers } = NextAuth({
  // Build the Google redirect URI from the real request host (localhost on any
  // port, or the Vercel domain) instead of a fixed NEXTAUTH_URL.
  trustHost: true,
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
        action: { label: "Action", type: "text", optional: true },
        whitelistData: {
          label: "Whitelist Data",
          type: "text",
          optional: true,
        },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          throw new AuthFail("Password required");
        }

        const username = credentials.username as string;
        const email = credentials.email as string | undefined;
        const password = credentials.password as string;
        const action = credentials.action as string;
        const whitelistDataRaw = credentials.whitelistData as
          | string
          | undefined;

        try {
          let dbUser;

          if (action === "signup") {
            // SIGNUP FLOW
            if (!email) {
              throw new AuthFail("Email is required for signup");
            }

            // Check existing
            const existing = await prisma.user.findFirst({
              where: { OR: [{ email }, { username }] },
            });

            if (existing) {
              throw new AuthFail(
                existing.email === email
                  ? "An account with this email already exists. Try signing in instead."
                  : "That username is already taken. Please use a different name."
              );
            }

            // Whitelist validation
            let whitelistData = null;
            let isFounder = false;

            if (whitelistDataRaw) {
              try {
                whitelistData = JSON.parse(whitelistDataRaw);
                isFounder = true;

                // Check whitelist spots straight from the database
                const spots = await getWhitelistStatus();
                if (!spots.isWhitelistOpen) {
                  throw new AuthFail("Whitelist is full - no spots remaining");
                }
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message.includes("Whitelist is full")
                ) {
                  throw error;
                }
                throw new AuthFail("Invalid whitelist data format");
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
                walletAddress: whitelistData?.walletAddress || undefined,
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
                isFounder: true,
              },
            });

            console.log(
              `✅ Created new user: ${dbUser.username} (ID: ${dbUser.id}, Founder: ${dbUser.isFounder})`
            );

            // Grant starter pack IMMEDIATELY
            if (isFounder && whitelistData) {
              console.log(`🎁 Founder detected - granting starter pack NOW...`);
              const granted = await grantStarterPack(dbUser.id, whitelistData);
              console.log(
                `✅ Starter pack complete: ${granted} card(s) granted`
              );

              if (granted === 0) {
                console.error("⚠️ WARNING: No cards were granted!");
              }
            }
          } else {
            // LOGIN FLOW
            const input = (credentials.username as string)?.trim();
            const pass = credentials.password as string;

            console.log(`🔍 Login attempt for: "${input}"`);

            if (!input || !pass) {
              throw new AuthFail("Username/email and password required");
            }

            // Try to find user
            const orConditions: any[] = [{ username: input }];
            if (input.includes("@")) {
              orConditions.push({ email: input });
            } else {
              orConditions.push({ email: `${input}@koka.local` });
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
                isFounder: true,
              },
            });

            if (!dbUser) {
              console.log("❌ User not found");
              throw new AuthFail("Invalid credentials");
            }

            // Verify password
            if (
              !dbUser.password ||
              !(await bcrypt.compare(pass, dbUser.password))
            ) {
              console.log("❌ Invalid password");
              throw new AuthFail("Invalid credentials");
            }

            console.log(
              `✅ User authenticated: ${dbUser.username || dbUser.email}`
            );
          }

          // Return for session
          return {
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username ?? undefined,
            name: dbUser.name ?? undefined,
            image: dbUser.image ?? undefined,
            isAdmin: dbUser.isAdmin,
            walletAddress: dbUser.walletAddress ?? undefined,
            isFounder: dbUser.isFounder ?? false,
          };
        } catch (error) {
          console.error("❌ Auth error:", error);
          throw new AuthFail(
            error instanceof Error ? error.message : "Authentication failed"
          );
        }
      },
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
            console.error("No email from Google");
            return false;
          }

          const generatedUsername =
            user.name ?? user.email.split("@")[0] ?? undefined;

          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
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
                isFounder: false,
              },
            });
          }

          Object.assign(user, {
            id: dbUser.id,
            username: dbUser.username ?? generatedUsername,
            isAdmin: dbUser.isAdmin,
            isFounder: dbUser.isFounder,
          });

          return true;
        } catch (error) {
          console.error("SignIn error:", error);
          return false;
        }
      }
      if (account?.provider === "credentials") {
        return true;
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
        token.walletAddress = (user as any).walletAddress ?? undefined;
        token.isFounder = (user as any).isFounder ?? false;
      }

      // Fetch/update from DB
      let dbUser;
      if (token.id) {
        dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            username: true,
            isAdmin: true,
            walletAddress: true,
            isFounder: true,
          },
        });
      } else if (token.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: {
            id: true,
            username: true,
            isAdmin: true,
            walletAddress: true,
            isFounder: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
        }
      }

      if (dbUser) {
        token.username = dbUser.username ?? undefined;
        token.isAdmin = dbUser.isAdmin;
        token.walletAddress = dbUser.walletAddress ?? undefined;
        token.isFounder = dbUser.isFounder;
      }

      // Custom JWT
      const jwtSecret = process.env.JWT_SECRET!;
      if (jwtSecret && token.email) {
        const customToken = jwt.sign(
          {
            userId: token.id as string,
            email: token.email as string,
            username: token.username,
            isAdmin: (token.isAdmin as boolean) || false,
            isFounder: (token.isFounder as boolean) || false,
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
        session.user.isFounder = (token.isFounder as boolean) || false;
        session.customToken = token.customToken ?? undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});

export const { GET, POST } = handlers;
