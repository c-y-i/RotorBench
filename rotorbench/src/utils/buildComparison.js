import componentsData from "../data/components.json";
import { summarizeBuildEvidence } from "./buildEvidence";
import {
  physicalChecksFor,
  summarizePowerPath,
  summarizePhysicalChecks,
} from "./physicalCompatibility";
import {
  electricalChecksFor,
  summarizeElectricalChecks,
} from "./electricalCompatibility";
import { applyMeasuredGeometry } from "./buildGeometry";
import { getFrameServoHardware } from "./frameHardware";
import {
  describeMissionControls,
  describeNavigationSafety,
  summarizeHardwareReadiness,
} from "./hardwareReadiness";
import {
  readBenchEvidenceAttachment,
  readCurrentBenchEvidenceScope,
  summarizeBenchEvidenceAttachment,
} from "./benchEvidenceAttachment";

const partDefinitions = [
  { key: "frameId", category: "frames", label: "Frame" },
  { key: "motorId", category: "motors", label: "Motors" },
  { key: "propellerId", category: "propellers", label: "Propellers" },
  { key: "batteryId", category: "batteries", label: "Battery" },
  { key: "escId", category: "escs", label: "ESC" },
  { key: "flightControllerId", category: "flight_controllers", label: "Flight controller" },
  { key: "receiverId", category: "receivers", label: "Receiver" },
];

