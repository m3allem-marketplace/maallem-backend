const AppError = require("../../utils/AppError");

// إضافة نثريات ومستهلكات تركيب ثابتة وصغيرة (شريط لحام، غراء مواسير، مسامير، كانات) لكل فئة
const addSundries = (materialsList, category) => {
  const sundryItem = {
    sku: "SUND001",
    name: `Miscellaneous Installation Accessories (نثريات ومستهلكات تركيب وصغار مواد لـ ${category})`,
    quantity: 1,
    unit: "lump_sum"
  };
  materialsList.push(sundryItem);
  return materialsList;
};

const buildDemolitionAlterationBoq = (est) => {
  let materials = [];
  if (est.rubbleBagsCount > 0) {
    materials.push({ sku: "SACK001", name: "Heavy-Duty Rubble Disposal Sacks (شكاير خيش سميكة لتعبئة ونقل الردم)", quantity: est.rubbleBagsCount, unit: "piece" });
  }
  if (est.materials) {
    materials.push(
      { sku: "BRK001", name: "Solid Red Clay Bricks 25x12x6cm (طوب أحمر طفلي ضرب سفرة معتمد)", quantity: est.materials.bricksCount, unit: "piece" },
      { sku: "CEM001", name: "Ordinary Portland Cement 42.5 (أسمنت بورتلاندي عادي معتمد)", quantity: est.materials.cementBags, unit: "bag" },
      { sku: "SND001", name: "Screened Construction Sand (رمل حرش مغسول خالٍ من الطفلة والأملاح)", quantity: est.materials.sandCubicM, unit: "cubic_meter" }
    );
    if (est.materials.lintelsCount > 0) {
      materials.push({ sku: "LNT001", name: "Precast Reinforced Concrete Lintel (عتب خرساني مسلح جاهز لتأمين الفتحات)", quantity: est.materials.lintelsCount, unit: "piece" });
    }
  }
  return { materials: addSundries(materials, "التعديلات المعمارية") };
};

const buildMasonryBoq = (est) => {
  let materials = [
    { sku: "BRK001", name: "Solid Red Clay Bricks 25x12x6cm (طوب أحمر طفلي للمباني)", quantity: est.materials.bricksCount, unit: "piece" },
    { sku: "CEM001", name: "Ordinary Portland Cement 42.5 (أسمنت حوائط ومحارة)", quantity: est.materials.cementBags, unit: "bag" },
    { sku: "SND001", name: "Screened Construction Sand (رمل المحارة والمباني)", quantity: est.materials.sandCubicM, unit: "cubic_meter" }
  ].filter(m => m.quantity > 0);

  // إدراج سلك شبك ممدد لمنع شروخ فاصل المباني بالخرسانة تلقائياً للحوائط
  materials.push({ sku: "MESH001", name: "Expanded Metal Plaster Mesh (سلك شبك فيبر مجلفن لمنع شروخ المحارة)", quantity: Math.ceil(est.estimatedArea * 0.15), unit: "meter" });

  return { materials: addSundries(materials, "المباني والمحارة") };
};

const buildPaintingBoq = (est) => {
  let materials = [
    { sku: "PAINT001", name: "Premium Acrylic Interior Flat Paint (دهان بلاستيك داخلي مطفي فاخر)", quantity: est.finalPaintLiters, unit: "liter" }
  ];
  if (est.sealerLiters > 0) materials.push({ sku: "SEAL001", name: "Acrylic Wall Primer Sealer (سيلر حوائط أساس مائي مقاوم للرطوبة)", quantity: est.sealerLiters, unit: "liter" });
  if (est.puttyKg > 0) materials.push({ sku: "PUTTY001", name: "Interior Wall Ready-Mix Putty (معجون حوائط جاهز للتأسيس)", quantity: Math.ceil(est.puttyKg / 15), unit: "bag" }); // شكاير وزن 15 كجم

  return { materials: addSundries(materials, "النقاشة والدهانات") };
};

const buildPlumbingBoq = (est) => {
  let materials = [
    { sku: "PIPE001", name: "PPR Polypropylene Pipes PN20 (مواسير تغذية مياه خضراء رتبة ضغط 20)", quantity: est.pipeLengthMeters, unit: "meter" },
    { sku: "FIT001", name: "PPR Polypropylene Welding Fittings Set (طقم قطع ولحام مواسير التغذية كوع/تي/جلبه)", quantity: est.fittingsCount, unit: "set" }
  ];
  if (est.insulationSqm > 0) {
    materials.push({ sku: "INS001", name: "Elastic Cementitious Waterproofing Insulation (عزل كيميائي مرن عازل للمياه لحماية الأرضيات)", quantity: Math.ceil(est.insulationSqm / 5), unit: "pack" });
  }
  return { materials: addSundries(materials, "التأسيسات الصحية والسباكة") };
};

const buildElectricalBoq = (est) => {
  let materials = [
    { sku: "BOX001", name: "Plastic Magic Flush Wall Box (علب كهرباء ماجيك بلاستيك دفن في الحائط)", quantity: est.pointsCount, unit: "piece" },
    { sku: "COND001", name: "Flexible PVC Conduits Tube (خراطيم كهرباء سوستة مرنة لحماية الأسلاك)", quantity: est.conduitMeters, unit: "meter" },
    { sku: "WIRE001", name: "Single-Core Insulated Copper Wire 2mm (لفات سلك نحاس معزول للسحب رتبة 2 مم)", quantity: Math.ceil(est.wireMeters / 100), unit: "coil" }
  ];
  return { materials: addSundries(materials, "التأسيسات الكهربائية") };
};

const buildCarpentryBoq = (est) => {
  let materials = [
    { sku: "FRAME001", name: "Swedish Wood Door Subframe (حلق باب خشبي خشب موسكي قياسي جاهز)", quantity: est.doorQuantity, unit: "piece" },
    { sku: "FOAM001", name: "Polyurethane Expanding Fixing Foam Can (اسبراي فوم بولي يوريثان لتثبيت وحشو الحلوق)", quantity: est.doorQuantity * 2, unit: "piece" }
  ];
  return { materials: addSundries(materials, "النجارة المعمارية") };
};

const BOQ_BUILDERS = {
  demolition_alteration: buildDemolitionAlterationBoq,
  masonry_building: buildMasonryBoq,
  painting: buildPaintingBoq,
  plumbing: buildPlumbingBoq,
  electrical: buildElectricalBoq,
  carpentry: buildCarpentryBoq
};

const generateBoq = (estimation) => {
  const builder = BOQ_BUILDERS[estimation.serviceType];
  if (!builder) throw new AppError(`Cannot generate BOQ for service type: ${estimation.serviceType}`, 400);
  return builder(estimation);
};

module.exports = { generateBoq };