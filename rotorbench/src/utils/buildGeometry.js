export const BUILD_GEOMETRY_SCHEMA = "rotorbench.measured-geometry.v1";

export const GEOMETRY_CATEGORY_FIELDS = Object.freeze({
  frames: [
    { key: "dimensionsMm", label: "Frame dimensions", kind: "vector3" },
    { key: "stackHeight", label: "Stack height", kind: "number" },
  ],
  motors: [
    { key: "dimensionsMm", label: "Motor dimensions", kind: "vector3" },
    { key: "mountingPatternMm", label: "Mounting pattern", kind: "vector2" },
    { key: "propShaftMm", label: "Prop shaft diameter", kind: "number" },
    { key: "bellDiameterMm", label: "Bell diameter", kind: "number" },
  ],
  propellers: [
    { key: "dimensionsMm", label: "Propeller dimensions", kind: "vector3" },
    { key: "shaftMm", label: "Propeller bore", kind: "number" },
    { key: "hubDiameterMm", label: "Hub diameter", kind: "number" },
    { key: "hubThicknessMm", label: "Hub thickness", kind: "number" },
  ],
  batteries: [
    { key: "dimensionsMm", label: "Battery dimensions", kind: "vector3" },
  ],
  escs: [
    { key: "dimensionsMm", label: "ESC dimensions", kind: "vector3" },
  ],
  flight_controllers: [
    { key: "dimensionsMm", label: "FC dimensions", kind: "vector3" },
  ],
  receivers: [
    { key: "dimensionsMm", label: "Receiver dimensions", kind: "vector3" },
  ],
});

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function cloneGeometryOverrides(value) {
  return {
    schema: BUILD_GEOMETRY_SCHEMA,
    categories: Object.fromEntries(
      Object.entries(value.categories || {}).map(([category, parts]) => [
        category,
        Object.fromEntries(
          Object.entries(parts || {}).map(([partId, fields]) => [
            partId,
            Object.fromEntries(
              Object.entries(fields || {}).map(([field, fieldValue]) => [
                field,
                Array.isArray(fieldValue) ? [...fieldValue] : fieldValue,
              ]),
            ),
          ]),
        ),
      ]),
    ),
  };
}

export function normalizeGeometryValue(field, value) {
  if (field.kind === "number") return positiveNumber(value);
  const expectedLength = field.kind === "vector2" ? 2 : 3;
  if (!Array.isArray(value) || value.length !== expectedLength) return null;
  const normalized = value.map(positiveNumber);
  return normalized.every((entry) => entry != null) ? normalized : null;
}

export function normalizeGeometryOverrides(value) {
  if (value?.schema !== BUILD_GEOMETRY_SCHEMA || !value.categories) {
    return { schema: BUILD_GEOMETRY_SCHEMA, categories: {} };
  }
  const categories = {};
  Object.entries(value.categories).forEach(([category, parts]) => {
    const fields = GEOMETRY_CATEGORY_FIELDS[category];
    if (!fields || !parts || typeof parts !== "object") return;
    const normalizedParts = {};
    Object.entries(parts).forEach(([partId, values]) => {
      if (!partId || !values || typeof values !== "object") return;
      const normalizedValues = {};
      fields.forEach((field) => {
        const normalized = normalizeGeometryValue(field, values[field.key]);
        if (normalized != null) normalizedValues[field.key] = normalized;
      });
      if (Object.keys(normalizedValues).length) {
        normalizedParts[partId] = normalizedValues;
      }
    });
    if (Object.keys(normalizedParts).length) categories[category] = normalizedParts;
  });
  return { schema: BUILD_GEOMETRY_SCHEMA, categories };
}

export function measuredGeometryForPart(overrides, category, partId) {
  if (!partId) return {};
  return normalizeGeometryOverrides(overrides)
    .categories[category]?.[partId] || {};
}

