import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const userId = payload.sub;
    if (!userId) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { emailNotifications, publicProfile, walletAddress } = body;

    // Build updates safely using Prisma's UserUpdateInput type
    const updates: Prisma.UserUpdateInput = {};

    if (typeof emailNotifications === "boolean") {
      updates.emailNotifications = emailNotifications;
    }
    if (typeof publicProfile === "boolean") {
      updates.publicProfile = publicProfile;
    }
    if (
      walletAddress !== undefined &&
      (typeof walletAddress === "string" || walletAddress === null)
    ) {
      updates.walletAddress = walletAddress;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        emailNotifications: true,
        publicProfile: true,
        walletAddress: true,
      },
    });

    return NextResponse.json({
      ...updatedUser,
      message: "Preferences updated successfully",
    });
  } catch (error: any) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error("Preferences update error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
