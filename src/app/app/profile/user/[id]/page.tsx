// app/[id]/page.tsx
"use client";

import { useEffect, useState, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Users,
  X,
  CheckCircle2,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// ============================================
// Type Definitions
// ============================================

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
  followers: number;
  following: number;
}

interface InventoryItem {
  id: string;
  type: string;
  quantity: number;
  rarity?: "common" | "rare" | "legendary" | "epic";
  name?: string;
  imageUrl?: string;
}

interface Trade {
  id: string;
  status: string;
  createdAt: string;
  partnerName?: string;
}

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

interface StatsCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  gradient: string;
}

interface LevelTier {
  name: string;
  color: string;
  icon: LucideIcon;
}

interface LevelConfig {
  xpPerLevel: number;
  maxLevel: number;
}

// ============================================
// Components
// ============================================

const ImageViewer = ({ imageUrl, onClose }: ImageViewerProps) => (
  <Dialog open modal>
    <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-transparent border-0">
      <DialogHeader className="sr-only">
        <DialogTitle>Full size image</DialogTitle>
      </DialogHeader>
      <div className="relative flex items-center justify-center bg-black/95 rounded-2xl overflow-hidden">
        <img
          src={imageUrl}
          alt="Full view"
          className="max-w-full max-h-[90vh] object-contain"
          loading="lazy"
        />
        <DialogClose
          className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all duration-200"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-white" />
        </DialogClose>
      </div>
    </DialogContent>
  </Dialog>
);

