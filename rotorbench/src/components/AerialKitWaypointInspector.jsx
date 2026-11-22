import React, { useState } from "react";
import { greatCircleDistanceM } from "../utils/aerialKitWaypoints";

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(3)} km`
    : `${value.toFixed(1)} m`;
}

export default function AerialKitWaypointInspector({
  inventory,
  activeWaypointIndex = null,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  if (!inventory || !Array.isArray(inventory.slots) || inventory.slots.length === 0) {
    return null;
  }

  const indexes = inventory.slots.map((slot) => slot.index);
  const activeIndex = indexes.includes(activeWaypointIndex)
    ? activeWaypointIndex
    : null;
  const resolvedIndex = indexes.includes(selectedIndex)
    ? selectedIndex
    : activeIndex ?? indexes[0];
  const selectedSlotIndex = inventory.slots.findIndex(
    (slot) => slot.index === resolvedIndex,
  );
  const selected = inventory.slots[selectedSlotIndex];
  const previous = selectedSlotIndex > 0
    ? inventory.slots[selectedSlotIndex - 1]
    : null;
  const next = selectedSlotIndex < inventory.slots.length - 1
    ? inventory.slots[selectedSlotIndex + 1]
    : null;
  const previousLegM = previous && previous.complete && selected.complete
    ? greatCircleDistanceM(
        previous.lat,
        previous.lon,
        selected.lat,
        selected.lon,
      )
    : null;
  const nextLegM = next && next.complete && selected.complete
    ? greatCircleDistanceM(
        selected.lat,
        selected.lon,
        next.lat,
        next.lon,
      )
    : null;

  return (
    <section
      className="aerial-kit-waypoint-inspector"
      aria-label="Validated waypoint inspector"
    >
      <div className="aerial-kit-waypoint-inspector-heading">
        <strong>Waypoint inspector</strong>
        <span>{inventory.slots.length} validated slot
          {inventory.slots.length === 1 ? "" : "s"}
        </span>
      </div>
      <div
        className="aerial-kit-waypoint-inspector-list"
        role="group"
        aria-label="Validated waypoints"
      >
        {inventory.slots.map((slot) => {
          const isSelected = slot.index === resolvedIndex;
          const isActive = slot.index === activeIndex;
          return (
            <button
              key={slot.index}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedIndex(slot.index)}
            >
              <span>
                <strong>WP {slot.index}</strong>
                {isActive && <small>Active</small>}
              </span>
              <em>
                {slot.complete
                  ? `${slot.lat.toFixed(7)}, ${slot.lon.toFixed(7)}`
                  : slot.errors.join(" · ")}
              </em>
            </button>
          );
        })}
      </div>
      <div className="aerial-kit-waypoint-inspector-detail" aria-live="polite">
        <div>
          <strong>Selected WP {selected.index}</strong>
          <span>
            {selected.index === activeIndex ? "Observed active target" : "Local inspection"}
          </span>
        </div>
        <dl>
          <div>
            <dt>Previous leg</dt>
            <dd>{previous ? distanceLabel(previousLegM) : "Start"}</dd>
          </div>
          <div>
            <dt>Next leg</dt>
            <dd>{next ? distanceLabel(nextLegM) : "Final"}</dd>
          </div>
        </dl>
        <p>
          Selecting a waypoint is local inspection only. Leg values are
          great-circle geometry between board coordinates and do not indicate
          a flown path, terrain clearance, or readiness.
        </p>
      </div>
    </section>
  );
}
