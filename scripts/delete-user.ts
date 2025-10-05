import prisma from "@/lib/db";

async function main() {
  const emailToDelete = process.argv[2];

  if (!emailToDelete) {
    console.error(
      "Please provide an email: npx tsx scripts/delete-user.ts user@example.com"
    );
    process.exit(1);
  }

  const user = await prisma.user.delete({
    where: { email: emailToDelete },
  });

  console.log(`Deleted user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
