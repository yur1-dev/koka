// prisma/seed.ts
import prisma from "@/lib/db"; // Use the same import as your API routes

async function main() {
  console.log("🌱 Starting database seed...\n");

  // 1. Create starter collectibles (with specific IDs)
  console.log("Creating starter collectibles...");

  const starterEarthGuardian = await prisma.collectible.upsert({
    where: { id: "starter-earth-guardian" },
    update: {},
    create: {
      id: "starter-earth-guardian",
      name: "Earth Guardian",
      description: "A protective spirit of the earth",
      imageUrl: "/collectibles/earth-guardian.png",
      rarity: "common",
      maxSupply: 1000,
      currentSupply: 0,
    },
  });

  const starterWanderer = await prisma.collectible.upsert({
    where: { id: "starter-wanderer" },
    update: {},
    create: {
      id: "starter-wanderer",
      name: "Wanderer",
      description: "A lone traveler seeking adventure",
      imageUrl: "/collectibles/wanderer.png",
      rarity: "common",
      maxSupply: 1000,
      currentSupply: 0,
    },
  });

  console.log("✅ Starter collectibles created\n");

  // 2. Create main collectibles for airdrop
  console.log("Creating collectibles for airdrop...");

  const collectibles = [
    // Legendary (3% chance)
    {
      name: "KŌKA Founder Dragon",
      description: "Ultra rare founder's edition dragon",
      rarity: "legendary",
      imageUrl: "/collectibles/legendary-1.png",
      maxSupply: 50,
      currentSupply: 0,
    },
    {
      name: "KŌKA Phoenix Emperor",
      description: "Mythical phoenix of rebirth",
      rarity: "legendary",
      imageUrl: "/collectibles/legendary-2.png",
      maxSupply: 50,
      currentSupply: 0,
    },
    {
      name: "KŌKA Celestial Warrior",
      description: "Warrior blessed by the heavens",
      rarity: "legendary",
      imageUrl: "/collectibles/legendary-3.png",
      maxSupply: 50,
      currentSupply: 0,
    },

    // Epic (7% chance)
    {
      name: "KŌKA Shadow Assassin",
      description: "Master of stealth and shadows",
      rarity: "epic",
      imageUrl: "/collectibles/epic-1.png",
      maxSupply: 100,
      currentSupply: 0,
    },
    {
      name: "KŌKA Thunder Knight",
      description: "Knight wielding lightning",
      rarity: "epic",
      imageUrl: "/collectibles/epic-2.png",
      maxSupply: 100,
      currentSupply: 0,
    },
    {
      name: "KŌKA Ice Queen",
      description: "Ruler of the frozen realm",
      rarity: "epic",
      imageUrl: "/collectibles/epic-3.png",
      maxSupply: 100,
      currentSupply: 0,
    },
    {
      name: "KŌKA Fire Samurai",
      description: "Samurai with blazing sword",
      rarity: "epic",
      imageUrl: "/collectibles/epic-4.png",
      maxSupply: 100,
      currentSupply: 0,
    },
    {
      name: "KŌKA Wind Archer",
      description: "Archer with wind magic",
      rarity: "epic",
      imageUrl: "/collectibles/epic-5.png",
      maxSupply: 100,
      currentSupply: 0,
    },
    {
      name: "KŌKA Earth Guardian",
      description: "Guardian of the ancient forest",
      rarity: "epic",
      imageUrl: "/collectibles/epic-6.png",
      maxSupply: 100,
      currentSupply: 0,
    },
    {
      name: "KŌKA Mystic Sorcerer",
      description: "Master of ancient magic",
      rarity: "epic",
      imageUrl: "/collectibles/epic-7.png",
      maxSupply: 100,
      currentSupply: 0,
    },

    // Rare (15% chance)
    {
      name: "KŌKA Steel Warrior",
      description: "Battle-hardened warrior",
      rarity: "rare",
      imageUrl: "/collectibles/rare-1.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Flame Mage",
      description: "Wielder of fire magic",
      rarity: "rare",
      imageUrl: "/collectibles/rare-2.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Crystal Healer",
      description: "Healer with crystal powers",
      rarity: "rare",
      imageUrl: "/collectibles/rare-3.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Storm Rider",
      description: "Rider of the storm winds",
      rarity: "rare",
      imageUrl: "/collectibles/rare-4.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Dark Paladin",
      description: "Paladin of shadow",
      rarity: "rare",
      imageUrl: "/collectibles/rare-5.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Light Priest",
      description: "Priest of divine light",
      rarity: "rare",
      imageUrl: "/collectibles/rare-6.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Beast Tamer",
      description: "Master of wild creatures",
      rarity: "rare",
      imageUrl: "/collectibles/rare-7.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Rogue Thief",
      description: "Swift and cunning thief",
      rarity: "rare",
      imageUrl: "/collectibles/rare-8.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Ocean Mermaid",
      description: "Guardian of the deep seas",
      rarity: "rare",
      imageUrl: "/collectibles/rare-9.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Mountain Dwarf",
      description: "Sturdy mountain warrior",
      rarity: "rare",
      imageUrl: "/collectibles/rare-10.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Forest Elf",
      description: "Swift forest guardian",
      rarity: "rare",
      imageUrl: "/collectibles/rare-11.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Desert Nomad",
      description: "Survivor of harsh lands",
      rarity: "rare",
      imageUrl: "/collectibles/rare-12.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Sky Monk",
      description: "Monk of the floating temple",
      rarity: "rare",
      imageUrl: "/collectibles/rare-13.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Blood Vampire",
      description: "Ancient vampire lord",
      rarity: "rare",
      imageUrl: "/collectibles/rare-14.png",
      maxSupply: 200,
      currentSupply: 0,
    },
    {
      name: "KŌKA Spirit Shaman",
      description: "Communicator with spirits",
      rarity: "rare",
      imageUrl: "/collectibles/rare-15.png",
      maxSupply: 200,
      currentSupply: 0,
    },

    // Uncommon (25% chance)
    ...Array.from({ length: 25 }, (_, i) => ({
      name: `KŌKA Scout #${String(i + 1).padStart(3, "0")}`,
      description: `Trained scout of the KŌKA order`,
      rarity: "uncommon",
      imageUrl: `/collectibles/uncommon-${i + 1}.png`,
      maxSupply: 300,
      currentSupply: 0,
    })),

    // Common (50% chance)
    ...Array.from({ length: 50 }, (_, i) => ({
      name: `KŌKA Recruit #${String(i + 1).padStart(3, "0")}`,
      description: `New recruit to the KŌKA guild`,
      rarity: "common",
      imageUrl: `/collectibles/common-${i + 1}.png`,
      maxSupply: 500,
      currentSupply: 0,
    })),
  ];

  let created = 0;
  for (const collectible of collectibles) {
    await prisma.collectible.create({
      data: collectible,
    });
    created++;
    if (created % 10 === 0) {
      console.log(
        `  Created ${created}/${collectibles.length} collectibles...`
      );
    }
  }

  console.log(`✅ Created ${collectibles.length} collectibles\n`);

  // 3. Show summary
  const counts = await prisma.collectible.groupBy({
    by: ["rarity"],
    _count: true,
  });

  console.log("📊 Breakdown by rarity:");
  counts.forEach((c) => {
    console.log(`   ${c.rarity}: ${c._count}`);
  });

  const total = await prisma.collectible.count();
  console.log(`\n🎉 Total collectibles in database: ${total}`);
  console.log("\n✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
