import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyJWT } from "@/lib/auth-helpers";

type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Admin-only API guard. The token is verified (signature checked), then the
 * user is loaded from the database so a stale or forged isAdmin claim is
 * never trusted.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminCheck> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const payload = verifyJWT(token);
  const userId = payload?.userId || payload?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId };
}
