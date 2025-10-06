"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  RefreshCw,
  Star,
  ArrowLeft,
  MessageSquare,
  Shield,
  Calendar,
  Wallet,
  Copy,
  ExternalLink,
  TrendingUp,
  Crown,
  Users,
  Zap,
  Award,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  isAdmin: boolean;
  createdAt: string;
  walletAddress?: string;
}

interface InventoryItem {
  id: string;
  type: string;
  quantity: number;
  rarity?: string;
  name?: string;
  imageUrl?: string;
}

interface Trade {
  id: string;
  status: string;
  createdAt: string;
  partnerName?: string;
}

const LEVEL_CONFIG = { xpPerLevel: 100, maxLevel: 50 };

const getLevelFromXP = (xp: number) =>
  Math.min(Math.floor(xp / LEVEL_CONFIG.xpPerLevel) + 1, LEVEL_CONFIG.maxLevel);
const getXPForNextLevel = (xp: number) =>
  getLevelFromXP(xp) * LEVEL_CONFIG.xpPerLevel;
const getLevelTier = (level: number) => {
  if (level >= 40)
    return { name: "Legendary", color: "from-yellow-500 to-orange-500" };
  if (level >= 30)
    return { name: "Master", color: "from-purple-500 to-pink-500" };
  if (level >= 20)
    return { name: "Expert", color: "from-blue-500 to-cyan-500" };
  if (level >= 10)
    return { name: "Advanced", color: "from-green-500 to-emerald-500" };
  return { name: "Novice", color: "from-gray-500 to-slate-500" };
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { token, user: currentUser } = useAuth();

  const [user, setUser] = useState<UserData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    if (!userId || !token || !currentUser) {
      setIsLoading(false);
      return;
    }

    if (currentUser && userId === currentUser.userId) {
      router.push("/app/profile");
      return;
    }

    fetchUserData();
  }, [userId, token, currentUser, router]);

  const fetchUserData = async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Fetching user profile for:", userId);

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        setError(
          errorData.message || `Failed to load profile (${response.status})`
        );
        return;
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        setError("");

        const invResponse = await fetch(`/api/inventory?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (invResponse.ok) {
          const invData = await invResponse.json();
          setInventory(invData.inventory || []);
        } else {
          setInventory([]);
        }

        const tradesResponse = await fetch(`/api/trades?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          setTrades(tradesData.trades || []);
        } else {
          setTrades([]);
        }
      } else {
        setError(data.message || "Failed to load user profile");
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyWalletAddress = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const getDisplayName = (userData: UserData) => {
    return userData?.name || userData?.email?.split("@")[0] || "User";
  };

  const getDefaultAvatar = (name: string) => {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
      name
    )}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  // Calculate stats dynamically
  const totalCards = inventory.reduce(
    (sum, item) => (item.type === "card" ? sum + item.quantity : sum),
    0
  );
  const completedTrades = trades.filter(
    (trade) => trade.status === "completed"
  ).length;
  const uniqueCollectibles = inventory.length;
  const rareCount = inventory
    .filter((item) => item.rarity === "rare")
    .reduce((sum, item) => sum + item.quantity, 0);
  const legendaryCount = inventory
    .filter((item) => item.rarity === "legendary")
    .reduce((sum, item) => sum + item.quantity, 0);
  const userXP =
    completedTrades * 10 +
    uniqueCollectibles * 5 +
    rareCount * 15 +
    legendaryCount * 30;

  const currentLevel = getLevelFromXP(userXP);
  const levelTier = getLevelTier(currentLevel);
  const levelProgress =
    ((userXP % LEVEL_CONFIG.xpPerLevel) / LEVEL_CONFIG.xpPerLevel) * 100;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto px-4 py-8 text-center">
            <div className="max-w-md mx-auto">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Unable to Load Profile
              </h2>
              <p className="text-muted-foreground mb-6">
                {error ||
                  "The user you're looking for doesn't exist or has been removed."}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => router.back()}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                {error.includes("Session") && (
                  <Button
                    variant="outline"
                    onClick={() => router.push("/app/login")}
                    className="w-full sm:w-auto"
                  >
                    Log In Again
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={fetchUserData}
                  className="w-full sm:w-auto"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const displayName = getDisplayName(user);
  const avatarSrc = user.avatarUrl || getDefaultAvatar(displayName);
  const coverSrc =
    user.coverUrl ||
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Cover Photo - Responsive height */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
          <img
            src={coverSrc}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Main Content - Responsive padding */}
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl -mt-16 sm:-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
            {/* Left Sidebar - Profile Card (Minimal for visitors) */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden shadow-lg sticky top-20">
                <CardContent className="p-0">
                  <div className="relative bg-background -mt-16 sm:-mt-20">
                    <div className="p-6">
                      {/* Avatar with Level Badge */}
                      <div className="flex items-start lg:items-center gap-4 mb-4">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 border-4 border-background shadow-xl">
                            <AvatarImage src={avatarSrc} alt={displayName} />
                            <AvatarFallback className="text-xl sm:text-2xl lg:text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br ${levelTier.color} flex items-center justify-center border-2 sm:border-3 lg:border-4 border-background shadow-lg`}
                          >
                            <span className="text-white font-bold text-xs sm:text-sm">
                              {currentLevel}
                            </span>
                          </div>
                        </div>

                        {/* User Info - Left-aligned, not centered */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                              {displayName}
                            </h2>
                            {user.isAdmin && (
                              <Badge className="bg-yellow-500 text-xs sm:text-sm">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            <Badge
                              className={`bg-gradient-to-r ${levelTier.color} text-white border-0 text-xs sm:text-sm`}
                            >
                              {levelTier.name}
                            </Badge>
                          </div>

                          <p className="text-sm lg:text-base text-muted-foreground mb-2 truncate">
                            {user.email}
                          </p>

                          {user.createdAt && (
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-3">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              <span>
                                Member since {formatDate(user.createdAt)}
                              </span>
                            </div>
                          )}

                          {user.bio && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {user.bio}
                            </p>
                          )}

                          {/* Level Progress */}
                          <div className="mb-4 p-3 bg-primary/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2 text-xs">
                              <span className="font-semibold">
                                Level {currentLevel}
                              </span>
                              <span className="text-muted-foreground">
                                {userXP % LEVEL_CONFIG.xpPerLevel}/
                                {LEVEL_CONFIG.xpPerLevel} XP
                              </span>
                            </div>
                            <Progress value={levelProgress} className="h-2" />
                            <div className="flex items-center gap-1 mt-2">
                              <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />
                              <span className="text-xs font-medium text-primary">
                                {userXP} Total XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Responsive, left-aligned */}
                      <div className="flex flex-col sm:flex-row gap-2 mb-6">
                        <Button className="flex-1">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Propose Trade
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.back()}
                          className="w-full sm:w-auto"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                      </div>

                      {/* Basic Stats - Grid, left-aligned */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        <div className="text-left p-3 bg-primary/5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold">{totalCards}</p>
                              <p className="text-xs text-muted-foreground">
                                Cards
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-left p-3 bg-primary/5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <RefreshCw className="w-4 h-4 text-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold">
                                {completedTrades}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Trades
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-left p-3 bg-primary/5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold">
                                {uniqueCollectibles}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Unique
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Wallet if available */}
                      {user.walletAddress && (
                        <div className="p-3 bg-secondary rounded-lg mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Wallet className="w-4 h-4" />
                              Wallet Address
                            </span>
                            <Badge className="bg-green-500 text-xs">
                              Connected
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-background border rounded-md text-xs font-mono truncate">
                              {user.walletAddress.slice(0, 6)}...
                              {user.walletAddress.slice(-4)}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={copyWalletAddress}
                              className="min-w-[40px]"
                            >
                              {copiedWallet ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="min-w-[40px]"
                            >
                              <a
                                href={`https://solscan.io/account/${user.walletAddress}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Quick Stats - Minimal, left-aligned */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground/80">
                          <Crown className="w-4 h-4" />
                          Quick Stats
                        </h3>
                        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                          <span className="text-sm font-medium">Total XP</span>
                          <Badge className="bg-primary">
                            <Zap className="w-3 h-3 mr-1" />
                            {userXP}
                          </Badge>
                        </div>
                        {(rareCount > 0 || legendaryCount > 0) && (
                          <div className="grid grid-cols-2 gap-2">
                            {rareCount > 0 && (
                              <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <p className="text-sm font-bold text-purple-600">
                                  {rareCount}
                                </p>
                                <p className="text-xs text-purple-600">Rare</p>
                              </div>
                            )}
                            {legendaryCount > 0 && (
                              <div className="text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                <p className="text-sm font-bold text-yellow-600">
                                  {legendaryCount}
                                </p>
                                <p className="text-xs text-yellow-600">
                                  Legendary
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Tabs - Full width on mobile */}
            <div className="lg:col-span-2">
              <Card>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2">
                    <TabsTrigger value="overview" className="justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Collection
                    </TabsTrigger>
                    <TabsTrigger value="trades" className="justify-start">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Trades ({trades.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="pt-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {displayName}'s Collection
                    </h3>
                    {inventory.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {inventory.map((item) => (
                          <Card
                            key={item.id}
                            className="p-2 sm:p-3 hover:shadow-md transition-shadow overflow-hidden"
                          >
                            <div className="relative aspect-square bg-gradient-to-br from-muted to-accent rounded mb-2 sm:mb-3 overflow-hidden">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                </div>
                              )}
                              {item.rarity && (
                                <Badge
                                  variant="secondary"
                                  className={`absolute top-1 right-1 text-xs ${
                                    item.rarity === "rare"
                                      ? "bg-purple-500"
                                      : item.rarity === "legendary"
                                      ? "bg-yellow-500"
                                      : "bg-gray-500"
                                  }`}
                                >
                                  {item.rarity[0].toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-center font-medium truncate mb-1 sm:mb-2">
                              {item.name || `Item ${item.id.slice(-4)}`}
                            </p>
                            <p className="text-xs text-center text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h4 className="font-semibold mb-2 text-lg">
                          No Collectibles Yet
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          This user hasn't collected any items yet
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="trades" className="pt-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Trade History
                    </h3>
                    {trades.length > 0 ? (
                      <div className="space-y-3">
                        {trades.slice(0, 10).map((trade) => (
                          <Card
                            key={trade.id}
                            className="p-3 sm:p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-sm sm:text-base">
                                  Trade with {trade.partnerName || "Someone"}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {new Date(
                                    trade.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  trade.status === "completed"
                                    ? "default"
                                    : "secondary"
                                }
                                className="self-start sm:self-center"
                              >
                                {trade.status}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                        {trades.length > 10 && (
                          <Alert className="mt-4">
                            <AlertDescription className="text-sm">
                              Showing 10 most recent trades. View more in full
                              dashboard.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h4 className="font-semibold mb-2 text-lg">
                          No Trades Yet
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          This user hasn't made any trades yet
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
