// lib/otp.ts
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto"; // Built-in Node.js module for secure random
import { env } from "@/env";

const transporter = nodemailer.createTransport({
  // Fixed: 'createTransport' (not 'createTransporter')
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Tolerate self-signed certs in serverless envs like Vercel
  },
  pool: true, // Reuse connections across serverless invocations
  maxConnections: 1, // Limit for cold starts
  maxMessages: 5, // Per connection
});

// Use Gmail as sender (matches auth user to avoid rejection on Vercel)
const EMAIL_FROM = `"KŌKA" <${env.GMAIL_USER}>`; // Fixed: Uses GMAIL_USER instead of custom domain

export async function generateOtp(): Promise<string> {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit, cryptographically secure
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 12); // Bumped to 12 rounds for better security
}

export async function verifyOtp(
  hashedOtp: string,
  inputOtp: string
): Promise<boolean> {
  return bcrypt.compare(inputOtp, hashedOtp);
}

export async function sendEmailOtp(
  email: string,
  otp: string
): Promise<boolean> {
  try {
    console.log(`🚀 Sending OTP ${otp} to ${email} via Gmail`);

    // Optional: Verify transporter on cold start (logs auth issues)
    await transporter.verify();
    console.log("✅ Transporter verified");

    const result = await transporter.sendMail({
      from: EMAIL_FROM, // Now matches GMAIL_USER for Gmail compatibility
      to: email,
      subject: "Your KŌKA Verification Code",
      text: `Your 6-digit code is: ${otp}. Expires in 5 min. Don't share!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">KŌKA</h1>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Enter this code to continue:
            </p>
            
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2c3e50; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              This code expires in <strong>5 minutes</strong>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              Never share your verification code with anyone.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Gmail SMTP success: ${result.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Gmail send failed:`, {
      message: error.message,
      code: error.code, // e.g., 'EAUTH'
      command: error.command, // e.g., 'AUTH LOGIN'
      responseCode: error.responseCode || error.response?.code, // e.g., 535
      fullResponse: error.response || error.responseData || error,
    });
    // Clean up on failure
    transporter.close();
    return false;
  }
}
