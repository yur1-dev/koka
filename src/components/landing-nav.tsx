"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Team", href: "#team" },
  { label: "Roadmap", href: "#roadmap" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b-2 border-primary/20 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4 lg:px-20 xl:px-32">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/koka-logo.png"
            alt="KŌKA"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
          />
          <span className="gradient-text text-xl font-black">KŌKA</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-primary font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/app">Enter App</Link>
          </Button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/40 bg-background/95 px-5 pb-4 pt-2 md:hidden">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export default LandingNav;
