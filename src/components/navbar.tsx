"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  LogOut,
  Shield,
  Settings,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { CustomWalletModal } from "@/components/custom-wallet-modal";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getPhantomPublicKey,
  disconnectPhantomWallet,
} from "@/lib/phantom-wallet";

export function Navbar() {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const router = useRouter();

  // Stable avatar URL so the image does not reload on every render
  const [stableAvatarUrl, setStableAvatarUrl] = useState<string>("");

  // Fetch wallet balance
  const fetchBalance = async (address: string) => {
    try {
      const connection = new Connection("https://api.devnet.solana.com");
      const publicKey = new PublicKey(address);
      const balanceInLamports = await connection.getBalance(publicKey);
      setBalance(balanceInLamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance(null);
    }
  };

  // Listen to Phantom wallet connection state
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).solana) {
      const provider = (window as any).solana;

      const checkInitialConnection = () => {
        const pubKey = getPhantomPublicKey();
        if (pubKey) {
          setWalletAddress(pubKey);
          fetchBalance(pubKey);
        }
      };

      checkInitialConnection();

      const handleConnect = () => {
        const pubKey = getPhantomPublicKey();
        if (pubKey) {
          setWalletAddress(pubKey);
          fetchBalance(pubKey);
        }
      };

      const handleDisconnect = () => {
        setWalletAddress(null);
        setBalance(null);
      };

      const handleAccountChanged = (publicKey: any) => {
        if (publicKey) {
          const address = publicKey.toString();
          setWalletAddress(address);
          fetchBalance(address);
        } else {
          handleDisconnect();
        }
      };

      provider.on("connect", handleConnect);
      provider.on("disconnect", handleDisconnect);
      provider.on("accountChanged", handleAccountChanged);

      return () => {
        provider.off("connect", handleConnect);
        provider.off("disconnect", handleDisconnect);
        provider.off("accountChanged", handleAccountChanged);
      };
    }
  }, []);

  // Only refresh the avatar when user.avatarUrl actually changes
  useEffect(() => {
    if (user?.avatarUrl) {
      // Cache-bust once when the avatar loads or changes
      setStableAvatarUrl(`${user.avatarUrl}?t=${Date.now()}`);
    }
  }, [user?.avatarUrl]);

  const getDisplayName = (userData: any) => {
    return (
      userData?.username ||
      userData?.name ||
      userData?.email?.split("@")[0] ||
      "User"
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDefaultAvatar = (name: string) => {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
      name
    )}`;
  };

  const handleLogout = async () => {
    try {
      if (walletAddress) {
        await disconnectPhantomWallet();
      }
      logout();
      router.push("/app/login");
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/app/login");
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectPhantomWallet();
      setWalletAddress(null);
      setBalance(null);
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  };

  const displayName = user ? getDisplayName(user) : "";
  // Use the stable URL, or fall back to a generated avatar
  const avatarSrc = stableAvatarUrl || getDefaultAvatar(displayName);

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link
              href={user ? "/app/dashboard" : "/"}
              className="flex shrink-0 items-center gap-2 sm:gap-3 cursor-pointer"
            >
              <Image
                src="/koka-logo.png"
                alt="KŌKA"
                width={40}
                height={40}
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
              />
              <span className="text-xl sm:text-2xl font-bold text-primary">KŌKA</span>
            </Link>

            <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
              {user ? (
                <>
                  {/* Wallet Connect Button */}
                  {!walletAddress ? (
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      variant="outline"
                      size="sm"
                      aria-label="Connect wallet"
                      className="border-primary text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Connect Wallet</span>
                    </Button>
                  ) : (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-primary/20 rounded-md bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {formatWalletAddress(walletAddress)}
                        </span>
                        <span className="hidden sm:block text-xs text-muted-foreground">
                          {balance !== null
                            ? `${balance.toFixed(4)} SOL`
                            : "Loading..."}
                        </span>
                      </div>
                    </button>
                  )}

                  {user.isAdmin && (
                    <Link href="/app/admin" className="hidden sm:block">
                      <Button
                        variant="ghost"
                        className="text-primary hover:bg-primary/10"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full p-0 hover:bg-primary/10"
                      >
                        {/* Stable key, no twitching */}
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/20 cursor-pointer">
                          <AvatarImage
                            src={avatarSrc}
                            alt={displayName}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-1.5rem)]">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none capitalize">
                            {displayName}
                          </p>
                          {user.email && !user.email.endsWith("@koka.local") && (
                            <p className="truncate text-xs leading-none text-muted-foreground">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/app/dashboard"
                          className="cursor-pointer flex items-center gap-2 w-full"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/app/profile"
                          className="cursor-pointer flex items-center gap-2 w-full"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/app/settings"
                          className="cursor-pointer flex items-center gap-2 w-full"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      {walletAddress && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleDisconnectWallet}
                            className="cursor-pointer flex items-center gap-2 w-full"
                          >
                            <Wallet className="w-4 h-4" />
                            Disconnect Wallet
                          </DropdownMenuItem>
                        </>
                      )}
                      {user.isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href="/app/admin"
                              className="cursor-pointer flex items-center gap-2 w-full"
                            >
                              <Shield className="w-4 h-4" />
                              Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-600 cursor-pointer focus:text-red-600 flex items-center gap-2 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/app/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-primary/10"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/app/signup">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <CustomWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
