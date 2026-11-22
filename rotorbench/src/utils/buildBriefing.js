import { summarizeMeasuredGeometry } from "./buildGeometry";
import { summarizeModelSources } from "./modelAssets";
import { summarizeBuildPlanning } from "./planningSummary";
import { summarizePowerPath } from "./physicalCompatibility";
import {
  describeMissionControls,
  describeNavigationSafety,
  receiverWiringStatusLabel,
} from "./hardwareReadiness";
import { estimateAssemblyCenterOfGravity } from "./assemblyCenterOfGravity";

const partDefinitions = [
  ["frame", "Frame"],
  ["motor", "Motors"],
  ["propeller", "Propellers"],
  ["battery", "Battery"],
  ["esc", "ESC"],
  ["flightController", "Flight controller"],
  ["receiver", "Receiver"],
];

export function createBuildBriefing({
  build = {},
  assemblySpec = {},
  viewerPlacement = null,
  hardwareReadiness = null,
  importedEvidence = null,
  generatedAt = new Date().toISOString(),
}) {
  const placement = viewerPlacement || {};
  const powerPath = summarizePowerPath(
    assemblySpec.battery,
    assemblySpec.esc,
  );
  const centerOfGravity = estimateAssemblyCenterOfGravity(assemblySpec);
  const measured = summarizeMeasuredGeometry(
    assemblySpec,
    build.geometryOverrides,
  );
  const modelSources = summarizeModelSources(assemblySpec);
  const planning = summarizeBuildPlanning(build);
  const lines = [
    `# RotorBench briefing: ${build.name || "Untitled build"}`,
    `Generated: ${generatedAt}`,
  ];

  if (String(build.note || "").trim()) {
    lines.push("", "## Build note", String(build.note).trim());
  }

  lines.push("", "## Parts");
  partDefinitions.forEach(([key, label]) => {
    const part = assemblySpec[key];
    lines.push(`- ${label}: ${part?.name || "Not selected"}`);
  });

  if (planning.selectedCount > 0) {
    lines.push(
      "",
      "## Planning",
      `- Planning weight: ${Math.round(planning.totalWeight * 10) / 10} g (${planning.catalogWeight} g catalog parts + ${planning.planningAllowanceG} g allowance; not measured)`,
      `- Catalog price: $${planning.totalPrice.toFixed(2)}`,
      ...(centerOfGravity.planarOffsetMm
        ? [
            `- Center of gravity estimate: X ${centerOfGravity.planarOffsetMm.lateral} mm / Z ${centerOfGravity.planarOffsetMm.longitudinal} mm / ${centerOfGravity.massG} g placed / ${centerOfGravity.status} (not measured; 50 g allowance excluded)`,
          ]
        : []),
    );
    if (planning.takeoffEnvelopeStatus !== "unavailable") {
      lines.push(
        `- Published takeoff envelope: ${planning.publishedTakeoffRangeG.join("–")} g / ${planning.takeoffEnvelopeShortLabel} / verify with a scale`,
      );
    }
  }

  lines.push(
    "",
    "## Geometry",
    `- Viewer placement: ${Number(placement.verifiedCount) || 0}/${placement.checks?.length || 0} verified, ${Number(placement.measuredCount) || 0} measured, ${Number(placement.estimatedCount) || 0} estimated, ${Number(placement.fallbackCount) || 0} fallback, ${Number(placement.awaitingCount) || 0} awaiting, ${Number(placement.conflictCount) || 0} conflict`,
    `- Model sources: ${modelSources.catalogModelCount}/${modelSources.selectedCount} catalog GLBs, ${modelSources.generatedFallbackCount} generated fallback${modelSources.generatedFallbackCount === 1 ? "" : "s"}, ${modelSources.legacyNormalizationCount} legacy normalization warning${modelSources.legacyNormalizationCount === 1 ? "" : "s"}`,
    ...(modelSources.generatedFallbackCount > 0
      ? [
          `- Generated fallback parts: ${modelSources.sources
            .filter((source) => !source.catalogModel)
            .map((source) => source.label)
            .join(", ")}`,
        ]
      : []),
    `- Build-local measurements: ${measured.fieldCount} field${measured.fieldCount === 1 ? "" : "s"} across ${measured.partCount} part${measured.partCount === 1 ? "" : "s"}`,
  );
  measured.parts.forEach((part) => {
    lines.push(
      `  - ${part.name}: ${part.fields.map((field) => field.label).join(", ")}`,
    );
  });

  lines.push(
    "",
    "## Power path",
    `- ${powerPath.label}`,
    `- ${powerPath.message}`,
    "",
    "## Hardware plan",
    `- Status: ${hardwareReadiness?.label || "No saved hardware plan"}`,
  );
  if (hardwareReadiness?.configured) {
    lines.push(
      `- Receiver route: ${hardwareReadiness.receiverUart || "unassigned"} / ${hardwareReadiness.receiverBaud || "rate not set"} baud`,
      `- Receiver wiring: ${receiverWiringStatusLabel(hardwareReadiness.wiringStatus)}`,
      `- Radio host: ${hardwareReadiness.radioHostTransportLabel || "verify target"} / ${hardwareReadiness.radioHostDocumented ? "documented" : "verify target"}`,
      ...(hardwareReadiness.radioHostTransport === "module-bay"
        ? [
            `- Handset: ${hardwareReadiness.radioHandsetName || "Verify handset"} / ${hardwareReadiness.radioHandsetBayStatus || "verify"}`,
            `- Handset bay: ${hardwareReadiness.radioHostBayLabel || "verify bay"} / ${hardwareReadiness.radioHostBayCompatible ? "supported" : "mismatch"}`,
          ]
        : []),
      ...(hardwareReadiness.fcMotorOrder
        ? [
            `- Motor order: ${hardwareReadiness.fcMotorDirectionLabel} / ${hardwareReadiness.fcMotorOrder}`,
          ]
        : []),
      ...(hardwareReadiness.fcParameterRequirements?.length
        ? [
            `- ArduPilot receiver parameters: ${hardwareReadiness.fcParameterRequirements
              .map((requirement) => `${requirement.name}=${requirement.value}`)
              .join(", ")} / no writes performed`,
          ]
        : []),
      ...(hardwareReadiness.servoOutputCoverageLabel
        ? [
            `- Servo output coverage: ${hardwareReadiness.servoOutputCoverageLabel} / ${hardwareReadiness.servoOutputCoverageDetail}`,
          ]
        : []),
      ...(describeNavigationSafety(hardwareReadiness)
        ? [
            `- Navigation safety: ${describeNavigationSafety(hardwareReadiness)}`,
          ]
        : []),
      ...(describeMissionControls(hardwareReadiness)
        ? [
            `- Mission controls: ${describeMissionControls(hardwareReadiness)}`,
          ]
        : []),
      ...(hardwareReadiness.radioRegulatoryRegionLabel
        ? [
            `- RF limit: ${hardwareReadiness.radioRegulatoryRegionLabel}${
              hardwareReadiness.radioRegulatoryMaxDbm != null
                ? ` / ${hardwareReadiness.radioPowerDbm ?? "unset"} planned / ${hardwareReadiness.radioRegulatoryMaxDbm} dBm max`
                : " / verify regional variant"
            }${
              hardwareReadiness.radioPowerCapStatus === "over"
                ? " / OVER CAP"
                : ""
            }`,
          ]
        : []),
      ...(hardwareReadiness.radioReceiverBands?.length
        ? [
            `- Receiver RF bands: ${hardwareReadiness.radioReceiverBands.join(" / ")} / ${
              hardwareReadiness.radioReceiverBandStatus === "unconfigured"
                ? "no radio plan"
                : `${hardwareReadiness.radioReceiverBandStatus}${
                  hardwareReadiness.radioReceiverBandStatus === "compatible"
                    && hardwareReadiness.radioReceiverBands.length > 1
                    ? hardwareReadiness.radioReceiverBandsSimultaneous
                      ? " / simultaneously shared"
                      : hardwareReadiness.radioReceiverBandMode === "selectable"
                        ? " / one selected band"
                        : ""
                    : ""
                }`
            }${
              hardwareReadiness.radioSharedBands?.length
                ? ` / shared with TX: ${hardwareReadiness.radioSharedBands.join(" / ")}`
                : ""
            }`,
          ]
        : []),
    );
  }

  if (importedEvidence?.configured) {
    lines.push(
      "",
      "## Imported evidence",
      `- Status: ${importedEvidence.label || "Imported evidence"}`,
      `- Scope: ${importedEvidence.scopeStatus || "unchecked"} / ${importedEvidence.identityStatus || "identity not recorded"}`,
      `- Checks: ${importedEvidence.checkCounts?.pass || 0} pass / ${importedEvidence.checkCounts?.fail || 0} fail / ${importedEvidence.checkCounts?.unverified || 0} unverified`,
      `- Trust: ${importedEvidence.importTrust || "locally selected file; authenticity not independently verified"}`,
    );
    if (importedEvidence.planComparison) {
      const comparison = importedEvidence.planComparison;
      lines.push(
        `- FC plan target: ${comparison.targetName || "Unknown target"} / ${comparison.firmwareFamily || "firmware unknown"} / ${comparison.profileId || "profile unknown"}`,
        `- FC plan comparison: ${comparison.matched} match / ${comparison.differing} differ / ${comparison.notObserved} not observed across ${comparison.compared} checked`,
        `- FC plan identity: ${
          comparison.currentPlanMatches === false
            ? "different staged plan"
            : comparison.currentPlanMatches
              ? "current staged plan matched"
              : "current plan not supplied"
        } / fingerprint ${comparison.planFingerprint || "not recorded"}`,
        `- Raw parameter values: excluded / values read ${comparison.parameterValuesRead ? "yes" : "no"} / metadata read ${comparison.parameterMetadataRead ? "yes" : "no"}`,
      );
    }
  }

  lines.push(
    "",
    "## Boundary",
    "Planning and catalog comparison only. No analysis is included unless produced separately. Hardware, wiring, continuity, RF link, and flight readiness are not verified.",
  );

  return {
    schema: "rotorbench.build-briefing.v1",
    generatedAt,
    scope: "planning and catalog comparison; hardware not verified",
    text: lines.join("\n"),
    modelSources,
  };
}
