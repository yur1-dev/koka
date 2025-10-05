import prisma from "@/lib/db";

async function main() {
  console.log("Starting backfill...");

  // Get all users ordered by creation date
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${users.length} users`);

  // Assign account numbers based on creation order
  for (let i = 0; i < users.length; i++) {
    await prisma.user.update({
      where: { id: users[i].id },
      data: {
        accountNumber: i + 1,
        hasReceivedAirdrop: false,
      },
    });
    console.log(`Updated user ${i + 1}/${users.length}: ${users[i].email}`);
  }

  console.log("Backfill complete!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
