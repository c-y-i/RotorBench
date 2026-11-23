import { buildAerialKitMissionRouteProgress } from "../utils/aerialKitWaypoints";

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

export default function AerialKitMissionRouteProgress({
  proximity,
  inventory,
}) {
  const progress = buildAerialKitMissionRouteProgress({
    proximity,
    inventory,
  });
  if (progress.status !== "ok") return null;
  return (
    <div className="aerial-kit-mission-progress">
      <div className="aerial-kit-mission-progress-heading">
        <span>Mission progress</span>
        <small>Active target WP {progress.activeWaypointIndex}</small>
      </div>
      <dl>
        <div>
          <dt>To active</dt>
          <dd>{distanceLabel(progress.distanceToActiveM)}</dd>
        </div>
        <div>
          <dt>After target</dt>
          <dd>{distanceLabel(progress.plannedAfterActiveM)}</dd>
        </div>
        <div>
          <dt>Total remaining</dt>
          <dd>{distanceLabel(progress.totalRemainingM)}</dd>
        </div>
      </dl>
      <p>
        Observed-to-target distance plus{" "}
        {progress.remainingLegs.length} planned great-circle leg
        {progress.remainingLegs.length === 1 ? "" : "s"} after WP{" "}
        {progress.activeWaypointIndex}. Terrain, flown progress, and
        return-to-home distance are not included.
      </p>
    </div>
  );
}
