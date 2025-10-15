import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyJWT, extractTokenFromHeader } from "@/lib/auth-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("\n=== PASSWORD CHANGE API ===");

    // Extract and verify token
    const authHeader = req.headers.get("Authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log("❌ No token found in Authorization header");
      return NextResponse.json(
        { message: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    console.log("✓ Token extracted");

    // Verify token using helper (same method as login)
    const payload = verifyJWT(token);

    if (!payload) {
      console.log("❌ Token verification failed");
      return NextResponse.json(
        { message: "Unauthorized - Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    console.log("✓ Token verified, userId:", userId);

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("✓ Body parsed");
    } catch (parseError) {
      console.error("❌ Body parse error:", parseError);
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      console.log("❌ User not found:", userId);
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        { message: "Password not set. Please use password reset." },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      console.log("❌ Invalid current password");
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    console.log("✓ Current password verified");

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    console.log("✅ Password updated successfully for user:", userId);

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Password change error:", error);

    return NextResponse.json(
      {
        message: "Failed to update password",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message || String(error),
        }),
      },
      { status: 500 }
    );
  }
}
