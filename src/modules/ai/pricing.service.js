const { MaterialPrice } = require("./ai.model");
const AppError = require("../../utils/AppError");
const { LABOR_HOURLY_RATE, PLATFORM_FEE } = require("../../config/env");

const calculatePricing = async (boq, laborHours, floorLevel = 1) => {
  const skus = boq.materials.map((item) => item.sku);

  const prices = await MaterialPrice.find({
    sku: { $in: skus },
    isActive: true,
  });

  const priceMap = new Map(prices.map((p) => [p.sku, p]));

  const materials = boq.materials.map((item) => {
    const priceRecord = priceMap.get(item.sku);
    if (!priceRecord) {
      throw new AppError(`Material price record not found in Database for SKU: ${item.sku}`, 404);
    }

    // المعادلة الهندسية المالية: سعر الوحدة الصافي + (تكلفة التشوين للوحدة في الدور الواحد × عدد الأدوار)
    const floorAdjustment = priceRecord.handlingFeePerFloor ? (priceRecord.handlingFeePerFloor * (floorLevel - 1)) : 0;
    const finalUnitPrice = priceRecord.baseUnitPrice + floorAdjustment;
    
    const totalPrice = item.quantity * finalUnitPrice;

    return {
      sku: item.sku,
      name: priceRecord.name,
      quantity: item.quantity,
      unit: priceRecord.unit,
      unitPrice: finalUnitPrice, // السعر شامل التشوين للأدوار العليا
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