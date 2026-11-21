export const MM_TO_SCENE = 0.001;

export const COMPONENT_FALLBACK_DIMENSIONS_MM = {
  frame: [220, 30, 190],
  motor: [27, 30, 27],
  propeller: [127, 7, 127],
  battery: [76, 35, 38],
  esc: [45, 8, 40],
  flight_controller: [36, 8, 36],
  receiver: [24, 7, 18],
};

export const MOTOR_CORNER_ORDER = ["upperLeft", "upperRight", "lowerRight", "lowerLeft"];

// A conventional quad-X "props-out" layout alternates handedness diagonally.
// The matching CW/CCW GLBs share the same hub coordinate system.
export const PROPELLER_HANDEDNESS_BY_CORNER = {
  upperLeft: "CCW",
  upperRight: "CW",
  lowerRight: "CCW",
  lowerLeft: "CW",
};

// Exploded inspection keeps every X/Z mounting coordinate unchanged. Each
// layer moves upward along the same Y axis; zero restores the assembled pose.
export const EXPLODED_LAYER_OFFSETS_MM = Object.freeze({
  frame: 0,
  motor: 0,
  esc: 60,
  flight_controller: 90,
  receiver: 120,
  propeller: 75,
  battery: 170,
});

const numericVector = (value) =>
  Array.isArray(value) && value.length === 3 && value.every(Number.isFinite) ? value : null;
const numericPattern = (value) => (
  Array.isArray(value)
  && value.length === 2
  && value.every(Number.isFinite)
  && value.every((axis) => axis > 0)
    ? value
    : null
);

function patternKey(pattern) {
  return pattern ? `${pattern[0]}x${pattern[1]}` : null;
}

const GEOMETRY_CONFIDENCE = Object.freeze({
  verified: 0,
  measured: 1,
  estimated: 2,
  fallback: 3,
  awaiting: 4,
});

function weakestGeometryStatus(...statuses) {
  return statuses.reduce((weakest, status) => (
    GEOMETRY_CONFIDENCE[status] > GEOMETRY_CONFIDENCE[weakest]
      ? status
      : weakest
  ), "verified");
}

function metadataConfidence(part, fields = []) {
  if (!part?.id) return "awaiting";
  const measuredFields = Array.isArray(part.measuredFields)
    ? part.measuredFields
    : [];
  if (fields.some((field) => measuredFields.includes(field))) {
    return "measured";
  }
  const estimatedFields = Array.isArray(part.estimatedFields)
    ? part.estimatedFields
    : [];
  if (fields.some((field) => estimatedFields.includes(field))) {
    return "estimated";
  }
  if (!part.sourceUrl && !part.dataStatus) return "estimated";
  return "verified";
}

function dimensionsConfidence(part) {
  if (!part?.id) return "awaiting";
  if (part.measuredFields?.includes("dimensionsMm")) return "measured";
  if (!numericVector(part.dimensionsMm)) return "fallback";
  return metadataConfidence(part, ["dimensionsMm"]);
}

export function toSceneVectorMm(value, fallback = [0, 0, 0]) {
  const source = numericVector(value) || fallback;
  return source.map((axis) => Number(axis) * MM_TO_SCENE);
}

export function getFallbackDimensionsMm(type, part = {}) {
  const explicit = numericVector(part.dimensionsMm);
  if (explicit) return explicit;

  if (type === "frame") {
    const wheelbase = Number(part.size);
    if (Number.isFinite(wheelbase) && wheelbase > 0) {
      const span = wheelbase * 0.86;
      return [span, 30, span];
    }
  }

  if (type === "motor") {
    const match = String(part.size || "").match(/^(\d{2})(\d{2})/);
    if (match) {
      const statorDiameter = Number(match[1]) || 22;
      const statorHeight = Number(match[2]) || 7;
      return [statorDiameter + 5, statorHeight + 19, statorDiameter + 5];
    }
  }

  if (type === "propeller" && Number.isFinite(Number(part.size))) {
    const diameter = Number(part.size) * 25.4;
    return [diameter, Number(part.hubThicknessMm) || 7, diameter];
  }

  return [...COMPONENT_FALLBACK_DIMENSIONS_MM[type]];
}

