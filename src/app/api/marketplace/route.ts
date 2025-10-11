// app/api/marketplace/route.ts (UNCHANGED: Already good; Optional auth, fetches active listings correctly)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Optional: Auth for personalized views (e.g., own listings first), but public for browsing
    const authHeader = request.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId;
        }
      } catch (authErr) {
        console.error("Auth error in marketplace fetch:", authErr);
        // Continue without userId, as auth is optional
      }
    }

    // Fetch active listings with relations
    const listings = await prisma.marketplaceListing.findMany({
      where: {
        status: "active",
      },
      include: {
        collectible: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            rarity: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true, // Fallback if no name
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Recent first
      },
    });

    // Map to frontend interface (sellerName from user.name or email prefix)
    const formattedListings = listings.map((listing) => ({
      id: listing.id,
      sellerId: listing.userId,
      sellerName:
        listing.user.name || listing.user.email?.split("@")[0] || "Unknown",
      collectibleId: listing.collectibleId,
      collectible: listing.collectible,
      price: listing.price,
      quantity: listing.quantity,
      listedAt: listing.createdAt.toISOString(),
      status: listing.status as "active" | "sold" | "cancelled",
    }));

    return NextResponse.json({
      success: true,
      listings: formattedListings,
    });
  } catch (error) {
    console.error("Fetch marketplace error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
