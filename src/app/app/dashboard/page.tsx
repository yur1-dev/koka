// app/dashboard/page.tsx (FULLY FIXED: Price validation with max cap 10000 SOL; Handles Float prices from schema; Enhanced error parsing for all actions; Founder toast; Responsive views; Off-chain send/list/buy/cancel with refetch; Listed items show in inventory with badge/cancel)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
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
import { Input } from "@/components/ui/input";
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
  DollarSign,
  Users,
  Coins,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Collectible {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rarity: string;
  mintAddress?: string;
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
  walletAddress?: string;
  isFounder?: boolean; // For founder check
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

// Marketplace Listing Interface
interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  collectibleId: string;
  collectible: Collectible;
  price?: number; // Optional SOL price for fixed-price listings
  quantity: number;
  listedAt: string;
  status: "active" | "sold" | "cancelled";
}

export default function DashboardPage() {
  const { user, token } = useAuth() as {
    user: User | null;
    token: string | null;
  };
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<
    MarketplaceListing[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [inventoryView, setInventoryView] = useState<"grid" | "list">("grid");
  // Mobile sidebar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Send state (off-chain)
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [isSending, setIsSending] = useState(false);
  // Listing state (off-chain)
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedItemForListing, setSelectedItemForListing] =
    useState<InventoryItem | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [isListing, setIsListing] = useState(false);
  // Buy state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] =
    useState<MarketplaceListing | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedListingForCancel, setSelectedListingForCancel] =
    useState<MarketplaceListing | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  // Founder toast flag
  const [hasShownFounderToast, setHasShownFounderToast] = useState(false);

  // Refetch inventory function
  const refetchInventory = async () => {
    if (!token) return;
    try {
      console.log("Refetching inventory...");
      const res = await fetch("/api/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Inventory fetch failed:", res.status, errorText);
        throw new Error(`Inventory fetch failed: ${res.status}`);
      }
      let invData;
      try {
        invData = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for inventory:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from inventory API");
      }

      if (invData.success) {
        setInventory(invData.inventory || []);
        console.log("Inventory refetched successfully:", invData.inventory);
      } else {
        console.error("Inventory fetch failed:", invData.message);
      }
    } catch (err) {
      console.error("Failed to refetch inventory:", err);
      setError("Failed to refresh inventory");
      toast.error("Error", { description: "Failed to refresh inventory" });
    }
  };

  // Refetch marketplace function
  const refetchMarketplace = async () => {
    if (!token) return;
    setIsMarketplaceLoading(true);
    try {
      console.log("Refetching marketplace...");
      const res = await fetch("/api/marketplace", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Marketplace fetch failed:", res.status, errorText);
        throw new Error(`Marketplace fetch failed: ${res.status}`);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for marketplace:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from marketplace API");
      }

      if (data.success) {
        setMarketplaceListings(data.listings || []);
        console.log("Marketplace refetched successfully:", data.listings);
      } else {
        console.error("Marketplace fetch failed:", data.message);
      }
    } catch (err) {
      console.error("Failed to refetch marketplace:", err);
      setError("Failed to refresh marketplace");
      toast.error("Error", { description: "Failed to refresh marketplace" });
    } finally {
      setIsMarketplaceLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        console.log("Loading initial dashboard data...");
        const [invRes, tradesRes] = await Promise.all([
          fetch("/api/inventory", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/trades", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!invRes.ok) {
          const errorText = await invRes.text();
          console.error("Inventory fetch failed:", invRes.status, errorText);
          throw new Error(`Inventory fetch failed: ${invRes.status}`);
        }
        let invData;
        try {
          invData = await invRes.json();
        } catch (parseErr) {
          console.error("JSON parse failed for inventory:", parseErr);
          const rawText = await invRes.text();
          console.error("Raw response:", rawText);
          throw new Error("Invalid JSON response from inventory API");
        }

        if (!tradesRes.ok) {
          const errorText = await tradesRes.text();
          console.error("Trades fetch failed:", tradesRes.status, errorText);
          throw new Error(`Trades fetch failed: ${tradesRes.status}`);
        }
        let tradesData;
        try {
          tradesData = await tradesRes.json();
        } catch (parseErr) {
          console.error("JSON parse failed for trades:", parseErr);
          const rawText = await tradesRes.text();
          console.error("Raw response:", rawText);
          throw new Error("Invalid JSON response from trades API");
        }

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

        // Founder congratulations toast on first load
        if (user?.isFounder && !hasShownFounderToast) {
          toast.success("Welcome, Founder! 🎉", {
            description: `As one of the first 50 members, your exclusive NFT is ready in your inventory. Start trading and level up!`,
          });
          setHasShownFounderToast(true);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load dashboard data");
        toast.error("Error", { description: "Failed to load dashboard data" });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, user?.isFounder, hasShownFounderToast]);

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const loadLeaderboard = async () => {
    if (!token) return;
    setIsLeaderboardLoading(true);
    try {
      console.log("Loading leaderboard...");
      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Leaderboard fetch failed:", res.status, errorText);
        throw new Error(`Leaderboard fetch failed: ${res.status}`);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for leaderboard:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from leaderboard API");
      }

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        console.log("Leaderboard loaded successfully:", data.leaderboard);
      } else {
        console.error("Leaderboard fetch failed:", data.message);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      toast.error("Error", { description: "Failed to load leaderboard" });
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") {
      loadLeaderboard();
    } else if (activeTab === "inventory" || activeTab === "marketplace") {
      refetchMarketplace();
    }
  }, [activeTab, token]);

  const handleViewUser = (userId: string) => {
    console.log("Navigating to user ID:", userId);
    if (userId === user?.id) {
      router.push("/app/profile");
    } else {
      router.push(`/app/profile/user/${userId}`);
    }
  };

  // handleSend - Now off-chain send via username lookup
  const handleSend = (item: InventoryItem, amount: number = 1) => {
    if (item.quantity < amount) {
      setError("Insufficient quantity");
      toast.error("Error", { description: "Insufficient quantity" });
      return;
    }
    setSelectedItem(item);
    setShowSendModal(true);
  };

  // confirmSend - Off-chain transfer via API (assumes /api/inventory/send-offchain exists)
  const confirmSend = async () => {
    if (!selectedItem || !recipientUsername) return;

    setIsSending(true);
    try {
      setError("");
      console.log("Sending item off-chain...");
      const res = await fetch("/api/inventory/send-offchain", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectibleId: selectedItem.collectible.id,
          recipientUsername,
          amount: 1,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Send failed:", res.status, errorText);
        let errorMsg = `Send failed: ${res.status}`;
        if (
          errorText.trim().startsWith("{") ||
          errorText.trim().startsWith("[")
        ) {
          try {
            const errData = JSON.parse(errorText);
            if (errData && typeof errData === "object" && errData.message) {
              errorMsg = errData.message;
            }
          } catch (parseErr) {
            console.error("Failed to parse send error:", parseErr);
          }
        }
        throw new Error(errorMsg);
      }

      let sendData;
      try {
        sendData = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for send response:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from send API");
      }

      if (sendData.success) {
        // Refetch data instead of reload
        await refetchInventory();
        setShowSendModal(false);
        setRecipientUsername("");
        toast.success("Success!", {
          description: `Sent 1x ${selectedItem.collectible.name} to ${recipientUsername}`,
        });
      } else {
        throw new Error(sendData.message || "Send failed");
      }
    } catch (err) {
      console.error("Off-chain Send failed", err);
      const errMsg = (err as Error).message;
      setError("Send failed: " + errMsg);
      toast.error("Send Failed", { description: errMsg });
    } finally {
      setIsSending(false);
    }
  };

  // handleListOnMarketplace - Now opens listing modal
  const handleListOnMarketplace = (item: InventoryItem) => {
    setSelectedItemForListing(item);
    setListingPrice("");
    setShowListingModal(true);
  };

  // confirmListing - Off-chain listing via API (assumes /api/marketplace/list exists); FIXED: Added max price cap 10000 SOL
  const confirmListing = async () => {
    if (!selectedItemForListing || !listingPrice) return;

    setIsListing(true);
    try {
      setError("");
      console.log("Listing item...");
      const priceNum = parseFloat(listingPrice);
      if (isNaN(priceNum) || priceNum <= 0 || priceNum > 100000000) {
        throw new Error(
          "Invalid price: Must be between 0.01 and 100000000 SOL"
        );
      }

      const res = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectibleId: selectedItemForListing.collectible.id,
          price: priceNum,
          quantity: 1, // Hardcoded to 1
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Listing failed:", res.status, errorText);
        let errorMsg = `Listing failed: ${res.status}`;
        if (
          errorText.trim().startsWith("{") ||
          errorText.trim().startsWith("[")
        ) {
          try {
            const errData = JSON.parse(errorText);
            if (errData && typeof errData === "object" && errData.message) {
              errorMsg = errData.message;
            }
          } catch (parseErr) {
            console.error("Failed to parse listing error:", parseErr);
          }
        }
        throw new Error(errorMsg);
      }

      let listingData;
      try {
        listingData = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for listing response:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from listing API");
      }

      if (listingData.success) {
        // Refetch data instead of reload
        await Promise.all([refetchInventory(), refetchMarketplace()]);
        setShowListingModal(false);
        setListingPrice("");
        toast.success("Listed!", {
          description: `Your ${selectedItemForListing.collectible.name} is now available for ${priceNum} SOL`,
        });
      } else {
        throw new Error(listingData.message || "Listing failed");
      }
    } catch (err) {
      console.error("Off-chain Listing failed", err);
      const errMsg = (err as Error).message;
      setError("Listing failed: " + errMsg);
      toast.error("Listing Failed", { description: errMsg });
    } finally {
      setIsListing(false);
    }
  };

  // handleCancelListing - Opens cancel modal
  const handleCancelListing = (listing: MarketplaceListing) => {
    if (listing.sellerId !== user?.id) {
      setError("You can only cancel your own listings");
      toast.error("Error", {
        description: "You can only cancel your own listings",
      });
      return;
    }
    setSelectedListingForCancel(listing);
    setShowCancelModal(true);
  };

  // confirmCancel - Calls cancel API (assumes /api/marketplace/cancel exists)
  const confirmCancel = async () => {
    if (!selectedListingForCancel || !token) return;

    setIsCanceling(true);
    try {
      setError("");
      console.log("Canceling listing...");
      const res = await fetch("/api/marketplace/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: selectedListingForCancel.id,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Cancel failed:", res.status, errorText);
        let errorMsg = `Cancel failed: ${res.status}`;
        // Safely attempt JSON parse only if it looks like JSON (starts with { or [)
        if (
          errorText.trim().startsWith("{") ||
          errorText.trim().startsWith("[")
        ) {
          try {
            const errData = JSON.parse(errorText);
            if (errData && typeof errData === "object" && errData.message) {
              errorMsg = errData.message;
            }
          } catch (parseErr) {
            console.error("Failed to parse cancel error:", parseErr);
          }
        }
        throw new Error(errorMsg);
      }

      let cancelData;
      try {
        cancelData = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for cancel response:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from cancel API");
      }

      if (cancelData.success) {
        // Refetch data instead of reload
        await Promise.all([refetchInventory(), refetchMarketplace()]);
        setShowCancelModal(false);
        toast.success("Cancelled!", {
          description: `Your listing for ${selectedListingForCancel.collectible.name} has been removed`,
        });
      } else {
        throw new Error(cancelData.message || "Cancel failed");
      }
    } catch (err) {
      console.error("Off-chain Cancel failed", err);
      const errMsg = (err as Error).message;
      setError("Cancel failed: " + errMsg);
      toast.error("Cancel Failed", { description: errMsg });
    } finally {
      setIsCanceling(false);
    }
  };

  // handleBuy - Opens buy modal
  const handleBuy = (listing: MarketplaceListing) => {
    if (listing.sellerId === user?.id) {
      setError("Cannot buy your own listing");
      toast.error("Error", { description: "Cannot buy your own listing" });
      return;
    }
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  // confirmBuy - Calls buy API
  const confirmBuy = async () => {
    if (!selectedListing || !token) return;

    setIsBuying(true);
    try {
      setError("");
      console.log("Buying listing...");
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Buy failed:", res.status, errorText);
        let errorMsg = `Buy failed: ${res.status}`;
        // Safely attempt JSON parse only if it looks like JSON
        if (
          errorText.trim().startsWith("{") ||
          errorText.trim().startsWith("[")
        ) {
          try {
            const errData = JSON.parse(errorText);
            if (errData && typeof errData === "object" && errData.message) {
              errorMsg = errData.message;
            }
          } catch (parseErr) {
            console.error("Failed to parse buy error:", parseErr);
          }
        }
        throw new Error(errorMsg);
      }

      let buyData;
      try {
        buyData = await res.json();
      } catch (parseErr) {
        console.error("JSON parse failed for buy response:", parseErr);
        const rawText = await res.text();
        console.error("Raw response:", rawText);
        throw new Error("Invalid JSON response from buy API");
      }

      if (buyData.success) {
        // Refetch data instead of reload
        await Promise.all([refetchInventory(), refetchMarketplace()]);
        setShowBuyModal(false);
        toast.success("Purchased!", {
          description: `You now own ${selectedListing.collectible.name}!`,
        });
      } else {
        throw new Error(buyData.message || "Buy failed");
      }
    } catch (err) {
      console.error("Off-chain Buy failed", err);
      const errMsg = (err as Error).message;
      setError("Buy failed: " + errMsg);
      toast.error("Buy Failed", { description: errMsg });
    } finally {
      setIsBuying(false);
    }
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
          <aside
            className={`hidden lg:block w-64 border-r border-border/40 bg-background/50 backdrop-blur-sm fixed left-0 top-0 h-screen pt-16 z-40`}
          >
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

          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 lg:hidden bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div
                className="fixed left-0 top-0 h-full w-64 bg-background border-r border-border/40 pt-16 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 space-y-2 flex flex-col h-full overflow-y-auto">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
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
                          setIsMobileMenuOpen(false);
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
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto lg:ml-64 transition-all duration-300">
            <div className="container mx-auto px-4 py-6 sm:py-8">
              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transform capitalize">
                  Welcome back, {getDisplayName(user)}!
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  {user?.isFounder
                    ? "As a Founder, your exclusive collection awaits. Manage your collectibles and compete on the leaderboard"
                    : "Manage your collectibles and compete on the leaderboard"}
                </p>
              </div>

              {/* Mobile Navigation */}
              <div className="flex lg:hidden mb-4 sm:mb-6 justify-between items-center">
                <button
                  onClick={toggleMobileMenu}
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

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-4 sm:space-y-6">
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
                            {user?.isFounder
                              ? "Your Founder NFT should appear here. Try refreshing if it's missing!"
                              : "No collectibles yet"}
                          </p>
                          <Button
                            variant="outline"
                            onClick={refetchInventory}
                            className="mt-2"
                          >
                            Refresh Inventory
                          </Button>
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

              {/* Inventory Tab - Updated buttons for off-chain Send/List/Cancel; FIXED: Disable Send/List if quantity < 1 */}
              {activeTab === "inventory" && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Your Collectibles</CardTitle>
                      <CardDescription>
                        {(inventory || []).length === 0
                          ? user?.isFounder
                            ? "Your Founder NFT should be here. Refresh if missing!"
                            : "You don't have any collectibles yet"
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
                          {user?.isFounder
                            ? "Your Founder inventory is empty. Claim it again or refresh!"
                            : "Your inventory is empty"}
                        </p>
                        <Button
                          onClick={refetchInventory}
                          className="cursor-pointer"
                        >
                          Refresh Inventory
                        </Button>
                      </div>
                    ) : inventoryView === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {(inventory || []).map((item) => {
                          const isListed = marketplaceListings.some(
                            (listing) =>
                              listing.sellerId === user?.id &&
                              listing.collectibleId === item.collectible.id &&
                              listing.status === "active"
                          );
                          const listing = marketplaceListings.find(
                            (l) =>
                              l.sellerId === user?.id &&
                              l.collectibleId === item.collectible.id &&
                              l.status === "active"
                          );
                          const hasQuantity = item.quantity >= 1;
                          return (
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
                                          e.currentTarget.style.display =
                                            "none";
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
                                        item.collectible.imageUrl
                                          ? "hidden"
                                          : ""
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
                                      <div className="flex flex-col items-start">
                                        <p className="text-xs font-semibold">
                                          Qty: {item.quantity}
                                        </p>
                                        {isListed && listing && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs mt-1"
                                          >
                                            Listed for {listing.price} SOL
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="cursor-pointer text-xs px-2 py-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSend(item);
                                          }}
                                          disabled={
                                            isSending ||
                                            !hasQuantity ||
                                            isListed
                                          }
                                        >
                                          {isSending ? (
                                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                          ) : null}
                                          Send
                                        </Button>
                                        {isListed ? (
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="text-xs px-2 py-1 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (listing) {
                                                handleCancelListing(listing);
                                              }
                                            }}
                                            disabled={isCanceling}
                                          >
                                            {isCanceling ? (
                                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                            ) : null}
                                            Cancel
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs px-1 py-1 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleListOnMarketplace(item);
                                            }}
                                            disabled={isListing || !hasQuantity}
                                          >
                                            {isListing ? (
                                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                            ) : null}
                                            List
                                          </Button>
                                        )}
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
                                    {isListed && listing && (
                                      <Badge
                                        variant="secondary"
                                        className="text-sm"
                                      >
                                        Listed for {listing.price} SOL
                                      </Badge>
                                    )}
                                    <div className="flex gap-1 w-full">
                                      <Button
                                        className="flex-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSend(item);
                                        }}
                                        disabled={
                                          isSending || !hasQuantity || isListed
                                        }
                                      >
                                        {isSending ? (
                                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                        ) : null}
                                        Send
                                      </Button>
                                      {isListed ? (
                                        <Button
                                          variant="destructive"
                                          className="flex-1 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (listing) {
                                              handleCancelListing(listing);
                                            }
                                          }}
                                          disabled={isCanceling}
                                        >
                                          {isCanceling ? (
                                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                          ) : null}
                                          Cancel
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          className="flex-1 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleListOnMarketplace(item);
                                          }}
                                          disabled={isListing || !hasQuantity}
                                        >
                                          {isListing ? (
                                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                          ) : null}
                                          List
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(inventory || []).map((item) => {
                          const isListed = marketplaceListings.some(
                            (listing) =>
                              listing.sellerId === user?.id &&
                              listing.collectibleId === item.collectible.id &&
                              listing.status === "active"
                          );
                          const listing = marketplaceListings.find(
                            (l) =>
                              l.sellerId === user?.id &&
                              l.collectibleId === item.collectible.id &&
                              l.status === "active"
                          );
                          const hasQuantity = item.quantity >= 1;
                          return (
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
                                          e.currentTarget.style.display =
                                            "none";
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
                                        item.collectible.imageUrl
                                          ? "hidden"
                                          : ""
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
                                      <div className="flex flex-col items-start">
                                        <p className="text-xs font-semibold">
                                          Qty: {item.quantity}
                                        </p>
                                        {isListed && listing && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs mt-1"
                                          >
                                            Listed for {listing.price} SOL
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="cursor-pointer text-xs px-3 py-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSend(item);
                                          }}
                                          disabled={
                                            isSending ||
                                            !hasQuantity ||
                                            isListed
                                          }
                                        >
                                          {isSending ? (
                                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                          ) : null}
                                          Send
                                        </Button>
                                        {isListed ? (
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="text-xs px-2 py-1 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (listing) {
                                                handleCancelListing(listing);
                                              }
                                            }}
                                            disabled={isCanceling}
                                          >
                                            {isCanceling ? (
                                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                            ) : null}
                                            Cancel
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs px-1 py-1 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleListOnMarketplace(item);
                                            }}
                                            disabled={isListing || !hasQuantity}
                                          >
                                            {isListing ? (
                                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                            ) : null}
                                            List
                                          </Button>
                                        )}
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
                                    {isListed && listing && (
                                      <Badge
                                        variant="secondary"
                                        className="text-sm"
                                      >
                                        Listed for {listing.price} SOL
                                      </Badge>
                                    )}
                                    <div className="flex gap-1 w-full">
                                      <Button
                                        className="flex-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSend(item);
                                        }}
                                        disabled={
                                          isSending || !hasQuantity || isListed
                                        }
                                      >
                                        {isSending ? (
                                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                        ) : null}
                                        Send
                                      </Button>
                                      {isListed ? (
                                        <Button
                                          variant="destructive"
                                          className="flex-1 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (listing) {
                                              handleCancelListing(listing);
                                            }
                                          }}
                                          disabled={isCanceling}
                                        >
                                          {isCanceling ? (
                                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                          ) : null}
                                          Cancel
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          className="flex-1 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleListOnMarketplace(item);
                                          }}
                                          disabled={isListing || !hasQuantity}
                                        >
                                          {isListing ? (
                                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                          ) : null}
                                          List
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Send Modal - Off-chain */}
              <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Send {selectedItem?.collectible.name}
                    </DialogTitle>
                    <DialogDescription>
                      Enter the recipient's username to send the item off-chain.
                      This will transfer 1 unit from your inventory to theirs.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                    <Input
                      type="text"
                      placeholder="Recipient username (e.g., john_doe)"
                      value={recipientUsername}
                      onChange={(e) => setRecipientUsername(e.target.value)}
                      disabled={isSending}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmSend}
                        disabled={
                          isSending ||
                          !recipientUsername ||
                          !selectedItem ||
                          selectedItem.quantity < 1
                        }
                        className="flex-1"
                      >
                        {isSending ? (
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
                        onClick={() => setShowSendModal(false)}
                        disabled={isSending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Listing Modal - Off-chain; FIXED: Added max="10000" */}
              <Dialog
                open={showListingModal}
                onOpenChange={setShowListingModal}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      List {selectedItemForListing?.collectible.name} for Sale
                    </DialogTitle>
                    <DialogDescription>
                      Set a price in SOL for your listing. This will make 1 unit
                      available for others to buy off-chain. You can cancel the
                      listing anytime.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        type="number"
                        placeholder="Price in SOL (e.g., 0.5)"
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                        disabled={isListing}
                        className="pl-10"
                        step="0.01"
                        min="0.01"
                        max="10000"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmListing}
                        disabled={
                          isListing ||
                          !listingPrice ||
                          !selectedItemForListing ||
                          selectedItemForListing.quantity < 1
                        }
                        className="flex-1"
                      >
                        {isListing ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            Listing...
                          </>
                        ) : (
                          "Confirm List"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowListingModal(false)}
                        disabled={isListing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Cancel Modal */}
              <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Cancel Listing
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel the listing for{" "}
                      {selectedListingForCancel?.collectible.name}? This will
                      remove it from the marketplace and return the item to your
                      inventory (if applicable).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">Price:</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedListingForCancel?.price} SOL
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmCancel}
                        disabled={isCanceling || !selectedListingForCancel}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isCanceling ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            Canceling...
                          </>
                        ) : (
                          "Confirm Cancel"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelModal(false)}
                        disabled={isCanceling}
                      >
                        Keep Listed
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Buy Modal */}
              <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Buy {selectedListing?.collectible.name}
                    </DialogTitle>
                    <DialogDescription>
                      Confirm purchase from {selectedListing?.sellerName} for{" "}
                      {selectedListing?.price} SOL (off-chain payment). This
                      will transfer the item to your inventory upon completion.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">Price:</span>
                      <Badge variant="default" className="text-xs bg-green-600">
                        {selectedListing?.price} SOL
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmBuy}
                        disabled={isBuying || !selectedListing}
                        className="flex-1"
                      >
                        {isBuying ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            Buying...
                          </>
                        ) : (
                          "Confirm Buy"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowBuyModal(false)}
                        disabled={isBuying}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Trades Tab */}
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

              {/* Marketplace Tab - Now functional with listings grid; FIXED: Proper display of active listings */}
              {activeTab === "marketplace" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Marketplace
                    </CardTitle>
                    <CardDescription>
                      Browse and buy collectibles from other users (off-chain
                      trades)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refetchMarketplace}
                        disabled={isMarketplaceLoading}
                        className="gap-2"
                      >
                        {isMarketplaceLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Refresh
                      </Button>
                    </div>
                    {isMarketplaceLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p>Loading marketplace...</p>
                      </div>
                    ) : marketplaceListings.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No listings available yet
                        </p>
                        <Button variant="outline" className="cursor-pointer">
                          List Your First Item
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {marketplaceListings
                          .filter((listing) => listing.status === "active")
                          .map((listing) => (
                            <Card
                              key={listing.id}
                              className="hover:shadow-lg transition-shadow overflow-hidden"
                            >
                              <div className="relative aspect-square bg-gradient-to-br from-muted to-accent">
                                {listing.collectible.imageUrl ? (
                                  <img
                                    src={listing.collectible.imageUrl}
                                    alt={listing.collectible.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-4xl font-black opacity-20">
                                      {listing.collectible.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <Badge
                                  className={`absolute top-1 right-1 text-xs ${getRarityColor(
                                    listing.collectible.rarity
                                  )}`}
                                >
                                  {listing.collectible.rarity}
                                </Badge>
                              </div>
                              <CardHeader className="p-3">
                                <CardTitle className="text-sm font-semibold line-clamp-1">
                                  {listing.collectible.name}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  By{" "}
                                  {getDisplayName({ name: listing.sellerName })}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                  {listing.collectible.description ||
                                    "No description available"}
                                </p>
                                <div className="flex items-center justify-between mb-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Qty: {listing.quantity}
                                  </Badge>
                                  {listing.price && (
                                    <Badge
                                      variant="default"
                                      className="text-xs bg-green-600"
                                    >
                                      {listing.price} SOL
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {listing.sellerId === user?.id ? (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex-1 cursor-pointer"
                                      onClick={() =>
                                        handleCancelListing(listing)
                                      }
                                      disabled={isCanceling}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Cancel
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="flex-1 cursor-pointer"
                                      onClick={() => handleBuy(listing)}
                                    >
                                      <DollarSign className="w-3 h-3 mr-1" />
                                      Buy
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 cursor-pointer"
                                    onClick={() => {
                                      // TODO: Implement offer/trade
                                      console.log(
                                        "Trade for listing:",
                                        listing.id
                                      );
                                    }}
                                  >
                                    <Users className="w-3 h-3 mr-1" />
                                    Trade
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Leaderboard Tab */}
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
