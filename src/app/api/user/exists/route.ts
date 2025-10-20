// app/api/user/exists/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth"; // Reuse your token verifier

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body; // Accepts username or email

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const userPayload = await verifyToken(token);
    if (!userPayload) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    if (typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Invalid query" },
        { status: 400 }
      );
    }

    // Flexible lookup: username OR email
    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ username: query.trim() }, { email: query.trim() }],
      },
      select: { id: true, username: true, email: true }, // Minimal
    });

    if (!exists || exists.id === userPayload.userId) {
      return NextResponse.json({
        success: false,
        message: "User not found or yourself",
      });
    }

    // Return display-friendly (hide email if username exists)
    const displayName =
      exists.username || exists.email?.split("@")[0] || "Unknown";

    return NextResponse.json({
      success: true,
      exists: true,
      displayName, // For modal: "@cooluser" or "user"
    });
  } catch (error) {
    console.error("User exists check error:", error);
    return NextResponse.json(
      { success: false, message: "Check failed" },
      { status: 500 }
    );
  }
}
