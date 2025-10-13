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
    BLOB_READ_WRITE_TOKEN: z.string(),
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
  })
  .parse(process.env);

export const publicEnv = {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_SOLANA_RPC_URL: env.NEXT_PUBLIC_SOLANA_RPC_URL,
};
