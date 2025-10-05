// app/api/user/profile/route.ts
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";
import { put } from "@vercel/blob";
import type { JWTPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token) as JWTPayload | null;
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        walletAddress: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Return all user fields for auth context, mapping name to username for frontend consistency
    return NextResponse.json({
      success: true,
      id: user.id,
      username: user.name,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load user profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = verifyJWT(token) as JWTPayload | null;

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Parse form data using native FormData
    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim() || decoded.username;
    const bio = (formData.get("bio") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserWithEmail && existingUserWithEmail.id !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: "Email already in use" },
        { status: 409 }
      );
    }

    // Handle avatar upload with Vercel Blob
    let avatarUrl: string | undefined = decoded.avatarUrl;
    const avatarFile = formData.get("avatar") as File | null;
    if (avatarFile && avatarFile.size > 0) {
      if (avatarFile.size > 5 * 1024 * 1024) {
        // 5MB limit
        return NextResponse.json(
          { success: false, message: "Avatar must be less than 5MB" },
          { status: 400 }
        );
      }
      const { url } = await put(
        `avatars/${Date.now()}-${avatarFile.name}`,
        avatarFile,
        {
          access: "public",
        }
      );
      avatarUrl = url;
    }

    // Handle cover photo upload with Vercel Blob
    let coverUrl: string | undefined = decoded.coverUrl;
    const coverFile = formData.get("cover") as File | null;
    if (coverFile && coverFile.size > 0) {
      if (coverFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        return NextResponse.json(
          { success: false, message: "Cover photo must be less than 10MB" },
          { status: 400 }
        );
      }
      const { url } = await put(
        `covers/${Date.now()}-${coverFile.name}`,
        coverFile,
        {
          access: "public",
        }
      );
      coverUrl = url;
    }

    // Update user profile
    const updateData: any = {
      name,
      ...(email !== decoded.email && { email }),
      ...(bio !== undefined && { bio: bio || null }),
      ...(avatarUrl && { avatarUrl }),
      ...(coverUrl && { coverUrl }),
    };

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        coverUrl: true,
        walletAddress: true,
        isAdmin: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        username: updatedUser.name, // Map for frontend consistency
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
