// src/app/api/inventory/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth-helpers";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyJWT(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = params.id;

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Fetch inventory with collectible details
    const inventory = await prisma.inventoryItem.findMany({
      where: { userId },
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
      orderBy: [{ collectible: { rarity: "desc" } }, { quantity: "desc" }],
    });

    return NextResponse.json({
      success: true,
      inventory: inventory.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        collectible: item.collectible,
      })),
    });
  } catch (error) {
    console.error("Error fetching user inventory:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
