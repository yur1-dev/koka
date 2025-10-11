// app/api/marketplace/list/route.ts (FIXED: Use findFirst/update by ID instead of compound unique for MarketplaceListing; No inventory decrement; Validates price/quantity; Upsert logic via conditional update/create; Consistent auth/logging)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { collectibleId, price, quantity = 1 } = body;

    console.log("=== LISTING REQUEST ===", { collectibleId, price, quantity });

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (typeof collectibleId !== "string") {
      console.log("Invalid collectible ID");
      return NextResponse.json(
        { success: false, message: "Invalid collectible ID" },
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
    console.log("User payload after verification:", userPayload?.userId);

    if (!userPayload) {
      console.log("Invalid token or no userId");
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    if (
      typeof price !== "number" ||
      isNaN(price) ||
      price <= 0 ||
      price > 10000
    ) {
      console.log("Invalid price:", price);
      return NextResponse.json(
        {
          success: false,
          message: "Valid price required (positive number, max 10000 SOL)",
        },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || qty > 1000) {
      console.log("Invalid quantity:", quantity);
      return NextResponse.json(
        { success: false, message: "Valid quantity required (1-1000)" },
        { status: 400 }
      );
    }

    // Check inventory (must have enough, but no decrement)
    const item = await prisma.inventoryItem.findUnique({
      where: {
        userId_collectibleId: {
          userId: userPayload.userId,
          collectibleId,
        },
      },
    });

    console.log(
      "Found inventory item:",
      item ? { id: item.id, quantity: item.quantity } : null
    );

    if (!item || item.quantity < qty) {
      console.log("Insufficient quantity or item not found");
      return NextResponse.json(
        { success: false, message: "Insufficient quantity to list" },
        { status: 400 }
      );
    }

    // Check for existing active listing
    const existingListing = await prisma.marketplaceListing.findFirst({
      where: {
        userId: userPayload.userId,
        collectibleId,
        status: "active",
      },
    });

    if (existingListing) {
      console.log("Active listing already exists");
      return NextResponse.json(
        {
          success: false,
          message: "You already have an active listing for this item",
        },
        { status: 400 }
      );
    }

    console.log("Starting transaction...");
    await prisma.$transaction(async (tx) => {
      // Conditional upsert logic (update if exists, else create; no inventory change)
      const anyExisting = await tx.marketplaceListing.findFirst({
        where: {
          userId: userPayload.userId,
          collectibleId,
        },
      });

      if (anyExisting) {
        await tx.marketplaceListing.update({
          where: { id: anyExisting.id },
          data: {
            price,
            quantity: qty,
            status: "active",
          },
        });
      } else {
        await tx.marketplaceListing.create({
          data: {
            userId: userPayload.userId,
            collectibleId,
            price,
            quantity: qty,
            status: "active",
          },
        });
      }
      console.log("Listing upserted successfully");
    });

    console.log("=== LISTING SUCCESS ===");
    return NextResponse.json({ success: true, message: "Listed!" });
  } catch (error) {
    console.error("=== LISTING ERROR ===", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Listing failed" },
      { status: 500 }
    );
  }
}
