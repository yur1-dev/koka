// Mock database for development (replace with real Prisma client later)
import type { User, Collectible, InventoryItem, WalletNonce } from "./types";

// In-memory storage
const users: User[] = [
  {
    id: "admin-1",
    username: "admin",
    email: "admin@koka.io",
    passwordHash: "$2a$10$rKZLvXZnJZ0qH0YqH0YqH0YqH0YqH0YqH0YqH0YqH0YqH0YqH0Yq", // "admin123"
    walletAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isAdmin: true,
  },
];

const collectibles: Collectible[] = [
  {
    id: "col-1",
    name: "Turtle Warrior",
    description: "A brave turtle warrior with a conical hat and sword",
    imageUrl: "/koka-logo.png",
    rarity: "Legendary",
    mintAddress: null,
    createdAt: new Date(),
  },
  {
    id: "col-2",
    name: "Green Shell",
    description: "A common green turtle shell collectible",
    imageUrl: "/green-turtle-shell.jpg",
    rarity: "Common",
    mintAddress: null,
    createdAt: new Date(),
  },
  {
    id: "col-3",
    name: "Golden Sword",
    description: "A rare golden sword wielded by turtle warriors",
    imageUrl: "/golden-katana-sword.jpg",
    rarity: "Rare",
    mintAddress: null,
    createdAt: new Date(),
  },
];

const inventoryItems: InventoryItem[] = [];
const walletNonces: WalletNonce[] = [];

export const mockDb = {
  user: {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; username?: string; walletAddress?: string };
    }) => {
      return (
        users.find(
          (u) =>
            (where.id && u.id === where.id) ||
            (where.username && u.username === where.username) ||
            (where.walletAddress && u.walletAddress === where.walletAddress)
        ) || null
      );
    },
    create: async ({
      data,
    }: {
      data: Omit<User, "id" | "createdAt" | "updatedAt">;
    }) => {
      const newUser: User = {
        id: `user-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      users.push(newUser);
      return newUser;
    },
    findMany: async () => users,
  },
  collectible: {
    findMany: async () => collectibles,
    findUnique: async ({ where }: { where: { id: string } }) => {
      return collectibles.find((c) => c.id === where.id) || null;
    },
  },
  inventoryItem: {
    findMany: async ({ where }: { where?: { userId?: string } }) => {
      let items = inventoryItems;
      if (where?.userId) {
        items = items.filter((i) => i.userId === where.userId);
      }
      // Populate collectible data
      return items.map((item) => ({
        ...item,
        collectible: collectibles.find((c) => c.id === item.collectibleId),
      }));
    },
    create: async ({
      data,
    }: {
      data: Omit<InventoryItem, "id" | "acquiredAt">;
    }) => {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        acquiredAt: new Date(),
        ...data,
      };
      inventoryItems.push(newItem);
      return newItem;
    },
  },
  walletNonce: {
    create: async ({
      data,
    }: {
      data: Omit<WalletNonce, "id" | "createdAt">;
    }) => {
      const newNonce: WalletNonce = {
        id: `nonce-${Date.now()}`,
        createdAt: new Date(),
        ...data,
      };
      walletNonces.push(newNonce);
      return newNonce;
    },
    findFirst: async ({
      where,
    }: {
      where: { walletAddress: string; used: boolean };
    }) => {
      return (
        walletNonces.find(
          (n) =>
            n.walletAddress === where.walletAddress &&
            n.used === where.used &&
            n.expiresAt > new Date()
        ) || null
      );
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<WalletNonce>;
    }) => {
      const index = walletNonces.findIndex((n) => n.id === where.id);
      if (index !== -1) {
        walletNonces[index] = { ...walletNonces[index], ...data };
        return walletNonces[index];
      }
      return null;
    },
  },
};
