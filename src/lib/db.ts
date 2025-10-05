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
    });

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Cleanup on serverless function shutdown
if (process.env.VERCEL) {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
