const AppError = require("../../utils/AppError");

const buildPaintingBoq = (estimation) => ({
  materials: [
    {
      sku: "PAINT001",
      name: "White Paint",
      quantity: estimation.paintQuantity,
      unit: "liter",
    },
  ],
});

const buildCeramicBoq = (estimation) => ({
  materials: [
    {
      sku: "CERAMIC001",
      name: "Floor Ceramic Tile",
      quantity: estimation.tilesQuantity,
      unit: "piece",
    },
    {
      sku: "TILE_ADH001",
      name: "Tile Adhesive",
      quantity: Math.ceil(estimation.floorArea * 4),
      unit: "kg",
    },
    {
      sku: "GROUT001",
      name: "Tile Grout",
      quantity: Math.ceil(estimation.floorArea * 0.5),
      unit: "kg",
    },
  ],
});

const buildPlumbingBoq = (estimation) => ({
  materials: [
    {
      sku: "PIPE001",
      name: "PVC Pipe",
      quantity: estimation.pipeLength,
      unit: "meter",
    },
    {
      sku: "FITTING001",
      name: "Pipe Fittings Set",
      quantity: estimation.fittingsCount,
      unit: "set",
    },
    {
      sku: "FAUCET001",
      name: "Bathroom Faucet",
      quantity: 1,
      unit: "piece",
    },
    {
      sku: "SEAL001",
      name: "Waterproof Sealant",
      quantity: Math.ceil(estimation.estimatedArea / 3),
      unit: "tube",
    },
  ],
});

const BOQ_BUILDERS = {
  painting: buildPaintingBoq,
  ceramic: buildCeramicBoq,
  plumbing: buildPlumbingBoq,
};

const generateBoq = (estimation) => {
  const builder = BOQ_BUILDERS[estimation.serviceType];
  if (!builder) {
    throw new AppError(`Cannot generate BOQ for service type: ${estimation.serviceType}`, 400);
  }

  return builder(estimation);
};

module.exports = {
  generateBoq,
  BOQ_BUILDERS,
};
