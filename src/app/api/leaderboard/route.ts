// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from 'next-auth/next'; // Commented out if not using next-auth
import { prisma } from "@/lib/db"; // Adjust to your DB client (e.g., Prisma)

// Extend your User model to match LeaderboardUser if needed.
// Assuming your Prisma User model has optional fields like name?: string | null
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
    // Verify auth (adjust to your session/token validation)
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    // Example: const session = await getServerSession({ req: request });
    // if (!session?.user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    // Fetch all users' data (optimize with aggregation if using Prisma)
    // Note: Adjust includes based on your schema. Assuming relations: inventory -> collectible, trades as sentTrades/receivedTrades
    const users = await prisma.user.findMany({
      include: {
        inventory: {
          include: {
            collectible: true,
          },
        },
        sentTrades: true, // Assuming Trade model with senderId/receiverId relations
        receivedTrades: true,
      },
    });

    // Compute leaderboard data
    const leaderboardData = users
      .map((user) => {
        const inventoryItems = user.inventory || [];
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

        // Compute score based on your rules
        const score =
          totalCards * 1 +
          uniqueCards * 5 +
          rareCards * 15 +
          legendaryCards * 30 +
          totalTrades * 10;

        // Cast to LeaderboardUser, handling nulls
        return {
          id: user.id,
          email: user.email,
          // @ts-ignore - Adjust schema to include username if missing
          username: (user as any).username || undefined,
          // @ts-ignore - Adjust schema to include name if missing
          name: (user as any).name || undefined,
          isAdmin: (user as any).isAdmin || false,
          totalCards,
          uniqueCards,
          rareCards,
          legendaryCards,
          totalTrades,
          score,
          // Temporarily omit rank here; assign after sorting
        } as LeaderboardUser;
      })
      .sort((a, b) => b.score - a.score);

    // Assign ranks after sorting (handles ties by keeping original order or add tie-breaking logic)
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
