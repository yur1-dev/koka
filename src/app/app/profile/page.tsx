"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Camera,
  Save,
  User,
  Shield,
  CheckCircle2,
  Wallet,
  Package,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertTriangle,
  Trophy,
  Star,
  Zap,
  Award,
  Edit,
  ImageIcon,
  Calendar,
  TrendingUp,
  X,
} from "lucide-react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  type PercentCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getPhantomPublicKey } from "@/lib/phantom-wallet";
import { CustomWalletModal } from "@/components/custom-wallet-modal";

const LEVEL_CONFIG = { xpPerLevel: 100, maxLevel: 50 };

const getLevelFromXP = (xp: number) =>
  Math.floor(xp / LEVEL_CONFIG.xpPerLevel) + 1;
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

interface Task {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  progress: number;
  maxProgress: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface InventoryItem {
  id: string;
  quantity: number;
  type?: string;
  rarity?: string;
}

interface Trade {
  id: string;
  status: string;
}

interface ProfileData {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  createdAt?: string;
  xp?: number;
}

interface Stats {
  totalItems: number;
  totalTrades: number;
  uniqueCollectibles: number;
  totalCards: number;
  rareCards: number;
  legendaryCards: number;
  completedTrades: number;
  pendingTrades: number;
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
  const [userXP, setUserXP] = useState(0);
  const [isVerified, setIsVerified] = useState(true);
  const [memberSince, setMemberSince] = useState("");

  // Image Viewer states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewedImageUrl, setViewedImageUrl] = useState("");

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [cropType, setCropType] = useState<"avatar" | "cover" | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalTrades: 0,
    uniqueCollectibles: 0,
    totalCards: 0,
    rareCards: 0,
    legendaryCards: 0,
    completedTrades: 0,
    pendingTrades: 0,
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

  const aspect = cropType === "avatar" ? 1 : 3;

