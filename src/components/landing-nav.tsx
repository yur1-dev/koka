import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 sm:px-12 lg:px-20 xl:px-32 py-5 bg-background/80 backdrop-blur-md border-b-2 border-primary/20">
      <div className="container mx-auto max-w-6xl flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 cursor-pointer transition-transform"
        >
          <Image
            src="/koka-logo.png"
            alt="KŌKA"
            width={40}
            height={40}
            className="object-contain w-9 h-9"
          />
          <span className="text-xl font-black gradient-text">KŌKA</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "About", "Team", "Roadmap"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer uppercase tracking-wide transition-colors"
            >
              {item}
            </Link>
          ))}
          {/* <Link
            href="/docs"
            className="text-sm font-bold text-muted-foreground hover:text-primary cursor-pointer uppercase tracking-wide transition-colors"
          >
            Docs
          </Link> */}
        </div>

        <Button
          asChild
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer transition-all"
        >
          <Link href="/app">Enter App</Link>
        </Button>
      </div>
    </nav>
  );
}

export default LandingNav;