export function getPropellerHubDiameterMm(propeller = {}) {
  const explicit = Number(propeller.hubDiameterMm);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const diameter = getFallbackDimensionsMm("propeller", propeller)[0];
  return Math.min(Math.max(diameter * 0.12, 6), 16);
}

export function getPropellerSweepDiameterMm(propeller = {}) {
  return getFallbackDimensionsMm("propeller", propeller)[0];
}

export function getMotorMountOutlineMm(motor = {}) {
  const pattern = numericPattern(motor.mountingPatternMm);
  if (!pattern) return null;
  const halfWidth = pattern[0] / 2;
  const halfDepth = pattern[1] / 2;
  return [
    [-halfWidth, 0, -halfDepth],
    [halfWidth, 0, -halfDepth],
    [halfWidth, 0, halfDepth],
    [-halfWidth, 0, halfDepth],
    [-halfWidth, 0, -halfDepth],
  ];
}

export function getFrameMountPointsMm(frame = {}) {
  const named = [
    numericVector(frame.upper_left_motor_position),
    numericVector(frame.upper_right_motor_position),
    numericVector(frame.lower_right_motor_position),
    numericVector(frame.lower_left_motor_position),
  ];
  if (named.every(Boolean)) return named;

  const wheelbase = Number(frame.size) || COMPONENT_FALLBACK_DIMENSIONS_MM.frame[0];
  const motorOffset = wheelbase / (2 * Math.sqrt(2));
  const y = Number(frame.deckOffsetMm) || 4.75;
  return [
    [-motorOffset, y, -motorOffset],
    [motorOffset, y, -motorOffset],
    [motorOffset, y, motorOffset],
    [-motorOffset, y, motorOffset],
  ];
}

export function getMotorOriginsMm(frame, motor) {
  // Imported models are normalized to a base-center anchor in the viewer.
  // Frame corner coordinates therefore map directly to motor root positions.
  return getFrameMountPointsMm(frame, motor);
}

export function getPropellerOriginsMm(frame, motor, propeller) {
  const motorOrigins = getMotorOriginsMm(frame, motor);
  const motorHeightMm = getFallbackDimensionsMm("motor", motor)[1];
  const propMount = numericVector(propeller?.mounting_point) || [0, 0, 0];
  const shaftClearanceMm = 2;

  return motorOrigins.map((origin, index) => {
    const shaftTopY = origin[1] + motorHeightMm;
    return [
      origin[0] - propMount[0],
      shaftTopY + shaftClearanceMm - propMount[1],
      origin[2] - propMount[2],
      PROPELLER_HANDEDNESS_BY_CORNER[MOTOR_CORNER_ORDER[index]],
    ];
  });
}

export function getStackLevelsMm(frame = {}, parts = {}) {
  const frameHeight = getFallbackDimensionsMm("frame", frame)[1];
  const startY = Math.max(Number(frame.stackHeight) || 0, frameHeight + 3);
  const gap = 1.5;
  let top = startY;

  return ["esc", "flightController", "receiver"].reduce((levels, type) => {
    const part = parts[type];
    if (!part) return levels;
    const height = getFallbackDimensionsMm(
      type === "flightController" ? "flight_controller" : type,
      part,
    )[1];
    levels[type] = top;
    top += height + gap;
    return levels;
  }, {});
}

export function getStackTopMm(frame = {}, parts = {}) {
  const levels = getStackLevelsMm(frame, parts);
  return Object.entries(levels).reduce((top, [type, level]) => {
    const height = getFallbackDimensionsMm(
      type === "flightController" ? "flight_controller" : type,
      parts[type],
    )[1];
    return Math.max(top, level + height);
  }, getFallbackDimensionsMm("frame", frame)[1]);
}

