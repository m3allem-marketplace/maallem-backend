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

  // Set default values if fields are missing in the schema
  const normalized = {
    isExtractionComplete: typeof data.isExtractionComplete === "boolean" ? data.isExtractionComplete : false,
    followUpMessage: typeof data.followUpMessage === "string" ? data.followUpMessage : "",
    serviceType: data.serviceType || serviceType,
    dimensions: data.dimensions || {},
    scope: data.scope || {}
  };

  // Ensure nested properties exist in dimensions
  normalized.dimensions = {
    width: typeof normalized.dimensions.width === "number" ? normalized.dimensions.width : null,
    length: typeof normalized.dimensions.length === "number" ? normalized.dimensions.length : null,
    height: typeof normalized.dimensions.height === "number" ? normalized.dimensions.height : null,
    area: typeof normalized.dimensions.area === "number" ? normalized.dimensions.area : null,
    ...normalized.dimensions
  };

  // Ensure nested properties exist in scope
  normalized.scope = {
    conditionSeverity: typeof normalized.scope.conditionSeverity === "string" ? normalized.scope.conditionSeverity : null,
    ...normalized.scope
  };

  normalized.fallbackUsed = false;
  return normalized;
};


const extractDataWithAI = async (serviceType, description) => {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gemini-2.5-flash",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ConversationalExtraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            isExtractionComplete: { type: "boolean" },
            followUpMessage: { type: "string" },
            serviceType: { 
              type: ["string", "null"],
              enum: ["demolition_alteration", "masonry_building", "painting", "plumbing", "electrical", "carpentry", null]
            },
            dimensions: {
              type: "object",
              properties: {
                width: { type: ["number", "null"] },
                length: { type: ["number", "null"] },
                height: { type: ["number", "null"] },
                area: { type: ["number", "null"] }
              },
              required: ["width", "length", "height", "area"],
              additionalProperties: false
            },
            scope: {
              type: "object",
              properties: {
                conditionSeverity: { 
                  type: ["string", "null"],
                  enum: ["low", "medium", "high", null]
                }
              },
              required: ["conditionSeverity"],
              additionalProperties: false
            }
          },
          required: ["isExtractionComplete", "followUpMessage", "serviceType", "dimensions", "scope"],
          additionalProperties: false
        }
      }
    },
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

