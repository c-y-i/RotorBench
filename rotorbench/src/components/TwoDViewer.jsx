import React from "react";
import {
  getBatteryPlacementMm,
  getFallbackDimensionsMm,
  getFrameMountPointsMm,
  getPropellerOriginsMm,
  getPropellerSweepDiameterMm,
} from "../assembly/assemblyTransforms";

const SAMPLE_SPEC = {
  frame: {
    id: "sample-frame",
    name: "Sample 5-inch frame",
    size: 220,
    motorCount: 4,
    dimensionsMm: [220, 30, 190],
  },
  motor: {
    id: "sample-motor",
    name: "Sample 2207 motor",
    size: "2207",
    mountingPatternMm: [16, 16],
  },
  propeller: {
    id: "sample-propeller",
    name: "Sample 5.1-inch tri-blade",
    size: 5.1,
    bladeCount: 3,
    hubThicknessMm: 7,
  },
  battery: {
    id: "sample-battery",
    name: "Sample 6S pack",
    dimensionsMm: [75, 32, 36],
    mounting_point: [0, 16, -4],
  },
  esc: {
    id: "sample-esc",
    name: "Sample ESC",
    dimensionsMm: [45, 8, 40],
    mounting_point: [0, 0, 0],
  },
  flightController: {
    id: "sample-fc",
    name: "Sample flight controller",
    dimensionsMm: [36, 8, 36],
    mounting_point: [0, 0, 0],
  },
  receiver: {
    id: "sample-receiver",
    name: "Sample receiver",
    dimensionsMm: [24, 7, 18],
    mounting_point: [0, 0, 4],
  },
};

function partDimensions(type, part) {
  return getFallbackDimensionsMm(type, part).map(Number);
}

function propBladePath(radius, bladeCount, index) {
  const angle = (360 / bladeCount) * index;
  return (
    <path
      key={index}
      d={`M 0 0 Q ${radius * 0.42} ${-radius * 0.18} ${radius} 0 Q ${
        radius * 0.46
      } ${radius * 0.13} 0 0`}
      transform={`rotate(${angle})`}
    />
  );
}

