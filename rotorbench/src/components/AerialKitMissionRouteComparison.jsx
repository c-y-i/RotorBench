import React from "react";

function distanceValue(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

function distanceComparison(values, delta) {
  if (
    !values
    || !Number.isFinite(values.previous)
    || !Number.isFinite(values.current)
  ) {
    return "Unavailable";
  }
  if (!Number.isFinite(delta) || Math.abs(delta) <= 0.05) {
    return `${distanceValue(values.current)} · unchanged`;
  }
  const absolute = Math.abs(delta);
  const deltaText = absolute >= 1000
    ? `${(absolute / 1000).toFixed(3)} km`
    : `${absolute.toFixed(1)} m`;
  return `${distanceValue(values.previous)} → ${distanceValue(values.current)} · ${delta > 0 ? "+" : "−"}${deltaText}`;
}

export default function AerialKitMissionRouteComparison({ comparison }) {
  if (!comparison) return null;
  return (
    <dl
      className="bench-evidence-history-route-diff"
      aria-label="Mission route comparison"
    >
      <div>
        <dt>Waypoints</dt>
        <dd>
          {comparison.waypointCountDelta
            ? `${comparison.waypointCount.previous} → ${comparison.waypointCount.current} · ${comparison.waypointCountDelta > 0 ? "+" : ""}${comparison.waypointCountDelta}`
            : `${comparison.waypointCount.current} · unchanged`}
        </dd>
      </div>
      <div>
        <dt>Active target</dt>
        <dd>
          {comparison.activeTargetChanged
            ? `WP ${comparison.activeTarget.previous ?? "—"} → WP ${comparison.activeTarget.current ?? "—"}`
            : `WP ${comparison.activeTarget.current ?? "—"} · unchanged`}
        </dd>
      </div>
      <div>
        <dt>Total route</dt>
        <dd>
          {distanceComparison(
            comparison.totalDistanceM,
            comparison.totalDistanceDeltaM,
          )}
        </dd>
      </div>
      <div>
        <dt>Remaining</dt>
        <dd>
          {distanceComparison(
            comparison.remainingDistanceM,
            comparison.remainingDistanceDeltaM,
          )}
        </dd>
      </div>
      <div>
        <dt>Observation</dt>
        <dd>
          {comparison.freshnessChange === "unchanged"
            ? comparison.staleOnImport.current
              ? "Historical · unchanged"
              : "Fresh · unchanged"
            : `${comparison.staleOnImport.previous ? "Historical" : "Fresh"} → ${comparison.staleOnImport.current ? "historical" : "fresh"}`}
        </dd>
      </div>
    </dl>
  );
}
