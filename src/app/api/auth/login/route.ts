import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  console.log("=== Login API Called ===");

  try {
    const body = await request.json();
    const { username, password } = body;

    console.log("Login attempt for:", username);

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
    let user = await prisma.user.findUnique({
      where: { email: username },
    });

    // If not found, try with @koka.local suffix
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: `${username}@koka.local` },
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

    // Generate JWT token
    const token = encodeJWT({
      userId: user.id,
      username: user.name || user.email,
      isAdmin: user.isAdmin,
    });

    console.log("Login successful");

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.name || user.email,
        isAdmin: user.isAdmin,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("=== Login Error ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Full error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error?.message,
        }),
      } as AuthResponse,
      { status: 500 }
    );
  }
}