export default function TwoDViewer({
  assemblySpec = {},
  propellerDirection = "props-out",
  clearedComponents = [],
}) {
  const hasSelectedAssembly = Boolean(assemblySpec?.frame?.id);
  const spec = hasSelectedAssembly ? assemblySpec : SAMPLE_SPEC;
  const frame = spec.frame;
  const motor = spec.motor;
  const propeller = spec.propeller;
  const battery = spec.battery;
  const hidden = new Set(clearedComponents);
  const batteryVisible = Boolean(battery) && !hidden.has("battery");
  const propellersVisible = Boolean(propeller) && !hidden.has("propeller");
  const mounts = getFrameMountPointsMm(frame);
  const propellerOrigins = propellersVisible
    ? getPropellerOriginsMm(frame, motor, propeller, propellerDirection)
    : [];
  const frameDims = partDimensions("frame", frame);
  const motorDims = partDimensions("motor", motor || {});
  const propellerDiameter = propellersVisible
    ? getPropellerSweepDiameterMm(propeller)
    : 0;
  const bladeCount = Math.min(
    Math.max(Number(propeller?.bladeCount) || 3, 2),
    6,
  );
  const batteryPlacement = batteryVisible
    ? getBatteryPlacementMm(frame, battery, spec)
    : null;
  const electronics = [
    ["esc", "ESC", spec.esc, "esc"],
    ["flightController", "FC", spec.flightController, "flight_controller"],
    ["receiver", "RX", spec.receiver, "receiver"],
  ]
    .filter(([, , part, key]) => part?.id && !hidden.has(key))
    .map(([key, label, part, type]) => ({
      key,
      label,
      part,
      dims: partDimensions(type, part),
    }));
  const electronicsDims = electronics.reduce((largest, entry) => [
    Math.max(largest[0], entry.dims[0]),
    Math.max(largest[1], entry.dims[1]),
    Math.max(largest[2], entry.dims[2]),
  ], [0, 0, 0]);

  const xValues = [
    -frameDims[0] / 2,
    frameDims[0] / 2,
    ...mounts.map((point) => point[0]),
    ...propellerOrigins.flatMap((point) => [
      point[0] - propellerDiameter / 2,
      point[0] + propellerDiameter / 2,
    ]),
  ];
  const zValues = [
    -frameDims[2] / 2,
    frameDims[2] / 2,
    ...mounts.map((point) => point[2]),
    ...propellerOrigins.flatMap((point) => [
      point[2] - propellerDiameter / 2,
      point[2] + propellerDiameter / 2,
    ]),
  ];
  if (batteryPlacement) {
    xValues.push(
      batteryPlacement.origin[0] - batteryPlacement.size[0] / 2,
      batteryPlacement.origin[0] + batteryPlacement.size[0] / 2,
    );
    zValues.push(
      batteryPlacement.origin[2] - batteryPlacement.size[2] / 2,
      batteryPlacement.origin[2] + batteryPlacement.size[2] / 2,
    );
  }
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);
  const span = Math.max(maxX - minX, maxZ - minZ, 40);
  const padding = span * 0.09;
  const viewMinX = (minX + maxX) / 2 - span / 2 - padding;
  const viewMinZ = (minZ + maxZ) / 2 - span / 2 - padding;
  const viewSize = span + padding * 2;
  const motorRadius = Math.max(motorDims[0] / 2, 4);
  const labelSize = Math.max(viewSize * 0.021, 5.5);
  const stackLabelY = maxZ + labelSize * 1.5;
  const labelParts = [
    frame?.name || "frame",
    motor?.name || "motors",
    propellersVisible ? propeller?.name : null,
    batteryVisible ? battery?.name : null,
    ...electronics.map((entry) => entry.part.name),
  ].filter(Boolean);
  const label = `${
    hasSelectedAssembly ? "Top view of selected assembly" : "Top view of sample assembly"
  }. ${mounts.length} motor${mounts.length === 1 ? "" : "s"}, ${
    propellersVisible ? `${bladeCount}-blade propellers, ` : "no propellers visible, "
  }${propellerDirection}. ${labelParts.join("; ")}.`;

  return (
    <div className="drone-wrapper assembly-plan-view">
      <svg
        viewBox={`${viewMinX} ${viewMinZ} ${viewSize} ${viewSize}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>
        <defs>
          <pattern id="assembly-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" />
          </pattern>
          <pattern id="assembly-grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#assembly-grid-minor)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" />
          </pattern>
        </defs>
        <rect
          x={viewMinX}
          y={viewMinZ}
          width={viewSize}
          height={viewSize}
          className="assembly-plan-grid"
        />

        <g className="assembly-plan-axes" aria-hidden="true">
          <line x1={viewMinX + padding} y1={0} x2={viewMinX + padding + 30} y2={0} />
          <line x1={0} y1={viewMinZ + padding} x2={0} y2={viewMinZ + padding + 30} />
          <text x={viewMinX + padding + 34} y={4} fontSize={labelSize}>X</text>
          <text x={4} y={viewMinZ + padding + 34} fontSize={labelSize}>Z</text>
          <text
            x={(minX + maxX) / 2}
            y={viewMinZ + padding * 0.9}
            textAnchor="middle"
            className="assembly-plan-front"
            fontSize={labelSize * 1.1}
          >
            FRONT ↑
          </text>
        </g>

        {!hidden.has("frame") && (
          <g className="assembly-plan-frame">
            {mounts.map((point, index) => (
              <line
                key={`arm-${index}`}
                x1={0}
                y1={0}
                x2={point[0]}
                y2={point[2]}
              />
            ))}
            <rect
              x={-frameDims[0] / 2}
              y={-frameDims[2] / 2}
              width={frameDims[0]}
              height={frameDims[2]}
              rx={Math.min(frameDims[0], frameDims[2]) * 0.08}
            />
            <rect
              x={-Math.min(frameDims[0] * 0.18, 46)}
              y={-Math.min(frameDims[2] * 0.2, 50)}
              width={Math.min(frameDims[0] * 0.36, 92)}
              height={Math.min(frameDims[2] * 0.4, 100)}
              className="assembly-plan-deck"
            />
          </g>
        )}

        {batteryPlacement && (
          <>
            <rect
              className="assembly-plan-battery"
              x={batteryPlacement.origin[0] - batteryPlacement.size[0] / 2}
              y={batteryPlacement.origin[2] - batteryPlacement.size[2] / 2}
              width={batteryPlacement.size[0]}
              height={batteryPlacement.size[2]}
              rx={Math.min(batteryPlacement.size[0], batteryPlacement.size[2]) * 0.09}
            />
            <text
              className="assembly-plan-battery-label"
              x={batteryPlacement.origin[0]}
              y={batteryPlacement.origin[2] + labelSize * 0.35}
              textAnchor="middle"
              fontSize={labelSize * 0.9}
            >
              BATTERY
            </text>
          </>
        )}

        {electronics.length > 0 && (
          <g className="assembly-plan-electronics" aria-hidden="true">
            <rect
              x={-electronicsDims[0] / 2}
              y={-electronicsDims[2] / 2}
              width={electronicsDims[0]}
              height={electronicsDims[2]}
              rx="2"
            />
            <text
              x={0}
              y={stackLabelY}
              textAnchor="middle"
              fontSize={labelSize}
            >
              {electronics.map((entry) => entry.label).join(" / ")} stack
            </text>
          </g>
        )}

        {propellerOrigins.map((point, index) => {
          const handedness = point[3];
          return (
            <g
              key={`propeller-${index}`}
              className={`assembly-plan-propeller is-${handedness.toLowerCase()}`}
              transform={`translate(${point[0]} ${point[2]})`}
              aria-hidden="true"
            >
              {Array.from({ length: bladeCount }, (_, bladeIndex) => (
                propBladePath(propellerDiameter / 2, bladeCount, bladeIndex)
              ))}
              <circle r={Math.max(propellerDiameter * 0.055, 3)} />
              <text
                x={propellerDiameter * 0.54}
                y={-3}
                fontSize={labelSize * 0.9}
              >
                {handedness}
              </text>
            </g>
          );
        })}

        {mounts.map((point, index) => (
          <g
            key={`motor-${index}`}
            className={`assembly-plan-motor ${
              hidden.has("motor") ? "is-hidden" : ""
            }`}
            transform={`translate(${point[0]} ${point[2]})`}
            aria-hidden="true"
          >
            <circle r={motorRadius} className={hidden.has("motor") ? "is-hidden" : ""} />
            <circle
              r={Math.max(motorRadius * 0.34, 2)}
              className={`assembly-plan-hub ${hidden.has("motor") ? "is-hidden" : ""}`}
            />
            {!hidden.has("motor") && (
              <text y={motorRadius + 7} textAnchor="middle" fontSize={labelSize}>
                {`M${index + 1} ${propellerOrigins[index]?.[3] || ""}`}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
