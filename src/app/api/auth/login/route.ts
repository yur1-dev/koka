// app/api/auth/login/route.ts
// FIXED: Changed select to match schema (avatarUrl -> image; removed bio if not in schema, but added to schema above).
// Use image for avatar. Added timeout handling consistency.

import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { encodeJWT } from "@/lib/auth-helpers";
import type { AuthResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("\n=== LOGIN API CALLED ===");
  console.log("Environment:", process.env.VERCEL ? "Vercel" : "Local");
  console.log("Timestamp:", new Date().toISOString());

  try {
    let body;
    try {
      body = await request.json();
      console.log("✓ Body parsed");
    } catch (parseError) {
      console.error("✗ Body parse error:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid request body" } as AuthResponse,
        { status: 400 }
      );
    }

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

    console.log("Login attempt:", username);

    try {
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Database connection timeout")),
            5000
          )
        ),
      ]);
      console.log("✓ Database connected");
    } catch (dbError) {
      console.error("✗ DB connection failed:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          ...(process.env.NODE_ENV === "development" && {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          }),
        } as AuthResponse,
        { status: 503 }
      );
    }

    let user;
    try {
      const userQuery = prisma.user.findUnique({
        where: { email: username },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          image: true, // FIXED: Use schema field (was avatarUrl)
          walletAddress: true,
          isAdmin: true,
        },
      });

      user = (await Promise.race([
        userQuery,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Query timeout")), 5000)
        ),
      ])) as any;

      if (!user && !username.includes("@")) {
        const altUserQuery = prisma.user.findUnique({
          where: { email: `${username}@koka.local` },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            image: true, // FIXED
            walletAddress: true,
            isAdmin: true,
          },
        });

        user = (await Promise.race([
          altUserQuery,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Query timeout")), 5000)
          ),
        ])) as any;
      }

      console.log("User found:", !!user);
    } catch (queryError) {
      console.error("✗ Query error:", queryError);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          ...(process.env.NODE_ENV === "development" && {
            error:
              queryError instanceof Error
                ? queryError.message
                : String(queryError),
          }),
        } as AuthResponse,
        { status: 500 }
      );
    }

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log("Password valid:", isValidPassword);
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
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    let token;
    try {
      token = encodeJWT({
        userId: user.id,
        username: user.name || user.email,
        email: user.email,
        avatarUrl: user.image || undefined, // FIXED: Map image to avatarUrl
        walletAddress: user.walletAddress || undefined,
        isAdmin: user.isAdmin,
      });
      console.log("✓ JWT generated");
    } catch (jwtError) {
      console.error("✗ JWT error:", jwtError);
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

    const duration = Date.now() - startTime;
    console.log(`✓ Login successful (${duration}ms)`);

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.name || user.email,
          email: user.email,
          avatarUrl: user.image || undefined, // FIXED
          walletAddress: user.walletAddress || undefined,
          isAdmin: user.isAdmin,
        },
      } as AuthResponse,
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("\n=== UNEXPECTED ERROR ===");
    console.error("Error:", error);

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
  } finally {
    if (process.env.VERCEL) {
      await prisma.$disconnect();
    }
  }
}
