const OpenAI = require("openai");
const { OPENAI_API_KEY } = require("../../config/env");
const WorkerProfile = require("../profiles/worker.model");
const AppError = require("../../utils/AppError");

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

const analyzeStoryAndRecommend = async ({ story }) => {
  const client = getOpenAIClient();

  // 1. Analyze the story using Gemini (OpenAI compatibility mode)
  const systemPrompt = `You are an expert platform assistant for a construction and maintenance services platform in Egypt.
Your task is to read the user's story or problem description and figure out:
1. The type of service required. It MUST be one of the following exact string values: "demolition_alteration", "masonry_building", "painting", "plumbing", "electrical", "carpentry".
2. The city mentioned by the user (if any). If no city is mentioned, return null.
3. A brief explanation in Arabic explaining why this service was chosen and a welcoming message telling the user we will find the best workers for them.`;

  const completion = await client.chat.completions.create({
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: story },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "WorkerRecommendationAnalysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            serviceType: {
              type: ["string", "null"],
              enum: ["demolition_alteration", "masonry_building", "painting", "plumbing", "electrical", "carpentry", null]
            },
            city: {
              type: ["string", "null"]
            },
            reasonAr: {
              type: "string"
            }
          },
          required: ["serviceType", "city", "reasonAr"],
          additionalProperties: false
        }
      }
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new AppError("Empty response from AI", 502);
  }

  const aiResult = JSON.parse(content);

  const { serviceType, city, reasonAr } = aiResult;

  // 2. Query the database for suitable workers based on serviceType and optionally city
  const query = {
    specializations: serviceType,
  };

  if (city) {
    // If a city is detected, try to match it via regex (since city strings might vary slightly)
    query["location.city"] = { $regex: new RegExp(city, "i") };
  }

  // Find workers and populate user details (name, etc.)
  const recommendedWorkers = await WorkerProfile.find(query)
    .populate("user", "name email phone role")
    .limit(10) // Limit to top 10 for now
    .lean();

  // If no workers found in the specific city, fallback to searching just by specialization
  let finalWorkers = recommendedWorkers;
  if (finalWorkers.length === 0 && city) {
    const fallbackQuery = { specializations: serviceType };
    finalWorkers = await WorkerProfile.find(fallbackQuery)
      .populate("user", "name email phone role")
      .limit(10)
      .lean();
  }

  return {
    analysis: {
      detectedService: serviceType,
      detectedCity: city,
      messageAr: reasonAr,
    },
    recommendations: finalWorkers,
  };
};

module.exports = {
  analyzeStoryAndRecommend,
};