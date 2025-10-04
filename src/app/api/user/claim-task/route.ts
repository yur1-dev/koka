// import { type NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db";
// import { verifyJWT } from "@/lib/auth-helpers";

// export async function POST(request: NextRequest) {
//   try {
//     const authHeader = request.headers.get("authorization");
//     const token = authHeader?.replace("Bearer ", "");

//     if (!token) {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     const payload = verifyJWT(token);
//     if (!payload) {
//       return NextResponse.json(
//         { success: false, message: "Invalid token" },
//         { status: 401 }
//       );
//     }

//     const body = await request.json();
//     const { taskId, xpReward } = body;

//     const user = await prisma.user.findUnique({
//       where: { id: payload.userId },
//       select: { xp: true },
//     });

//     if (!user) {
//       return NextResponse.json(
//         { success: false, message: "User not found" },
//         { status: 404 }
//       );
//     }

//     const newXP = (user.xp || 0) + xpReward;

//     await prisma.user.update({
//       where: { id: payload.userId },
//       data: { xp: newXP },
//     });

//     return NextResponse.json({
//       success: true,
//       xp: newXP,
//       message: `Claimed ${xpReward} XP!`,
//     });
//   } catch (error) {
//     console.error("Error claiming task:", error);
//     return NextResponse.json(
//       { success: false, message: "Failed to claim task" },
//       { status: 500 }
//     );
//   }
// }
