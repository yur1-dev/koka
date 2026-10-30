import { type NextRequest, NextResponse } from "next/server";
import { createNonce, signInMessage } from "@/lib/wallet-nonce";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return NextResponse.json(
        { success: false, message: "A valid wallet address is required" },
        { status: 400 }
      );
    }

    const nonce = createNonce(walletAddress);
    return NextResponse.json({
      success: true,
      nonce,
      message: signInMessage(walletAddress, nonce),
    });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
