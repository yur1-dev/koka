import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// Score: 1 per card, 5 per unique card, 15 per rare, 30 per legendary, 10 per trade.
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only fetch the columns the board needs, and count trades in SQL.
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isAdmin: true,
        inventoryItems: {
          select: { quantity: true, collectible: { select: { rarity: true } } },
        },
        _count: { select: { sentTrades: true, receivedTrades: true } },
      },
    });

    const ranked = users
      .map((user) => {
        const items = user.inventoryItems;
        const sumBy = (rarity?: string) =>
          items
            .filter((i) => !rarity || i.collectible?.rarity === rarity)
            .reduce((sum, i) => sum + (i.quantity || 0), 0);

        const totalCards = sumBy();
        const uniqueCards = items.length;
        const rareCards = sumBy("rare");
        const legendaryCards = sumBy("legendary");
        const totalTrades =
          user._count.sentTrades + user._count.receivedTrades;

        return {
          id: user.id,
          // Never send other people's email addresses to the browser.
          email: "",
          username: user.username,
          name: user.username || user.name || user.email?.split("@")[0] || "User",
          isAdmin: user.isAdmin,
          totalCards,
          uniqueCards,
          rareCards,
          legendaryCards,
          totalTrades,
          score:
            totalCards +
            uniqueCards * 5 +
            rareCards * 15 +
            legendaryCards * 30 +
            totalTrades * 10,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((user, index) => ({ ...user, rank: index + 1 }));

    return NextResponse.json({ success: true, leaderboard: ranked });
  } catch (error) {
    console.error("Leaderboard query error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load the leaderboard" },
      { status: 500 }
    );
  }
}
