import { AERIAL_KIT_MISSION_ROUTE_SCHEMA } from "./aerialKitMissionRouteExport";
import { greatCircleDistanceM } from "./aerialKitWaypoints";

const DISTANCE_TOLERANCE_M = 0.05;
const POSITION_TOLERANCE_DEGREES = 1e-9;

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`The mission route has an invalid ${label}.`);
  }
  return number;
}

function coordinate(value, minimum, maximum, label) {
  const number = finiteNumber(value, label);
  if (number < minimum || number > maximum) {
    throw new Error(`The mission route ${label} is outside ${minimum} to ${maximum}.`);
  }
  return number;
}

function closeEnough(actual, expected, tolerance = DISTANCE_TOLERANCE_M) {
  return Math.abs(actual - expected) <= tolerance;
}

function assertLegs(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new Error(`The mission route ${label} count is inconsistent.`);
  }
  actual.forEach((leg, index) => {
    const expectedLeg = expected[index];
    if (
      !leg
      || leg.from !== expectedLeg.from
      || leg.to !== expectedLeg.to
      || !closeEnough(finiteNumber(leg.distanceM, `${label} distance`), expectedLeg.distanceM)
    ) {
      throw new Error(`The mission route ${label} ${index + 1} is inconsistent.`);
    }
  });
}

function assertBoundaries(boundaries) {
  const required = {
    geometricEstimate: true,
    terrainNotConsidered: true,
    crossTrackNotAssessed: true,
    flownProgressNotObserved: true,
    returnToHomeIncluded: false,
    writesPerformed: false,
    hardwareVerificationClaimed: false,
    rfVerificationClaimed: false,
    flightReadinessClaimed: false,
  };
  Object.entries(required).forEach(([field, expected]) => {
    if (!boundaries || boundaries[field] !== expected) {
      throw new Error(`The mission route boundary ${field} is not ${expected}.`);
    }
  });
}

