"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Tag,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SOLANA_RPC_URL, solscanTx } from "@/lib/solana";

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerWallet?: string | null;
  collectibleId: string;
  collectible: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    rarity: string;
  };
  price?: number;
  quantity: number;
  listedAt: string;
  status: "active" | "sold" | "cancelled";
}

interface MarketplaceTabProps {
  listings: MarketplaceListing[];
  isLoading: boolean;
  userId?: string;
  token: string | null;
  onRefresh: () => Promise<unknown> | unknown;
  /** Called after a buy or unlist so the parent can refresh inventory too. */
  onChanged: () => Promise<unknown> | unknown;
}

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

const RARITY_STYLE: Record<string, string> = {
  common: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  uncommon: "bg-green-500/20 text-green-300 border-green-500/40",
  rare: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  epic: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  legendary: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

const rarityClass = (rarity: string) =>
  RARITY_STYLE[rarity?.toLowerCase()] || RARITY_STYLE.common;

const formatSol = (n?: number) =>
  n === undefined ? "-" : `${Number(n.toFixed(4))} SOL`;

type SortKey = "newest" | "price-asc" | "price-desc" | "rarity";
type Step = "idle" | "paying" | "confirming" | "claiming";

const STEP_LABEL: Record<Step, string> = {
  idle: "",
  paying: "Approve the payment in Phantom...",
  confirming: "Waiting for the payment to confirm...",
  claiming: "Claiming your card...",
};

export function MarketplaceTab({
  listings,
  isLoading,
  userId,
  token,
  onRefresh,
  onChanged,
}: MarketplaceTabProps) {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"all" | "mine">("all");

  const [buying, setBuying] = useState<MarketplaceListing | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [buyError, setBuyError] = useState("");
  // A payment that went through but whose claim failed, so nobody pays twice.
  const [paidSignature, setPaidSignature] = useState<string | null>(null);

  const [unlisting, setUnlisting] = useState<MarketplaceListing | null>(null);
  const [isUnlisting, setIsUnlisting] = useState(false);

  const active = useMemo(
    () => listings.filter((l) => l.status === "active" && l.quantity > 0),
    [listings]
  );
  const mineCount = active.filter((l) => l.sellerId === userId).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = active.filter((l) => {
      if (view === "mine" && l.sellerId !== userId) return false;
      if (rarity !== "all" && l.collectible.rarity.toLowerCase() !== rarity)
        return false;
      if (
        q &&
        !l.collectible.name.toLowerCase().includes(q) &&
        !l.sellerName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    const rank = (r: string) => RARITY_ORDER.indexOf(r.toLowerCase());
    rows.sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return (a.price ?? 0) - (b.price ?? 0);
        case "price-desc":
          return (b.price ?? 0) - (a.price ?? 0);
        case "rarity":
          return rank(b.collectible.rarity) - rank(a.collectible.rarity);
        default:
          return +new Date(b.listedAt) - +new Date(a.listedAt);
      }
    });
    return rows;
  }, [active, search, rarity, sort, view, userId]);

  const closeBuy = () => {
    if (step !== "idle") return; // do not close mid-payment
    setBuying(null);
    setBuyError("");
    setPaidSignature(null);
  };

  const claim = async (listing: MarketplaceListing, signature: string) => {
    setStep("claiming");
    const res = await fetch("/api/marketplace/buy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId: listing.id, signature }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `Purchase failed (${res.status})`);
    }
    return data.message as string;
  };

  const handleBuy = async () => {
    if (!buying || !token) return;
    setBuyError("");

    try {
      // Retry path: payment already made, only the claim is missing.
      if (paidSignature) {
        const msg = await claim(buying, paidSignature);
        toast.success("Purchased!", { description: msg });
        track("marketplace_purchase", { price: buying.price ?? 0, rarity: buying.collectible.rarity });
        setPaidSignature(null);
        setStep("idle");
        setBuying(null);
        await onChanged();
        return;
      }

      const provider = (window as any).solana;
      if (!provider?.isPhantom) {
        throw new Error("Phantom wallet not found. Install Phantom to buy.");
      }
      if (!buying.sellerWallet) {
        throw new Error("This seller has no wallet linked, so it cannot be paid.");
      }
      if (!buying.price) throw new Error("This listing has no price.");

      // Make sure the listing is still there before taking any money.
      const fresh = await fetch("/api/marketplace", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      const stillThere = fresh?.listings?.some(
        (l: MarketplaceListing) =>
          l.id === buying.id && l.status === "active" && l.quantity > 0
      );
      if (fresh?.success && !stillThere) {
        await onRefresh();
        throw new Error("This listing was just sold or removed.");
      }

      setStep("paying");
      const connected = await provider.connect();
      const from = new PublicKey(connected.publicKey.toString());
      const to = new PublicKey(buying.sellerWallet);
      const lamports = Math.round(buying.price * LAMPORTS_PER_SOL);

      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const balance = await connection.getBalance(from);
      if (balance < lamports + 10_000) {
        throw new Error(
          `Not enough devnet SOL. You have ${formatSol(
            balance / LAMPORTS_PER_SOL
          )}, this costs ${formatSol(buying.price)} plus a small network fee.`
        );
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: from,
        recentBlockhash: blockhash,
      }).add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }));

      const sent = await provider.signAndSendTransaction(tx);
      const signature: string = sent.signature;

      setStep("confirming");
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      setPaidSignature(signature);

      const msg = await claim(buying, signature);
      toast.success("Purchased!", { description: msg });
        track("marketplace_purchase", { price: buying.price ?? 0, rarity: buying.collectible.rarity });
      setPaidSignature(null);
      setStep("idle");
      setBuying(null);
      await onChanged();
    } catch (err: any) {
      const rejected =
        err?.code === 4001 || /user rejected/i.test(err?.message || "");
      setBuyError(
        rejected ? "Payment cancelled in Phantom." : err?.message || "Purchase failed"
      );
      setStep("idle");
      await onRefresh();
    }
  };

  const handleUnlist = async () => {
    if (!unlisting || !token) return;
    setIsUnlisting(true);
    try {
      const res = await fetch("/api/marketplace/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: unlisting.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Could not unlist");
      }
      track("marketplace_unlist");
      toast.success("Unlisted", {
        description: `${unlisting.collectible.name} is back in your inventory only.`,
      });
      setUnlisting(null);
      await onChanged();
    } catch (err: any) {
      toast.error("Unlist failed", { description: err?.message });
    } finally {
      setIsUnlisting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Marketplace
            </CardTitle>
            <CardDescription>
              Buy cards from other collectors with devnet SOL. Your own
              listings can be unlisted any time.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefresh()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="inline-flex rounded-lg border p-1 text-sm">
            {(
              [
                ["all", `All listings (${active.length})`],
                ["mine", `My listings (${mineCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors ${
                  view === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by card or seller"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 lg:flex">
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              aria-label="Filter by rarity"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All rarities</option>
              {RARITY_ORDER.map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort listings"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rarity">Rarity</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading && listings.length === 0 ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading listings...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">
              {active.length === 0
                ? "Nothing is for sale yet"
                : view === "mine" && mineCount === 0
                ? "You have nothing listed"
                : "No listings match your filters"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {view === "mine" && mineCount === 0
                ? "Open My Inventory and press List on a card to sell it."
                : active.length === 0
                ? "Be the first: open My Inventory and list a card."
                : "Try a different search or rarity."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
            {visible.map((listing) => {
              const mine = listing.sellerId === userId;
              return (
                <Card
                  key={listing.id}
                  className={`gap-0 overflow-hidden py-0 transition-shadow hover:shadow-lg ${
                    mine ? "border-primary/50" : ""
                  }`}
                >
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-muted to-accent">
                    {listing.collectible.imageUrl ? (
                      <img
                        src={listing.collectible.imageUrl}
                        alt={listing.collectible.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl font-black opacity-20">
                        {listing.collectible.name.charAt(0)}
                      </div>
                    )}
                    {mine && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                        Your listing
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <div>
                      <p className="line-clamp-1 text-sm font-semibold">
                        {listing.collectible.name}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {mine ? "Listed by you" : `Seller: ${listing.sellerName}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${rarityClass(
                          listing.collectible.rarity
                        )}`}
                      >
                        {listing.collectible.rarity}
                      </span>
                      <span className="whitespace-nowrap text-xs font-bold text-green-400 sm:text-sm">
                        {formatSol(listing.price)}
                      </span>
                    </div>

                    {mine ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => setUnlisting(listing)}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Unlist
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setBuyError("");
                          setPaidSignature(null);
                          setBuying(listing);
                        }}
                      >
                        <Tag className="mr-1 h-3.5 w-3.5" />
                        Buy
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Buy dialog */}
      <Dialog open={!!buying} onOpenChange={(o) => !o && closeBuy()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy {buying?.collectible.name}</DialogTitle>
            <DialogDescription>
              You pay the seller directly from your Phantom wallet on devnet.
              The card is added to your inventory once the payment confirms.
            </DialogDescription>
          </DialogHeader>

          {buying && (
            <div className="space-y-3">
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-md bg-muted">
                  {buying.collectible.imageUrl && (
                    <img
                      src={buying.collectible.imageUrl}
                      alt={buying.collectible.name}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <p className="font-semibold">{buying.collectible.name}</p>
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${rarityClass(
                      buying.collectible.rarity
                    )}`}
                  >
                    {buying.collectible.rarity}
                  </span>
                  <p className="text-muted-foreground">
                    Seller: {buying.sellerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-lg font-bold text-green-400">
                  {formatSol(buying.price)}
                </span>
              </div>

              {step !== "idle" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {STEP_LABEL[step]}
                </p>
              )}

              {paidSignature && (
                <p className="text-sm">
                  Your payment went through but the card is not claimed yet.
                  Press the button to finish.{" "}
                  <a
                    href={solscanTx(paidSignature)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    View payment <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}

              {buyError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                  {buyError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeBuy} disabled={step !== "idle"}>
              Cancel
            </Button>
            <Button onClick={handleBuy} disabled={step !== "idle"}>
              {step !== "idle" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="mr-2 h-4 w-4" />
              )}
              {paidSignature
                ? "Claim my card"
                : `Pay ${formatSol(buying?.price)} & buy`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlist dialog */}
      <Dialog open={!!unlisting} onOpenChange={(o) => !o && setUnlisting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlist {unlisting?.collectible.name}?</DialogTitle>
            <DialogDescription>
              It will disappear from the marketplace. The card stays in your
              inventory and you can list it again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setUnlisting(null)}
              disabled={isUnlisting}
            >
              Keep listed
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlist}
              disabled={isUnlisting}
            >
              {isUnlisting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default MarketplaceTab;
