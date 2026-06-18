const AppError = require("../../utils/AppError");

const ENG_CONSTANTS = {
  BRICK: {
    LENGTH: 0.25,
    WIDTH: 0.12,
    HEIGHT: 0.06,
    MORTAR_JOINT: 0.01,
    WASTE_FACTOR: 1.05 // 5% هدر نقل وتكسير موقعي
  },
  MIX_DESIGNS: {
    BUILDING_CEMENT_KG_PER_M3_SAND: 300,   // 6 شكاير لكل م٣ رمل
    PLASTER_TRATASHA_CEMENT_KG_PER_M3_SAND: 450, // 9 شكاير للطرطشة
    PLASTER_BOTANA_CEMENT_KG_PER_M3_SAND: 300,   // 6 شكاير للبطانة
    SACK_WEIGHT_KG: 50
  },
  THICKNESS: {
    PLASTER_WALL_METERS: 0.02,
    MORTAR_JOINT_METERS: 0.01
  },
  WASTE_FACTORS: {
    MORTAR: 1.10,   // 10% هدر خلط ومونة
    PLASTER: 1.15,  // 15% هدر محارة (Drop waste)
    PAINT: 1.10     // 10% هدر دهانات
  }
};

// دالة الحصر الهندسي للمباني والمونة
const calculatePreciseMasonry = (wallArea, wallThickness) => {
  const { LENGTH, HEIGHT, MORTAR_JOINT, WASTE_FACTOR } = ENG_CONSTANTS.BRICK;
  const effectiveLength = LENGTH + MORTAR_JOINT;
  const effectiveHeight = HEIGHT + MORTAR_JOINT;
  const bricksPerSqm = 1 / (effectiveLength * effectiveHeight);
  
  const bricksCount = Math.ceil(wallArea * bricksPerSqm * WASTE_FACTOR);
  const totalWallVolume = wallArea * wallThickness;
  const netBricksVolume = (bricksCount / WASTE_FACTOR) * (LENGTH * ENG_CONSTANTS.BRICK.WIDTH * HEIGHT);
  
  let mortarVolume = (totalWallVolume - netBricksVolume) * ENG_CONSTANTS.WASTE_FACTORS.MORTAR;
  if (mortarVolume < 0) mortarVolume = wallArea * 0.025; // Fallback لضمان حساب المونة التقديرية

  const sandCubicM = parseFloat(mortarVolume.toFixed(3));
  const cementBags = Math.ceil((mortarVolume * ENG_CONSTANTS.MIX_DESIGNS.BUILDING_CEMENT_KG_PER_M3_SAND) / ENG_CONSTANTS.MIX_DESIGNS.SACK_WEIGHT_KG);

  return { bricksCount, cementBags, sandCubicM };
};

// دالة الحصر الهندسي للمحارة
const calculatePrecisePlaster = (surfaceArea) => {
  const tratashaVol = surfaceArea * 0.005 * ENG_CONSTANTS.WASTE_FACTORS.PLASTER;
  const botanaVol = surfaceArea * ENG_CONSTANTS.THICKNESS.PLASTER_WALL_METERS * ENG_CONSTANTS.WASTE_FACTORS.PLASTER;

  const sandCubicM = parseFloat((tratashaVol + botanaVol).toFixed(3));
  const tratashaCement = (tratashaVol * ENG_CONSTANTS.MIX_DESIGNS.PLASTER_TRATASHA_CEMENT_KG_PER_M3_SAND) / ENG_CONSTANTS.MIX_DESIGNS.SACK_WEIGHT_KG;
  const botanaCement = (botanaVol * ENG_CONSTANTS.MIX_DESIGNS.PLASTER_BOTANA_CEMENT_KG_PER_M3_SAND) / ENG_CONSTANTS.MIX_DESIGNS.SACK_WEIGHT_KG;

  return { cementBags: Math.ceil(tratashaCement + botanaCement), sandCubicM };
};

// 1. التعديلات المعمارية والهدم
const estimateDemolitionAlteration = (data) => {
  const dims = data.dimensions;
  const scope = data.scope;
  const length = dims.linearMeters || dims.width || 3.0;
  const height = dims.height || 2.8;
  const wallArea = length * height;
  const wallThickness = 0.12;

  let laborHours = 0;
  let rubbleBagsCount = 0;
  let constructionMaterials = null;

  if (scope.requiresDemolition) {
    const vol = wallArea * wallThickness;
    laborHours += Math.ceil(vol * (scope.conditionSeverity === "high" ? 8.0 : 4.0));
    const expandedRubbleVol = vol * 1.4;
    rubbleBagsCount = Math.ceil(expandedRubbleVol * 33);
    
    if (scope.floorLevel > 1) {
      laborHours += Math.ceil(rubbleBagsCount * (scope.floorLevel * 0.06)); // زيادة زمنية للمشال اليدوي عبر السلالم
    }
  }

  if (scope.requiresBuilding) {
    const masonry = calculatePreciseMasonry(wallArea, wallThickness);
    const plaster = calculatePrecisePlaster(wallArea * 2); // محارة للوجهين
    
    constructionMaterials = {
      bricksCount: masonry.bricksCount,
      cementBags: masonry.cementBags + plaster.cementBags,
      sandCubicM: parseFloat((masonry.sandCubicM + plaster.sandCubicM).toFixed(3)),
      lintelsCount: scope.requiresLintels ? 1 : 0
    };
    laborHours += Math.ceil(wallArea / 1.2) + Math.ceil((wallArea * 2) / 2.0);
  }

  return { serviceType: "demolition_alteration", estimatedArea: wallArea, laborHours, rubbleBagsCount, materials: constructionMaterials, scope };
};

