// scripts/test-db.ts
// Run this with: npx tsx scripts/test-db.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log("Testing database connection...");

    // Test basic connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Test user query
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);

    // Test finding a specific user
    const testEmail = "test@koka.local";
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    console.log(`User with email ${testEmail}:`, user ? "Found" : "Not found");
  } catch (error) {
    console.error("❌ Database test failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
