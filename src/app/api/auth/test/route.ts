// app/api/auth/test/route.ts
// Create this file to test if your API routes work at all
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Test 1: Basic response
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {},
    };

    // Test 2: Environment variables
    results.tests.envVars = {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    };

    // Test 3: Prisma import
    try {
      const prisma = (await import("@/lib/db")).default;
      results.tests.prismaImport = "✅ Success";

      // Test 4: Database connection
      try {
        await prisma.$connect();
        results.tests.dbConnection = "✅ Connected";

        // Test 5: User count
        try {
          const count = await prisma.user.count();
          results.tests.userCount = `✅ ${count} users`;
        } catch (err) {
          results.tests.userCount = `❌ ${
            err instanceof Error ? err.message : String(err)
          }`;
        }

        await prisma.$disconnect();
      } catch (err) {
        results.tests.dbConnection = `❌ ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    } catch (err) {
      results.tests.prismaImport = `❌ ${
        err instanceof Error ? err.message : String(err)
      }`;
    }

    // Test 6: JWT helpers
    try {
      const { encodeJWT } = await import("@/lib/auth-helpers");
      const testToken = encodeJWT({
        userId: "test",
        username: "test",
        email: "test@test.com",
        isAdmin: false,
      });
      results.tests.jwtHelper = `✅ Token generated (${testToken.substring(
        0,
        20
      )}...)`;
    } catch (err) {
      results.tests.jwtHelper = `❌ ${
        err instanceof Error ? err.message : String(err)
      }`;
    }

    // Test 7: Bcrypt
    try {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.default.hash("test", 10);
      results.tests.bcrypt = `✅ Hash generated (${hash.substring(0, 20)}...)`;
    } catch (err) {
      results.tests.bcrypt = `❌ ${
        err instanceof Error ? err.message : String(err)
      }`;
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Fatal error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { message: "Use GET method for diagnostics" },
    { status: 405 }
  );
}
