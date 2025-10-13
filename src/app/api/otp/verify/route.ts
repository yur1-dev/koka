import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { encodeJWT } from "@/lib/auth-helpers"; // Your existing JWT encoder
import bcrypt from "bcryptjs"; // For password hashing

// Optional: Import if using starter pack
// import { grantStarterPack } from "@/app/api/auth/[...nextauth]/route";  // Adjust path

export async function POST(req: NextRequest) {
  try {
    const { email, otp, action, whitelistData, username, password } =
      await req.json();

    // Fetch OTP record
    const otpRecord = await prisma.otp.findUnique({
      where: { email },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    const isValid = await verifyOtp(otpRecord.otpHash, otp);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Delete used OTP
    await prisma.otp.delete({ where: { id: otpRecord.id } });

    let user;
    if (action === "login") {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else if (action === "signup") {
      // Check existing
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (existing) {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 409 }
        );
      }

      // Whitelist check if provided
      let isFounder = false;
      if (whitelistData) {
        const spotsResponse = await fetch(
          `${
            process.env.NEXTAUTH_URL || "http://localhost:3000"
          }/api/whitelist/status`
        );
        const spotsData = await spotsResponse.json();
        if (!spotsData.success || spotsData.spotsRemaining <= 0) {
          return NextResponse.json(
            { error: "Whitelist is full" },
            { status: 400 }
          );
        }
        isFounder = true;
      }

      // Generate accountNumber
      const maxAccount = await prisma.user.aggregate({
        _max: { accountNumber: true },
      });
      const nextAccountNumber = (maxAccount._max.accountNumber ?? 0) + 1;

      // Hash password if provided
      const hashedPassword = password
        ? await bcrypt.hash(password, 12)
        : undefined;

      // Create user
      user = await prisma.user.create({
        data: {
          email,
          username: username || email.split("@")[0],
          password: hashedPassword,
          name: username || email.split("@")[0],
          isAdmin: false,
          accountNumber: nextAccountNumber,
          points: 100,
          hasClaimedStarter: false,
          hasReceivedAirdrop: false,
          whitelistData: whitelistData || null,
          isFounder,
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          isAdmin: true,
          walletAddress: true,
        },
      });

      console.log(
        `✅ Created new user via OTP: ${user.username} (ID: ${user.id})`
      );

      // Grant starter pack if founder (uncomment & import if ready)
      // if (isFounder && whitelistData) {
      //   await grantStarterPack(user.id, whitelistData);
      // }
    }

    // TS narrowing: Exhaustive check (user is now guaranteed non-null)
    if (!user) {
      return NextResponse.json(
        { error: "User not found or creation failed" },
        { status: 500 }
      );
    }

    // Generate JWT
    const token = encodeJWT({
      userId: user.id,
      username: user.username || user.email,
      email: user.email,
      avatarUrl: user.image || undefined,
      walletAddress: user.walletAddress || undefined,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        avatarUrl: user.image || undefined,
        walletAddress: user.walletAddress || undefined,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
