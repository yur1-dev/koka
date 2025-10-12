// app/api/wallet/link/route.ts (AUTH.JS V5: Use `auth` wrapper; FIXED: Type req as NextRequest & { auth: Session | null } for TS compatibility)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const POST = auth(
  async (req: NextRequest & { auth: Session | null }) => {
    const session = req.auth;
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
    } finally {
      await prisma.$disconnect();
    }
  }
);
