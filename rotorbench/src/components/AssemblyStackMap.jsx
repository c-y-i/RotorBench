import React, { useId } from "react";
import { Layers } from "lucide-react";
import {
  getBatteryPlacementMm,
  getFallbackDimensionsMm,
  getMotorOriginsMm,
  getPropellerOriginsMm,
  getStackLevelsMm,
} from "../assembly/assemblyTransforms";

const STACK_PARTS = [
  { key: "propeller", label: "Propellers" },
  { key: "motor", label: "Motors" },
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
  motor = null,
  propeller = null,
}) {
  const id = useId().replace(/:/g, "");
  if (!frame?.id) return null;

  const stackParts = { esc, flightController, receiver };
  const levels = getStackLevelsMm(frame, stackParts);
  const motorCount = Number(frame.motorCount) || 4;
  const motorOrigins = motor?.id ? getMotorOriginsMm(frame, motor) : [];
  const propellerOrigins = motor?.id && propeller?.id
    ? getPropellerOriginsMm(frame, motor, propeller)
    : [];
  const batteryPlacement = battery?.id
    ? getBatteryPlacementMm(frame, battery, stackParts)
    : null;
  const parts = {
    frame,
    esc,
    flightController,
    receiver,
    battery,
    motor,
    propeller,
  };
  const entries = STACK_PARTS.flatMap(({ key, label }) => {
    const part = parts[key];
    if (!part?.id) return [];
    let height;
    let y;
    if (key === "battery") {
      height = batteryPlacement.size[1];
      y = batteryPlacement.origin[1];
    } else if (key === "motor") {
      height = getFallbackDimensionsMm("motor", part)[1];
      y = motorOrigins[0]?.[1] ?? 0;
    } else if (key === "propeller") {
      height = getFallbackDimensionsMm("propeller", part)[1];
      y = propellerOrigins[0]?.[1] ?? 0;
    } else {
      height = getFallbackDimensionsMm(
        key === "flightController" ? "flight_controller" : key,
        part,
      )[1];
      y = key === "frame" ? 0 : levels[key];
    }
    return [{
      key,
      label: ["motor", "propeller"].includes(key)
        ? `${label} ×${motorCount}`
        : label,
      y,
      height,
      top: y + height,
      confidence: confidenceLabel(part),
    }];
  }).sort((left, right) => right.top - left.top);
  const stackBaseEstimated = frame.estimatedFields?.includes("stackHeight");

  return (
    <details className="assembly-stack-map">
      <summary>
        <Layers size={16} aria-hidden="true" />
        <span>
          <strong>Assembly profile</strong>
          <small>Frame, propulsion, electronics, and battery heights</small>
        </span>
        <em>{entries.length} component levels</em>
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
          Positions are derived from frame, propulsion, electronics, and battery
          geometry in the same transform contract used by the 3D viewer.
          {stackBaseEstimated
            ? " The frame stack height is estimated and requires measurement for fit confidence."
            : " This diagram does not replace the placement audit or a physical fit check."}
        </p>
      </div>
    </details>
  );
}
