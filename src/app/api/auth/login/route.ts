import { type NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";
import { verifyPassword, encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

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

    // Find user
    const user = await mockDb.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        {
          status: 401,
        }
      );
    }

    // Verify password
    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        {
          status: 401,
        }
      );
    }

    // Generate JWT token
    const token = encodeJWT({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("[v0] Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" } as AuthResponse,
      { status: 500 }
    );
  }
}
