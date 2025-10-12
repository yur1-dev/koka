import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { DefaultJWT, JWT } from "next-auth/jwt";

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

  interface JWT extends DefaultJWT {
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

const mapCollectible = (c: any): Collectible => {
  const obj: Collectible = {
    id: c.id,
    name: c.name,
    rarity: c.rarity,
  };
  if (c.description != null) {
    obj.description = c.description;
  }
  if (c.imageUrl != null) {
    obj.imageUrl = c.imageUrl;
  }
  return obj;
};

export const { auth, handlers, signIn, signOut } = NextAuth({
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
          let airdropData: AirdropData | undefined = undefined;

          if (action === "login") {
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
                isFounder: true,
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
            // signup
            if (!email) {
              throw new Error("Email is required for signup");
            }

            const existing = await prisma.user.findFirst({
              where: {
                OR: [{ email }, { username }],
              },
            });

            if (existing) {
              throw new Error("User already exists");
            }

            let whitelistData: any = null;
            if (whitelistDataRaw) {
              try {
                whitelistData = JSON.parse(whitelistDataRaw);
                console.log("DEBUG: Parsed whitelist data:", whitelistData);
              } catch {
                throw new Error("Invalid whitelist data");
              }

              // Whitelist spot check (enforced) - FIXED: Relative URL + DEV BYPASS
              const isDev = process.env.NODE_ENV === "development";
              if (isDev) {
                console.log("DEV MODE: Bypassing whitelist spot check");
              } else {
                try {
                  const spotsResponse = await fetch("/api/whitelist/status");
                  if (!spotsResponse.ok) {
                    throw new Error("Failed to fetch whitelist status");
                  }
                  const spotsData = await spotsResponse.json();
                  if (!spotsData.success || spotsData.spotsRemaining <= 0) {
                    throw new Error("Whitelist full");
                  }
                  console.log(
                    "Whitelist spots check passed:",
                    spotsData.spotsRemaining
                  );
                } catch (error) {
                  console.error("Whitelist spot check failed:", error);
                  throw new Error("Whitelist check failed");
                }
              }
            } else {
              console.log(
                "No whitelist data provided; proceeding with regular signup (no airdrop)"
              );
            }

            // Generate unique accountNumber
            const maxAccount = await prisma.user.aggregate({
              _max: { accountNumber: true },
            });
            const nextAccountNumber = (maxAccount._max.accountNumber ?? 0) + 1;

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            dbUser = await prisma.user.create({
              data: {
                email,
                username,
                password: hashedPassword,
                name: username,
                image: undefined,
                isAdmin: false,
                accountNumber: nextAccountNumber,
                points: 100,
                walletAddress: whitelistData?.walletAddress ?? undefined,
                ...(whitelistData && {
                  whitelistData,
                  isFounder: true,
                }),
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
              "Created user:",
              dbUser.id,
              "isFounder:",
              dbUser.isFounder
            );

            // Handle airdrop if whitelisted
            if (whitelistData) {
              console.log("Processing airdrop for whitelisted user...");
              try {
                const rawCollectibles = await prisma.collectible.findMany({
                  take: 10,
                  select: {
                    id: true,
                    name: true,
                    rarity: true,
                    description: true,
                    imageUrl: true,
                  },
                });
                console.log(
                  `DEBUG: Raw collectibles fetched: ${rawCollectibles.length}`
                );
                const collectibles = rawCollectibles.map(mapCollectible);
                console.log(
                  `DEBUG: Mapped collectibles:`,
                  collectibles.map((c) => ({ name: c.name, rarity: c.rarity }))
                );

                if (collectibles.length === 0) {
                  console.warn("No collectibles available—using fallback");
                  const fallbackCollectible = await prisma.collectible.create({
                    data: {
                      name: "KŌKA Starter Pack",
                      description: "Fallback airdrop for new founders",
                      rarity: "common",
                      imageUrl: "/collectibles/common-1.png",
                      maxSupply: 999,
                      currentSupply: 1,
                    },
                  });
                  await prisma.inventoryItem.create({
                    data: {
                      userId: dbUser.id,
                      collectibleId: fallbackCollectible.id,
                      quantity: 1,
                      receivedVia: "airdrop",
                    },
                  });
                  const fallbackMapped = mapCollectible(fallbackCollectible);
                  airdropData = {
                    collectible: fallbackMapped,
                    twitterBonus: null,
                  };
                  console.log(
                    "DEBUG: Fallback airdrop created and InventoryItem added"
                  );
                } else {
                  // Main airdrop
                  const randomIndex = Math.floor(
                    Math.random() * collectibles.length
                  );
                  const airdropCollectible = collectibles[randomIndex]!;
                  await prisma.inventoryItem.create({
                    data: {
                      userId: dbUser.id,
                      collectibleId: airdropCollectible.id,
                      quantity: 1,
                      receivedVia: "airdrop",
                    },
                  });
                  console.log(
                    `Created main airdrop: ${airdropCollectible.name} (ID: ${airdropCollectible.id}) - InventoryItem added`
                  );

                  // Twitter bonus
                  let twitterBonusCollectible: Collectible | null = null;
                  if (
                    whitelistData.twitter &&
                    typeof whitelistData.twitter === "string" &&
                    whitelistData.twitter.trim().startsWith("@")
                  ) {
                    const bonusIndex = Math.floor(
                      Math.random() * collectibles.length
                    );
                    twitterBonusCollectible = collectibles[bonusIndex]!;
                    await prisma.inventoryItem.create({
                      data: {
                        userId: dbUser.id,
                        collectibleId: twitterBonusCollectible.id,
                        quantity: 1,
                        receivedVia: "twitter-bonus",
                      },
                    });
                    console.log(
                      `Created twitter bonus: ${twitterBonusCollectible.name} (ID: ${twitterBonusCollectible.id}) - InventoryItem added`
                    );
                  } else {
                    console.log("No valid twitter handle for bonus");
                  }

                  airdropData = {
                    collectible: airdropCollectible,
                    twitterBonus: { collectible: twitterBonusCollectible },
                  };
                  console.log(`DEBUG: Airdrop data set:`, airdropData);
                }
              } catch (airdropError) {
                console.error("Airdrop processing failed:", airdropError);
                // Force fallback even on error
                const fallbackCollectible = await prisma.collectible.create({
                  data: {
                    name: "KŌKA Emergency Founder Pack",
                    description: "Guaranteed starter due to airdrop glitch",
                    rarity: "common",
                    imageUrl: "/collectibles/common-1.png",
                    maxSupply: 999,
                    currentSupply: 1,
                  },
                });
                await prisma.inventoryItem.create({
                  data: {
                    userId: dbUser.id,
                    collectibleId: fallbackCollectible.id,
                    quantity: 1,
                    receivedVia: "airdrop",
                  },
                });
                const fallbackMapped = mapCollectible(fallbackCollectible);
                airdropData = {
                  collectible: fallbackMapped,
                  twitterBonus: null,
                };
                console.log(
                  "FORCE Fallback airdrop created and InventoryItem added"
                );
              }
            }
          }

          if (!dbUser) {
            throw new Error("User not found");
          }

          console.log("Returning user from authorize:", {
            id: dbUser.id,
            isFounder: dbUser.isFounder,
            airdrop: airdropData ? "exists" : "null",
          });

          return {
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username ?? undefined,
            name: dbUser.name ?? undefined,
            image: dbUser.image ?? undefined,
            isAdmin: Boolean(dbUser.isAdmin),
            isFounder: Boolean(dbUser.isFounder),
            airdrop: airdropData,
          };
        } catch (error) {
          console.error("FULL AUTH ERROR:", error);
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
            select: {
              id: true,
              username: true,
              isAdmin: true,
              isFounder: true,
            },
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
              select: {
                id: true,
                username: true,
                isAdmin: true,
                isFounder: true,
              },
            });
          }

          (user as any).id = dbUser.id;
          (user as any).username = dbUser.username ?? generatedUsername;
          (user as any).isAdmin = Boolean(dbUser.isAdmin);
          (user as any).isFounder = Boolean(dbUser.isFounder);

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
        token.id = (user as any).id as string;
        token.email = user.email as string;
        token.name = (user as any).name ?? undefined;
        token.image = (user as any).image ?? undefined;
        token.username = (user as any).username ?? undefined;
        token.isAdmin = (user as any).isAdmin ?? false;
        token.isFounder = (user as any).isFounder ?? false;
        if ((user as any).airdrop) {
          token.airdrop = (user as any).airdrop as AirdropData;
        }
      }

      let dbUser;
      if (token.id) {
        dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            username: true,
            isAdmin: true,
            walletAddress: true,
            isFounder: true,
          },
        });
      } else if (token.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: token.email },
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
        token.isAdmin = Boolean(dbUser.isAdmin);
        token.walletAddress = dbUser.walletAddress ?? undefined;
        token.isFounder = Boolean(dbUser.isFounder);
      }

      token.isAdmin = token.isAdmin ?? false;
      token.isFounder = token.isFounder ?? false;

      const jwtSecret = process.env.JWT_SECRET!;
      if (jwtSecret && token.email) {
        const customToken = jwt.sign(
          {
            userId: token.id as string,
            email: token.email as string,
            username: token.username,
            isAdmin: token.isAdmin,
            isFounder: token.isFounder,
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
        session.user.isAdmin = token.isAdmin ?? false;
        session.user.walletAddress = token.walletAddress ?? undefined;
        session.user.isFounder = Boolean(token.isFounder);
        if (token.airdrop) {
          session.user.airdrop = token.airdrop as AirdropData;
        }
        session.customToken = token.customToken ?? undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});

// Custom JWT helpers
interface CustomJWTPayload {
  userId: string;
  email?: string;
  username?: string;
  isAdmin: boolean;
  isFounder: boolean;
}

export async function encodeJWT(
  payload: Omit<CustomJWTPayload, "email">
): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET!;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }
  return jwt.sign(payload, jwtSecret, { expiresIn: "30d" });
}

export async function verifyToken(
  token: string
): Promise<CustomJWTPayload | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET!;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET not configured");
    }
    const decoded = jwt.verify(token, jwtSecret) as CustomJWTPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
