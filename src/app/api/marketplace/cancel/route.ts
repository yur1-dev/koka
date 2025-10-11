// app/api/marketplace/cancel/route.ts (FIXED: No inventory change on cancel; Just set status to cancelled; Uses verifyJWT sync; Simplified logging; Handles auth consistently)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const listingId = body.listingId;

    console.log("=== CANCEL REQUEST ===", { listingId }); // Log incoming request

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (typeof listingId !== "string") {
      console.log("Invalid listing ID");
      return NextResponse.json(
        { success: false, message: "Invalid listing ID" },
        { status: 400 }
      );
    }

    if (!token) {
      console.log("No token provided");
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userPayload = verifyJWT(token);
    console.log("User payload after verification:", userPayload?.userId); // Log auth result

    if (!userPayload) {
      console.log("Invalid token or no userId");
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    console.log(
      "Found listing:",
      listing
        ? { id: listing.id, status: listing.status, userId: listing.userId }
        : null
    ); // Log listing lookup

    if (
      !listing ||
      listing.status !== "active" ||
      listing.userId !== userPayload.userId
    ) {
      console.log("Invalid listing for cancel");
      return NextResponse.json(
        {
          success: false,
          message: "Listing not found, inactive, or not yours",
        },
        { status: 400 }
      );
    }

    // Just cancel the listing (NO inventory change)
    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: "cancelled" },
    });

    console.log("Listing cancelled:", listingId); // Log success

    return NextResponse.json({ success: true, message: "Cancelled!" });
  } catch (error) {
    console.error("=== CANCEL ERROR ===", error); // Enhanced error logging
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Cancel failed" },
      { status: 500 }
    );
  }
}
