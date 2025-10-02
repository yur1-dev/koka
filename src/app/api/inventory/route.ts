import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { decodeJWT } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
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

    // Decode JWT to get user ID
    const payload = decodeJWT(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Fetch user's inventory
    const inventory = await mockDb.inventoryItem.findMany({
      where: { userId: payload.userId },
    });

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error("[v0] Inventory fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