const StatsCard = memo<StatsCardProps>(
  ({ icon: Icon, value, label, gradient }) => (
    <motion.div whileHover={{ scale: 1.03, y: -2 }} className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300`}
      />
      <Card className="relative overflow-hidden border-border/40 hover:border-primary/30 transition-all duration-300">
        <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
          <div
            className={`p-2.5 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-10`}
          >
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
);

StatsCard.displayName = "StatsCard";

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-48 md:h-64 w-full rounded-2xl bg-muted/50" />
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 px-4">
      <div className="lg:col-span-4 space-y-4">
        <div className="h-32 w-32 rounded-full mx-auto bg-muted/50" />
        <div className="h-6 w-3/4 mx-auto bg-muted/50 rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-8">
        <div className="h-96 bg-muted/50 rounded-2xl" />
      </div>
    </div>
  </div>
);

// ============================================
// Level System Functions
// ============================================

const LEVEL_CONFIG: LevelConfig = { xpPerLevel: 100, maxLevel: 50 };

const getLevelFromXP = (xp: number): number =>
  Math.min(Math.floor(xp / LEVEL_CONFIG.xpPerLevel) + 1, LEVEL_CONFIG.maxLevel);

const getLevelTier = (level: number): LevelTier => {
  if (level >= 40)
    return {
      name: "Legendary",
      color: "from-yellow-400 via-orange-500 to-red-500",
      icon: Crown,
    };
  if (level >= 30)
    return {
      name: "Master",
      color: "from-purple-400 via-pink-500 to-rose-500",
      icon: Sparkles,
    };
  if (level >= 20)
    return {
      name: "Expert",
      color: "from-blue-400 via-cyan-500 to-teal-500",
      icon: Award,
    };
  if (level >= 10)
    return {
      name: "Advanced",
      color: "from-green-400 via-emerald-500 to-lime-500",
      icon: TrendingUp,
    };
  return {
    name: "Novice",
    color: "from-gray-400 via-slate-500 to-zinc-500",
    icon: Star,
  };
};

// ============================================
// Main Component
// ============================================

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { token, user: currentUser } = useAuth();

  const [user, setUser] = useState<UserData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [copiedWallet, setCopiedWallet] = useState<boolean>(false);
  const [showImageViewer, setShowImageViewer] = useState<boolean>(false);
  const [viewedImageUrl, setViewedImageUrl] = useState<string>("");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token, currentUser]);

  const fetchUserData = async (): Promise<void> => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
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
        setUser({
          ...data.user,
          followers: data.user.followers || 0,
          following: data.user.following || 0,
        });
        setError("");

        const [invResponse, tradesResponse] = await Promise.all([
          fetch(`/api/inventory?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/trades?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (invResponse.ok) {
          const invData = await invResponse.json();
          setInventory(invData.inventory || []);
        }

        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          setTrades(tradesData.trades || []);
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

  const copyWalletAddress = (): void => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const getDisplayName = (userData: UserData): string => {
    return userData?.name || userData?.email?.split("@")[0] || "User";
  };

  const getDefaultAvatar = (name: string): string => {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
      name
    )}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const openImageViewer = (url: string): void => {
    setViewedImageUrl(url);
    setShowImageViewer(true);
  };

  const closeImageViewer = (): void => {
    setShowImageViewer(false);
    setViewedImageUrl("");
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="py-8">
            <LoadingSkeleton />
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
          <div className="container mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="p-4 bg-destructive/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Package className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                Unable to Load Profile
              </h2>
              <p className="text-muted-foreground mb-8">
                {error ||
                  "The user you're looking for doesn't exist or has been removed."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.back()} size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button variant="outline" onClick={fetchUserData} size="lg">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </motion.div>
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
  const TierIcon = levelTier.icon;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Cover Photo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden"
        >
          <img
            src={coverSrc}
            alt="Cover"
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
            onClick={() => openImageViewer(coverSrc)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </motion.div>

        <div className="container mx-auto px-4 max-w-7xl pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-16 md:-mt-20">
            {/* Left Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <Card className="overflow-hidden border-border/40 shadow-xl">
                <CardContent className="p-6">
                  {/* Avatar */}
                  <div className="relative mb-6">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative w-24 h-24 md:w-32 md:h-32 mx-auto cursor-pointer"
                      onClick={() => openImageViewer(avatarSrc)}
                    >
                      <Avatar className="w-full h-full border-4 border-background shadow-2xl ring-4 ring-primary/20">
                        <AvatarImage
                          src={avatarSrc}
                          alt={displayName}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                          {displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${levelTier.color} flex items-center justify-center border-4 border-background shadow-lg`}
                      >
                        <span className="text-white font-bold text-sm">
                          {currentLevel}
                        </span>
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* User Info */}
                  <div className="text-center space-y-3 mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground break-words">
                      {displayName}
                    </h1>

                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {user.isAdmin && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <Badge
                        className={`bg-gradient-to-r ${levelTier.color} text-white border-0 shadow-md`}
                      >
                        <TierIcon className="w-3 h-3 mr-1" />
                        {levelTier.name}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground break-all px-2">
                      {user.email}
                    </p>

                    {user.createdAt && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {formatDate(user.createdAt)}</span>
                      </div>
                    )}

                    {user.bio && (
                      <p className="text-sm text-muted-foreground leading-relaxed px-4 py-3 bg-muted/30 rounded-lg">
                        {user.bio}
                      </p>
                    )}
                  </div>

                  {/* Level Progress */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-border/40">
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="font-semibold">
                        Level {currentLevel}
                      </span>
                      <span className="text-muted-foreground">
                        {userXP % LEVEL_CONFIG.xpPerLevel}/
                        {LEVEL_CONFIG.xpPerLevel} XP
                      </span>
                    </div>
                    <Progress value={levelProgress} className="h-2.5 mb-3" />
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {userXP} Total XP
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mb-6">
                    <Button className="flex-1 shadow-md">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Propose Trade
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.back()}
                      className="px-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <StatsCard
                      icon={Package}
                      value={totalCards}
                      label="Cards"
                      gradient="from-blue-500 to-cyan-500"
                    />
                    <StatsCard
                      icon={RefreshCw}
                      value={completedTrades}
                      label="Trades"
                      gradient="from-green-500 to-emerald-500"
                    />
                    <StatsCard
                      icon={Star}
                      value={uniqueCollectibles}
                      label="Unique"
                      gradient="from-purple-500 to-pink-500"
                    />
                    <StatsCard
                      icon={Users}
                      value={user.followers}
                      label="Followers"
                      gradient="from-orange-500 to-red-500"
                    />
                  </div>

                  {/* Wallet */}
                  {user.walletAddress && (
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          Wallet
                        </span>
                        <Badge className="bg-green-500 text-white text-xs">
                          Connected
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-background/80 border border-border/40 rounded-lg text-xs font-mono truncate">
                          {user.walletAddress.slice(0, 6)}…
                          {user.walletAddress.slice(-4)}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyWalletAddress}
                          className="h-9 w-9 p-0 shrink-0"
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
                          className="h-9 w-9 p-0 shrink-0"
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

                  {/* Achievements */}
                  {(rareCount > 0 || legendaryCount > 0) && (
                    <div className="mt-6 pt-6 border-t border-border/40 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                        <Award className="w-4 h-4" />
                        Achievements
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {rareCount > 0 && (
                          <StatsCard
                            icon={Star}
                            value={rareCount}
                            label="Rare"
                            gradient="from-purple-500 to-violet-500"
                          />
                        )}
                        {legendaryCount > 0 && (
                          <StatsCard
                            icon={Crown}
                            value={legendaryCount}
                            label="Legendary"
                            gradient="from-yellow-500 to-orange-500"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card className="border-border/40 shadow-xl">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-2 h-12 md:h-14 bg-muted/30 p-1">
                    <TabsTrigger
                      value="overview"
                      className="data-[state=active]:bg-background data-[state=active]:shadow-md text-xs md:text-sm"
                    >
                      <Package className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Collection</span> (
                      {inventory.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="trades"
                      className="data-[state=active]:bg-background data-[state=active]:shadow-md text-xs md:text-sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Trade History</span> (
                      {trades.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="overview"
                    className="p-4 md:p-6 space-y-6"
                  >
                    <AnimatePresence mode="wait">
                      {inventory.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
                        >
                          {inventory.map((item, index) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                            >
                              <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
                                <CardContent className="p-0">
                                  <div
                                    className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden"
                                    onClick={() =>
                                      item.imageUrl &&
                                      openImageViewer(item.imageUrl)
                                    }
                                  >
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name || "Item"}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground/30" />
                                      </div>
                                    )}
                                    {item.rarity && (
                                      <Badge
                                        className={`absolute top-2 right-2 text-xs ${
                                          item.rarity === "legendary"
                                            ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                            : item.rarity === "rare"
                                            ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                            : "bg-gray-500"
                                        } text-white border-0`}
                                      >
                                        {item.rarity}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="p-2 md:p-3 space-y-1.5">
                                    <p className="text-xs md:text-sm font-medium truncate">
                                      {item.name || `Item ${item.id.slice(-4)}`}
                                    </p>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Qty: {item.quantity}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-16 md:py-20"
                        >
                          <div className="p-4 bg-muted/30 rounded-full w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                            <Package className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/50" />
                          </div>
                          <h4 className="font-semibold text-base md:text-lg mb-2">
                            No Collectibles Yet
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            This user hasn't collected any items
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="trades" className="p-4 md:p-6 space-y-4">
                    <AnimatePresence mode="wait">
                      {trades.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-3"
                        >
                          {trades.slice(0, 10).map((trade, index) => (
                            <motion.div
                              key={trade.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                            >
                              <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex-1 space-y-1 min-w-0">
                                    <p className="font-medium text-sm md:text-base truncate">
                                      Trade with{" "}
                                      {trade.partnerName || "Someone"}
                                    </p>
                                    <p className="text-xs md:text-sm text-muted-foreground">
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
                                    className={`capitalize shrink-0 ml-2 ${
                                      trade.status === "completed"
                                        ? "bg-green-500 text-white"
                                        : "bg-orange-500 text-white"
                                    }`}
                                  >
                                    {trade.status}
                                  </Badge>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-16 md:py-20"
                        >
                          <div className="p-4 bg-muted/30 rounded-full w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/50" />
                          </div>
                          <h4 className="font-semibold text-base md:text-lg mb-2">
                            No Trades Yet
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            This user hasn't made any trades
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                </Tabs>
              </Card>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {showImageViewer && (
            <ImageViewer imageUrl={viewedImageUrl} onClose={closeImageViewer} />
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
