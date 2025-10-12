// app/api/inventory/transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { PrismaClient } from "@prisma/client";
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const prisma = new PrismaClient();
const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
);

// Helper function to get next account number
async function getNextAccountNumber() {
  const max = await prisma.user.aggregate({
    _max: { accountNumber: true },
  });
  return (max._max.accountNumber ?? 0) + 1;
}

export const POST = auth(async (req: NextRequest) => {
  const session = (req as NextRequest & { auth: Session | null }).auth;
  if (!session?.user?.id || !session.user.walletAddress) {
    return NextResponse.json(
      { success: false, message: "Wallet not linked" },
      { status: 401 }
    );
  }

  const {
    collectibleId,
    recipientWallet,
    signature,
    amount = 1,
  } = await req.json();

  try {
    // Validate inputs
    if (!signature || !/^[\w]{43,88}$/.test(signature)) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 400 }
      );
    }
    if (!recipientWallet || !/^[\w]{32,44}$/.test(recipientWallet)) {
      return NextResponse.json(
        { success: false, message: "Invalid recipient wallet" },
        { status: 400 }
      );
    }

    // Fetch collectible
    const collectible = await prisma.collectible.findUnique({
      where: { id: collectibleId },
    });
    if (!collectible || !collectible.mintAddress) {
      return NextResponse.json(
        { success: false, message: "Invalid collectible" },
        { status: 400 }
      );
    }

    const mintPubkey = new PublicKey(collectible.mintAddress);
    const senderPubkey = new PublicKey(session.user.walletAddress);
    const recipientPubkey = new PublicKey(recipientWallet);

    // Verify transaction on chain
    const tx: ParsedTransactionWithMeta | null =
      await connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
    if (!tx) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 400 }
      );
    }

    // Verify transfer details
    const instructions = tx.transaction.message.instructions;
    const hasTransfer = instructions.some(
      (ix: any) =>
        ix.programId.equals(TOKEN_PROGRAM_ID) &&
        "parsed" in ix &&
        ix.parsed?.type === "transfer" &&
        ix.parsed?.info?.source === senderPubkey.toBase58() &&
        ix.parsed?.info?.destination === recipientPubkey.toBase58() &&
        ix.parsed?.info?.mint === mintPubkey.toBase58() &&
        ix.parsed?.info?.tokenAmount?.uiAmount === amount
    );

    if (!hasTransfer) {
      return NextResponse.json(
        { success: false, message: "Invalid transfer details" },
        { status: 400 }
      );
    }

    // Find or create recipient user
    let recipientUser = await prisma.user.findUnique({
      where: { walletAddress: recipientWallet },
    });

    if (!recipientUser) {
      // FIXED: Get account number and provide all required fields
      const accountNumber = await getNextAccountNumber();
      recipientUser = await prisma.user.create({
        data: {
          walletAddress: recipientWallet,
          email: `${recipientWallet.slice(0, 8)}@external.sol`,
          name: `Wallet ${recipientWallet.slice(0, 8)}`,
          accountNumber, // FIXED: Add this required field
          isAdmin: false,
          points: 0,
          hasClaimedStarter: false,
          hasReceivedAirdrop: false,
          isFounder: false,
        },
      });
    }

    // Update DB
    await prisma.$transaction(async (tx) => {
      const senderItem = await tx.inventoryItem.findUnique({
        where: {
          userId_collectibleId: {
            userId: session.user.id,
            collectibleId,
          },
        },
      });

      if (!senderItem || senderItem.quantity < amount) {
        throw new Error("Insufficient inventory quantity");
      }

      await tx.inventoryItem.update({
        where: {
          userId_collectibleId: {
            userId: session.user.id,
            collectibleId,
          },
        },
        data: { quantity: { decrement: amount } },
      });

      await tx.inventoryItem.upsert({
        where: {
          userId_collectibleId: {
            userId: recipientUser.id,
            collectibleId,
          },
        },
        create: {
          userId: recipientUser.id,
          collectibleId,
          quantity: amount,
        },
        update: { quantity: { increment: amount } },
      });
    });

    return NextResponse.json({ success: true, signature });
  } catch (error) {
    console.error("Transfer verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: (error as Error).message || "Transfer verification failed",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});
