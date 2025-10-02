"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { CollectibleCard } from "@/components/collectible-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { InventoryItem } from "@/lib/types";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInventory = async () => {
      if (!token) return;

      try {
        const response = await fetch("/api/inventory", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setInventory(data.inventory);
        } else {
          setError(data.message || "Failed to load inventory");
        }
      } catch (err) {
        setError("An error occurred while loading your inventory");
        console.error("[v0] Inventory fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [token]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">
                Welcome back, {user?.username}!
              </h1>
              <p className="text-muted-foreground">
                Manage your collectibles and explore new items
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  Your Inventory
                </CardTitle>
                <CardDescription>
                  {inventory.length === 0
                    ? "You don't have any collectibles yet"
                    : `You have ${inventory.length} collectible${
                        inventory.length === 1 ? "" : "s"
                      }`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading your inventory...
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Your inventory is empty
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Contact an admin to receive your first collectibles!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {inventory.map((item) =>
                      item.collectible ? (
                        <CollectibleCard
                          key={item.id}
                          collectible={item.collectible}
                          quantity={item.quantity}
                        />
                      ) : null
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
