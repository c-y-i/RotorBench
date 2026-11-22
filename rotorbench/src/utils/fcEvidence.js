import { getBoardProfile } from "../data/flightControllerProfiles";
import { buildAerialKitRouteSummary } from "./aerialKitWaypoints";

const STATUS_PROTOCOLS = new Set(["akp", "betaflight"]);
const PREFLIGHT_VERDICTS = {
  0: { status: "fail", label: "Fail" },
  1: { status: "pass", label: "Pass" },
  2: { status: "fact", label: "Fact" },
};
const BETAFLIGHT_ARMING_DISABLE_FLAGS = [
  "No gyro",
  "Failsafe",
  "RX failsafe",
  "Not disarmed",
  "Box failsafe",
  "Runaway takeoff",
  "Crash detected",
  "Throttle",
  "Angle",
  "Boot grace time",
  "No prearm",
  "Load",
  "Calibrating",
  "CLI",
  "CMS menu",
  "BST",
  "MSP",
  "Paralyze",
  "GPS",
  "Rescue",
  "DShot telemetry",
  "Reboot required",
  "DShot bitbang",
  "Accelerometer calibration",
  "Motor protocol",
  "Crash flip",
  "Altitude hold",
  "Position hold",
  "Autopilot",
  "Arm switch",
];
const BETAFLIGHT_FAILSAFE_MASK = (1 << 1) | (1 << 2);
const RC_PROTOCOLS = new Set(["akp", "betaflight"]);
const RC_FRESHNESS_LIMIT_MS = 10 * 60 * 1000;
export const AK_FEATURE_NAMES = Object.freeze([
  { bit: 1 << 0, name: "PARAM_INFO", label: "Parameter metadata" },
  { bit: 1 << 1, name: "PARAM_DEFAULT", label: "Parameter defaults" },
  { bit: 1 << 2, name: "APPLIES_ON_WRITE", label: "Apply on write" },
  { bit: 1 << 3, name: "GATES_ON_ARMED", label: "Armed write gate" },
  { bit: 1 << 4, name: "RC_CHANNELS", label: "RC channel readback" },
  { bit: 1 << 5, name: "SENSOR_INFO", label: "Sensor metadata" },
  { bit: 1 << 6, name: "OUTPUT_INFO", label: "Output metadata" },
  { bit: 1 << 7, name: "OUTPUT_TEST", label: "Output test" },
  { bit: 1 << 8, name: "LOG_STREAM", label: "Log stream" },
  { bit: 1 << 9, name: "PREFLIGHT", label: "Preflight report" },
  { bit: 1 << 10, name: "CALIBRATE", label: "Calibration" },
  { bit: 1 << 11, name: "MISSION", label: "Mission protocol" },
  { bit: 1 << 12, name: "PERF", label: "Performance profile" },
  { bit: 1 << 13, name: "MOTOR_TELEMETRY", label: "Motor telemetry" },
]);
const AK_KNOWN_FEATURE_MASK = AK_FEATURE_NAMES.reduce(
  (mask, feature) => mask | feature.bit,
  0,
);

function finiteNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sensorNumber(value) {
  return finiteNumber(value, null);
}

function sensorBoolean(value) {
  return value === true;
}

function sensorVector(value, length = 3) {
  if (!Array.isArray(value) || value.length !== length) return null;
  const numbers = value.map(sensorNumber);
  return numbers.every((number) => number != null) ? numbers : null;
}

function sensorString(value) {
  return typeof value === "string" ? value : null;
}

function normalizedSensorBody(topic, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (topic === 0) {
    return {
      driver: sensorString(body.driver),
      absent: sensorNumber(body.absent),
      absentReason: sensorString(body.absentReason),
      whoami: sensorNumber(body.whoami),
      accelMg: sensorVector(body.accelMg),
      gyroMradS: sensorVector(body.gyroMradS),
      alignDeg: sensorVector(body.alignDeg),
      gyroBiasMdps: sensorVector(body.gyroBiasMdps),
      samples: sensorNumber(body.samples),
      errors: sensorNumber(body.errors),
    };
  }
  if (topic === 1) {
    return {
      driver: sensorString(body.driver),
      pressurePa: sensorNumber(body.pressurePa),
      temperatureC: sensorNumber(body.temperatureC),
      haveReference: sensorBoolean(body.haveReference),
      referencePa: sensorNumber(body.referencePa),
      heightCm: sensorNumber(body.heightCm),
      haveGpsReference: sensorBoolean(body.haveGpsReference),
      fusedCm: sensorNumber(body.fusedCm),
      samples: sensorNumber(body.samples),
      errors: sensorNumber(body.errors),
      fails: sensorNumber(body.fails),
      baroSamples: sensorNumber(body.baroSamples),
      gpsSamples: sensorNumber(body.gpsSamples),
    };
  }
  if (topic === 2) {
    return {
      driver: sensorString(body.driver),
      address: sensorNumber(body.address),
      maxMm: sensorNumber(body.maxMm),
      distanceMm: sensorNumber(body.distanceMm),
      ageMs: sensorNumber(body.ageMs),
      samples: sensorNumber(body.samples),
      outOfRange: sensorNumber(body.outOfRange),
      rejected: sensorNumber(body.rejected),
      faults: sensorNumber(body.faults),
      fails: sensorNumber(body.fails),
      landMm: sensorNumber(body.landMm),
      agreeCm: sensorNumber(body.agreeCm),
    };
  }
  if (topic === 3) {
    return {
      ready: sensorBoolean(body.ready),
      haveReading: sensorBoolean(body.haveReading),
      state: sensorNumber(body.state),
      stateName: sensorString(body.stateName),
      cells: sensorNumber(body.cells),
      volts: sensorNumber(body.volts),
      voltsPerCell: sensorNumber(body.voltsPerCell),
      pinMv: sensorNumber(body.pinMv),
      ratio: sensorNumber(body.ratio),
      rth: sensorBoolean(body.rth),
      warnCellV: sensorNumber(body.warnCellV),
      criticalCellV: sensorNumber(body.criticalCellV),
      samples: sensorNumber(body.samples),
      rejected: sensorNumber(body.rejected),
      returns: sensorNumber(body.returns),
    };
  }
  if (topic === 4) {
    return {
      haveFix: sensorBoolean(body.haveFix),
      fixType: sensorNumber(body.fixType),
      fixName: sensorString(body.fixName),
      fixOk: sensorBoolean(body.fixOk),
      satellites: sensorNumber(body.satellites),
      validNow: sensorBoolean(body.validNow),
      lat: sensorNumber(body.lat),
      lon: sensorNumber(body.lon),
      altMslMm: sensorNumber(body.altMslMm),
      speedMmS: sensorNumber(body.speedMmS),
      courseDeg: sensorNumber(body.courseDeg),
      haveHome: sensorBoolean(body.haveHome),
      homeLat: sensorNumber(body.homeLat),
      homeLon: sensorNumber(body.homeLon),
      homeDistanceM: sensorNumber(body.homeDistanceM),
      homeBearingDeg: sensorNumber(body.homeBearingDeg),
      returning: sensorBoolean(body.returning),
      rthEnabled: sensorBoolean(body.rthEnabled),
      fixes: sensorNumber(body.fixes),
      dropped: sensorNumber(body.dropped),
      configSends: sensorNumber(body.configSends),
    };
  }
  return null;
}

