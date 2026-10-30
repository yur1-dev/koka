// app/api/wallet/link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { prisma } from "@/lib/db";


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
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json(
          { success: false, message: "That wallet is already linked to another account" },
          { status: 409 }
        );
      }
      console.error("Wallet link error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to link wallet" },
        { status: 500 }
      );
    }
  }
);
