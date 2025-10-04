"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Save,
  User,
  Shield,
  CheckCircle2,
  Wallet,
  Lock,
  Package,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertTriangle,
  X,
  Trophy,
  Star,
  Zap,
  Award,
  TrendingUp,
  Edit,
} from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getPhantomPublicKey } from "@/lib/phantom-wallet";
import { CustomWalletModal } from "@/components/custom-wallet-modal";

const LEVEL_CONFIG = {
  xpPerLevel: 100,
  maxLevel: 50,
};

const getLevelFromXP = (xp: number) => {
  return Math.floor(xp / LEVEL_CONFIG.xpPerLevel) + 1;
};

const getXPForNextLevel = (xp: number) => {
  const currentLevel = getLevelFromXP(xp);
  return currentLevel * LEVEL_CONFIG.xpPerLevel;
};

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

interface Task {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  progress: number;
  maxProgress: number;
  icon: any;
}

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);

  // Profile form
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  const [userXP, setUserXP] = useState(250); // Example: 250 XP = Level 3
  const [isVerified, setIsVerified] = useState(true); // Example verified status

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalTrades: 0,
    uniqueCollectibles: 0,
    totalCards: 0,
    rareCards: 0,
    legendaryCards: 0,
  });

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "First Trade",
      description: "Complete your first trade",
      xpReward: 50,
      completed: false,
      progress: 0,
      maxProgress: 1,
      icon: RefreshCw,
    },
    {
      id: "2",
      title: "Card Collector",
      description: "Collect 10 unique cards",
      xpReward: 100,
      completed: false,
      progress: 0,
      maxProgress: 10,
      icon: Package,
    },
    {
      id: "3",
      title: "Trading Master",
      description: "Complete 25 trades",
      xpReward: 200,
      completed: false,
      progress: 0,
      maxProgress: 25,
      icon: Trophy,
    },
    {
      id: "4",
      title: "Rare Hunter",
      description: "Collect 5 rare cards",
      xpReward: 150,
      completed: false,
      progress: 0,
      maxProgress: 5,
      icon: Star,
    },
  ]);

  // Wallet
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setPasswordSuccess("Password updated successfully!");
      } else {
        const data = await response.json();
        setPasswordError(data.message || "Failed to update password");
      }
    } catch (err) {
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      setUsername(user.username || user.name || "");
      setEmail(user.email || "");
      fetchProfile();
      fetchStats();
      checkWalletConnection();
      fetchUserProgress();
    }
  }, [user, token]);

  const fetchUserProgress = async () => {
    try {
      const response = await fetch("/api/user/progress", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserXP(data.xp || 0);
        setIsVerified(data.isVerified || false);
        if (data.tasks) {
          setTasks(data.tasks);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user progress:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || "");
        setCoverPhotoUrl(data.coverPhotoUrl || "");
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch inventory
      const inventoryRes = await fetch("/api/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const inventoryData = await inventoryRes.json();

      // Fetch trades
      const tradesRes = await fetch("/api/trades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tradesData = await tradesRes.json();

      const totalItems =
        inventoryData.inventory?.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        ) || 0;

      const totalCards =
        inventoryData.inventory
          ?.filter((item: any) => item.type === "card")
          .reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

      const rareCards =
        inventoryData.inventory?.filter(
          (item: any) => item.type === "card" && item.rarity === "rare"
        ).length || 0;

      const legendaryCards =
        inventoryData.inventory?.filter(
          (item: any) => item.type === "card" && item.rarity === "legendary"
        ).length || 0;

      setStats({
        totalItems,
        uniqueCollectibles: inventoryData.inventory?.length || 0,
        totalTrades: tradesData.trades?.length || 0,
        totalCards,
        rareCards,
        legendaryCards,
      });

      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id === "1") {
            return {
              ...task,
              progress: Math.min(tradesData.trades?.length || 0, 1),
              completed: (tradesData.trades?.length || 0) >= 1,
            };
          }
          if (task.id === "2") {
            return {
              ...task,
              progress: inventoryData.inventory?.length || 0,
              completed: (inventoryData.inventory?.length || 0) >= 10,
            };
          }
          if (task.id === "3") {
            return {
              ...task,
              progress: tradesData.trades?.length || 0,
              completed: (tradesData.trades?.length || 0) >= 25,
            };
          }
          if (task.id === "4") {
            return { ...task, progress: rareCards, completed: rareCards >= 5 };
          }
          return task;
        })
      );
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Cover photo must be less than 10MB");
        return;
      }

      setCoverPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("bio", bio);

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      if (coverPhotoFile) {
        formData.append("coverPhoto", coverPhotoFile);
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Profile updated successfully!");

        // Update the navbar immediately
        updateUser({
          name: username,
          email: email,
          avatarUrl: data.avatarUrl || previewUrl || avatarUrl,
        });

        setAvatarFile(null);
        setPreviewUrl("");
        setCoverPhotoFile(null);
        setCoverPreviewUrl("");

        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
        if (data.coverPhotoUrl) {
          setCoverPhotoUrl(data.coverPhotoUrl);
        }

        setIsEditMode(false);

        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setPreviewUrl("");
    setAvatarFile(null);
    setCoverPreviewUrl("");
    setCoverPhotoFile(null);
    setUsername(user?.username || user?.name || "");
    setEmail(user?.email || "");
    setError("");
  };

  const claimTaskReward = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.completed) return;

    try {
      const response = await fetch("/api/user/claim-task", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserXP((prev) => prev + task.xpReward);

        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, completed: false, progress: 0 } : t
          )
        );

        setMessage(`Claimed ${task.xpReward} XP!`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Failed to claim task:", err);
      setError("Failed to claim reward. Please try again.");
    }
  };

  const checkWalletConnection = async () => {
    const address = getPhantomPublicKey();
    if (address) {
      setWalletAddress(address);

      try {
        const connection = new Connection("https://api.devnet.solana.com");
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
      }
    }
  };

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const getDefaultAvatar = (name: string) => {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
      name
    )}`;
  };

  const currentAvatarUrl =
    previewUrl || avatarUrl || getDefaultAvatar(username);
  // Get current cover photo URL
  const currentCoverUrl =
    coverPreviewUrl || coverPhotoUrl || "/abstract-gradient.png";

  const currentLevel = getLevelFromXP(userXP);
  const xpForNextLevel = getXPForNextLevel(userXP);
  const xpInCurrentLevel = userXP % LEVEL_CONFIG.xpPerLevel;
  const levelProgress = (xpInCurrentLevel / LEVEL_CONFIG.xpPerLevel) * 100;
  const levelTier = getLevelTier(currentLevel);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Card className="mb-6 border-primary/20 overflow-hidden">
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 to-primary/5">
              <img
                src={currentCoverUrl || "/placeholder.svg"}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              {isEditMode && (
                <Label
                  htmlFor="cover-upload"
                  className="absolute bottom-4 right-4 cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-background/90 backdrop-blur-sm border border-primary/20 rounded-md hover:bg-background transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Cover</span>
                </Label>
              )}
              <Input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverPhotoChange}
              />
            </div>

            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-6 -mt-20 md:-mt-16">
                {/* Avatar Section */}
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                    <AvatarImage
                      src={currentAvatarUrl || "/placeholder.svg"}
                      alt={username}
                    />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {getInitials(username)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br ${levelTier.color} flex items-center justify-center border-4 border-background shadow-lg`}
                  >
                    <span className="text-white font-bold">{currentLevel}</span>
                  </div>
                  {isEditMode && (
                    <Label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </Label>
                  )}
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Profile Info Section */}
                <div className="flex-1 w-full text-center">
                  {isEditMode ? (
                    <div className="space-y-3 mb-4 max-w-2xl mx-auto">
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="text-2xl font-bold h-auto py-2 text-center"
                      />
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="text-center"
                      />
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full min-h-20 px-3 py-2 border rounded-md bg-background resize-none"
                        placeholder="Tell us about yourself..."
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {bio.length}/200
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                        <h1 className="text-3xl font-bold">{username}</h1>
                        {isVerified && (
                          <Badge className="bg-blue-500 cursor-default">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        <Badge
                          className={`bg-gradient-to-r ${levelTier.color} text-white border-0 cursor-default`}
                        >
                          <Award className="w-3 h-3 mr-1" />
                          {levelTier.name}
                        </Badge>
                        {stats.totalCards >= 50 && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 cursor-default">
                            <Package className="w-3 h-3 mr-1" />
                            Collector
                          </Badge>
                        )}
                        {user?.isAdmin && (
                          <Badge className="bg-yellow-500 cursor-default">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-4">{email}</p>
                    </>
                  )}

                  <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">
                          Level {currentLevel}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {xpInCurrentLevel} / {LEVEL_CONFIG.xpPerLevel} XP
                      </span>
                    </div>
                    <Progress value={levelProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {LEVEL_CONFIG.xpPerLevel - xpInCurrentLevel} XP to Level{" "}
                      {currentLevel + 1}
                    </p>
                  </div>

                  {!isEditMode && bio && (
                    <p className="text-sm p-3 bg-primary/5 rounded-lg border border-primary/10 max-w-2xl mx-auto">
                      {bio}
                    </p>
                  )}
                </div>

                {isEditMode ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className="cursor-pointer"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="cursor-pointer bg-transparent"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsEditMode(true)}
                    variant="outline"
                    className="cursor-pointer"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-6 mt-6 max-w-2xl mx-auto">
                <div className="text-center cursor-pointer hover:bg-primary/5 p-3 rounded-lg transition-colors">
                  <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl md:text-2xl font-bold">
                    {stats.totalCards}
                  </p>
                  <p className="text-xs text-muted-foreground">Cards</p>
                </div>
                <div className="text-center cursor-pointer hover:bg-primary/5 p-3 rounded-lg transition-colors">
                  <RefreshCw className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl md:text-2xl font-bold">
                    {stats.totalTrades}
                  </p>
                  <p className="text-xs text-muted-foreground">Trades</p>
                </div>
                <div className="text-center cursor-pointer hover:bg-primary/5 p-3 rounded-lg transition-colors">
                  <Star className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl md:text-2xl font-bold">
                    {stats.uniqueCollectibles}
                  </p>
                  <p className="text-xs text-muted-foreground">Unique</p>
                </div>
              </div>

              {message && (
                <Alert className="mt-4 border-green-500 bg-green-500/10">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <AlertDescription className="text-green-600">
                    {message}
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="cursor-pointer">
                <Trophy className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="wallet" className="cursor-pointer">
                <Wallet className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Wallet</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="cursor-pointer">
                <Lock className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Collection Stats</CardTitle>
                  <CardDescription>
                    Your trading card collection overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 cursor-default">
                      <Package className="w-6 h-6 text-primary mb-2" />
                      <p className="text-2xl font-bold">{stats.totalCards}</p>
                      <p className="text-xs text-muted-foreground">
                        Total Cards
                      </p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 cursor-default">
                      <Star className="w-6 h-6 text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{stats.rareCards}</p>
                      <p className="text-xs text-muted-foreground">
                        Rare Cards
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 cursor-default">
                      <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                      <p className="text-2xl font-bold">
                        {stats.legendaryCards}
                      </p>
                      <p className="text-xs text-muted-foreground">Legendary</p>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 cursor-default">
                      <TrendingUp className="w-6 h-6 text-green-500 mb-2" />
                      <p className="text-2xl font-bold">{stats.totalTrades}</p>
                      <p className="text-xs text-muted-foreground">Trades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Tasks & Achievements
                  </CardTitle>
                  <CardDescription>
                    Complete tasks to earn XP and level up
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tasks.map((task) => {
                      const TaskIcon = task.icon;
                      const progressPercent =
                        (task.progress / task.maxProgress) * 100;

                      return (
                        <div
                          key={task.id}
                          className={`p-4 rounded-lg border transition-all ${
                            task.completed
                              ? "bg-green-500/10 border-green-500/30"
                              : "bg-primary/5 border-primary/10 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div
                              className={`p-3 rounded-lg ${
                                task.completed
                                  ? "bg-green-500/20"
                                  : "bg-primary/10"
                              }`}
                            >
                              <TaskIcon
                                className={`w-6 h-6 ${
                                  task.completed
                                    ? "text-green-500"
                                    : "text-primary"
                                }`}
                              />
                            </div>

                            <div className="flex-1 w-full">
                              <div className="flex flex-col sm:flex-row items-start justify-between mb-2 gap-2">
                                <div>
                                  <h3 className="font-semibold flex items-center gap-2">
                                    {task.title}
                                    {task.completed && (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    )}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {task.description}
                                  </p>
                                </div>
                                <Badge className="bg-primary/20 text-primary border-0 cursor-default">
                                  <Zap className="w-3 h-3 mr-1" />
                                  {task.xpReward} XP
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Progress</span>
                                  <span>
                                    {task.progress} / {task.maxProgress}
                                  </span>
                                </div>
                                <Progress
                                  value={progressPercent}
                                  className="h-2"
                                />
                              </div>

                              {task.completed && (
                                <Button
                                  size="sm"
                                  className="mt-3 cursor-pointer w-full sm:w-auto"
                                  onClick={() => claimTaskReward(task.id)}
                                >
                                  <Award className="w-4 h-4 mr-2" />
                                  Claim Reward
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Connection</CardTitle>
                  <CardDescription>
                    Connect your Solana wallet for trading
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {walletAddress ? (
                    <div className="space-y-4">
                      <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Connected Wallet
                          </h3>
                          <Badge className="bg-green-500 cursor-default">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Address
                            </Label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                              <code className="flex-1 px-3 py-2 bg-background border rounded-md text-sm font-mono break-all">
                                {formatWalletAddress(walletAddress)}
                              </code>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={copyWalletAddress}
                                  className="cursor-pointer flex-1 sm:flex-none bg-transparent"
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
                                  onClick={() =>
                                    window.open(
                                      `https://solscan.io/account/${walletAddress}?cluster=devnet`,
                                      "_blank"
                                    )
                                  }
                                  className="cursor-pointer flex-1 sm:flex-none"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {walletBalance !== null && (
                            <div className="pt-3 border-t">
                              <Label className="text-xs text-muted-foreground">
                                Balance
                              </Label>
                              <p className="text-2xl font-bold text-primary mt-1">
                                {walletBalance.toFixed(4)} SOL
                              </p>
                              <p className="text-xs text-muted-foreground">
                                on Devnet
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full cursor-pointer bg-transparent"
                        onClick={() => setIsWalletModalOpen(true)}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Manage Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Wallet Connected
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Connect your Phantom wallet to start trading
                      </p>
                      <Button
                        className="cursor-pointer"
                        onClick={() => setIsWalletModalOpen(true)}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect Wallet
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <div className="space-y-6">
                {/* Change Password */}
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your account password
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      {passwordSuccess && (
                        <Alert className="border-green-500 bg-green-500/10">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <AlertDescription className="text-green-600">
                            {passwordSuccess}
                          </AlertDescription>
                        </Alert>
                      )}
                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          Current Password
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 8 chars)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full cursor-pointer"
                        disabled={isLoading}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        {isLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Account Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <span className="font-medium">Account Type</span>
                      <Badge
                        className={
                          user?.isAdmin
                            ? "bg-yellow-500 cursor-default"
                            : "bg-primary cursor-default"
                        }
                      >
                        {user?.isAdmin ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            Standard
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <span className="font-medium">User ID</span>
                      <code className="text-xs font-mono">
                        {user?.id?.slice(0, 8)}...
                      </code>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">
                        Deleting your account is permanent. All your
                        collectibles and trade history will be lost.
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="destructive"
                      className="w-full cursor-pointer"
                    >
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CustomWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </ProtectedRoute>
  );
}
