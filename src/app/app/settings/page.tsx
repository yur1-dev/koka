"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lock,
  Shield,
  User,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Bell,
  Globe,
  Wallet as WalletIcon,
  LogOut as DisconnectIcon,
  Mail,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
} from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import {
  getPhantomPublicKey,
  disconnectPhantomWallet,
} from "@/lib/phantom-wallet";
import { CustomWalletModal } from "@/components/custom-wallet-modal"; // NEW: Import for direct connection
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"; // NEW: For balance fetch

const LEVEL_CONFIG = { xpPerLevel: 100, maxLevel: 50 };

const getLevelFromXP = (xp: number) =>
  Math.floor(xp / LEVEL_CONFIG.xpPerLevel) + 1;

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  isAdmin?: boolean;
  walletAddress?: string | null;
  xp?: number;
  createdAt?: string | Date;
  emailNotifications?: boolean;
  publicProfile?: boolean;
}

export default function SettingsPage() {
  const { user, token, updateUser } = useAuth() as {
    user: User | null;
    token: string | null;
    updateUser: (updates: Partial<User>) => void;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotifications ?? true
  );
  const [publicProfile, setPublicProfile] = useState(
    user?.publicProfile ?? true
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [activeTab, setActiveTab] = useState("security");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // NEW: Wallet modal and balance states (from Navbar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);

  // Sync local states with user context updates
  useEffect(() => {
    setEmailNotifications(user?.emailNotifications ?? true);
    setPublicProfile(user?.publicProfile ?? true);
  }, [user?.emailNotifications, user?.publicProfile]);

  // FIXED: Full wallet event listeners (mirrors Navbar exactly)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).solana) {
      const provider = (window as any).solana;

      const fetchBalance = async (address: string) => {
        try {
          setWalletBalanceLoading(true);
          const connection = new Connection("https://api.devnet.solana.com");
          const publicKey = new PublicKey(address);
          const balanceInLamports = await connection.getBalance(publicKey);
          setBalance(balanceInLamports / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error("Error fetching balance:", err);
          setBalance(null);
        } finally {
          setWalletBalanceLoading(false);
        }
      };

      const checkInitialConnection = () => {
        const pubKey = getPhantomPublicKey();
        if (pubKey) {
          setWalletAddress(pubKey);
          fetchBalance(pubKey);
        }
      };

      checkInitialConnection();

      const handleConnect = () => {
        const pubKey = getPhantomPublicKey();
        if (pubKey) {
          setWalletAddress(pubKey);
          fetchBalance(pubKey);
        }
      };

      const handleDisconnect = () => {
        setWalletAddress(null);
        setBalance(null);
      };

      const handleAccountChanged = (publicKey: any) => {
        if (publicKey) {
          const address = publicKey.toString();
          setWalletAddress(address);
          fetchBalance(address);
        } else {
          handleDisconnect();
        }
      };

      provider.on("connect", handleConnect);
      provider.on("disconnect", handleDisconnect);
      provider.on("accountChanged", handleAccountChanged);

      return () => {
        provider.off("connect", handleConnect);
        provider.off("disconnect", handleDisconnect);
        provider.off("accountChanged", handleAccountChanged);
      };
    }
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setErrorMessage("No auth token. Please log in again.");
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

      if (!response.ok) {
        let errorMsg = "Failed to update password";
        try {
          const text = await response.text();
          if (text) {
            const errorData = JSON.parse(text);
            errorMsg = errorData.message || errorData.error || errorMsg;
          } else {
            errorMsg = `Server error: ${response.status} ${response.statusText}`;
          }
        } catch (parseErr) {
          errorMsg = `Server error: ${response.status} ${response.statusText}`;
        }
        setErrorMessage(errorMsg);
      } else {
        const data = await response.json();
        setSuccessMessage(data.message || "Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMessage(""), 5000);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMessage(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailNotifications,
          publicProfile,
        }),
      });

      if (response.ok) {
        updateUser({ emailNotifications, publicProfile });
        setSuccessMessage("Preferences updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || "Failed to update preferences");
      }
    } catch (err) {
      console.error("Preferences update error:", err);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await disconnectPhantomWallet();

      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: null }),
      });

      if (response.ok) {
        updateUser({ walletAddress: null });
        setWalletAddress(null);
        setSuccessMessage("Wallet disconnected successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        throw new Error("Failed to update server");
      }
    } catch (error) {
      console.error("Wallet disconnect error:", error);
      setErrorMessage("Failed to disconnect wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyWalletAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setCopiedWallet(true);
        setTimeout(() => setCopiedWallet(false), 2000);
      } catch (err) {
        setErrorMessage("Failed to copy address");
      }
    }
  };

  const formatWalletAddress = (address: string) =>
    `${address.slice(0, 6)}…${address.slice(-4)}`;

  const currentLevel = getLevelFromXP(user?.xp || 0);
  const levelProgress =
    (((user?.xp || 0) % LEVEL_CONFIG.xpPerLevel) / LEVEL_CONFIG.xpPerLevel) *
    100;

  if (!user) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Settings
          </h1>

          {(successMessage || errorMessage) && (
            <div className="mb-6">
              {successMessage && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <AlertDescription className="text-green-600">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="security">
                <Lock className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Bell className="w-4 h-4 mr-2" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="wallet">
                <WalletIcon className="w-4 h-4 mr-2" />
                Wallet
              </TabsTrigger>
              <TabsTrigger value="account">
                <User className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
            </TabsList>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your account password for added security.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full p-0 hover:bg-transparent"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 8 chars)"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full p-0 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full p-0 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications & Privacy
                  </CardTitle>
                  <CardDescription>
                    Manage your email alerts and profile visibility.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="w-4 h-4" />
                        Email Notifications
                      </Label>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receive emails for new trade proposals and achievements.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        {publicProfile ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                        Public Profile
                      </Label>
                      <Switch
                        checked={publicProfile}
                        onCheckedChange={setPublicProfile}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allow others to view your collectibles and stats.
                    </p>
                  </div>
                  <Button
                    onClick={handleUpdatePreferences}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Tab - FIXED: Now with direct connection like Navbar */}
            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletIcon className="w-5 h-5" />
                    Connected Wallet
                  </CardTitle>
                  <CardDescription>
                    Manage your Solana wallet for trading.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {walletAddress ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center justify-between">
                          <span className="font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Active
                          </span>
                          <Badge className="bg-green-500">Connected</Badge>
                        </div>
                        <code className="block mt-2 px-3 py-2 bg-background border rounded-md text-sm font-mono truncate">
                          {formatWalletAddress(walletAddress)}
                        </code>
                        {balance !== null ? (
                          <span className="text-xs text-muted-foreground">
                            Balance: {balance.toFixed(4)} SOL
                          </span>
                        ) : walletBalanceLoading ? (
                          <span className="text-xs text-muted-foreground">
                            Loading balance...
                          </span>
                        ) : null}
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyWalletAddress}
                          >
                            {copiedWallet ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            {copiedWallet ? "Copied!" : "Copy"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="ml-auto"
                          >
                            <a
                              href={`https://solscan.io/account/${walletAddress}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View on Solscan
                            </a>
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleDisconnectWallet}
                        className="w-full"
                        disabled={isLoading}
                      >
                        <DisconnectIcon className="w-4 h-4 mr-2" />
                        {isLoading ? "Disconnecting..." : "Disconnect Wallet"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <WalletIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No wallet connected
                      </p>
                      {/* FIXED: Direct connect button with modal, no redirect */}
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-secondary text-primary hover:bg-primary/10 cursor-pointer  hover:"
                      >
                        <WalletIcon className="w-4 h-4 mr-2" />
                        Connect Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>
                    View your account information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="font-medium">Account Type</span>
                    <Badge
                      className={user?.isAdmin ? "bg-yellow-500" : "bg-primary"}
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
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="font-medium">Email Address</span>
                    <span className="text-muted-foreground">{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="font-medium">Member Since</span>
                    <span className="text-muted-foreground">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })
                        : "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="font-medium">Total XP Earned</span>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-bold">{user?.xp || 0} XP</span>
                      <Progress value={levelProgress} className="w-24 h-2" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="font-medium">User ID</span>
                    <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                      {(user?.id || "").slice(0, 8)}…
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/30 bg-destructive/5 mt-6">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-destructive/70">
                    Perform irreversible actions on your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      Deleting your account is permanent. All collectibles,
                      trades, and data will be lost.
                    </AlertDescription>
                  </Alert>
                  <Button variant="destructive" className="w-full" disabled>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* NEW: Wallet modal for direct connection */}
        <CustomWalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
