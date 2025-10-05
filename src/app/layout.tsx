import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { WalletContextProvider } from "@/context/wallet-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KŌKA - Collectibles Platform",
  description: "Your gateway to unique digital collectibles",
  openGraph: {
    title: "KŌKA - Collectibles Platform",
    description: "Your gateway to unique digital collectibles",
    url: "https://koka-qahd.vercel.app",
    siteName: "KŌKA",
    images: [
      {
        url: "https://koka-qahd.vercel.app/og-preview.png",
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
    title: "KŌKA - Collectibles Platform",
    description: "Your gateway to unique digital collectibles",
    images: ["https://koka-qahd.vercel.app/og-preview.png"],
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
        <AuthProvider>
          <WalletContextProvider>{children}</WalletContextProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
