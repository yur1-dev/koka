import prisma from "@/lib/db";

const collectibles = [
  // Legendary (3)
  {
    name: "KŌKA Founder Dragon",
    description: "Ultra rare founder's edition dragon",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-1.png",
    attributes: { power: 98, speed: 95, defense: 97 },
  },
  {
    name: "KŌKA Phoenix Emperor",
    description: "Mythical phoenix of rebirth",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-2.png",
    attributes: { power: 96, speed: 99, defense: 94 },
  },
  {
    name: "KŌKA Celestial Warrior",
    description: "Warrior blessed by the heavens",
    rarity: "legendary",
    imageUrl: "/collectibles/legendary-3.png",
    attributes: { power: 99, speed: 93, defense: 98 },
  },

  // Epic (7)
  {
    name: "KŌKA Shadow Assassin",
    description: "Master of stealth and shadows",
    rarity: "epic",
    imageUrl: "/collectibles/epic-1.png",
    attributes: { power: 88, speed: 92, defense: 85 },
  },
  {
    name: "KŌKA Thunder Knight",
    description: "Knight wielding lightning",
    rarity: "epic",
    imageUrl: "/collectibles/epic-2.png",
    attributes: { power: 90, speed: 87, defense: 89 },
  },
  {
    name: "KŌKA Ice Queen",
    description: "Ruler of the frozen realm",
    rarity: "epic",
    imageUrl: "/collectibles/epic-3.png",
    attributes: { power: 86, speed: 88, defense: 91 },
  },
  {
    name: "KŌKA Fire Samurai",
    description: "Samurai with blazing sword",
    rarity: "epic",
    imageUrl: "/collectibles/epic-4.png",
    attributes: { power: 91, speed: 89, defense: 86 },
  },
  {
    name: "KŌKA Wind Archer",
    description: "Archer with wind magic",
    rarity: "epic",
    imageUrl: "/collectibles/epic-5.png",
    attributes: { power: 85, speed: 94, defense: 84 },
  },
  {
    name: "KŌKA Earth Guardian",
    description: "Guardian of the ancient forest",
    rarity: "epic",
    imageUrl: "/collectibles/epic-6.png",
    attributes: { power: 87, speed: 82, defense: 95 },
  },
  {
    name: "KŌKA Mystic Sorcerer",
    description: "Master of ancient magic",
    rarity: "epic",
    imageUrl: "/collectibles/epic-7.png",
    attributes: { power: 92, speed: 85, defense: 87 },
  },

  // Rare (15)
  {
    name: "KŌKA Steel Warrior",
    description: "Battle-hardened warrior",
    rarity: "rare",
    imageUrl: "/collectibles/rare-1.png",
    attributes: { power: 78, speed: 75, defense: 80 },
  },
  {
    name: "KŌKA Flame Mage",
    description: "Wielder of fire magic",
    rarity: "rare",
    imageUrl: "/collectibles/rare-2.png",
    attributes: { power: 82, speed: 76, defense: 74 },
  },
  {
    name: "KŌKA Crystal Healer",
    description: "Healer with crystal powers",
    rarity: "rare",
    imageUrl: "/collectibles/rare-3.png",
    attributes: { power: 70, speed: 78, defense: 85 },
  },
  {
    name: "KŌKA Storm Rider",
    description: "Rider of the storm winds",
    rarity: "rare",
    imageUrl: "/collectibles/rare-4.png",
    attributes: { power: 76, speed: 84, defense: 72 },
  },
  {
    name: "KŌKA Dark Paladin",
    description: "Paladin of shadow",
    rarity: "rare",
    imageUrl: "/collectibles/rare-5.png",
    attributes: { power: 80, speed: 74, defense: 79 },
  },
  {
    name: "KŌKA Light Priest",
    description: "Priest of divine light",
    rarity: "rare",
    imageUrl: "/collectibles/rare-6.png",
    attributes: { power: 72, speed: 77, defense: 83 },
  },
  {
    name: "KŌKA Beast Tamer",
    description: "Master of wild creatures",
    rarity: "rare",
    imageUrl: "/collectibles/rare-7.png",
    attributes: { power: 75, speed: 81, defense: 76 },
  },
  {
    name: "KŌKA Rogue Thief",
    description: "Swift and cunning thief",
    rarity: "rare",
    imageUrl: "/collectibles/rare-8.png",
    attributes: { power: 73, speed: 86, defense: 68 },
  },
  {
    name: "KŌKA Ocean Mermaid",
    description: "Guardian of the deep seas",
    rarity: "rare",
    imageUrl: "/collectibles/rare-9.png",
    attributes: { power: 71, speed: 79, defense: 81 },
  },
  {
    name: "KŌKA Mountain Dwarf",
    description: "Sturdy mountain warrior",
    rarity: "rare",
    imageUrl: "/collectibles/rare-10.png",
    attributes: { power: 77, speed: 70, defense: 88 },
  },
  {
    name: "KŌKA Forest Elf",
    description: "Swift forest guardian",
    rarity: "rare",
    imageUrl: "/collectibles/rare-11.png",
    attributes: { power: 74, speed: 83, defense: 75 },
  },
  {
    name: "KŌKA Desert Nomad",
    description: "Survivor of harsh lands",
    rarity: "rare",
    imageUrl: "/collectibles/rare-12.png",
    attributes: { power: 76, speed: 80, defense: 77 },
  },
  {
    name: "KŌKA Sky Monk",
    description: "Monk of the floating temple",
    rarity: "rare",
    imageUrl: "/collectibles/rare-13.png",
    attributes: { power: 79, speed: 82, defense: 73 },
  },
  {
    name: "KŌKA Blood Vampire",
    description: "Ancient vampire lord",
    rarity: "rare",
    imageUrl: "/collectibles/rare-14.png",
    attributes: { power: 81, speed: 78, defense: 76 },
  },
  {
    name: "KŌKA Spirit Shaman",
    description: "Communicator with spirits",
    rarity: "rare",
    imageUrl: "/collectibles/rare-15.png",
    attributes: { power: 75, speed: 76, defense: 82 },
  },

  // Uncommon (25)
  ...Array.from({ length: 25 }, (_, i) => ({
    name: `KŌKA Scout #${String(i + 1).padStart(3, "0")}`,
    description: `Trained scout of the KŌKA order`,
    rarity: "uncommon",
    imageUrl: `/collectibles/uncommon-${i + 1}.png`,
    attributes: {
      power: 55 + Math.floor(Math.random() * 15),
      speed: 55 + Math.floor(Math.random() * 15),
      defense: 55 + Math.floor(Math.random() * 15),
    },
  })),

  // Common (50)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `KŌKA Recruit #${String(i + 1).padStart(3, "0")}`,
    description: `New recruit to the KŌKA guild`,
    rarity: "common",
    imageUrl: `/collectibles/common-${i + 1}.png`,
    attributes: {
      power: 30 + Math.floor(Math.random() * 20),
      speed: 30 + Math.floor(Math.random() * 20),
      defense: 30 + Math.floor(Math.random() * 20),
    },
  })),
];

async function main() {
  console.log("Starting collectibles seed...");

  for (const collectible of collectibles) {
    await prisma.collectible.create({
      data: collectible,
    });
    console.log(`Created: ${collectible.name} (${collectible.rarity})`);
  }

  console.log(`\nSeeded ${collectibles.length} collectibles successfully!`);

  const counts = await prisma.collectible.groupBy({
    by: ["rarity"],
    _count: true,
  });

  console.log("\nBreakdown by rarity:");
  counts.forEach((c) => {
    console.log(`  ${c.rarity}: ${c._count}`);
  });
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
