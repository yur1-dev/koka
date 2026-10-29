// app/api/marketplace/buy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { SOLANA_RPC_URL } from "@/lib/solana";

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

class BuyError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

async function fetchPayment(signature: string) {
  // The RPC can lag a moment behind the wallet's confirmation.
  for (let attempt = 0; attempt < 6; attempt++) {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx) return tx;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

/**
 * Buying = paying the seller in SOL on devnet, then claiming the card.
 * The client sends the payment signature; we check on-chain that it really
 * paid this seller at least the listing price, and that it was never used before.
 */
export async function POST(req: NextRequest) {
  try {
    const { listingId, signature } = await req.json();

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return fail("Please sign in again", 401);
    const userPayload = await verifyToken(token);
    if (!userPayload) return fail("Please sign in again", 401);

    if (typeof listingId !== "string") return fail("Invalid listing");
    if (typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(signature)) {
      return fail("Missing or invalid payment signature");
    }

    const [listing, buyer, alreadyUsed] = await Promise.all([
      prisma.marketplaceListing.findUnique({
        where: { id: listingId },
        include: {
          user: { select: { id: true, walletAddress: true } },
          collectible: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userPayload.userId },
        select: { id: true, walletAddress: true },
      }),
      prisma.transaction.findUnique({ where: { txSignature: signature } }),
    ]);

    if (!buyer) return fail("Account not found", 404);
    if (alreadyUsed) return fail("This payment was already used for a purchase");
    if (!listing || listing.status !== "active" || listing.quantity < 1) {
      return fail("This listing is no longer available", 404);
    }
    if (listing.userId === buyer.id) {
      return fail("You cannot buy your own listing");
    }
    const sellerWallet = listing.user.walletAddress;
    if (!sellerWallet) return fail("The seller has no wallet linked");

    // ---- Verify the payment on-chain ----
    const payment = await fetchPayment(signature);
    if (!payment) return fail("Payment not found on-chain yet, try again in a moment");
    if (payment.meta?.err) return fail("The payment transaction failed on-chain");

    const paidAfter = Math.floor(listing.updatedAt.getTime() / 1000) - 60;
    if (!payment.blockTime || payment.blockTime < paidAfter) {
      return fail("This payment is older than the listing");
    }

    const requiredLamports = Math.round(listing.price * LAMPORTS_PER_SOL);
    const transfer = payment.transaction.message.instructions.find((ix: any) => {
      const info = ix?.parsed?.info;
      return (
        ix?.program === "system" &&
        ix?.parsed?.type === "transfer" &&
        info?.destination === sellerWallet &&
        Number(info?.lamports) >= requiredLamports &&
        (!buyer.walletAddress || info?.source === buyer.walletAddress)
      );
    });
    if (!transfer) {
      return fail(
        `No payment of ${listing.price} SOL to the seller found in that transaction`
      );
    }

    // ---- Move the card, atomically ----
    await prisma.$transaction(async (tx) => {
      // Take one copy off the listing only if one is still there.
      const taken = await tx.marketplaceListing.updateMany({
        where: { id: listing.id, status: "active", quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });
      if (taken.count === 0) {
        throw new BuyError(
          `Someone bought it first. Your payment (${signature}) was not used, contact the seller for a refund`,
          409
        );
      }

      const left = await tx.marketplaceListing.findUnique({
        where: { id: listing.id },
        select: { quantity: true },
      });
      if (!left || left.quantity < 1) {
        await tx.marketplaceListing.update({
          where: { id: listing.id },
          data: { status: "sold" },
        });
      }

      const fromSeller = await tx.inventoryItem.updateMany({
        where: {
          userId: listing.userId,
          collectibleId: listing.collectibleId,
          quantity: { gte: 1 },
        },
        data: { quantity: { decrement: 1 } },
      });
      if (fromSeller.count === 0) {
        throw new BuyError("The seller no longer owns this card", 409);
      }
      await tx.inventoryItem.deleteMany({
        where: {
          userId: listing.userId,
          collectibleId: listing.collectibleId,
          quantity: { lt: 1 },
        },
      });

      await tx.inventoryItem.upsert({
        where: {
          userId_collectibleId: {
            userId: buyer.id,
            collectibleId: listing.collectibleId,
          },
        },
        update: { quantity: { increment: 1 } },
        create: {
          userId: buyer.id,
          collectibleId: listing.collectibleId,
          quantity: 1,
          receivedVia: "marketplace_buy",
        },
      });

      await tx.transaction.create({
        data: {
          buyerId: buyer.id,
          sellerId: listing.userId,
          collectibleId: listing.collectibleId,
          listingId: listing.id,
          txSignature: signature,
          price: listing.price,
          quantity: 1,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `You bought ${listing.collectible.name} for ${listing.price} SOL`,
    });
  } catch (error) {
    if (error instanceof BuyError) return fail(error.message, error.status);
    console.error("Marketplace buy error:", error);
    return fail("Purchase failed", 500);
  }
}
