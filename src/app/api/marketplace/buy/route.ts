import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId } = body;

    const authHeader = req.headers.get("Authorization");
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

    // Fetch listing with relations
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        user: { select: { id: true } },
        collectible: { select: { id: true, name: true } },
      },
    });

    if (!listing || listing.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Listing not found or inactive" },
        { status: 404 }
      );
    }

    if (listing.userId === userPayload.userId) {
      return NextResponse.json(
        { success: false, message: "Cannot buy your own listing" },
        { status: 400 }
      );
    }

    if (listing.quantity < 1) {
      return NextResponse.json(
        { success: false, message: "No quantity available" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Decrement listing quantity
      const updatedListing = await tx.marketplaceListing.update({
        where: { id: listingId },
        data: {
          quantity: { decrement: 1 },
        },
        select: { quantity: true, status: true },
      });

      // Set to sold if quantity <=0
      if (updatedListing.quantity <= 0) {
        await tx.marketplaceListing.update({
          where: { id: listingId },
          data: { status: "sold" },
        });
      }

      // Transfer 1 item: decrement seller inventory, increment buyer
      const sellerItem = await tx.inventoryItem.findUnique({
        where: {
          userId_collectibleId: {
            userId: listing.userId,
            collectibleId: listing.collectible.id,
          },
        },
      });

      if (!sellerItem || sellerItem.quantity < 1) {
        throw new Error("Seller insufficient inventory (integrity error)");
      }

      // Decrement seller
      await tx.inventoryItem.update({
        where: { id: sellerItem.id },
        data: { quantity: { decrement: 1 } },
      });

      // Clean up if seller quantity ==0
      const sellerUpdated = await tx.inventoryItem.findUnique({
        where: { id: sellerItem.id },
      });
      if (sellerUpdated && sellerUpdated.quantity < 1) {
        await tx.inventoryItem.delete({ where: { id: sellerItem.id } });
      }

      // Increment buyer (upsert)
      await tx.inventoryItem.upsert({
        where: {
          userId_collectibleId: {
            userId: userPayload.userId,
            collectibleId: listing.collectible.id,
          },
        },
        update: { quantity: { increment: 1 } },
        create: {
          userId: userPayload.userId,
          collectibleId: listing.collectible.id,
          quantity: 1,
          receivedVia: "marketplace_buy",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Purchased 1x ${listing.collectible.name} for ${listing.price} SOL`,
    });
  } catch (error) {
    console.error("Marketplace buy error:", error);
    return NextResponse.json(
      {
        success: false,
        message: (error as Error).message || "Purchase failed",
      },
      { status: 500 }
    );
  }
}
