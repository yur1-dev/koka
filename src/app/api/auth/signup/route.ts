import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { hashPassword, encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, email } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required",
        } as AuthResponse,
        {
          status: 400,
        }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Username must be at least 3 characters",
        } as AuthResponse,
        {
          status: 400,
        }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        } as AuthResponse,
        {
          status: 400,
        }
      );
    }

    // Check if user already exists
    const existingUser = await mockDb.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Username already taken" } as AuthResponse,
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = hashPassword(password);
    const newUser = await mockDb.user.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        walletAddress: null,
        isAdmin: false,
      },
    });

    // Generate JWT token
    const token = encodeJWT({
      userId: newUser.id,
      username: newUser.username,
      isAdmin: newUser.isAdmin,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.isAdmin,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("[v0] Signup error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" } as AuthResponse,
      { status: 500 }
    );
  }
}
