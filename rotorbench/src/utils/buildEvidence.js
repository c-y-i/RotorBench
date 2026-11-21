import {
  getCatalogModelEntry,
  hasCatalogModel,
} from "./modelAssets";

const CATEGORY_LABELS = {
  frame: "Frame",
  motor: "Motors",
  propeller: "Propellers",
  battery: "Battery",
  esc: "ESC",
  flightController: "Flight controller",
  receiver: "Receiver",
};

const CATEGORY_KEYS = {
  frame: "frames",
  motor: "motors",
  propeller: "propellers",
  battery: "batteries",
  esc: "escs",
  flightController: "flight_controllers",
  receiver: "receivers",
};

export function getSelectedPartEvidence(assemblySpec = {}) {
  return Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => {
      const part = assemblySpec[key];
      if (!part) return null;
      const estimatedFields = Array.isArray(part.estimatedFields)
        ? part.estimatedFields
        : [];
      const measuredFields = Array.isArray(part.measuredFields)
        ? part.measuredFields
        : [];
      const remainingEstimatedFields = estimatedFields.filter(
        (field) => !measuredFields.includes(field),
      );
      const category = CATEGORY_KEYS[key];
      const modelAvailable = hasCatalogModel(part, category);
      const modelEntry = getCatalogModelEntry(part, category);
      return {
        key,
        label,
        id: part.id,
        name: part.name,
        sourceUrl: part.sourceUrl || null,
        priceSourceUrl: part.priceSourceUrl || null,
        connectorSourceUrl: part.connectorSourceUrl || null,
        estimatedFields: remainingEstimatedFields,
        measuredFields,
        modelStatus: modelAvailable ? "available" : "not_available",
        modelContractStatus: modelEntry?.contractStatus || null,
        sourceBacked: Boolean(part.sourceUrl),
        geometryFallback: !modelAvailable,
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
    measuredFieldCount: parts.reduce(
      (total, part) => total + part.measuredFields.length,
      0,
    ),
    geometryFallbackCount: parts.filter((part) => part.geometryFallback).length,
    legacyUnsupportedCount: parts.filter((part) => !part.sourceBacked).length,
  };
}