const translateAndLocalizeResponse = (result, extractedData) => {
  const scope = extractedData.scope || {};
  const lang = extractedData.detectedLanguage === "en" ? "en" : "ar";
  
  const tradeMapAr = {
    demolition_alteration: "تعديلات معمارية وتكسير حوائط",
    masonry_building: "أعمال مباني الطوب والمحارة",
    painting: "أعمال النقاشة والدهانات الفاخرة",
    plumbing: "تأسيس وتشطيب شبكات السباكة وصرف صحي",
    electrical: "تأسيس سلك وعلب الشبكات الكهربائية",
    carpentry: "تركيب حلوق وأبواب خشبية نجارة"
  };

  const tradeMapEn = {
    demolition_alteration: "Architectural Alterations & Demolition",
    masonry_building: "Brickwork & Plastering",
    painting: "Premium Painting & Finishing",
    plumbing: "Plumbing & Drainage Networks",
    electrical: "Electrical Wiring & Networks",
    carpentry: "Carpentry & Wooden Doors"
  };

  const localizedMaterials = result.materials.map(item => {
    let nameAr = item.name;
    let summaryAr = `${item.quantity} ${item.unit}`;
    let nameEn = item.name;
    let summaryEn = `${item.quantity} ${item.unit}`;

    switch (item.sku) {
      case "SACK001":
        nameAr = "شكاير تعبئة وإزالة ردم ومخلفات تكسير موقعي"; summaryAr = `حوالي ${item.quantity} شكارة ردم مخلفات`;
        nameEn = "Rubble removal sacks"; summaryEn = `~${item.quantity} sacks`;
        break;
      case "BRK001":
        nameAr = "طوب أحمر طفلي ضرب سفرة قياسي (25×12×6 سم)"; summaryAr = `${item.quantity} قالب طوب أحمر`;
        nameEn = "Standard red clay bricks (25x12x6 cm)"; summaryEn = `${item.quantity} bricks`;
        break;
      case "CEM001":
        nameAr = "أسمنت بورتلاندي عادي معتمد (رتبة 42.5 ن)"; summaryAr = `${item.quantity} شكارة أسمنت (وزن 50 كجم)`;
        nameEn = "Ordinary Portland Cement (42.5N)"; summaryEn = `${item.quantity} bags (50kg)`;
        break;
      case "SND001":
        nameAr = "رمل حرش نظيف مغسول خالٍ من الشوائب والطفلة"; summaryAr = `${item.quantity} متر مكعب رمل توريد موقعي`;
        nameEn = "Clean washed sand"; summaryEn = `${item.quantity} cubic meters`;
        break;
      case "LNT001":
        nameAr = "عتب خرساني مسلح جاهز لفتحات الأبواب والشبابيك"; summaryAr = `${item.quantity} عتب خرساني جاهز`;
        nameEn = "Precast reinforced concrete lintel"; summaryEn = `${item.quantity} lintels`;
        break;
      case "MESH001":
        nameAr = "شريط سلك شبك فيبر مجلفن فاصل لمنع التنميل والشروخ بين الطوب والخرسانة"; summaryAr = `${item.quantity} متر طولي سلك شبك`;
        nameEn = "Fiberglass mesh tape for crack prevention"; summaryEn = `${item.quantity} linear meters`;
        break;
      case "PAINT001":
        nameAr = "دهان بلاستيك داخلي أكريليك مطفي عالي التغطية قابل للغسيل"; summaryAr = `حوالي ${item.quantity} لتر دهان بلاستيك جاهز`;
        nameEn = "Premium matte acrylic interior paint"; summaryEn = `~${item.quantity} liters`;
        break;
      case "PUTTY001":
        nameAr = "شكاير معجون حوائط جاهز داخلي ممتاز للتأسيس"; summaryAr = `${item.quantity} شكارة معجون حوائط`;
        nameEn = "Premium interior wall putty"; summaryEn = `${item.quantity} bags`;
        break;
      case "BOX001":
        nameAr = "علب كهرباء بلاستيك نوع ماجيك دفن داخل الجدار"; summaryAr = `${item.quantity} علبة ماجيك جدارية`;
        nameEn = "Magic plastic electrical back boxes"; summaryEn = `${item.quantity} boxes`;
        break;
      case "COND001":
        nameAr = "خراطيم سوستة مرنة بلاستيك لتمرير وسحب الأسلاك الكهربائية"; summaryAr = `${item.quantity} متر خراطيم تمرير سلك`;
        nameEn = "Flexible corrugated plastic conduits"; summaryEn = `${item.quantity} meters`;
        break;
      case "SUND001":
        nameAr = "إكسسوارات ومستهلكات تركيب نثرية (مسامير/شكرتون/غراء/كانات ربط)"; summaryAr = "مقطوعية شاملة مستهلكات التركيب الفنية مجاناً";
        nameEn = "Installation accessories (screws/tape/glue)"; summaryEn = "Lump sum including accessories";
        break;
    }

    return {
      sku: item.sku,
      name: lang === "en" ? nameEn : nameAr,
      readableSummary: lang === "en" ? summaryEn : summaryAr,
      nameAr,
      readableSummaryAr: summaryAr,
      quantity: item.quantity,
      unit: item.unit
    };
  });

  let commentaryAr = `بناءً على الفحص والتحليل الهندسي لطلبك في بند (${tradeMapAr[result.serviceType]})، تم احتساب الكميات بدقة المقايسات الفنية للمشروعات الشاملة للمهندسين والمقاولين التابعين للمنصة:`;
  let commentaryEn = `Based on the engineering analysis of your request for (${tradeMapEn[result.serviceType]}), quantities have been accurately calculated according to the comprehensive technical standards used by platform engineers and contractors:`;
  
  if (scope.floorLevel > 1) {
    commentaryAr += ` تم مراعاة زيادة مجهود وساعات العمل لمصنعية العمال للتشوين ونقل وتنزيل الردم والأنقاض يدوياً عبر السلالم نظراً لتواجد الأعمال في الدور (${scope.floorLevel}).`;
    commentaryEn += ` Additional labor effort for manual hauling and debris removal via stairs has been considered due to the work being on floor (${scope.floorLevel}).`;
  }
  if (scope.requiresDemolition && scope.requiresBuilding) {
    commentaryAr += ` المقايسة تغطي بالكامل تكسير الحوائط القديمة وإعادة تغيير السعة المعمارية والمساحات مع بناء القواطيع الجديدة شاملة صب العتب الخرساني وتركيب سلك شبك الفيبر الفاصل لضمان عدم حدوث شروخ أو تنميل في المحارة مستقبلاً.`;
    commentaryEn += ` The estimate fully covers demolishing old walls, changing architectural layouts, and building new partitions, including casting concrete lintels and installing fiberglass mesh to prevent future plaster cracks.`;
  }
  if (scope.conditionSeverity === "high" && result.serviceType === "painting") {
    commentaryAr += ` تم إدراج بنود قشط الدهانات التالفة القديمة ومعالجة رطوبة الجدران وتأسيس ٣ سكاكين معجون لضمان استواء السطح تماماً قبل تضريب الوش النهائي.`;
    commentaryEn += ` Items for scraping old damaged paint, treating wall moisture, and applying 3 coats of putty have been included to ensure a perfectly level surface before final painting.`;
  }

  if (extractedData.fallbackUsed) {
    commentaryAr += ` تم استخدام مقاسات افتراضية قياسية لعدم تحديد الأبعاد في الطلب (مثال: أبعاد الغرفة 4×4م بارتفاع 2.8م). يمكنك تحديد المقاسات الفعلية لتعديل المقايسة.`;
    commentaryEn += ` Standard default dimensions were applied because specific measurements were not provided (e.g., room size 4x4m, height 2.8m). You can write the actual dimensions in the description to refine the estimate.`;
  }

  return {
    ...result,
    fallbackUsed: extractedData.fallbackUsed,
    detectedLanguage: lang,
    tradeName: lang === "en" ? tradeMapEn[result.serviceType] : tradeMapAr[result.serviceType],
    executionCommentary: lang === "en" ? commentaryEn : commentaryAr,
    tradeNameAr: tradeMapAr[result.serviceType],
    executionCommentaryAr: commentaryAr,
    materials: localizedMaterials
  };
};

