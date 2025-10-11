// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  });

  // Add connection lifecycle logging
  client
    .$connect()
    .then(() => {
      if (process.env.NODE_ENV === "development") {
        console.log("✓ Prisma connected successfully");
      }
    })
    .catch((error) => {
      console.error("✗ Prisma connection failed:", error);
      // FIXED: Re-throw or handle gracefully to avoid silent failures
      process.exit(1); // Exit in prod if connect fails
    });

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Cleanup on serverless function shutdown (Vercel/Edge)
if (typeof process !== "undefined") {
  const shutdown = async () => {
    await prisma.$disconnect();
    if (process.env.NODE_ENV === "development") {
      console.log("✓ Prisma disconnected");
    }
  };

  process.on("beforeExit", shutdown);
  process.on("SIGTERM", shutdown); // FIXED: Better for serverless (Vercel fires this)
  process.on("SIGINT", shutdown); // Graceful dev shutdown
}

export default prisma;