function normalizedPerformanceWindow(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!["ok", "none"].includes(value.status)) {
    throw new Error("The Aerial Kit performance window has an invalid status.");
  }
  const scalarFields = [
    "loops",
    "samples",
    "nominalUs",
    "periodLastUs",
    "periodMinUs",
    "periodMaxUs",
    "late",
    "jitterP50Us",
    "jitterP99Us",
    "jitterMaxUs",
    "jitterOver",
    "loadPermille",
  ];
  const scalars = Object.fromEntries(
    scalarFields.map((field) => [field, sensorNumber(value[field])]),
  );
  if (Object.values(scalars).some((number) => number == null)) {
    throw new Error("The Aerial Kit performance window has incomplete fields.");
  }
  const sectionAvgUsX10 = sensorVector(value.sectionAvgUsX10, 5);
  const sectionMaxUs = sensorVector(value.sectionMaxUs, 5);
  if (!sectionAvgUsX10 || !sectionMaxUs) {
    throw new Error("The Aerial Kit performance window has incomplete sections.");
  }
  return {
    status: value.status,
    ...scalars,
    sectionAvgUsX10,
    sectionMaxUs,
    observedAtMs: timestampMilliseconds(value.observedAt),
  };
}

const MOTOR_TELEMETRY_FLAGS = Object.freeze([
  { bit: 1 << 0, name: "measured" },
  { bit: 1 << 1, name: "rpm" },
  { bit: 1 << 2, name: "temperature" },
  { bit: 1 << 3, name: "voltage" },
  { bit: 1 << 4, name: "current" },
]);

function normalizedMotorTelemetry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!["ok", "none"].includes(value.status)) {
    throw new Error("The Aerial Kit motor telemetry has an invalid status.");
  }
  if (value.status === "none") {
    return {
      status: "none",
      count: 0,
      poles: 0,
      motors: [],
      observedAtMs: timestampMilliseconds(value.observedAt),
    };
  }
  const count = sensorNumber(value.count);
  const poles = sensorNumber(value.poles);
  if (
    !Number.isInteger(count)
    || count < 0
    || count > 4
    || !Number.isInteger(poles)
    || !Array.isArray(value.motors)
    || value.motors.length !== count
  ) {
    throw new Error("The Aerial Kit motor telemetry has an invalid motor list.");
  }
  const motors = value.motors.map((motor, index) => {
    const flags = sensorNumber(motor?.flags);
    if (!Number.isInteger(flags) || flags < 0 || flags > 0xff) {
      throw new Error(`Motor telemetry entry ${index} has invalid flags.`);
    }
    const nullable = (bit, field) => (
      (flags & bit) !== 0 ? sensorNumber(motor[field]) : null
    );
    const normalized = {
      index,
      flags,
      flagNames: MOTOR_TELEMETRY_FLAGS
        .filter((entry) => (flags & entry.bit) !== 0)
        .map((entry) => entry.name),
      measured: (flags & (1 << 0)) !== 0,
      erpm: sensorNumber(motor.erpm),
      rpm: nullable(1 << 1, "rpm"),
      temperature: nullable(1 << 2, "temperature"),
      maxTemperature: nullable(1 << 2, "maxTemperature"),
      millivolts: nullable(1 << 3, "millivolts"),
      milliamps: nullable(1 << 4, "milliamps"),
      packets: sensorNumber(motor.packets),
      invalid: sensorNumber(motor.invalid),
    };
    if (
      normalized.erpm == null
      || normalized.packets == null
      || normalized.invalid == null
    ) {
      throw new Error(`Motor telemetry entry ${index} has incomplete fields.`);
    }
    return normalized;
  });
  return {
    status: "ok",
    count,
    poles,
    motors,
    observedAtMs: timestampMilliseconds(value.observedAt),
  };
}

function normalizedLogInventory(value) {
  if (!Array.isArray(value)) return null;
  return value
    .filter((entry) => (
      entry
      && Number.isInteger(entry.requestedSource)
      && entry.requestedSource >= 0
      && entry.requestedSource <= 2
    ))
    .map((entry) => {
      const available = entry.status === "available";
      return {
        status: available ? "available" : "unavailable",
        requestedSource: entry.requestedSource,
        source: available && Number.isInteger(entry.source) ? entry.source : null,
        sourceName: available ? sensorString(entry.sourceName) : sensorString(entry.sourceName),
        count: available ? sensorNumber(entry.count) : null,
      };
    });
}

