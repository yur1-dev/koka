import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Find user by email (since your schema uses email, not username)
    const user = await prisma.user.findUnique({
      where: { email: username }, // Using email field as username
    });

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
      username: user.email, // or user.name if you prefer
      isAdmin: false, // Add isAdmin field to your schema if needed
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.email,
        isAdmin: false,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" } as AuthResponse,
      { status: 500 }
    );
  }
}