// 2. أعمال المباني والمحارة
const estimateMasonryBuilding = (data) => {
  const dims = data.dimensions;
  const scope = data.scope;
  const baseArea = dims.area || ((dims.width || 4.0) * (dims.length || 4.0));
  const height = dims.height || 2.8;
  const wallSurfaceArea = 2 * ((dims.width || 4.0) + (dims.length || 4.0)) * height;

  let bricksCount = 0;
  let cementBags = 0;
  let sandCubicM = 0;
  let laborHours = 0;

  if (scope.phase === "rough_in" || scope.phase === "full_overhaul") {
    const masonry = calculatePreciseMasonry(baseArea, 0.12);
    bricksCount = masonry.bricksCount;
    cementBags += masonry.cementBags;
    sandCubicM += masonry.sandCubicM;
    laborHours += Math.ceil(baseArea / 1.5);
  }

  const plaster = calculatePrecisePlaster(wallSurfaceArea);
  cementBags += plaster.cementBags;
  sandCubicM += plaster.sandCubicM;
  laborHours += Math.ceil(wallSurfaceArea / 2.2);

  return {
    serviceType: "masonry_building",
    estimatedArea: wallSurfaceArea,
    laborHours,
    materials: { bricksCount, cementBags, sandCubicM }
  };
};

// 3. أعمال النقاشة والدهانات
const estimatePainting = (data) => {
  const dims = data.dimensions;
  const scope = data.scope;
  const w = dims.width || 4.0;
  const l = dims.length || 4.0;
  const h = dims.height || 2.8;
  const totalArea = 2 * (w + l) * h;

  let sealerLiters = 0;
  let puttyKg = 0;
  let laborHours = Math.ceil(totalArea / 6.0);

  if (scope.requiresScrapingOrChasing) {
    laborHours += Math.ceil(totalArea / 4.0); // زيادة زمنية لقشط المعجون القديم والدهان التالف
  }

  if (scope.phase !== "finishing") {
    sealerLiters = Math.ceil(totalArea / 9.0 * ENG_CONSTANTS.WASTE_FACTORS.PAINT);
    const puttyCoats = scope.conditionSeverity === "high" ? 3 : 2;
    puttyKg = Math.ceil(totalArea * 1.2 * puttyCoats * ENG_CONSTANTS.WASTE_FACTORS.PAINT);
  }

  const finalPaintLiters = Math.ceil((totalArea * 2) / 7.0 * ENG_CONSTANTS.WASTE_FACTORS.PAINT);

  return {
    serviceType: "painting",
    estimatedArea: totalArea,
    sealerLiters,
    puttyKg,
    finalPaintLiters,
    laborHours
  };
};

// 4. أعمال السباكة
const estimatePlumbing = (data) => {
  const dims = data.dimensions;
  const scope = data.scope;
  const area = dims.area || 4.0;

  let laborHours = 16;
  let pipeLength = Math.ceil(area * 2.5);
  let insulationSqm = 0;

  if (scope.phase === "rough_in" || scope.phase === "full_overhaul") {
    laborHours = 24 + Math.ceil(area * 2);
    if (scope.requiresWaterproofing || scope.phase === "full_overhaul") {
      insulationSqm = area * 1.2; // احتساب ركوب رقبة الزجاجة على الجدران بمقدار 10 سم إلى 20 سم فلوت
    }
  } else {
    laborHours = 8; // تركيب الفينش النهائي والخلاطات والأجهزة
  }

  return {
    serviceType: "plumbing",
    estimatedArea: area,
    pipeLengthMeters: pipeLength,
    insulationSqm,
    fittingsCount: Math.ceil(pipeLength * 1.3),
    laborHours
  };
};

// 5. أعمال الكهرباء
const estimateElectrical = (data) => {
  const dims = data.dimensions;
  const scope = data.scope;
  const area = dims.area || ((dims.width || 4.0) * (dims.length || 4.0));
  
  // حصر تقديري للنقاط أو المآخذ الكهربائية (علب ماجيك) بناء على مساحة المسطح والطلب
  const pointsCount = Math.ceil(area * 0.7) + (scope.conditionSeverity === "high" ? 8 : 0);
  let laborHours = pointsCount * 2.0;

  if (scope.requiresScrapingOrChasing) {
    laborHours += pointsCount * 0.8; // تكسير مسارات الطوب أو الخرسانة بالصاروخ والشاكوش
  }

  return {
    serviceType: "electrical",
    estimatedArea: area,
    pointsCount,
    conduitMeters: Math.ceil(pointsCount * 3.5),
    wireMeters: Math.ceil(pointsCount * 12.0),
    laborHours
  };
};

// 6. أعمال النجارة المعمارية
const estimateCarpentry = (data) => {
  const dims = data.dimensions;
  const scope = data.scope;
  const quantity = dims.quantity || 1;

  let laborHours = quantity * 3.0;
  if (scope.phase === "full_overhaul") {
    laborHours += quantity * 2.0; // فك الأبواب القديمة وتجهيز الحوائط
  }

  return {
    serviceType: "carpentry",
    estimatedArea: quantity,
    doorQuantity: quantity,
    laborHours
  };
};

const ESTIMATION_RULES = {
  demolition_alteration: estimateDemolitionAlteration,
  masonry_building: estimateMasonryBuilding,
  painting: estimatePainting,
  plumbing: estimatePlumbing,
  electrical: estimateElectrical,
  carpentry: estimateCarpentry
};

const runEstimation = (serviceType, extractedData) => {
  const rule = ESTIMATION_RULES[serviceType];
  if (!rule) throw new AppError(`Unsupported service type: ${serviceType}`, 400);
  return rule(extractedData);
};

module.exports = { runEstimation };