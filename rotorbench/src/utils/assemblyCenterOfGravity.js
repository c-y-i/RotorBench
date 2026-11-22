import {
  getBatteryPlacementMm,
  getFallbackDimensionsMm,
  getMotorOriginsMm,
  getPropellerOriginsMm,
  getStackLevelsMm,
} from "../assembly/assemblyTransforms";
import { getFrameServoHardware } from "./frameHardware";

const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const vector = (value) => (
  Array.isArray(value)
  && value.length === 3
  && value.every((axis) => Number.isFinite(Number(axis)))
    ? value.map(Number)
    : null
);

function averagePosition(positions) {
  if (!positions.length) return null;
  return [0, 1, 2].map(
    (axis) => positions.reduce((sum, position) => sum + position[axis], 0)
      / positions.length,
  );
}

function shifted(position, offset) {
  return position.map((value, axis) => value + offset[axis]);
}

function round(value, precision = 1) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

export function estimateAssemblyCenterOfGravity(parts = {}) {
  const frame = parts.frame;
  if (!frame?.id) {
    return {
      status: "unavailable",
      reason: "Select a frame to resolve assembly positions and estimate center of gravity.",
      contributions: [],
      missingWeights: [],
      missingPlacements: [],
      massG: 0,
      cgMm: null,
      planarOffsetMm: null,
      frameEnvelopeMm: null,
    };
  }

  const contributions = [];
  const missingWeights = [];
  const missingPlacements = [];
  const selectedPartCount = Object.values(parts).filter((part) => part?.id).length;

  const addContribution = ({
    id,
    label,
    part,
    unitWeightG,
    positions,
  }) => {
    if (!part?.id) return;
    const weight = positive(unitWeightG ?? part.weight);
    if (!weight) {
      missingWeights.push(label);
      return;
    }
    const placed = positions.map(vector).filter(Boolean);
    if (!placed.length) {
      missingPlacements.push(label);
      return;
    }
    const massG = weight * placed.length;
    contributions.push({
      id,
      label,
      quantity: placed.length,
      unitWeightG: round(weight, 2),
      massG: round(massG, 2),
      positionMm: averagePosition(placed).map((value) => round(value, 1)),
    });
  };

  const frameDimensions = getFallbackDimensionsMm("frame", frame);
  addContribution({
    id: "frame",
    label: frame.name || "Frame",
    part: frame,
    positions: [[0, frameDimensions[1] / 2, 0]],
  });

  if (parts.motor?.id) {
    const motorHeight = getFallbackDimensionsMm("motor", parts.motor)[1];
    addContribution({
      id: "motors",
      label: `${parts.motor.name || "Motors"} ×${getMotorOriginsMm(frame, parts.motor).length}`,
      part: parts.motor,
      positions: getMotorOriginsMm(frame, parts.motor).map(
        (origin) => shifted(origin, [0, motorHeight / 2, 0]),
      ),
    });
  }

  if (parts.propeller?.id && parts.motor?.id) {
    const propellerHeight = getFallbackDimensionsMm(
      "propeller",
      parts.propeller,
    )[1];
    const propellerOrigins = getPropellerOriginsMm(
      frame,
      parts.motor,
      parts.propeller,
    );
    addContribution({
      id: "propellers",
      label: `${parts.propeller.name || "Propellers"} ×${propellerOrigins.length}`,
      part: parts.propeller,
      positions: propellerOrigins.map(
        (origin) => shifted(origin.slice(0, 3), [0, propellerHeight / 2, 0]),
      ),
    });
  }

  const stackParts = {
    esc: parts.esc || null,
    flightController: parts.flightController || null,
    receiver: parts.receiver || null,
  };
  const stackLevels = getStackLevelsMm(frame, stackParts);
  for (const [key, fallbackType] of [
    ["esc", "esc"],
    ["flightController", "flight_controller"],
    ["receiver", "receiver"],
  ]) {
    const part = stackParts[key];
    if (!part?.id) continue;
    const height = getFallbackDimensionsMm(fallbackType, part)[1];
    addContribution({
      id: key,
      label: part.name,
      part,
      positions: [[0, stackLevels[key] + height / 2, 0]],
    });
  }

  if (parts.battery?.id) {
    const placement = getBatteryPlacementMm(frame, parts.battery, stackParts);
    addContribution({
      id: "battery",
      label: parts.battery.name || "Battery",
      part: parts.battery,
      positions: [shifted(placement.origin, [0, placement.size[1] / 2, 0])],
    });
  }

  const servoHardware = getFrameServoHardware(frame);
  if (servoHardware) {
    const servoHeight = vector(servoHardware.dimensionsMm)?.[1] || 2;
    addContribution({
      id: "servos",
      label: `${servoHardware.name} ×${servoHardware.quantity}`,
      part: {
        id: `${frame.id}:servos`,
        weight: positive(servoHardware.unitWeightG)
          || (servoHardware.weight / servoHardware.quantity),
      },
      positions: servoHardware.positionsMm.map(
        (position) => shifted(position, [0, servoHeight / 2, 0]),
      ),
    });
  }

  const massG = contributions.reduce((sum, item) => sum + item.massG, 0);
  if (massG <= 0) {
    return {
      status: "unavailable",
      reason: "No selected component has both a catalog mass and a resolved assembly position.",
      contributions,
      missingWeights,
      missingPlacements,
      massG: 0,
      cgMm: null,
      planarOffsetMm: null,
      frameEnvelopeMm: [frameDimensions[0], frameDimensions[2]],
    };
  }

  const cgMm = [0, 1, 2].map(
    (axis) => contributions.reduce(
      (sum, item) => sum + item.positionMm[axis] * item.massG,
      0,
    ) / massG,
  );
  for (const item of contributions) {
    item.sharePct = round((item.massG / massG) * 100, 1);
  }
  contributions.sort((left, right) => right.massG - left.massG);

  return {
    status: missingWeights.length || missingPlacements.length
      ? "partial"
      : "available",
    reason: missingWeights.length || missingPlacements.length
      ? "Some selected components lack a catalog mass or resolved assembly position."
      : "All selected components with assembly roles have catalog masses and resolved planning positions.",
    contributions,
    missingWeights,
    missingPlacements,
    selectedPartCount,
    placedPartCount: contributions.length,
    massG: round(massG, 2),
    cgMm: cgMm.map((value) => round(value, 1)),
    planarOffsetMm: {
      lateral: round(cgMm[0], 1),
      longitudinal: round(cgMm[2], 1),
      magnitude: round(Math.hypot(cgMm[0], cgMm[2]), 1),
    },
    frameEnvelopeMm: [frameDimensions[0], frameDimensions[2]],
    scope: "catalog mass at inferred or measured assembly origins; not a measured aircraft CG",
  };
}

