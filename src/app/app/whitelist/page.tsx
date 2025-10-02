"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

export default function WhitelistPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    walletAddress: "",
    discord: "",
    twitter: "",
    whyJoin: "",
  });

  const totalSteps = 4;
  const spotsRemaining = 12; // This would come from your database

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    console.log("[v0] Whitelist submission:", formData);
    // Here you would send the data to your database
    handleNext();
  };

  return (
    <div className="min-h-screen bg-background pattern-overlay">
      {/* Header */}
      <header className="border-b-2 border-primary/20 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer transition-transform hover:scale-105"
          >
            <Image
              src="/koka-logo.jpg"
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

      {/* Progress Bar */}
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

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Welcome & Benefits */}
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
                    title: "Personal Legendary Card",
                    desc: "A unique, personalized legendary card created just for you",
                  },
                  {
                    icon: Zap,
                    title: "Early Access",
                    desc: "Be the first to access the platform before public launch",
                  },
                  {
                    icon: Shield,
                    title: "Founder Status",
                    desc: "Exclusive founder badge and special privileges forever",
                  },
                  {
                    icon: Rocket,
                    title: "Priority Support",
                    desc: "Direct line to the team and priority customer support",
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
                      filled, the whitelist will close permanently. Don't miss
                      your chance to be a founding collector.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="bg-primary text-primary-foreground px-12 py-6 text-lg font-bold group"
                >
                  Continue to Sign Up
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Your Information
                </h2>
                <p className="text-lg text-foreground/70">
                  Tell us about yourself so we can create your personalized
                  legendary card
                </p>
              </div>

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
                    <p className="text-xs text-muted-foreground">
                      This will appear on your legendary card
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      We'll send your whitelist confirmation here
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="walletAddress"
                      className="text-base font-bold"
                    >
                      Solana Wallet Address (Optional)
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
                    <p className="text-xs text-muted-foreground">
                      You can add this later if you don't have one yet
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Help us understand your interest in digital collectibles
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
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={
                    !formData.fullName || !formData.email || !formData.whyJoin
                  }
                  className="bg-primary text-primary-foreground px-12 font-bold group"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Social Connections */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  Join the Community
                </h2>
                <p className="text-lg text-foreground/70">
                  Connect with us on social media to stay updated (optional but
                  recommended)
                </p>
              </div>

              <Card className="p-8 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20">
                <div className="space-y-6">
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
                    <p className="text-xs text-muted-foreground">
                      Join our Discord community for exclusive updates and
                      discussions
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Follow us for announcements and community highlights
                    </p>
                  </div>

                  <Card className="p-4 bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-bold mb-1">Pro Tip</p>
                        <p className="text-muted-foreground">
                          Connecting your social accounts helps us verify you're
                          a real person and gives you access to exclusive
                          community channels!
                        </p>
                      </div>
                    </div>
                  </Card>
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
                  onClick={handleSubmit}
                  className="bg-primary text-primary-foreground px-12 font-bold group"
                >
                  Submit Application
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto animate-bounce">
                  <Check className="w-12 h-12 text-primary-foreground" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-black gradient-text">
                  You're on the List!
                </h2>
                <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                  Congratulations! You've successfully joined the KŌKA whitelist
                  as one of the first 50 collectors.
                </p>
              </div>

              <Card className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30">
                <h3 className="text-2xl font-black mb-6 text-center">
                  What Happens Next?
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      step: "1",
                      title: "Confirmation Email",
                      desc: "Check your inbox for a confirmation email with your whitelist details",
                    },
                    {
                      step: "2",
                      title: "Card Creation",
                      desc: "Our team will create your personalized legendary card within 48 hours",
                    },
                    {
                      step: "3",
                      title: "Early Access",
                      desc: "You'll receive early access credentials before the public launch",
                    },
                    {
                      step: "4",
                      title: "Launch Day",
                      desc: "Be ready for Q2 2025 when we officially launch the platform!",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-black mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="p-6 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20 text-center">
                  <Users className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h4 className="font-black mb-2">Join Discord</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect with other whitelist members
                  </p>
                  <Button variant="outline" className="w-full bg-transparent">
                    Join Community
                  </Button>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20 text-center">
                  <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h4 className="font-black mb-2">Follow Updates</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Stay informed about launch progress
                  </p>
                  <Button variant="outline" className="w-full bg-transparent">
                    Follow on X
                  </Button>
                </Card>
              </div>

              <div className="flex justify-center pt-4">
                <Button asChild size="lg" className="px-12 font-bold">
                  <Link href="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
