const { MaterialPrice } = require("./ai.model");
const AppError = require("../../utils/AppError");
const { LABOR_HOURLY_RATE, PLATFORM_FEE } = require("../../config/env");

const calculatePricing = async (boq, laborHours) => {
  const skus = boq.materials.map((item) => item.sku);

  const prices = await MaterialPrice.find({
    sku: { $in: skus },
    isActive: true,
  });

  const priceMap = new Map(prices.map((p) => [p.sku, p]));

  const materials = boq.materials.map((item) => {
    const priceRecord = priceMap.get(item.sku);
    if (!priceRecord) {
      throw new AppError(`Material price not found for SKU: ${item.sku}`, 404);
    }

    const totalPrice = item.quantity * priceRecord.unitPrice;

    return {
      sku: item.sku,
      name: priceRecord.name,
      quantity: item.quantity,
      unit: priceRecord.unit,
      unitPrice: priceRecord.unitPrice,
      totalPrice,
    };
  });

  const materialsTotal = materials.reduce((sum, item) => sum + item.totalPrice, 0);
  const laborCost = laborHours * LABOR_HOURLY_RATE;
  const grandTotal = materialsTotal + laborCost + PLATFORM_FEE;

  return {
    materials,
    materialsTotal,
    laborCost,
    platformFee: PLATFORM_FEE,
    grandTotal,
  };
};

module.exports = {
  calculatePricing,
};
