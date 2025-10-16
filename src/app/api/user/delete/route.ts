// app/api/user/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

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
