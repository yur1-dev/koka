import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { generateNonce } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Generate a new nonce
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store the nonce
    await mockDb.walletNonce.create({
      data: {
        walletAddress,
        nonce,
        expiresAt,
        used: false,
        userId: null,
      },
    });

    return NextResponse.json({
      success: true,
      nonce,
      message: `Sign this message to authenticate: ${nonce}`,
    });
  } catch (error) {
    console.error("[v0] Nonce generation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
