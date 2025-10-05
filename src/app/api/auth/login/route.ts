// app/api/auth/login/route.ts
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  console.log("=== Login API Called ===");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  try {
    const body = await request.json();
    console.log("Body parsed successfully");
    const { username, password } = body;

    console.log("Login attempt for:", username);
    console.log("Has password:", !!password);

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Try to find user by email (which might be username@koka.local)
    console.log("Attempting to find user...");
    let user = await prisma.user.findUnique({
      where: { email: username },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        // avatarUrl: true,  // Temporarily removed to avoid Prisma validation error - add back after DB sync
        bio: true,
        walletAddress: true,
        isAdmin: true,
      },
    });
    console.log("First query result:", !!user);

    // If not found, try with @koka.local suffix
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: `${username}@koka.local` },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          // avatarUrl: true,  // Same here
          bio: true,
          walletAddress: true,
          isAdmin: true,
        },
      });
    }

    console.log("User found:", !!user);

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    console.log("Pre-bcrypt check");
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    // Generate JWT token - check env first
    console.log("Pre-JWT: Has secret?", !!process.env.JWT_SECRET);
    const tokenPayload = {
      userId: user.id,
      username: user.name || user.email,
      email: user.email,
      // avatarUrl: user.avatarUrl || undefined,  // Removed for now
      walletAddress: user.walletAddress || undefined,
      isAdmin: user.isAdmin,
    };
    const token = encodeJWT(tokenPayload);
    console.log("Post-JWT: Token generated?", !!token);

    console.log("Login successful");

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.name || user.email,
        email: user.email,
        // avatarUrl: user.avatarUrl || undefined,  // Removed for now
        walletAddress: user.walletAddress || undefined,
        isAdmin: user.isAdmin,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("=== Login Error ===");
    console.error(
      "Error type:",
      error instanceof Error ? error.constructor.name : typeof error
    );
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error("Full error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error instanceof Error ? error.message : String(error),
        }),
      } as AuthResponse,
      { status: 500 }
    );
  }
}
