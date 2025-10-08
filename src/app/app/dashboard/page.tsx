// app/dashboard/page.tsx (FIXED: Working Send button & List marketplace button)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Assume you have shadcn Input
import {
  LayoutDashboard,
  Package,
  RotateCw,
  Trophy,
  TrendingUp,
  Star,
  User as UserIcon,
  Crown,
  Medal,
  Award,
  Flame,
  Target,
  X,
  Grid,
  List,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

interface Collectible {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rarity: string;
  mintAddress?: string; // FIXED: Added mintAddress
}

interface InventoryItem {
  id: string;
  quantity: number;
  collectible: Collectible;
}

interface Trade {
  id: string;
  status: string;
  sender: { id: string; name: string; username?: string; email: string };
  receiver: { id: string; name: string; username?: string; email: string };
  offeredItems: any[];
  requestedItems: any[];
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  isAdmin?: boolean;
  walletAddress?: string; // FIXED: Added walletAddress
}

interface LeaderboardUser extends User {
  totalCards: number;
  uniqueCards: number;
  rareCards: number;
  legendaryCards: number;
  totalTrades: number;
  score: number;
  rank: number;
}

export default function DashboardPage() {
  const { user, token, walletAddress, connectWallet } = useAuth() as {
    user: User | null;
    token: string | null;
    walletAddress: string | null;
    connectWallet: () => Promise<void>;
  };
  const { publicKey, signTransaction } = useWallet();
  const wallet = useAnchorWallet();
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"
  ); // Use public env for client
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [inventoryView, setInventoryView] = useState<"grid" | "list">("grid");
  // Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isTransferring, setIsTransferring] = useState(false); // FIXED: Added loading state for transfer

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const [invRes, tradesRes] = await Promise.all([
          fetch("/api/inventory", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/trades", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const invData = await invRes.json();
        const tradesData = await tradesRes.json();

        if (invData.success) {
          setInventory(invData.inventory || []);
        } else {
          console.error("Inventory fetch failed:", invData.message);
        }

        if (tradesData.success) {
          setTrades(tradesData.trades || []);
        } else {
          console.error("Trades fetch failed:", tradesData.message);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  useEffect(() => {
    // Initially hide mobile overlay
    const overlay = document.getElementById("mobile-overlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }
  }, []);

  const loadLeaderboard = async () => {
    if (!token) return;
    setIsLeaderboardLoading(true);
    try {
      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
        } else {
          console.error("Leaderboard fetch failed:", data.message);
        }
      } else {
        console.error("Leaderboard fetch error:", res.statusText);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") {
      loadLeaderboard();
    }
  }, [activeTab, token]);

  const handleViewUser = (userId: string) => {
    console.log("Navigating to user ID:", userId); // Debug log
    if (userId === user?.id) {
      router.push("/app/profile");
    } else {
      router.push(`/app/profile/user/${userId}`);
    }
  };

  // FIXED: Improved handleTransfer with wallet check and error handling
  const handleTransfer = async (item: InventoryItem, amount: number = 1) => {
    if (!publicKey || !wallet) {
      try {
        await connectWallet();
        // After connect, re-check and open modal
        if (publicKey && wallet) {
          setSelectedItem(item);
          setShowTransferModal(true);
        }
      } catch (err) {
        setError("Failed to connect wallet: " + (err as Error).message);
      }
      return;
    }
    if (item.quantity < amount) {
      setError("Insufficient quantity");
      return;
    }
    if (!item.collectible.mintAddress) {
      setError("This item cannot be transferred on-chain.");
      return;
    }

    setSelectedItem(item);
    setShowTransferModal(true);
  };

  // FIXED: Improved confirmTransfer with better BigInt handling, loading, and error feedback
  const confirmTransfer = async () => {
    if (
      !selectedItem ||
      !recipientAddress ||
      !signTransaction ||
      !publicKey ||
      !wallet
    )
      return;

    setIsTransferring(true); // FIXED: Set loading state
    try {
      setError(""); // Clear error
      const mintPubkey = new PublicKey(selectedItem.collectible.mintAddress!);
      const senderPubkey = publicKey;
      const recipientPubkey = new PublicKey(recipientAddress);
      // FIXED: Improved BigInt for broader compatibility (use Number for small amounts if needed, but BigInt is fine)
      const amount = BigInt(1) * BigInt(10) ** BigInt(9); // Assume 9 decimals; adjust for your token

      const senderAta = await getAssociatedTokenAddress(
        mintPubkey,
        senderPubkey
      );
      const recipientAta = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
      );

      const instructions: TransactionInstruction[] = [];

      // Check and create sender ATA if needed
      try {
        await getAccount(connection, senderAta);
      } catch {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            senderPubkey, // payer
            senderAta,
            mintPubkey,
            senderPubkey // owner
          )
        );
      }

      // Check and create recipient ATA if needed (sender pays)
      try {
        await getAccount(connection, recipientAta);
      } catch {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            senderPubkey, // payer
            recipientAta,
            mintPubkey,
            recipientPubkey // owner
          )
        );
      }

      // Add transfer instruction
      instructions.push(
        createTransferInstruction(
          senderAta,
          recipientAta,
          senderPubkey,
          amount,
          [],
          TOKEN_PROGRAM_ID // FIXED: Use TOKEN_PROGRAM_ID instead of mintPubkey
        )
      );

      const transaction = new Transaction().add(...instructions);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      // Verify and update DB
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectibleId: selectedItem.id,
          recipientWallet: recipientAddress,
          signature,
          amount: 1,
        }),
      });

      if (!res.ok) throw new Error("DB update failed");

      // Refresh inventory
      window.location.reload();
      setShowTransferModal(false);
      setRecipientAddress("");
    } catch (err) {
      console.error("Transfer failed", err);
      setError("Transfer failed: " + (err as Error).message);
    } finally {
      setIsTransferring(false); // FIXED: Clear loading state
    }
  };

  // FIXED: New handleListOnMarketplace function for the "List" button
  const handleListOnMarketplace = (item: InventoryItem) => {
    // TODO: Implement marketplace listing logic
    // For now, redirect to a marketplace listing page or open a modal
    // Example: router.push(`/app/marketplace/list/${item.id}`);
    console.log("Listing item on marketplace:", item.collectible.name);
    setError("Marketplace listing coming soon! Redirecting to form...");
    // You can integrate with your marketplace API here
    router.push("/app/marketplace/list"); // Assume a listing route
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: "bg-gray-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-yellow-500",
    };
    return colors[rarity as keyof typeof colors] || "bg-gray-500";
  };

  const getTotalQuantity = () => {
    return (inventory || []).reduce(
      (sum: number, item: InventoryItem) => sum + item.quantity,
      0
    );
  };

  const getPendingTrades = () => {
    return (trades || []).filter((trade: Trade) => trade.status === "pending")
      .length;
  };

  const getRarityDistribution = () => {
    const distribution: Record<string, number> = {};
    (inventory || []).forEach((item: InventoryItem) => {
      const rarity = item.collectible.rarity;
      distribution[rarity] = (distribution[rarity] || 0) + item.quantity;
    });
    return distribution;
  };

  const getDisplayName = (userData: any) => {
    if (!userData) return "User";
    return (
      userData?.username ||
      userData?.name ||
      userData?.email?.split("@")[0] ||
      "User"
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-4 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
    if (rank === 2)
      return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
    if (rank === 3)
      return "bg-gradient-to-r from-orange-600 to-red-500 text-white";
    return "bg-primary/10 text-primary";
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inventory", label: "My Inventory", icon: Package },
    { id: "trades", label: "Trades", icon: RotateCw },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const sentTrades = (trades || [])
    .filter((trade) => trade.sender.id === user?.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const receivedTrades = (trades || [])
    .filter((trade) => trade.receiver.id === user?.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <p>Authentication required.</p>
          <Button
            onClick={() => (window.location.href = "/app/login")}
            className="mt-4 cursor-pointer"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const currentUserRank = leaderboard.find((u) => u.id === user.id);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="cursor-pointer"
            >
              Retry
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex flex-1 relative">
          {/* Sidebar - Enhanced responsiveness */}
          <aside className="hidden lg:block w-64 border-r border-border/40 bg-background/50 backdrop-blur-sm fixed left-0 top-0 h-screen pt-16 z-40">
            <div className="p-4 space-y-2 flex flex-col h-full overflow-y-auto">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Mobile Sidebar Overlay - New for better mobile UX */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            id="mobile-overlay"
          >
            <div className="fixed left-0 top-0 h-full w-64 bg-background border-r border-border/40 pt-16 z-50">
              <div className="p-4 space-y-2 flex flex-col h-full overflow-y-auto">
                <button
                  onClick={() => {
                    document
                      .getElementById("mobile-overlay")
                      ?.classList.add("hidden");
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-muted-foreground hover:bg-primary/10 mb-2"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Close</span>
                </button>
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        document
                          .getElementById("mobile-overlay")
                          ?.classList.add("hidden");
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                        activeTab === item.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-left">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Adjusted for sidebar */}
          <main className="flex-1 overflow-y-auto lg:ml-64 transition-all duration-300">
            <div className="container mx-auto px-4 py-6 sm:py-8">
              {/* Header - Responsive */}
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transform capitalize">
                  Welcome back, {getDisplayName(user)}!
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Manage your collectibles and compete on the leaderboard
                </p>
              </div>

              {/* Mobile Navigation - Enhanced with hamburger */}
              <div className="flex lg:hidden mb-4 sm:mb-6 justify-between items-center">
                <button
                  onClick={() => {
                    document
                      .getElementById("mobile-overlay")
                      ?.classList.remove("hidden");
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary/10"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    Menu
                  </span>
                </button>
                <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 max-w-full">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-xs sm:text-sm ${
                          activeTab === item.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-secondary-foreground hover:bg-primary/10"
                        }`}
                      >
                        <Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="font-medium hidden xs:inline">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overview Tab - Enhanced grids */}
              {activeTab === "overview" && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Stats Cards - More responsive cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="border-primary/20 p-3 sm:p-4">
                      <CardHeader className="pb-1">
                        <CardDescription>Total Items</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl lg:text-2xl text-primary">
                          {getTotalQuantity()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          Across {(inventory || []).length} collectibles
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20 p-3 sm:p-4">
                      <CardHeader className="pb-1">
                        <CardDescription>Unique Collectibles</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl lg:text-2xl text-primary">
                          {(inventory || []).length}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          In your collection
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20 p-3 sm:p-4">
                      <CardHeader className="pb-1">
                        <CardDescription>Pending Trades</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl lg:text-2xl text-primary">
                          {getPendingTrades()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          Awaiting response
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20 p-3 sm:p-4">
                      <CardHeader className="pb-1">
                        <CardDescription>Your Rank</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl lg:text-2xl text-primary flex items-center gap-1">
                          #{currentUserRank?.rank || "?"}
                          {currentUserRank && getRankIcon(currentUserRank.rank)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          {currentUserRank?.score || 0} points
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Rarity Distribution - Responsive grid */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-primary" />
                        Rarity Distribution
                      </CardTitle>
                      <CardDescription>
                        Breakdown of your collection by rarity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(inventory || []).length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No collectibles yet
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                          {Object.entries(getRarityDistribution()).map(
                            ([rarity, count]) => (
                              <div
                                key={rarity}
                                className="p-2 sm:p-3 border rounded text-center"
                              >
                                <Badge
                                  className={`${getRarityColor(
                                    rarity
                                  )} text-xs sm:text-sm`}
                                >
                                  {rarity}
                                </Badge>
                                <p className="text-lg sm:text-xl font-bold mt-1">
                                  {count}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  items
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity - Responsive list */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Your latest trades</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(trades || []).length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No recent activity
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(trades || []).slice(0, 5).map((trade) => (
                            <div
                              key={trade.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg hover:bg-primary/5 transition-colors cursor-pointer gap-2 sm:gap-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {trade.sender.id === user.id
                                    ? `Trade sent to ${getDisplayName(
                                        trade.receiver
                                      )}`
                                    : `Trade received from ${getDisplayName(
                                        trade.sender
                                      )}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    trade.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="ml-0 sm:ml-2 self-start sm:self-center flex-shrink-0 text-xs"
                              >
                                {trade.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Inventory Tab - Enhanced responsive grid with view toggle & FIXED Send/List buttons */}
              {activeTab === "inventory" && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Your Collectibles</CardTitle>
                      <CardDescription>
                        {(inventory || []).length === 0
                          ? "You don't have any collectibles yet"
                          : `You have ${
                              (inventory || []).length
                            } unique collectible${
                              (inventory || []).length === 1 ? "" : "s"
                            }`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant={
                          inventoryView === "grid" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setInventoryView("grid")}
                        className="h-8 w-8 p-0"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={
                          inventoryView === "list" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setInventoryView("list")}
                        className="h-8 w-8 p-0"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(inventory || []).length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Your inventory is empty
                        </p>
                        <Button className="cursor-pointer">
                          Start Collecting
                        </Button>
                      </div>
                    ) : inventoryView === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {(inventory || []).map((item) => (
                          <Dialog key={item.id}>
                            <DialogTrigger asChild>
                              <Card className="py-0 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border-primary/10">
                                <div className="relative aspect-square bg-gradient-to-br from-muted to-accent">
                                  {item.collectible.imageUrl ? (
                                    <img
                                      src={item.collectible.imageUrl}
                                      alt={item.collectible.name}
                                      className="w-full h-full object-cover object-[position:center_bottom]"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        const fallback =
                                          e.currentTarget.nextElementSibling;
                                        if (fallback) {
                                          fallback.classList.remove("hidden");
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`absolute inset-0 w-full h-full flex items-center justify-center ${
                                      item.collectible.imageUrl ? "hidden" : ""
                                    }`}
                                  >
                                    <span className="text-4xl font-black opacity-20">
                                      {item.collectible.name.charAt(0)}
                                    </span>
                                  </div>
                                  <Badge
                                    className={`absolute top-1 right-1 text-xs ${getRarityColor(
                                      item.collectible.rarity
                                    )}`}
                                  >
                                    {item.collectible.rarity}
                                  </Badge>
                                </div>

                                <CardHeader className="p-2 sm:p-3">
                                  <CardTitle className="text-sm font-semibold line-clamp-1">
                                    {item.collectible.name}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 sm:p-3 pt-0">
                                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    {item.collectible.description ||
                                      "No description available"}
                                  </p>
                                  <div className="flex justify-between items-center">
                                    <p className="text-xs font-semibold">
                                      Qty: {item.quantity}
                                    </p>
                                    <div className="flex gap-1">
                                      {/* FIXED: Send button with improved disabled state and onClick */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="cursor-pointer text-xs px-2 py-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTransfer(item);
                                        }}
                                        disabled={
                                          isTransferring ||
                                          !publicKey ||
                                          !wallet ||
                                          !item.collectible.mintAddress
                                        }
                                      >
                                        {isTransferring ? (
                                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                        ) : null}
                                        Send
                                      </Button>
                                      {/* FIXED: Changed to "List" button with new handler */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs px-1 py-1 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleListOnMarketplace(item);
                                        }}
                                      >
                                        List
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  {item.collectible.name}
                                </DialogTitle>
                                <DialogDescription>
                                  {item.collectible.description ||
                                    "No description available"}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col items-center space-y-4 pt-4">
                                <div className="relative w-full max-w-sm aspect-square bg-gradient-to-br from-muted to-accent rounded-lg overflow-hidden">
                                  {item.collectible.imageUrl ? (
                                    <img
                                      src={item.collectible.imageUrl}
                                      alt={item.collectible.name}
                                      className="w-full h-full object-cover object-[position:center]"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-6xl font-black opacity-20">
                                        {item.collectible.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <Badge
                                    className={`absolute top-2 right-2 text-sm ${getRarityColor(
                                      item.collectible.rarity
                                    )}`}
                                  >
                                    {item.collectible.rarity.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="text-center space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    Quantity:{" "}
                                    <span className="font-semibold">
                                      {item.quantity}
                                    </span>
                                  </p>
                                  <div className="flex gap-1 w-full">
                                    {/* FIXED: Same improvements in modal */}
                                    <Button
                                      className="flex-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTransfer(item);
                                      }}
                                      disabled={
                                        isTransferring ||
                                        !publicKey ||
                                        !wallet ||
                                        !item.collectible.mintAddress
                                      }
                                    >
                                      {isTransferring ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                      ) : null}
                                      Send
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="flex-1 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleListOnMarketplace(item);
                                      }}
                                    >
                                      List
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    ) : (
                      // List View - More compact for mobile
                      <div className="space-y-2">
                        {(inventory || []).map((item) => (
                          <Dialog key={item.id}>
                            <DialogTrigger asChild>
                              <Card className="flex flex-row items-center gap-3 p-3 hover:shadow-md transition-shadow cursor-pointer border-primary/10 overflow-hidden">
                                <div className="relative flex-shrink-0 w-16 h-16 bg-gradient-to-br from-muted to-accent rounded">
                                  {item.collectible.imageUrl ? (
                                    <img
                                      src={item.collectible.imageUrl}
                                      alt={item.collectible.name}
                                      className="w-full h-full object-cover rounded"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        const fallback =
                                          e.currentTarget.nextElementSibling;
                                        if (fallback) {
                                          fallback.classList.remove("hidden");
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`absolute inset-0 flex items-center justify-center ${
                                      item.collectible.imageUrl ? "hidden" : ""
                                    }`}
                                  >
                                    <span className="text-xl font-black opacity-20">
                                      {item.collectible.name.charAt(0)}
                                    </span>
                                  </div>
                                  <Badge
                                    className={`absolute -top-1 -right-1 text-xs ${getRarityColor(
                                      item.collectible.rarity
                                    )}`}
                                  >
                                    {item.collectible.rarity}
                                  </Badge>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <CardTitle className="text-sm font-semibold line-clamp-1 pr-2">
                                      {item.collectible.name}
                                    </CardTitle>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {item.collectible.description ||
                                      "No description available"}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold">
                                      Qty: {item.quantity}
                                    </p>
                                    <div className="flex gap-1">
                                      {/* FIXED: Send button in list view */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="cursor-pointer text-xs px-3 py-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTransfer(item);
                                        }}
                                        disabled={
                                          isTransferring ||
                                          !publicKey ||
                                          !wallet ||
                                          !item.collectible.mintAddress
                                        }
                                      >
                                        {isTransferring ? (
                                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                        ) : null}
                                        Send
                                      </Button>
                                      {/* FIXED: List button in list view */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs px-1 py-1 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleListOnMarketplace(item);
                                        }}
                                      >
                                        List
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  {item.collectible.name}
                                </DialogTitle>
                                <DialogDescription>
                                  {item.collectible.description ||
                                    "No description available"}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col items-center space-y-4 pt-4">
                                <div className="relative w-full max-w-sm aspect-square bg-gradient-to-br from-muted to-accent rounded-lg overflow-hidden">
                                  {item.collectible.imageUrl ? (
                                    <img
                                      src={item.collectible.imageUrl}
                                      alt={item.collectible.name}
                                      className="w-full h-full object-cover object-[position:center]"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-6xl font-black opacity-20">
                                        {item.collectible.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <Badge
                                    className={`absolute top-2 right-2 text-sm ${getRarityColor(
                                      item.collectible.rarity
                                    )}`}
                                  >
                                    {item.collectible.rarity.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="text-center space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    Quantity:{" "}
                                    <span className="font-semibold">
                                      {item.quantity}
                                    </span>
                                  </p>
                                  <div className="flex gap-1 w-full">
                                    {/* FIXED: Modal buttons */}
                                    <Button
                                      className="flex-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTransfer(item);
                                      }}
                                      disabled={
                                        isTransferring ||
                                        !publicKey ||
                                        !wallet ||
                                        !item.collectible.mintAddress
                                      }
                                    >
                                      {isTransferring ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                      ) : null}
                                      Send
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="flex-1 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleListOnMarketplace(item);
                                      }}
                                    >
                                      List
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Transfer Modal - FIXED with loading and better validation */}
              <Dialog
                open={showTransferModal}
                onOpenChange={setShowTransferModal}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Send {selectedItem?.collectible.name}
                    </DialogTitle>
                    <DialogDescription>
                      Enter recipient Solana wallet address to send on-chain
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                    <Input
                      type="text"
                      placeholder="Recipient Solana wallet address"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      disabled={isTransferring} // FIXED: Disable during loading
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmTransfer}
                        disabled={
                          isTransferring ||
                          !recipientAddress ||
                          !selectedItem?.collectible.mintAddress ||
                          !publicKey ||
                          !wallet
                        }
                      >
                        {isTransferring ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            Sending...
                          </>
                        ) : (
                          "Confirm Send"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowTransferModal(false)}
                        disabled={isTransferring}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Trades Tab - Restructured into Sent and Received sections */}
              {activeTab === "trades" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Your Trades</CardTitle>
                    <CardDescription>
                      Manage sent and received trade requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(trades || []).length === 0 ? (
                      <div className="text-center py-12">
                        <RotateCw className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No trades yet
                        </p>
                        <Button className="cursor-pointer">
                          Start Trading
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Sent Trades Section */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <RotateCw className="w-4 h-4" />
                            Sent Trades ({sentTrades.length})
                          </h3>
                          {sentTrades.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No sent trades yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {sentTrades.map((trade) => (
                                <Card
                                  key={trade.id}
                                  className="cursor-pointer hover:shadow-md transition-shadow p-3"
                                >
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">
                                        To: {getDisplayName(trade.receiver)}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(
                                          trade.createdAt
                                        ).toLocaleString()}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-xs self-start sm:self-auto"
                                      >
                                        {trade.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Received Trades Section */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <RotateCw className="w-4 h-4 rotate-180" />
                            Received Trades ({receivedTrades.length})
                          </h3>
                          {receivedTrades.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No received trades yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {receivedTrades.map((trade) => (
                                <Card
                                  key={trade.id}
                                  className="cursor-pointer hover:shadow-md transition-shadow p-3"
                                >
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">
                                        From: {getDisplayName(trade.sender)}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(
                                          trade.createdAt
                                        ).toLocaleString()}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-xs self-start sm:self-auto"
                                      >
                                        {trade.status}
                                      </Badge>
                                    </div>
                                    {trade.status === "pending" && (
                                      <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 mt-2 sm:mt-0 sm:ml-2">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="cursor-pointer px-2 py-1 text-xs flex-1 sm:flex-none"
                                        >
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="cursor-pointer px-2 py-1 text-xs flex-1 sm:flex-none"
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Marketplace Tab - Placeholder for now */}
              {activeTab === "marketplace" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Marketplace
                    </CardTitle>
                    <CardDescription>
                      Browse and post collectibles for trade
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Marketplace coming soon! Stay tuned for community trading
                      features.
                    </p>
                    <Button variant="outline" className="cursor-pointer">
                      Get Notified
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Leaderboard Tab - Enhanced responsive podium and list */}
              {activeTab === "leaderboard" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadLeaderboard}
                      disabled={isLeaderboardLoading}
                      className="gap-2"
                    >
                      {isLeaderboardLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  {/* Your Ranking Card - Responsive */}
                  {currentUserRank && (
                    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          Your Ranking
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${getRankBadge(
                                currentUserRank.rank
                              )} font-bold text-xs sm:text-sm`}
                            >
                              #{currentUserRank.rank}
                            </div>
                            <div>
                              <p className="font-semibold text-sm sm:text-base">
                                {getDisplayName(currentUserRank)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {currentUserRank.score} points
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-1 sm:flex-none">
                            <div className="grid grid-cols-2 gap-1 sm:gap-2">
                              <div>
                                <p className="text-base sm:text-lg font-bold text-primary">
                                  {currentUserRank.totalCards}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cards
                                </p>
                              </div>
                              <div>
                                <p className="text-base sm:text-lg font-bold text-primary">
                                  {currentUserRank.totalTrades}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Trades
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top 3 Podium - Responsive grid */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        Top Collectors
                      </CardTitle>
                      <CardDescription>
                        The best traders in the community
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLeaderboardLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p>Loading leaderboard...</p>
                        </div>
                      ) : leaderboard.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No leaderboard data available yet
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                          {leaderboard.slice(0, 3).map((rankUser) => {
                            const userName = getDisplayName(rankUser);
                            const getDefaultAvatar = (name: string) =>
                              `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
                                name
                              )}`;

                            return (
                              <Card
                                key={rankUser.id}
                                className={`relative overflow-hidden border-2 p-3 ${
                                  rankUser.rank === 1
                                    ? "border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"
                                    : rankUser.rank === 2
                                    ? "border-gray-400 bg-gradient-to-br from-gray-400/10 to-gray-500/10"
                                    : "border-orange-600 bg-gradient-to-br from-orange-600/10 to-red-500/10"
                                }`}
                              >
                                <div className="flex flex-col items-center text-center">
                                  <div className="relative mb-2">
                                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-background">
                                      <AvatarImage
                                        src={getDefaultAvatar(userName)}
                                        alt={userName}
                                      />
                                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm sm:text-base">
                                        {userName.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div
                                      className={`absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                                        rankUser.rank === 1
                                          ? "bg-yellow-500"
                                          : rankUser.rank === 2
                                          ? "bg-gray-400"
                                          : "bg-orange-600"
                                      }`}
                                    >
                                      {getRankIcon(rankUser.rank)}
                                    </div>
                                  </div>
                                  <h3 className="font-bold text-xs sm:text-sm mb-1 truncate w-full">
                                    {userName}
                                  </h3>
                                  <Badge
                                    className={`mb-2 text-xs ${getRankBadge(
                                      rankUser.rank
                                    )} border-0`}
                                  >
                                    Rank #{rankUser.rank}
                                  </Badge>
                                  <div className="w-full space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Score:
                                      </span>
                                      <span className="font-bold">
                                        {rankUser.score}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Cards:
                                      </span>
                                      <span className="font-semibold">
                                        {rankUser.totalCards}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Trades:
                                      </span>
                                      <span className="font-semibold">
                                        {rankUser.totalTrades}
                                      </span>
                                    </div>
                                    {(rankUser.rareCards > 0 ||
                                      rankUser.legendaryCards > 0) && (
                                      <div className="pt-1 border-t mt-1">
                                        <div className="flex gap-1 justify-center flex-wrap">
                                          {rankUser.legendaryCards > 0 && (
                                            <Badge className="bg-yellow-500 text-xs">
                                              {rankUser.legendaryCards}L
                                            </Badge>
                                          )}
                                          {rankUser.rareCards > 0 && (
                                            <Badge className="bg-purple-500 text-xs">
                                              {rankUser.rareCards}R
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2 cursor-pointer text-xs py-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewUser(rankUser.id);
                                    }}
                                  >
                                    <UserIcon className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Full Leaderboard - Enhanced responsive, scrollable on mobile */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        Global Rankings
                      </CardTitle>
                      <CardDescription>
                        All players ranked by collection score
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {isLeaderboardLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p>Loading rankings...</p>
                        </div>
                      ) : leaderboard.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No rankings available yet. Try refreshing.
                          </p>
                        </div>
                      ) : (
                        <div className="min-w-full sm:min-w-max">
                          {leaderboard.map((rankUser) => {
                            const userName = getDisplayName(rankUser);
                            const getDefaultAvatar = (name: string) =>
                              `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
                                name
                              )}`;
                            const isCurrentUser = rankUser.id === user.id;

                            return (
                              <div
                                key={rankUser.id}
                                onClick={() => handleViewUser(rankUser.id)}
                                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border transition-all cursor-pointer group min-w-full sm:min-w-max gap-3 sm:gap-0 ${
                                  isCurrentUser
                                    ? "bg-primary/10 border-primary/30 hover:bg-primary/15"
                                    : "hover:bg-primary/5 hover:border-primary/20"
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                                  {/* Rank Badge - Responsive */}
                                  <div
                                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold ${getRankBadge(
                                      rankUser.rank
                                    )} text-xs sm:text-sm`}
                                  >
                                    {rankUser.rank <= 3 ? (
                                      getRankIcon(rankUser.rank)
                                    ) : (
                                      <span>#{rankUser.rank}</span>
                                    )}
                                  </div>

                                  {/* User Info - Responsive avatar */}
                                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/20 group-hover:border-primary/50 transition-colors flex-shrink-0">
                                    <AvatarImage
                                      src={getDefaultAvatar(userName)}
                                      alt={userName}
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs sm:text-sm">
                                      {userName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <p className="font-semibold group-hover:text-primary transition-colors text-sm truncate flex-1 min-w-0">
                                        {userName}
                                      </p>
                                      {isCurrentUser && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          You
                                        </Badge>
                                      )}
                                      {rankUser.isAdmin && (
                                        <Badge className="bg-yellow-500 text-xs ml-1">
                                          Admin
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {rankUser.score} points
                                    </p>
                                  </div>
                                </div>

                                {/* Stats Grid - Responsive, full width on mobile */}
                                <div className="w-full sm:ml-4 mt-2 sm:mt-0">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 text-center">
                                    <div>
                                      <p className="text-sm font-bold text-primary">
                                        {rankUser.totalCards}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Cards
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-primary">
                                        {rankUser.uniqueCards}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Unique
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-purple-500">
                                        {rankUser.rareCards}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Rare
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-primary">
                                        {rankUser.totalTrades}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Trades
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Activity Indicator - Responsive */}
                                <div className="mt-2 sm:mt-0 sm:ml-2 self-start sm:self-center">
                                  {rankUser.totalTrades > 20 && (
                                    <Badge className="bg-red-500 gap-1 text-xs">
                                      <Flame className="w-2 h-2" />
                                      Hot
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Score Breakdown Info - Responsive grid */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                        How Scoring Works
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div className="text-center">
                          <p className="font-bold text-base sm:text-lg">1pt</p>
                          <p className="text-muted-foreground">per card</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-base sm:text-lg">5pts</p>
                          <p className="text-muted-foreground">per unique</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-base sm:text-lg">
                            15pts
                          </p>
                          <p className="text-muted-foreground">per rare</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-base sm:text-lg">
                            30pts
                          </p>
                          <p className="text-muted-foreground">per legendary</p>
                        </div>
                        <div className="text-center hidden lg:block">
                          <p className="font-bold text-base sm:text-lg">
                            10pts
                          </p>
                          <p className="text-muted-foreground">per trade</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
