// أضف هذه الدالة للملف لتوليد الرد الإنساني وصياغته هندسياً قبل تسليم البيانات للمستخدم
const translateAndLocalizeResponseAr = (result, extractedData) => {
  const scope = extractedData.scope || {};
  
  const tradeMapAr = {
    demolition_alteration: "تعديلات معمارية وتكسير حوائط",
    masonry_building: "أعمال مباني الطوب والمحارة",
    painting: "أعمال النقاشة والدهانات الفاخرة",
    plumbing: "تأسيس وتشطيب شبكات السباكة وصرف صحي",
    electrical: "تأسيس سلك وعلب الشبكات الكهربائية",
    carpentry: "تركيب حلوق وأبواب خشبية نجارة"
  };

  const localizedMaterials = result.materials.map(item => {
    let nameAr = item.name;
    let summaryAr = `${item.quantity} ${item.unit}`;

    switch (item.sku) {
      case "SACK001":
        nameAr = "شكاير تعبئة وإزالة ردم ومخلفات تكسير موقعي";
        summaryAr = `حوالي ${item.quantity} شكارة ردم مخلفات`;
        break;
      case "BRK001":
        nameAr = "طوب أحمر طفلي ضرب سفرة قياسي (25×12×6 سم)";
        summaryAr = `${item.quantity} قالب طوب أحمر`;
        break;
      case "CEM001":
        nameAr = "أسمنت بورتلاندي عادي معتمد (رتبة 42.5 ن)";
        summaryAr = `${item.quantity} شكارة أسمنت (وزن 50 كجم)`;
        break;
      case "SND001":
        nameAr = "رمل حرش نظيف مغسول خالٍ من الشوائب والطفلة";
        summaryAr = `${item.quantity} متر مكعب رمل توريد موقعي`;
        break;
      case "LNT001":
        nameAr = "عتب خرساني مسلح جاهز لفتحات الأبواب والشبابيك";
        summaryAr = `${item.quantity} عتب خرساني جاهز`;
        break;
      case "MESH001":
        nameAr = "شريط سلك شبك فيبر مجلفن فاصل لمنع التنميل والشروخ بين الطوب والخرسانة";
        summaryAr = `${item.quantity} متر طولي سلك شبك`;
        break;
      case "PAINT001":
        nameAr = "دهان بلاستيك داخلي أكريليك مطفي عالي التغطية قابل للغسيل";
        summaryAr = `حوالي ${item.quantity} لتر دهان بلاستيك جاهز`;
        break;
      case "PUTTY001":
        nameAr = "شكاير معجون حوائط جاهز داخلي ممتاز للتأسيس";
        summaryAr = `${item.quantity} شكارة معجون حوائط`;
        break;
      case "BOX001":
        nameAr = "علب كهرباء بلاستيك نوع ماجيك دفن داخل الجدار";
        summaryAr = `${item.quantity} علبة ماجيك جدارية`;
        break;
      case "COND001":
        nameAr = "خراطيم سوستة مرنة بلاستيك لتمرير وسحب الأسلاك الكهربائية";
        summaryAr = `${item.quantity} متر خراطيم تمرير سلك`;
        break;
      case "SUND001":
        nameAr = "إكسسوارات ومستهلكات تركيب نثرية (مسامير/شكرتون/غراء/كانات ربط)";
        summaryAr = "مقطوعية شاملة مستهلكات التركيب الفنية مجاناً";
        break;
    }

    return {
      sku: item.sku,
      nameAr,
      readableSummaryAr: summaryAr,
      quantity: item.quantity,
      unit: item.unit
    };
  });

  // صياغة تقرير هندسي مخصص يعكس ذكاء الـ AI للمستخدم النهائي
  let commentary = `بناءً على الفحص والتحليل الهندسي لطلبك في بند (${tradeMapAr[result.serviceType]})، تم احتساب الكميات بدقة المقايسات الفنية للمشروعات الشاملة للمهندسين والمقاولين التابعين للمنصة:`;
  
  if (scope.floorLevel > 1) {
    commentary += ` تم مراعاة زيادة مجهود وساعات العمل لمصنعية العمال للتشوين ونقل وتنزيل الردم والأنقاض يدوياً عبر السلالم نظراً لتواجد الأعمال في الدور (${scope.floorLevel}).`;
  }
  if (scope.requiresDemolition && scope.requiresBuilding) {
    commentary += ` المقايسة تغطي بالكامل تكسير الحوائط القديمة وإعادة تغيير السعة المعمارية والمساحات مع بناء القواطيع الجديدة شاملة صب العتب الخرساني وتركيب سلك شبك الفيبر الفاصل لضمان عدم حدوث شروخ أو تنميل في المحارة مستقبلاً.`;
  }
  if (scope.conditionSeverity === "high" && result.serviceType === "painting") {
    commentary += ` تم إدراج بنود قشط الدهانات التالفة القديمة ومعالجة رطوبة الجدران وتأسيس ٣ سكاكين معجون لضمان استواء السطح تماماً قبل تضريب الوش النهائي.`;
  }

  return {
    tradeNameAr: tradeMapAr[result.serviceType],
    executionCommentaryAr: commentary,
    estimatedArea: result.estimatedArea,
    laborHours: result.laborHours,
    materials: localizedMaterials
  };
};