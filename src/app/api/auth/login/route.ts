// app/api/auth/login/route.ts
import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("\n=== LOGIN API CALLED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("✓ Body parsed successfully");
    } catch (parseError) {
      console.error("✗ Failed to parse request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
        } as AuthResponse,
        { status: 400 }
      );
    }

    const { username, password } = body;

    console.log("Login attempt for:", username);
    console.log("Password provided:", !!password);
    console.log("Password length:", password?.length);

    // Validate input
    if (!username || !password) {
      console.log("✗ Missing username or password");
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Test database connection
    try {
      await prisma.$connect();
      console.log("✓ Database connected");
    } catch (dbConnectError) {
      console.error("✗ Database connection failed:", dbConnectError);
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          ...(process.env.NODE_ENV === "development" && {
            error:
              dbConnectError instanceof Error
                ? dbConnectError.message
                : String(dbConnectError),
          }),
        } as AuthResponse,
        { status: 500 }
      );
    }

    // Find user
    console.log("Searching for user...");
    let user;

    try {
      // First try exact match
      user = await prisma.user.findUnique({
        where: { email: username },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          avatarUrl: true,
          bio: true,
          walletAddress: true,
          isAdmin: true,
        },
      });
      console.log(
        "First query (exact match):",
        user ? "✓ Found" : "✗ Not found"
      );

      // If not found and doesn't contain @, try with @koka.local
      if (!user && !username.includes("@")) {
        const emailWithDomain = `${username}@koka.local`;
        console.log("Trying with domain:", emailWithDomain);

        user = await prisma.user.findUnique({
          where: { email: emailWithDomain },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            avatarUrl: true,
            bio: true,
            walletAddress: true,
            isAdmin: true,
          },
        });
        console.log(
          "Second query (with domain):",
          user ? "✓ Found" : "✗ Not found"
        );
      }
    } catch (dbError) {
      console.error("✗ Database query error:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          ...(process.env.NODE_ENV === "development" && {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          }),
        } as AuthResponse,
        { status: 500 }
      );
    }

    // Check if user exists
    if (!user) {
      console.log("✗ User not found");
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    console.log("✓ User found:", user.email);
    console.log("User has password:", !!user.password);

    // Check if user has password
    if (!user.password) {
      console.log("✗ User has no password set");
      return NextResponse.json(
        {
          success: false,
          message:
            "This account uses wallet authentication. Please use Phantom Wallet to login.",
        } as AuthResponse,
        { status: 401 }
      );
    }

    // Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log(
        "Password verification:",
        isValidPassword ? "✓ Valid" : "✗ Invalid"
      );
    } catch (bcryptError) {
      console.error("✗ Bcrypt error:", bcryptError);
      return NextResponse.json(
        {
          success: false,
          message: "Password verification failed",
          ...(process.env.NODE_ENV === "development" && {
            error:
              bcryptError instanceof Error
                ? bcryptError.message
                : String(bcryptError),
          }),
        } as AuthResponse,
        { status: 500 }
      );
    }

    if (!isValidPassword) {
      console.log("✗ Invalid password");
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    // Generate JWT token
    let token;
    try {
      token = encodeJWT({
        userId: user.id,
        username: user.name || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl || undefined,
        walletAddress: user.walletAddress || undefined,
        isAdmin: user.isAdmin,
      });
      console.log("✓ JWT token generated");
    } catch (jwtError) {
      console.error("✗ JWT encoding error:", jwtError);
      return NextResponse.json(
        {
          success: false,
          message: "Token generation failed",
          ...(process.env.NODE_ENV === "development" && {
            error:
              jwtError instanceof Error ? jwtError.message : String(jwtError),
          }),
        } as AuthResponse,
        { status: 500 }
      );
    }

    console.log("✓ Login successful");
    console.log("=== END LOGIN API ===\n");

    // Return success response
    const response: AuthResponse = {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.name || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl || undefined,
        walletAddress: user.walletAddress || undefined,
        isAdmin: user.isAdmin,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("\n=== UNEXPECTED LOGIN ERROR ===");
    console.error(
      "Error type:",
      error instanceof Error ? error.constructor.name : typeof error
    );
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );

    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }

    console.error("Full error object:", error);
    console.error("=== END ERROR ===\n");

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
