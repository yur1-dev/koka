import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingNav } from "@/components/landing-nav";
import {
  Shield,
  Wallet,
  Sparkles,
  Users,
  Trophy,
  Zap,
  ArrowRight,
  Leaf,
  Calendar,
  Rocket,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background pattern-overlay">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 lg:pt-40 pb-16 sm:pb-20 lg:pb-24 px-8 sm:px-12 lg:px-20 xl:px-32 overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-10 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-secondary/10 rounded-full blur-3xl animate-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[600px] sm:h-[600px] bg-accent/5 rounded-full blur-3xl" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 sm:space-y-7">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border-2 border-primary/30 rounded-full cursor-pointer transition-all shadow-sm">
                <Leaf className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />
                <span className="text-xs font-bold tracking-wide text-primary">
                  Launching Soon - Whitelist Open
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-balance leading-[1.1] tracking-tight">
                Collect. Trade.{" "}
                <span className="gradient-text relative inline-block">
                  Own.
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="12"
                    viewBox="0 0 200 12"
                    fill="none"
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

              <p className="text-base sm:text-lg text-foreground/70 text-pretty max-w-xl leading-relaxed font-medium">
                Be among the first 50 collectors to join KŌKA. Sign up for our
                exclusive whitelist and receive your own personal legendary card
                when we launch.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary text-primary-foreground text-base px-8 py-5 shadow-xl transition-all cursor-pointer group font-bold"
                >
                  <Link
                    href="/app/whitelist"
                    className="flex items-center gap-2"
                  >
                    Join Whitelist
                    <ArrowRight className="w-4 h-4 transition-transform" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-5 border-2 border-primary/40 cursor-pointer bg-card/50 backdrop-blur-sm font-bold transition-all"
                >
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>

              <div className="flex items-center gap-5 pt-3">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-background shadow-lg">
                  <span className="text-2xl font-black text-primary">50</span>
                </div>
                <div className="text-xs">
                  <div className="font-bold text-foreground text-sm">
                    Limited Whitelist Spots
                  </div>
                  <div className="text-muted-foreground font-medium">
                    Be one of the first collectors
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-10 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/30 blur-3xl rounded-full animate-glow" />

              <div className="relative z-10 flex items-center justify-center p-8">
                <div className="absolute top-4 right-4 w-24 h-10 bg-primary/50 blur-xl rounded-full animate-pulse z-10" />
                <Image
                  src="/hero-frog.png"
                  alt="KŌKA Trading Card"
                  width={300}
                  height={400}
                  className="object-contain animate-float drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 px-8 sm:px-12 lg:px-20 xl:px-32 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-y-2 border-primary/20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
            {[
              {
                value: "50",
                label: "Whitelist Spots",
                icon: Users,
              },
              {
                value: "LIMITED",
                label: "Exclusive Access",
                icon: Shield,
              },
              {
                value: "PERSONAL",
                label: "Legendary Cards",
                icon: Sparkles,
              },
              {
                value: "EARLY",
                label: "Collector Benefits",
                icon: Trophy,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="text-center cursor-pointer transition-transform group"
              >
                <div className="flex items-center justify-center mb-3 transition-transform">
                  <stat.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-primary mb-2 gradient-text">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-16 sm:py-20 lg:py-24 px-8 sm:px-12 lg:px-20 xl:px-32"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block px-4 py-2 bg-secondary/20 border-2 border-secondary/40 rounded-full mb-5 cursor-pointer transition-transform">
              <span className="text-xs text-primary font-bold tracking-wide">
                Platform Features
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 text-balance gradient-text">
              Why Choose KŌKA?
            </h2>
            <p className="text-base sm:text-lg text-foreground/70 text-pretty max-w-2xl mx-auto font-medium leading-relaxed">
              Experience the next generation of digital collectibles with
              cutting-edge features.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: Wallet,
                title: "Wallet Integration",
                desc: "Connect with Phantom wallet for secure, seamless transactions on Solana.",
                color: "from-primary/20 to-primary/10",
              },
              {
                icon: Shield,
                title: "Secure & Verified",
                desc: "Every collectible is authenticated with blockchain technology for true ownership.",
                color: "from-secondary/20 to-secondary/10",
              },
              {
                icon: Sparkles,
                title: "Rare Collectibles",
                desc: "Discover unique items with varying rarity levels from Common to Legendary.",
                color: "from-accent/30 to-accent/10",
              },
              {
                icon: Users,
                title: "Thriving Community",
                desc: "Join thousands of collectors sharing, trading, and building together.",
                color: "from-primary/20 to-secondary/10",
              },
              {
                icon: Trophy,
                title: "Achievements",
                desc: "Earn badges and rewards as you grow your collection and participate.",
                color: "from-accent/30 to-primary/10",
              },
              {
                icon: Zap,
                title: "Instant Trading",
                desc: "Trade collectibles instantly with other users through our marketplace.",
                color: "from-secondary/20 to-accent/20",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className={`p-6 sm:p-7 bg-gradient-to-br ${feature.color} border-2 border-primary/20 transition-all cursor-pointer group backdrop-blur-sm`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 transition-all shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-black mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="py-16 sm:py-20 lg:py-24 px-8 sm:px-12 lg:px-20 xl:px-32 bg-gradient-to-b from-secondary/10 via-accent/5 to-transparent"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-accent/40 border-2 border-accent/60 rounded-full mb-5 cursor-pointer transition-transform">
                <span className="text-xs text-accent-foreground font-bold tracking-wide">
                  Our Story
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 text-balance gradient-text">
                The KŌKA Journey
              </h2>
              <div className="space-y-4 text-base text-foreground/80 leading-relaxed font-medium">
                <p>
                  KŌKA was born from a vision to create a platform where digital
                  collectibles transcend mere ownership and become a gateway to
                  community, culture, and creativity.
                </p>
                <p>
                  Inspired by ancient traditions and powered by modern
                  blockchain technology, KŌKA brings together collectors from
                  around the world to celebrate unique digital art and rare
                  treasures.
                </p>
                <p>
                  Our mascot, the wise turtle warrior, represents patience,
                  longevity, and the journey of building something truly
                  valuable over time.
                </p>
              </div>
            </div>

            <div className="relative mt-8 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-primary/20 blur-3xl rounded-full animate-pulse-slow" />
              <Card className="relative z-10 p-6 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20 transition-all overflow-hidden group cursor-pointer">
                <div className="relative aspect-square overflow-hidden rounded-xl mb-5 shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5">
                  <Image
                    src="/ancient-shell.png"
                    alt="Collectible Example"
                    width={400}
                    height={400}
                    className="w-full h-full object-contain transition-transform duration-700 p-4"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">
                    Ancient Shell
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    A rare artifact from the depths of the digital ocean.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section
        id="team"
        className="py-16 sm:py-20 lg:py-24 px-8 sm:px-12 lg:px-20 xl:px-32"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block px-4 py-2 bg-primary/10 border-2 border-primary/30 rounded-full mb-5 cursor-pointer transition-transform">
              <span className="text-xs text-primary font-bold tracking-wide">
                Our Team
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 text-balance gradient-text">
              Meet the Builders
            </h2>
            <p className="text-base sm:text-lg text-foreground/70 text-pretty max-w-2xl mx-auto font-medium leading-relaxed">
              The passionate individuals creating the future of digital
              collectibles.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Yuri",
                role: "Founder & CEO",
                bio: "Blockchain enthusiast with 10+ years in digital art and NFT markets.",
                image: "/yuri.png",
              },
              {
                name: "Jasmine",
                role: "Lead Developer",
                bio: "Full-stack engineer specializing in Web3 and decentralized applications.",
                image: "/jasmine.png",
              },
              {
                name: "Jai",
                role: "Creative Director",
                bio: "Award-winning artist bringing traditional aesthetics to digital collectibles.",
                image: "/jai.png",
              },
              {
                name: "Jewel",
                role: "Community Manager",
                bio: "Building engaged communities and fostering meaningful connections in Web3.",
                image: "/jewel.png",
              },
              {
                name: "Pao",
                role: "Marketing Lead",
                bio: "Strategic storyteller with expertise in launching successful NFT projects.",
                image: "/pao.png",
              },
            ].map((member, i) => (
              <Card
                key={i}
                className="p-6 sm:p-7 bg-gradient-to-br from-card to-accent/10 border-2 border-primary/20 transition-all text-center cursor-pointer group"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 mx-auto mb-4 flex items-center justify-center transition-all shadow-xl overflow-hidden">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-black mb-2 text-foreground">
                  {member.name}
                </h3>
                <p className="text-xs text-primary font-bold mb-3 uppercase tracking-wide">
                  {member.role}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {member.bio}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section
        id="roadmap"
        className="py-16 sm:py-20 lg:py-24 px-8 sm:px-12 lg:px-20 xl:px-32 bg-gradient-to-b from-accent/10 via-primary/5 to-transparent"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block px-4 py-2 bg-secondary/20 border-2 border-secondary/40 rounded-full mb-5 cursor-pointer transition-transform">
              <span className="text-xs text-primary font-bold tracking-wide">
                Our Journey
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 text-balance gradient-text">
              Project Roadmap
            </h2>
            <p className="text-base sm:text-lg text-foreground/70 text-pretty max-w-2xl mx-auto font-medium leading-relaxed">
              Follow our journey as we build the future of digital collectibles,
              one milestone at a time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Rocket,
                quarter: "Q1 2025",
                title: "Whitelist Launch",
                desc: "Open whitelist registration for the first 50 collectors. Personal legendary cards distributed.",
                color: "from-primary/20 to-primary/10",
                status: "current",
              },
              {
                icon: Sparkles,
                quarter: "Q2 2025",
                title: "Platform Beta",
                desc: "Launch beta version with core trading features and wallet integration for early adopters.",
                color: "from-secondary/20 to-secondary/10",
                status: "upcoming",
              },
              {
                icon: Users,
                quarter: "Q3 2025",
                title: "Community Launch",
                desc: "Full public launch with marketplace, achievements system, and community features.",
                color: "from-accent/30 to-accent/10",
                status: "upcoming",
              },
              {
                icon: Trophy,
                quarter: "Q4 2025",
                title: "Expansion",
                desc: "New collectible series, partnerships, and advanced trading features for the community.",
                color: "from-primary/20 to-secondary/10",
                status: "upcoming",
              },
            ].map((phase, i) => (
              <Card
                key={i}
                className={`p-6 sm:p-7 bg-gradient-to-br ${
                  phase.color
                } border-2 ${
                  phase.status === "current"
                    ? "border-primary"
                    : "border-primary/20"
                } transition-all cursor-pointer group backdrop-blur-sm relative overflow-hidden`}
              >
                {phase.status === "current" && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full uppercase tracking-wide">
                    Current
                  </div>
                )}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 transition-all shadow-lg">
                  <phase.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs text-primary font-bold uppercase tracking-wide">
                    {phase.quarter}
                  </span>
                </div>
                <h3 className="text-lg font-black mb-2 text-foreground">
                  {phase.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  {phase.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-8 sm:px-12 lg:px-20 xl:px-32 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-contain animate-pulse-slow" />
        <div className="absolute top-10 left-10 w-64 h-64 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-glow" />
        <div className="absolute bottom-10 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 text-balance gradient-text leading-tight">
            Join the Exclusive Whitelist
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 mb-8 text-pretty max-w-2xl mx-auto font-medium leading-relaxed">
            Be one of the first 50 collectors to receive your own personal
            legendary card. Limited spots available.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground text-lg px-12 py-6 shadow-2xl transition-all cursor-pointer group"
          >
            <Link href="/whitelist" className="flex items-center gap-2">
              Sign Up Now
              <ArrowRight className="w-5 h-5 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-12 px-8 sm:px-12 lg:px-20 xl:px-32 border-t-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 cursor-pointer transition-transform">
              <Image
                src="/koka-logo.png"
                alt="KŌKA"
                width={48}
                height={48}
                className="object-contain w-11 h-11"
              />
              <span className="text-2xl font-black gradient-text">KŌKA</span>
            </div>

            <p className="text-xs text-muted-foreground font-medium">
              © 2025 KŌKA. All rights reserved.
            </p>

            <div className="flex gap-6">
              {["Privacy", "Terms", "Contact"].map((link) => (
                <Link
                  key={link}
                  href="#"
                  className="text-xs text-muted-foreground cursor-pointer font-bold uppercase tracking-wide transition-transform"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
