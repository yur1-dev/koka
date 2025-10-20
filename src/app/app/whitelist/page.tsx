// FILE: app/whitelist/page.tsx
// This is your main whitelist signup page component
// Replace your entire whitelist page.tsx with this code

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Trophy,
  Zap,
  Users,
  Rocket,
  Loader2,
  Eye,
  EyeOff,
  Twitter as XIcon,
  Package,
} from "lucide-react";

export default function WhitelistPage() {
  const router = useRouter();
  const { data: session, update, status } = useSession();
  const [step, setStep] = useState(1);
  const [spotsRemaining, setSpotsRemaining] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [starterPackItems, setStarterPackItems] = useState<any[]>([]);
  const [step4Loading, setStep4Loading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    walletAddress: "",
    discord: "",
    xHandle: "",
    whyJoin: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [followVerified, setFollowVerified] = useState(false);

  const totalSteps = 4;
  const targetXHandle = "koka"; // Change this to your actual X handle

  // FIXED: Use customToken instead of accessToken
  const accessToken = session ? (session as any).customToken : null;
  const isFounder = session?.user ? (session.user as any).isFounder : false;

  useEffect(() => {
    fetchWhitelistStatus();
  }, []);

  const fetchWhitelistStatus = async () => {
    try {
      const response = await fetch("/api/whitelist/status");
      const data = await response.json();
      if (data.success) {
        setSpotsRemaining(data.spotsRemaining);
      }
    } catch (err) {
      console.error("Failed to fetch whitelist status:", err);
    }
  };

  // UPDATED: Simple follow flow - opens X and allows manual confirmation
  const handleFollowOnX = () => {
    const followUrl = `https://x.com/intent/follow?screen_name=${targetXHandle}`;
    window.open(followUrl, "_blank", "noopener,noreferrer");

    toast.info("Follow on X", {
      description: `X opened in a new tab. Follow @${targetXHandle}, then come back and click "I Followed"!`,
    });
  };

  // UPDATED: Manual confirmation (honor system)
  const handleConfirmFollow = () => {
    if (!formData.xHandle || !formData.xHandle.trim().startsWith("@")) {
      toast.error("X Handle Required", {
        description: "Please enter your X handle first (e.g., @yourusername)",
      });
      return;
    }

    setFollowVerified(true);
    toast.success("Bonus Unlocked! 🎉", {
      description:
        "You'll receive 2 cards instead of 1 when you complete signup!",
    });
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      toast.error("Error", { description: "Passwords do not match" });
      setIsLoading(false);
      return;
    }

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.whyJoin
    ) {
      setError("Please fill in all required fields.");
      toast.error("Error", {
        description: "Please fill in all required fields.",
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log("Starting whitelist signup...");
      const username = formData.fullName.replace(/\s+/g, "").toLowerCase();
      const whitelistData = {
        fullName: formData.fullName,
        walletAddress: formData.walletAddress,
        discord: formData.discord,
        xHandle: formData.xHandle, // Will be used to determine 1 or 2 cards
        whyJoin: formData.whyJoin,
      };

      const result = await signIn("credentials", {
        username,
        email: formData.email,
        password: formData.password,
        action: "signup",
        whitelistData: JSON.stringify(whitelistData),
        redirect: false,
        callbackUrl: "/app/dashboard",
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        setError(result.error);
        toast.error("Signup Failed", { description: result.error });
      } else if (result?.ok) {
        console.log("✅ Signup successful! Updating session...");

        // Update session
        await update();

        // Show success message
        const cardCount = followVerified ? 2 : 1;
        toast.success("Welcome to KŌKA! 🎉", {
          description: `Your ${cardCount} starter card${
            cardCount > 1 ? "s have" : " has"
          } been granted!`,
        });

        // Move to success step
        setStep(4);
      }
    } catch (err) {
      console.error("Signup error:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
      setError(errMsg);
      toast.error("Signup Error", { description: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Fetch starter pack with correct filters
  const fetchStarterPack = async () => {
    if (status !== "authenticated") {
      console.log("Not authenticated yet, status:", status);
      setStep4Loading(false);
      return;
    }

    if (!accessToken) {
      console.error("No access token available");
      setStep4Loading(false);
      toast.warning("Session Issue", {
        description: "Please refresh the page to view your items.",
      });
      return;
    }

    try {
      console.log("Fetching starter pack items with token...");
      const res = await fetch("/api/inventory", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Inventory response status:", res.status);

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Session Expired", {
            description: "Please sign in again.",
          });
          router.push("/app/login");
          return;
        }
        const errorText = await res.text();
        console.error("Inventory fetch failed:", res.status, errorText);
        throw new Error(`Inventory fetch failed: ${res.status}`);
      }

      const data = await res.json();
      console.log("Full inventory response:", data);

      if (data.success && data.inventory) {
        // FIXED: Filter for "starter-pack" and "x-bonus" (matching backend)
        const starterItems = data.inventory.filter(
          (item: any) =>
            item.receivedVia === "starter-pack" ||
            item.receivedVia === "x-bonus"
        );

        console.log("Filtered starter items:", starterItems.length);

        // If no items found with specific receivedVia, show all items for new users
        const itemsToShow =
          starterItems.length > 0 ? starterItems : data.inventory;

        setStarterPackItems(itemsToShow);
        console.log("✅ Starter pack items loaded:", itemsToShow);

        if (itemsToShow.length === 0) {
          console.warn("No inventory items found for user");
          toast.info("Items Being Processed", {
            description: "Your items are being added. Check your dashboard!",
          });
        }
      } else {
        console.warn("No inventory data or success flag:", data);
        toast.warning("Note", {
          description: "Your items are ready in the dashboard!",
        });
      }
    } catch (err) {
      console.error("Failed to fetch starter pack:", err);
      toast.warning("Note", {
        description: "Your items are ready in the dashboard!",
      });
    } finally {
      setStep4Loading(false);
    }
  };

  useEffect(() => {
    if (step === 4 && status === "authenticated") {
      fetchStarterPack();

      // Timeout fallback
      const timer = setTimeout(() => {
        if (step4Loading) {
          setStep4Loading(false);
          console.log("Timeout - redirecting to dashboard");
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [step, status]);

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case "legendary":
        return "from-yellow-500 to-orange-500";
      case "epic":
        return "from-purple-500 to-pink-500";
      case "rare":
        return "from-blue-500 to-cyan-500";
      case "uncommon":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const renderCollectibleCard = (item: any, index: number) => {
    const collectible = item.collectible;

    return (
      <Card
        key={item.id || index}
        className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-primary">
              Starter Pack Item {index + 1}{" "}
              {item.receivedVia === "x-bonus" && "(X Bonus!)"}
            </span>
          </div>

          <h3 className="text-xl font-black">{collectible.name}</h3>

          <div className="max-w-xs mx-auto">
            <div
              className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${getRarityColor(
                collectible.rarity
              )} p-1`}
            >
              <div className="w-full h-full bg-card rounded-xl overflow-hidden">
                {collectible.imageUrl ? (
                  <Image
                    src={collectible.imageUrl}
                    alt={collectible.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent">
                    <span className="text-6xl font-black opacity-20">
                      {collectible.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Badge
              className={`bg-gradient-to-r ${getRarityColor(
                collectible.rarity
              )} text-white capitalize`}
            >
              {collectible.rarity}
            </Badge>
            {collectible.description && (
              <p className="text-sm text-muted-foreground">
                {collectible.description}
              </p>
            )}
            {item.quantity > 1 && (
              <Badge variant="outline">x{item.quantity}</Badge>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const hasStarterPack = starterPackItems.length > 0;

  return (
    <div className="min-h-screen bg-background pattern-overlay">
      <header className="border-b-2 border-primary/20 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer transition-transform hover:scale-105"
          >
            <Image
              src="/koka-logo.png"
              alt="KŌKA"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-2xl font-black gradient-text">KŌKA</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 border-2 border-primary/30 rounded-full">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">
                {spotsRemaining}/50 Spots Left
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-card/50 border-b-2 border-primary/20 py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 relative">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-all ${
                      s < step
                        ? "bg-primary text-primary-foreground"
                        : s === step
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/30 scale-110"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s < step ? <Check className="w-6 h-6" /> : s}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:block ${
                      s <= step ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s === 1 && "Welcome"}
                    {s === 2 && "Your Info"}
                    {s === 3 && "Connect"}
                    {s === 4 && "Success"}
                  </span>
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border-2 border-primary/30 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-primary fill-primary animate-pulse" />
                  <span className="text-sm font-bold text-primary">
                    Exclusive Whitelist
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black gradient-text">
                  Welcome to KŌKA
                </h1>
                <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                  You're about to join an exclusive group of the first 50
                  collectors. Here's what you'll receive:
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: Package,
                    title: "Free Starter Pack",
                    desc: "Get 1 collectible card instantly. Follow us on X to unlock a 2nd bonus card!",
                  },
                  {
                    icon: Trophy,
                    title: "Founder Status",
                    desc: "Forever marked as one of the first 50 KŌKA members",
                  },
                  {
                    icon: Zap,
                    title: "100 Points",
                    desc: "Start with bonus points to kickstart your journey",
                  },
                  {
                    icon: Rocket,
                    title: "Future Benefits",
                    desc: "Early access to new features and exclusive drops",
                  },
                ].map((benefit, i) => (
                  <Card
                    key={i}
                    className="p-6 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20 hover:border-primary transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-black mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.desc}
                    </p>
                  </Card>
                ))}
              </div>

              <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2">
                      Only {spotsRemaining} Spots Remaining!
                    </h3>
                    <p className="text-sm text-foreground/70">
                      This is a limited opportunity. Once all 50 spots are
                      filled, the whitelist will close permanently. Join now to
                      get your free starter pack!
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={spotsRemaining === 0}
                  className="bg-primary text-primary-foreground px-12 py-6 text-lg font-bold group"
                >
                  {spotsRemaining === 0
                    ? "Whitelist Closed"
                    : "Continue to Sign Up"}
                  {spotsRemaining > 0 && (
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Account Creation */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Create Your Account
                </h2>
                <p className="text-lg text-foreground/70">
                  Set up your KŌKA account and claim your starter pack
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Card className="p-8 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-base font-bold">
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-bold">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base font-bold">
                      Password *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min 6 characters)"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="h-12 text-base pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-base font-bold"
                    >
                      Confirm Password *
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="h-12 text-base pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whyJoin" className="text-base font-bold">
                      Why do you want to join KŌKA? *
                    </Label>
                    <Textarea
                      id="whyJoin"
                      placeholder="Tell us what excites you about KŌKA..."
                      value={formData.whyJoin}
                      onChange={(e) =>
                        setFormData({ ...formData, whyJoin: e.target.value })
                      }
                      className="min-h-32 text-base"
                    />
                  </div>
                </div>
              </Card>

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  className="px-8 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={
                    !formData.fullName ||
                    !formData.email ||
                    !formData.password ||
                    !formData.confirmPassword ||
                    !formData.whyJoin
                  }
                  className="bg-primary text-primary-foreground px-12 font-bold group"
                >
                  Continue{" "}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Connect & X Bonus (UPDATED) */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Connect (Optional)
                </h2>
                <p className="text-lg text-foreground/70">
                  Add your wallet and social accounts. Follow us on X for a
                  bonus card!
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Card className="p-8 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="walletAddress"
                      className="text-base font-bold"
                    >
                      Solana Wallet Address
                    </Label>
                    <Input
                      id="walletAddress"
                      placeholder="Your Phantom wallet address"
                      value={formData.walletAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          walletAddress: e.target.value,
                        })
                      }
                      className="h-12 text-base font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord" className="text-base font-bold">
                      Discord Username
                    </Label>
                    <Input
                      id="discord"
                      placeholder="username#1234"
                      value={formData.discord}
                      onChange={(e) =>
                        setFormData({ ...formData, discord: e.target.value })
                      }
                      className="h-12 text-base"
                    />
                  </div>

                  {/* UPDATED: X Handle with Follow/Confirm Flow */}
                  <div className="space-y-3">
                    <Label htmlFor="xHandle" className="text-base font-bold">
                      X Handle (Optional - for +1 Bonus Card)
                    </Label>
                    <Input
                      id="xHandle"
                      placeholder="@yourusername"
                      value={formData.xHandle}
                      onChange={(e) =>
                        setFormData({ ...formData, xHandle: e.target.value })
                      }
                      className="h-12 text-base"
                    />

                    {!followVerified ? (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleFollowOnX}
                          className="flex-1 justify-start bg-black hover:bg-black/90 text-white border-black"
                        >
                          <XIcon className="w-4 h-4 mr-2" />
                          Follow @{targetXHandle} on X
                        </Button>
                        <Button
                          type="button"
                          onClick={handleConfirmFollow}
                          disabled={!formData.xHandle}
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          <Check className="w-4 h-4 mr-2" />I Followed - Unlock
                          Bonus!
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 border-2 border-green-500 rounded-lg mt-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="font-bold text-green-500">
                          Bonus Card Unlocked! You'll get 2 cards total 🎉
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {followVerified
                        ? "Great! You'll receive 2 collectibles when you complete signup."
                        : "Follow our X account to get an extra collectible card!"}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  className="px-8 bg-transparent"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground px-12 font-bold group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Claim Starter Pack
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto animate-bounce">
                  <Check className="w-12 h-12 text-primary-foreground" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Welcome to KŌKA!
                </h2>
                <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                  You're officially one of the first 50 founders! 🎉
                </p>
                {isFounder && (
                  <Badge
                    variant="secondary"
                    className="text-lg px-4 py-2 animate-pulse"
                  >
                    ✨ Founder Badge Unlocked
                  </Badge>
                )}
              </div>

              {step4Loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-lg font-semibold">
                    Loading your starter pack...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Preparing your exclusive collectibles
                  </p>
                </div>
              ) : hasStarterPack ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-black mb-2">
                      Your Starter Pack
                    </h3>
                    <p className="text-muted-foreground">
                      {starterPackItems.length} exclusive collectibles added to
                      your inventory!
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {starterPackItems.map((item, index) =>
                      renderCollectibleCard(item, index)
                    )}
                  </div>
                </div>
              ) : (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    Your starter pack has been added to your inventory! Head to
                    the dashboard to view your collectibles.
                  </AlertDescription>
                </Alert>
              )}

              <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20">
                <div className="space-y-4 text-center">
                  <h3 className="text-lg font-black">What's Next?</h3>
                  <ul className="space-y-2 text-sm text-foreground/70">
                    <li>✅ Your collectibles are ready in your inventory</li>
                    <li>✅ Start trading with other members</li>
                    <li>✅ Earn points and unlock achievements</li>
                    <li>✅ Join our community for exclusive updates</li>
                  </ul>
                </div>
              </Card>

              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={() => router.push("/app/dashboard")}
                  className="bg-primary text-primary-foreground px-12 py-6 text-lg font-bold group"
                >
                  Go to Dashboard{" "}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
