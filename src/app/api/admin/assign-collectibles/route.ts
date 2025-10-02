import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { decodeJWT } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Decode JWT to check if user is admin
    const payload = decodeJWT(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, collectibleId, quantity = 1 } = body;

    if (!userId || !collectibleId) {
      return NextResponse.json(
        { success: false, message: "User ID and Collectible ID are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await mockDb.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if collectible exists
    const collectible = await mockDb.collectible.findUnique({
      where: { id: collectibleId },
    });
    if (!collectible) {
      return NextResponse.json(
        { success: false, message: "Collectible not found" },
        { status: 404 }
      );
    }

    // Check if user already has this collectible
    const existingInventory = await mockDb.inventoryItem.findMany({
      where: { userId },
    });
    const existingItem = existingInventory.find(
      (item) => item.collectibleId === collectibleId
    );

    if (existingItem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User already has this collectible. Feature to update quantity coming soon!",
        },
        { status: 400 }
      );
    }

    // Create inventory item
    const inventoryItem = await mockDb.inventoryItem.create({
      data: {
        userId,
        collectibleId,
        quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Collectible assigned successfully",
      inventoryItem,
    });
  } catch (error) {
    console.error("[v0] Admin assign collectible error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
