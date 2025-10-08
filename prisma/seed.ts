// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create sample user (no username if not in schema)
  const user1 = await prisma.user.create({
    // Use create; adjust if email unique constraint
    data: {
      email: "test@example.com",
      name: "Test User",
      walletAddress: "F2so6zqK9dL5mN7pX8rT4vY3uW2eQ1oA0bC9dE8fG7hJ", // Full devnet wallet from your screenshot; use yours
    },
  });

  // Create sample collectibles with mintAddresses (devnet placeholders; see notes below)
  const earthGuardian = await prisma.collectible.create({
    data: {
      name: "KŌKA Earth Guardian",
      description: "Guardian of the ancient forest",
      imageUrl: "https://your-image-host.com/koka-earth-guardian.png", // Upload to IPFS/Cloudinary & replace
      rarity: "epic",
      mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC devnet; replace with your mint
    },
  });

  const originalWanderer = await prisma.collectible.create({
    data: {
      name: "Original Wanderer",
      description: "A common wanderer in the KŌKA world",
      imageUrl: "https://your-image-host.com/original-wanderer.png", // Upload & replace
      rarity: "common",
      mintAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // SAMO devnet; replace with your mint
    },
  });

  const collectibles = [earthGuardian, originalWanderer];

  // Create inventory for user1
  await Promise.all(
    collectibles.map((collectible) =>
      prisma.inventoryItem.create({
        data: {
          userId: user1.id,
          collectibleId: collectible.id,
          quantity: 1,
        },
      })
    )
  );

  console.log(
    "Seeding complete! Collectibles:",
    collectibles.map((c) => ({ name: c.name, mint: c.mintAddress }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
