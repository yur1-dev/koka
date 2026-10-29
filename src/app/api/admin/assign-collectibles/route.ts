import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { userId, collectibleId, quantity = 1 } = await request.json();
    const qty = Math.floor(Number(quantity));

    if (!userId || !collectibleId || !Number.isFinite(qty) || qty < 1 || qty > 100) {
      return NextResponse.json(
        { success: false, message: "User, collectible and a quantity of 1-100 are required" },
        { status: 400 }
      );
    }

    const [user, collectible] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.collectible.findUnique({ where: { id: collectibleId } }),
    ]);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    if (!collectible) {
      return NextResponse.json({ success: false, message: "Collectible not found" }, { status: 404 });
    }
    if (
      collectible.maxSupply != null &&
      collectible.currentSupply + qty > collectible.maxSupply
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${Math.max(0, collectible.maxSupply - collectible.currentSupply)} copies of ${collectible.name} are left`,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.inventoryItem.upsert({
        where: { userId_collectibleId: { userId, collectibleId } },
        update: { quantity: { increment: qty } },
        create: { userId, collectibleId, quantity: qty, receivedVia: "admin" },
      }),
      prisma.collectible.update({
        where: { id: collectibleId },
        data: { currentSupply: { increment: qty } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Gave ${qty} x ${collectible.name}`,
    });
  } catch (error) {
    console.error("Assign collectible error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
