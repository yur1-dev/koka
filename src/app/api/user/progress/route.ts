// import { type NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db";
// import { verifyJWT } from "@/lib/auth-helpers";

// export async function GET(request: NextRequest) {
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

//     const user = await prisma.user.findUnique({
//       where: { id: payload.userId },
//       select: {
//         xp: true,
//         isVerified: true,
//       },
//     });

//     if (!user) {
//       return NextResponse.json(
//         { success: false, message: "User not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       xp: user.xp || 0,
//       isVerified: user.isVerified || false,
//     });
//   } catch (error) {
//     console.error("Error fetching user progress:", error);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch progress" },
//       { status: 500 }
//     );
//   }
// }
