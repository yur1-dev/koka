import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { WHITELIST_LIMIT } from "@/lib/whitelist";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const RANGE_DAYS = 30;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function lastDays(n: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) =>
    dayKey(new Date(today.getTime() - (n - 1 - i) * DAY))
  );
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const now = Date.now();
    const since = new Date(now - RANGE_DAYS * DAY);
    const weekAgo = new Date(now - 7 * DAY);
    const twoWeeksAgo = new Date(now - 14 * DAY);

    const [
      totalUsers,
      founders,
      walletLinked,
      claimedStarter,
      newUsers7d,
      newUsersPrev7d,
      collectibles,
      copiesAgg,
      holders,
      byReceivedVia,
      listingsByStatus,
      salesAgg,
      sales7d,
      tradesTotal,
      trades7d,
      signupRows,
      saleRows,
      topSellerRows,
      topBuyerRows,
      topCardRows,
      recentSales,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isFounder: true } }),
      prisma.user.count({ where: { walletAddress: { not: null } } }),
      prisma.user.count({ where: { hasClaimedStarter: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.collectible.findMany({
        select: { rarity: true, maxSupply: true, currentSupply: true },
      }),
      prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
      prisma.inventoryItem.groupBy({ by: ["userId"] }),
      prisma.inventoryItem.groupBy({ by: ["receivedVia"], _sum: { quantity: true } }),
      prisma.marketplaceListing.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.transaction.aggregate({
        _sum: { price: true },
        _avg: { price: true },
        _count: { _all: true },
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: weekAgo } },
        _sum: { price: true },
        _count: { _all: true },
      }),
      prisma.trade.count(),
      prisma.trade.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.$queryRaw<{ d: Date; c: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS d, COUNT(*)::bigint AS c
        FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1`,
      prisma.$queryRaw<{ d: Date; c: bigint; v: number }[]>`
        SELECT date_trunc('day', "createdAt") AS d, COUNT(*)::bigint AS c,
               COALESCE(SUM("price"), 0)::float8 AS v
        FROM "Transaction" WHERE "createdAt" >= ${since} GROUP BY 1`,
      prisma.transaction.groupBy({
        by: ["sellerId"],
        _sum: { price: true },
        _count: { _all: true },
        orderBy: { _sum: { price: "desc" } },
        take: 5,
      }),
      prisma.transaction.groupBy({
        by: ["buyerId"],
        _sum: { price: true },
        _count: { _all: true },
        orderBy: { _sum: { price: "desc" } },
        take: 5,
      }),
      prisma.transaction.groupBy({
        by: ["collectibleId"],
        _sum: { price: true },
        _count: { _all: true },
        orderBy: { _count: { collectibleId: "desc" } },
        take: 5,
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          price: true,
          createdAt: true,
          buyer: { select: { username: true, name: true } },
          seller: { select: { username: true, name: true } },
          collectible: { select: { name: true, rarity: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          username: true,
          name: true,
          isFounder: true,
          walletAddress: true,
          createdAt: true,
        },
      }),
    ]);

    // Names for the leaderboards above
    const userIds = [
      ...new Set([
        ...topSellerRows.map((r) => r.sellerId),
        ...topBuyerRows.map((r) => r.buyerId),
      ]),
    ];
    const cardIds = topCardRows.map((r) => r.collectibleId);
    const [people, cards] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, name: true },
      }),
      prisma.collectible.findMany({
        where: { id: { in: cardIds } },
        select: { id: true, name: true, rarity: true },
      }),
    ]);
    const nameOf = (id: string) => {
      const u = people.find((p) => p.id === id);
      return u?.username || u?.name || "Unknown";
    };

    // Fill empty days so the charts have no gaps
    const days = lastDays(RANGE_DAYS);
    const signupMap = new Map(signupRows.map((r) => [dayKey(new Date(r.d)), Number(r.c)]));
    const saleMap = new Map(saleRows.map((r) => [dayKey(new Date(r.d)), r]));
    const daily = days.map((date) => ({
      date,
      signups: signupMap.get(date) ?? 0,
      sales: Number(saleMap.get(date)?.c ?? 0),
      volume: Number(saleMap.get(date)?.v ?? 0),
    }));

    // Supply by rarity
    const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
    const supply = rarityOrder.map((rarity) => {
      const rows = collectibles.filter((c) => c.rarity === rarity);
      return {
        rarity,
        designs: rows.length,
        minted: rows.reduce((s, c) => s + c.currentSupply, 0),
        max: rows.reduce((s, c) => s + (c.maxSupply ?? 0), 0),
      };
    });

    const status = (s: string) =>
      listingsByStatus.find((l) => l.status === s)?._count._all ?? 0;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        founders,
        founderSpotsLeft: Math.max(0, WHITELIST_LIMIT - founders),
        whitelistLimit: WHITELIST_LIMIT,
        walletLinked,
        claimedStarter,
        new7d: newUsers7d,
        newPrev7d: newUsersPrev7d,
        withCards: holders.length,
      },
      cards: {
        designs: collectibles.length,
        copiesOwned: copiesAgg._sum.quantity ?? 0,
        supply,
        bySource: byReceivedVia.map((r) => ({
          source: r.receivedVia || "unknown",
          copies: r._sum.quantity ?? 0,
        })),
      },
      market: {
        active: status("active"),
        sold: status("sold"),
        cancelled: status("cancelled"),
        salesCount: salesAgg._count._all,
        volume: salesAgg._sum.price ?? 0,
        avgPrice: salesAgg._avg.price ?? 0,
        sales7d: sales7d._count._all,
        volume7d: sales7d._sum.price ?? 0,
        trades: tradesTotal,
        trades7d,
      },
      daily,
      top: {
        sellers: topSellerRows.map((r) => ({
          name: nameOf(r.sellerId),
          sales: r._count._all,
          volume: r._sum.price ?? 0,
        })),
        buyers: topBuyerRows.map((r) => ({
          name: nameOf(r.buyerId),
          buys: r._count._all,
          volume: r._sum.price ?? 0,
        })),
        cards: topCardRows.map((r) => {
          const c = cards.find((x) => x.id === r.collectibleId);
          return {
            name: c?.name ?? "Unknown",
            rarity: c?.rarity ?? "common",
            sales: r._count._all,
            volume: r._sum.price ?? 0,
          };
        }),
      },
      recent: {
        sales: recentSales.map((s) => ({
          id: s.id,
          card: s.collectible.name,
          rarity: s.collectible.rarity,
          price: s.price,
          buyer: s.buyer.username || s.buyer.name || "Unknown",
          seller: s.seller.username || s.seller.name || "Unknown",
          at: s.createdAt,
        })),
        signups: recentUsers.map((u) => ({
          id: u.id,
          name: u.username || u.name || "Unnamed",
          isFounder: u.isFounder,
          hasWallet: !!u.walletAddress,
          at: u.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load analytics" },
      { status: 500 }
    );
  }
}
