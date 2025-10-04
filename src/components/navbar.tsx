"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
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
import { User, LogOut, Shield, Settings, Wallet } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const balance = useWalletBalance();

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
      if (publicKey) {
        await disconnect();
      }
      logout();
      window.location.href = "/app/login";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/app/login";
    }
  };

  const displayName = user ? getDisplayName(user) : "";
  const avatarSrc = user?.avatarUrl || getDefaultAvatar(displayName);

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            href={user ? "/app/dashboard" : "/"}
            className="flex items-center gap-3"
          >
            <Image
              src="/koka-logo.png"
              alt="KŌKA"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-2xl font-bold text-primary">KŌKA</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/app/dashboard">
                  <Button
                    variant="ghost"
                    className="text-primary hover:bg-primary/10"
                  >
                    Dashboard
                  </Button>
                </Link>

                {/* Wallet Connect Button */}
                {!publicKey ? (
                  <Button
                    onClick={() => setVisible(true)}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 border border-primary/20 rounded-md bg-primary/5">
                    <Wallet className="w-4 h-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">
                        {formatWalletAddress(publicKey.toString())}
                      </span>
                      {balance !== null && (
                        <span className="text-xs text-muted-foreground">
                          {balance.toFixed(2)} SOL
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {user.isAdmin && (
                  <Link href="/app/admin">
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
                      className="relative h-10 w-10 rounded-full p-0 hover:bg-primary/10"
                    >
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={avatarSrc} alt={displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none capitalize">
                          {displayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email || `${displayName}@koka.local`}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/app/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/app/profile" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    {publicKey && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => disconnect()}
                          className="cursor-pointer"
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Disconnect Wallet
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/app/admin" className="cursor-pointer">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 cursor-pointer focus:text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
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
                    className="text-primary hover:bg-primary/10"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/app/signup">
                  <Button className="bg-primary hover:bg-primary/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
