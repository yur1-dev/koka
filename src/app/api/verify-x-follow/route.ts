import { NextRequest, NextResponse } from "next/server";

// ============================================
// X Follow Verifier (Duplicated from auth for standalone use)
// ============================================
async function verifyFollowsXAccount(
  xHandle: string,
  targetUsername: string = "koka"
): Promise<boolean> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn("⚠️ X_BEARER_TOKEN missing - skipping follow verification");
    return false;
  }

  try {
    const cleanHandle = xHandle.trim().slice(1);
    if (!cleanHandle) return false;

    console.log(`🔍 Verifying X follow: @${cleanHandle} → @${targetUsername}`);
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanHandle}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );

    if (!userRes.ok) {
      console.warn(
        `❌ X user lookup failed for @${cleanHandle}: ${userRes.status}`
      );
      return false;
    }

    const userData = await userRes.json();
    const sourceId = userData.data?.id;
    if (!sourceId) {
      console.warn(`❌ X user not found: @${cleanHandle}`);
      return false;
    }

    // Paginated following check
    let followsTarget = false;
    let nextToken: string | null = null;
    do {
      const params = new URLSearchParams({
        "user.fields": "username",
        max_results: "1000",
      });
      if (nextToken) params.append("pagination_token", nextToken);

      const followRes = await fetch(
        `https://api.twitter.com/2/users/${sourceId}/following?${params.toString()}`
      );
      if (!followRes.ok) {
        console.warn(`❌ X following fetch failed: ${followRes.status}`);
        break;
      }

      const followData = await followRes.json();
      const followingUsernames =
        followData.data?.map((u: any) => u.username.toLowerCase()) || [];
      if (followingUsernames.includes(targetUsername.toLowerCase())) {
        followsTarget = true;
        break;
      }

      nextToken = followData.meta?.next_token;
    } while (nextToken && !followsTarget);

    console.log(
      `✅ X follow check: @${cleanHandle} ${
        followsTarget ? "FOLLOWS" : "does NOT follow"
      } @${targetUsername}`
    );
    return followsTarget;
  } catch (error) {
    console.error("❌ X verification error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { xHandle } = await request.json();
    if (!xHandle || !xHandle.trim().startsWith("@")) {
      return NextResponse.json(
        { follows: false, message: "Invalid X handle" },
        { status: 400 }
      );
    }

    // Now defined above
    const follows = await verifyFollowsXAccount(xHandle);

    return NextResponse.json({
      follows,
      message: follows ? "Follow confirmed!" : "Not following yet.",
    });
  } catch (error) {
    console.error("Verify X follow error:", error);
    return NextResponse.json(
      { follows: false, message: "Verification failed" },
      { status: 500 }
    );
  }
}
