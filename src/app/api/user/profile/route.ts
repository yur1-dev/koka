// /app/api/user/profile/route.ts
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
    console.log("PUT started");

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing auth header");
      return NextResponse.json(
        { success: false, message: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token) as JWTPayload | null;

    if (!decoded || !decoded.userId) {
      console.log("JWT verification failed");
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    console.log("JWT decoded, userId:", decoded.userId);

    // Fetch current user data FIRST
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    console.log("Current user fetched:", currentUser.email);

    // Parse form data
    const formData = await request.formData();
    console.log("FormData parsed");

    // Get form fields with proper fallbacks to current user data
    const name = (formData.get("name") as string)?.trim() || currentUser.name;
    const bio = formData.has("bio")
      ? (formData.get("bio") as string)?.trim()
      : currentUser.bio;
    const email =
      (formData.get("email") as string)?.trim().toLowerCase() ||
      currentUser.email;

    console.log("Form fields:", { name, email, bio: bio ? "set" : "empty" });

    // Validate required fields
    if (!name || !email) {
      console.log("Missing required fields");
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email format");
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check email uniqueness (only if email is being changed)
    if (email !== currentUser.email) {
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUserWithEmail) {
        console.log("Email already in use");
        return NextResponse.json(
          { success: false, message: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Extract files from formData
    const avatarFile = formData.get("avatar") as File | null;
    const coverFile = formData.get("cover") as File | null;

    console.log("Files received:", {
      avatar: avatarFile
        ? `${avatarFile.name} (${avatarFile.size} bytes, ${avatarFile.type})`
        : "none",
      cover: coverFile
        ? `${coverFile.name} (${coverFile.size} bytes, ${coverFile.type})`
        : "none",
    });

    // Handle avatar upload
    let avatarUrl = currentUser.avatarUrl;

    if (avatarFile && avatarFile.size > 0) {
      console.log("Processing avatar upload");

      if (avatarFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: "Avatar must be less than 5MB" },
          { status: 400 }
        );
      }

      try {
        // Validate file type
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "image/gif",
        ];
        if (!validTypes.includes(avatarFile.type)) {
          return NextResponse.json(
            {
              success: false,
              message: "Avatar must be an image (JPEG, PNG, WebP, or GIF)",
            },
            { status: 400 }
          );
        }

        const { url } = await put(
          `avatars/${decoded.userId}-${Date.now()}-${avatarFile.name}`,
          avatarFile,
          { access: "public" }
        );
        avatarUrl = url;
        console.log("Avatar uploaded to:", url);
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
        console.error("Upload error details:", {
          name: avatarFile.name,
          size: avatarFile.size,
          type: avatarFile.type,
          error:
            uploadError instanceof Error
              ? uploadError.message
              : String(uploadError),
        });
        return NextResponse.json(
          {
            success: false,
            message: "Failed to upload avatar",
            details:
              uploadError instanceof Error
                ? uploadError.message
                : String(uploadError),
          },
          { status: 500 }
        );
      }
    }

    // Handle cover photo upload
    let coverUrl = currentUser.coverUrl;

    if (coverFile && coverFile.size > 0) {
      console.log("Processing cover upload");

      if (coverFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: "Cover photo must be less than 10MB" },
          { status: 400 }
        );
      }

      try {
        // Validate file type
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "image/gif",
        ];
        if (!validTypes.includes(coverFile.type)) {
          return NextResponse.json(
            {
              success: false,
              message: "Cover must be an image (JPEG, PNG, WebP, or GIF)",
            },
            { status: 400 }
          );
        }

        const { url } = await put(
          `covers/${decoded.userId}-${Date.now()}-${coverFile.name}`,
          coverFile,
          { access: "public" }
        );
        coverUrl = url;
        console.log("Cover uploaded to:", url);
      } catch (uploadError) {
        console.error("Cover upload error:", uploadError);
        console.error("Upload error details:", {
          name: coverFile.name,
          size: coverFile.size,
          type: coverFile.type,
          error:
            uploadError instanceof Error
              ? uploadError.message
              : String(uploadError),
        });
        return NextResponse.json(
          {
            success: false,
            message: "Failed to upload cover photo",
            details:
              uploadError instanceof Error
                ? uploadError.message
                : String(uploadError),
          },
          { status: 500 }
        );
      }
    }

    console.log("Starting Prisma update");

    // Build update data
    const updateData: any = {
      name,
      email,
      bio: bio || null,
    };

    // Only include URL fields if they were actually uploaded
    if (avatarUrl !== currentUser.avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }
    if (coverUrl !== currentUser.coverUrl) {
      updateData.coverUrl = coverUrl;
    }

    // Update user in database
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
    console.error("PUT Error in profile update:", error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
