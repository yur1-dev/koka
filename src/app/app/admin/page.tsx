"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Layers,
  RefreshCw,
  Shield,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  Send,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { AdminRoute } from "@/components/admin-route";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- types ---------- */

interface Analytics {
  generatedAt: string;
  users: {
    total: number;
    founders: number;
    founderSpotsLeft: number;
    whitelistLimit: number;
    walletLinked: number;
    claimedStarter: number;
    new7d: number;
    newPrev7d: number;
    withCards: number;
  };
  cards: {
    designs: number;
    copiesOwned: number;
    supply: { rarity: string; designs: number; minted: number; max: number }[];
    bySource: { source: string; copies: number }[];
  };
  market: {
    active: number;
    sold: number;
    cancelled: number;
    salesCount: number;
    volume: number;
    avgPrice: number;
    sales7d: number;
    volume7d: number;
    trades: number;
    trades7d: number;
  };
  daily: { date: string; signups: number; sales: number; volume: number }[];
  top: {
    sellers: { name: string; sales: number; volume: number }[];
    buyers: { name: string; buys: number; volume: number }[];
    cards: { name: string; rarity: string; sales: number; volume: number }[];
  };
  recent: {
    sales: {
      id: string;
      card: string;
      rarity: string;
      price: number;
      buyer: string;
      seller: string;
      at: string;
    }[];
    signups: {
      id: string;
      name: string;
      isFounder: boolean;
      hasWallet: boolean;
      at: string;
    }[];
  };
}

interface AdminUser {
  id: string;
  name?: string | null;
  username?: string | null;
  email: string;
  walletAddress?: string | null;
  isAdmin: boolean;
  isFounder: boolean;
  points: number;
  createdAt: string;
}

interface CardOption {
  id: string;
  name: string;
  rarity: string;
}

/* ---------- helpers ---------- */

const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};
const BRAND = "#4ade80";

const sol = (n: number) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ---------- small UI pieces ---------- */

