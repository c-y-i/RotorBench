import React, { useEffect, useMemo, useState } from "react";
import { Clipboard, Crosshair, TriangleAlert } from "lucide-react";
import {
  buildCenterOfGravityReport,
  estimateAssemblyCenterOfGravity,
} from "../utils/assemblyCenterOfGravity";
import "../styles/workbench.css";

function CgPlot({ estimate, measuredCg }) {
  if (!estimate.frameEnvelopeMm || !estimate.planarOffsetMm) return null;
  const width = 300;
  const height = 190;
  const padding = 20;
  const [frameWidth, frameDepth] = estimate.frameEnvelopeMm;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const x = width / 2 + (estimate.planarOffsetMm.lateral / frameWidth) * innerWidth;
  const y = height / 2
    + (estimate.planarOffsetMm.longitudinal / frameDepth) * innerHeight;
  const measuredX = measuredCg
    ? width / 2 + (Number(measuredCg[0]) / frameWidth) * innerWidth
    : null;
  const measuredY = measuredCg
    ? height / 2 + (Number(measuredCg[1]) / frameDepth) * innerHeight
    : null;
  const description = [
    `Top-view planning plot on a ${frameWidth} by ${frameDepth} millimetre frame envelope.`,
    `The estimated center is ${Math.abs(estimate.planarOffsetMm.lateral)} millimetres ${
      estimate.planarOffsetMm.lateral < 0 ? "left" : "right"
    } and ${Math.abs(estimate.planarOffsetMm.longitudinal)} millimetres ${
      estimate.planarOffsetMm.longitudinal < 0 ? "forward" : "aft"
    } of the assembly datum.`,
    measuredCg
      ? `The recorded measured balance point is ${Math.abs(Number(measuredCg[0]))} millimetres ${Number(measuredCg[0]) < 0 ? "left" : "right"} and ${Math.abs(Number(measuredCg[1]))} millimetres ${Number(measuredCg[1]) < 0 ? "forward" : "aft"}.`
      : "No measured balance point is recorded.",
    "The estimate uses catalog masses and resolved assembly origins; it is not a measured aircraft center of gravity.",
  ].join(" ");

  return (
    <svg
      className="assembly-cg-plot"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="assembly-cg-plot-title assembly-cg-plot-desc"
    >
      <title id="assembly-cg-plot-title">Estimated center-of-gravity offset</title>
      <desc id="assembly-cg-plot-desc">{description}</desc>
      <rect
        className="assembly-cg-frame"
        x={padding}
        y={padding}
        width={innerWidth}
        height={innerHeight}
        rx="4"
      />
      <line
        className="assembly-cg-axis"
        x1={width / 2}
        y1={padding}
        x2={width / 2}
        y2={height - padding}
      />
      <line
        className="assembly-cg-axis"
        x1={padding}
        y1={height / 2}
        x2={width - padding}
        y2={height / 2}
      />
      <circle
        className="assembly-cg-datum"
        cx={width / 2}
        cy={height / 2}
        r="5"
      />
      <line
        className="assembly-cg-offset"
        x1={width / 2}
        y1={height / 2}
        x2={x}
        y2={y}
      />
      <circle className="assembly-cg-point" cx={x} cy={y} r="7" />
      {measuredCg && (
        <>
          <line
            className="assembly-cg-measured-line"
            x1={x}
            y1={y}
            x2={measuredX}
            y2={measuredY}
          />
          <circle
            className="assembly-cg-measured-point"
            cx={measuredX}
            cy={measuredY}
            r="6"
          />
          <text
            className="assembly-cg-measured-label"
            x={measuredX + 10}
            y={measuredY - 9}
          >
            MEASURED
          </text>
        </>
      )}
      <text className="assembly-cg-label" x={width / 2} y={13} textAnchor="middle">
        Nose
      </text>
      <text className="assembly-cg-label" x={7} y={height / 2 + 4}>
        L
      </text>
      <text className="assembly-cg-label" x={width - 7} y={height / 2 + 4} textAnchor="end">
        R
      </text>
      <text className="assembly-cg-label" x={width / 2} y={height - 4} textAnchor="middle">
        Tail
      </text>
    </svg>
  );
}