export function summarizeBuild(build) {
  const ids = build?.componentIds || {};
  const parts = partDefinitions.map((definition) => {
    const part = componentsData[definition.category]?.find(
      (candidate) => candidate.id === ids[definition.key],
    );
    return {
      ...definition,
      part: applyMeasuredGeometry(
        definition.category,
        part || null,
        build?.geometryOverrides,
      ),
    };
  });
  const byCategory = Object.fromEntries(
    parts.map(({ category, part }) => [category, part]),
  );
  const motorCount = Number(byCategory.frames?.motorCount) || 4;
  const frameServoHardware = getFrameServoHardware(byCategory.frames);
  const quantity = {
    frames: 1,
    motors: motorCount,
    propellers: motorCount,
    batteries: 1,
    escs: 1,
    flight_controllers: 1,
    receivers: 1,
  };

  const totalWeight = parts.reduce(
    (total, { category, part }) =>
      total + (Number(part?.weight) || 0) * (quantity[category] || 1),
    0,
  ) + (Number(frameServoHardware?.weight) || 0);
  const totalPrice = parts.reduce(
    (total, { category, part }) =>
      total + (Number(part?.price) || 0) * (quantity[category] || 1),
    0,
  ) + (Number(frameServoHardware?.price) || 0);
  const assemblySpec = {
    frame: byCategory.frames,
    motor: byCategory.motors,
    propeller: byCategory.propellers,
    battery: byCategory.batteries,
    esc: byCategory.escs,
    flightController: byCategory.flight_controllers,
    receiver: byCategory.receivers,
  };
  const physicalChecks = [
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
  const physicalFit = summarizePhysicalChecks(physicalChecks);
  const powerPath = summarizePowerPath(
    assemblySpec.battery,
    assemblySpec.esc,
  );
  const electricalChecks = electricalChecksFor(assemblySpec);
  const electricalFit = summarizeElectricalChecks(electricalChecks);
  const physicalFitStatus = physicalChecks.length === 0
    ? "pending"
    : !physicalFit.ok
      ? "conflict"
      : physicalChecks.some((check) => check.status === "unknown")
        ? "unverified"
        : physicalFit.measured > 0
          ? "measured"
      : physicalFit.verified
        ? "verified"
        : "unverified";
  const electricalFitStatus = !electricalFit.ok
    ? "conflict"
    : electricalFit.verified
      ? "verified"
      : "unverified";
  const evidence = summarizeBuildEvidence(assemblySpec);
  const hardwareReadiness = summarizeHardwareReadiness({
    buildId: build?.id,
    flightController: byCategory.flight_controllers,
    receiver: byCategory.receivers,
    buildMotorCount: byCategory.frames?.motorCount ?? null,
  });
  const benchEvidence = summarizeBenchEvidenceAttachment(
    readBenchEvidenceAttachment(build?.id),
    readCurrentBenchEvidenceScope(build),
  );
  const thrustDataStatus = !byCategory.propellers
    ? "not-selected"
    : (byCategory.propellers.thrustData?.length || 0) > 0
      ? (byCategory.propellers.estimatedFields?.includes("thrustData")
          || !byCategory.propellers.sourceUrl)
        ? "estimated"
        : "available"
      : "unavailable";

  return {
    id: build?.id || "draft",
    name: build?.name?.trim() || "Untitled build",
    note: build?.note || "",
    updatedAt: build?.updatedAt || build?.createdAt || null,
    parts,
    selectedCount: parts.filter(({ part }) => part).length,
    motorCount,
    frameServoHardware,
    totalWeight,
    totalPrice,
    physicalFitStatus,
    physicalFitSummary: physicalFit.reason,
    powerPathStatus: powerPath.displayState,
    powerPathLabel: powerPath.label,
    powerPathSummary: powerPath.message,
    electricalFitStatus,
    electricalFitSummary: electricalFit.reason,
    sourceBackedCount: evidence.sourceBackedCount,
    estimatedFieldCount: evidence.estimatedFieldCount,
    measuredFieldCount: evidence.measuredFieldCount,
    geometryFallbackCount: evidence.geometryFallbackCount,
    hardwarePlanStatus: readHardwarePlanStatus(build?.id),
    hardwareReadinessStatus: hardwareReadiness.status,
    hardwareReadinessLabel: hardwareReadiness.label,
    fcBoardName: hardwareReadiness.fcBoardName,
    fcBoardDocumented: hardwareReadiness.fcBoardDocumented,
    receiverWiringStatus: hardwareReadiness.wiringStatus,
    receiverPins: hardwareReadiness.receiverPins,
    radioHostTransport: hardwareReadiness.radioHostTransport,
    radioHostTransportLabel: hardwareReadiness.radioHostTransportLabel,
    radioHostDocumented: hardwareReadiness.radioHostDocumented,
    radioHostBay: hardwareReadiness.radioHostBay,
    radioHostBayLabel: hardwareReadiness.radioHostBayLabel,
    radioHostBayCompatible: hardwareReadiness.radioHostBayCompatible,
    radioHandsetId: hardwareReadiness.radioHandsetId,
    radioHandsetName: hardwareReadiness.radioHandsetName,
    radioHandsetBayStatus: hardwareReadiness.radioHandsetBayStatus,
    radioHandsetBayCompatible: hardwareReadiness.radioHandsetBayCompatible,
    radioPowerDbm: hardwareReadiness.radioPowerDbm,
    radioRegulatoryRegionLabel: hardwareReadiness.radioRegulatoryRegionLabel,
    radioRegulatoryMaxDbm: hardwareReadiness.radioRegulatoryMaxDbm,
    radioRegulatoryMaxMw: hardwareReadiness.radioRegulatoryMaxMw,
    radioPowerCapStatus: hardwareReadiness.radioPowerCapStatus,
    radioReceiverBandStatus: hardwareReadiness.radioReceiverBandStatus,
    radioReceiverBands: hardwareReadiness.radioReceiverBands,
    radioSharedBands: hardwareReadiness.radioSharedBands,
    fcMotorDirection: hardwareReadiness.fcMotorDirection,
    fcMotorDirectionLabel: hardwareReadiness.fcMotorDirectionLabel,
    fcMotorOrder: hardwareReadiness.fcMotorOrder,
    navigationSafetyLabel: describeNavigationSafety(hardwareReadiness),
    missionControlsLabel: describeMissionControls(hardwareReadiness),
    hardwareIssueCount: hardwareReadiness.configured
      ? hardwareReadiness.issueCount
      : null,
    benchEvidenceStatus: benchEvidence.status,
    benchEvidenceLabel: benchEvidence.label,
    benchEvidenceConfigured: benchEvidence.configured,
    thrustDataStatus,
    hasHardwareParts: Boolean(
      byCategory.flight_controllers || byCategory.receivers,
    ),
  };
}

export function readHardwarePlanStatus(
  buildId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  if (!buildId || !storage) return "not-configured";
  try {
    const base = `rotorbench:hardware-plan:${buildId}`;
    const fc = JSON.parse(storage.getItem(`${base}:fc`) || "null");
    const radio = JSON.parse(storage.getItem(`${base}:radio`) || "null");
    const validFc = fc?.planVersion === 3;
    const validRadio = radio?.planVersion === 3;
    if (validFc && validRadio) return "saved";
    if (validFc || validRadio) return "partial";
    return "not-configured";
  } catch {
    return "invalid";
  }
}

const physicalFitLabels = {
  verified: "Verified",
  measured: "Measured",
  unverified: "Needs review",
  conflict: "Conflict",
  pending: "Not selected",
};

function portableComparisonValue(value) {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      id: value.id || null,
      name: value.name || null,
    };
  }
  return value;
}

