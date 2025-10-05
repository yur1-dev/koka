"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  RefreshCw,
  Star,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { token, user: currentUser } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId && token) {
      // If viewing own profile, redirect to main profile page
      if (currentUser && userId === currentUser.id) {
        router.push("/app/profile");
        return;
      }
      fetchUserData();
    }
  }, [userId, token, currentUser]);

  const fetchUserData = async () => {
    try {
      // Fetch user from users list (you already have this data)
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        const foundUser = data.users.find((u: any) => u.id === userId);
        setUser(foundUser);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayName = (userData: any) => {
    return (
      userData?.name ||
      userData?.username ||
      userData?.email?.split("@")[0] ||
      "User"
    );
  };

  const getDefaultAvatar = (name: string) => {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
      name
    )}`;
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center h-96">
            <p>Loading profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-muted-foreground mb-4">User not found</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const displayName = getDisplayName(user);
  const avatarSrc = getDefaultAvatar(displayName);
  const coverSrc =
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Cover Photo */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5">
          <img
            src={coverSrc}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 max-w-4xl -mt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl mb-4">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center w-full mb-4">
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full max-w-md">
                  <Button className="flex-1">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Propose Trade
                  </Button>
                  <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-md">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Cards</p>
                  </div>
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <RefreshCw className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Trades</p>
                  </div>
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <Star className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Unique</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collection */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-4">
                {displayName}'s Collection
              </h3>
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No collectibles to display
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
