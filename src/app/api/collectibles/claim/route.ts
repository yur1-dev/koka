// app/api/collectibles/claim/route.ts
// FIXED: Proper imports and types

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { collectibleId } = await req.json();
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const userPayload = await verifyToken(token);

    if (!userPayload) {
      return NextResponse.json({ success: false }, { status: 401 });
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
