import React from "react";

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

export default function AerialKitWaypointRouteSummary({ route }) {
  if (!route || route.status !== "ok") return null;
  return (
    <div className="aerial-kit-route-summary">
      <div>
        <span>Total route</span>
        <strong>{distanceLabel(route.totalDistanceM)}</strong>
        <small>
          {route.legs.length} leg{route.legs.length === 1 ? "" : "s"} ·{" "}
          {route.waypointCount} waypoint{route.waypointCount === 1 ? "" : "s"}
        </small>
      </div>
      {route.legs.length > 0 && (
        <ol aria-label="Estimated waypoint leg distances">
          {route.legs.map((leg) => (
            <li key={`${leg.from}-${leg.to}`}>
              <span>WP {leg.from} → WP {leg.to}</span>
              <strong>{distanceLabel(leg.distanceM)}</strong>
            </li>
          ))}
        </ol>
      )}
      <p>
        Spherical great-circle estimate from board coordinates. It does not
        include terrain, the flown path, or a return-to-home leg.
      </p>
    </div>
  );
}
