import { summarizeBuildEvidence } from "./buildEvidence";
import componentsData from "../data/components.json";
import {
  physicalChecksFor,
  summarizePhysicalChecks,
} from "./physicalCompatibility";
import {
  electricalChecksFor,
  summarizeElectricalChecks,
} from "./electricalCompatibility";
import { sanitizeHardwareReadiness } from "./hardwareReadiness";

function selectedPhysicalChecks(assemblySpec) {
  return [
    ...(assemblySpec.motor
      ? physicalChecksFor("motors", assemblySpec.motor, assemblySpec)
      : []),
    ...(assemblySpec.esc
      ? physicalChecksFor("escs", assemblySpec.esc, assemblySpec)
      : []),
    ...(assemblySpec.battery
      ? physicalChecksFor("batteries", assemblySpec.battery, assemblySpec)
      : []),
    ...(assemblySpec.flightController
      ? physicalChecksFor(
          "flight_controllers",
          assemblySpec.flightController,
          assemblySpec,
        )
      : []),
  ];
}

export function createBuildSheet({
  build = {},
  assemblySpec = {},
  hardwareReadiness = null,
  importedEvidence = null,
  viewerPlacement = null,
  generatedAt = new Date().toISOString(),
}) {
  const checks = selectedPhysicalChecks(assemblySpec);
  const physicalFit = summarizePhysicalChecks(checks);
  const electricalChecks = electricalChecksFor(assemblySpec);
  const electricalFit = summarizeElectricalChecks(electricalChecks);
  const uniqueChecks = Array.from(
    new Map(
      checks.map((item) => [
        `${item.status}:${item.label}:${item.message}`,
        item,
      ]),
    ).values(),
  );
  const evidence = summarizeBuildEvidence(assemblySpec);
  const physicalFitStatus = checks.length === 0
    ? "pending"
    : !physicalFit.ok
      ? "conflict"
      : physicalFit.verified
        ? "verified"
        : "unverified";
  const electricalStatus = !electricalFit.ok
    ? "conflict"
    : electricalFit.verified
      ? "verified"
      : "unverified";

  return {
    schema: "rotorbench.build-sheet.v1",
    generatedAt,
    status: "draft",
    analysisIncluded: false,
    hardwareVerified: false,
    hardwarePlan: sanitizeHardwareReadiness(hardwareReadiness),
    importedEvidence: importedEvidence?.configured
      ? {
          status: importedEvidence.status || "observation",
          label: importedEvidence.label || "Imported evidence",
          attachedAt: importedEvidence.attachedAt || null,
          scopeStatus: importedEvidence.scopeStatus || "unchecked",
          identityStatus: importedEvidence.identityStatus || "not-recorded",
          checkCounts: {
            pass: Number(importedEvidence.checkCounts?.pass) || 0,
            fail: Number(importedEvidence.checkCounts?.fail) || 0,
            unverified: Number(importedEvidence.checkCounts?.unverified) || 0,
          },
          hardwareVerified: false,
          authenticityVerified: false,
        }
      : null,
    viewerPlacement: viewerPlacement
      ? {
          scope: "viewer-placement",
          complete: Boolean(viewerPlacement.complete),
          verifiedCount: Number(viewerPlacement.verifiedCount) || 0,
          awaitingCount: Number(viewerPlacement.awaitingCount) || 0,
          checks: Array.isArray(viewerPlacement.checks)
            ? viewerPlacement.checks.map((check) => ({
                id: check.id,
                label: check.label,
                status: check.status,
                detail: check.detail,
              }))
            : [],
        }
      : null,
    build: {
      id: build.id || null,
      name: build.name || "Untitled build",
      componentIds: build.componentIds || {},
    },
    physicalFit: {
      status: physicalFitStatus,
      summary: physicalFit.reason,
      checks: uniqueChecks,
    },
    electricalLimits: {
      status: electricalStatus,
      summary: electricalFit.reason,
      checks: electricalChecks,
    },
    provenance: {
      selectedCount: evidence.selectedCount,
      sourceBackedCount: evidence.sourceBackedCount,
      estimatedFieldCount: evidence.estimatedFieldCount,
      geometryFallbackCount: evidence.geometryFallbackCount,
      parts: evidence.parts,
    },
  };
}

export function buildSheetFilename(name) {
  const slug = String(name || "rotorbench-build")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "rotorbench-build"}-build-sheet.json`;
}

const componentIdCategories = {
  frameId: "frames",
  motorId: "motors",
  propellerId: "propellers",
  batteryId: "batteries",
  escId: "escs",
  flightControllerId: "flight_controllers",
  receiverId: "receivers",
};

export function parseBuildSheetJson(text, {
  now = new Date().toISOString(),
  catalog = componentsData,
} = {}) {
  let sheet;
  try {
    sheet = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (sheet?.schema !== "rotorbench.build-sheet.v1") {
    throw new Error("This is not a RotorBench build-sheet v1 file.");
  }
  if (!sheet.build || typeof sheet.build !== "object") {
    throw new Error("The build sheet does not contain build data.");
  }
  const sourceIds = sheet.build.componentIds;
  if (!sourceIds || typeof sourceIds !== "object" || Array.isArray(sourceIds)) {
    throw new Error("The build sheet does not contain component selections.");
  }

  const componentIds = Object.fromEntries(
    Object.entries(componentIdCategories).map(([key]) => [key, null]),
  );
  const unknownIds = [];
  for (const [key, category] of Object.entries(componentIdCategories)) {
    const id = sourceIds[key];
    if (id == null || id === "") continue;
    const exists = catalog[category]?.some((part) => part.id === id);
    if (exists) componentIds[key] = id;
    else unknownIds.push(`${key}: ${id}`);
  }
  if (unknownIds.length > 0) {
    throw new Error(`Unknown catalog component${unknownIds.length === 1 ? "" : "s"}: ${unknownIds.join(", ")}`);
  }
  if (!Object.values(componentIds).some(Boolean)) {
    throw new Error("The build sheet does not contain any known component selections.");
  }

  return {
    name: String(sheet.build.name || "Imported build").trim() || "Imported build",
    componentIds,
    createdAt: now,
    updatedAt: now,
    totalWeight: 0,
  };
}
