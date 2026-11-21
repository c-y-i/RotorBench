import React, { useId } from "react";
import { Fan } from "lucide-react";
import {
  MOTOR_CORNER_ORDER,
  PROPELLER_HANDEDNESS_BY_CORNER,
} from "../assembly/assemblyTransforms";

const CORNER_LABELS = {
  upperLeft: "UL",
  upperRight: "UR",
  lowerRight: "LR",
  lowerLeft: "LL",
};

const CORNER_POSITIONS = {
  upperLeft: [60, 57],
  upperRight: [180, 57],
  lowerRight: [180, 130],
  lowerLeft: [60, 130],
};

export default function PropRotationMap({ motor = null, propeller = null }) {
  const id = useId().replace(/:/g, "");
  if (!motor?.id || !propeller?.id) return null;

  return (
    <details className="prop-rotation-map">
      <summary>
        <Fan size={16} aria-hidden="true" />
        <span>
          <strong>Prop rotation map</strong>
          <small>{motor.name} · {propeller.name}</small>
        </span>
        <em>4 corners · CW / CCW</em>
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
            Front-left and rear-right propellers rotate counter-clockwise.
            Front-right and rear-left propellers rotate clockwise.
          </desc>
          <text className="prop-map-front" x="120" y="15" textAnchor="middle">
            FRONT
          </text>
          <path className="prop-map-frame" d="M60 57 180 130M180 57 60 130" />
          {MOTOR_CORNER_ORDER.map((corner) => {
            const [x, y] = CORNER_POSITIONS[corner];
            const direction = PROPELLER_HANDEDNESS_BY_CORNER[corner];
            const clockwise = direction === "CW";
            return (
              <g key={corner} transform={`translate(${x} ${y})`}>
                <circle className="prop-map-motor" r="21" />
                <path className="prop-map-blades" d="M-17-7 17 7M-17 7 17-7" />
                <path
                  className={`prop-map-direction is-${direction.toLowerCase()}`}
                  d={clockwise
                    ? "M-14 0A14 14 0 1 1 0 14"
                    : "M14 0A14 14 0 1 0 0 14"}
                />
                <path
                  className={`prop-map-arrow is-${direction.toLowerCase()}`}
                  d={clockwise
                    ? "M0 18 5 10 -5 10Z"
                    : "M0 18 -5 10 5 10Z"}
                />
                <text className="prop-map-corner" x="0" y="37" textAnchor="middle">
                  {CORNER_LABELS[corner]}
                </text>
                <text
                  className={`prop-map-rotation is-${direction.toLowerCase()}`}
                  x="0"
                  y="49"
                  textAnchor="middle"
                >
                  {direction}
                </text>
              </g>
            );
          })}
        </svg>
        <p>
          Corner handedness follows the current assembly contract and is
          intentionally not labeled as vendor motor numbers. Confirm the
          airframe and propeller markings before wiring or flight.
        </p>
      </div>
    </details>
  );
}
