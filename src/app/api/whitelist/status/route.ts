import { NextResponse } from "next/server";
import { getWhitelistStatus } from "@/lib/whitelist";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getWhitelistStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("Whitelist status error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load whitelist status" },
      { status: 500 }
    );
  }
}