export default function AssemblyCenterOfGravity({
  parts = {},
  buildName = "",
  measuredCg = null,
  onMeasuredCgChange,
}) {
  const estimate = useMemo(
    () => estimateAssemblyCenterOfGravity(parts),
    [parts],
  );
  const [message, setMessage] = useState("");
  const [measuredX, setMeasuredX] = useState(
    measuredCg ? String(measuredCg[0]) : "",
  );
  const [measuredZ, setMeasuredZ] = useState(
    measuredCg ? String(measuredCg[1]) : "",
  );
  useEffect(() => {
    setMeasuredX(measuredCg ? String(measuredCg[0]) : "");
    setMeasuredZ(measuredCg ? String(measuredCg[1]) : "");
  }, [measuredCg]);
  const measuredValuesValid = measuredX !== ""
    && measuredZ !== ""
    && Number.isFinite(Number(measuredX))
    && Number.isFinite(Number(measuredZ));
  const measuredDelta = measuredCg && estimate.planarOffsetMm
    ? {
        lateral: Math.round(
          (Number(measuredCg[0]) - estimate.planarOffsetMm.lateral) * 10,
        ) / 10,
        longitudinal: Math.round(
          (Number(measuredCg[1]) - estimate.planarOffsetMm.longitudinal) * 10,
        ) / 10,
      }
    : null;
  const copyReport = async () => {
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildCenterOfGravityReport(
          estimate,
          buildName || "Untitled build",
          measuredCg,
        ),
      );
      setMessage(
        measuredCg
          ? "CG comparison copied. The measured point remains build-local evidence."
          : "CG estimate copied. It remains a planning calculation, not a measured balance.",
      );
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  return (
    <details className="assembly-cg-panel">
      <summary>
        <Crosshair size={16} aria-hidden="true" />
        <span>
          <strong>Center of gravity</strong>
          <small>
            {estimate.planarOffsetMm
              ? `${estimate.massG} g placed · X ${estimate.planarOffsetMm.lateral} mm · Z ${estimate.planarOffsetMm.longitudinal} mm`
              : estimate.reason}
          </small>
        </span>
        <em className={`is-${estimate.status}`}>
          {measuredCg
            ? "Measured"
            : estimate.status === "available"
            ? "Estimated"
            : estimate.status === "partial"
              ? "Partial"
              : "Unavailable"}
        </em>
      </summary>
      <div className="assembly-cg-body">
        {estimate.status === "unavailable" ? (
          <div className="assembly-cg-unavailable" role="note">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>{estimate.reason}</span>
          </div>
        ) : (
          <>
            <div className="assembly-cg-overview">
              <CgPlot estimate={estimate} measuredCg={measuredCg} />
              <dl className="assembly-cg-facts">
                <div>
                  <dt>Lateral X</dt>
                  <dd>{estimate.planarOffsetMm.lateral} mm</dd>
                </div>
                <div>
                  <dt>Fore / aft Z</dt>
                  <dd>{estimate.planarOffsetMm.longitudinal} mm</dd>
                </div>
                <div>
                  <dt>Offset</dt>
                  <dd>{estimate.planarOffsetMm.magnitude} mm</dd>
                </div>
                <div>
                  <dt>Placed mass</dt>
                  <dd>{estimate.massG} g</dd>
                </div>
              </dl>
            </div>

            <fieldset className="assembly-cg-measured">
              <legend>Measured balance point</legend>
              <p>
                Optional build-local measurement. Use the same X/Z datum shown
                above and record the physical balance point with the aircraft
                assembled.
              </p>
              <div className="assembly-cg-measured-fields">
                <label>
                  <span>Lateral X (mm)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={measuredX}
                    onChange={(event) => setMeasuredX(event.target.value)}
                  />
                </label>
                <label>
                  <span>Fore / aft Z (mm)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={measuredZ}
                    onChange={(event) => setMeasuredZ(event.target.value)}
                  />
                </label>
              </div>
              {measuredCg && (
                <dl className="assembly-cg-delta">
                  <div>
                    <dt>Measured</dt>
                    <dd>X {measuredCg[0]} / Z {measuredCg[1]} mm</dd>
                  </div>
                  <div>
                    <dt>Measured − estimate</dt>
                    <dd>
                      X {measuredDelta.lateral} / Z{" "}
                      {measuredDelta.longitudinal} mm
                    </dd>
                  </div>
                </dl>
              )}
              <div className="assembly-cg-measured-actions">
                <button
                  type="button"
                  disabled={!measuredValuesValid || !onMeasuredCgChange}
                  onClick={() => onMeasuredCgChange?.([
                    Number(measuredX),
                    Number(measuredZ),
                  ])}
                >
                  {measuredCg ? "Update measurement" : "Save measurement"}
                </button>
                {measuredCg && (
                  <button
                    type="button"
                    onClick={() => onMeasuredCgChange?.(null)}
                  >
                    Clear measurement
                  </button>
                )}
              </div>
            </fieldset>

            {(estimate.missingWeights.length > 0
              || estimate.missingPlacements.length > 0) && (
              <div className="assembly-cg-gaps" role="status">
                <TriangleAlert size={15} aria-hidden="true" />
                <span>
                  {estimate.missingWeights.length > 0
                    ? `Missing mass: ${estimate.missingWeights.join(", ")}. `
                    : ""}
                  {estimate.missingPlacements.length > 0
                    ? `Missing placement: ${estimate.missingPlacements.join(", ")}.`
                    : ""}
                </span>
              </div>
            )}

            <details className="assembly-cg-contributions">
              <summary>
                {estimate.contributions.length} mass contributions
              </summary>
              <ol>
                {estimate.contributions.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>
                        X {item.positionMm[0]} · Y {item.positionMm[1]} · Z {item.positionMm[2]} mm
                      </small>
                    </span>
                    <em>{item.massG} g · {item.sharePct}%</em>
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
        <p>
          Catalog masses are placed at inferred or measured assembly origins.
          The 50 g build allowance is excluded because its location is unknown.
          A measured balance point is build-local evidence, not hardware
          verification. Balance the physical aircraft before flight.
        </p>
        <div className="assembly-cg-actions">
          <button type="button" onClick={copyReport}>
            <Clipboard size={14} aria-hidden="true" />
            Copy CG estimate
          </button>
          {message && <span role="status">{message}</span>}
        </div>
      </div>
    </details>
  );
}
