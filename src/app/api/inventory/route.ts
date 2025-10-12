import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { collectibleId } = await req.json();
    if (!collectibleId) {
      return NextResponse.json(
        { success: false, message: "Missing collectibleId" },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Missing authorization token" },
        { status: 401 }
      );
    }

    const userPayload = verifyJWT(token);

    if (!userPayload?.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const item = await prisma.inventoryItem.findUnique({
      where: {
        userId_collectibleId: {
          userId: userPayload.userId,
          collectibleId,
        },
      },
    });

    if (!item || item.isClaimed) {
      return NextResponse.json(
        { success: false, message: "Already claimed or not yours" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { isClaimed: true, receivedVia: "claimed" },
      });
      await tx.user.update({
        where: { id: userPayload.userId },
        data: { hasClaimedStarter: true },
      });
    });

    return NextResponse.json({ success: true, message: "Claimed!" });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

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

    console.log(`Fetching inventory for user: ${payload.userId}`); // DEBUG

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

      console.log(`Inventory for ${payload.userId}: ${inventory.length} items`); // DEBUG

      return NextResponse.json({
        success: true,
        inventory,
      });
    } catch (dbError: any) {
      console.error("DB error in inventory fetch:", dbError);
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