export function createComparisonReport(
  left,
  right,
  rows,
  generatedAt = new Date().toISOString(),
) {
  return {
    schema: "rotorbench.build-comparison.v1",
    generatedAt,
    verification: {
      catalogComparisonOnly: true,
      hardwareVerified: false,
      performanceAnalyzed: false,
    },
    builds: [left, right].map((build) => ({
      id: build.id,
      name: build.name,
      note: build.note,
      selectedCount: build.selectedCount,
      motorCount: build.motorCount,
      physicalFitStatus: build.physicalFitStatus,
      powerPathStatus: build.powerPathStatus,
      powerPathLabel: build.powerPathLabel,
      electricalFitStatus: build.electricalFitStatus,
      hardwarePlanStatus: build.hardwarePlanStatus,
      hardwareReadinessStatus: build.hardwareReadinessStatus,
      fcBoardName: build.fcBoardName,
      fcBoardDocumented: build.fcBoardDocumented,
      receiverWiringStatus: build.receiverWiringStatus,
      receiverPins: build.receiverPins,
      radioHostTransport: build.radioHostTransport,
      radioHostTransportLabel: build.radioHostTransportLabel,
      radioHostDocumented: build.radioHostDocumented,
      radioHostBay: build.radioHostBay,
      radioHostBayLabel: build.radioHostBayLabel,
      radioHostBayCompatible: build.radioHostBayCompatible,
      radioHandsetId: build.radioHandsetId,
      radioHandsetName: build.radioHandsetName,
      radioHandsetBayStatus: build.radioHandsetBayStatus,
      radioHandsetBayCompatible: build.radioHandsetBayCompatible,
      radioPowerDbm: build.radioPowerDbm,
      radioRegulatoryRegionLabel: build.radioRegulatoryRegionLabel,
      radioRegulatoryMaxDbm: build.radioRegulatoryMaxDbm,
      radioRegulatoryMaxMw: build.radioRegulatoryMaxMw,
      radioPowerCapStatus: build.radioPowerCapStatus,
      radioReceiverBandStatus: build.radioReceiverBandStatus,
      radioReceiverBands: build.radioReceiverBands,
      radioSharedBands: build.radioSharedBands,
      fcMotorDirection: build.fcMotorDirection,
      fcMotorDirectionLabel: build.fcMotorDirectionLabel,
      fcMotorOrder: build.fcMotorOrder,
      benchEvidenceStatus: build.benchEvidenceStatus,
      thrustDataStatus: build.thrustDataStatus,
      sourceBackedCount: build.sourceBackedCount,
      estimatedFieldCount: build.estimatedFieldCount,
      measuredFieldCount: build.measuredFieldCount,
      geometryFallbackCount: build.geometryFallbackCount,
      totalWeight: build.totalWeight,
      totalPrice: build.totalPrice,
    })),
    differenceCount: rows.filter((row) => row.changed).length,
    rows: rows.map((row) => ({
      id: row.id,
      label: row.label,
      left: portableComparisonValue(row.left),
      right: portableComparisonValue(row.right),
      changed: row.changed,
    })),
  };
}

