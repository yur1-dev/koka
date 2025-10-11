// app/api/inventory/send-offchain/route.ts
// FIXED: Changed lookup to use email instead of username since User model lacks username field; Updated variable usage accordingly; Kept findFirst for non-unique lookup

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { collectibleId, recipientUsername, amount } = body;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (typeof collectibleId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid collectible ID" },
        { status: 400 }
      );
    }

    if (
      typeof recipientUsername !== "string" ||
      recipientUsername.trim() === ""
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid recipient email" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const userPayload = await verifyToken(token);

    if (!userPayload) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    if (typeof amount !== "number" || amount < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid amount (must be at least 1)" },
        { status: 400 }
      );
    }

    // Find recipient by email using findFirst (email is unique but findFirst for consistency)
    const recipient = await prisma.user.findFirst({
      where: { email: recipientUsername },
    });

    if (!recipient) {
      return NextResponse.json(
        { success: false, message: "Recipient not found" },
        { status: 404 }
      );
    }

    if (recipient.id === userPayload.userId) {
      return NextResponse.json(
        { success: false, message: "Cannot send to yourself" },
        { status: 400 }
      );
    }

    // Find sender's item
    const senderItem = await prisma.inventoryItem.findUnique({
      where: {
        userId_collectibleId: {
          userId: userPayload.userId,
          collectibleId,
        },
      },
    });

    if (!senderItem || senderItem.quantity < amount) {
      return NextResponse.json(
        { success: false, message: "Insufficient quantity" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Decrement sender's inventory
      await tx.inventoryItem.update({
        where: { id: senderItem.id },
        data: { quantity: { decrement: amount } },
      });

      // Check updated sender quantity and delete if 0
      const updatedSenderItem = await tx.inventoryItem.findUnique({
        where: { id: senderItem.id },
      });
      if (updatedSenderItem && updatedSenderItem.quantity < 1) {
        await tx.inventoryItem.delete({
          where: { id: senderItem.id },
        });
      }

      // Increment receiver's inventory
      await tx.inventoryItem.upsert({
        where: {
          userId_collectibleId: {
            userId: recipient.id,
            collectibleId,
          },
        },
        update: { quantity: { increment: amount } },
        create: {
          userId: recipient.id,
          collectibleId,
          quantity: amount,
          isClaimed: true,
          receivedVia: "offchain_send",
        },
      });
    });

    return NextResponse.json({ success: true, message: "Sent!" });
  } catch (error) {
    console.error("Send off-chain error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Send failed" },
      { status: 500 }
    );
  }
}
