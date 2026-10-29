import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public list of active listings. Anyone can browse; buying needs a login.
export async function GET() {
  try {
    const listings = await prisma.marketplaceListing.findMany({
      where: { status: "active", quantity: { gte: 1 } },
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
            username: true,
            email: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      listings: listings.map((listing) => ({
        id: listing.id,
        sellerId: listing.userId,
        sellerName:
          listing.user.username ||
          listing.user.name ||
          listing.user.email?.split("@")[0] ||
          "Unknown",
        sellerWallet: listing.user.walletAddress,
        collectibleId: listing.collectibleId,
        collectible: listing.collectible,
        price: listing.price,
        quantity: listing.quantity,
        listedAt: listing.createdAt.toISOString(),
        status: listing.status,
      })),
    });
  } catch (error) {
    console.error("Fetch marketplace error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load the marketplace" },
      { status: 500 }
    );
  }
}
