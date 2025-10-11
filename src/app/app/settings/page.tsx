// app/settings/page.tsx (FIXED: Added missing imports (Copy, ExternalLink); Updated User interface with xp, createdAt, emailNotifications, publicProfile; Standardized user.id over userId; Handled optional fields; Removed direct Prisma refs as this is frontend—assume schema updated separately for backend routes; Added type safety for user props)
"use client";

import React, { useState } from "react";
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

const LEVEL_CONFIG = { xpPerLevel: 100, maxLevel: 50 };

const getLevelFromXP = (xp: number) =>
  Math.floor(xp / LEVEL_CONFIG.xpPerLevel) + 1;

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  isAdmin?: boolean;
  walletAddress?: string;
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
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
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

  // Fetch wallet on load
  React.useEffect(() => {
    const address = getPhantomPublicKey();
    setWalletAddress(address);
  }, []);

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

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
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
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(""), 5000);
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

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/preferences", {
        // Assume you add this API
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailNotifications: emailNotifications,
          publicProfile,
        }),
      });

      if (response.ok) {
        updateUser({ emailNotifications, publicProfile });
        setPasswordSuccess("Preferences updated!"); // Reuse success state
        setTimeout(() => setPasswordSuccess(""), 3000);
      } else {
        setPasswordError("Failed to update preferences");
      }
    } catch (err) {
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectPhantomWallet();
      setWalletAddress(null);
      setPasswordSuccess("Wallet disconnected!");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error) {
      setPasswordError("Failed to disconnect wallet");
    }
  };

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
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

          {(passwordSuccess || passwordError) && (
            <div className="mb-6">
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
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
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
                        required
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
                        required
                      />
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
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Tab */}
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
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto"
                          >
                            <a
                              href={`https://solscan.io/account/${walletAddress}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View on Solscan
                            </a>
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleDisconnectWallet}
                        className="w-full"
                      >
                        <DisconnectIcon className="w-4 h-4 mr-2" />
                        Disconnect Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <WalletIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No wallet connected
                      </p>
                      <Button
                        onClick={() =>
                          (window.location.href = "/app/dashboard")
                        }
                      >
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
                      {user?.id?.slice(0, 8)}…
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/30 bg-destructive/5">
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
                  <Button variant="destructive" className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
