// app/api/airdrop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Adjust path if you used app/auth.ts
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); // v5: Simple call, no authOptions needed
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId, walletAddress, twitter, discord, fullName } =
      await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Invalid user" },
        { status: 403 }
      );
    }

    // Airdrop logic: Create random collectible inventory item
    const collectibles = await prisma.collectible.findMany({ take: 10 }); // Assume some exist; limit for randomness
    if (collectibles.length === 0) {
      return NextResponse.json(
        { success: false, message: "No collectibles available" },
        { status: 404 }
      );
    }

    const randomIndex = Math.floor(Math.random() * collectibles.length);
    const airdropCollectible = collectibles[randomIndex];

    await prisma.inventoryItem.create({
      data: {
        userId,
        collectibleId: airdropCollectible.id,
        quantity: 1,
        receivedVia: "airdrop",
      },
    });

    let twitterBonus = null;
    if (twitter && twitter.trim().startsWith("@")) {
      // Bonus logic: Another random or specific collectible
      const bonusIndex = Math.floor(Math.random() * collectibles.length);
      const bonusCollectible = collectibles[bonusIndex];

      await prisma.inventoryItem.create({
        data: {
          userId,
          collectibleId: bonusCollectible.id,
          quantity: 1,
          receivedVia: "twitter-bonus",
        },
      });

      twitterBonus = { collectible: bonusCollectible };
    }

    // Optionally update user with wallet/discord if provided
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: walletAddress || undefined,
        // discord not in schema; add if needed
      },
    });

    return NextResponse.json({
      success: true,
      received: true,
      collectible: airdropCollectible,
      twitterBonus,
    });
  } catch (error) {
    console.error("Airdrop error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process airdrop" },
      { status: 500 }
    );
  }
}