export function buildCenterOfGravityReport(estimate, buildName = "Untitled build") {
  if (!estimate || estimate.status === "unavailable") {
    return [
      "# RotorBench center-of-gravity estimate",
      `# Build: ${buildName}`,
      "# Unavailable: select a frame and components with catalog mass and resolved positions.",
    ].join("\n");
  }
  return [
    "# RotorBench center-of-gravity estimate",
    `# Build: ${buildName}`,
    `# Status: ${estimate.status}`,
    `# Placed catalog mass: ${estimate.massG} g`,
    `# Lateral offset (X): ${estimate.planarOffsetMm.lateral} mm`,
    `# Longitudinal offset (Z, positive toward tail): ${estimate.planarOffsetMm.longitudinal} mm`,
    `# Planar offset magnitude: ${estimate.planarOffsetMm.magnitude} mm`,
    "",
    "## Contributions",
    ...estimate.contributions.map((item) => (
      `- ${item.label}: ${item.massG} g (${item.sharePct}%) at X ${item.positionMm[0]} / Y ${item.positionMm[1]} / Z ${item.positionMm[2]} mm`
    )),
    "",
    ...(estimate.missingWeights.length
      ? [`Missing masses: ${estimate.missingWeights.join(", ")}`]
      : []),
    ...(estimate.missingPlacements.length
      ? [`Missing placements: ${estimate.missingPlacements.join(", ")}`]
      : []),
    "",
    "# Catalog mass at inferred or measured assembly origins is not a measured aircraft CG.",
    "# The 50 g build allowance is excluded because its location is unknown.",
    "# Balance the physical aircraft before flight.",
  ].join("\n");
}
