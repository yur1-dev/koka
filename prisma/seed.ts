import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const collectibles = [
  // Legendary (3) - With attributes
  {
    name: "KŌKA Founder Dragon",
    description: "Ultra rare founder's edition dragon",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-1.png",
    maxSupply: 50,
    currentSupply: 0,
    attributes: { power: 100, agility: 95, element: "fire" },
  },
  {
    name: "KŌKA Phoenix Emperor",
    description: "Mythical phoenix of rebirth",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-2.png",
    maxSupply: 50,
    currentSupply: 0,
    attributes: { power: 98, agility: 99, element: "fire" },
  },
  {
    name: "KŌKA Celestial Warrior",
    description: "Warrior blessed by the heavens",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-3.png",
    maxSupply: 50,
    currentSupply: 0,
    attributes: { power: 97, agility: 96, element: "light" },
  },

  // Epic (7)
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

  // Rare (15)
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

  // Uncommon (25)
  ...Array.from({ length: 25 }, (_, i) => ({
    name: `KŌKA Scout #${String(i + 1).padStart(3, "0")}`,
    description: `Trained scout of the KŌKA order`,
    rarity: "uncommon",
    imageUrl: `/collectibles/uncommon-${i + 1}.png`,
    maxSupply: 300,
    currentSupply: 0,
  })),

  // Common (50)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `KŌKA Recruit #${String(i + 1).padStart(3, "0")}`,
    description: `New recruit to the KŌKA guild`,
    rarity: "common",
    imageUrl: `/collectibles/common-${i + 1}.png`,
    maxSupply: 500,
    currentSupply: 0,
  })),
];

async function main() {
  console.log("🌱 Starting database seed...\n");

  // 1. Clear existing collectibles (safe re-run)
  console.log("Clearing existing collectibles...");
  await prisma.collectible.deleteMany();
  console.log("✅ Cleared\n");

  // 2. Create collectibles
  console.log("Creating collectibles...");
  let created = 0;
  let failed = 0;
  for (const collectible of collectibles) {
    try {
      await prisma.collectible.create({
        data: collectible,
      });
      created++;
      if (created % 10 === 0) {
        console.log(`  Created ${created}/${collectibles.length}...`);
      }
    } catch (err) {
      console.error(`❌ Failed to create "${collectible.name}":`, err);
      failed++;
    }
  }

  console.log(`✅ Created ${created} collectibles (${failed} failed)\n`);

  // 3. Summary
  const counts = await prisma.collectible.groupBy({
    by: ["rarity"],
    _count: true,
  });

  console.log("📊 Breakdown by rarity:");
  counts.forEach((c) => {
    console.log(`   ${c.rarity}: ${c._count}`);
  });

  const total = await prisma.collectible.count();
  console.log(`\n🎉 Total collectibles: ${total}`);
  console.log("\n✨ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
