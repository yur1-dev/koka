import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingNav } from "@/components/landing-nav";
import {
  Wallet,
  Sparkles,
  Users,
  Trophy,
  Zap,
  ArrowRight,
  Leaf,
  Rocket,
  Check,
  Package,
  Store,
  Layers,
} from "lucide-react";

const stats = [
  { value: "50", label: "Founder spots", icon: Users },
  { value: "100", label: "Collectibles", icon: Package },
  { value: "5", label: "Rarity tiers", icon: Layers },
  { value: "Solana", label: "Wallet support", icon: Wallet },
];

const features = [
  {
    icon: Wallet,
    title: "Phantom wallet",
    desc: "Link your Phantom wallet to your account and see your balance right in the app.",
  },
  {
    icon: Package,
    title: "Free starter pack",
    desc: "Whitelisted founders get a starter card on signup, plus a bonus card for following us on X.",
  },
  {
    icon: Sparkles,
    title: "Five rarity tiers",
    desc: "Common, Uncommon, Rare, Epic and Legendary. The rarer the card, the fewer copies exist.",
  },
  {
    icon: Store,
    title: "Marketplace",
    desc: "List your cards for a price in SOL, or buy from other collectors.",
  },
  {
    icon: Zap,
    title: "Send to anyone",
    desc: "Transfer a card to another member by username, or to any Solana wallet address.",
  },
  {
    icon: Trophy,
    title: "Leaderboard",
    desc: "Earn points and level up your profile as your collection grows.",
  },
];

const team = [
  {
    name: "Levi Bermudez",
    roles: ["Project Manager", "Frontend Developer", "UI/UX Designer"],
    image: "/levi.png",
  },
  {
    name: "Johan Elehcim Aguyaoy",
    roles: ["Backend Developer", "Test Engineer", "Documentation"],
    image: "/johan.png",
  },
];