function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  delta?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        {delta !== undefined && delta !== 0 && (
          <span
            className={`inline-flex items-center ${
              delta > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta)}
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

function BarChart({
  data,
  color = BRAND,
  format = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const W = 300;
  const H = 90;
  const gap = 2;
  const bw = (W - gap * (data.length - 1)) / data.length;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          Total <span className="font-semibold text-foreground">{format(total)}</span>
        </span>
        <span>Peak {format(max === 1 && total === 0 ? 0 : max)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label="Daily chart for the last 30 days"
      >
        <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="currentColor" opacity="0.15" />
        {data.map((d, i) => {
          const h = d.value === 0 ? 1 : Math.max(3, (d.value / max) * (H - 4));
          return (
            <rect
              key={d.label}
              x={i * (bw + gap)}
              y={H - h}
              width={bw}
              height={h}
              rx="1.5"
              fill={color}
              opacity={d.value === 0 ? 0.18 : 0.9}
            >
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label.slice(5)}</span>
        <span>{data[data.length - 1]?.label.slice(5)}</span>
      </div>
    </div>
  );
}

function HBar({
  label,
  value,
  max,
  color,
  right,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  right?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="capitalize">{label}</span>
        <span className="tabular-nums text-muted-foreground">{right ?? value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function RarityDot({ rarity }: { rarity: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: RARITY_COLOR[rarity] ?? "#9ca3af" }}
    />
  );
}

/* ---------- page ---------- */

export default function AdminPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cards, setCards] = useState<CardOption[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [qty, setQty] = useState("1");
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [a, u, c] = await Promise.all([
        fetch("/api/admin/analytics", { headers, cache: "no-store" }),
        fetch("/api/admin/users", { headers, cache: "no-store" }),
        fetch("/api/collectibles"),
      ]);
      const aj = await a.json();
      if (!aj.success) throw new Error(aj.message || "Could not load analytics");
      setData(aj);
      const uj = await u.json();
      if (uj.success) setUsers(uj.users);
      const cj = await c.json();
      if (cj.success) setCards(cj.collectibles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async () => {
    if (!selectedUser || !selectedCard) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/assign-collectibles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: selectedUser,
          collectibleId: selectedCard,
          quantity: Number(qty) || 1,
        }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success(j.message || "Card assigned");
        setSelectedCard("");
        setQty("1");
        load();
      } else {
        toast.error(j.message || "Could not assign the card");
      }
    } catch {
      toast.error("Could not assign the card");
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.username, u.name, u.email, u.walletAddress].some((v) => v?.toLowerCase().includes(q))
    );
  }, [users, search]);

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Admin</h1>
                <p className="text-sm text-muted-foreground">
                  {data ? `Updated ${ago(data.generatedAt)}` : "Platform analytics and tools"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            {/* ---------------- ANALYTICS ---------------- */}
            <TabsContent value="analytics" className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
                  {error}
                </div>
              )}

              {!data && loading && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              )}

              {data && (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi
                      label="Users"
                      value={data.users.total.toLocaleString()}
                      sub={`${data.users.new7d} new this week`}
                      delta={data.users.new7d - data.users.newPrev7d}
                      icon={Users}
                    />
                    <Kpi
                      label="Founders"
                      value={`${data.users.founders}/${data.users.whitelistLimit}`}
                      sub={
                        data.users.founderSpotsLeft > 0
                          ? `${data.users.founderSpotsLeft} spots left`
                          : "Whitelist closed"
                      }
                      icon={Crown}
                    />
                    <Kpi
                      label="Wallets linked"
                      value={`${pct(data.users.walletLinked, data.users.total)}%`}
                      sub={`${data.users.walletLinked} of ${data.users.total} users`}
                      icon={Wallet}
                    />
                    <Kpi
                      label="Cards owned"
                      value={data.cards.copiesOwned.toLocaleString()}
                      sub={`${data.cards.designs} designs`}
                      icon={Layers}
                    />
                    <Kpi
                      label="Market volume"
                      value={sol(data.market.volume)}
                      sub={`${sol(data.market.volume7d)} this week`}
                      icon={Coins}
                    />
                    <Kpi
                      label="Sales"
                      value={data.market.salesCount.toLocaleString()}
                      sub={`${data.market.sales7d} this week, avg ${sol(data.market.avgPrice)}`}
                      icon={ShoppingBag}
                    />
                    <Kpi
                      label="Live listings"
                      value={data.market.active.toLocaleString()}
                      sub={`${data.market.cancelled} unlisted`}
                      icon={Store}
                    />
                    <Kpi
                      label="Card sends"
                      value={data.market.trades.toLocaleString()}
                      sub={`${data.market.trades7d} this week`}
                      icon={Send}
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel title="Sign-ups" hint="Last 30 days">
                      <BarChart
                        data={data.daily.map((d) => ({ label: d.date, value: d.signups }))}
                      />
                    </Panel>
                    <Panel title="Marketplace volume" hint="SOL traded per day, last 30 days">
                      <BarChart
                        color="#60a5fa"
                        format={(n) => `${+n.toFixed(3)} SOL`}
                        data={data.daily.map((d) => ({ label: d.date, value: d.volume }))}
                      />
                    </Panel>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Panel title="Onboarding funnel" hint="How far people get">
                      <div className="space-y-3">
                        <HBar
                          label="Signed up"
                          value={data.users.total}
                          max={data.users.total}
                          color={BRAND}
                          right={`${data.users.total}`}
                        />
                        <HBar
                          label="Claimed starter card"
                          value={data.users.claimedStarter}
                          max={data.users.total}
                          color={BRAND}
                          right={`${data.users.claimedStarter} (${pct(data.users.claimedStarter, data.users.total)}%)`}
                        />
                        <HBar
                          label="Own cards"
                          value={data.users.withCards}
                          max={data.users.total}
                          color={BRAND}
                          right={`${data.users.withCards} (${pct(data.users.withCards, data.users.total)}%)`}
                        />
                        <HBar
                          label="Linked a wallet"
                          value={data.users.walletLinked}
                          max={data.users.total}
                          color={BRAND}
                          right={`${data.users.walletLinked} (${pct(data.users.walletLinked, data.users.total)}%)`}
                        />
                      </div>
                    </Panel>

                    <Panel title="Supply by rarity" hint="Copies minted vs max supply">
                      <div className="space-y-3">
                        {data.cards.supply.map((s) => (
                          <HBar
                            key={s.rarity}
                            label={`${s.rarity} (${s.designs})`}
                            value={s.minted}
                            max={s.max || s.minted}
                            color={RARITY_COLOR[s.rarity]}
                            right={s.max ? `${s.minted}/${s.max}` : `${s.minted}`}
                          />
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Where cards come from" hint="Copies by how they were received">
                      {data.cards.bySource.length === 0 ? (
                        <Empty text="No cards yet." />
                      ) : (
                        <div className="space-y-3">
                          {data.cards.bySource
                            .slice()
                            .sort((a, b) => b.copies - a.copies)
                            .map((s) => (
                              <HBar
                                key={s.source}
                                label={s.source.replace(/-/g, " ")}
                                value={s.copies}
                                max={Math.max(...data.cards.bySource.map((x) => x.copies))}
                                color="#a78bfa"
                              />
                            ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Panel title="Top sellers" hint="By SOL earned">
                      {data.top.sellers.length === 0 ? (
                        <Empty text="No sales yet." />
                      ) : (
                        <ol className="space-y-2 text-sm">
                          {data.top.sellers.map((r, i) => (
                            <li key={r.name + i} className="flex justify-between gap-3">
                              <span className="truncate">
                                {i + 1}. {r.name}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {r.sales} sold, {sol(r.volume)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Panel>
                    <Panel title="Top buyers" hint="By SOL spent">
                      {data.top.buyers.length === 0 ? (
                        <Empty text="No purchases yet." />
                      ) : (
                        <ol className="space-y-2 text-sm">
                          {data.top.buyers.map((r, i) => (
                            <li key={r.name + i} className="flex justify-between gap-3">
                              <span className="truncate">
                                {i + 1}. {r.name}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {r.buys} bought, {sol(r.volume)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Panel>
                    <Panel title="Most traded cards" hint="By number of sales">
                      {data.top.cards.length === 0 ? (
                        <Empty text="No sales yet." />
                      ) : (
                        <ol className="space-y-2 text-sm">
                          {data.top.cards.map((r, i) => (
                            <li key={r.name + i} className="flex justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <RarityDot rarity={r.rarity} />
                                <span className="truncate">{r.name}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {r.sales}x, {sol(r.volume)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Panel>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel title="Recent sales">
                      {data.recent.sales.length === 0 ? (
                        <Empty text="No sales yet." />
                      ) : (
                        <ul className="divide-y divide-border text-sm">
                          {data.recent.sales.map((s) => (
                            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <RarityDot rarity={s.rarity} />
                                  <span className="truncate font-medium">{s.card}</span>
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {s.seller} to {s.buyer}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="tabular-nums">{sol(s.price)}</div>
                                <div className="text-xs text-muted-foreground">{ago(s.at)}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                    <Panel title="Newest members">
                      {data.recent.signups.length === 0 ? (
                        <Empty text="No users yet." />
                      ) : (
                        <ul className="divide-y divide-border text-sm">
                          {data.recent.signups.map((u) => (
                            <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium">{u.name}</span>
                                {u.isFounder && (
                                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                    FOUNDER
                                  </span>
                                )}
                                {u.hasWallet && <Wallet className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">{ago(u.at)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Page views, visitors and referrers are in the Vercel dashboard under Analytics.
                    Volume counts SOL paid on completed marketplace sales.
                  </p>
                </>
              )}
            </TabsContent>

            {/* ---------------- MANAGE ---------------- */}
            <TabsContent value="manage" className="space-y-6">
              <Panel title="Give a card to a user" hint="Respects each card's max supply">
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.username || u.name || u.email}
                            {u.isAdmin ? " (admin)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Card</Label>
                    <Select value={selectedCard} onValueChange={setSelectedCard}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a card" />
                      </SelectTrigger>
                      <SelectContent>
                        {cards.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.rarity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>
                  <Button onClick={assign} disabled={assigning || !selectedUser || !selectedCard}>
                    {assigning ? "Giving..." : "Give card"}
                  </Button>
                </div>
              </Panel>

              <Panel title={`All users (${users.length})`}>
                <Input
                  placeholder="Search name, email or wallet"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-4 max-w-sm"
                />
                <div className="divide-y divide-border text-sm">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{u.username || u.name || "Unnamed"}</span>
                          {u.isAdmin && (
                            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              ADMIN
                            </span>
                          )}
                          {u.isFounder && (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                              FOUNDER
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {u.email}
                          {u.walletAddress ? `, ${u.walletAddress.slice(0, 4)}...${u.walletAddress.slice(-4)}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.points} pts, joined {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && <Empty text="No users match." />}
                </div>
              </Panel>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AdminRoute>
  );
}
