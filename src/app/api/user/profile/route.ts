// Install: npm install @vercel/blob
// Then replace /app/api/user/profile/route.ts with this full version (includes file uploads via Vercel Blob)
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
    console.error("GET Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load user profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("PUT started"); // Debug log (remove in prod)

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing auth header");
      return NextResponse.json(
        { success: false, message: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log("Token extracted");

    const decoded = verifyJWT(token) as JWTPayload | null;
    if (!decoded) {
      console.log("JWT verification failed");
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }
    console.log("JWT decoded, userId:", decoded.userId);

    const formData = await request.formData();
    console.log("FormData parsed");

    const name =
      (formData.get("name") as string)?.trim() || decoded.username || "";
    const bio = (formData.get("bio") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();

    console.log("Form fields:", { name, email, bio: bio ? "set" : "empty" });

    if (!name || !email) {
      console.log("Missing required fields");
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email format");
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserWithEmail && existingUserWithEmail.id !== decoded.userId) {
      console.log("Email already in use");
      return NextResponse.json(
        { success: false, message: "Email already in use" },
        { status: 409 }
      );
    }

    // Handle avatar upload with Vercel Blob
    let avatarUrl: string | undefined = decoded.avatarUrl;
    const avatarFile = formData.get("avatar") as File | null;
    if (avatarFile && avatarFile.size > 0) {
      console.log("Processing avatar upload");
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
      console.log("Avatar uploaded to:", url);
    }

    // Handle cover photo upload with Vercel Blob
    let coverUrl: string | undefined = decoded.coverUrl;
    const coverFile = formData.get("cover") as File | null;
    if (coverFile && coverFile.size > 0) {
      console.log("Processing cover upload");
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
      console.log("Cover uploaded to:", url);
    }

    console.log("Starting Prisma update");

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

    console.log("Prisma update successful");

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        username: updatedUser.name,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("PUT Error in profile update:", error); // Enhanced logging
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error), // Include for debugging
      },
      { status: 500 }
    );
  }
}
