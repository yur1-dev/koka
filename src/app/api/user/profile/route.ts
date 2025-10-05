import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    const payload = verifyJWT(token);
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
        coverUrl: true, // ADD THIS
        isAdmin: true,
        createdAt: true,
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
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl, // ADD THIS
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

    const formData = await request.formData();
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const bio = formData.get("bio") as string;
    const avatarFile = formData.get("avatar") as File | null;
    const coverFile = formData.get("cover") as File | null; // ADD THIS

    let avatarUrl: string | undefined;
    let coverUrl: string | undefined; // ADD THIS

    // Handle avatar upload if provided
    if (avatarFile && avatarFile.size > 0) {
      try {
        const bytes = await avatarFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure avatars directory exists
        const avatarsDir = join(process.cwd(), "public", "avatars");
        if (!existsSync(avatarsDir)) {
          await mkdir(avatarsDir, { recursive: true });
        }

        // Create unique filename
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const filename = `avatar-${payload.userId}-${Date.now()}.${ext}`;
        const filepath = join(avatarsDir, filename);

        // Save file
        await writeFile(filepath, buffer);
        avatarUrl = `/avatars/${filename}`;
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return NextResponse.json(
          { success: false, message: "Failed to upload avatar" },
          { status: 500 }
        );
      }
    }

    // ADD THIS ENTIRE BLOCK - Handle cover photo upload
    if (coverFile && coverFile.size > 0) {
      try {
        const bytes = await coverFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure avatars directory exists (we'll use the same folder)
        const coversDir = join(process.cwd(), "public", "avatars");
        if (!existsSync(coversDir)) {
          await mkdir(coversDir, { recursive: true });
        }

        // Create unique filename
        const ext = coverFile.name.split(".").pop() || "jpg";
        const filename = `cover-${payload.userId}-${Date.now()}.${ext}`;
        const filepath = join(coversDir, filename);

        // Save file
        await writeFile(filepath, buffer);
        coverUrl = `/avatars/${filename}`;
      } catch (uploadError) {
        console.error("Cover upload error:", uploadError);
        return NextResponse.json(
          { success: false, message: "Failed to upload cover photo" },
          { status: 500 }
        );
      }
    }

    // Build update data
    const updateData: any = {
      name: username,
      email,
      bio,
    };

    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }

    if (coverUrl) {
      updateData.coverUrl = coverUrl; // ADD THIS
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true, // ADD THIS
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      avatarUrl: updatedUser.avatarUrl,
      coverUrl: updatedUser.coverUrl, // ADD THIS
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
