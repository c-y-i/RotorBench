import { summarizeMeasuredGeometry } from "./buildGeometry";
import { summarizePowerPath } from "./physicalCompatibility";
import {
  describeMissionControls,
  describeNavigationSafety,
} from "./hardwareReadiness";

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
  generatedAt = new Date().toISOString(),
}) {
  const placement = viewerPlacement || {};
  const powerPath = summarizePowerPath(
    assemblySpec.battery,
    assemblySpec.esc,
  );
  const measured = summarizeMeasuredGeometry(
    assemblySpec,
    build.geometryOverrides,
  );
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

  lines.push(
    "",
    "## Geometry",
    `- Viewer placement: ${Number(placement.verifiedCount) || 0}/${placement.checks?.length || 0} verified, ${Number(placement.measuredCount) || 0} measured, ${Number(placement.estimatedCount) || 0} estimated, ${Number(placement.fallbackCount) || 0} fallback, ${Number(placement.awaitingCount) || 0} awaiting, ${Number(placement.conflictCount) || 0} conflict`,
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
      `- Receiver wiring: ${hardwareReadiness.wiringStatus === "documented" ? "pins documented" : "verify pins"}`,
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
                : hardwareReadiness.radioReceiverBandStatus
            }${
              hardwareReadiness.radioSharedBands?.length
                ? ` / shared with TX: ${hardwareReadiness.radioSharedBands.join(" / ")}`
                : ""
            }`,
          ]
        : []),
    );
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
  };
}
