// app/api/marketplace/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

const MAX_PRICE = 10000;
const MIN_PRICE = 0.001;

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(req: NextRequest) {
  try {
    const { collectibleId, price, quantity = 1 } = await req.json();

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return fail("Please sign in again", 401);
    const userPayload = verifyJWT(token);
    if (!userPayload) return fail("Please sign in again", 401);

    if (typeof collectibleId !== "string") return fail("Invalid collectible");

    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < MIN_PRICE ||
      price > MAX_PRICE
    ) {
      return fail(`Price must be between ${MIN_PRICE} and ${MAX_PRICE} SOL`);
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
      return fail("Quantity must be a whole number between 1 and 1000");
    }

    // Buyers pay the seller's wallet directly, so the seller needs one linked.
    const seller = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: { walletAddress: true },
    });
    if (!seller?.walletAddress) {
      return fail(
        "Link your Phantom wallet in Settings before listing, so buyers can pay you"
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
    if (!item || item.quantity < qty) {
      return fail("You do not own enough copies to list");
    }

    const existing = await prisma.marketplaceListing.findUnique({
      where: {
        userId_collectibleId: {
          userId: userPayload.userId,
          collectibleId,
        },
      },
    });
    if (existing?.status === "active") {
      return fail("This card is already listed. Unlist it first to change the price");
    }

    if (existing) {
      await prisma.marketplaceListing.update({
        where: { id: existing.id },
        data: { price, quantity: qty, status: "active" },
      });
    } else {
      await prisma.marketplaceListing.create({
        data: {
          userId: userPayload.userId,
          collectibleId,
          price,
          quantity: qty,
          status: "active",
        },
      });
    }

    return NextResponse.json({ success: true, message: "Listed" });
  } catch (error) {
    console.error("Listing error:", error);
    return fail("Listing failed", 500);
  }
}
