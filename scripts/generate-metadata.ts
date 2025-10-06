import fs from "fs";
import path from "path";

type Metadata = {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  image: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  properties: {
    files: Array<{ uri: string; type: string }>;
    category: string;
  };
};

const imagesDir = path.join(__dirname, "../public/nfts/images"); // Updated to public
const metadataDir = path.join(__dirname, "../public/nfts/metadata"); // New metadata folder here too

if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir, { recursive: true });
}

const images: string[] = fs.readdirSync(imagesDir).sort().slice(0, 50);

images.forEach((imageFile: string, index: number) => {
  const edition: number = index + 1;
  const metadata: Metadata = {
    name: `Koka #${edition}`,
    symbol: "KOKA",
    description:
      "A unique digital collectible from the Koka series. Edition of 50.",
    seller_fee_basis_points: 500,
    image: "", // Placeholder
    external_url: `https://koka-qahd.vercel.app/nft/${edition}`,
    attributes: [
      { trait_type: "Edition", value: edition },
      { trait_type: "Rarity", value: edition <= 10 ? "Rare" : "Common" },
    ],
    properties: {
      files: [
        {
          uri: "",
          type: imageFile.endsWith(".png") ? "image/png" : "image/jpeg",
        },
      ],
      category: "image",
    },
  };

  const metadataPath = path.join(metadataDir, `koka-${edition}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Generated: ${imageFile} → koka-${edition}.json`);
});
