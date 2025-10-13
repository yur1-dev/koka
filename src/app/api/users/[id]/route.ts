// app/api/users/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Await params for dynamic [id]
    const { id } = await params;
    const userId = id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      );
    }

    // Select only schema-defined fields (User model)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true, // Added: From schema for display
        image: true, // For avatar mapping
        isAdmin: true,
        createdAt: true,
        walletAddress: true,
        // No bio/avatarUrl/coverUrl/followers/following in schema
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Map to frontend UserData interface (handle missing schema fields)
    const userData = {
      ...user,
      bio: "", // Default: Schema lacks; UI skips empty
      avatarUrl: user.image || null, // Map schema's 'image' (e.g., Google avatar)
      coverUrl: null, // Default: Schema lacks; UI uses fallback
      followers: 0, // Default: No Follow relation; add model if needed
      following: 0, // Default: No Follow relation; add model if needed
    };

    console.log(
      `✅ Profile loaded: ${
        userData.username || userData.name || userData.email
      } (ID: ${userId})`
    );

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    // Enhanced: Parse Prisma errors for better dev logs
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Detailed error:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, message: "Failed to load user profile" },
      { status: 500 }
    );
  }
}