const analyzeAndEstimate = async ({ serviceType, description, userId = null }) => {
  const extractedData = await extractDataWithAI(serviceType, description);

  // If extraction is NOT complete, bypass the estimation logic and return slot filling response
  if (!extractedData.isExtractionComplete) {
    const tradeMapAr = {
      demolition_alteration: "تعديلات معمارية وتكسير حوائط",
      masonry_building: "أعمال مباني الطوب والمحارة",
      painting: "أعمال النقاشة والدهانات الفاخرة",
      plumbing: "تأسيس وتشطيب شبكات السباكة وصرف صحي",
      electrical: "تأسيس سلك وعلب الشبكات الكهربائية",
      carpentry: "تركيب حلوق وأبواب خشبية نجارة"
    };

    const result = {
      isExtractionComplete: false,
      followUpMessage: extractedData.followUpMessage,
      serviceType: extractedData.serviceType,
      dimensions: extractedData.dimensions,
      scope: extractedData.scope,
      estimatedArea: 0,
      laborHours: 0,
      materials: [],
      tradeName: extractedData.serviceType ? tradeMapAr[extractedData.serviceType] : "غير محدد",
      executionCommentary: extractedData.followUpMessage,
      fallbackUsed: false
    };

    // Save conversational step to DB
    await AiEstimation.create({
      user: userId,
      serviceType,
      description,
      extractedData,
      estimation: {},
      boq: { materials: [] },
      result,
    });

    return result;
  }

  // Otherwise, the extraction is complete! Run the calculations as usual
  const estimation = runEstimation(serviceType, extractedData);
  const boq = generateBoq(estimation);

  let result = {
    isExtractionComplete: true,
    followUpMessage: extractedData.followUpMessage,
    serviceType: estimation.serviceType,
    estimatedArea: estimation.estimatedArea,
    laborHours: estimation.laborHours,
    materials: boq.materials,
  };

  result = translateAndLocalizeResponse(result, extractedData);

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