export function getBatteryPlacementMm(frame = {}, battery = {}, parts = {}) {
  const frameDims = getFallbackDimensionsMm("frame", frame);
  const batteryDims = getFallbackDimensionsMm("battery", battery);
  const frameTop = getStackTopMm(frame, parts);
  const mount = numericVector(battery.mounting_point) || [0, 0, 0];

  return {
    origin: [
      mount[0],
      frameTop + 2 - mount[1],
      mount[2] - Math.min(frameDims[2] * 0.15, 18),
    ],
    size: batteryDims,
  };
}

export function getPropellerVariant(index) {
  return PROPELLER_HANDEDNESS_BY_CORNER[MOTOR_CORNER_ORDER[index]] || "CCW";
}

export function getExplodedOffsetMm(componentType, exploded = false) {
  if (!exploded) return 0;
  return EXPLODED_LAYER_OFFSETS_MM[componentType] || 0;
}

export function buildViewerPlacementAudit(frame = null, parts = {}) {
  const hasFrame = Boolean(frame?.id);
  const mounts = hasFrame ? getFrameMountPointsMm(frame) : [];
  const namedMounts = hasFrame && [
    frame.upper_left_motor_position,
    frame.upper_right_motor_position,
    frame.lower_right_motor_position,
    frame.lower_left_motor_position,
  ].every((position) => numericVector(position));
  const frameMountStatus = !hasFrame
    ? "awaiting"
    : namedMounts
      ? metadataConfidence(frame, ["motor positions", "motorPositions"])
      : "fallback";
  const checks = [{
    id: "frame-mounts",
    label: "Frame motor mounts",
    status: frameMountStatus,
    detail: !hasFrame
      ? "Select a frame to resolve four mounting centers."
      : frameMountStatus === "verified"
        ? "Four named, source-backed frame coordinates resolve to motor mounting centers."
        : frameMountStatus === "estimated"
          ? "Explicit mount coordinates are present, but the catalog marks their source as estimated."
          : "Mounting centers are generated from wheelbase because explicit coordinates are unavailable.",
  }];

  const motorOrigins = hasFrame && parts.motor
    ? getMotorOriginsMm(frame, parts.motor)
    : [];
  const motorsAligned = motorOrigins.length === 4 && motorOrigins.every((origin, index) => (
    origin.every((value, axis) => (
      Math.abs(value - mounts[index][axis]) < 1e-9
    ))
  ));
  checks.push({
    id: "motor-roots",
    label: "Four motor roots",
    status: motorsAligned ? frameMountStatus : "awaiting",
    detail: motorsAligned
      ? frameMountStatus === "verified"
        ? "All four source-backed motor root origins use the frame mount coordinates."
        : "All four motor roots use the available frame coordinates, whose source is estimated or fallback geometry."
      : !parts.motor
        ? "Select motors to place motor roots."
        : "Select a frame to resolve motor mount coordinates.",
  });

  const propellerOrigins = motorsAligned && parts.propeller
    ? getPropellerOriginsMm(frame, parts.motor, parts.propeller)
    : [];
  const motorHeight = getFallbackDimensionsMm("motor", parts.motor || {})[1];
  const propellersAligned = propellerOrigins.length === 4
    && propellerOrigins.every((origin, index) => (
      Math.abs(origin[0] - motorOrigins[index][0]) < 1e-9
      && Math.abs(origin[2] - motorOrigins[index][2]) < 1e-9
      && origin[1] > motorOrigins[index][1] + motorHeight
    ));
  checks.push({
    id: "propeller-shafts",
    label: "Propeller-to-shaft alignment",
    status: propellersAligned
      ? weakestGeometryStatus(
          frameMountStatus,
          metadataConfidence(parts.motor, ["mounting_point"]),
          metadataConfidence(parts.propeller, ["mounting_point"]),
        )
      : "awaiting",
    detail: propellersAligned
      ? "Four propeller origins share each motor's X/Z axis and sit above the motor top at the available source confidence."
      : !parts.propeller
        ? "Select propellers to check hub placement above the motor shafts."
        : !parts.motor
          ? "Select motors to resolve four propeller shaft positions."
          : "Select a frame to resolve propeller placement.",
  });

  const stackParts = {
    esc: parts.esc || null,
    flightController: parts.flightController || null,
    receiver: parts.receiver || null,
  };
  const levels = hasFrame ? getStackLevelsMm(frame, stackParts) : {};
  const selectedStackTypes = Object.keys(stackParts).filter((type) => stackParts[type]);
  const electronicsComplete = selectedStackTypes.length === 3;
  const escHeight = getFallbackDimensionsMm("esc", stackParts.esc || {})[1];
  const fcHeight = getFallbackDimensionsMm(
    "flight_controller",
    stackParts.flightController || {},
  )[1];
  const electronicsOrdered = electronicsComplete
    && levels.esc < levels.flightController
    && levels.esc + escHeight <= levels.flightController
    && levels.flightController < levels.receiver
    && levels.flightController + fcHeight <= levels.receiver;
  checks.push({
    id: "electronics-stack",
    label: "Electronics stack order",
    status: electronicsOrdered
      ? weakestGeometryStatus(
          metadataConfidence(frame, ["stackHeight", "dimensionsMm"]),
          dimensionsConfidence(stackParts.esc),
          dimensionsConfidence(stackParts.flightController),
          dimensionsConfidence(stackParts.receiver),
        )
      : "awaiting",
    detail: electronicsOrdered
      ? "ESC, flight controller, and receiver occupy separated ascending levels at the available source confidence."
      : !hasFrame
        ? "Select a frame to resolve the electronics stack base."
        : "Select ESC, flight controller, and receiver to verify stack order.",
  });

  const hasElectronics = selectedStackTypes.length > 0;
  const batteryPlacement = hasFrame && parts.battery && hasElectronics
    ? getBatteryPlacementMm(frame, parts.battery, stackParts)
    : null;
  const batteryClearsStack = Boolean(
    batteryPlacement && batteryPlacement.origin[1] > getStackTopMm(frame, stackParts),
  );
  checks.push({
    id: "battery-clearance",
    label: "Battery above electronics",
    status: batteryClearsStack
      ? weakestGeometryStatus(
          metadataConfidence(frame, ["stackHeight", "dimensionsMm"]),
          dimensionsConfidence(parts.battery),
          dimensionsConfidence(stackParts.esc),
          dimensionsConfidence(stackParts.flightController),
          dimensionsConfidence(stackParts.receiver),
        )
      : "awaiting",
    detail: batteryClearsStack
      ? "The battery origin clears the highest selected electronics component."
      : !hasFrame
        ? "Select a frame to resolve battery placement."
        : !parts.battery
          ? "Select a battery to check clearance above the electronics."
          : "Select electronics to establish the stack height.",
  });

  const motorPattern = numericPattern(parts.motor?.mountingPatternMm);
  const frameMotorPatterns = Array.isArray(parts.motor ? frame?.motorMountPatternsMm : null)
    ? frame.motorMountPatternsMm.map(numericPattern).filter(Boolean)
    : [];
  const motorInterfaceKnown = Boolean(motorPattern && frameMotorPatterns.length);
  const motorInterfaceMatches = motorInterfaceKnown
    && frameMotorPatterns.some(
      (pattern) => patternKey(pattern) === patternKey(motorPattern),
    );
  checks.push({
    id: "motor-interface",
    label: "Motor mount interface",
    status: motorInterfaceKnown
      ? motorInterfaceMatches
        ? weakestGeometryStatus(
            metadataConfidence(frame, ["motorMountPatternsMm"]),
            metadataConfidence(parts.motor, ["mountingPatternMm"]),
          )
        : "conflict"
      : "awaiting",
    detail: motorInterfaceKnown
      ? motorInterfaceMatches
        ? `The motor's ${patternKey(motorPattern)} mm pattern is listed by the frame.`
        : `The motor's ${patternKey(motorPattern)} mm pattern is not among the frame's listed patterns.`
      : !parts.motor
        ? "Select motors to compare mounting patterns."
        : "Frame or motor mounting-pattern metadata is incomplete.",
  });

  const propShaft = Number(parts.motor?.propShaftMm);
  const propBore = Number(parts.propeller?.shaftMm);
  const propHubKnown = Number.isFinite(propShaft)
    && propShaft > 0
    && Number.isFinite(propBore)
    && propBore > 0;
  const propHubMatches = propHubKnown && propShaft === propBore;
  checks.push({
    id: "propeller-hub",
    label: "Propeller hub interface",
    status: propHubKnown
      ? propHubMatches
        ? weakestGeometryStatus(
            metadataConfidence(parts.motor, ["propShaftMm"]),
            metadataConfidence(parts.propeller, ["shaftMm"]),
          )
        : "conflict"
      : "awaiting",
    detail: propHubKnown
      ? propHubMatches
        ? `The propeller's ${propBore} mm bore matches the motor's ${propShaft} mm shaft.`
        : `The propeller's ${propBore} mm bore does not match the motor's ${propShaft} mm shaft.`
      : !parts.propeller
        ? "Select propellers to compare shaft and bore."
        : "Motor shaft or propeller bore metadata is incomplete.",
  });

  const propellerDiameter = parts.propeller
    ? getFallbackDimensionsMm("propeller", parts.propeller)[0]
    : null;
  let minimumSweepClearance = null;
  if (propellersAligned && propellerDiameter) {
    for (let left = 0; left < propellerOrigins.length; left += 1) {
      for (let right = left + 1; right < propellerOrigins.length; right += 1) {
        const dx = propellerOrigins[left][0] - propellerOrigins[right][0];
        const dz = propellerOrigins[left][2] - propellerOrigins[right][2];
        const clearance = Math.hypot(dx, dz) - propellerDiameter;
        minimumSweepClearance = minimumSweepClearance == null
          ? clearance
          : Math.min(minimumSweepClearance, clearance);
      }
    }
  }
  checks.push({
    id: "propeller-sweep",
    label: "Propeller sweep separation",
    status: minimumSweepClearance == null
      ? "awaiting"
      : minimumSweepClearance >= 0
        ? weakestGeometryStatus(
            frameMountStatus,
            dimensionsConfidence(parts.propeller),
          )
        : "conflict",
    detail: minimumSweepClearance == null
      ? "Select motors and propellers to resolve sweep separation."
      : minimumSweepClearance >= 0
        ? `The closest propeller discs leave ${minimumSweepClearance.toFixed(1)} mm between tips.`
        : `The closest propeller discs overlap by ${Math.abs(minimumSweepClearance).toFixed(1)} mm.`,
  });

  return {
    checks,
    verifiedCount: checks.filter((check) => check.status === "verified").length,
    measuredCount: checks.filter((check) => check.status === "measured").length,
    estimatedCount: checks.filter((check) => check.status === "estimated").length,
    fallbackCount: checks.filter((check) => check.status === "fallback").length,
    awaitingCount: checks.filter((check) => check.status === "awaiting").length,
    conflictCount: checks.filter((check) => check.status === "conflict").length,
    assembledCount: checks.filter((check) => (
      ["verified", "measured", "estimated", "fallback"].includes(check.status)
    )).length,
    complete: checks.every((check) => check.status === "verified"),
    scope: "viewer-placement",
  };
}
