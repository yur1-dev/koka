// app/api/wallet/link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // FIXED: Import from lib/auth.ts (create this file if missing)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { walletAddress } = await req.json();
  if (!walletAddress || !/^[\w]{32,44}$/.test(walletAddress)) {
    // Basic Solana addr validation
    return NextResponse.json(
      { success: false, message: "Invalid wallet address" },
      { status: 400 }
    );
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wallet link error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to link wallet" },
      { status: 500 }
    );
  }
}
