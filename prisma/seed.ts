import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const collectibles = [
  // Legendary (3) - With attributes
  {
    name: "KŌKA Founder Dragon",
    description: "Ultra rare founder's edition dragon",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-1.png",
    maxSupply: 1, // FIXED: 1 global copy each (true unique)
    currentSupply: 0,
    attributes: { power: 100, agility: 95, element: "fire" },
  },
  {
    name: "KŌKA Phoenix Emperor",
    description: "Mythical phoenix of rebirth",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-2.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: { power: 98, agility: 99, element: "fire" },
  },
  {
    name: "KŌKA Celestial Warrior",
    description: "Warrior blessed by the heavens",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-3.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: { power: 97, agility: 96, element: "light" },
  },

  // Epic (7) - Added attributes for consistency/variety
  {
    name: "KŌKA Shadow Assassin",
    description: "Master of stealth and shadows",
    rarity: "epic",
    imageUrl: "/collectibles/epic-1.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "shadow",
    },
  },
  {
    name: "KŌKA Thunder Knight",
    description: "Knight wielding lightning",
    rarity: "epic",
    imageUrl: "/collectibles/epic-2.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "thunder",
    },
  },
  {
    name: "KŌKA Ice Queen",
    description: "Ruler of the frozen realm",
    rarity: "epic",
    imageUrl: "/collectibles/epic-3.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "ice",
    },
  },
  {
    name: "KŌKA Fire Samurai",
    description: "Samurai with blazing sword",
    rarity: "epic",
    imageUrl: "/collectibles/epic-4.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "fire",
    },
  },
  {
    name: "KŌKA Wind Archer",
    description: "Archer with wind magic",
    rarity: "epic",
    imageUrl: "/collectibles/epic-5.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "wind",
    },
  },
  {
    name: "KŌKA Earth Guardian",
    description: "Guardian of the ancient forest",
    rarity: "epic",
    imageUrl: "/collectibles/epic-6.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "earth",
    },
  },
  {
    name: "KŌKA Mystic Sorcerer",
    description: "Master of ancient magic",
    rarity: "epic",
    imageUrl: "/collectibles/epic-7.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 85 + Math.floor(Math.random() * 10),
      agility: 80 + Math.floor(Math.random() * 15),
      element: "mystic",
    },
  },

  // Rare (15) - Added attributes
  {
    name: "KŌKA Steel Warrior",
    description: "Battle-hardened warrior",
    rarity: "rare",
    imageUrl: "/collectibles/rare-1.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "steel",
    },
  },
  {
    name: "KŌKA Flame Mage",
    description: "Wielder of fire magic",
    rarity: "rare",
    imageUrl: "/collectibles/rare-2.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "flame",
    },
  },
  {
    name: "KŌKA Crystal Healer",
    description: "Healer with crystal powers",
    rarity: "rare",
    imageUrl: "/collectibles/rare-3.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "crystal",
    },
  },
  {
    name: "KŌKA Storm Rider",
    description: "Rider of the storm winds",
    rarity: "rare",
    imageUrl: "/collectibles/rare-4.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "storm",
    },
  },
  {
    name: "KŌKA Dark Paladin",
    description: "Paladin of shadow",
    rarity: "rare",
    imageUrl: "/collectibles/rare-5.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "dark",
    },
  },
  {
    name: "KŌKA Light Priest",
    description: "Priest of divine light",
    rarity: "rare",
    imageUrl: "/collectibles/rare-6.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "light",
    },
  },
  {
    name: "KŌKA Beast Tamer",
    description: "Master of wild creatures",
    rarity: "rare",
    imageUrl: "/collectibles/rare-7.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "beast",
    },
  },
  {
    name: "KŌKA Rogue Thief",
    description: "Swift and cunning thief",
    rarity: "rare",
    imageUrl: "/collectibles/rare-8.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "shadow",
    },
  },
  {
    name: "KŌKA Ocean Mermaid",
    description: "Guardian of the deep seas",
    rarity: "rare",
    imageUrl: "/collectibles/rare-9.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "ocean",
    },
  },
  {
    name: "KŌKA Mountain Dwarf",
    description: "Sturdy mountain warrior",
    rarity: "rare",
    imageUrl: "/collectibles/rare-10.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "earth",
    },
  },
  {
    name: "KŌKA Forest Elf",
    description: "Swift forest guardian",
    rarity: "rare",
    imageUrl: "/collectibles/rare-11.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "forest",
    },
  },
  {
    name: "KŌKA Desert Nomad",
    description: "Survivor of harsh lands",
    rarity: "rare",
    imageUrl: "/collectibles/rare-12.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "desert",
    },
  },
  {
    name: "KŌKA Sky Monk",
    description: "Monk of the floating temple",
    rarity: "rare",
    imageUrl: "/collectibles/rare-13.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "sky",
    },
  },
  {
    name: "KŌKA Blood Vampire",
    description: "Ancient vampire lord",
    rarity: "rare",
    imageUrl: "/collectibles/rare-14.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "blood",
    },
  },
  {
    name: "KŌKA Spirit Shaman",
    description: "Communicator with spirits",
    rarity: "rare",
    imageUrl: "/collectibles/rare-15.png",
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 70 + Math.floor(Math.random() * 20),
      agility: 65 + Math.floor(Math.random() * 20),
      element: "spirit",
    },
  },

  // Uncommon (25) - Added attributes
  ...Array.from({ length: 25 }, (_, i) => ({
    name: `KŌKA Scout #${String(i + 1).padStart(3, "0")}`,
    description: `Trained scout of the KŌKA order`,
    rarity: "elite",
    imageUrl: `/collectibles/uncommon-${i + 1}.png`,
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 50 + Math.floor(Math.random() * 20),
      agility: 45 + Math.floor(Math.random() * 20),
      element: "scout",
    },
  })),

  // Common (50) - Added attributes
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `KŌKA Recruit #${String(i + 1).padStart(3, "0")}`,
    description: `New recruit to the KŌKA guild`,
    rarity: "common",
    imageUrl: `/collectibles/common-${i + 1}.png`,
    maxSupply: 1,
    currentSupply: 0,
    attributes: {
      power: 20 + Math.floor(Math.random() * 30),
      agility: 15 + Math.floor(Math.random() * 30),
      element: "recruit",
    },
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
  const totalSupply = await prisma.collectible.aggregate({
    _sum: { maxSupply: true },
  });
  console.log(
    `\n🎉 Total collectibles: ${total} (Total max supply: ${
      totalSupply._sum.maxSupply || 0
    })`
  );
  console.log("\n✨ Seed completed! All set to 1 unique copy each.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
