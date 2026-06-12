const OpenAI = require("openai");
const { AiEstimation } = require("./ai.model");
const { OPENAI_API_KEY } = require("../../config/env");
const AppError = require("../../utils/AppError");
const {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} = require("./prompts");
const { runEstimation } = require("./estimation.service");
const { generateBoq } = require("./boq.service");
const { calculatePricing } = require("./pricing.service");

let openaiClient = null;

const getOpenAIClient = () => {
  if (!OPENAI_API_KEY) {
    throw new AppError("OpenAI API key is not configured", 500);
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
  }
  return openaiClient;
};

const parseJsonResponse = (content) => {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AppError("Failed to parse AI response as JSON", 502);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new AppError("Invalid JSON returned from AI", 502);
  }
};

const validateExtractedData = (serviceType, data) => {
  if (!data || typeof data !== "object") {
    throw new AppError("AI returned invalid extraction data", 502);
  }

  if (data.serviceType && data.serviceType !== serviceType) {
    throw new AppError("AI extracted serviceType does not match request", 502);
  }

  const normalized = { ...data, serviceType };

  if (serviceType === "painting") {
    if (!normalized.width || !normalized.length || !normalized.height) {
      throw new AppError(
        "Could not extract room dimensions (width, length, height) from description",
        422,
      );
    }
  } else if (serviceType === "ceramic") {
    if (!normalized.width || !normalized.length) {
      throw new AppError(
        "Could not extract room dimensions (width, length) from description",
        422,
      );
    }
  } else if (serviceType === "plumbing") {
    if (!normalized.area) {
      throw new AppError("Could not extract bathroom area from description", 422);
    }
  }

  return normalized;
};

const extractDataWithAI = async (serviceType, description) => {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gemini-2.5-flash",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: buildExtractionUserPrompt(serviceType, description) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new AppError("Empty response from AI", 502);
  }

  const parsed = parseJsonResponse(content);
  return validateExtractedData(serviceType, parsed);
};

const analyzeAndEstimate = async ({ serviceType, description, userId = null }) => {
  const extractedData = await extractDataWithAI(serviceType, description);
  const estimation = runEstimation(serviceType, extractedData);
  const boq = generateBoq(estimation);
  const pricing = await calculatePricing(boq, estimation.laborHours);

  const result = {
    serviceType: estimation.serviceType,
    estimatedArea: estimation.estimatedArea,
    laborHours: estimation.laborHours,
    materials: pricing.materials,
    materialsTotal: pricing.materialsTotal,
    laborCost: pricing.laborCost,
    platformFee: pricing.platformFee,
    grandTotal: pricing.grandTotal,
  };

  await AiEstimation.create({
    user: userId,
    serviceType,
    description,
    extractedData,
    estimation,
    boq,
    result,
  });

  return result;
};

module.exports = {
  analyzeAndEstimate,
  extractDataWithAI,
};
