import prisma from "@/lib/db";

async function main() {
  console.log("Deleting all users...");

  const result = await prisma.user.deleteMany({});

  console.log(`Deleted ${result.count} users`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
