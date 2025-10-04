import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  console.log("=== Signup API Called ===");

  try {
    const body = await request.json();
    const { username, password, email } = body;

    console.log("Received:", { username, hasPassword: !!password, email });

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Username must be at least 3 characters",
        } as AuthResponse,
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Use email if provided, otherwise use username as email
    const userEmail = email || `${username}@koka.local`;

    console.log("Checking for existing user with email:", userEmail);

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      console.log("User already exists");
      return NextResponse.json(
        { success: false, message: "User already exists" } as AuthResponse,
        { status: 409 }
      );
    }

    console.log("Hashing password...");
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log("Creating user in database...");
    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        email: userEmail,
        name: username,
        password: hashedPassword,
        isAdmin: false,
      },
    });

    console.log("User created:", newUser.id);

    // Generate JWT token
    const token = encodeJWT({
      userId: newUser.id,
      username: newUser.name || newUser.email,
      isAdmin: newUser.isAdmin,
    });

    console.log("Token generated successfully");

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.name || newUser.email,
        isAdmin: newUser.isAdmin,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("=== Signup Error ===");
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
          stack: error instanceof Error ? error.stack : undefined,
        }),
      } as AuthResponse,
      { status: 500 }
    );
  }
}
