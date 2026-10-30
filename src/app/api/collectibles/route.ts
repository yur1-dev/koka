import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collectibles = await prisma.collectible.findMany({
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, collectibles });
  } catch (error) {
    console.error("Collectibles fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
