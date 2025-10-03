import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Check if InventoryItem table exists, return empty array if not
    try {
      const inventory = await prisma.inventoryItem.findMany({
        where: { userId: payload.userId },
        include: {
          collectible: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              rarity: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        inventory,
      });
    } catch (dbError: any) {
      // If table doesn't exist yet, return empty inventory
      if (dbError.code === "P2021" || dbError.code === "P2009") {
        return NextResponse.json({
          success: true,
          inventory: [],
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load inventory" },
      { status: 500 }
    );
  }
}
