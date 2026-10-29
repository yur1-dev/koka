import prisma from "@/lib/db";

export const WHITELIST_LIMIT = 50;

/** Founders are the whitelisted users, so only they use up a spot. */
export async function getWhitelistStatus() {
  const totalFounders = await prisma.user.count({ where: { isFounder: true } });
  const spotsRemaining = Math.max(0, WHITELIST_LIMIT - totalFounders);
  return {
    totalFounders,
    spotsRemaining,
    isWhitelistOpen: spotsRemaining > 0,
    whitelistLimit: WHITELIST_LIMIT,
  };
}
