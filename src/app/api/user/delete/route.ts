// app/api/user/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";


export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { confirmation } = body;

    if (!confirmation || confirmation !== "delete my account") {
      return NextResponse.json(
        { error: "Confirmation phrase required" },
        { status: 400 }
      );
    }

    // Marketplace history is kept for both sides of a sale, so those accounts cannot be removed yet
    const sales = await prisma.transaction.count({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    });
    if (sales > 0) {
      return NextResponse.json(
        { error: "Accounts with marketplace sales can't be deleted yet. Contact support." },
        { status: 409 }
      );
    }

    // Delete related data
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    // Add other deletions if necessary, e.g., trades, etc.
    // await prisma.trade.deleteMany({ where: { userId: { in: [userId] } } }); // example

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
