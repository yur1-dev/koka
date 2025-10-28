// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { encodeJWT } from "@/lib/auth-helpers"; // Your existing JWT encoder
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(req: NextRequest) {
  try {
    // Check content-type header
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.log("❌ Invalid content-type for verify:", contentType);
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const { email, otp, action, whitelistData, username, password } =
      await req.json();

    console.log("📥 Verify body parsed:", { email, action });

    // Fetch OTP record
    const otpRecord = await prisma.otp.findUnique({
      where: { email },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      console.log("❌ Invalid/expired OTP for:", email);
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    const isValid = await verifyOtp(otpRecord.otpHash, otp);
    if (!isValid) {
      console.log("❌ OTP mismatch for:", email);
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Delete used OTP
    await prisma.otp.delete({ where: { id: otpRecord.id } });
    console.log("🗑️ OTP deleted for:", email);

    // ===== HANDLE RESET ACTION =====
    if (action === "reset") {
      console.log("🔐 Password reset OTP verified for:", email);

      // Find the user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log("❌ User not found for reset:", email);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Generate JWT token for password reset
      const resetToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          action: "reset",
        },
        JWT_SECRET,
        { expiresIn: "15m" } // Token expires in 15 minutes
      );

      console.log("✅ Reset token generated for user:", user.id);

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully",
        token: resetToken,
      });
    }

    // ===== HANDLE LOGIN ACTION =====
    let user;
    if (action === "login") {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      console.log("✅ Login successful for:", email);
    }
    // ===== HANDLE SIGNUP ACTION =====
    else if (action === "signup") {
      // Check existing (email or username)
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
        const baseUrl =
          process.env.NEXTAUTH_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";
        const spotsResponse = await fetch(`${baseUrl}/api/whitelist/status`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!spotsResponse.ok) {
          console.log("❌ Whitelist fetch failed:", spotsResponse.status);
          return NextResponse.json(
            { error: "Whitelist check failed" },
            { status: 500 }
          );
        }
        const spotsData = await spotsResponse.json();
        if (!spotsData.success || spotsData.spotsRemaining <= 0) {
          return NextResponse.json(
            { error: "Whitelist is full" },
            { status: 400 }
          );
        }
        isFounder = true;
        console.log("✅ Whitelist approved for:", email);
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

    // TS narrowing: Exhaustive check
    if (!user) {
      return NextResponse.json(
        { error: "User not found or creation failed" },
        { status: 500 }
      );
    }

    // Generate JWT for login/signup
    const token = encodeJWT({
      userId: user.id,
      username: user.username || user.email,
      email: user.email,
      avatarUrl: user.image || undefined,
      walletAddress: user.walletAddress || undefined,
      isAdmin: user.isAdmin,
    });

    console.log("🎉 Verify success - JWT issued for:", email);
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
  } catch (error: any) {
    console.error("💥 OTP verify error:", error);
    return NextResponse.json(
      { error: "Internal error", details: error.message },
      { status: 500 }
    );
  }
}
