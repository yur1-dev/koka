import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

async function selectRandomCollectible() {
  const rarityWeights = {
    common: 50,
    uncommon: 25,
    rare: 15,
    epic: 7,
    legendary: 3,
  };

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

  if (collectibles.length === 0) {
    const allCollectibles = await prisma.collectible.findMany();
    if (allCollectibles.length === 0) return null;
    return allCollectibles[Math.floor(Math.random() * allCollectibles.length)];
  }

  return collectibles[Math.floor(Math.random() * collectibles.length)];
}

export async function POST(request: NextRequest) {
  console.log("=== Signup API Called ===");

  try {
    const body = await request.json();
    const { username, password, email, whitelistData } = body;

    console.log("Received:", { username, hasPassword: !!password, email });

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

    console.log("Checking for existing user with email:", userEmail);

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

    // Get highest account number and increment
    const lastUser = await prisma.user.findFirst({
      orderBy: { accountNumber: "desc" },
      select: { accountNumber: true },
    });

    const accountNumber = (lastUser?.accountNumber || 0) + 1;
    const isWhitelistEligible = accountNumber <= 50;

    console.log(
      `Creating user #${accountNumber}. Whitelist eligible: ${isWhitelistEligible}`
    );

    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        name: username,
        password: hashedPassword,
        isAdmin: false,
        accountNumber,
        hasReceivedAirdrop: false,
        whitelistData: whitelistData || null,
      },
    });

    console.log("User created:", newUser.id);

    let airdropCollectible = null;
    if (isWhitelistEligible) {
      try {
        const selectedCollectible = await selectRandomCollectible();

        if (selectedCollectible) {
          await prisma.inventoryItem.create({
            data: {
              userId: newUser.id,
              collectibleId: selectedCollectible.id,
              quantity: 1,
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
            `Airdropped ${selectedCollectible.name} (${selectedCollectible.rarity}) to user #${accountNumber}`
          );
        }
      } catch (airdropError) {
        console.error("Airdrop failed:", airdropError);
      }
    }

    const token = encodeJWT({
      userId: newUser.id,
      username: newUser.name || newUser.email,
      isAdmin: newUser.isAdmin,
    });

    console.log("Token generated successfully");

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.name || newUser.email,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        accountNumber: newUser.accountNumber,
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
    });
  } catch (error) {
    console.error("=== Signup Error ===");
    console.error("Error:", error);

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
