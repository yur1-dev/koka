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
import { User, LogOut, Shield } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const _router = useRouter();

  const handleLogout = async () => {
    try {
      // Call logout to clear auth state
      logout();

      // Force a hard navigation (clears all client state)
      window.location.href = "/app/login";

      // Fallback to router.push if window.location fails
      // router.push("/app/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect even if logout has errors
      window.location.href = "/app/login";
    }
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
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {user.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 cursor-pointer"
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
