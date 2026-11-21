import API_BASE from "../config/api";
import componentsData from "../data/components.json";

export const MODEL_MANIFEST = componentsData.modelManifest;

export function createModelConversionUrl(category, filename, apiBase = API_BASE) {
  if (!category || !filename) return null;
  return `${apiBase}/api/models/convert/${category}/${encodeURIComponent(filename)}?format=glb`;
}

export function getCatalogModelEntry(part, category, catalog = componentsData) {
  if (!part?.id) return null;
  const manifestEntry = catalog.modelManifest?.assets?.[category]?.[part.id];
  if (manifestEntry) return manifestEntry;
  if (category === "propellers" && part.modelCW && part.modelCCW) {
    return {
      cw: part.modelCW,
      ccw: part.modelCCW,
      contractStatus: part.modelContractStatus || "unverified",
    };
  }
  if (part.modelStatus === "available" && part.model) {
    return {
      glb: part.model,
      contractStatus: part.modelContractStatus || "unverified",
    };
  }
  return null;
}

export function hasCatalogModel(part, category, catalog = componentsData) {
  const entry = getCatalogModelEntry(part, category, catalog);
  if (!entry) return false;
  if (category === "propellers") {
    return Boolean(entry.cw && entry.ccw);
  }
  return Boolean(entry.glb);
}

export function resolveModelAsset(
  category,
  part,
  apiBase = API_BASE,
  catalog = componentsData,
) {
  if (!part?.id) {
    return {
      kind: "missing-selection",
      catalogModel: false,
      modelUrl: null,
      cwUrl: null,
      ccwUrl: null,
      provenance: "Not selected",
    };
  }
  const manifestEntry = getCatalogModelEntry(part, category, catalog);
  if (hasCatalogModel(part, category, catalog)) {
    return {
      kind: "catalog-glb",
      catalogModel: true,
      modelUrl: category === "propellers"
        ? null
        : createModelConversionUrl(category, manifestEntry.glb, apiBase),
      cwUrl: category === "propellers"
        ? createModelConversionUrl(category, manifestEntry.cw, apiBase)
        : null,
      ccwUrl: category === "propellers"
        ? createModelConversionUrl(category, manifestEntry.ccw, apiBase)
        : null,
      provenance: manifestEntry.contractStatus === "legacy-unverified"
        ? "Catalog GLB · legacy normalization unverified"
        : "Catalog GLB",
    };
  }
  return {
    kind: "generated-fallback",
    catalogModel: false,
    modelUrl: null,
    cwUrl: null,
    ccwUrl: null,
    provenance: "Generated fallback geometry",
  };
}

export function resolveModelForComponent(
  category,
  componentId,
  {
    apiBase = API_BASE,
    catalog = componentsData,
  } = {},
) {
  const part = catalog[category]?.find((candidate) => candidate.id === componentId);
  return resolveModelAsset(category, part, apiBase, catalog);
}

export function resolvePropellerModelPair(
  componentId,
  {
    apiBase = API_BASE,
    catalog = componentsData,
  } = {},
) {
  const asset = resolveModelForComponent("propellers", componentId, {
    apiBase,
    catalog,
  });
  return {
    cw: asset.cwUrl,
    ccw: asset.ccwUrl,
    provenance: asset.provenance,
  };
}
