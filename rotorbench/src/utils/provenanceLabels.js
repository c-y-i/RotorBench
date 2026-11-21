const provenanceFieldLabels = {
  batteryDeckDimensionsMm: "battery deck footprint",
  currentDraw: "current draw",
  dimensionsMm: "dimensions",
  dischargeProfile: "discharge curve",
  mountingPatternMm: "mounting pattern",
  mountingPoint: "mounting offset",
  mounting_point: "mounting offset",
  propShaftMm: "prop shaft diameter",
  stackHeight: "stack height",
  stackMountPatternsMm: "stack mount pattern",
};

export function humanizeProvenanceField(field) {
  if (field == null) return "";
  const value = String(field).trim();
  if (!value) return "";
  if (provenanceFieldLabels[value]) return provenanceFieldLabels[value];
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function humanizeProvenanceFields(fields) {
  return (Array.isArray(fields) ? fields : [])
    .map(humanizeProvenanceField)
    .filter(Boolean);
}
