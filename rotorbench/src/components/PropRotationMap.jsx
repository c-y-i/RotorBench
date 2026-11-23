import { useId, useState } from "react";
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

const TWIN_MOTOR_ORDER = ["upperLeft", "upperRight"];

export default function PropRotationMap({
  motor = null,
  propeller = null,
  direction = "props-out",
  motorOutputByCorner = null,
  motorOutputs = null,
  motorCount = 4,
}) {
  const id = useId().replace(/:/g, "");
  const [copyMessage, setCopyMessage] = useState("");
  const directionProfile = normalizePropellerDirection(direction);
  const directionLabel = directionProfile === "props-in" ? "props in" : "props out";
  const isTwin = Number(motorCount) === 2;
  const rotationCorners = isTwin ? TWIN_MOTOR_ORDER : MOTOR_CORNER_ORDER;
  const hasOutputs = isTwin
    ? Array.isArray(motorOutputs) && motorOutputs.length >= 2
    : Boolean(motorOutputByCorner);
  const outputFor = (corner, index) => (
    motorOutputByCorner?.[corner] || (isTwin ? motorOutputs?.[index] : null)
  );
  const outputDescription = hasOutputs
    ? rotationCorners
      .map((corner, index) => {
        const mapping = outputFor(corner, index);
        return `${CORNER_LABELS[corner]} output ${mapping.output} (${mapping.spin})`;
      })
      .join(", ")
    : "";
  const cornerPlans = rotationCorners.map((corner, index) => {
    const handedness = getPropellerHandedness(corner, directionProfile);
    const output = outputFor(corner, index);
    return {
      corner,
      handedness,
      output,
      conflict: Boolean(
        output?.spin
        && String(output.spin).toUpperCase() !== handedness,
      ),
    };
  });
  const outputConflicts = cornerPlans.filter((plan) => plan.conflict);
  if (!motor?.id || !propeller?.id) return null;
  const copyText = [
    "# RotorBench prop rotation plan - planning only",
    `Motor: ${motor.name || motor.id}`,
    `Propeller: ${propeller.name || propeller.id}`,
    `Direction: ${directionLabel}`,
    ...(outputConflicts.length
      ? [
          "",
          `# WARNING: ${outputConflicts.length} flight-controller output ${outputConflicts.length === 1 ? "direction conflicts" : "directions conflict"} with the planned prop direction.`,
        ]
      : []),
    "",
    ...cornerPlans.map(({
      corner,
      handedness,
      output,
      conflict,
    }) => {
      return `- ${isTwin && corner === "upperLeft" ? "Left motor" : isTwin ? "Right motor" : CORNER_NAMES[corner]}: ${handedness}${
        output
          ? ` · output ${output.output} (${output.label})`
          : " · output number not mapped"
      }${conflict ? ` [CONFLICT: output ${output.spin} does not match ${handedness}]` : ""}`;
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
        <em className={outputConflicts.length ? "is-conflict" : ""}>
          {directionLabel} · {outputConflicts.length
            ? `${outputConflicts.length} conflict${outputConflicts.length === 1 ? "" : "s"}`
            : hasOutputs ? "outputs mapped" : "CW / CCW"}
        </em>
      </summary>
      <div>
        <svg
          viewBox="0 0 240 190"
          role="img"
          aria-label={isTwin ? "Propeller rotation for twin motors" : "Propeller rotation by frame corner"}
          aria-describedby={`${id}-description`}
        >
          <title>{isTwin ? "Propeller rotation for twin motors" : "Propeller rotation by frame corner"}</title>
          <desc id={`${id}-description`}>
            {isTwin
              ? directionProfile === "props-in"
                ? "The left propeller rotates clockwise and the right propeller rotates counter-clockwise."
                : "The left propeller rotates counter-clockwise and the right propeller rotates clockwise."
              : directionProfile === "props-in"
                ? "Front-left and rear-right propellers rotate clockwise. Front-right and rear-left propellers rotate counter-clockwise."
                : "Front-left and rear-right propellers rotate counter-clockwise. Front-right and rear-left propellers rotate clockwise."}
            {hasOutputs ? ` Firmware outputs: ${outputDescription}.` : ""}
            {outputConflicts.length
              ? ` Direction conflicts: ${outputConflicts.map((plan) => `${CORNER_LABELS[plan.corner]} output ${plan.output.output} is ${plan.output.spin} but the plan expects ${plan.handedness}`).join("; ")}.`
              : ""}
          </desc>
          <text className="prop-map-front" x="120" y="15" textAnchor="middle">
            FRONT
          </text>
          <path
            className="prop-map-frame"
            d={isTwin ? "M36 90 204 90M90 90 120 125 150 90" : "M60 57 180 130M180 57 60 130"}
          />
          {rotationCorners.map((corner, index) => {
            const [x, y] = isTwin
              ? corner === "upperLeft" ? [60, 100] : [180, 100]
              : CORNER_POSITIONS[corner];
            const handedness = getPropellerHandedness(corner, directionProfile);
            const clockwise = handedness === "CW";
            const output = outputFor(corner, index);
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
                {output && (
                  <text
                    className="prop-map-output"
                    x="0"
                    y="-28"
                    textAnchor="middle"
                  >
                    OUT {output.output}
                  </text>
                )}
                <path
                  className={`prop-map-arrow is-${handedness.toLowerCase()}`}
                  d={clockwise
                    ? "M0 18 5 10 -5 10Z"
                    : "M0 18 -5 10 5 10Z"}
                />
                <text className="prop-map-corner" x="0" y="37" textAnchor="middle">
                  {isTwin
                    ? corner === "upperLeft" ? "LEFT" : "RIGHT"
                    : CORNER_LABELS[corner]}
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
        {outputConflicts.length > 0 && (
          <div className="prop-map-conflict" role="note">
            <strong>Output direction conflict</strong>
            <span>
              {outputConflicts.map((plan) => (
                `${CORNER_LABELS[plan.corner]} OUT ${plan.output.output} is ${plan.output.spin}; ${directionLabel} expects ${plan.handedness}`
              )).join(" · ")}
            </span>
            <small>
              Do not rely on this prop map until the flight-controller motor
              direction, reversed setting, and physical wiring agree.
            </small>
          </div>
        )}
        <p>
          {isTwin ? "Twin-motor" : "Corner"} handedness follows the {directionLabel} assembly plan.
          {hasOutputs
            ? isTwin
              ? " Output numbers follow the saved flight-controller wing mixer plan and are not hardware verification."
              : " Output numbers follow the saved flight-controller QUAD X plan and are not hardware verification."
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
