import {
  buildAerialKitMissionRouteProgress,
  buildAerialKitRouteSummary,
} from "./aerialKitWaypoints";

export const AERIAL_KIT_MISSION_ROUTE_SCHEMA =
  "rotorbench.aerial-kit-mission-route.v1";

export function buildAerialKitMissionRouteExport({
  mission = null,
  inventory = null,
  proximity = null,
  nowMs = Date.now(),
} = {}) {
  const route = buildAerialKitRouteSummary(inventory);
  const progress = buildAerialKitMissionRouteProgress({
    proximity,
    inventory,
  });
  if (
    route.status !== "ok"
    || progress.status !== "ok"
    || !mission
    || mission.status !== "ok"
    || mission.active !== true
  ) {
    return {
      status: "unavailable",
      reason: progress.reason || route.reason || "mission-route-unavailable",
      artifact: null,
    };
  }
  const activeWaypointIndex = progress.activeWaypointIndex;
  const activeSlot = inventory.slots.find(
    (slot) => slot.index === activeWaypointIndex,
  );
  const artifact = {
    schema: AERIAL_KIT_MISSION_ROUTE_SCHEMA,
    generatedAt: new Date(nowMs).toISOString(),
    source: "Aerial Kit board parameters and fresh position observation",
    mission: {
      active: true,
      index: activeWaypointIndex,
      requested: mission.requested,
      count: mission.count,
      countCapped: mission.countCapped,
      channel: mission.channel,
      reached: mission.reached,
      started: mission.started,
      cancelled: mission.cancelled,
      holdAltMm: mission.holdAltMm,
    },
    activeTarget: {
      index: activeWaypointIndex,
      lat: activeSlot.lat,
      lon: activeSlot.lon,
    },
    route: {
      waypointCount: route.waypointCount,
      totalDistanceM: route.totalDistanceM,
      waypoints: inventory.slots.map((slot) => ({
        index: slot.index,
        lat: slot.lat,
        lon: slot.lon,
        complete: slot.complete,
      })),
      legs: route.legs,
    },
    observation: {
      positionSource: proximity.positionSource,
      ageMs: proximity.ageMs,
      gpsFixType: proximity.position.gpsFixType,
      position: {
        lat: proximity.position.lat,
        lon: proximity.position.lon,
      },
      distanceToActiveM: proximity.distanceM,
    },
    progress: {
      distanceToActiveM: progress.distanceToActiveM,
      plannedAfterActiveM: progress.plannedAfterActiveM,
      totalRemainingM: progress.totalRemainingM,
      remainingWaypointCount: progress.remainingWaypointCount,
      remainingLegs: progress.remainingLegs,
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
  };
  return {
    status: "ok",
    reason: null,
    artifact,
  };
}
