// app/api/debug/route.ts
// Create this file to diagnose Vercel issues
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? "Vercel" : "Local",
    node_env: process.env.NODE_ENV,
  };

  // Test 1: Environment Variables
  results.env_check = {
    has_database_url: !!process.env.DATABASE_URL,
    has_jwt_secret: !!(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET),
    database_url_prefix: process.env.DATABASE_URL?.substring(0, 20) + "...",
  };

  // Test 2: Database Connection
  try {
    await prisma.$connect();
    results.database = { status: "connected" };

    // Test 3: User Count
    const userCount = await prisma.user.count();
    results.database.user_count = userCount;

    // Test 4: Sample User (without password)
    const sampleUser = await prisma.user.findFirst({
      select: { email: true, name: true },
    });
    results.database.sample_user_exists = !!sampleUser;

    await prisma.$disconnect();
  } catch (error) {
    results.database = {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 5: JWT Libraries
  try {
    const jwt = require("jsonwebtoken");
    results.jwt = { available: true };
  } catch {
    results.jwt = { available: false, error: "jsonwebtoken not found" };
  }

  // Test 6: Bcrypt
  try {
    const bcrypt = require("bcryptjs");
    results.bcrypt = { available: true };
  } catch {
    results.bcrypt = { available: false, error: "bcryptjs not found" };
  }

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