export function setMeasuredGeometryValue(
  overrides,
  category,
  partId,
  fieldKey,
  value,
) {
  const normalized = normalizeGeometryOverrides(overrides);
  const field = GEOMETRY_CATEGORY_FIELDS[category]?.find(
    (candidate) => candidate.key === fieldKey,
  );
  if (!field || !partId) return normalized;
  const next = cloneGeometryOverrides(normalized);
  const partValues = next.categories[category]?.[partId] || {};
  const normalizedValue = normalizeGeometryValue(field, value);
  if (normalizedValue == null) {
    delete partValues[fieldKey];
  } else {
    partValues[fieldKey] = normalizedValue;
  }
  if (Object.keys(partValues).length) {
    next.categories[category] = {
      ...(next.categories[category] || {}),
      [partId]: partValues,
    };
  } else if (next.categories[category]) {
    delete next.categories[category][partId];
    if (!Object.keys(next.categories[category]).length) {
      delete next.categories[category];
    }
  }
  return next;
}

export function clearMeasuredGeometry(overrides, category, partId) {
  const normalized = normalizeGeometryOverrides(overrides);
  const next = cloneGeometryOverrides(normalized);
  if (next.categories[category]) {
    delete next.categories[category][partId];
    if (!Object.keys(next.categories[category]).length) {
      delete next.categories[category];
    }
  }
  return next;
}

export function applyMeasuredGeometry(category, part, overrides) {
  if (!part?.id) return part || null;
  const values = measuredGeometryForPart(overrides, category, part.id);
  const measuredFields = Object.keys(values);
  if (!measuredFields.length) return part;
  return {
    ...part,
    ...values,
    measuredFields,
    geometrySource: "user-measured",
  };
}

const ASSEMBLY_CATEGORIES = Object.freeze({
  frame: "frames",
  motor: "motors",
  propeller: "propellers",
  battery: "batteries",
  esc: "escs",
  flightController: "flight_controllers",
  receiver: "receivers",
});

export function applyMeasuredGeometryToAssemblySpec(assemblySpec, overrides) {
  return Object.fromEntries(
    Object.entries(assemblySpec).map(([key, part]) => [
      key,
      applyMeasuredGeometry(ASSEMBLY_CATEGORIES[key], part, overrides),
    ]),
  );
}

export function geometryProvenance(overrides, category, part) {
  if (!part?.id) return [];
  const measured = measuredGeometryForPart(overrides, category, part.id);
  const estimatedFields = Array.isArray(part.estimatedFields)
    ? part.estimatedFields
    : [];
  return (GEOMETRY_CATEGORY_FIELDS[category] || []).map((field) => ({
    key: field.key,
    label: field.label,
    catalogValue: part[field.key] ?? null,
    effectiveValue: measured[field.key] ?? part[field.key] ?? null,
    source: measured[field.key] != null
      ? "user-measured"
      : estimatedFields.includes(field.key) ? "catalog-estimated"
        : part[field.key] == null ? "missing"
          : "catalog",
  }));
}

export function summarizeMeasuredGeometry(assemblySpec = {}, overrides) {
  const normalized = normalizeGeometryOverrides(overrides);
  const parts = Object.entries(ASSEMBLY_CATEGORIES).flatMap(([assemblyKey, category]) => {
    const part = assemblySpec[assemblyKey];
    if (!part?.id) return [];
    const values = normalized.categories[category]?.[part.id] || {};
    const fields = (GEOMETRY_CATEGORY_FIELDS[category] || [])
      .filter((field) => values[field.key] != null)
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: Array.isArray(values[field.key])
          ? [...values[field.key]]
          : values[field.key],
        catalogValue: part[field.key] ?? null,
        source: "user-measured",
      }));
    if (!fields.length) return [];
    return [{
      key: assemblyKey,
      id: part.id,
      name: part.name || part.id,
      fields,
    }];
  });

  return {
    schema: "rotorbench.measured-geometry-summary.v1",
    scope: "build-local measurement; not hardware verification",
    partCount: parts.length,
    fieldCount: parts.reduce((total, part) => total + part.fields.length, 0),
    parts,
  };
}