export function parseAerialKitMissionRouteEvidence(
  payload,
  { nowMs = Date.now() } = {},
) {
  if (!payload || payload.schema !== AERIAL_KIT_MISSION_ROUTE_SCHEMA) {
    throw new Error("The selected JSON is not an Aerial Kit mission-route artifact.");
  }
  if (!payload.mission || payload.mission.active !== true) {
    throw new Error("The mission-route artifact does not describe an active mission.");
  }
  if (
    !Array.isArray(payload.route?.waypoints)
    || payload.route.waypoints.length === 0
  ) {
    throw new Error("The mission-route artifact has no ordered waypoints.");
  }
  const generatedAtMs = Date.parse(payload.generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    throw new Error("The mission-route artifact has no valid generation time.");
  }
  if (generatedAtMs > nowMs + 60_000) {
    throw new Error("The mission-route artifact generation time is in the future.");
  }

  const waypoints = payload.route.waypoints.map((waypoint, index) => {
    if (
      !waypoint
      || waypoint.index !== index
      || waypoint.complete !== true
    ) {
      throw new Error(`The mission-route waypoint ${index} is incomplete or out of order.`);
    }
    return {
      index,
      lat: coordinate(waypoint.lat, -90, 90, `waypoint ${index} latitude`),
      lon: coordinate(waypoint.lon, -180, 180, `waypoint ${index} longitude`),
      complete: true,
    };
  });
  const expectedLegs = waypoints.slice(1).map((waypoint, offset) => {
    const from = waypoints[offset];
    return {
      from: from.index,
      to: waypoint.index,
      distanceM: greatCircleDistanceM(
        from.lat,
        from.lon,
        waypoint.lat,
        waypoint.lon,
      ),
    };
  });
  assertLegs(payload.route.legs, expectedLegs, "leg");
  const totalDistanceM = expectedLegs.reduce(
    (total, leg) => total + leg.distanceM,
    0,
  );
  if (!closeEnough(
    finiteNumber(payload.route.totalDistanceM, "total route distance"),
    totalDistanceM,
  )) {
    throw new Error("The mission-route total distance does not match its legs.");
  }
  if (payload.route.waypointCount !== waypoints.length) {
    throw new Error("The mission-route waypoint count is inconsistent.");
  }

  const activeWaypointIndex = payload.mission.index;
  if (
    !Number.isInteger(activeWaypointIndex)
    || activeWaypointIndex < 0
    || activeWaypointIndex >= waypoints.length
  ) {
    throw new Error("The mission-route active waypoint is outside the validated list.");
  }
  const activeWaypoint = waypoints[activeWaypointIndex];
  if (
    !payload.activeTarget
    || payload.activeTarget.index !== activeWaypointIndex
    || !closeEnough(
      finiteNumber(payload.activeTarget.lat, "active target latitude"),
      activeWaypoint.lat,
      POSITION_TOLERANCE_DEGREES,
    )
    || !closeEnough(
      finiteNumber(payload.activeTarget.lon, "active target longitude"),
      activeWaypoint.lon,
      POSITION_TOLERANCE_DEGREES,
    )
  ) {
    throw new Error("The mission-route active target does not match its waypoint.");
  }

  const ageMs = finiteNumber(payload.observation?.ageMs, "observation age");
  if (ageMs < 0 || ageMs > 2000) {
    throw new Error("The mission-route observation was not fresh when exported.");
  }
  const gpsFixType = finiteNumber(
    payload.observation?.gpsFixType,
    "observation GPS fix",
  );
  if (![2, 3, 4].includes(gpsFixType)) {
    throw new Error("The mission-route observation has no position-bearing GPS fix.");
  }
  if (!["telemetry", "status"].includes(payload.observation?.positionSource)) {
    throw new Error("The mission-route observation source is unsupported.");
  }
  const observedPosition = {
    lat: coordinate(
      payload.observation?.position?.lat,
      -90,
      90,
      "observation latitude",
    ),
    lon: coordinate(
      payload.observation?.position?.lon,
      -180,
      180,
      "observation longitude",
    ),
  };
  const distanceToActiveM = finiteNumber(
    payload.observation?.distanceToActiveM,
    "active-target distance",
  );
  const plannedAfterActiveM = expectedLegs
    .slice(activeWaypointIndex)
    .reduce((total, leg) => total + leg.distanceM, 0);
  const remainingLegs = expectedLegs.slice(activeWaypointIndex);
  if (!closeEnough(
    finiteNumber(payload.progress?.distanceToActiveM, "progress active distance"),
    distanceToActiveM,
  )) {
    throw new Error("The mission-route progress active distance is inconsistent.");
  }
  if (!closeEnough(
    finiteNumber(payload.progress?.plannedAfterActiveM, "onward distance"),
    plannedAfterActiveM,
  )) {
    throw new Error("The mission-route onward distance is inconsistent.");
  }
  if (!closeEnough(
    finiteNumber(payload.progress?.totalRemainingM, "remaining distance"),
    distanceToActiveM + plannedAfterActiveM,
  )) {
    throw new Error("The mission-route remaining distance is inconsistent.");
  }
  if (payload.progress?.remainingWaypointCount !== remainingLegs.length) {
    throw new Error("The mission-route remaining waypoint count is inconsistent.");
  }
  assertLegs(payload.progress?.remainingLegs, remainingLegs, "remaining leg");
  assertBoundaries(payload.boundaries);

  const observationObservedAtMs = generatedAtMs - ageMs;
  const importAgeMs = Math.max(0, nowMs - observationObservedAtMs);
  return {
    kind: "fc-mission-route",
    schema: payload.schema,
    generatedAtMs,
    observationObservedAtMs,
    importAgeMs,
    staleOnImport: importAgeMs > 2000,
    mission: {
      active: true,
      index: activeWaypointIndex,
      requested: payload.mission.requested,
      count: payload.mission.count,
      countCapped: payload.mission.countCapped,
      channel: payload.mission.channel,
      reached: payload.mission.reached,
      started: payload.mission.started,
      cancelled: payload.mission.cancelled,
      holdAltMm: payload.mission.holdAltMm,
    },
    activeTarget: {
      index: activeWaypointIndex,
      lat: activeWaypoint.lat,
      lon: activeWaypoint.lon,
    },
    waypoints,
    legs: expectedLegs,
    inventory: {
      status: "ok",
      reason: null,
      count: waypoints.length,
      availableSlots: waypoints.length,
      complete: true,
      slots: waypoints.map((waypoint) => ({
        ...waypoint,
        rawLat: String(waypoint.lat),
        rawLon: String(waypoint.lon),
        errors: [],
      })),
    },
    route: {
      waypointCount: waypoints.length,
      totalDistanceM,
    },
    observation: {
      positionSource: payload.observation.positionSource,
      ageAtExportMs: ageMs,
      gpsFixType,
      position: observedPosition,
      distanceToActiveM,
    },
    progress: {
      distanceToActiveM,
      plannedAfterActiveM,
      totalRemainingM: distanceToActiveM + plannedAfterActiveM,
      remainingWaypointCount: remainingLegs.length,
      remainingLegs,
    },
    boundaries: {
      geometricEstimate: true,
      terrainNotConsidered: true,
      crossTrackNotAssessed: true,
      flownProgressNotObserved: true,
      returnToHomeIncluded: false,
      writesPerformed: false,
      hardwareVerificationClaimed: false,
      rfVerificationClaimed: false,
      flightReadinessClaimed: false,
    },
    geometryRecomputed: true,
    hardwareVerifiedByRotorBench: false,
  };
}

export function aerialKitMissionRouteEvidenceChecks(route) {
  if (!route) return [];
  return [
    {
      id: "fc-mission-route-geometry",
      label: "Mission-route geometry",
      status: "pass",
      detail: "Every waypoint, adjacent leg, route total, active target, and remaining-distance suffix was recomputed from the imported coordinates.",
    },
    {
      id: "fc-mission-route-freshness",
      label: "Mission observation age",
      status: route.staleOnImport ? "unverified" : "pass",
      detail: route.staleOnImport
        ? "The observation was fresh when exported but is stale now; it remains historical planning evidence."
        : "The exported observation remains within the two-second freshness window.",
    },
    {
      id: "fc-mission-route-authenticity",
      label: "Mission-route hardware proof",
      status: "unverified",
      detail: "Route geometry is planning evidence only; the file is not authenticity-verified hardware, RF, arming, or flight-readiness evidence.",
    },
  ];
}
