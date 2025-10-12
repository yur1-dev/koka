// app/api/inventory/claim/route.ts
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
