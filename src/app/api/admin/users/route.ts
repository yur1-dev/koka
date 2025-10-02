import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { decodeJWT } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Decode JWT to check if user is admin
    const payload = decodeJWT(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all users
    const users = await mockDb.user.findMany();

    // Remove sensitive data
    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
    }));

    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.error("[v0] Admin users fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
