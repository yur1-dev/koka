"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Trophy,
  Zap,
  Users,
  Shield,
  Rocket,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function WhitelistPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [spotsRemaining, setSpotsRemaining] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [airdropData, setAirdropData] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    walletAddress: "",
    discord: "",
    twitter: "",
    whyJoin: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const totalSteps = 4;

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

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const username = formData.fullName.replace(/\s+/g, "").toLowerCase();

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: formData.email,
          password: formData.password,
          whitelistData: {
            fullName: formData.fullName,
            walletAddress: formData.walletAddress,
            discord: formData.discord,
            twitter: formData.twitter,
            whyJoin: formData.whyJoin,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // FIXED: Call login from auth context to properly log in the user
        login(data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.airdrop) {
          setAirdropData(data.airdrop);
        }

        handleNext();
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
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
                    icon: Trophy,
                    title: "Free NFT Airdrop",
                    desc: "Get a random collectible NFT instantly upon signup",
                  },
                  {
                    icon: Zap,
                    title: "Founder Status",
                    desc: "Forever marked as one of the first 50 KŌKA members",
                  },
                  {
                    icon: Shield,
                    title: "Trading Power",
                    desc: "Start trading immediately with your airdropped NFT",
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
                      filled, the whitelist will close permanently. Each member
                      gets a free NFT airdrop!
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

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Create Your Account
                </h2>
                <p className="text-lg text-foreground/70">
                  Set up your KŌKA account and claim your free NFT
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
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
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
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
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
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Connect (Optional)
                </h2>
                <p className="text-lg text-foreground/70">
                  Add your wallet and social accounts
                </p>
              </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="text-base font-bold">
                      Twitter/X Handle
                    </Label>
                    <Input
                      id="twitter"
                      placeholder="@yourusername"
                      value={formData.twitter}
                      onChange={(e) =>
                        setFormData({ ...formData, twitter: e.target.value })
                      }
                      className="h-12 text-base"
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
                      Claim My NFT
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

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
                  You're officially one of the first 50 members
                </p>
              </div>

              {airdropData &&
                airdropData.received &&
                airdropData.collectible && (
                  <Card className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30">
                    <div className="text-center space-y-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold text-primary">
                          Founder #{airdropData.whitelistNumber}
                        </span>
                      </div>

                      <h3 className="text-2xl font-black">Your Airdrop NFT</h3>

                      <div className="max-w-xs mx-auto">
                        <div
                          className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${getRarityColor(
                            airdropData.collectible.rarity
                          )} p-1`}
                        >
                          <div className="w-full h-full bg-card rounded-xl overflow-hidden">
                            {airdropData.collectible.imageUrl ? (
                              <Image
                                src={airdropData.collectible.imageUrl}
                                alt={airdropData.collectible.name}
                                width={400}
                                height={400}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent">
                                <span className="text-6xl font-black opacity-20">
                                  {airdropData.collectible.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xl font-black">
                          {airdropData.collectible.name}
                        </h4>
                        <Badge
                          className={`bg-gradient-to-r ${getRarityColor(
                            airdropData.collectible.rarity
                          )} text-white capitalize`}
                        >
                          {airdropData.collectible.rarity}
                        </Badge>
                        {airdropData.collectible.description && (
                          <p className="text-sm text-muted-foreground">
                            {airdropData.collectible.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

              <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20">
                <div className="space-y-4 text-center">
                  <h3 className="text-lg font-black">What's Next?</h3>
                  <ul className="space-y-2 text-sm text-foreground/70">
                    <li>✅ Your NFT has been added to your inventory</li>
                    <li>✅ You can start trading with other members</li>
                    <li>✅ Earn XP and level up your profile</li>
                    <li>✅ Join our Discord community for updates</li>
                  </ul>
                </div>
              </Card>

              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={() => router.push("/app/dashboard")}
                  className="bg-primary text-primary-foreground px-12 py-6 text-lg font-bold group"
                >
                  Go to Dashboard
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
