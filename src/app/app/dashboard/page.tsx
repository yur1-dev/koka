"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import dynamic from "next/dynamic"; // Add for Navbar dynamic
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  Users,
  TrendingUp,
  Star,
  User as UserIcon,
} from "lucide-react";

// Dynamic Navbar to avoid wallet/ethereum issues (ssr: false)
const Navbar = dynamic(() => import("@/components/navbar"), { ssr: false });

interface Collectible {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rarity: string;
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
}

export default function DashboardPage() {
  const { user, token, hydrated } = useAuth(); // Add hydrated
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Wait for hydration before fetches
  useEffect(() => {
    if (!hydrated || !token) {
      setIsLoading(false); // Early exit if no auth
      return;
    }

    const loadData = async () => {
      try {
        await Promise.all([fetchInventory(), fetchTrades(), fetchUsers()]);
      } catch (err) {
        setError("Failed to load data—try refreshing.");
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, hydrated]); // Depend on hydrated

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Inventory fetch failed");
      const data = await response.json();
      if (data.success) setInventory(data.inventory || []); // Guard empty
    } catch (err) {
      console.error("Inventory fetch error:", err);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await fetch("/api/trades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Trades fetch failed");
      const data = await response.json();
      if (data.success) setTrades(data.trades || []); // Guard empty
    } catch (err) {
      console.error("Trades fetch error:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Users fetch failed");
      const data = await response.json();
      if (data.success) setUsers(data.users || []); // Guard empty
    } catch (err) {
      console.error("Users fetch error:", err);
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
    return (inventory || []).reduce((sum, item) => sum + item.quantity, 0);
  };

  const getPendingTrades = () => {
    return (trades || []).filter((trade) => trade.status === "pending").length;
  };

  const getRarityDistribution = () => {
    const distribution: Record<string, number> = {};
    (inventory || []).forEach((item) => {
      const rarity = item.collectible.rarity;
      distribution[rarity] = (distribution[rarity] || 0) + item.quantity;
    });
    return distribution;
  };

  const getDisplayName = (userData: any) => {
    return (
      userData?.username ||
      userData?.name ||
      userData?.email?.split("@")[0] ||
      "User"
    );
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inventory", label: "My Inventory", icon: Package },
    { id: "trades", label: "Trades", icon: RefreshCw },
    { id: "users", label: "Users", icon: Users },
  ];

  // Early return if not hydrated/authenticated
  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Authentication required.</p>
          <Button asChild className="mt-4">
            <Link href="/app/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex flex-1 relative">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <aside className="hidden lg:block w-64 border-r border-border/40 bg-background/50 backdrop-blur-sm fixed left-0 top-0 h-screen pt-16">
            <div className="p-4 space-y-2 flex flex-col h-full overflow-y-auto">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto lg:ml-64">
            <div className="container mx-auto px-4 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-transform capitalize">
                  Welcome back, {getDisplayName(user)}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your collectibles and trade with other users
                </p>
              </div>

              {/* Mobile Navigation Tabs */}
              <div className="lg:hidden mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                          activeTab === item.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <CardDescription>Total Items</CardDescription>
                        <CardTitle className="text-3xl text-primary">
                          {getTotalQuantity()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Across {(inventory || []).length} collectibles
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <CardDescription>Unique Collectibles</CardDescription>
                        <CardTitle className="text-3xl text-primary">
                          {(inventory || []).length}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          In your collection
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <CardDescription>Pending Trades</CardDescription>
                        <CardTitle className="text-3xl text-primary">
                          {getPendingTrades()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Awaiting response
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <CardDescription>Total Trades</CardDescription>
                        <CardTitle className="text-3xl text-primary">
                          {(trades || []).length}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          All time
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Rarity Distribution */}
                  <Card>
                    <CardHeader>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(getRarityDistribution()).map(
                            ([rarity, count]) => (
                              <div
                                key={rarity}
                                className="p-4 border rounded-lg text-center"
                              >
                                <Badge className={getRarityColor(rarity)}>
                                  {rarity}
                                </Badge>
                                <p className="text-2xl font-bold mt-2">
                                  {count}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  items
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
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
                        <div className="space-y-3">
                          {(trades || []).slice(0, 5).map((trade) => (
                            <div
                              key={trade.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-semibold">
                                  {trade.sender.id === user.id
                                    ? `Trade sent to ${getDisplayName(
                                        trade.receiver
                                      )}`
                                    : `Trade received from ${getDisplayName(
                                        trade.sender
                                      )}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(
                                    trade.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline">{trade.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === "inventory" && (
                <Card>
                  <CardHeader>
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
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : (inventory || []).length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Your inventory is empty
                        </p>
                        <Button>Start Collecting</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(inventory || []).map((item) => (
                          <Card
                            key={item.id}
                            className="hover:shadow-lg transition-shadow"
                          >
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">
                                  {item.collectible.name}
                                </CardTitle>
                                <Badge
                                  className={getRarityColor(
                                    item.collectible.rarity
                                  )}
                                >
                                  {item.collectible.rarity}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-2">
                                {item.collectible.description ||
                                  "No description available"}
                              </p>
                              <div className="flex justify-between items-center mt-4">
                                <p className="text-sm font-semibold">
                                  Quantity: {item.quantity}
                                </p>
                                <Button size="sm" variant="outline">
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

              {/* Trades Tab */}
              {activeTab === "trades" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Trade History</CardTitle>
                    <CardDescription>
                      View and manage your trades
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(trades || []).length === 0 ? (
                      <div className="text-center py-12">
                        <RefreshCw className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No trades yet
                        </p>
                        <Button>Start Trading</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(trades || []).map((trade) => (
                          <Card key={trade.id}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-semibold">
                                    {trade.sender.id === user.id
                                      ? `To: ${getDisplayName(trade.receiver)}`
                                      : `From: ${getDisplayName(trade.sender)}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(trade.createdAt).toLocaleString()}
                                  </p>
                                  <Badge variant="outline" className="mt-2">
                                    {trade.status}
                                  </Badge>
                                </div>
                                {trade.status === "pending" &&
                                  trade.receiver.id === user.id && (
                                    <div className="space-x-2">
                                      <Button size="sm" variant="default">
                                        Accept
                                      </Button>
                                      <Button size="sm" variant="destructive">
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <Card>
                  <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Find users to trade with</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(users || []).length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          No other users found
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(users || [])
                          .filter((u) => u.id !== (user.id || "")) // Guard user.id
                          .map((u) => (
                            <div
                              key={u.id}
                              className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold">
                                    {getDisplayName(u)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {u.email}
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" className="bg-primary">
                                Propose Trade
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>

        {/* Suppress hydration for dynamic timestamps */}
        <div suppressHydrationWarning>
          <p className="text-xs text-muted-foreground text-center py-2">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
