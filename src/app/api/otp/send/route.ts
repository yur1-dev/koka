import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateOtp, hashOtp, sendEmailOtp } from "@/lib/otp";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  console.log("🔥 API /otp/send HIT - Starting..."); // Logs to Vercel functions

  try {
    // Check content-type header (lenient for empty)
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.log("❌ Invalid content-type:", contentType);
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, action } = body;
    console.log("📥 Body parsed:", { email, action });

    if (!email || !email.includes("@")) {
      console.log("❌ Invalid email:", email);
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!action || !["login", "signup"].includes(action)) {
      console.log("❌ Invalid action:", action);
      return NextResponse.json(
        { error: "Valid action (login or signup) required" },
        { status: 400 }
      );
    }

    console.log("✅ Validations passed - Checking user...");

    if (action === "login") {
      if (!password) {
        return NextResponse.json(
          { error: "Password required for login" },
          { status: 400 }
        );
      }

      console.log("🔍 Checking user for login:", email);
      const user = await prisma.user.findUnique({ where: { email } });
      console.log("📊 User found for login:", !!user);

      if (!user || !user.password) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      console.log("🔑 Comparing password...");
      const isValidPw = await bcrypt.compare(password, user.password);
      if (!isValidPw) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    }

    if (action === "signup") {
      console.log("🔍 Checking existing user for:", email);
      const existing = await prisma.user.findUnique({ where: { email } });
      console.log("📊 Existing user found:", !!existing);

      if (existing) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    console.log("🆕 Generating OTP...");
    const otp = await generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log("🧹 Deleting old OTPs for:", email);
    await prisma.otp.deleteMany({ where: { email } });

    console.log("💾 Creating new OTP record...");
    await prisma.otp.create({
      data: { email, otpHash, expiresAt },
    });
    console.log("✅ OTP stored:", otp); // TODO: Remove for production

    console.log("📧 Sending email...");
    const sent = await sendEmailOtp(email, otp);
    console.log("📧 Sent result:", sent);

    if (!sent) {
      console.log("❌ Send failed - returning 500");
      return NextResponse.json(
        { error: "Failed to send OTP" },
        { status: 500 }
      );
    }

    console.log("🎉 Success - returning 200");
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    console.error("💥 Full OTP send error:", error); // This will show in Vercel logs if crash

    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
