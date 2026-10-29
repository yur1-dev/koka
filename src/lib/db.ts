// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
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
      // Do not kill the process: the next query will retry the connection
      console.error("✗ Prisma connection failed:", error);
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
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown); // Graceful dev shutdown
}

export default prisma;
