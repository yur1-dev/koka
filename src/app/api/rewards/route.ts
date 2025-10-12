// app/api/rewards/starter-pack/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    // Parse the request body to get user ID
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find user
    const sessionUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        hasClaimedStarter: true,
        isFounder: true,
        username: true,
      },
    });

    if (!sessionUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a founder
    if (!sessionUser.isFounder) {
      return NextResponse.json(
        { error: "Only whitelisted founders can claim starter packs" },
        { status: 403 }
      );
    }

    // Check if already claimed
    if (sessionUser.hasClaimedStarter) {
      return NextResponse.json(
        { error: "Starter pack already claimed" },
        { status: 400 }
      );
    }

    // Get starter collectibles (common and uncommon)
    const starterCollectibles = await prisma.collectible.findMany({
      where: {
        rarity: { in: ["common", "uncommon"] },
      },
      take: 3,
      orderBy: {
        rarity: "asc",
      },
    });

    if (starterCollectibles.length === 0) {
      return NextResponse.json(
        { error: "No collectibles available. Please contact support." },
        { status: 500 }
      );
    }

    // Grant collectibles in a transaction
    const grantedItems = await prisma.$transaction(async (tx) => {
      const items = [];

      for (const collectible of starterCollectibles) {
        // Create inventory item
        const inventoryItem = await tx.inventoryItem.create({
          data: {
            userId: sessionUser.id,
            collectibleId: collectible.id,
            quantity: 1,
            isClaimed: true,
            receivedVia: "starter-pack",
          },
          include: {
            collectible: true,
          },
        });

        // Update collectible supply
        await tx.collectible.update({
          where: { id: collectible.id },
          data: { currentSupply: { increment: 1 } },
        });

        items.push(inventoryItem);
      }

      // Mark starter pack as claimed
      await tx.user.update({
        where: { id: sessionUser.id },
        data: { hasClaimedStarter: true },
      });

      return items;
    });

    console.log(
      `✅ User ${sessionUser.username} claimed starter pack with ${grantedItems.length} items`
    );

    return NextResponse.json({
      success: true,
      message: "Starter pack claimed successfully!",
      items: grantedItems.map((item) => ({
        id: item.collectible.id,
        name: item.collectible.name,
        description: item.collectible.description,
        imageUrl: item.collectible.imageUrl,
        rarity: item.collectible.rarity,
        quantity: item.quantity,
      })),
      count: grantedItems.length,
    });
  } catch (error) {
    console.error("❌ Starter pack claim error:", error);
    return NextResponse.json(
      {
        error: "Failed to claim starter pack",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check claim status
export async function GET(req: Request) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasClaimedStarter: true,
        isFounder: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      canClaim: user.isFounder && !user.hasClaimedStarter,
      hasClaimedStarter: user.hasClaimedStarter,
      isFounder: user.isFounder,
    });
  } catch (error) {
    console.error("Error checking claim status:", error);
    return NextResponse.json(
      { error: "Failed to check claim status" },
      { status: 500 }
    );
  }
}