const roadmap = [
  {
    icon: Rocket,
    phase: "Phase 1",
    title: "Whitelist & Founder Cards",
    desc: "Registration for the first 50 founders, each with a starter card and a Founder badge.",
    status: "done",
  },
  {
    icon: Wallet,
    phase: "Phase 2",
    title: "Accounts & Wallet",
    desc: "Sign up with email or username, link a Phantom wallet, and manage your inventory.",
    status: "done",
  },
  {
    icon: Store,
    phase: "Phase 3",
    title: "Marketplace & Leaderboard",
    desc: "Buy, sell and send cards, and climb the leaderboard. Currently being polished.",
    status: "current",
  },
  {
    icon: Trophy,
    phase: "Phase 4",
    title: "New Series",
    desc: "More collectible series and achievements for collectors.",
    status: "next",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background pattern-overlay">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-28 pb-16 sm:px-8 sm:pt-32 sm:pb-20 lg:px-20 lg:pt-40 lg:pb-24 xl:px-32">
        <div className="absolute top-20 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse-slow sm:right-10 sm:h-96 sm:w-96" />
        <div className="absolute bottom-20 left-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl animate-glow sm:left-10 sm:h-[500px] sm:w-[500px]" />

        <div className="container relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6 text-center sm:space-y-7 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/10 px-4 py-2 shadow-sm">
                <Leaf className="h-3.5 w-3.5 fill-primary text-primary animate-pulse" />
                <span className="text-xs font-bold tracking-wide text-primary">
                  Whitelist is open
                </span>
              </div>

              <h1 className="text-balance text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Collect. Trade.{" "}
                <span className="gradient-text relative inline-block">
                  Own.
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="12"
                    viewBox="0 0 200 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 6 Q50 0, 100 6 T200 6"
                      stroke="#F4E4B8"
                      strokeWidth="8"
                      fill="none"
                      opacity="0.6"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mx-auto max-w-xl text-pretty text-base font-medium leading-relaxed text-foreground/70 sm:text-lg lg:mx-0">
                KŌKA is a card collecting platform on Solana. Open packs, trade
                with other collectors, and build a collection of frog warriors.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="group w-full bg-primary px-8 py-5 text-base font-bold text-primary-foreground shadow-xl sm:w-auto"
                >
                  <Link
                    href="/app/whitelist"
                    className="flex items-center justify-center gap-2"
                  >
                    Join the Whitelist
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-primary/40 bg-card/50 px-8 py-5 text-base font-bold backdrop-blur-sm sm:w-auto"
                >
                  <Link href="#features">See How It Works</Link>
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 pt-3 lg:justify-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/30 to-secondary/30 shadow-lg sm:h-16 sm:w-16">
                  <span className="text-xl font-black text-primary sm:text-2xl">
                    50
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-foreground">
                    Founder spots
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Once they are gone, the whitelist closes
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 animate-glow rounded-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/30 blur-3xl" />
              <div className="relative z-10 flex items-center justify-center p-4 sm:p-8">
                <Image
                  src="/hero-frog.png"
                  alt="KŌKA card: Original Wanderer"
                  width={300}
                  height={400}
                  priority
                  className="h-auto w-56 animate-float object-contain drop-shadow-2xl sm:w-64 lg:w-72"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y-2 border-primary/20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 px-5 py-12 sm:px-8 sm:py-16 lg:px-20 xl:px-32">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 sm:gap-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-3 flex items-center justify-center">
                  <stat.icon className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
                </div>
                <div className="gradient-text mb-2 text-3xl font-black sm:text-4xl">
                  {stat.value}
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20 lg:px-20 lg:py-24 xl:px-32"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-5 inline-block rounded-full border-2 border-secondary/40 bg-secondary/20 px-4 py-2">
              <span className="text-xs font-bold tracking-wide text-primary">
                Features
              </span>
            </div>
            <h2 className="gradient-text mb-5 text-balance text-3xl font-black sm:text-4xl lg:text-5xl">
              What you can do on KŌKA
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-base font-medium leading-relaxed text-foreground/70 sm:text-lg">
              Everything you need to start a collection and trade it.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-2 border-primary/20 bg-card/60 p-6 backdrop-blur-sm sm:p-7"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-black text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="scroll-mt-20 bg-gradient-to-b from-secondary/10 via-accent/5 to-transparent px-5 py-16 sm:px-8 sm:py-20 lg:px-20 lg:py-24 xl:px-32"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <div className="mb-5 inline-block rounded-full border-2 border-accent/60 bg-accent/40 px-4 py-2">
                <span className="text-xs font-bold tracking-wide text-accent-foreground">
                  About
                </span>
              </div>
              <h2 className="gradient-text mb-5 text-balance text-3xl font-black sm:text-4xl lg:text-5xl">
                What is KŌKA?
              </h2>
              <div className="space-y-4 text-base font-medium leading-relaxed text-foreground/80">
                <p>
                  KŌKA is a collectible card game world full of frog warriors,
                  ninjas and street wanderers. Every card has a rarity, and the
                  rare ones are hard to come by.
                </p>
                <p>
                  You sign up, claim your cards, and keep them in your
                  inventory. From there you can trade them, list them on the
                  marketplace, or send them to a friend.
                </p>
                <p>
                  We are two students building KŌKA from the ground up, and the
                  first 50 members get a permanent Founder badge.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 animate-pulse-slow rounded-full bg-gradient-to-br from-accent/30 to-primary/20 blur-3xl" />
              <Card className="relative z-10 overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card to-accent/10 p-4 sm:p-6">
                <div className="relative mb-5 aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 shadow-xl">
                  <Image
                    src="/frog-crew.png"
                    alt="Frog warriors standing in a rainy neon alley"
                    width={600}
                    height={600}
                    sizes="(min-width: 1024px) 480px, 90vw"
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-black text-foreground">
                  The Alley Crew
                </h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Some of the frogs you will meet in the collection.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section
        id="team"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20 lg:px-20 lg:py-24 xl:px-32"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-5 inline-block rounded-full border-2 border-primary/30 bg-primary/10 px-4 py-2">
              <span className="text-xs font-bold tracking-wide text-primary">
                Team
              </span>
            </div>
            <h2 className="gradient-text mb-5 text-balance text-3xl font-black sm:text-4xl lg:text-5xl">
              Who built this
            </h2>
          </div>

          <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
            {team.map((member) => (
              <Card
                key={member.name}
                className="border-2 border-primary/20 bg-gradient-to-br from-card to-accent/10 p-6 text-center sm:p-7"
              >
                <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 shadow-xl">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="mb-3 text-lg font-black text-foreground">
                  {member.name}
                </h3>
                <ul className="flex flex-wrap justify-center gap-2">
                  {member.roles.map((role) => (
                    <li
                      key={role}
                      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary"
                    >
                      {role}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section
        id="roadmap"
        className="scroll-mt-20 bg-gradient-to-b from-accent/10 via-primary/5 to-transparent px-5 py-16 sm:px-8 sm:py-20 lg:px-20 lg:py-24 xl:px-32"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-5 inline-block rounded-full border-2 border-secondary/40 bg-secondary/20 px-4 py-2">
              <span className="text-xs font-bold tracking-wide text-primary">
                Roadmap
              </span>
            </div>
            <h2 className="gradient-text mb-5 text-balance text-3xl font-black sm:text-4xl lg:text-5xl">
              Where we are
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-base font-medium leading-relaxed text-foreground/70 sm:text-lg">
              What is finished, what we are working on, and what comes next.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {roadmap.map((item) => (
              <Card
                key={item.title}
                className={`relative overflow-hidden border-2 bg-card/60 p-6 backdrop-blur-sm sm:p-7 ${
                  item.status === "current"
                    ? "border-primary"
                    : "border-primary/20"
                }`}
              >
                <div
                  className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                    item.status === "done"
                      ? "bg-green-500 text-white"
                      : item.status === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.status === "done" && <Check className="h-3 w-3" />}
                  {item.status === "done"
                    ? "Done"
                    : item.status === "current"
                    ? "In progress"
                    : "Next"}
                </div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                  <item.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-primary">
                  {item.phase}
                </span>
                <h3 className="mb-2 text-lg font-black text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/20 px-5 py-16 sm:px-8 sm:py-20 lg:px-20 lg:py-24 xl:px-32">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="gradient-text mb-6 text-balance text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Claim your founder spot
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-pretty text-base font-medium leading-relaxed text-foreground/70 sm:text-lg">
            Only 50 founders get in. Sign up, get your starter card and keep
            the Founder badge for good.
          </p>
          <Button
            asChild
            size="lg"
            className="w-full bg-primary px-10 py-6 text-lg text-primary-foreground shadow-2xl sm:w-auto sm:px-12"
          >
            <Link
              href="/app/whitelist"
              className="flex items-center justify-center gap-2"
            >
              Join the Whitelist
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent px-5 py-10 sm:px-8 sm:py-12 lg:px-20 xl:px-32">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/koka-logo.png"
                alt="KŌKA"
                width={48}
                height={48}
                className="h-11 w-11 object-contain"
              />
              <span className="gradient-text text-2xl font-black">KŌKA</span>
            </Link>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                © {new Date().getFullYear()} KŌKA. All rights reserved.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Built by Levi Bermudez &amp; Johan Elehcim Aguyaoy
              </p>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { label: "Features", href: "#features" },
                { label: "Team", href: "#team" },
                { label: "Roadmap", href: "#roadmap" },
                { label: "Enter App", href: "/app" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
