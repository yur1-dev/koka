// @ts-nocheck
// File: scripts/crud-users.ts
// Location: Place this in your scripts directory
// Usage: Run with Node.js, e.g.:
//   - Create: ts-node scripts/crud-users.ts create --name "John Doe" --email "john@example.com" --bio "Bio here" --wallet "wallet_address"
//   - Read: ts-node scripts/crud-users.ts read --id "user_id"  OR  ts-node scripts/crud-users.ts read --all
//   - Update: ts-node scripts/crud-users.ts update --id "user_id" --name "Updated Name" --email "updated@example.com"
//   - Delete: ts-node scripts/crud-users.ts delete --id "user_id"
// Requires: Prisma (assuming your setup uses Prisma), ts-node for TS execution
// Install if needed: npm i -D ts-node @types/node
// Make sure .env is set up with DATABASE_URL

import { PrismaClient } from "@prisma/client";
import * as argparse from "argparse"; // npm i argparse @types/argparse if not installed

const prisma = new PrismaClient();

interface UserInput {
  id?: string;
  name?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  isAdmin?: boolean;
  walletAddress?: string;
}

async function createUser(data: UserInput) {
  try {
    const user = await prisma.user.create({
      data: {
        name: data.name!,
        email: data.email!,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        coverUrl: data.coverUrl,
        isAdmin: data.isAdmin || false,
        walletAddress: data.walletAddress,
      },
    });
    console.log("Created user:", user);
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

async function readUser(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (user) {
      console.log("User:", user);
    } else {
      console.log("User not found");
    }
  } catch (error) {
    console.error("Error reading user:", error);
  }
}

async function readAllUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log("All users:", users);
  } catch (error) {
    console.error("Error reading all users:", error);
  }
}

async function updateUser(id: string, data: UserInput) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    console.log("Updated user:", user);
  } catch (error) {
    console.error("Error updating user:", error);
  }
}

async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id },
    });
    console.log("Deleted user with id:", id);
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}

function parseArgs() {
  const parser = new argparse.ArgumentParser({
    description: "CRUD operations for users",
  });

  const subparsers = parser.addSubparsers({
    title: "commands",
    dest: "command",
  });

  // Create subparser
  const createParser = subparsers.addParser("create", { addHelp: true });
  createParser.addArgument(["--name"], { required: true });
  createParser.addArgument(["--email"], { required: true });
  createParser.addArgument(["--bio"]);
  createParser.addArgument(["--avatarUrl"]);
  createParser.addArgument(["--coverUrl"]);
  createParser.addArgument(["--isAdmin"], { action: "storeTrue" });
  createParser.addArgument(["--wallet"]);

  // Read subparser
  const readParser = subparsers.addParser("read", { addHelp: true });
  readParser.addArgument(["--id"]);
  readParser.addArgument("--all", { action: "storeTrue" });

  // Update subparser
  const updateParser = subparsers.addParser("update", { addHelp: true });
  updateParser.addArgument(["--id"], { required: true });
  updateParser.addArgument(["--name"]);
  updateParser.addArgument(["--email"]);
  updateParser.addArgument(["--bio"]);
  updateParser.addArgument(["--avatarUrl"]);
  updateParser.addArgument(["--coverUrl"]);
  updateParser.addArgument(["--isAdmin"], { action: "storeTrue" });
  updateParser.addArgument(["--wallet"]);

  // Delete subparser
  const deleteParser = subparsers.addParser("delete", { addHelp: true });
  deleteParser.addArgument(["--id"], { required: true });

  return parser.parseArgs();
}

async function main() {
  const args = parseArgs();

  switch (args.command) {
    case "create":
      await createUser({
        name: args.name,
        email: args.email,
        bio: args.bio,
        avatarUrl: args.avatarUrl,
        coverUrl: args.coverUrl,
        isAdmin: args.isAdmin,
        walletAddress: args.wallet,
      });
      break;
    case "read":
      if (args.all) {
        await readAllUsers();
      } else if (args.id) {
        await readUser(args.id);
      } else {
        console.log("Use --id or --all for read");
      }
      break;
    case "update":
      await updateUser(args.id, {
        name: args.name,
        email: args.email,
        bio: args.bio,
        avatarUrl: args.avatarUrl,
        coverUrl: args.coverUrl,
        isAdmin: args.isAdmin,
        walletAddress: args.wallet,
      });
      break;
    case "delete":
      await deleteUser(args.id);
      break;
    default:
      console.log("Unknown command");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
