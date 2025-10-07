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
  Award,
  Crown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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

  // Image Viewer states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewedImageUrl, setViewedImageUrl] = useState("");

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

  const openImageViewer = (url: string) => {
    if (url) {
      setViewedImageUrl(url);
      setShowImageViewer(true);
    }
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
    setViewedImageUrl("");
  };

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
                  className="w-full sm:w-auto bg-transparent"
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

        <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
          <img
            src={coverSrc || "/placeholder.svg"}
            alt="Cover"
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
            onClick={() => openImageViewer(coverSrc)}
          />
        </div>

        <div className="container mx-auto px-4 max-w-7xl pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-16 sm:-mt-20">
            {/* Left Sidebar - Profile Card */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden shadow-lg lg:sticky lg:top-20">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center -mt-16 sm:-mt-20 mb-6">
                    <div
                      className="relative cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => openImageViewer(avatarSrc)}
                    >
                      <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-background shadow-xl">
                        <AvatarImage
                          src={avatarSrc || "/placeholder.svg"}
                          alt={displayName}
                        />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br ${levelTier.color} flex items-center justify-center border-4 border-background shadow-lg`}
                      >
                        <span className="text-white font-bold text-sm">
                          {currentLevel}
                        </span>
                      </div>
                    </div>

                    <div className="text-center mt-4 space-y-2 w-full">
                      <h2 className="text-2xl font-bold text-balance">
                        {displayName}
                      </h2>

                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {user.isAdmin && (
                          <Badge className="bg-yellow-500 text-white">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        <Badge
                          className={`bg-gradient-to-r ${levelTier.color} text-white border-0`}
                        >
                          {levelTier.name}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>

                      {user.createdAt && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Member since {formatDate(user.createdAt)}</span>
                        </div>
                      )}

                      {user.bio && (
                        <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm">
                        Level {currentLevel}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {userXP % LEVEL_CONFIG.xpPerLevel}/
                        {LEVEL_CONFIG.xpPerLevel} XP
                      </span>
                    </div>
                    <Progress value={levelProgress} className="h-2 mb-3" />
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        {userXP} Total XP
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <Button className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Propose Trade
                    </Button>
                    <Button variant="outline" onClick={() => router.back()}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <Package className="w-5 h-5 text-primary mb-2" />
                      <p className="text-2xl font-bold">{totalCards}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cards
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <RefreshCw className="w-5 h-5 text-primary mb-2" />
                      <p className="text-2xl font-bold">{completedTrades}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trades
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <Star className="w-5 h-5 text-primary mb-2" />
                      <p className="text-2xl font-bold">{uniqueCollectibles}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unique
                      </p>
                    </div>
                  </div>

                  {user.walletAddress && (
                    <div className="p-4 bg-secondary/50 rounded-lg border mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          Wallet Address
                        </span>
                        <Badge className="bg-green-500 text-white text-xs">
                          Connected
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-background/50 border rounded text-xs font-mono truncate">
                          {user.walletAddress.slice(0, 6)}...
                          {user.walletAddress.slice(-4)}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyWalletAddress}
                        >
                          {copiedWallet ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="outline" asChild>
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

                  {(rareCount > 0 || legendaryCount > 0) && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                        <Award className="w-4 h-4" />
                        Achievements
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {rareCount > 0 && (
                          <div className="flex flex-col items-center justify-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <Star className="w-5 h-5 text-purple-500 mb-2" />
                            <p className="text-xl font-bold text-purple-500">
                              {rareCount}
                            </p>
                            <p className="text-xs text-purple-500/80 mt-1">
                              Rare Items
                            </p>
                          </div>
                        )}
                        {legendaryCount > 0 && (
                          <div className="flex flex-col items-center justify-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <Crown className="w-5 h-5 text-yellow-500 mb-2" />
                            <p className="text-xl font-bold text-yellow-500">
                              {legendaryCount}
                            </p>
                            <p className="text-xs text-yellow-500/80 mt-1">
                              Legendary
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">
                      <Package className="w-4 h-4 mr-2" />
                      Collection
                    </TabsTrigger>
                    <TabsTrigger value="trades">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Trades ({trades.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {displayName}'s Collection
                    </h3>
                    {inventory.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {inventory.map((item) => (
                          <Card
                            key={item.id}
                            className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                          >
                            <CardContent className="p-3">
                              <div className="relative aspect-square bg-gradient-to-br from-muted to-accent rounded-lg mb-3 overflow-hidden">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl || "/placeholder.svg"}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                    <Package className="w-8 h-8 text-muted-foreground/50" />
                                  </div>
                                )}
                                {item.rarity && (
                                  <Badge
                                    className={`absolute top-2 right-2 text-xs ${
                                      item.rarity === "rare"
                                        ? "bg-purple-500 text-white"
                                        : item.rarity === "legendary"
                                        ? "bg-yellow-500 text-white"
                                        : "bg-gray-500 text-white"
                                    }`}
                                  >
                                    {item.rarity[0].toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium truncate mb-1 text-center">
                                {item.name || `Item ${item.id.slice(-4)}`}
                              </p>
                              <p className="text-xs text-muted-foreground text-center">
                                Qty: {item.quantity}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h4 className="font-semibold text-lg mb-2">
                          No Collectibles Yet
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          This user hasn't collected any items yet
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="trades" className="p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Trade History
                    </h3>
                    {trades.length > 0 ? (
                      <div className="space-y-3">
                        {trades.slice(0, 10).map((trade) => (
                          <Card
                            key={trade.id}
                            className="hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium mb-1">
                                    Trade with {trade.partnerName || "Someone"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(
                                      trade.createdAt
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    trade.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="capitalize"
                                >
                                  {trade.status}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {trades.length > 10 && (
                          <Alert>
                            <AlertDescription className="text-sm">
                              Showing 10 most recent trades
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <RefreshCw className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h4 className="font-semibold text-lg mb-2">
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

        <Dialog open={showImageViewer} onOpenChange={closeImageViewer}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-black/95 border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Full size image</DialogTitle>
            </DialogHeader>
            <div className="relative flex items-center justify-center p-6">
              {viewedImageUrl && (
                <img
                  src={viewedImageUrl || "/placeholder.svg"}
                  alt="Full view"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              )}
              <DialogClose className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5 text-white" />
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