function normalizedLogRecord(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Log frame ${index} has no record body.`);
  }
  const version = sensorNumber(value.version);
  const bytes = sensorNumber(value.bytes);
  if (
    ![2, 3, 4].includes(version)
    || bytes !== ({ 2: 51, 3: 66, 4: 87 })[version]
  ) {
    throw new Error(`Log frame ${index} has an invalid record version.`);
  }
  const scalars = {
    timeMs: sensorNumber(value.timeMs),
    rollDeg: sensorNumber(value.rollDeg),
    pitchDeg: sensorNumber(value.pitchDeg),
    yawDeg: sensorNumber(value.yawDeg),
    altMm: sensorNumber(value.altMm),
    state: sensorNumber(value.state),
    flags: sensorNumber(value.flags),
    lat: sensorNumber(value.lat),
    lon: sensorNumber(value.lon),
    timeUs: sensorNumber(value.timeUs),
    vbatMv: sensorNumber(value.vbatMv),
  };
  if (
    scalars.timeMs == null
    || scalars.rollDeg == null
    || scalars.pitchDeg == null
    || scalars.yawDeg == null
    || scalars.altMm == null
    || scalars.state == null
    || scalars.flags == null
    || scalars.lat == null
    || scalars.lon == null
  ) {
    throw new Error(`Log frame ${index} has incomplete record fields.`);
  }
  const gyro = sensorVector(value.gyro);
  const accel = sensorVector(value.accel);
  const stick = sensorVector(value.stick, 4);
  const torque = sensorVector(value.torque);
  const motors = sensorVector(value.motors, 4);
  if (!gyro || !accel || !stick || !torque || !motors) {
    throw new Error(`Log frame ${index} has incomplete vector fields.`);
  }
  return {
    index,
    version,
    bytes,
    ...scalars,
    gyro,
    accel,
    stick,
    torque,
    motors,
    gyroFiltered: value.gyroFiltered == null
      ? null
      : sensorVector(value.gyroFiltered),
    notchHz: value.notchHz == null ? null : sensorVector(value.notchHz),
    notchEngaged: value.notchEngaged == null
      ? null
      : sensorVector(value.notchEngaged),
    rateSetpoint: value.rateSetpoint == null
      ? null
      : sensorVector(value.rateSetpoint),
    pidP: value.pidP == null ? null : sensorVector(value.pidP),
    pidI: value.pidI == null ? null : sensorVector(value.pidI),
    pidD: value.pidD == null ? null : sensorVector(value.pidD),
  };
}

function normalizedLogSample(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!Array.isArray(value.frames) || value.frames.length > 32) {
    throw new Error("The Aerial Kit log sample has an invalid frame list.");
  }
  const frames = value.frames.map((frame, index) => {
    if (
      !["record", "hole", "done"].includes(frame?.status)
      || !Number.isInteger(frame.source)
      || frame.source < 0
      || frame.source > 2
      || !Number.isInteger(frame.index)
      || frame.index < 0
      || frame.index > 0xffff
    ) {
      throw new Error(`Log sample frame ${index} has an invalid header.`);
    }
    return {
      status: frame.status,
      source: frame.source,
      sourceName: sensorString(frame.sourceName),
      index: frame.index,
      record: frame.status === "record"
        ? normalizedLogRecord(frame.record, frame.index)
        : null,
    };
  });
  return {
    source: sensorNumber(value.source),
    sourceName: sensorString(value.sourceName),
    first: sensorNumber(value.first),
    count: sensorNumber(value.count),
    requestedCount: sensorNumber(value.requestedCount),
    hz: sensorNumber(value.hz),
    records: frames.filter((frame) => frame.status === "record").length,
    holes: frames.filter((frame) => frame.status === "hole").length,
    done: frames.some((frame) => frame.status === "done"),
    noStream: value.noStream === true,
    frames,
    observedAtMs: timestampMilliseconds(value.observedAt),
  };
}

function normalizedTelemetryStream(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const requestedHz = sensorNumber(value.requestedHz);
  const agreedHz = sensorNumber(value.agreedHz);
  const frameCount = sensorNumber(value.frameCount);
  const uptimeWraps = sensorNumber(value.uptimeWraps);
  const uptimeRegressions = sensorNumber(value.uptimeRegressions);
  if (
    !Number.isInteger(requestedHz)
    || requestedHz < 0
    || requestedHz > 50
    || !Number.isInteger(agreedHz)
    || agreedHz < 0
    || agreedHz > 50
    || !Number.isInteger(frameCount)
    || frameCount < 0
    || !Number.isInteger(uptimeWraps)
    || uptimeWraps < 0
    || !Number.isInteger(uptimeRegressions)
    || uptimeRegressions < 0
  ) {
    throw new Error("The Aerial Kit telemetry stream has invalid rate or counters.");
  }
  const latestValue = value.latest;
  const latest = latestValue
    ? {
        uptimeMs: sensorNumber(latestValue.uptimeMs),
        flightState: sensorNumber(latestValue.flightState),
        linkLive: sensorNumber(latestValue.linkLive),
        gpsFixType: sensorNumber(latestValue.gpsFixType),
        gpsSatellites: sensorNumber(latestValue.gpsSatellites),
        rollDeg: sensorNumber(latestValue.rollDeg),
        pitchDeg: sensorNumber(latestValue.pitchDeg),
        yawDeg: sensorNumber(latestValue.yawDeg),
        latitude: sensorNumber(latestValue.latitude),
        longitude: sensorNumber(latestValue.longitude),
        motors: sensorVector(latestValue.motors, 4),
      }
    : null;
  if (
    latest
    && Object.entries(latest).some(([field, fieldValue]) => (
      field !== "motors" && fieldValue == null
    ))
  ) {
    throw new Error("The Aerial Kit telemetry stream has an incomplete latest frame.");
  }
  if (latest && !latest.motors) {
    throw new Error("The Aerial Kit telemetry stream is missing motor outputs.");
  }
  return {
    requestedHz,
    agreedHz,
    frameCount,
    firstUptimeMs: sensorNumber(value.firstUptimeMs),
    lastUptimeMs: sensorNumber(value.lastUptimeMs),
    uptimeElapsedMs: sensorNumber(value.uptimeElapsedMs),
    uptimeWraps,
    uptimeRegressions,
    startedAtMs: timestampMilliseconds(value.startedAt),
    stoppedAtMs: timestampMilliseconds(value.stoppedAt),
    lastObservedAtMs: timestampMilliseconds(value.lastObservedAt),
    latest,
  };
}

function normalizedMissionStatus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowedStatuses = ["ok", "no-verb", "no-navigator", "no-waypoints", "no-fix"];
  if (!allowedStatuses.includes(value.status)) {
    throw new Error("The Aerial Kit mission status is not one the protocol defines.");
  }
  const op = sensorNumber(value.op);
  if (!Number.isInteger(op) || op < 0 || op > 0xff) {
    throw new Error("The Aerial Kit mission status has an invalid operation byte.");
  }
  return {
    status: value.status,
    op,
    verb: sensorString(value.verb),
    active: value.active === true,
    requested: value.requested === true,
    count: sensorNumber(value.count),
    countCapped: value.countCapped === true,
    index: sensorNumber(value.index),
    channel: sensorNumber(value.channel),
    reached: sensorNumber(value.reached),
    started: sensorNumber(value.started),
    cancelled: sensorNumber(value.cancelled),
    holdAltMm: sensorNumber(value.holdAltMm),
    observedAtMs: timestampMilliseconds(value.observedAt),
  };
}

const CALIBRATION_RESULT_NAMES = Object.freeze({
  1: ["bias roll (mdps)", "bias pitch (mdps)", "bias yaw (mdps)"],
  2: ["centre (us)", "roll off centre (us)", "pitch off centre (us)", "yaw off centre (us)"],
  3: [
    "bias x (ug)",
    "bias y (ug)",
    "bias z (ug)",
    "scale x (x1e6)",
    "scale y (x1e6)",
    "scale z (x1e6)",
  ],
  4: ["ratio (x1e6)"],
});

function normalizedCalibrationStatus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowedStatuses = [
    "done",
    "no-such-verb",
    "aircraft-armed",
    "session-busy",
    "nothing-to-calibrate",
    "not-enough-still-samples",
    "implausible-result",
    "nothing-to-abort",
    "no-such-face",
    "invalid-value",
  ];
  if (!allowedStatuses.includes(value.status)) {
    throw new Error("The Aerial Kit calibration status is not one the protocol defines.");
  }
  const verbRaw = sensorNumber(value.verbRaw);
  const step = sensorNumber(value.step);
  const faces = sensorNumber(value.faces);
  const samples = sensorNumber(value.samples);
  const rejected = sensorNumber(value.rejected);
  const results = sensorVector(value.results, 6);
  if (
    !Number.isInteger(verbRaw)
    || verbRaw < 0
    || verbRaw > 0xff
    || !Number.isInteger(faces)
    || faces < 0
    || faces > 0xff
    || !Number.isInteger(samples)
    || samples < 0
    || !Number.isInteger(rejected)
    || rejected < 0
    || !results
  ) {
    throw new Error("The Aerial Kit calibration status has invalid counters or results.");
  }
  const resultNames = CALIBRATION_RESULT_NAMES[verbRaw] || [];
  return {
    status: value.status,
    verb: sensorString(value.verb),
    verbRaw,
    active: value.active === true,
    step: Number.isInteger(step) ? step : null,
    faces,
    facesDone: Array.from({ length: 6 }, (_, bit) => bit)
      .filter((bit) => (faces & (1 << bit)) !== 0).length,
    samples,
    rejected,
    results,
    resultNames,
    resultValues: resultNames.map((name, index) => ({
      name,
      value: results[index],
    })),
    observedAtMs: timestampMilliseconds(value.observedAt),
  };
}

function normalizedWaypointInventory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!["ok", "incomplete", "unavailable"].includes(value.status)) {
    throw new Error("The Aerial Kit waypoint inventory has an invalid status.");
  }
  const count = value.count == null ? null : sensorNumber(value.count);
  const availableSlots = sensorNumber(value.availableSlots);
  if (
    !Number.isInteger(availableSlots)
    || availableSlots < 0
    || (count != null && (!Number.isInteger(count) || count < 0 || count > 255))
  ) {
    throw new Error("The Aerial Kit waypoint inventory has invalid counts.");
  }
  const slots = Array.isArray(value.slots)
    ? value.slots.map((slot, fallbackIndex) => ({
        index: Number.isInteger(slot?.index) ? slot.index : fallbackIndex,
        lat: sensorNumber(slot?.lat),
        lon: sensorNumber(slot?.lon),
        rawLat: sensorString(slot?.rawLat),
        rawLon: sensorString(slot?.rawLon),
        complete: slot?.complete === true,
        errors: Array.isArray(slot?.errors)
          ? slot.errors.filter((error) => typeof error === "string")
          : [],
      }))
    : [];
  return {
    status: value.status,
    reason: sensorString(value.reason),
    count,
    availableSlots,
    slots,
    complete: value.complete === true,
    observedAtMs: timestampMilliseconds(value.observedAt),
  };
}

function identityField(identity, name) {
  const match = String(identity).match(
    new RegExp(`(?:^|\\s)${name}=([^\\s]+)`),
  );
  return match?.[1] || null;
}

function sanitizedIdentity(identity) {
  return String(identity)
    .replace(/(?:^|\s)(?:--port\s+)?\/dev\/\S+/g, "")
    .trim();
}

function uint32(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xffffffff) {
    throw new Error(`${label} is not an unsigned 32-bit value.`);
  }
  return number;
}

export function parseFcIdentityJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || payload.protocol !== "akp"
    || typeof payload.product !== "string"
    || !payload.product.trim()
    || !Object.hasOwn(payload, "features")
  ) {
    throw new Error("The selected JSON is not an Aerial Kit identity report.");
  }
  const protocolVersion = finiteNumber(payload.version, null);
  const parameterCount = finiteNumber(payload.parameter_count, null);
  if (
    !Number.isInteger(protocolVersion)
    || protocolVersion < 0
    || !Number.isInteger(parameterCount)
    || parameterCount < 0
  ) {
    throw new Error("The Aerial Kit identity report has invalid protocol metadata.");
  }
  const features = payload.features == null
    ? null
    : uint32(payload.features, "The capability word");
  const configHash = payload.config_hash == null
    ? null
    : uint32(payload.config_hash, "The configuration hash");
  const featureDetails = features == null
    ? []
    : AK_FEATURE_NAMES.filter((feature) => (features & feature.bit) !== 0);
  return {
    kind: "fc-identity",
    protocol: "akp",
    product: payload.product.trim(),
    protocolVersion,
    parameterCount,
    changed: typeof payload.changed === "string" ? payload.changed.trim() : "",
    features,
    featureNames: featureDetails.map((feature) => feature.name),
    featureDetails,
    unrecognizedFeatureMask: features == null
      ? 0
      : (features & ~AK_KNOWN_FEATURE_MASK) >>> 0,
    configHash,
    capabilityState: features == null ? "absent" : "reported",
    hardwareVerifiedByRotorBench: false,
  };
}

export function fcIdentityChecks(identity, { firmwareFamily = null } = {}) {
  if (!identity) return [];
  const expected = expectedProtocol(firmwareFamily);
  const checks = [
    makeCheck(
      "fc-identity-protocol",
      "FC identity protocol",
      expected === null || identity.protocol === expected ? "pass" : "fail",
      expected === null
        ? "Aerial Kit identity JSON identifies the AKP protocol."
        : identity.protocol === expected
          ? `Identity protocol matches the planned ${expected} firmware family.`
          : `Identity protocol ${identity.protocol} does not match planned firmware ${expected}.`,
    ),
    makeCheck(
      "fc-identity-capability-word",
      "Capability word",
      identity.features == null ? "unverified" : "pass",
      identity.features == null
        ? "HELLO ended before the capability word, so this firmware predates the field; the capabilities are unknown rather than empty."
        : `HELLO reports capability word 0x${identity.features.toString(16).padStart(8, "0")}.`,
    ),
  ];
  const importantFeatures = [
    "PARAM_INFO",
    "APPLIES_ON_WRITE",
    "GATES_ON_ARMED",
    "RC_CHANNELS",
    "PREFLIGHT",
  ];
  for (const featureName of importantFeatures) {
    const feature = AK_FEATURE_NAMES.find((entry) => entry.name === featureName);
    const claimed = identity.features != null
      && (identity.features & feature.bit) !== 0;
    checks.push(makeCheck(
      `fc-capability-${featureName.toLowerCase().replaceAll("_", "-")}`,
      feature.label,
      claimed ? "pass" : "unverified",
      identity.features == null
        ? `${feature.label} cannot be determined because the capability word is absent.`
        : claimed
          ? `The firmware capability word claims ${feature.name}. This is a build capability, not proof that it was exercised.`
          : `The firmware capability word does not claim ${feature.name}.`,
    ));
  }
  return checks;
}

export function parseAerialKitLiveStatusJson(payload) {
  if (
    !payload
    || payload.schema !== "rotorbench.aerial-kit-live-status.v1"
    || !payload.hello
    || !payload.status
  ) {
    throw new Error("The selected JSON is not an Aerial Kit live-status snapshot.");
  }
  const hello = payload.hello;
  const features = hello.features == null
    ? null
    : uint32(hello.features, "The HELLO capability word");
  const featureDetails = features == null
    ? []
    : AK_FEATURE_NAMES.filter((feature) => (features & feature.bit) !== 0);
  const identity = {
    kind: "fc-identity",
    protocol: "akp",
    product: String(hello.product || "").trim(),
    protocolVersion: finiteNumber(hello.protocolVersion, null),
    parameterCount: finiteNumber(hello.parameterCount, null),
    changed: String(hello.changed || "").trim(),
    features,
    featureNames: featureDetails.map((feature) => feature.name),
    featureDetails,
    configHash: hello.configHash == null
      ? null
      : uint32(hello.configHash, "The HELLO configuration hash"),
    capabilityState: features == null ? "absent" : "reported",
    hardwareVerifiedByRotorBench: false,
  };
  if (!identity.product || identity.protocolVersion == null) {
    throw new Error("The live-status snapshot has incomplete HELLO identity.");
  }
  const live = payload.status;
  const flightState = finiteNumber(live.flightState, null);
  const statusObservedAtMs = timestampMilliseconds(live.observedAt);
  const statusAgeMs = statusObservedAtMs == null
    ? null
    : Math.max(0, Date.now() - statusObservedAtMs);
  const statusFresh = payload.armedState?.fresh === true
    && payload.armedState?.state !== "unknown"
    && statusAgeMs != null
    && statusAgeMs <= 2000;
  const status = {
    kind: "fc-status",
    protocol: "akp",
    product: identity.product,
    firmware: null,
    parameterCount: identity.parameterCount,
    changed: identity.changed,
    identity: `protocol=akp product=${identity.product} parameters=${identity.parameterCount ?? "unknown"} changed=${identity.changed || "unknown"}`,
    state: {
      armed: statusFresh && flightState != null
        ? flightState === 0 ? 0 : 1
        : null,
      linkLive: finiteNumber(live.linkLive, null),
      rollDeg: finiteNumber(live.rollDeg, null),
      pitchDeg: finiteNumber(live.pitchDeg, null),
      yawDeg: finiteNumber(live.yawDeg, null),
      gpsFixType: finiteNumber(live.gpsFixType, null),
      gpsSatellites: finiteNumber(live.gpsSatellites, null),
      armingDisableFlags: null,
      vbatV: null,
      mah: null,
    },
    observedAtMs: statusObservedAtMs,
    liveSource: "web-serial",
  };
  const liveRc = payload.rc;
  const channels = Array.isArray(liveRc?.channels)
    ? liveRc.channels.map(Number).filter((value) => (
        Number.isInteger(value) && value >= 0 && value <= 65535
      ))
    : [];
  const rc = channels.length > 0
    ? {
        kind: "fc-rc",
        protocol: "akp",
        channels,
        observedAtMs: timestampMilliseconds(liveRc.observedAt),
        linkLive: Array.isArray(liveRc.flagNames)
          ? liveRc.flagNames.includes("link")
          : null,
        flags: Array.isArray(liveRc.flagNames)
          ? liveRc.flagNames.filter((flag) => typeof flag === "string")
          : [],
        note: liveRc.status === "no-receiver"
          ? "The board reported no receiver input."
          : null,
        counters: liveRc.counters && typeof liveRc.counters === "object"
          ? liveRc.counters
          : null,
        liveSource: "web-serial",
      }
    : null;
  const parameterValues = Array.isArray(payload.parameters)
    ? Object.fromEntries(
        payload.parameters
          .filter((parameter) => (
            parameter
            && typeof parameter.name === "string"
            && parameter.name.trim()
            && typeof parameter.value === "string"
          ))
          .map((parameter) => [
            parameter.name.trim(),
            parameter.value,
          ]),
      )
    : null;
  const parameterMetadata = Array.isArray(payload.parameterMetadata)
    ? payload.parameterMetadata
        .filter((parameter) => (
          parameter
          && Number.isInteger(parameter.index)
          && typeof parameter.name === "string"
        ))
        .map((parameter) => ({ ...parameter }))
    : null;
  const sensorMetadata = Array.isArray(payload.sensorMetadata)
    ? payload.sensorMetadata
        .filter((sensor) => sensor && Number.isInteger(sensor.topic))
        .map((sensor) => {
          const body = normalizedSensorBody(sensor.topic, sensor.body);
          return {
            topic: sensor.topic,
            topicName: typeof sensor.topicName === "string" ? sensor.topicName : null,
            status: ["present", "absent", "no-such-topic"].includes(sensor.status)
              ? sensor.status
              : "unknown",
            present: sensor.present === true,
            driver: typeof sensor.driver === "string"
              ? sensor.driver
              : sensorString(body?.driver),
            body,
          };
        })
    : null;
  const outputMetadata = payload.outputMetadata
    && typeof payload.outputMetadata === "object"
    && Array.isArray(payload.outputMetadata.outputs)
    ? {
        status: ["ok", "none", "too-many"].includes(payload.outputMetadata.status)
          ? payload.outputMetadata.status
          : "unknown",
        count: finiteNumber(payload.outputMetadata.count, 0),
        motors: finiteNumber(payload.outputMetadata.motors, 0),
        servos: finiteNumber(payload.outputMetadata.servos, 0),
        capPercent: finiteNumber(payload.outputMetadata.capPercent, null),
        outputs: payload.outputMetadata.outputs
          .filter((output) => output && Number.isInteger(output.kind))
          .map((output) => ({
            kind: output.kind,
            kindName: typeof output.kindName === "string" ? output.kindName : null,
            index: finiteNumber(output.index, null),
            reversed: output.reversed === true,
            trimUs: finiteNumber(output.trimUs, null),
            travelUs: finiteNumber(output.travelUs, null),
          })),
      }
    : null;
  let preflight = null;
  if (payload.preflight && typeof payload.preflight === "object") {
    const observedAtMs = timestampMilliseconds(payload.preflight.observedAt);
    if (payload.preflight.status === "none") {
      preflight = {
        kind: "fc-preflight",
        protocol: "akp",
        status: "none",
        lines: [],
        passCount: 0,
        failCount: 0,
        factCount: 0,
        observedAtMs,
      };
    } else {
      preflight = {
        ...parseFcPreflightJson({
          protocol: "akp",
          lines: payload.preflight.lines,
        }),
        status: "ok",
        observedAtMs,
      };
    }
  }
  const performance = normalizedPerformanceWindow(payload.performance);
  const motorTelemetry = normalizedMotorTelemetry(payload.motorTelemetry);
  const logInventory = normalizedLogInventory(payload.logInventory);
  const logSample = normalizedLogSample(payload.logSample);
  const telemetryStream = normalizedTelemetryStream(payload.telemetryStream);
  const mission = normalizedMissionStatus(payload.mission);
  const calibration = normalizedCalibrationStatus(payload.calibration);
  const waypointInventory = normalizedWaypointInventory(payload.waypointInventory);
  const routeSummary = waypointInventory
    ? buildAerialKitRouteSummary(waypointInventory)
    : null;
  return {
    kind: "fc-live-status",
    identity,
    status,
    rc,
    parameters: parameterValues && Object.keys(parameterValues).length
      ? {
          values: parameterValues,
          format: "aerial-kit",
          metadata: parameterMetadata,
        }
      : null,
    parameterMetadata,
    sensorMetadata,
    outputMetadata,
    preflight,
    performance,
    motorTelemetry,
    logInventory,
    logSample,
    telemetryStream,
    mission,
    calibration,
    waypointInventory,
    routeSummary,
    observedAtMs: statusObservedAtMs,
    boundaries: payload.boundaries || null,
  };
}

function betaflightArmingDisableFlags(value) {
  if (value == null || value === "") return { raw: null, labels: null };
  const text = String(value).trim();
  const parsed = /^0x[0-9a-f]+$/i.test(text)
    ? Number.parseInt(text.slice(2), 16)
    : /^\d+$/.test(text) ? Number.parseInt(text, 10) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return { raw: text, labels: null };
  }
  return {
    raw: text,
    labels: BETAFLIGHT_ARMING_DISABLE_FLAGS.filter((_, bit) => (
      (parsed & (1 << bit)) !== 0
    )),
  };
}

export function parseFcStatusJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || typeof payload.identity !== "string"
    || !payload.state
    || typeof payload.state !== "object"
  ) {
    throw new Error("The selected JSON is not an ak fc status snapshot.");
  }
  const protocol = identityField(payload.identity, "protocol");
  if (!STATUS_PROTOCOLS.has(protocol)) {
    throw new Error("The FC status snapshot does not identify akp or betaflight.");
  }
  const state = payload.state;
  const identity = sanitizedIdentity(payload.identity);
  return {
    kind: "fc-status",
    protocol,
    product: identityField(payload.identity, "product"),
    firmware: identityField(payload.identity, "firmware"),
    parameterCount: finiteNumber(
      identityField(payload.identity, "parameters"),
      null,
    ),
    changedParameters: identityField(payload.identity, "changed"),
    identity,
    state: {
      armed: finiteNumber(state.armed, null),
      linkLive: finiteNumber(state.link_live, null),
      rollDeg: finiteNumber(state.roll_deg, null),
      pitchDeg: finiteNumber(state.pitch_deg, null),
      yawDeg: finiteNumber(state.yaw_deg, null),
      gpsFixType: finiteNumber(state.gps_fix_type, null),
      gpsSatellites: finiteNumber(state.gps_satellites, null),
      armingDisableFlags: finiteNumber(state.arming_disable_flags, null),
      vbatV: finiteNumber(state.vbat_v, null),
      mah: finiteNumber(state.mah, null),
    },
  };
}

export function parseFcPreflightText(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty ak fc preflight report.");
  }
  const betaflight = text.trim().match(
    /^armed=(\d+)\s+arming_disable_flags=(\S+)$/,
  );
  if (betaflight) {
    const armed = Number(betaflight[1]);
    const flags = betaflight[2];
    const decodedFlags = betaflightArmingDisableFlags(flags);
    const flagDetail = decodedFlags.labels?.length
      ? ` (${decodedFlags.labels.join(", ")})`
      : "";
    return {
      kind: "fc-preflight",
      protocol: "betaflight",
      lines: [
        {
          name: "armed",
          id: "armed",
          verdict: armed === 0 ? 1 : 0,
          status: armed === 0 ? "pass" : "fail",
          label: armed === 0 ? "Pass" : "Fail",
          detail: `Betaflight reports armed=${armed}.`,
        },
        {
          name: "arming_disable_flags",
          id: "arming-disable-flags",
          verdict: 2,
          status: "fact",
          label: "Fact",
          detail: `Betaflight reports arming_disable_flags=${flags}${flagDetail}.`,
        },
      ],
      passCount: armed === 0 ? 1 : 0,
      failCount: armed === 0 ? 0 : 1,
      factCount: 1,
      armed,
      armingDisableFlags: flags,
      armingDisableFlagLabels: decodedFlags.labels,
    };
  }
  const lines = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const match = rawLine.match(/^(.+?)\s+verdict=([0-2])(?:\s+(.*))?$/);
    if (!match) {
      throw new Error("The selected text is not an ak fc preflight report.");
    }
    const verdict = PREFLIGHT_VERDICTS[Number(match[2])];
    const name = match[1].trim();
    lines.push({
      name,
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      verdict: Number(match[2]),
      status: verdict.status,
      label: verdict.label,
      detail: (match[3] || "").trim(),
    });
  }
  if (lines.length === 0) {
    throw new Error("The preflight report contains no checklist lines.");
  }
  return {
    kind: "fc-preflight",
    lines,
    passCount: lines.filter((line) => line.status === "pass").length,
    failCount: lines.filter((line) => line.status === "fail").length,
    factCount: lines.filter((line) => line.status === "fact").length,
  };
}

export function parseFcPreflightJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || !["akp", "betaflight"].includes(payload.protocol)
  ) {
    throw new Error("The selected JSON is not an ak fc preflight report.");
  }
  if (payload.protocol === "akp") {
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw new Error("The Aerial Kit preflight JSON contains no checklist lines.");
    }
    const lines = payload.lines.map((line) => {
      const numericVerdict = Number(line?.verdict);
      const verdict = PREFLIGHT_VERDICTS[numericVerdict];
      if (!line?.name || !verdict) {
        throw new Error("The Aerial Kit preflight JSON contains an invalid line.");
      }
      const name = String(line.name).trim();
      return {
        name,
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        verdict: numericVerdict,
        status: verdict.status,
        label: verdict.label,
        detail: typeof line.detail === "string" ? line.detail.trim() : "",
      };
    });
    return {
      kind: "fc-preflight",
      protocol: "akp",
      lines,
      passCount: lines.filter((line) => line.status === "pass").length,
      failCount: lines.filter((line) => line.status === "fail").length,
      factCount: lines.filter((line) => line.status === "fact").length,
    };
  }
  if (!Object.hasOwn(payload, "arming_disable_flags")) {
    throw new Error("The Betaflight preflight JSON does not contain arming flags.");
  }
  const armed = finiteNumber(payload.armed, null);
  if (armed == null) {
    throw new Error("The Betaflight preflight JSON does not contain armed state.");
  }
  const flags = String(payload.arming_disable_flags);
  const decodedFlags = betaflightArmingDisableFlags(flags);
  const labels = Array.isArray(payload.arming_disable_names)
    ? payload.arming_disable_names.filter((name) => typeof name === "string")
    : decodedFlags.labels || [];
  const lines = [
    {
      name: "armed",
      id: "armed",
      verdict: armed === 0 ? 1 : 0,
      status: armed === 0 ? "pass" : "fail",
      label: armed === 0 ? "Pass" : "Fail",
      detail: `Betaflight reports armed=${armed}.`,
    },
    {
      name: "arming_disable_flags",
      id: "arming-disable-flags",
      verdict: 2,
      status: "fact",
      label: "Fact",
      detail: `Betaflight reports arming_disable_flags=${flags}${
        labels.length ? ` (${labels.join(", ")})` : ""
      }.`,
    },
  ];
  return {
    kind: "fc-preflight",
    protocol: "betaflight",
    lines,
    passCount: armed === 0 ? 1 : 0,
    failCount: armed === 0 ? 0 : 1,
    factCount: 1,
    armed,
    armingDisableFlags: flags,
    armingDisableFlagLabels: labels,
    reportedVerdict: typeof payload.verdict === "string"
      ? payload.verdict.toLowerCase()
      : null,
  };
}

function timestampMilliseconds(value) {
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number > 1e12 ? number : number * 1000;
}

export function parseFcRcJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || !RC_PROTOCOLS.has(payload.protocol)
    || !Array.isArray(payload.channels)
  ) {
    throw new Error("The selected JSON is not an ak fc rc observation.");
  }
  if (payload.channels.length < 1 || payload.channels.length > 16) {
    throw new Error("The FC RC observation must contain between 1 and 16 channels.");
  }
  const channels = payload.channels.map((value) => {
    const channel = Number(value);
    if (!Number.isInteger(channel) || channel < 0 || channel > 65535) {
      throw new Error("The FC RC observation contains an invalid channel value.");
    }
    return channel;
  });
  return {
    kind: "fc-rc",
    protocol: payload.protocol,
    channels,
    observedAtMs: timestampMilliseconds(payload.observed_at),
    linkLive: payload.protocol === "akp"
      ? payload.link_live === true ? true : payload.link_live === false ? false : null
      : null,
    flags: Array.isArray(payload.flags)
      ? payload.flags.filter((flag) => typeof flag === "string").slice(0, 32)
      : [],
    note: typeof payload.note === "string" ? payload.note.slice(0, 240) : null,
    counters: payload.counters && typeof payload.counters === "object"
      ? payload.counters
      : null,
  };
}

function makeCheck(id, label, status, detail) {
  return { id, label, status, detail };
}

function expectedProtocol(firmwareFamily) {
  if (firmwareFamily === "aerialkit") return "akp";
  if (firmwareFamily === "betaflight") return "betaflight";
  return null;
}

export function fcRcChecks(rc, {
  firmwareFamily = null,
  now = Date.now(),
} = {}) {
  if (!rc) return [];
  const protocol = expectedProtocol(firmwareFamily);
  const plausibleChannels = rc.channels.filter(
    (channel) => channel >= 100 && channel <= 3000,
  );
  const distinctChannels = new Set(rc.channels.slice(0, 8)).size;
  const channelShapePass = plausibleChannels.length >= 4
    && distinctChannels >= 2;
  const ageMs = rc.observedAtMs == null
    ? null
    : Math.max(0, now - rc.observedAtMs);
  const fresh = ageMs != null && ageMs <= RC_FRESHNESS_LIMIT_MS;
  const linkStatus = rc.protocol === "betaflight"
    ? fresh && channelShapePass ? "pass" : "unverified"
    : rc.linkLive === true && fresh && channelShapePass ? "pass"
      : rc.linkLive === false ? "fail" : "unverified";
  return [
    makeCheck(
      "fc-rc-protocol",
      "FC RC observation protocol",
      protocol === null
        ? "unverified"
        : rc.protocol === protocol ? "pass" : "fail",
      protocol === null
        ? `Imported ${rc.protocol} RC channels; the selected firmware family has no comparable protocol.`
        : rc.protocol === protocol
          ? `Imported ${rc.protocol} RC channels, matching the selected ${firmwareFamily} plan.`
          : `Imported ${rc.protocol} RC channels; the selected ${firmwareFamily} plan expects ${protocol}.`,
    ),
    makeCheck(
      "fc-rc-freshness",
      "FC RC observation freshness",
      fresh ? "pass" : "unverified",
      fresh
        ? `The FC RC observation is ${Math.round(ageMs / 1000)} seconds old.`
        : ageMs == null
          ? "The FC RC observation does not contain a usable observation time."
          : `The FC RC observation is ${Math.round(ageMs / 1000)} seconds old; import a fresh sample.`,
    ),
    makeCheck(
      "fc-rc-channel-values",
      "FC RC channel values",
      channelShapePass ? "pass" : "unverified",
      channelShapePass
        ? `${plausibleChannels.length} plausible channels were sampled across ${distinctChannels} values.`
        : "The channels have too little plausible variation. Move the controls or switch before sampling.",
    ),
    makeCheck(
      "fc-rc-link-state",
      "FC RC link observation",
      linkStatus,
      rc.protocol === "betaflight"
        ? linkStatus === "pass"
          ? "A fresh MSP RC query returned plausible channel values. MSP status itself does not expose a link flag, and this does not prove RF."
          : "A fresh MSP RC query did not return enough plausible channel variation to establish a receiver observation."
        : linkStatus === "pass"
          ? "The Aerial Kit RC report flags a live link and returned plausible channel values."
          : linkStatus === "fail"
            ? "The Aerial Kit RC report does not flag a live link."
            : "The Aerial Kit RC report is fresh enough and the link state is known, but channel values remain inconclusive.",
    ),
  ];
}

export function fcEvidenceChecks(status, preflight, {
  firmwareFamily = null,
  rc = null,
  now = Date.now(),
} = {}) {
  const checks = [];
  const protocol = expectedProtocol(firmwareFamily);
  const importedRcChecks = fcRcChecks(rc, { firmwareFamily, now });
  const rcLinkCheck = importedRcChecks.find(
    (check) => check.id === "fc-rc-link-state",
  );
  if (status) {
    checks.push(makeCheck(
      "fc-status-protocol",
      "FC status protocol",
      protocol === null
        ? "unverified"
        : status.protocol === protocol ? "pass" : "fail",
      protocol === null
        ? `Imported ${status.protocol}; the selected firmware family has no comparable status protocol.`
        : status.protocol === protocol
          ? `Imported ${status.protocol}, matching the selected ${firmwareFamily} plan.`
          : `Imported ${status.protocol}; the selected ${firmwareFamily} plan expects ${protocol}.`,
    ));
    checks.push(makeCheck(
      "fc-status-disarmed",
      "FC reported disarmed",
      status.state.armed === 0
        ? "pass"
        : status.state.armed === 1 ? "fail" : "unverified",
      status.state.armed === 0
        ? "The imported status reports armed=0."
        : status.state.armed === 1
          ? "The imported status reports armed=1. This is an observation, not an instruction to continue."
          : "The imported status does not contain an armed state.",
    ));
    checks.push(makeCheck(
      "fc-status-link",
      "FC receiver link / RC observation",
      rcLinkCheck
        ? rcLinkCheck.status
        : status.protocol === "betaflight"
          ? "unverified"
        : status.state.linkLive === 1
          ? "pass"
          : status.state.linkLive === 0 ? "fail" : "unverified",
      rcLinkCheck
        ? rcLinkCheck.detail
        : status.protocol === "betaflight"
          ? "Betaflight MSP status does not expose receiver link state. Import fresh ak fc rc evidence before treating the receiver path as observed."
        : status.state.linkLive === 1
          ? "The imported status reports a live receiver link."
          : status.state.linkLive === 0
            ? "The imported status reports no live receiver link."
            : "The imported status does not contain a link state.",
    ));
  }
  checks.push(...importedRcChecks);
  if (preflight) {
    if (preflight.status === "none") {
      checks.push(makeCheck(
        "fc-preflight-no-fail",
        "FC preflight checklist",
        "unverified",
        "The board reports no preflight checklist. No checklist is not a passing checklist.",
      ));
    } else {
      checks.push(makeCheck(
        "fc-preflight-no-fail",
        "FC preflight failures",
        preflight.failCount === 0 ? "pass" : "fail",
        preflight.failCount === 0
          ? `All ${preflight.passCount} pass and ${preflight.factCount} fact lines were reviewed without a failure.`
          : `${preflight.failCount} preflight line${preflight.failCount === 1 ? "" : "s"} failed.`,
      ));
    }
    if (preflight.protocol === "betaflight" && preflight.status !== "none") {
      const flags = preflight.armingDisableFlags;
      const parsedFlags = /^0x[0-9a-f]+$/i.test(String(flags))
        ? Number.parseInt(String(flags).slice(2), 16)
        : /^\d+$/.test(String(flags)) ? Number.parseInt(String(flags), 10) : NaN;
      const flagsKnown = Number.isSafeInteger(parsedFlags) && parsedFlags >= 0;
      const failsafeActive = flagsKnown
        && (parsedFlags & BETAFLIGHT_FAILSAFE_MASK) !== 0;
      const activeLabels = preflight.armingDisableFlagLabels || [];
      checks.push(makeCheck(
        "fc-preflight-arming-disable-failsafe",
        "FC failsafe arming flags",
        !flagsKnown ? "unverified" : failsafeActive ? "fail" : "pass",
        !flagsKnown
          ? "Betaflight arming-disable flags could not be decoded."
          : failsafeActive
            ? `Betaflight reports a failsafe arming-disable bit${activeLabels.length ? `: ${activeLabels.join(", ")}` : "."}`
            : activeLabels.length
              ? `No failsafe bit is set. Other active flags: ${activeLabels.join(", ")}.`
              : "Betaflight reports no active arming-disable flags.",
      ));
      if (preflight.reportedVerdict) {
        checks.push(makeCheck(
          "fc-preflight-reported-verdict",
          "FC preflight result",
          preflight.reportedVerdict === "pass"
            ? "pass"
            : preflight.reportedVerdict === "fail" ? "fail" : "unverified",
          preflight.reportedVerdict === "pass"
            ? "The imported preflight report is clear."
            : preflight.reportedVerdict === "fail"
              ? "The imported preflight report failed."
              : `The imported preflight report is ${preflight.reportedVerdict}; review the active arming-disable flags.`,
        ));
      }
    }
    const lineChecks = [
      ["console", "FC console port"],
      ["clock", "FC clock source"],
      ["tick", "FC millisecond tick"],
      ["configuration", "FC saved configuration"],
      ["fault", "FC recorded faults"],
      ["outputs", "FC output mix"],
    ];
    lineChecks.forEach(([name, label]) => {
      const matchingLines = preflight.lines.filter((candidate) => candidate.id === name);
      const line = matchingLines.find((candidate) => candidate.status === "fail")
        || matchingLines.find((candidate) => candidate.status === "pass")
        || matchingLines.find((candidate) => candidate.status === "fact")
        || null;
      checks.push(makeCheck(
        `fc-preflight-${name}`,
        label,
        !line ? "unverified" : line.status === "fail" ? "fail" : line.status === "pass" ? "pass" : "unverified",
        line?.detail || `The preflight report has no ${name} line.`,
      ));
    });
  }
  return checks;
}

const PARAMETER_PLAN_KEYS = {
  airframe: "airframe",
  dshot_khz: "dshotKhz",
  servo1_reverse: "servo1Reverse",
  servo1_trim_us: "servo1TrimUs",
  servo1_travel_us: "servo1TravelUs",
  servo2_reverse: "servo2Reverse",
  servo2_trim_us: "servo2TrimUs",
  servo2_travel_us: "servo2TravelUs",
  rc_protocol: "receiverProtocol",
  arm_channel: "armChannel",
  mode_channel: "modeChannel",
  velocity_channel: "velocityChannel",
  mission_channel: "missionChannel",
  launch_channel: "launchChannel",
  launch_throttle: "launchThrottle",
  launch_climb_deg: "launchClimbDeg",
  launch_timeout_s: "launchTimeoutS",
  manual_channel: "manualChannel",
  ctrl_channel: "ctrlChannel",
  sysid_channel: "sysidChannel",
  arm_hold_ms: "armHoldMs",
  arm_max_tilt_deg: "armMaxTiltDeg",
  throttle_low: "throttleLow",
  rc_timeout_ms: "rcTimeoutMs",
  rc_min: "rcMin",
  rc_mid: "rcMid",
  rc_max: "rcMax",
  rc_deadband: "rcDeadband",
  vbat_ratio: "vbatRatio",
  vbat_cells: "vbatCells",
  vbat_warn_cell: "vbatWarnCell",
  vbat_min_cell: "vbatMinCell",
  battery_rth: "batteryRthEnabled",
  fence_enable: "fenceEnabled",
  fence_radius_m: "fenceRadiusM",
  fence_ceiling_m: "fenceCeilingM",
  rth_min_alt_m: "rthMinAltM",
  gps_min_sats: "gpsMinSats",
  align_roll_deg: "alignRollDeg",
  align_pitch_deg: "alignPitchDeg",
  align_yaw_deg: "alignYawDeg",
  gyro_rate_hz: "gyroRateHz",
  pid_denom: "pidDenom",
  rth_enable: "rthEnabled",
};

function comparableParameterValue(value) {
  if (typeof value === "boolean") return value ? "1" : "0";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value ?? "");
}

export function parseFcParameterSnapshotText(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty flight-controller parameter snapshot.");
  }
  const lines = text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (!lines.length) {
    throw new Error("The parameter snapshot contains no values.");
  }

  const aerialKitValues = {};
  const aerialKitRows = lines.map(
    (line) => line.match(/^([a-z0-9_]+)=(.+?)\s+status=\S+$/i),
  );
  if (aerialKitRows.every(Boolean)) {
    aerialKitRows.forEach((match) => {
      aerialKitValues[match[1].toLowerCase()] = match[2].trim();
    });
    return { kind: "fc-parameters", format: "aerial-kit", values: aerialKitValues };
  }

  const structuredRows = lines.map((line) => (
    line.includes("\t") ? line.split("\t") : line.split(/\s+/)
  )).map((row) => row.map((cell) => cell.trim()));
  const isQgcSnapshot = structuredRows.every((row) => (
    row.length >= 5
    && /^\d+$/.test(row[0])
    && /^\d+$/.test(row[1])
    && /^[A-Za-z][A-Za-z0-9_]*$/.test(row[2])
    && Number.isFinite(Number(row[3]))
    && /^\d+$/.test(row[4])
  ));
  if (isQgcSnapshot) {
    return {
      kind: "fc-parameters",
      format: "qgroundcontrol",
      values: Object.fromEntries(structuredRows.map((row) => [
        row[2].toLowerCase(),
        row[3],
      ])),
    };
  }

  const commaRows = lines.map((line) => line.split(",").map((cell) => cell.trim()));
  const isMissionPlannerSnapshot = commaRows.every((row) => (
    row.length === 2
    && /^[A-Za-z][A-Za-z0-9_]*$/.test(row[0])
    && Number.isFinite(Number(row[1]))
  ));
  if (isMissionPlannerSnapshot) {
    return {
      kind: "fc-parameters",
      format: "mission-planner",
      values: Object.fromEntries(commaRows.map(([name, value]) => [
        name.toLowerCase(),
        value,
      ])),
    };
  }

  throw new Error(
    "The selected text is not a supported Aerial Kit, Mission Planner, or QGroundControl parameter snapshot.",
  );
}

export function fcParameterChecks(snapshot, plan) {
  if (!snapshot || !plan) return [];
  const checks = (plan.firmwareFamily === "ardupilot"
    ? []
    : Object.entries(PARAMETER_PLAN_KEYS)
    .filter(([, planKey]) => {
      const value = plan[planKey];
      return value !== null && value !== undefined && value !== "";
    })
    .map(([runtimeName, planKey]) => {
      if (!Object.hasOwn(snapshot.values, runtimeName)) {
        return makeCheck(
          `fc-param-${runtimeName.replaceAll("_", "-")}`,
          `FC parameter ${runtimeName}`,
          "unverified",
          `The imported snapshot does not include ${runtimeName}, so this planned value remains unverified.`,
        );
      }
      const actual = comparableParameterValue(snapshot.values[runtimeName]);
      const expected = comparableParameterValue(plan[planKey]);
      const matches = actual === expected;
      return makeCheck(
        `fc-param-${runtimeName.replaceAll("_", "-")}`,
        `FC parameter ${runtimeName}`,
        matches ? "pass" : "fail",
        matches
          ? `Imported ${runtimeName}=${actual}, matching the staged plan.`
          : `Imported ${runtimeName}=${actual}; the staged plan expects ${expected}.`,
      );
    }));

  const boardProfile = plan.profileId ? getBoardProfile(plan.profileId) : null;
  const ardupilotRequirements = plan.firmwareFamily === "ardupilot"
    ? (boardProfile?.parameterRequirements || []).filter((requirement) => (
        !requirement.whenReceiverProtocol
        || requirement.whenReceiverProtocol === plan.receiverProtocol
      ))
    : [];
  const ardupilotChecks = ardupilotRequirements
    .map(({ name: runtimeName, value: expected, description: requirement }) => {
        const actual = snapshot.values[runtimeName.toLowerCase()];
        if (actual === undefined) {
          return makeCheck(
            `fc-param-${runtimeName.toLowerCase().replaceAll("_", "-")}`,
            `FC parameter ${runtimeName}`,
            "unverified",
            `The imported snapshot does not include ${runtimeName}, so ${requirement} remains unverified.`,
          );
        }
        return makeCheck(
          `fc-param-${runtimeName.toLowerCase().replaceAll("_", "-")}`,
          `FC parameter ${runtimeName}`,
          comparableParameterValue(actual) === expected ? "pass" : "fail",
          comparableParameterValue(actual) === expected
            ? `Imported ${runtimeName}=${actual}, matching the documented ${boardProfile.label} ${requirement} requirement.`
            : `Imported ${runtimeName}=${actual}; the documented ${boardProfile.label} plan requires ${expected} for ${requirement}.`,
        );
      });

  return [...checks, ...ardupilotChecks];
}
