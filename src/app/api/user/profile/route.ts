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

    let avatarUrl: string | undefined;

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
        const filename = `${payload.userId}-${Date.now()}.${ext}`;
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

    // Build update data
    const updateData: any = {
      name: username,
      email,
      bio,
    };

    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl;
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
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