export function comparisonReportFilename(left, right) {
  const clean = (value) => String(value || "build")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "build";
  return `rotorbench-compare-${clean(left?.id)}-${clean(right?.id)}.json`;
}

function comparisonValueKey(value) {
  if (value == null) return null;
  if (typeof value === "object") return value.id ?? JSON.stringify(value);
  return value;
}

export function comparisonRows(left, right) {
  const leftParts = Object.fromEntries(
    left.parts.map(({ category, part }) => [category, part]),
  );
  const rightParts = Object.fromEntries(
    right.parts.map(({ category, part }) => [category, part]),
  );
  const thrustDataLabel = (value) => ({
    estimated: "Estimated",
    available: "Available",
    unavailable: "Unavailable",
    "not-selected": "Not selected",
  })[value] || "Not selected";
  const rows = [
    ...left.parts.map((leftPart, index) => ({
      id: leftPart.key,
      label: leftPart.label,
      left: leftPart.part,
      right: right.parts[index]?.part || null,
    })),
    {
      id: "frame-size",
      label: "Frame size",
      left: leftParts.frames?.size ?? null,
      right: rightParts.frames?.size ?? null,
      format: (value) => value == null ? "—" : `${value} mm`,
    },
    {
      id: "motor-kv",
      label: "Motor KV",
      left: leftParts.motors?.kv ?? null,
      right: rightParts.motors?.kv ?? null,
      format: (value) => value == null ? "—" : `${value} KV`,
    },
    {
      id: "motor-size",
      label: "Motor stator size",
      left: leftParts.motors?.size ?? null,
      right: rightParts.motors?.size ?? null,
      format: (value) => value || "—",
    },
    {
      id: "propeller-size",
      label: "Propeller size",
      left: leftParts.propellers?.size ?? null,
      right: rightParts.propellers?.size ?? null,
      format: (value) => value == null ? "—" : `${value}"`,
    },
    {
      id: "propeller-blades",
      label: "Propeller blades",
      left: leftParts.propellers?.bladeCount ?? null,
      right: rightParts.propellers?.bladeCount ?? null,
      format: (value) => value == null ? "—" : String(value),
    },
    {
      id: "propeller-thrust-data",
      label: "Propeller thrust data",
      left: left.thrustDataStatus,
      right: right.thrustDataStatus,
      format: thrustDataLabel,
    },
    {
      id: "battery-cells",
      label: "Battery cells",
      left: leftParts.batteries?.cells ?? null,
      right: rightParts.batteries?.cells ?? null,
      format: (value) => value == null ? "—" : `${value}S`,
    },
    {
      id: "battery-capacity",
      label: "Battery capacity",
      left: leftParts.batteries?.capacity ?? null,
      right: rightParts.batteries?.capacity ?? null,
      format: (value) => value == null ? "—" : `${value} mAh`,
    },
    {
      id: "esc-current",
      label: "ESC continuous current",
      left: leftParts.escs?.currentRating ?? null,
      right: rightParts.escs?.currentRating ?? null,
      format: (value) => value == null ? "—" : `${value} A`,
    },
    {
      id: "fc-firmware",
      label: "FC firmware",
      left: leftParts.flight_controllers?.firmware ?? null,
      right: rightParts.flight_controllers?.firmware ?? null,
      format: (value) => Array.isArray(value) ? value.join(" / ") : value || "—",
    },
    {
      id: "fc-processor",
      label: "FC processor",
      left: leftParts.flight_controllers?.processor ?? null,
      right: rightParts.flight_controllers?.processor ?? null,
      format: (value) => value || "—",
    },
    {
      id: "receiver-protocol",
      label: "Receiver protocol",
      left: leftParts.receivers?.protocol ?? null,
      right: rightParts.receivers?.protocol ?? null,
      format: (value) => value || "—",
    },
    {
      id: "receiver-channels",
      label: "Receiver channels",
      left: leftParts.receivers?.channels ?? null,
      right: rightParts.receivers?.channels ?? null,
      format: (value) => value == null ? "—" : String(value),
    },
    {
      id: "selected-count",
      label: "Selected parts",
      left: left.selectedCount,
      right: right.selectedCount,
      format: (value) => `${value}/7`,
    },
    {
      id: "physical-fit",
      label: "Physical fit",
      left: left.physicalFitStatus,
      right: right.physicalFitStatus,
      format: (value) => physicalFitLabels[value] || value,
    },
    {
      id: "power-path",
      label: "Battery power path",
      left: left.powerPathLabel,
      right: right.powerPathLabel,
      format: (value) => value,
    },
    {
      id: "electrical-limits",
      label: "Electrical limits",
      left: left.electricalFitStatus,
      right: right.electricalFitStatus,
      format: (value) => physicalFitLabels[value] || value,
    },
    {
      id: "source-backed",
      label: "Source-backed parts",
      left: left.sourceBackedCount,
      right: right.sourceBackedCount,
      format: (value) => String(value),
    },
    {
      id: "estimated-fields",
      label: "Estimated fields",
      left: left.estimatedFieldCount,
      right: right.estimatedFieldCount,
      format: (value) => String(value),
      lowerIsBetter: true,
    },
    {
      id: "measured-geometry",
      label: "Measured geometry fields",
      left: left.measuredFieldCount,
      right: right.measuredFieldCount,
      format: (value) => String(value),
    },
    {
      id: "geometry-fallbacks",
      label: "Geometry fallbacks",
      left: left.geometryFallbackCount,
      right: right.geometryFallbackCount,
      format: (value) => String(value),
      lowerIsBetter: true,
    },
    {
      id: "hardware-plan",
      label: "Hardware plan",
      left: left.hardwareReadinessLabel,
      right: right.hardwareReadinessLabel,
      format: (value) => value,
    },
    {
      id: "receiver-wiring",
      label: "Receiver wiring",
      left: left.receiverWiringStatus,
      right: right.receiverWiringStatus,
      format: (value) => value === "documented" ? "Pins documented" : "Verify pins",
    },
    {
      id: "board-map",
      label: "Board map",
      left: left.fcBoardName
        ? `${left.fcBoardName} · ${left.fcBoardDocumented ? "documented" : "custom mapping"}`
        : "Not configured",
      right: right.fcBoardName
        ? `${right.fcBoardName} · ${right.fcBoardDocumented ? "documented" : "custom mapping"}`
        : "Not configured",
      format: (value) => value,
    },
    {
      id: "radio-host",
      label: "Radio host transport",
      left: `${left.radioHostTransportLabel} · ${left.radioHostDocumented ? "documented" : "verify"}`,
      right: `${right.radioHostTransportLabel} · ${right.radioHostDocumented ? "documented" : "verify"}`,
      format: (value) => value,
    },
    {
      id: "radio-host-bay",
      label: "Radio handset / bay",
      left: left.radioHostTransport === "module-bay"
        ? `${left.radioHandsetName || "Verify handset"} · ${left.radioHostBayLabel || "Verify bay"} · ${
          left.radioHostBayCompatible && left.radioHandsetBayCompatible
            ? "supported"
            : "mismatch"
        }`
        : `${left.radioHostBayLabel || "Verify bay"} · ${
          left.radioHostBayCompatible ? "supported" : "mismatch"
        }`,
      right: right.radioHostTransport === "module-bay"
        ? `${right.radioHandsetName || "Verify handset"} · ${right.radioHostBayLabel || "Verify bay"} · ${
          right.radioHostBayCompatible && right.radioHandsetBayCompatible
            ? "supported"
            : "mismatch"
        }`
        : `${right.radioHostBayLabel || "Verify bay"} · ${
          right.radioHostBayCompatible ? "supported" : "mismatch"
        }`,
      format: (value) => value,
    },
    {
      id: "fc-motor-order",
      label: "Motor order",
      left: left.fcMotorOrder
        ? `${left.fcMotorDirectionLabel} · ${left.fcMotorOrder}`
        : left.fcMotorDirectionLabel || "No verified motor map",
      right: right.fcMotorOrder
        ? `${right.fcMotorDirectionLabel} · ${right.fcMotorOrder}`
        : right.fcMotorDirectionLabel || "No verified motor map",
      format: (value) => value,
    },
    {
      id: "navigation-safety",
      label: "Navigation safety",
      left: left.navigationSafetyLabel || "Not configured",
      right: right.navigationSafetyLabel || "Not configured",
      format: (value) => value,
    },
    {
      id: "mission-controls",
      label: "Mission controls",
      left: left.missionControlsLabel || "Not configured",
      right: right.missionControlsLabel || "Not configured",
      format: (value) => value,
    },
    {
      id: "radio-power-limit",
      label: "Radio RF limit",
      left: left.radioRegulatoryRegionLabel
        ? `${left.radioRegulatoryRegionLabel}${
          left.radioRegulatoryMaxDbm != null
            ? ` · ${left.radioPowerDbm ?? "power unset"} / ${left.radioRegulatoryMaxDbm} dBm`
            : ` · ${left.radioPowerDbm ?? "power unset"} dBm`
        }`
        : "No region-specific limit",
      right: right.radioRegulatoryRegionLabel
        ? `${right.radioRegulatoryRegionLabel}${
          right.radioRegulatoryMaxDbm != null
            ? ` · ${right.radioPowerDbm ?? "power unset"} / ${right.radioRegulatoryMaxDbm} dBm`
            : ` · ${right.radioPowerDbm ?? "power unset"} dBm`
        }`
        : "No region-specific limit",
      format: (value) => value,
    },
    {
      id: "radio-receiver-bands",
      label: "Radio receiver bands",
      left: left.radioReceiverBands?.length
        ? `${left.radioReceiverBands.join(" / ")} · ${
          left.radioReceiverBandStatus === "unconfigured"
            ? "no radio plan"
            : left.radioReceiverBandStatus
        }`
        : "Receiver bands unverified",
      right: right.radioReceiverBands?.length
        ? `${right.radioReceiverBands.join(" / ")} · ${
          right.radioReceiverBandStatus === "unconfigured"
            ? "no radio plan"
            : right.radioReceiverBandStatus
        }`
        : "Receiver bands unverified",
      format: (value) => value,
    },
    {
      id: "bench-evidence",
      label: "Imported bench evidence",
      left: left.benchEvidenceLabel,
      right: right.benchEvidenceLabel,
      format: (value) => value,
    },
    {
      id: "total-weight",
      label: "Catalog weight",
      left: left.totalWeight,
      right: right.totalWeight,
      format: (value) => `${value.toFixed(1)} g`,
      lowerIsBetter: true,
    },
    {
      id: "total-price",
      label: "Catalog price",
      left: left.totalPrice,
      right: right.totalPrice,
      format: (value) => `$${value.toFixed(2)}`,
      lowerIsBetter: true,
    },
  ];
  return rows.map((row) => ({
    ...row,
    changed:
      comparisonValueKey(row.left) !== comparisonValueKey(row.right),
  }));
}
