// app/api/auth/signup/route.ts
// FULLY FIXED: Conditional seeding for starters/airdrop (skips if collectibles don't exist); Added error handling for missing collectibles; Whitelist logic now safer; Logs for debugging

import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";

async function selectRandomCollectible() {
  try {
    // First, check if any collectibles exist
    const allCollectibles = await prisma.collectible.findMany();
    if (allCollectibles.length === 0) {
      console.warn("No collectibles found for airdrop; skipping");
      return null;
    }

    const rand = Math.random() * 100;
    let rarity: string;

    if (rand < 50) rarity = "common";
    else if (rand < 75) rarity = "uncommon";
    else if (rand < 90) rarity = "rare";
    else if (rand < 97) rarity = "epic";
    else rarity = "legendary";

    // Try to find by rarity, fallback to random from all
    const collectibles = await prisma.collectible.findMany({
      where: { rarity },
    });

    let selected =
      collectibles.length > 0
        ? collectibles[Math.floor(Math.random() * collectibles.length)]
        : allCollectibles[Math.floor(Math.random() * allCollectibles.length)];

    console.log(`Selected collectible: ${selected.name} (${selected.rarity})`);
    return selected;
  } catch (error) {
    console.error("Error selecting random collectible:", error);
    return null;
  }
}

async function seedStarterPack(userId: string) {
  try {
    const starterCollectibleIds = [
      "starter-earth-guardian",
      "starter-wanderer",
    ];

    // Check which starters exist
    const existingStarters = await prisma.collectible.findMany({
      where: { id: { in: starterCollectibleIds } },
    });

    if (existingStarters.length === 0) {
      console.warn(
        "No starter collectibles found; skipping starter pack seeding"
      );
      return [];
    }

    // Seed only existing ones
    const seededItems = await prisma.$transaction(
      existingStarters.map((collectible) =>
        prisma.inventoryItem.create({
          data: {
            userId,
            collectibleId: collectible.id,
            quantity: 1,
            isClaimed: false,
            receivedVia: "starter-pack",
          },
        })
      )
    );

    console.log(`Seeded ${seededItems.length} starter items`);
    return seededItems;
  } catch (error) {
    console.error("Error seeding starter pack:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  console.log("=== Signup API Called ===");

  try {
    const body = await request.json();
    const { username, password, email, whitelistData } = body;

    console.log("Received:", { username, hasPassword: !!password, email });

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Username must be at least 3 characters",
        } as AuthResponse,
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        } as AuthResponse,
        { status: 400 }
      );
    }

    const userEmail = email || `${username}@koka.local`;

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      console.log("User already exists");
      return NextResponse.json(
        { success: false, message: "User already exists" } as AuthResponse,
        { status: 409 }
      );
    }

    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get next account number
    const lastUser = await prisma.user.findFirst({
      orderBy: { accountNumber: "desc" },
      select: { accountNumber: true },
    });

    const accountNumber = (lastUser?.accountNumber || 0) + 1;
    const isWhitelistEligible = accountNumber <= 50;

    console.log(
      `Creating user #${accountNumber}. Whitelist: ${isWhitelistEligible}`
    );

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        name: username,
        password: hashedPassword,
        isAdmin: false,
        accountNumber,
        hasReceivedAirdrop: false,
        hasClaimedStarter: false,
        points: 100,
        whitelistData: whitelistData || null,
        isFounder: isWhitelistEligible, // Mark as founder if whitelisted
      },
    });

    console.log("User created:", newUser.id);

    // Seed starter pack (now conditional)
    await seedStarterPack(newUser.id);

    // Optional airdrop for whitelist
    let airdropCollectible = null;
    if (isWhitelistEligible) {
      const selectedCollectible = await selectRandomCollectible();

      if (selectedCollectible) {
        try {
          await prisma.inventoryItem.create({
            data: {
              userId: newUser.id,
              collectibleId: selectedCollectible.id,
              quantity: 1,
              isClaimed: true,
              receivedVia: "airdrop",
              airdropNumber: accountNumber,
            },
          });

          await prisma.user.update({
            where: { id: newUser.id },
            data: { hasReceivedAirdrop: true },
          });

          airdropCollectible = selectedCollectible;
          console.log(
            `Airdropped ${selectedCollectible.name} (${selectedCollectible.rarity})`
          );
        } catch (airdropError) {
          console.error("Airdrop creation failed:", airdropError);
          // Don't fail the whole signup; continue
        }
      } else {
        console.warn("No collectible selected for airdrop; skipping");
      }
    }

    // Generate JWT
    const token = await encodeJWT({
      userId: newUser.id,
      username: newUser.name || newUser.email,
      isAdmin: newUser.isAdmin,
    });

    console.log("Token generated successfully");

    // Return response
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.name || newUser.email,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        accountNumber: newUser.accountNumber,
        points: newUser.points,
        hasClaimedStarter: newUser.hasClaimedStarter,
        isFounder: newUser.isFounder,
      },
      airdrop: isWhitelistEligible
        ? {
            received: !!airdropCollectible,
            collectible: airdropCollectible
              ? {
                  id: airdropCollectible.id,
                  name: airdropCollectible.name,
                  rarity: airdropCollectible.rarity,
                  imageUrl: airdropCollectible.imageUrl,
                  description: airdropCollectible.description,
                }
              : null,
            whitelistNumber: accountNumber,
            spotsRemaining: Math.max(0, 50 - accountNumber),
          }
        : null,
    } as AuthResponse);
  } catch (error) {
    console.error("=== Signup Error ===", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error instanceof Error ? error.message : String(error),
        }),
      } as AuthResponse,
      { status: 500 }
    );
  }
}
