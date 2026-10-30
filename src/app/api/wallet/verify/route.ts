import { type NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import prisma from "@/lib/db";
import { encodeJWT } from "@/lib/auth-helpers";
import { checkNonce, signInMessage } from "@/lib/wallet-nonce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, nonce } = await request.json();

    if (!walletAddress || !signature || !nonce) {
      return fail("Wallet address, signature and nonce are required", 400);
    }

    if (!checkNonce(walletAddress, nonce)) {
      return fail("That sign-in request expired. Try again.", 401);
    }

    // The signature must really come from the wallet that is logging in
    let valid = false;
    try {
      valid = nacl.sign.detached.verify(
        new TextEncoder().encode(signInMessage(walletAddress, nonce)),
        bs58.decode(signature),
        bs58.decode(walletAddress)
      );
    } catch {
      valid = false;
    }
    if (!valid) return fail("Signature check failed", 401);

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) {
      return fail(
        "No KŌKA account is linked to this wallet. Sign up first, then link your wallet from your profile.",
        404
      );
    }

    const token = encodeJWT({
      userId: user.id,
      username: user.username || user.name || user.email,
      email: user.email,
      avatarUrl: user.image || undefined,
      walletAddress: user.walletAddress || undefined,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, username: user.username || user.name, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return fail("Internal server error", 500);
  }
}
