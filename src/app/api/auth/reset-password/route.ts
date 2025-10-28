import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface ResetPasswordInput {
  email: string;
  password: string;
  token: string;
}

interface ResetTokenPayload {
  userId: string;
  email: string;
  action: string;
}

export async function POST(request: NextRequest) {
  console.log("🔥 API /auth/reset-password HIT - Starting...");

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.log("❌ Invalid content-type:", contentType);
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, token }: ResetPasswordInput = body;

    console.log("📥 Body parsed:", {
      email,
      hasPassword: !!password,
      hasToken: !!token,
    });

    // Validation
    if (!email || !email.includes("@")) {
      console.log("❌ Invalid email:", email);
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      console.log("❌ Invalid password length");
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (!token) {
      console.log("❌ Token missing");
      return NextResponse.json(
        { error: "Reset token required" },
        { status: 400 }
      );
    }

    console.log("✅ Validations passed - Verifying token...");

    // Verify the JWT token
    let decoded: ResetTokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as ResetTokenPayload;
      console.log("✅ Token verified for user:", decoded.userId);
    } catch (err) {
      console.log("❌ Token verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 401 }
      );
    }

    // Verify the token is for password reset
    if (decoded.action !== "reset") {
      console.log("❌ Token is not a reset token");
      return NextResponse.json(
        { error: "Invalid token type" },
        { status: 401 }
      );
    }

    // Verify email matches
    if (decoded.email !== email) {
      console.log("❌ Email mismatch");
      return NextResponse.json(
        { error: "Email does not match token" },
        { status: 401 }
      );
    }

    console.log("🔍 Fetching user...");

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("❌ User not found:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("🔐 Hashing new password...");

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("💾 Updating password...");

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log("✅ Password updated successfully for user:", user.id);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("💥 Full reset password error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