  const getDefaultAvatar = (name: string) =>
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
      name
    )}`;

  const stableAvatarUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (avatarUrl) return `${avatarUrl}?t=${Date.now()}`;
    return getDefaultAvatar(username);
  }, [previewUrl, avatarUrl, username]);

  const currentCoverUrl = useMemo(() => {
    if (coverPreviewUrl) return coverPreviewUrl;
    if (coverPhotoUrl) return coverPhotoUrl;
    return "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop";
  }, [coverPreviewUrl, coverPhotoUrl]);

  useEffect(() => {
    if (user && token) {
      setEmail(user.email || "");
      fetchProfile();
      fetchStats();
      checkWalletConnection();
    }
  }, [user, token]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data: ProfileData = await response.json();
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || "");
        setCoverPhotoUrl(data.coverUrl || "");
        setUserXP(data.xp || 0);

        if (data.createdAt) {
          const date = new Date(data.createdAt);
          setMemberSince(
            date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const [inventoryRes, tradesRes] = await Promise.all([
        fetch("/api/inventory", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/trades", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const inventoryData = (await inventoryRes.json()) as {
        inventory?: InventoryItem[];
      };
      const tradesData = (await tradesRes.json()) as { trades?: Trade[] };

      const inventory = inventoryData.inventory || [];
      const trades = tradesData.trades || [];

      const totalItems = inventory.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );

      const totalCards = inventory
        .filter((item) => item.type === "card")
        .reduce((sum, item) => sum + (item.quantity || 0), 0);

      const rareCards = inventory.filter(
        (item) => item.type === "card" && item.rarity === "rare"
      ).length;

      const legendaryCards = inventory.filter(
        (item) => item.type === "card" && item.rarity === "legendary"
      ).length;

      const completedTrades = trades.filter(
        (trade) => trade.status === "completed"
      ).length;

      const pendingTrades = trades.filter(
        (trade) => trade.status === "pending"
      ).length;

      setStats({
        totalItems,
        uniqueCollectibles: inventory.length,
        totalTrades: trades.length,
        totalCards,
        rareCards,
        legendaryCards,
        completedTrades,
        pendingTrades,
      });

      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id === "1")
            return {
              ...task,
              progress: Math.min(completedTrades, 1),
              completed: completedTrades >= 1,
            };
          if (task.id === "2")
            return {
              ...task,
              progress: inventory.length,
              completed: inventory.length >= 10,
            };
          if (task.id === "3")
            return {
              ...task,
              progress: completedTrades,
              completed: completedTrades >= 25,
            };
          if (task.id === "4")
            return {
              ...task,
              progress: rareCards,
              completed: rareCards >= 5,
            };
          return task;
        })
      );

      const calculatedXP =
        completedTrades * 10 +
        inventory.length * 5 +
        rareCards * 15 +
        legendaryCards * 30;

      setUserXP(calculatedXP);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
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

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (aspect) {
        const { width, height } = e.currentTarget;
        const aspectCrop = makeAspectCrop(
          {
            unit: "%",
            width: 90,
          },
          aspect,
          width,
          height
        );
        const centeredCrop = centerCrop(aspectCrop, width, height);
        setCrop(centeredCrop);

        setCompletedCrop({
          unit: "px",
          x: Math.round((centeredCrop.x / 100) * width),
          y: Math.round((centeredCrop.y / 100) * height),
          width: Math.round((centeredCrop.width / 100) * width),
          height: Math.round((centeredCrop.height / 100) * height),
        });
      }
    },
    [aspect]
  );

  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement("canvas");
      const scaleX = image.naturalWidth / image.offsetWidth;
      const scaleY = image.naturalHeight / image.offsetHeight;
      const canvWidth = pixelCrop.width * scaleX;
      const canvHeight = pixelCrop.height * scaleY;
      canvas.width = canvWidth;
      canvas.height = canvHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No 2d context");
      }
      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        canvWidth,
        canvHeight
      );
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas is empty"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.95
        );
      });
    },
    []
  );

  const handleApplyCrop = useCallback(async () => {
    if (!completedCrop || !imageSrc || !imgRef.current) {
      return;
    }
    setIsApplyingCrop(true);
    try {
      const image = imgRef.current;
      const blob = await getCroppedImg(image, completedCrop);
      const file = new File([blob], `${cropType}-image.jpg`, {
        type: "image/jpeg",
      });
      if (cropType === "avatar") {
        setAvatarFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else if (cropType === "cover") {
        setCoverPhotoFile(file);
        setCoverPreviewUrl(URL.createObjectURL(file));
      }
      setTimeout(() => {
        setShowCropper(false);
        setCropType(null);
        setImageSrc(null);
        setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
        setCompletedCrop(undefined);
        setIsApplyingCrop(false);
      }, 300);
    } catch (e) {
      console.error(e);
      setError("Error cropping image");
      setIsApplyingCrop(false);
    }
  }, [completedCrop, imageSrc, cropType, getCroppedImg]);

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Cover photo must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setCropType("cover");
        setShowCropper(true);
        setIsCropping(false);
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setCropType("avatar");
        setShowCropper(true);
        setIsCropping(false);
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

    if (!token) {
      setError("No token found");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", username);
      formData.append("email", email);
      formData.append("bio", bio);
      if (avatarFile) formData.append("avatar", avatarFile);
      if (coverPhotoFile) formData.append("cover", coverPhotoFile);

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Profile updated successfully!");
        updateUser({
          username: username,
          email: email,
          avatarUrl: data.user?.avatarUrl || previewUrl || avatarUrl,
        });

        setAvatarFile(null);
        setPreviewUrl("");
        setCoverPhotoFile(null);
        setCoverPreviewUrl("");

        if (data.user?.avatarUrl) setAvatarUrl(data.user.avatarUrl);
        if (data.user?.coverUrl) setCoverPhotoUrl(data.user.coverUrl);

        setIsEditMode(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const claimTaskReward = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.completed || !token) return;

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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatWalletAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-6)}`;

  const currentAvatarUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (avatarUrl) return `${avatarUrl}?t=${Date.now()}`;
    return getDefaultAvatar(username);
  }, [previewUrl, avatarUrl, username]);

  const currentLevel = getLevelFromXP(userXP);
  const xpForNextLevel = getXPForNextLevel(userXP);
  const xpInCurrentLevel = userXP % LEVEL_CONFIG.xpPerLevel;
  const levelProgress = (xpInCurrentLevel / LEVEL_CONFIG.xpPerLevel) * 100;
  const levelTier = getLevelTier(currentLevel);

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Cover Photo */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5">
          <img
            src={currentCoverUrl}
            alt="Cover"
            className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-[1.02] rounded-b-lg"
            onClick={() => !isEditMode && openImageViewer(currentCoverUrl)}
          />
          {isEditMode && (
            <Label
              htmlFor="cover-upload"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-background/90 backdrop-blur-sm border border-primary/20 rounded-lg hover:bg-background transition-colors shadow-lg z-10"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Change Cover</span>
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

        {/* Main Content */}
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-20 relative">
            {/* Left Sidebar - Profile Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div
                        className="relative cursor-pointer transition-transform hover:scale-105"
                        onClick={() =>
                          !isEditMode && openImageViewer(currentAvatarUrl)
                        }
                      >
                        <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                          <AvatarImage
                            className="object-cover"
                            src={currentAvatarUrl}
                            alt={username}
                          />
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {getInitials(username)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div
                        className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br ${levelTier.color} flex items-center justify-center border-4 border-background shadow-lg`}
                      >
                        <span className="text-white font-bold text-sm">
                          {currentLevel}
                        </span>
                      </div>
                      {isEditMode && (
                        <Label
                          htmlFor="avatar-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full cursor-pointer"
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

                    <div className="text-center w-full">
                      <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                        <h2 className="text-xl font-bold">{username}</h2>
                        {isVerified && (
                          <Badge className="bg-blue-500">
                            <CheckCircle2 className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 justify-center mb-3">
                        <Badge
                          className={`bg-gradient-to-r ${levelTier.color} text-white border-0 text-xs`}
                        >
                          <Award className="w-3 h-3 mr-1" />
                          {levelTier.name}
                        </Badge>
                        {user?.isAdmin && (
                          <Badge className="bg-yellow-500 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {email}
                      </p>

                      {memberSince && (
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-4">
                          <Calendar className="w-3 h-3" />
                          Member since {memberSince}
                        </div>
                      )}

                      {bio && !isEditMode && (
                        <p className="text-sm text-muted-foreground mb-4 px-2">
                          {bio}
                        </p>
                      )}

                      {/* Level Progress */}
                      <div className="mb-4 p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold">
                            Level {currentLevel}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {xpInCurrentLevel}/{LEVEL_CONFIG.xpPerLevel} XP
                          </span>
                        </div>
                        <Progress value={levelProgress} className="h-2" />
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <TrendingUp className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            {userXP} Total XP
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 bg-primary/5 rounded-lg">
                          <Package className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-lg font-bold">
                            {stats.totalCards}
                          </p>
                          <p className="text-xs text-muted-foreground">Cards</p>
                        </div>
                        <div className="text-center p-2 bg-primary/5 rounded-lg">
                          <RefreshCw className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-lg font-bold">
                            {stats.completedTrades}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Trades
                          </p>
                        </div>
                        <div className="text-center p-2 bg-primary/5 rounded-lg">
                          <Star className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-lg font-bold">
                            {stats.uniqueCollectibles}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unique
                          </p>
                        </div>
                      </div>

                      {/* Rare Stats */}
                      {(stats.rareCards > 0 || stats.legendaryCards > 0) && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {stats.rareCards > 0 && (
                            <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                              <p className="text-lg font-bold text-purple-600">
                                {stats.rareCards}
                              </p>
                              <p className="text-xs text-purple-600">Rare</p>
                            </div>
                          )}
                          {stats.legendaryCards > 0 && (
                            <div className="text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <p className="text-lg font-bold text-yellow-600">
                                {stats.legendaryCards}
                              </p>
                              <p className="text-xs text-yellow-600">
                                Legendary
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!isEditMode ? (
                        <Button
                          onClick={() => setIsEditMode(true)}
                          className="w-full"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                          />
                          <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            type="email"
                          />
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full min-h-20 px-3 py-2 border rounded-md bg-background resize-none text-sm"
                            placeholder="Bio..."
                            maxLength={200}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleProfileUpdate}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              onClick={() => setIsEditMode(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Content - Tabs */}
            <div className="lg:col-span-2 mt-6 lg:mt-0">
              {(message || error) && (
                <div className="mb-4">
                  {message && (
                    <Alert className="border-green-500 bg-green-500/10">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <AlertDescription className="text-green-600">
                        {message}
                      </AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Tabs defaultValue="achievements" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="achievements">
                    <Trophy className="w-4 h-4 mr-2" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="wallet">
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallet
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="achievements">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        Tasks & Achievements
                      </CardTitle>
                      <CardDescription>
                        Complete tasks to earn XP and level up. Your progress is
                        tracked in real-time!
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
                                  : "bg-primary/5 border-primary/10"
                              }`}
                            >
                              <div className="flex items-start gap-4">
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
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
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
                                    <Badge className="bg-primary/20 text-primary border-0">
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
                                      className="mt-3 w-full"
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
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Address
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="flex-1 px-3 py-2 bg-background border rounded-md text-sm font-mono truncate">
                                    {formatWalletAddress(walletAddress)}
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      window.open(
                                        `https://solscan.io/account/${walletAddress}?cluster=devnet`,
                                        "_blank"
                                      )
                                    }
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
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
                            className="w-full"
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
                          <Button onClick={() => setIsWalletModalOpen(true)}>
                            <Wallet className="w-4 h-4 mr-2" />
                            Connect Wallet
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Image Viewer Modal */}
        <Dialog
          open={showImageViewer}
          onOpenChange={closeImageViewer}
          modal={true}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col bg-transparent border-0 shadow-none">
            <DialogHeader className="sr-only">
              <DialogTitle>Full size image</DialogTitle>
            </DialogHeader>
            <div className="relative flex-1 flex items-center justify-center bg-black/90 p-4">
              {viewedImageUrl && (
                <img
                  src={viewedImageUrl}
                  alt="Full view"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              )}
              <DialogClose
                asChild
                className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full z-10"
              >
                <button type="button">
                  <X className="w-6 h-6" />
                </button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cropper Dialog */}
        <Dialog
          open={showCropper}
          onOpenChange={(open) => {
            if (!open) {
              setImageSrc(null);
              setCropType(null);
              setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
              setCompletedCrop(undefined);
              setIsCropping(false);
              setIsApplyingCrop(false);
            }
            setShowCropper(open);
          }}
        >
          <DialogContent className="max-w-4xl p-0 max-h-[95vh] flex flex-col">
            <DialogHeader className="p-6 border-b flex-none">
              <DialogTitle className="flex items-center justify-between">
                <span>Crop your {cropType} image</span>
                <div className="text-xs text-muted-foreground">
                  {cropType === "avatar" ? "Square (1:1)" : "Wide (3:1)"}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 p-6 overflow-hidden relative">
              {imageSrc ? (
                <ReactCrop
                  crop={crop}
                  aspect={aspect}
                  onChange={(
                    pixelCrop: PixelCrop,
                    percentCrop: PercentCrop
                  ) => {
                    setCrop(percentCrop);
                    setIsCropping(true);
                  }}
                  onComplete={(
                    pixelCrop: PixelCrop,
                    percentCrop: PercentCrop
                  ) => {
                    setCompletedCrop(pixelCrop);
                    setIsCropping(false);
                  }}
                  keepSelection={true}
                  ruleOfThirds={true}
                  className="h-full"
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-full object-contain"
                  />
                </ReactCrop>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading image...
                </div>
              )}
              {isCropping && (
                <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center">
                  <div className="text-white text-sm">Adjusting crop...</div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-background/95 backdrop-blur-sm flex justify-end gap-3 flex-none">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCropper(false)}
                disabled={isApplyingCrop}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyCrop}
                disabled={!completedCrop || isApplyingCrop || isCropping}
                className="min-w-[120px] transition-all duration-200"
              >
                {isApplyingCrop ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply Crop
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CustomWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
