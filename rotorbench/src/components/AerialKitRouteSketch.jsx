import { buildAerialKitRouteSketch } from "../utils/aerialKitWaypoints";

export default function AerialKitRouteSketch({
  inventory,
  currentPosition = null,
  activeWaypointIndex = null,
  selectedWaypointIndex = null,
  onSelectWaypoint = null,
  positionIsFresh = true,
}) {
  const sketch = buildAerialKitRouteSketch(inventory, currentPosition);
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
  const boardPosition = sketch.currentPosition?.insideExtent
    ? sketch.currentPosition
    : null;
  const activePoint = Number.isInteger(activeWaypointIndex)
    ? sketch.points.find((point) => point.index === activeWaypointIndex) || null
    : null;
  const selectedPoint = Number.isInteger(selectedWaypointIndex)
    ? sketch.points.find((point) => point.index === selectedWaypointIndex) || null
    : null;
  const selectable = typeof onSelectWaypoint === "function";
  const activeTargetLabel = activePoint ? ` WP ${activePoint.index} is the active target.` : "";
  const selectedTargetLabel = selectedPoint
    ? ` Selected for inspection is WP ${selectedPoint.index}.`
    : "";
  const positionLabel = boardPosition
    ? positionIsFresh
      ? " Fresh board position shown."
      : " Exported board position shown."
    : "";
  const outsideLabel = sketch.currentPosition && !boardPosition
    ? " Fresh board position lies outside this sketch extent."
    : "";
  return (
    <figure className="aerial-kit-route-sketch">
      <svg
        viewBox="0 0 100 100"
        role={selectable ? "group" : "img"}
        aria-label={[
          "Local north-up sketch of",
          boardPosition
            ? `waypoint coordinates with ${positionIsFresh ? "fresh" : "exported"} board position`
            : "board-reported waypoint coordinates",
          activePoint ? `and active target WP ${activePoint.index}` : "",
          selectedPoint ? `with selected waypoint WP ${selectedPoint.index}` : "",
        ].filter(Boolean).join(" ")}
      >
        <title>Local waypoint route sketch</title>
        <desc>
          A local projection of waypoint order and relative position. It is not
          a basemap or a flown-path record.
          {boardPosition
            ? positionIsFresh
              ? " The marked board position is a fresh observation, not the flown path."
              : " The marked board position is the observation recorded at export, not the flown path."
            : ""}
          {activePoint
            ? ` WP ${activePoint.index} is marked as the active target.`
            : ""}
          {selectedPoint
            ? ` WP ${selectedPoint.index} is selected for local inspection.`
            : ""}
        </desc>
        <line className="route-north-line" x1="88" y1="12" x2="88" y2="4" />
        <path className="route-north-arrow" d="M 85 7 L 88 3 L 91 7" />
        <text className="route-north-label" x="88" y="17" textAnchor="middle">N</text>
        {sketch.points.length > 1 && (
          <polyline className="route-line" points={polyline} />
        )}
        {boardPosition && activePoint && (
          <line
            className="route-observation-line"
            x1={boardPosition.x}
            y1={boardPosition.y}
            x2={activePoint.x}
            y2={activePoint.y}
          />
        )}
        {sketch.points.map((point, index) => {
          const isSelected = point.index === selectedWaypointIndex;
          return (
            <g
              key={point.index}
              className={selectable ? "route-point-target" : undefined}
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              aria-label={selectable ? `Inspect waypoint WP ${point.index}` : undefined}
              aria-pressed={selectable ? isSelected : undefined}
              onClick={selectable ? () => onSelectWaypoint(point.index) : undefined}
              onKeyDown={selectable
                ? (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelectWaypoint(point.index);
                  }
                : undefined}
            >
              {isSelected && (
                <circle
                  className="route-selected-ring"
                  cx={point.x}
                  cy={point.y}
                  r="6.2"
                />
              )}
              {point.index === activeWaypointIndex && (
                <circle
                  className="route-active-ring"
                  cx={point.x}
                  cy={point.y}
                  r="4.2"
                />
              )}
              <circle
                className={[
                  "route-point",
                  index === 0 ? "is-start" : "",
                  point.index === activeWaypointIndex ? "is-active" : "",
                ].filter(Boolean).join(" ")}
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
          );
        })}
        {boardPosition && (
          <g className="route-current-position">
            <circle className="route-current-ring" cx={boardPosition.x} cy={boardPosition.y} r="4.2" />
            <circle className="route-current-core" cx={boardPosition.x} cy={boardPosition.y} r="1.8" />
            <path
              d={`M ${boardPosition.x - 5.4} ${boardPosition.y} H ${boardPosition.x + 5.4} M ${boardPosition.x} ${boardPosition.y - 5.4} V ${boardPosition.y + 5.4}`}
            />
            <text
              className="route-current-label"
              x={Math.min(91, boardPosition.x + 4)}
              y={Math.min(94, boardPosition.y + 3.5)}
            >
              Board
            </text>
          </g>
        )}
      </svg>
      <figcaption>
        Local equirectangular sketch · north up · not a basemap or flown path.
        {activeTargetLabel}
        {selectedTargetLabel}
        {positionLabel}
        {boardPosition && activePoint
          ? " The dashed link is an observation, not a flight track."
          : ""}
        {outsideLabel}
      </figcaption>
    </figure>
  );
}
