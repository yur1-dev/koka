/**
 * KŌKA — Collectibles Platform
 *
 * Authors:
 *   - Levi Bermudez
 *   - Johan Elehcim Aguyaoy
 */
import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { Analytics } from "@/components/analytics";
import { WalletContextProvider } from "@/context/wallet-context";
import { SessionProvider } from "@/components/providers/session-provider";
import SolanaProviders from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://koka-landing.vercel.app";
const siteDescription =
  "KŌKA is a card collecting platform on Solana. Claim your starter pack, trade with other collectors and build your collection.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "KŌKA - Collectible Cards on Solana", template: "%s | KŌKA" },
  description: siteDescription,
  manifest: "/manifest.json",
  authors: [{ name: "Levi Bermudez" }, { name: "Johan Elehcim Aguyaoy" }],
  openGraph: {
    title: "KŌKA - Collectible Cards on Solana",
    description: siteDescription,
    url: siteUrl,
    siteName: "KŌKA",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "KŌKA Collectibles Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KŌKA - Collectible Cards on Solana",
    description: siteDescription,
    images: ["/preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress ethereum property redefinition errors
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  if (
                    typeof args[0] === 'string' &&
                    (args[0].includes('ethereum') || args[0].includes('defineProperty'))
                  ) {
                    return;
                  }
                  originalError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <SolanaProviders>
            {/* AuthProvider sits inside SolanaProviders so it can use the wallet */}
            <AuthProvider>
              <WalletContextProvider>{children}</WalletContextProvider>
            </AuthProvider>
          </SolanaProviders>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
