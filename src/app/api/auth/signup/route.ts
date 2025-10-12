// app/api/signup/route.ts
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";

async function getNextAccountNumber() {
  const max = await prisma.user.aggregate({
    _max: { accountNumber: true },
  });
  return (max._max.accountNumber ?? 0) + 1;
}

async function selectRandomCollectible() {
  try {
    console.log("Selecting random collectible...");
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

export async function POST(request: NextRequest) {
  console.log("=== Signup API Called ===");

  try {
    const body = await request.json();
    const { username, password, email, whitelistData } = body;

    console.log("Received:", { username, hasPassword: !!password, email });

    if (!username || !password || !email) {
      console.log("Validation failed: missing fields");
      return NextResponse.json(
        {
          success: false,
          message: "Username, password, and email are required",
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

    const userEmail = email;

    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists" } as AuthResponse,
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const accountNumber = await getNextAccountNumber();
    const isWhitelistEligible = accountNumber <= 50;

    // Check if user provided Twitter handle for bonus
    const hasTwitter = !!(
      whitelistData?.twitter && whitelistData.twitter.trim().length > 0
    );

    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        name: username,
        username: username,
        password: hashedPassword,
        isAdmin: false,
        accountNumber,
        hasReceivedAirdrop: false,
        hasClaimedStarter: false,
        points: 100,
        whitelistData: whitelistData || null,
        isFounder: isWhitelistEligible,
      },
    });

    // Give airdrop to whitelist users
    let airdropCollectible = null;
    let twitterBonusCollectible = null;

    if (isWhitelistEligible) {
      // Main airdrop NFT
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
          console.log(`✅ Airdrop given: ${selectedCollectible.name}`);
        } catch (airdropError) {
          console.error("Airdrop creation failed:", airdropError);
        }
      }

      // Twitter bonus NFT
      if (hasTwitter) {
        const bonusCollectible = await selectRandomCollectible();

        if (bonusCollectible) {
          try {
            await prisma.inventoryItem.create({
              data: {
                userId: newUser.id,
                collectibleId: bonusCollectible.id,
                quantity: 1,
                isClaimed: true,
                receivedVia: "twitter-bonus",
              },
            });

            twitterBonusCollectible = bonusCollectible;
            console.log(`✅ Twitter bonus given: ${bonusCollectible.name}`);
          } catch (bonusError) {
            console.error("Twitter bonus creation failed:", bonusError);
          }
        }
      }
    }

    const token = await encodeJWT({
      userId: newUser.id,
      username: newUser.username || newUser.email,
      isAdmin: newUser.isAdmin,
      isFounder: newUser.isFounder,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username || newUser.email,
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
            twitterBonus: twitterBonusCollectible
              ? {
                  id: twitterBonusCollectible.id,
                  name: twitterBonusCollectible.name,
                  rarity: twitterBonusCollectible.rarity,
                  imageUrl: twitterBonusCollectible.imageUrl,
                  description: twitterBonusCollectible.description,
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
      } as AuthResponse,
      { status: 500 }
    );
  }
}
