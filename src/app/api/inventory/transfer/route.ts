// app/api/inventory/transfer/route.ts (REMOVED: Type assertion for mintAddress - run `npx prisma generate` after schema update; FIXED: Cast req.auth to avoid TS error on NextRequest)
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
); // Use env var for RPC

export const POST = auth(async (req: NextRequest) => {
  const session = (req as NextRequest & { auth: Session | null }).auth; // FIXED: Type assertion on req to access auth
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
  } = await req.json(); // FIXED: Receive signature from frontend

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

    // Verify transaction on chain using getParsedTransaction for parsed instructions
    // FIXED: Switched to getParsedTransaction to avoid encoding TS error and get parsed data directly
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

    // Basic verification: Check if tx involves TOKEN_PROGRAM transfer of mint from sender to recipient
    // Note: In prod, use more robust parsing with @solana/web3.js transaction parsing
    const instructions = tx.transaction.message.instructions;
    const hasTransfer = instructions.some(
      (ix: any) =>
        ix.programId.equals(TOKEN_PROGRAM_ID) &&
        "parsed" in ix &&
        ix.parsed?.type === "transfer" && // FIXED: Type narrowing for parsed
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

    // Find or create recipient user by walletAddress
    let recipientUser = await prisma.user.findUnique({
      where: { walletAddress: recipientWallet },
    });
    if (!recipientUser) {
      // Auto-create placeholder user for external wallets
      recipientUser = await prisma.user.create({
        data: {
          walletAddress: recipientWallet,
          email: `${recipientWallet.slice(0, 8)}...@external.sol`, // Placeholder email
          name: `Wallet ${recipientWallet.slice(0, 8)}`, // Placeholder name
          // Add other required fields if needed, e.g., isAdmin: false
        },
      });
    }

    // Update DB (decrement sender, increment/create recipient inventory)
    await prisma.$transaction(async (tx) => {
      // Decrement sender: Find specific item and update
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

      // Upsert recipient inventory
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
