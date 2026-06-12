require("dotenv").config();
const connectDB = require("../src/config/db");
const { MaterialPrice } = require("../src/modules/ai/ai.model");

const SEED_DATA = [
  { sku: "PAINT001", name: "White Paint", unit: "liter", unitPrice: 150, category: "painting" },
  { sku: "PRIMER001", name: "Wall Primer", unit: "liter", unitPrice: 120, category: "painting" },
  { sku: "CERAMIC001", name: "Floor Ceramic Tile", unit: "piece", unitPrice: 25, category: "ceramic" },
  { sku: "TILE_ADH001", name: "Tile Adhesive", unit: "kg", unitPrice: 8, category: "ceramic" },
  { sku: "GROUT001", name: "Tile Grout", unit: "kg", unitPrice: 15, category: "ceramic" },
  { sku: "PIPE001", name: "PVC Pipe", unit: "meter", unitPrice: 35, category: "plumbing" },
  { sku: "FITTING001", name: "Pipe Fittings Set", unit: "set", unitPrice: 80, category: "plumbing" },
  { sku: "FAUCET001", name: "Bathroom Faucet", unit: "piece", unitPrice: 350, category: "plumbing" },
  { sku: "SEAL001", name: "Waterproof Sealant", unit: "tube", unitPrice: 45, category: "plumbing" },
];

const seed = async () => {
  await connectDB();

  for (const item of SEED_DATA) {
    await MaterialPrice.findOneAndUpdate(
      { sku: item.sku },
      { ...item, isActive: true },
      { upsert: true, returnDocument: "after" },
    );
  }

  console.log(`Seeded ${SEED_DATA.length} material prices`);
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
