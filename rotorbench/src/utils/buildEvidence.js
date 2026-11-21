const CATEGORY_LABELS = {
  frame: "Frame",
  motor: "Motors",
  propeller: "Propellers",
  battery: "Battery",
  esc: "ESC",
  flightController: "Flight controller",
  receiver: "Receiver",
};

export function getSelectedPartEvidence(assemblySpec = {}) {
  return Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => {
      const part = assemblySpec[key];
      if (!part) return null;
      const estimatedFields = Array.isArray(part.estimatedFields)
        ? part.estimatedFields
        : [];
      return {
        key,
        label,
        id: part.id,
        name: part.name,
        sourceUrl: part.sourceUrl || null,
        priceSourceUrl: part.priceSourceUrl || null,
        connectorSourceUrl: part.connectorSourceUrl || null,
        estimatedFields,
        modelStatus: part.modelStatus || null,
        sourceBacked: Boolean(part.sourceUrl),
        geometryFallback: part.modelStatus === "not_available",
      };
    })
    .filter(Boolean);
}

export function summarizeBuildEvidence(assemblySpec = {}) {
  const parts = getSelectedPartEvidence(assemblySpec);
  return {
    parts,
    selectedCount: parts.length,
    sourceBackedCount: parts.filter((part) => part.sourceBacked).length,
    estimatedPartCount: parts.filter((part) => part.estimatedFields.length > 0).length,
    estimatedFieldCount: parts.reduce(
      (total, part) => total + part.estimatedFields.length,
      0,
    ),
    geometryFallbackCount: parts.filter((part) => part.geometryFallback).length,
    legacyUnsupportedCount: parts.filter((part) => !part.sourceBacked).length,
  };
}
