// components/collectible-card.tsx
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Collectible } from "@/lib/types";
import { Button } from "./ui/button";

interface CollectibleCardProps {
  collectible: Collectible;
  quantity?: number;
  onTrade?: () => void;
}

const rarityColors = {
  Common: "bg-gray-500",
  Uncommon: "bg-green-500",
  Rare: "bg-blue-500",
  Epic: "bg-purple-500",
  Legendary: "bg-orange-500",
};

export function CollectibleCard({
  collectible,
  quantity,
  onTrade,
}: CollectibleCardProps) {
  return (
    <Card className="overflow-hidden border-[#4A7C59]/20 hover:border-[#4A7C59]/40 transition-colors h-full flex flex-col">
      <CardHeader className="p-0 flex-1">
        <div className="relative h-32 w-full bg-[#F4E4B8]">
          <Image
            src={collectible.imageUrl || "/placeholder.svg"}
            alt={collectible.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-base text-[#4A7C59] line-clamp-1">
            {collectible.name}
          </CardTitle>
          <Badge
            className={`${rarityColors[collectible.rarity]} text-white text-xs`}
          >
            {collectible.rarity}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {collectible.description}
        </p>
      </CardContent>
      <CardFooter className="p-3 pt-0 border-t border-border/20">
        {quantity !== undefined && (
          <div className="flex justify-between items-center w-full">
            <div className="text-xs font-medium text-[#4A7C59]">
              Quantity: {quantity}
            </div>
            {onTrade && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-2 h-6"
                onClick={onTrade}
              >
                Trade
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
