import React, { useId } from "react";
import { Layers } from "lucide-react";
import {
  getBatteryPlacementMm,
  getFallbackDimensionsMm,
  getStackLevelsMm,
} from "../assembly/assemblyTransforms";

const STACK_PARTS = [
  { key: "battery", label: "Battery" },
  { key: "receiver", label: "Receiver" },
  { key: "flightController", label: "Flight controller" },
  { key: "esc", label: "ESC" },
  { key: "frame", label: "Frame" },
];

function confidenceLabel(part) {
  if (part.measuredFields?.includes("dimensionsMm")) return "Measured";
  if (
    part.estimatedFields?.includes("dimensionsMm")
    || (!part.sourceUrl && !part.dataStatus)
  ) {
    return "Estimated";
  }
  return "Source spec";
}

export default function AssemblyStackMap({
  frame = null,
  esc = null,
  flightController = null,
  receiver = null,
  battery = null,
}) {
  const id = useId().replace(/:/g, "");
  if (!frame?.id) return null;

  const stackParts = { esc, flightController, receiver };
  const levels = getStackLevelsMm(frame, stackParts);
  const batteryPlacement = battery?.id
    ? getBatteryPlacementMm(frame, battery, stackParts)
    : null;
  const parts = {
    frame,
    esc,
    flightController,
    receiver,
    battery,
  };
  const entries = STACK_PARTS.flatMap(({ key, label }) => {
    const part = parts[key];
    if (!part?.id) return [];
    const height = key === "battery"
      ? batteryPlacement.size[1]
      : getFallbackDimensionsMm(
          key === "flightController" ? "flight_controller" : key,
          part,
        )[1];
    const y = key === "frame"
      ? 0
      : key === "battery"
        ? batteryPlacement.origin[1]
        : levels[key];
    return [{
      key,
      label,
      y,
      height,
      top: y + height,
      confidence: confidenceLabel(part),
    }];
  }).sort((left, right) => right.top - left.top);
  const stackBaseEstimated = frame.estimatedFields?.includes("stackHeight");
  const stackCount = [esc, flightController, receiver].filter(Boolean).length;

  return (
    <details className="assembly-stack-map">
      <summary>
        <Layers size={16} aria-hidden="true" />
        <span>
          <strong>Stack profile</strong>
          <small>Side view from the current assembly coordinates</small>
        </span>
        <em>
          {stackCount} stack layer{stackCount === 1 ? "" : "s"}
          {battery ? " · battery above" : ""}
        </em>
      </summary>
      <div className="assembly-stack-map-body">
        <ol aria-describedby={`${id}-description`}>
          {entries.map((entry, index) => (
            <li key={entry.key} className={`is-${entry.key}`}>
              <span className="assembly-stack-map-rail" aria-hidden="true">
                <i />
                {index < entries.length - 1 && <b />}
              </span>
              <span className="assembly-stack-map-copy">
                <strong>{entry.label}</strong>
                <small>
                  {entry.y.toFixed(1)}–{entry.top.toFixed(1)} mm
                </small>
              </span>
              <em className={`is-${entry.confidence.toLowerCase().replace(" ", "-")}`}>
                {entry.confidence}
              </em>
            </li>
          ))}
        </ol>
        <p id={`${id}-description`}>
          Positions are derived from frame, component, and battery geometry in
          the same transform contract used by the 3D viewer.
          {stackBaseEstimated
            ? " The frame stack height is estimated and requires measurement for fit confidence."
            : " This diagram does not replace the placement audit or a physical fit check."}
        </p>
      </div>
    </details>
  );
}
