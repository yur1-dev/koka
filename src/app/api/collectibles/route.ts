import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-db";

export async function GET() {
  try {
    const collectibles = await mockDb.collectible.findMany();

    return NextResponse.json({
      success: true,
      collectibles,
    });
  } catch (error) {
    console.error("[v0] Collectibles fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
