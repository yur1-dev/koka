import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// FIXED: Imports now valid after generate (Trade exported)
import type { User, Trade, InventoryItem, Collectible } from "@prisma/client";

interface LeaderboardUser {
  id: string;
  email: string;
  username?: string | null;
  name?: string | null;
  isAdmin?: boolean;
  totalCards: number;
  uniqueCards: number;
  rareCards: number;
  legendaryCards: number;
  totalTrades: number;
  score: number;
  rank: number;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // FIXED: Use inventoryItems; sentTrades/receivedTrades now exist
    const users = await prisma.user.findMany({
      include: {
        inventoryItems: {
          include: {
            collectible: true,
          },
        },
        sentTrades: true,
        receivedTrades: true,
      },
    });

    const leaderboardData = users
      .map((user) => {
        // FIXED: Cast inventoryItems for type safety
        const inventoryItems: (InventoryItem & { collectible: Collectible })[] =
          (user.inventoryItems as (InventoryItem & {
            collectible: Collectible;
          })[]) || [];
        const totalCards = inventoryItems.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        );
        const uniqueCards = inventoryItems.length;
        const rareCards = inventoryItems
          .filter((item) => item.collectible?.rarity === "rare")
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
        const legendaryCards = inventoryItems
          .filter((item) => item.collectible?.rarity === "legendary")
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalTrades =
          (user.sentTrades?.length || 0) + (user.receivedTrades?.length || 0);

        const score =
          totalCards * 1 +
          uniqueCards * 5 +
          rareCards * 15 +
          legendaryCards * 30 +
          totalTrades * 10;

        // FIXED: username/isAdmin now on User type
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          isAdmin: user.isAdmin,
          totalCards,
          uniqueCards,
          rareCards,
          legendaryCards,
          totalTrades,
          score,
        } as LeaderboardUser;
      })
      .sort((a, b) => b.score - a.score);

    const leaderboard: LeaderboardUser[] = leaderboardData.map(
      (user, index) => ({
        ...user,
        rank: index + 1,
      })
    );

    return NextResponse.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Leaderboard query error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
