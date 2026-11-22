import { sanitizeHardwareReadiness } from "./hardwareReadiness";
import { summarizeBuildPlanning } from "./planningSummary";
import {
  normalizeGeometryOverrides,
  summarizeMeasuredGeometry,
} from "./buildGeometry";
import { summarizePowerPath } from "./physicalCompatibility";
import { sanitizePlanComparisonMetadata } from "./benchEvidenceAttachment";

export const ANALYSIS_REPORT_SCHEMA = "rotorbench.analysis-report.v1";

function sanitizeImportedEvidence(evidence) {
  if (!evidence?.configured) return null;
  return {
    status: evidence.status || "observation",
    label: evidence.label || "Imported evidence",
    attachedAt: evidence.attachedAt || null,
    scopeStatus: evidence.scopeStatus || "unchecked",
    identityStatus: evidence.identityStatus || "not-recorded",
    checkCounts: {
      pass: Number(evidence.checkCounts?.pass) || 0,
      fail: Number(evidence.checkCounts?.fail) || 0,
      unverified: Number(evidence.checkCounts?.unverified) || 0,
    },
    failedChecks: Array.isArray(evidence.failedChecks)
      ? evidence.failedChecks.map(String)
      : [],
    unverifiedChecks: Array.isArray(evidence.unverifiedChecks)
      ? evidence.unverifiedChecks.map(String)
      : [],
    planComparison: sanitizePlanComparisonMetadata(evidence.planComparison),
    importTrust: evidence.importTrust || "locally selected file; authenticity not independently verified",
    hardwareVerified: false,
    authenticityVerified: false,
  };
}

export function createAnalysisReport(
  build,
  analysis,
  generatedAt = new Date().toISOString(),
  {
    hardwarePlan = null,
    importedEvidence = null,
    viewerPlacement = null,
    assemblySpec = null,
  } = {},
) {
  if (!build?.id || !build?.componentIds) {
    throw new Error("An identified build with component IDs is required.");
  }
  if (!analysis?.performance || !analysis?.flightSimulation) {
    throw new Error("A completed analysis result is required.");
  }
  const planning = summarizeBuildPlanning(build);

  return {
    schema: ANALYSIS_REPORT_SCHEMA,
    generatedAt,
    build: {
      id: build.id,
      name: build.name || "Untitled build",
      note: String(build.note || "").trim().slice(0, 600),
      description: build.description || "",
      componentIds: { ...build.componentIds },
      geometryOverrides: build.geometryOverrides
        ? normalizeGeometryOverrides(build.geometryOverrides)
        : null,
      createdAt: build.createdAt || null,
      updatedAt: build.updatedAt || null,
    },
    verification: {
      analysisIsEstimate: true,
      hardwareVerified: false,
      evidenceAuthenticityVerified: false,
    },
    planning: {
      scope: "catalog planning estimate; not measured takeoff weight",
      selectedPartCount: planning.selectedCount,
      catalogWeightG: planning.catalogWeight,
      planningAllowanceG: planning.planningAllowanceG,
      totalWeightG: planning.totalWeight,
      totalPriceUsd: planning.totalPrice,
      publishedTakeoffRangeG: planning.publishedTakeoffRangeG,
      takeoffEnvelopeStatus: planning.takeoffEnvelopeStatus,
      takeoffEnvelopeShortLabel: planning.takeoffEnvelopeShortLabel,
      takeoffEnvelopeLabel: planning.takeoffEnvelopeLabel,
    },
    hardwarePlan: sanitizeHardwareReadiness(hardwarePlan),
    importedEvidence: sanitizeImportedEvidence(importedEvidence),
    measuredGeometry: summarizeMeasuredGeometry(
      assemblySpec || {},
      build.geometryOverrides,
    ),
    powerPath: summarizePowerPath(
      assemblySpec?.battery,
      assemblySpec?.esc,
    ),
    viewerPlacement: viewerPlacement
      ? {
          scope: "viewer-placement",
          complete: Boolean(viewerPlacement.complete),
          verifiedCount: Number(viewerPlacement.verifiedCount) || 0,
          measuredCount: Number(viewerPlacement.measuredCount) || 0,
          estimatedCount: Number(viewerPlacement.estimatedCount) || 0,
          fallbackCount: Number(viewerPlacement.fallbackCount) || 0,
          awaitingCount: Number(viewerPlacement.awaitingCount) || 0,
          conflictCount: Number(viewerPlacement.conflictCount) || 0,
          assembledCount: Number(viewerPlacement.assembledCount) || 0,
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
    analysis,
  };
}

export function analysisReportFilename(buildId) {
  const safeId = String(buildId || "build")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "build";
  return `rotorbench-analysis-${safeId}.json`;
}
