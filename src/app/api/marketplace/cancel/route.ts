// app/api/marketplace/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

// Unlist: the card never left the seller's inventory, so only the listing changes.
export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return fail("Please sign in again", 401);
    const userPayload = verifyJWT(token);
    if (!userPayload) return fail("Please sign in again", 401);

    if (typeof listingId !== "string") return fail("Invalid listing");

    const result = await prisma.marketplaceListing.updateMany({
      where: {
        id: listingId,
        userId: userPayload.userId,
        status: "active",
      },
      data: { status: "cancelled" },
    });

    if (result.count === 0) {
      return fail("That listing is already gone or is not yours", 404);
    }

    return NextResponse.json({ success: true, message: "Unlisted" });
  } catch (error) {
    console.error("Unlist error:", error);
    return fail("Could not unlist", 500);
  }
}
