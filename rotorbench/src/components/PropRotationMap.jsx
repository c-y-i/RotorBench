import React, { useId, useState } from "react";
import { Clipboard, Fan } from "lucide-react";
import {
  MOTOR_CORNER_ORDER,
  getPropellerHandedness,
  normalizePropellerDirection,
} from "../assembly/assemblyTransforms";

const CORNER_LABELS = {
  upperLeft: "UL",
  upperRight: "UR",
  lowerRight: "LR",
  lowerLeft: "LL",
};

const CORNER_NAMES = {
  upperLeft: "Front-left",
  upperRight: "Front-right",
  lowerRight: "Rear-right",
  lowerLeft: "Rear-left",
};

const CORNER_POSITIONS = {
  upperLeft: [60, 57],
  upperRight: [180, 57],
  lowerRight: [180, 130],
  lowerLeft: [60, 130],
};

export default function PropRotationMap({
  motor = null,
  propeller = null,
  direction = "props-out",
  motorOutputByCorner = null,
}) {
  const id = useId().replace(/:/g, "");
  const [copyMessage, setCopyMessage] = useState("");
  const directionProfile = normalizePropellerDirection(direction);
  const directionLabel = directionProfile === "props-in" ? "props in" : "props out";
  const outputDescription = motorOutputByCorner
    ? MOTOR_CORNER_ORDER
      .map((corner) => {
        const mapping = motorOutputByCorner[corner];
        return `${CORNER_LABELS[corner]} output ${mapping.output} (${mapping.spin})`;
      })
      .join(", ")
    : "";
  if (!motor?.id || !propeller?.id) return null;
  const copyText = [
    "# RotorBench prop rotation plan - planning only",
    `Motor: ${motor.name || motor.id}`,
    `Propeller: ${propeller.name || propeller.id}`,
    `Direction: ${directionLabel}`,
    "",
    ...MOTOR_CORNER_ORDER.map((corner) => {
      const output = motorOutputByCorner?.[corner];
      return `- ${CORNER_NAMES[corner]}: ${getPropellerHandedness(corner, directionProfile)}${
        output
          ? ` · output ${output.output} (${output.label})`
          : " · output number not mapped"
      }`;
    }),
    "",
    "Planning data only. Confirm motor order, wiring, propeller markings, and direction with props removed before flight.",
  ].join("\n");
  const copyMap = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyMessage("Prop map copied. Nothing was sent to hardware.");
    } catch {
      setCopyMessage("The browser refused clipboard access.");
    }
  };

  return (
    <details className="prop-rotation-map">
      <summary>
        <Fan size={16} aria-hidden="true" />
        <span>
          <strong>Prop rotation map</strong>
          <small>{motor.name} · {propeller.name}</small>
        </span>
        <em>{directionLabel} · {motorOutputByCorner ? "outputs mapped" : "CW / CCW"}</em>
      </summary>
      <div>
        <svg
          viewBox="0 0 240 190"
          role="img"
          aria-label="Propeller rotation by frame corner"
          aria-describedby={`${id}-description`}
        >
          <title>Propeller rotation by frame corner</title>
          <desc id={`${id}-description`}>
            {directionProfile === "props-in"
              ? "Front-left and rear-right propellers rotate clockwise. Front-right and rear-left propellers rotate counter-clockwise."
              : "Front-left and rear-right propellers rotate counter-clockwise. Front-right and rear-left propellers rotate clockwise."}
            {motorOutputByCorner ? ` Firmware outputs: ${outputDescription}.` : ""}
          </desc>
          <text className="prop-map-front" x="120" y="15" textAnchor="middle">
            FRONT
          </text>
          <path className="prop-map-frame" d="M60 57 180 130M180 57 60 130" />
          {MOTOR_CORNER_ORDER.map((corner) => {
            const [x, y] = CORNER_POSITIONS[corner];
            const handedness = getPropellerHandedness(corner, directionProfile);
            const clockwise = handedness === "CW";
            return (
              <g key={corner} transform={`translate(${x} ${y})`}>
                <circle className="prop-map-motor" r="21" />
                <path className="prop-map-blades" d="M-17-7 17 7M-17 7 17-7" />
                <path
                  className={`prop-map-direction is-${handedness.toLowerCase()}`}
                  d={clockwise
                    ? "M-14 0A14 14 0 1 1 0 14"
                    : "M14 0A14 14 0 1 0 0 14"}
                />
                {motorOutputByCorner && (
                  <text
                    className="prop-map-output"
                    x="0"
                    y="-28"
                    textAnchor="middle"
                  >
                    OUT {motorOutputByCorner[corner].output}
                  </text>
                )}
                <path
                  className={`prop-map-arrow is-${handedness.toLowerCase()}`}
                  d={clockwise
                    ? "M0 18 5 10 -5 10Z"
                    : "M0 18 -5 10 5 10Z"}
                />
                <text className="prop-map-corner" x="0" y="37" textAnchor="middle">
                  {CORNER_LABELS[corner]}
                </text>
                <text
                  className={`prop-map-rotation is-${handedness.toLowerCase()}`}
                  x="0"
                  y="49"
                  textAnchor="middle"
                >
                  {handedness}
                </text>
              </g>
            );
          })}
        </svg>
        <p>
          Corner handedness follows the {directionLabel} assembly plan.
          {motorOutputByCorner
            ? " Output numbers follow the saved flight-controller QUAD X plan and are not hardware verification."
            : " Output numbers are omitted until a supported saved flight-controller map is available."}
          {" "}Confirm the flight-controller direction, airframe, and propeller
          markings before wiring or flight.
        </p>
        <button type="button" className="prop-map-copy" onClick={copyMap}>
          <Clipboard size={14} aria-hidden="true" />
          Copy prop map
        </button>
        {copyMessage && (
          <p className="prop-map-message" role="status">{copyMessage}</p>
        )}
      </div>
    </details>
  );
}
