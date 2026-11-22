import React, { useMemo, useState } from "react";
import { Clipboard, Crosshair, TriangleAlert } from "lucide-react";
import {
  buildCenterOfGravityReport,
  estimateAssemblyCenterOfGravity,
} from "../utils/assemblyCenterOfGravity";
import "../styles/workbench.css";

function CgPlot({ estimate }) {
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
  const description = [
    `Top-view planning plot on a ${frameWidth} by ${frameDepth} millimetre frame envelope.`,
    `The estimated center is ${Math.abs(estimate.planarOffsetMm.lateral)} millimetres ${
      estimate.planarOffsetMm.lateral < 0 ? "left" : "right"
    } and ${Math.abs(estimate.planarOffsetMm.longitudinal)} millimetres ${
      estimate.planarOffsetMm.longitudinal < 0 ? "forward" : "aft"
    } of the assembly datum.`,
    "This is not a measured aircraft center of gravity.",
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

export default function AssemblyCenterOfGravity({ parts = {}, buildName = "" }) {
  const estimate = useMemo(
    () => estimateAssemblyCenterOfGravity(parts),
    [parts],
  );
  const [message, setMessage] = useState("");
  const copyReport = async () => {
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildCenterOfGravityReport(estimate, buildName || "Untitled build"),
      );
      setMessage("CG estimate copied. It remains a planning calculation, not a measured balance.");
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
          {estimate.status === "available"
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
              <CgPlot estimate={estimate} />
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
          Balance the physical aircraft before flight.
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
