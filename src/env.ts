// env.ts (or src/env.ts – adjust path if needed)
import { z } from "zod";

export const env = z
  .object({
    // Database
    DATABASE_URL: z.string().url(),
    DATABASE_URL_POOLED: z.string().url().optional(),

    // Auth/JWT
    JWT_SECRET: z.string().min(32),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),

    // Public/Wallet
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(), // Made optional to avoid build failures if not yet set; add manual checks in Blob-using routes
    NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    // Gmail SMTP for OTPs
    GMAIL_USER: z.string().email("Invalid Gmail user email"),
    GMAIL_APP_PASSWORD: z
      .string()
      .min(16, "App password must be at least 16 characters"),
    EMAIL_FROM: z.string().email("Invalid from email"),

    // Optional additions based on your project (e.g., for auth/marketplace)
    NEXTAUTH_GOOGLE_ID: z.string().optional(), // If using Google OAuth dynamically
    RESEND_API_KEY: z.string().optional(), // Alternative to Gmail if you switch to Resend
  })
  .passthrough() // Allows extra env vars without throwing errors (e.g., Vercel-specific ones)
  .parse(process.env);

export const publicEnv = {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_SOLANA_RPC_URL: env.NEXT_PUBLIC_SOLANA_RPC_URL,
};

// Optional: Export typed env for use in other files (TypeScript inference)
export type Env = typeof env;
