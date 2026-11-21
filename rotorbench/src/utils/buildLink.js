import componentsData from "../data/components.json";
import { normalizeGeometryOverrides } from "./buildGeometry";

export const BUILD_LINK_SCHEMA = "rotorbench.build-link.v1";
export const MAX_BUILD_LINK_TOKEN_LENGTH = 6000;

const COMPONENT_CATEGORIES = Object.freeze({
  frameId: "frames",
  motorId: "motors",
  propellerId: "propellers",
  escId: "escs",
  flightControllerId: "flight_controllers",
  batteryId: "batteries",
  receiverId: "receivers",
});

function encodeBase64Url(value) {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(base64);
}

function catalogPart(category, id, catalog) {
  return catalog[category]?.find((part) => part.id === id) || null;
}

function sanitizeComponentIds(value, catalog) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The shared build has no component selection.");
  }
  const selectedPartIds = {};
  const componentIds = Object.fromEntries(
    Object.keys(COMPONENT_CATEGORIES).map((key) => [key, null]),
  );
  for (const [key, category] of Object.entries(COMPONENT_CATEGORIES)) {
    const id = value[key];
    if (id == null || id === "") continue;
    if (typeof id !== "string" || !catalogPart(category, id, catalog)) {
      throw new Error(`The shared build references an unknown component: ${id}`);
    }
    componentIds[key] = id;
    selectedPartIds[category] = id;
  }
  if (!Object.values(componentIds).some(Boolean)) {
    throw new Error("The shared build has no component selection.");
  }
  return { componentIds, selectedPartIds };
}

function sanitizeGeometryOverrides(value, selectedPartIds) {
  const normalized = normalizeGeometryOverrides(value);
  const categories = {};
  for (const [category, parts] of Object.entries(normalized.categories)) {
    const selectedId = selectedPartIds[category];
    if (!selectedId || !parts[selectedId]) continue;
    categories[category] = {
      [selectedId]: parts[selectedId],
    };
  }
  return {
    ...normalized,
    categories,
  };
}

export function createBuildShareToken(
  { componentIds = {}, geometryOverrides = null } = {},
  { catalog = componentsData } = {},
) {
  const sanitized = sanitizeComponentIds(componentIds, catalog);
  const payload = {
    schema: BUILD_LINK_SCHEMA,
    componentIds: sanitized.componentIds,
    geometryOverrides: sanitizeGeometryOverrides(
      geometryOverrides,
      sanitized.selectedPartIds,
    ),
  };
  const token = encodeBase64Url(JSON.stringify(payload));
  if (token.length > MAX_BUILD_LINK_TOKEN_LENGTH) {
    throw new Error("This build is too large for a portable share link.");
  }
  return token;
}

export function parseBuildShareToken(
  token,
  { catalog = componentsData } = {},
) {
  if (!token || typeof token !== "string") {
    throw new Error("The share link does not contain build data.");
  }
  if (token.length > MAX_BUILD_LINK_TOKEN_LENGTH) {
    throw new Error("The share link is too large to decode safely.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("The share link has an invalid encoding.");
  }

  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(token));
  } catch {
    throw new Error("The share link is malformed.");
  }
  if (payload?.schema !== BUILD_LINK_SCHEMA) {
    throw new Error("This is not a supported RotorBench build link.");
  }
  const sanitized = sanitizeComponentIds(payload.componentIds, catalog);
  return {
    schema: BUILD_LINK_SCHEMA,
    componentIds: sanitized.componentIds,
    geometryOverrides: sanitizeGeometryOverrides(
      payload.geometryOverrides,
      sanitized.selectedPartIds,
    ),
  };
}

export function buildShareUrl(
  build,
  {
    origin = typeof window !== "undefined" ? window.location.origin : "http://localhost",
    catalog = componentsData,
  } = {},
) {
  const url = new URL("/build", origin);
  url.searchParams.set("share", createBuildShareToken(build, { catalog }));
  return url.toString();
}
