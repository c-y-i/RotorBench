import React from "react";
import { buildAerialKitRouteSketch } from "../utils/aerialKitWaypoints";

export default function AerialKitRouteSketch({ inventory }) {
  const sketch = buildAerialKitRouteSketch(inventory);
  if (sketch.status === "unavailable") return null;
  if (sketch.status === "empty") {
    return (
      <div className="aerial-kit-route-sketch is-empty" role="note">
        <span>
          <strong>No route to sketch</strong>
          <small>The board reports zero configured waypoints.</small>
        </span>
      </div>
    );
  }
  const polyline = sketch.points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  return (
    <figure className="aerial-kit-route-sketch">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="Local north-up sketch of board-reported waypoint coordinates"
      >
        <title>Local waypoint route sketch</title>
        <desc>
          A local projection of waypoint order and relative position. It is not
          a basemap or a flown-path record.
        </desc>
        <line className="route-north-line" x1="88" y1="12" x2="88" y2="4" />
        <path className="route-north-arrow" d="M 85 7 L 88 3 L 91 7" />
        <text className="route-north-label" x="88" y="17" textAnchor="middle">N</text>
        {sketch.points.length > 1 && (
          <polyline className="route-line" points={polyline} />
        )}
        {sketch.points.map((point, index) => (
          <g key={point.index}>
            <circle
              className={`route-point ${index === 0 ? "is-start" : ""}`}
              cx={point.x}
              cy={point.y}
              r="2.2"
            />
            <text
              className="route-point-label"
              x={point.x}
              y={point.y - 3.6}
              textAnchor="middle"
            >
              WP {point.index}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Local equirectangular sketch · north up · not a basemap or flown path.
      </figcaption>
    </figure>
  );
}
