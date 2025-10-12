// app/api/whitelist/status/route.ts (New file for status)
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const spotsRemaining = Math.max(0, 50 - userCount);
    const isWhitelistOpen = spotsRemaining > 0;

    return NextResponse.json({
      success: true,
      totalUsers: userCount,
      spotsRemaining,
      isWhitelistOpen,
      whitelistLimit: 50,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch whitelist status" },
      { status: 500 }
    );
  }
}
