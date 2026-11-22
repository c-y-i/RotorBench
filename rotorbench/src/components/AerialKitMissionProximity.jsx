import React from "react";

const REASONS = {
  "no-active-waypoint": "No mission is currently flying a waypoint.",
  "position-missing": "No board position is available.",
  "position-fix-unavailable": "The board has no position-bearing GPS fix.",
  "position-stale": "The board position is stale.",
  "waypoint-inventory-unavailable": "The waypoint inventory is incomplete.",
  "active-waypoint-missing": "The active waypoint is not in the validated inventory.",
};

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

export default function AerialKitMissionProximity({ proximity }) {
  if (!proximity) return null;
  if (proximity.status !== "ok") {
    return (
      <div className="aerial-kit-mission-proximity is-unavailable" role="note">
        <span>
          <strong>Mission proximity unavailable</strong>
          <small>
            {REASONS[proximity.reason] || proximity.reason || "Position unavailable"}
          </small>
        </span>
      </div>
    );
  }
  return (
    <div className="aerial-kit-mission-proximity is-ok">
      <div>
        <span>Distance to active waypoint</span>
        <strong>{distanceLabel(proximity.distanceM)}</strong>
      </div>
      <p>
        WP {proximity.waypoint.index} ·{" "}
        {proximity.positionSource === "telemetry" ? "telemetry" : "STATUS"} position ·{" "}
        fix {proximity.position.gpsFixType} ·{" "}
        {(proximity.ageMs / 1000).toFixed(2)} s old
      </p>
      <small>
        Horizontal great-circle distance only. This does not assess terrain,
        cross-track error, or flight readiness.
      </small>
    </div>
  );
}
