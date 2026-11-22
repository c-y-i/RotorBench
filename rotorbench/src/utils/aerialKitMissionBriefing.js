import { buildAerialKitMissionRouteProgress } from "./aerialKitWaypoints";

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

export function buildAerialKitMissionBriefing({
  mission = null,
  inventory = null,
  proximity = null,
} = {}) {
  const progress = buildAerialKitMissionRouteProgress({
    proximity,
    inventory,
  });
  if (
    progress.status !== "ok"
    || !mission
    || mission.status !== "ok"
    || mission.active !== true
  ) {
    return {
      status: "unavailable",
      reason: progress.reason || "mission-unavailable",
      text: "",
      progress,
    };
  }
  const waypoint = proximity.waypoint;
  const ageSeconds = Number.isFinite(proximity.ageMs)
    ? (proximity.ageMs / 1000).toFixed(2)
    : "unknown";
  const source = proximity.positionSource === "telemetry"
    ? "TELEMETRY"
    : proximity.positionSource === "status"
      ? "STATUS"
      : "Unknown";
  const text = [
    "RotorBench Aerial Kit mission briefing",
    "Mode: read-only geometric observation",
    "Mission: active",
    `Active target: WP ${progress.activeWaypointIndex} (${waypoint.lat.toFixed(7)}, ${waypoint.lon.toFixed(7)})`,
    `Position source: ${source}`,
    `GPS fix: ${proximity.position.gpsFixType}`,
    `Observation age: ${ageSeconds} s`,
    `Distance to active target: ${distanceLabel(progress.distanceToActiveM)}`,
    `Planned distance after target: ${distanceLabel(progress.plannedAfterActiveM)}`,
    `Planned legs after target: ${progress.remainingLegs.length}`,
    `Total remaining geometric distance: ${distanceLabel(progress.totalRemainingM)}`,
    `Configured waypoints: ${inventory.count}`,
    `Remaining targets after active: ${progress.remainingWaypointCount}`,
    "Boundaries: horizontal great-circle geometry only; terrain, cross-track error, flown progress, and return-to-home distance are not observed or included.",
    "Nothing in this briefing was sent to hardware or establishes arming state, RF performance, flight readiness, or a completed mission.",
  ].join("\n");
  return {
    status: "ok",
    reason: null,
    text,
    progress,
  };
}
