// prisma/seed.ts
import { prisma } from "@/lib/prisma"; // Use singleton

async function main() {
  // Create sample user
  const user1 = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      walletAddress: "F2so6zqK9dL5mN7pX8rT4vY3uW2eQ1oA0bC9dE8fG7hJ",
      isAdmin: true,
      points: 500,
      accountNumber: 1,
      hasClaimedStarter: false,
      hasReceivedAirdrop: false,
    },
  });
  console.log("Created/Updated user:", user1.email);

  // Create sample collectibles
  const collectiblesData = [
    {
      id: "starter-earth-guardian",
      name: "KŌKA Earth Guardian",
      description: "Guardian of the ancient forest",
      imageUrl: "https://via.placeholder.com/300x300?text=Earth+Guardian",
      rarity: "epic",
    },
    {
      id: "starter-wanderer",
      name: "Original Wanderer",
      description: "A common wanderer in the KŌKA world",
      imageUrl: "https://via.placeholder.com/300x300?text=Wanderer",
      rarity: "common",
    },
    {
      name: "Fire Sprite",
      description: "A fiery companion for adventures",
      imageUrl: "https://via.placeholder.com/300x300?text=Fire+Sprite",
      rarity: "rare",
    },
    {
      name: "Legendary Phoenix",
      description: "Rises from the ashes of forgotten realms",
      imageUrl: "https://via.placeholder.com/300x300?text=Phoenix",
      rarity: "legendary",
    },
    {
      name: "Water Nymph",
      description: "Mystical being of the deep waters",
      imageUrl: "https://via.placeholder.com/300x300?text=Water+Nymph",
      rarity: "epic",
    },
  ];

  const withId = collectiblesData.filter((d) => d.id);
  const withoutId = collectiblesData.filter((d) => !d.id);

  const upserted = await Promise.all(
    withId.map((data) =>
      prisma.collectible.upsert({
        where: { id: data.id },
        update: {},
        create: data,
      })
    )
  );

  const created = await Promise.all(
    withoutId.map((data) => prisma.collectible.create({ data })) // Auto-cuid ID
  );

  const collectibles = [...upserted, ...created];
  console.log(
    "Created/Updated collectibles:",
    collectibles.map((c) => ({ name: c.name, rarity: c.rarity }))
  );

  // Seed starters for user1 (unclaimed)
  const starterIds = ["starter-earth-guardian", "starter-wanderer"];
  await Promise.all(
    starterIds.map((collectibleId) =>
      prisma.inventoryItem.upsert({
        where: { userId_collectibleId: { userId: user1.id, collectibleId } },
        update: {},
        create: {
          userId: user1.id,
          collectibleId,
          quantity: 1,
          isClaimed: false,
          receivedVia: "starter-pack",
        },
      })
    )
  );

  // Seed a full inventory item (claimed) for testing
  await prisma.inventoryItem.create({
    data: {
      userId: user1.id,
      collectibleId: collectibles[2].id, // Fire Sprite (cuid)
      quantity: 1,
      isClaimed: true,
      receivedVia: "seed",
    },
  });

  // Sample marketplace listing
  await prisma.marketplaceListing.create({
    data: {
      userId: user1.id,
      collectibleId: collectibles[2].id,
      price: 100,
      description: "Selling my extra Fire Sprite!",
      quantity: 1,
      status: "active",
    },
  });

  console.log(
    "Seeding complete! User has starters ready to claim + 1 claimed item + 1 listing."
  );
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
