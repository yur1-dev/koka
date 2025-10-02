"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { AdminRoute } from "@/components/admin-route";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, Users, Package } from "lucide-react";
import type { User, Collectible } from "@/lib/types";

export default function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCollectible, setSelectedCollectible] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        const [usersRes, collectiblesRes] = await Promise.all([
          fetch("/api/admin/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/collectibles"),
        ]);

        const usersData = await usersRes.json();
        const collectiblesData = await collectiblesRes.json();

        if (usersData.success) {
          setUsers(usersData.users);
        }
        if (collectiblesData.success) {
          setCollectibles(collectiblesData.collectibles);
        }
      } catch (err) {
        console.error("[v0] Admin data fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleAssignCollectible = async () => {
    if (!selectedUser || !selectedCollectible) {
      setMessage({
        type: "error",
        text: "Please select both a user and a collectible",
      });
      return;
    }

    setIsAssigning(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/assign-collectible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUser,
          collectibleId: selectedCollectible,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Collectible assigned successfully!",
        });
        setSelectedUser("");
        setSelectedCollectible("");
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to assign collectible",
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred" });
      console.error("[v0] Assign collectible error:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-4xl font-bold text-primary">Admin Panel</h1>
                <p className="text-muted-foreground">
                  Manage users and collectibles
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Users className="w-5 h-5" />
                    Total Users
                  </CardTitle>
                  <CardDescription>
                    Registered users on the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {users.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Package className="w-5 h-5" />
                    Total Collectibles
                  </CardTitle>
                  <CardDescription>
                    Available collectibles in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {collectibles.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  Assign Collectible to User
                </CardTitle>
                <CardDescription>Grant collectibles to users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {message && (
                  <Alert
                    variant={
                      message.type === "error" ? "destructive" : "default"
                    }
                  >
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-select">Select User</Label>
                      <Select
                        value={selectedUser}
                        onValueChange={setSelectedUser}
                      >
                        <SelectTrigger id="user-select">
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username} {user.isAdmin && "(Admin)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="collectible-select">
                        Select Collectible
                      </Label>
                      <Select
                        value={selectedCollectible}
                        onValueChange={setSelectedCollectible}
                      >
                        <SelectTrigger id="collectible-select">
                          <SelectValue placeholder="Choose a collectible" />
                        </SelectTrigger>
                        <SelectContent>
                          {collectibles.map((collectible) => (
                            <SelectItem
                              key={collectible.id}
                              value={collectible.id}
                            >
                              {collectible.name} ({collectible.rarity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleAssignCollectible}
                      disabled={
                        isAssigning || !selectedUser || !selectedCollectible
                      }
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {isAssigning ? "Assigning..." : "Assign Collectible"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  All Users
                </CardTitle>
                <CardDescription>View all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-primary">
                            {user.username}
                            {user.isAdmin && (
                              <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email ||
                              user.walletAddress?.slice(0, 16) + "..." ||
                              "No contact info"}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
