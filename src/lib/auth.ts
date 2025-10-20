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

interface UserSelect {
  id: string;
  email: string;
  username: string | null;
  password?: string | null;
  name?: string | null;
  image?: string | null;
  isAdmin: boolean;
  walletAddress?: string | null;
  isFounder: boolean;
}

interface UserSignInSelect {
  id: string;
  username: string | null;
  isAdmin: boolean;
  isFounder: boolean;
}

interface UserJwtSelect {
  username: string | null;
  isAdmin: boolean;
  walletAddress: string | null;
  isFounder: boolean;
}

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
          let dbUser: UserSelect | null = null;
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

              // FIXED: Hoist assignUniqueItem outside try-catch for scope
              const assignUniqueItem = async (
                userId: string,
                selectedCollectible: Collectible,
                receivedVia: string
              ): Promise<Collectible | null> => {
                try {
                  await prisma.$transaction(async (tx) => {
                    // Check supply
                    const collectible = await tx.collectible.findUnique({
                      where: { id: selectedCollectible.id },
                    });
                    if (
                      !collectible ||
                      collectible.currentSupply >=
                        (collectible.maxSupply ?? Infinity)
                    ) {
                      throw new Error(
                        `Supply exhausted for ${selectedCollectible.name}`
                      );
                    }

                    // Create item + increment supply atomically
                    await tx.inventoryItem.create({
                      data: {
                        userId,
                        collectibleId: selectedCollectible.id,
                        quantity: 1,
                        receivedVia,
                      },
                    });
                    await tx.collectible.update({
                      where: { id: selectedCollectible.id },
                      data: { currentSupply: { increment: 1 } },
                    });
                  });
                  console.log(
                    `✅ Assigned unique ${receivedVia}: ${selectedCollectible.name} (${selectedCollectible.rarity})`
                  );
                  return selectedCollectible;
                } catch (err) {
                  console.warn(
                    `❌ Failed to assign ${selectedCollectible.name}:`,
                    err
                  );
                  return null;
                }
              };

              try {
                // FIXED: Fetch ALL raw collectibles by rarity (no take:5 limit; include supply fields)
                const allRarityGroups = await Promise.all([
                  prisma.collectible.findMany({
                    where: { rarity: "common" },
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                      description: true,
                      imageUrl: true,
                      currentSupply: true,
                      maxSupply: true,
                    },
                  }),
                  prisma.collectible.findMany({
                    where: { rarity: "uncommon" },
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                      description: true,
                      imageUrl: true,
                      currentSupply: true,
                      maxSupply: true,
                    },
                  }),
                  prisma.collectible.findMany({
                    where: { rarity: "rare" },
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                      description: true,
                      imageUrl: true,
                      currentSupply: true,
                      maxSupply: true,
                    },
                  }),
                  prisma.collectible.findMany({
                    where: { rarity: "epic" },
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                      description: true,
                      imageUrl: true,
                      currentSupply: true,
                      maxSupply: true,
                    },
                  }),
                  prisma.collectible.findMany({
                    where: { rarity: "legendary" },
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                      description: true,
                      imageUrl: true,
                      currentSupply: true,
                      maxSupply: true,
                    },
                  }),
                ]);
                const collectiblesByRarityRaw = {
                  common: allRarityGroups[0],
                  uncommon: allRarityGroups[1],
                  rare: allRarityGroups[2],
                  epic: allRarityGroups[3],
                  legendary: allRarityGroups[4],
                };

                // FIXED: Compute available pools (filter supply < maxSupply)
                const availableByRarity: Record<string, Collectible[]> = {};
                for (const [rarity, rawList] of Object.entries(
                  collectiblesByRarityRaw
                )) {
                  availableByRarity[rarity] = rawList
                    .filter(
                      (c: any) => c.currentSupply < (c.maxSupply ?? Infinity)
                    )
                    .map(mapCollectible);
                }
                console.log(
                  "DEBUG: Available by rarity:",
                  Object.fromEntries(
                    Object.entries(availableByRarity).map(([k, v]) => [
                      k,
                      v.length,
                    ])
                  )
                );

                if (
                  Object.values(availableByRarity).every(
                    (group) => group.length === 0
                  )
                ) {
                  throw new Error("No collectibles available"); // Triggers fallback
                }

                // FIXED: Weighted rarity selection (boost rares/gold for founders; standard otherwise)
                const isWhitelisted = dbUser.isFounder;
                const weights = isWhitelisted
                  ? {
                      common: 0.1,
                      uncommon: 0.2,
                      rare: 0.3,
                      epic: 0.2,
                      legendary: 0.2,
                    } // ~70% rare+ for "gold" luck
                  : {
                      common: 0.5,
                      uncommon: 0.3,
                      rare: 0.1,
                      epic: 0.05,
                      legendary: 0.05,
                    }; // Standard low luck

                // FIXED: Dynamic effective weights (set 0 if no available; normalize probs)
                const effectiveWeights = { ...weights };
                let totalEffectiveWeight = 0;
                for (const [rarity, avail] of Object.entries(
                  availableByRarity
                )) {
                  if (avail.length === 0) {
                    effectiveWeights[rarity as keyof typeof weights] = 0;
                  }
                  totalEffectiveWeight +=
                    effectiveWeights[rarity as keyof typeof weights];
                }

                let airdropCollectible: Collectible | null = null;
                if (totalEffectiveWeight > 0) {
                  // Normalize weights
                  const normalizedWeights = {} as Record<
                    keyof typeof weights,
                    number
                  >;
                  for (const [rarity, w] of Object.entries(effectiveWeights)) {
                    normalizedWeights[rarity as keyof typeof weights] =
                      w / totalEffectiveWeight;
                  }

                  // Select rarity with normalized cumulative
                  const rand = Math.random();
                  let cumulative = 0;
                  let selectedRarity:
                    | keyof typeof availableByRarity
                    | undefined;
                  for (const [rarity, weight] of Object.entries(
                    normalizedWeights
                  )) {
                    cumulative += weight;
                    if (rand <= cumulative) {
                      selectedRarity = rarity as keyof typeof availableByRarity;
                      break;
                    }
                  }
                  if (typeof selectedRarity === "undefined") {
                    selectedRarity = "common" as keyof typeof availableByRarity;
                  }

                  // Pick random from available pool (guaranteed available)
                  const rarityPool = availableByRarity[selectedRarity];
                  const selected =
                    rarityPool[Math.floor(Math.random() * rarityPool.length)]!;
                  airdropCollectible = await assignUniqueItem(
                    dbUser.id,
                    selected,
                    "airdrop"
                  );
                }

                if (!airdropCollectible) {
                  throw new Error("No available collectibles for airdrop"); // Triggers fallback
                }

                // FIXED: X bonus (using xHandle key; rare+ only, unique) - Similar dynamic logic
                let xBonusCollectible: Collectible | null = null;
                if (
                  whitelistData.xHandle &&
                  typeof whitelistData.xHandle === "string" &&
                  whitelistData.xHandle.trim().startsWith("@")
                ) {
                  const bonusWeights = {
                    common: 0,
                    uncommon: 0,
                    rare: 0.4,
                    epic: 0.3,
                    legendary: 0.3,
                  }; // Gold+ only for bonus

                  // Dynamic effective for bonus (only rare+)
                  const bonusEffectiveWeights = { ...bonusWeights };
                  let bonusTotalEffectiveWeight = 0;
                  for (const [rarity, avail] of Object.entries(
                    availableByRarity
                  )) {
                    if (rarity === "common" || rarity === "uncommon") continue;
                    if (avail.length === 0) {
                      bonusEffectiveWeights[
                        rarity as keyof typeof bonusWeights
                      ] = 0;
                    }
                    bonusTotalEffectiveWeight +=
                      bonusEffectiveWeights[
                        rarity as keyof typeof bonusWeights
                      ];
                  }

                  if (bonusTotalEffectiveWeight > 0) {
                    // Normalize
                    const bonusNormalizedWeights = {} as Record<
                      keyof typeof bonusWeights,
                      number
                    >;
                    for (const [rarity, w] of Object.entries(
                      bonusEffectiveWeights
                    )) {
                      if (rarity === "common" || rarity === "uncommon")
                        continue;
                      bonusNormalizedWeights[
                        rarity as keyof typeof bonusWeights
                      ] = w / bonusTotalEffectiveWeight;
                    }

                    // Select rarity
                    const bonusRand = Math.random();
                    let bonusCumulative = 0;
                    let bonusRarity: keyof typeof availableByRarity | undefined;
                    for (const [rarity, weight] of Object.entries(
                      bonusNormalizedWeights
                    )) {
                      bonusCumulative += weight;
                      if (bonusRand <= bonusCumulative) {
                        bonusRarity = rarity as keyof typeof availableByRarity;
                        break;
                      }
                    }
                    if (typeof bonusRarity === "undefined") {
                      bonusRarity = "rare" as keyof typeof availableByRarity; // Fallback to rare+
                    }

                    // Pick random from available
                    const bonusPool = availableByRarity[bonusRarity];
                    if (bonusPool.length > 0) {
                      const bonusSelected =
                        bonusPool[
                          Math.floor(Math.random() * bonusPool.length)
                        ]!;
                      xBonusCollectible = await assignUniqueItem(
                        dbUser.id,
                        bonusSelected,
                        "x-bonus"
                      );
                    }
                  }
                  if (!xBonusCollectible) {
                    console.log("No available bonus collectible—skipping");
                  }
                } else {
                  console.log("No valid xHandle for bonus");
                }

                airdropData = {
                  collectible: airdropCollectible,
                  twitterBonus: { collectible: xBonusCollectible }, // Keep compat; rename if needed
                };
                console.log(`DEBUG: Airdrop data set:`, {
                  mainRarity: airdropCollectible.rarity,
                  bonusRarity: xBonusCollectible?.rarity,
                });
              } catch (airdropError) {
                console.error("Airdrop processing failed:", airdropError);
                // FIXED: Improved fallback (random rarity from available; no new creation to avoid visual dups; if none, null)
                // Loop over preferred rarities, fetch fresh available for each, assign if possible
                const fallbackRarities = [
                  "legendary",
                  "epic",
                  "rare",
                  "uncommon",
                  "common",
                ];
                let fallbackCollectible: Collectible | null = null;
                for (const rar of fallbackRarities) {
                  // Fetch fresh candidates for this rarity
                  const freshCandidates = await prisma.collectible.findMany({
                    where: { rarity: rar },
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                      description: true,
                      imageUrl: true,
                      currentSupply: true,
                      maxSupply: true,
                    },
                  });
                  const freshAvail = freshCandidates
                    .filter(
                      (c: any) => c.currentSupply < (c.maxSupply ?? Infinity)
                    )
                    .map(mapCollectible);
                  if (freshAvail.length > 0) {
                    const selectedFallback =
                      freshAvail[
                        Math.floor(Math.random() * freshAvail.length)
                      ]!;
                    fallbackCollectible = await assignUniqueItem(
                      dbUser.id,
                      selectedFallback,
                      "airdrop-fallback"
                    );
                    if (fallbackCollectible) {
                      console.log(
                        `✅ Fallback assigned: ${fallbackCollectible.name} (${rar})`
                      );
                      break;
                    }
                  }
                }

                if (!fallbackCollectible) {
                  console.log(
                    "❌ No available collectibles even for fallback—skipping airdrop"
                  );
                  airdropData = { collectible: null, twitterBonus: null };
                } else {
                  airdropData = {
                    collectible: fallbackCollectible,
                    twitterBonus: null,
                  };
                }
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

          let dbUser: UserSignInSelect | null = await prisma.user.findUnique({
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

      let dbUser: UserJwtSelect | null = null;
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
        const tempUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            username: true,
            isAdmin: true,
            walletAddress: true,
            isFounder: true,
          },
        });
        if (tempUser) {
          token.id = tempUser.id;
          dbUser = {
            username: tempUser.username,
            isAdmin: tempUser.isAdmin,
            walletAddress: tempUser.walletAddress,
            isFounder: tempUser.isFounder,
          };
        }
      }

      if (dbUser) {
        token.username = dbUser.username ?? undefined;
        token.isAdmin = Boolean(dbUser.isAdmin);
        token.walletAddress = dbUser.walletAddress ?? undefined; // FIXED: Consistent naming
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
        session.user.walletAddress = token.walletAddress ?? undefined; // FIXED: Consistent
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
