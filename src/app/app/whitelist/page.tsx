"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const WHITELIST_LIMIT = 50;
// Set NEXT_PUBLIC_X_HANDLE (without the @) to show a "Follow us on X" button.
const KOKA_X_HANDLE = process.env.NEXT_PUBLIC_X_HANDLE || "";

const STEPS = ["Get started", "Create account", "Your cards"];

const RARITY_GRADIENT: Record<string, string> = {
  legendary: "from-yellow-500 to-orange-500",
  epic: "from-purple-500 to-pink-500",
  rare: "from-blue-500 to-cyan-500",
  uncommon: "from-green-500 to-emerald-500",
  common: "from-gray-500 to-slate-500",
};
const rarityGradient = (r?: string) =>
  RARITY_GRADIENT[r?.toLowerCase() ?? "common"] ?? RARITY_GRADIENT.common;

const normalizeHandle = (raw: string) => {
  const h = raw.trim().replace(/^@+/, "");
  return /^\w{1,15}$/.test(h) ? `@${h}` : "";
};

export default function WhitelistPage() {
  const router = useRouter();
  const { data: session, update, status } = useSession();

  const [step, setStep] = useState(1);
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    xHandle: "",
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const accessToken = session ? (session as any).customToken : null;
  const isFounder = session?.user ? (session.user as any).isFounder : false;
  const handle = normalizeHandle(form.xHandle);
  const bonusUnlocked = !!handle;
  const isFull = spotsRemaining === 0;

  useEffect(() => {
    fetch("/api/whitelist/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setSpotsRemaining(d.spotsRemaining))
      .catch(() => {});
  }, []);

  // ---- Create the account (this also hands out the starter cards) ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name = form.fullName.trim();
    if (!name || !form.email.trim() || !form.password) {
      return setError("Please fill in your name, email and password.");
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return setError("That email address does not look right.");
    }
    if (form.password.length < 8) {
      return setError("Your password needs at least 8 characters.");
    }
    if (form.password !== form.confirmPassword) {
      return setError("The two passwords do not match.");
    }
    if (form.xHandle.trim() && !handle) {
      return setError("Your X handle can only use letters, numbers and _ (max 15).");
    }

    setIsLoading(true);
    try {
      const username =
        name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
        form.email.split("@")[0].toLowerCase();

      const result: any = await signIn("credentials", {
        username,
        email: form.email.trim(),
        password: form.password,
        action: "signup",
        whitelistData: JSON.stringify({ fullName: name, xHandle: handle }),
        redirect: false,
        callbackUrl: "/app/dashboard",
      });

      if (result?.error) {
        const message = result.code || result.error;
        setError(message);
        toast.error("Could not create your account", { description: message });
        return;
      }

      await update();
      setCardsLoading(true);
      setStep(3);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      toast.error("Sign up failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Show the cards that were just granted ----
  useEffect(() => {
    if (step !== 3 || status !== "authenticated" || !accessToken) return;
    let cancelled = false;

    const load = async (attempt = 0) => {
      try {
        const res = await fetch("/api/inventory", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const data = await res.json();
        const items: any[] = data?.inventory ?? [];
        const starter = items.filter(
          (i) => i.receivedVia === "starter-pack" || i.receivedVia === "x-bonus"
        );
        if (cancelled) return;
        if (starter.length === 0 && attempt < 3) {
          return setTimeout(() => load(attempt + 1), 1200);
        }
        setCards(starter);
        setCardsLoading(false);
      } catch {
        if (!cancelled) setCardsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [step, status, accessToken]);

  return (
    <div className="min-h-screen bg-background pattern-overlay">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-primary/20 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/koka-logo.png"
              alt="KŌKA"
              width={40}
              height={40}
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            />
            <span className="gradient-text text-xl font-black sm:text-2xl">KŌKA</span>
          </Link>
          <div className="flex items-center gap-3">
            {spotsRemaining !== null && (
              <div className="hidden items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/10 px-4 py-2 sm:flex">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {spotsRemaining}/{WHITELIST_LIMIT} spots left
                </span>
              </div>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to home</span>
                <span className="sr-only sm:hidden">Back to home</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b-2 border-primary/20 bg-card/50 py-4">
        <ol className="mx-auto flex max-w-md items-center justify-between px-4">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      done || current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } ${current ? "ring-4 ring-primary/30" : ""}`}
                  >
                    {done ? <Check className="h-4 w-4" /> : n}
                  </span>
                  <span
                    className={`hidden text-xs font-bold sm:block ${
                      done || current ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {n < STEPS.length && (
                  <span
                    className={`mx-3 h-1 flex-1 rounded-full ${
                      done ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <main className="container mx-auto px-4 py-8 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl">
          {/* STEP 1: what you get */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-4 text-center">
                <Image
                  src="/hero-frog.png"
                  alt="A KŌKA card"
                  width={160}
                  height={220}
                  priority
                  className="mx-auto h-40 w-auto animate-float object-contain drop-shadow-2xl sm:h-48"
                />
                <h1 className="gradient-text text-balance text-4xl font-black sm:text-5xl">
                  Get your free KŌKA card
                </h1>
                <p className="mx-auto max-w-md text-lg text-foreground/70">
                  Make an account and a card goes straight into your inventory.
                  It takes about a minute. No wallet needed.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { n: "1", title: "Sign up", desc: "Name, email and a password" },
                  { n: "2", title: "Get your card", desc: "It is added instantly" },
                  { n: "3", title: "Trade it", desc: "Swap, sell or keep it" },
                ].map((s) => (
                  <Card
                    key={s.n}
                    className="flex-row items-center gap-3 border-2 border-primary/20 p-4 sm:flex-col sm:text-center"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-black">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-accent/10 p-5 sm:p-6">
                <h2 className="mb-4 text-lg font-black">What every founder gets</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Gift, text: "1 free starter card" },
                    { icon: Sparkles, text: "+1 bonus card if you add your X handle" },
                    { icon: Trophy, text: "Permanent Founder badge" },
                    { icon: Zap, text: "100 starting points" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm font-medium">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </Card>

              {spotsRemaining !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>{isFull ? "Whitelist closed" : "Founder spots left"}</span>
                    <span className="text-primary">
                      {spotsRemaining}/{WHITELIST_LIMIT}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${((WHITELIST_LIMIT - spotsRemaining) / WHITELIST_LIMIT) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status === "authenticated" && (
                <Alert>
                  <AlertDescription>
                    You are already signed in.{" "}
                    <Link href="/app/dashboard" className="font-bold text-primary underline">
                      Go to your dashboard
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                size="lg"
                onClick={() => setStep(2)}
                disabled={isFull}
                className="group w-full bg-primary py-6 text-lg font-bold text-primary-foreground"
              >
                {isFull ? "Whitelist closed" : "Get my free card"}
                {!isFull && (
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                )}
              </Button>
            </div>
          )}

          {/* STEP 2: account */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
              <div className="space-y-2 text-center">
                <h2 className="gradient-text text-3xl font-black sm:text-4xl">
                  Create your account
                </h2>
                <p className="text-foreground/70">
                  Just the basics, then your card is yours.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Card className="space-y-5 border-2 border-primary/20 bg-gradient-to-br from-card to-accent/10 p-5 sm:p-8">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-bold">Name</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    placeholder="Your name"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-bold">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        className="h-12 pr-11 text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-bold">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Type it again"
                      value={form.confirmPassword}
                      onChange={(e) => set("confirmPassword", e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                </div>

                {/* Optional bonus */}
                <div
                  className={`rounded-xl border-2 p-4 transition-colors ${
                    bonusUnlocked
                      ? "border-green-500/60 bg-green-500/10"
                      : "border-dashed border-primary/40 bg-primary/5"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <p className="font-black">
                      {bonusUnlocked ? "Bonus card unlocked!" : "Want a 2nd card? (optional)"}
                    </p>
                  </div>
                  <Label htmlFor="xHandle" className="text-sm font-bold">
                    Your X handle
                  </Label>
                  <Input
                    id="xHandle"
                    placeholder="@yourhandle"
                    autoCapitalize="none"
                    value={form.xHandle}
                    onChange={(e) => set("xHandle", e.target.value)}
                    className="mt-1.5 h-11"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add it and you get 2 cards instead of 1.
                  </p>
                  {KOKA_X_HANDLE && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        window.open(
                          `https://x.com/intent/follow?screen_name=${KOKA_X_HANDLE}`,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      Follow @{KOKA_X_HANDLE} on X
                    </Button>
                  )}
                </div>
              </Card>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full flex-1 bg-primary py-6 text-lg font-bold text-primary-foreground"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Claim my {bonusUnlocked ? "2 cards" : "free card"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: cards */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-3 text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                  <Check className="h-10 w-10 text-primary-foreground" />
                </span>
                <h2 className="gradient-text text-3xl font-black sm:text-5xl">
                  You are in!
                </h2>
                <p className="text-lg text-foreground/70">
                  Welcome to KŌKA. Here {cards.length === 1 ? "is your card" : "are your cards"}.
                </p>
                {isFounder && (
                  <Badge variant="secondary" className="px-4 py-1.5 text-sm">
                    Founder badge unlocked
                  </Badge>
                )}
              </div>

              {cardsLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold">Opening your pack...</p>
                </div>
              ) : cards.length > 0 ? (
                <div
                  className={`grid gap-4 ${
                    cards.length > 1 ? "grid-cols-2" : "mx-auto max-w-[240px] grid-cols-1"
                  }`}
                >
                  {cards.map((item, i) => (
                    <Card
                      key={item.id || i}
                      className={`gap-0 overflow-hidden border-2 border-primary/30 bg-gradient-to-br p-1 py-1 ${rarityGradient(
                        item.collectible?.rarity
                      )}`}
                    >
                      <div className="overflow-hidden rounded-lg bg-card">
                        <div className="aspect-[3/4] bg-muted">
                          {item.collectible?.imageUrl && (
                            <img
                              src={item.collectible.imageUrl}
                              alt={item.collectible.name}
                              className="h-full w-full object-contain"
                            />
                          )}
                        </div>
                        <div className="space-y-1 p-3 text-center">
                          <p className="line-clamp-1 text-sm font-black">
                            {item.collectible?.name}
                          </p>
                          <Badge
                            className={`bg-gradient-to-r capitalize text-white ${rarityGradient(
                              item.collectible?.rarity
                            )}`}
                          >
                            {item.collectible?.rarity}
                          </Badge>
                          {item.receivedVia === "x-bonus" && (
                            <p className="text-xs font-bold text-primary">X bonus card</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Your cards are in your inventory. Open the dashboard to see them.
                  </AlertDescription>
                </Alert>
              )}

              <Card className="border-2 border-primary/20 bg-primary/5 p-5">
                <h3 className="mb-3 font-black">What to do next</h3>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Open your inventory to see your cards</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Link a Phantom wallet in Settings to buy and sell</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Check the leaderboard to see how you rank</li>
                </ul>
              </Card>

              <Button
                size="lg"
                onClick={() => router.push("/app/dashboard")}
                className="group w-full bg-primary py-6 text-lg font-bold text-primary-foreground"
              >
                Go to my dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
