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

interface CollectibleCardProps {
  collectible: Collectible;
  quantity?: number;
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
}: CollectibleCardProps) {
  return (
    <Card className="overflow-hidden border-[#4A7C59]/20 hover:border-[#4A7C59]/40 transition-colors">
      <CardHeader className="p-0">
        <div className="relative aspect-square w-full bg-[#F4E4B8]">
          <Image
            src={collectible.imageUrl || "/placeholder.svg"}
            alt={collectible.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg text-[#4A7C59]">
            {collectible.name}
          </CardTitle>
          <Badge className={`${rarityColors[collectible.rarity]} text-white`}>
            {collectible.rarity}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {collectible.description}
        </p>
      </CardContent>
      {quantity !== undefined && (
        <CardFooter className="p-4 pt-0">
          <div className="text-sm font-medium text-[#4A7C59]">
            Quantity: {quantity}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
