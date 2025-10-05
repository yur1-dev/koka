// lib/auth-helpers.ts
import type { JWTPayload } from "./types";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "fallback-secret-change-me";

// Server-side functions (use in API routes only)
export function encodeJWT(payload: JWTPayload): string {
  // Only import jwt when running on server
  if (typeof window !== "undefined") {
    throw new Error("encodeJWT can only be used on server side");
  }

  const jwt = require("jsonwebtoken");
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyJWT(token: string): JWTPayload | null {
  // Only import jwt when running on server
  if (typeof window !== "undefined") {
    throw new Error("verifyJWT can only be used on server side");
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// Client-side function (decode without verification)
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // Simple base64 decode (no verification)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];

    // Handle both browser and Node.js environments
    let decodedPayload;
    if (typeof window !== "undefined") {
      // Browser environment
      decodedPayload = JSON.parse(atob(payload));
    } else {
      // Node.js environment
      decodedPayload = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8")
      );
    }

    // Check if token is expired
    if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
      console.log("Token expired");
      return null;
    }

    return decodedPayload as JWTPayload;
  } catch (error) {
    console.error("JWT decode failed:", error);
    return null;
  }
}

export function generateNonce(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
