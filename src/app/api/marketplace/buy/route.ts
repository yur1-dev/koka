// app/api/marketplace/buy/route.ts
// FIXED: Complete buy route with TypeScript fixes (handle undefined token, optional price, null checks, non-null assertions after validation)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const listingId = body.listingId;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (typeof listingId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid listing ID" },
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

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (
      !listing ||
      listing.status !== "active" ||
      listing.price == null ||
      listing.price <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Listing not available" },
        { status: 400 }
      );
    }

    const price = listing.price; // Non-null after check

    if (listing.userId === userPayload.userId) {
      return NextResponse.json(
        { success: false, message: "Cannot buy your own listing" },
        { status: 400 }
      );
    }

    const buyer = await prisma.user.findUnique({
      where: { id: userPayload.userId },
    });

    if (!buyer || buyer.points == null || buyer.points < price) {
      return NextResponse.json(
        { success: false, message: "Insufficient points" },
        { status: 400 }
      );
    }

    const buyerPoints = buyer.points; // Non-null after check

    await prisma.$transaction(async (tx) => {
      // Transfer points (decrement buyer, increment seller)
      await tx.user.update({
        where: { id: userPayload.userId },
        data: { points: { decrement: price } },
      });

      await tx.user.update({
        where: { id: listing.userId },
        data: { points: { increment: price } },
      });

      // Transfer item (upsert inventory for buyer)
      await tx.inventoryItem.upsert({
        where: {
          userId_collectibleId: {
            userId: userPayload.userId,
            collectibleId: listing.collectibleId,
          },
        },
        update: { quantity: { increment: listing.quantity } },
        create: {
          userId: userPayload.userId,
          collectibleId: listing.collectibleId,
          quantity: listing.quantity,
          isClaimed: true,
          receivedVia: "marketplace",
        },
      });

      // Mark listing as sold
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: "sold" },
      });
    });

    return NextResponse.json({ success: true, message: "Purchase complete!" });
  } catch (error) {
    console.error("Buy error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
