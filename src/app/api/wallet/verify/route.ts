import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, nonce } = body;

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json(
        {
          success: false,
          message: "Wallet address, signature, and nonce are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Find the nonce
    const nonceRecord = await mockDb.walletNonce.findFirst({
      where: { walletAddress, used: false },
    });

    if (!nonceRecord || nonceRecord.nonce !== nonce) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired nonce" } as AuthResponse,
        {
          status: 401,
        }
      );
    }

    if (nonceRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: "Nonce has expired" } as AuthResponse,
        { status: 401 }
      );
    }

    // Mark nonce as used
    await mockDb.walletNonce.update({
      where: { id: nonceRecord.id },
      data: { used: true },
    });

    // Check if user exists with this wallet
    let user = await mockDb.user.findUnique({ where: { walletAddress } });

    // If user doesn't exist, create one
    if (!user) {
      user = await mockDb.user.create({
        data: {
          username: `wallet_${walletAddress.slice(0, 8)}`,
          walletAddress,
          passwordHash: null,
          email: null,
          isAdmin: false,
        },
      });
    }

    // Generate JWT token
    const token = encodeJWT({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("[v0] Wallet verification error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" } as AuthResponse,
      { status: 500 }
    );
  }
}
