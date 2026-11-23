import { useState } from "react";
import AerialKitRouteSketch from "./AerialKitRouteSketch";
import AerialKitWaypointInspector from "./AerialKitWaypointInspector";
import AerialKitWaypointRouteSummary from "./AerialKitWaypointRouteSummary";

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

function ageLabel(value) {
  if (value == null) return "Unknown";
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s old`
    : `${Math.max(0, value).toFixed(0)} ms old`;
}

export default function AerialKitMissionRouteEvidence({ route }) {
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState(null);
  if (!route) return null;
  const routeSummary = {
    status: "ok",
    waypointCount: route.route.waypointCount,
    legs: route.legs,
    totalDistanceM: route.route.totalDistanceM,
  };
  return (
    <section
      className="aerial-kit-mission aerial-kit-waypoints aerial-kit-route-evidence"
      aria-label="Imported Aerial Kit mission route"
    >
      <div className="aerial-kit-section-heading">
        <strong>Validated mission route</strong>
        <span>
          {route.route.waypointCount} waypoints · geometry recomputed
        </span>
      </div>
      <div
        className={`aerial-kit-route-evidence-state ${
          route.staleOnImport ? "is-stale" : "is-fresh"
        }`}
        role="status"
      >
        <strong>
          {route.staleOnImport
            ? "Historical observation"
            : "Fresh observation at import"}
        </strong>
        <span>
          {route.observation.positionSource} · fix {route.observation.gpsFixType} ·{" "}
          {ageLabel(route.importAgeMs)}
        </span>
      </div>
      <dl className="aerial-kit-route-evidence-facts">
        <div>
          <dt>Active target</dt>
          <dd>WP {route.activeTarget.index}</dd>
        </div>
        <div>
          <dt>To active</dt>
          <dd>{distanceLabel(route.progress.distanceToActiveM)}</dd>
        </div>
        <div>
          <dt>After target</dt>
          <dd>{distanceLabel(route.progress.plannedAfterActiveM)}</dd>
        </div>
        <div>
          <dt>Total remaining</dt>
          <dd>{distanceLabel(route.progress.totalRemainingM)}</dd>
        </div>
      </dl>
      <AerialKitWaypointInspector
        inventory={route.inventory}
        activeWaypointIndex={route.activeTarget.index}
        selectedWaypointIndex={selectedWaypointIndex}
        onSelectWaypoint={setSelectedWaypointIndex}
      />
      <AerialKitRouteSketch
        inventory={route.inventory}
        currentPosition={route.observation.position}
        activeWaypointIndex={route.activeTarget.index}
        selectedWaypointIndex={selectedWaypointIndex}
        onSelectWaypoint={setSelectedWaypointIndex}
        positionIsFresh={false}
      />
      <AerialKitWaypointRouteSummary route={routeSummary} />
      <p>
        Every waypoint, leg, route total, active target, and remaining-distance
        suffix was recomputed from the imported coordinates. This artifact
        remains planning evidence; authenticity, writes, RF, arming, and flight
        readiness are not established.
      </p>
    </section>
  );
}
