const AppError = require("../../utils/AppError");

const PAINT_COVERAGE_SQM_PER_LITER = 6.75;
const PAINT_LABOR_SQM_PER_HOUR = 6.75;
const CERAMIC_WASTE_FACTOR = 1.1;
const CERAMIC_LABOR_SQM_PER_HOUR = 3;
const PLUMBING_BASE_HOURS = 4;
const PLUMBING_HOURS_PER_SQM = 0.5;

const assertPositive = (value, fieldName) => {
  if (typeof value !== "number" || value <= 0 || Number.isNaN(value)) {
    throw new AppError(`${fieldName} must be a positive number`, 422);
  }
};

const estimatePainting = (data) => {
  assertPositive(data.width, "width");
  assertPositive(data.length, "length");
  assertPositive(data.height, "height");

  const wallArea = 2 * (data.width + data.length) * data.height;
  const paintQuantity = Math.ceil(wallArea / PAINT_COVERAGE_SQM_PER_LITER);
  const laborHours = Math.ceil(wallArea / PAINT_LABOR_SQM_PER_HOUR);

  return {
    serviceType: "painting",
    estimatedArea: wallArea,
    wallArea,
    paintQuantity,
    laborHours,
    dimensions: {
      width: data.width,
      length: data.length,
      height: data.height,
    },
  };
};

const estimateCeramic = (data) => {
  assertPositive(data.width, "width");
  assertPositive(data.length, "length");

  const floorArea = data.width * data.length;
  const tilesQuantity = Math.ceil(floorArea * CERAMIC_WASTE_FACTOR);
  const laborHours = Math.ceil(floorArea / CERAMIC_LABOR_SQM_PER_HOUR);

  return {
    serviceType: "ceramic",
    estimatedArea: floorArea,
    floorArea,
    tilesQuantity,
    laborHours,
    dimensions: {
      width: data.width,
      length: data.length,
    },
  };
};

const estimatePlumbing = (data) => {
  assertPositive(data.area, "area");

  const laborHours = Math.ceil(PLUMBING_BASE_HOURS + data.area * PLUMBING_HOURS_PER_SQM);
  const pipeLength = Math.ceil(data.area * 2);
  const fittingsCount = Math.max(4, Math.ceil(data.area / 2));

  return {
    serviceType: "plumbing",
    estimatedArea: data.area,
    pipeLength,
    fittingsCount,
    laborHours,
  };
};

const ESTIMATION_RULES = {
  painting: estimatePainting,
  ceramic: estimateCeramic,
  plumbing: estimatePlumbing,
};

const runEstimation = (serviceType, extractedData) => {
  const rule = ESTIMATION_RULES[serviceType];
  if (!rule) {
    throw new AppError(`Unsupported service type: ${serviceType}`, 400);
  }

  return rule(extractedData);
};

module.exports = {
  runEstimation,
  ESTIMATION_RULES,
};
