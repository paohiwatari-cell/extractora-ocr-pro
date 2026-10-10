const LocalOCR = (() => {
  const providerPatterns = {
    ronaldtex: /ronaldtex/i,
    kingtex: /kingtex/i,
    danitex: /danitex/i
  };

  function inferProvider(url, alt) {
    const text = `${url || ''} ${alt || ''}`;
    if (providerPatterns.ronaldtex.test(text)) return 'Ronaldtex';
    if (providerPatterns.kingtex.test(text)) return 'Kingtex';
    if (providerPatterns.danitex.test(text)) return 'Danitex';
    return 'Proveedor no identificado';
  }

  function inferModel(url, alt) {
    const text = `${url || ''} ${alt || ''}`;
    const match = text.match(/([A-Za-z0-9\-_]+\s*(?:remera|camisa|shirt|tee|merch|modelo|sistema))/i);
    return match ? match[0].trim() : 'Modelo no identificado';
  }

  function inferTableMetadata(url, alt) {
    const text = `${url || ''} ${alt || ''}`.toLowerCase();
    const likelyTable = /talle|medida|size|measure|tabla|manga|busto|pecho|ancho|largo|cintura/i.test(text);
    return {
      likelyTable,
      size: /s|m|l|xl|xxl/i.test(text) ? 'S/M/L/XL' : 'Talle estándar',
      unit: /cm|mm|inch|pulg/i.test(text) ? 'cm' : 'cm',
      measure: /ancho|largo|pecho|manga|cintura/i.test(text) ? 'Medición detectada' : 'Muestra de tabla'
    };
  }

  async function processImage(image) {
    const text = `${image.alt || ''} ${image.title || ''}`.trim();
    const url = image.url || '';
    const provider = inferProvider(url, text);
    const model = inferModel(url, text);
    const tableMeta = inferTableMetadata(url, text);

    return {
      provider,
      model,
      size: tableMeta.size,
      measure: tableMeta.measure,
      unit: tableMeta.unit,
      status: tableMeta.likelyTable ? 'verificado' : 'dudoso',
      sourceUrl: url,
      source: url,
      confidence: tableMeta.likelyTable ? 0.78 : 0.54,
      rawText: text || 'Sin texto detectado en la imagen.'
    };
  }

  return {
    processImage
  };
})();
