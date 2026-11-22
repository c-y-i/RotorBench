import React, { useRef, useState } from "react";
import { Download } from "lucide-react";
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

function mountCoordinateSource(frame) {
  if (Array.isArray(frame?.motorPositionsMm)) return "frame.motorPositionsMm";
  if (
    Array.isArray(frame?.upper_left_motor_position)
    && Array.isArray(frame?.upper_right_motor_position)
    && Array.isArray(frame?.lower_right_motor_position)
    && Array.isArray(frame?.lower_left_motor_position)
  ) {
    return "named frame motor positions";
  }
  return "derived from catalogued frame layout";
}

export function buildSchematicModel({
  assemblySpec = {},
  propellerDirection = "props-out",
  clearedComponents = [],
} = {}) {
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

  return {
    battery,
    batteryPlacement,
    batteryVisible,
    bladeCount,
    electronics,
    electronicsDims,
    frame,
    frameDims,
    hasSelectedAssembly,
    hidden,
    label,
    labelSize,
    maxX,
    maxZ,
    minX,
    minZ,
    motor,
    motorDims,
    motorRadius,
    mounts,
    padding,
    propeller,
    propellerDiameter,
    propellerDirection,
    propellerOrigins,
    propellersVisible,
    spec,
    stackLabelY,
    viewMinX,
    viewMinZ,
    viewSize,
  };
}

export function buildSchematicExportMetadata(
  model,
  exportedAt = new Date().toISOString(),
) {
  const visibleComponents = {
    frame: !model.hidden.has("frame"),
    motors: !model.hidden.has("motor"),
    propellers: model.propellersVisible,
    battery: model.batteryVisible,
    esc: model.electronics.some((entry) => entry.key === "esc"),
    flightController: model.electronics.some(
      (entry) => entry.key === "flightController",
    ),
    receiver: model.electronics.some((entry) => entry.key === "receiver"),
  };

  return {
    schema: "rotorbench.assembly-schematic.v1",
    exportedAt,
    title: model.label,
    source: model.hasSelectedAssembly ? "selected-build" : "sample-assembly",
    parts: {
      frame: model.frame?.id || null,
      motor: model.motor?.id || null,
      propeller: model.propeller?.id || null,
      battery: model.battery?.id || null,
      esc: model.electronics.find((entry) => entry.key === "esc")?.part.id || null,
      flightController:
        model.electronics.find((entry) => entry.key === "flightController")?.part.id
        || null,
      receiver:
        model.electronics.find((entry) => entry.key === "receiver")?.part.id || null,
    },
    coordinateSystem: {
      units: "mm",
      plane: "XZ",
      view: "top-down",
      up: "+Y",
      front: "-Z",
    },
    propellerDirection: model.propellerDirection,
    motorStationSource: mountCoordinateSource(model.frame),
    motorStations: model.mounts.map((point, index) => ({
      label: `M${index + 1}`,
      positionMm: {
        x: point[0],
        y: point[1],
        z: point[2],
      },
      propellerHandedness: model.propellersVisible
        ? model.propellerOrigins[index]?.[3] || null
        : null,
    })),
    batteryCenterMm: model.batteryPlacement
      ? {
        x: model.batteryPlacement.origin[0],
        y: model.batteryPlacement.origin[1],
        z: model.batteryPlacement.origin[2],
      }
      : null,
    visibleComponents,
    boundaries: {
      planningSchematic: true,
      productExact: false,
      hardwareReady: false,
      hardwareVerified: false,
      flightReady: false,
    },
  };
}

const STANDALONE_SCHEMATIC_STYLES = `
  .assembly-plan-view { background: #202826; }
  .assembly-plan-grid { fill: url(#assembly-grid-major); }
  #assembly-grid-minor path { stroke: #293632; stroke-width: 0.35; fill: none; }
  #assembly-grid-major > path { stroke: #34423d; stroke-width: 0.65; fill: none; }
  .assembly-plan-frame line { stroke: #aab7b1; stroke-width: 3; stroke-linecap: round; }
  .assembly-plan-frame > rect:first-of-type {
    fill: rgba(219, 227, 221, 0.08); stroke: #aab7b1; stroke-width: 1.4;
  }
  .assembly-plan-frame .assembly-plan-deck {
    fill: #16201d; stroke: #7f938a; stroke-width: 1.1;
  }
  .assembly-plan-battery {
    fill: #ff7d3a; fill-opacity: 0.88; stroke: #ffd1b4; stroke-width: 1.4;
  }
  .assembly-plan-battery-label {
    fill: #2c160b; font-family: "IBM Plex Mono", monospace; font-weight: 700;
    letter-spacing: 0.05em;
  }
  .assembly-plan-electronics rect {
    fill: rgba(213, 255, 79, 0.08); stroke: #d5ff4f; stroke-width: 1;
    stroke-dasharray: 3 2;
  }
  .assembly-plan-electronics text, .assembly-plan-motor text,
  .assembly-plan-propeller text, .assembly-plan-axes text {
    fill: #dce7df; font-family: "IBM Plex Mono", monospace; font-weight: 600;
    letter-spacing: 0.03em;
  }
  .assembly-plan-axes line { stroke: #67d8cb; stroke-width: 1; }
  .assembly-plan-front { fill: #d5ff4f !important; letter-spacing: 0.08em !important; }
  .assembly-plan-propeller path {
    fill: #76d8cd; fill-opacity: 0.82; stroke: #a6eee5; stroke-width: 0.8;
  }
  .assembly-plan-propeller.is-ccw path {
    fill: #e6dac4; fill-opacity: 0.82; stroke: #fff6e6;
  }
  .assembly-plan-propeller > circle {
    fill: #101816; stroke: #f7f4e9; stroke-width: 1;
  }
  .assembly-plan-propeller text { fill: #9eada7; }
  .assembly-plan-motor > circle:first-child {
    fill: #2a3733; stroke: #e8decd; stroke-width: 2;
  }
  .assembly-plan-motor > circle:first-child.is-hidden {
    fill-opacity: 0.18; stroke-opacity: 0.28;
  }
  .assembly-plan-hub { fill: #d5ff4f; }
  .assembly-plan-hub.is-hidden { fill-opacity: 0.18; }
  .assembly-plan-motor.is-hidden text { fill-opacity: 0.35; }
  .assembly-plan-export-title {
    fill: #d5ff4f; font-family: "IBM Plex Mono", monospace; font-weight: 700;
    letter-spacing: 0.08em;
  }
  .assembly-plan-export-boundary {
    fill: #b8c5bf; font-family: "IBM Plex Mono", monospace; font-weight: 600;
    letter-spacing: 0.035em;
  }
`;

export function createStandaloneSchematicSvg(svgElement, metadata, serialize) {
  if (!svgElement) throw new Error("No schematic SVG is available to export.");

  const clone = svgElement.cloneNode(true);
  const ownerDocument = svgElement.ownerDocument;
  const namespace = "http://www.w3.org/2000/svg";
  const title = clone.querySelector("title")?.textContent || metadata.title;
  const description = [
    title,
    "Planning schematic generated from RotorBench assembly coordinates.",
    "Not a product-exact render, hardware verification, or flight authorization.",
  ].join(" ");

  const createSvgElement = (name) => ownerDocument.createElementNS(namespace, name);
  clone.setAttribute("xmlns", namespace);
  clone.setAttribute("role", "img");
  clone.setAttribute("aria-label", description);

  let descriptionElement = clone.querySelector("desc");
  if (!descriptionElement) {
    descriptionElement = createSvgElement("desc");
    clone.insertBefore(descriptionElement, clone.querySelector("defs"));
  }
  descriptionElement.textContent = description;

  const metadataElement = createSvgElement("metadata");
  metadataElement.textContent = JSON.stringify(metadata, null, 2);
  clone.insertBefore(metadataElement, clone.querySelector("defs"));

  const styleElement = createSvgElement("style");
  styleElement.textContent = STANDALONE_SCHEMATIC_STYLES;
  clone.insertBefore(styleElement, clone.querySelector("defs"));

  const viewBox = (clone.getAttribute("viewBox") || "0 0 100 100")
    .trim()
    .split(/\s+/)
    .map(Number);
  const [x, y, width, height] = viewBox;
  const band = height * 0.08;
  const exportY = y - band;
  const exportHeight = height + band * 2;
  const fontSize = band * 0.23;
  clone.setAttribute("viewBox", `${x} ${exportY} ${width} ${exportHeight}`);
  clone.setAttribute("width", "100%");
  clone.setAttribute("height", "100%");
  clone.setAttribute("style", "display:block;width:100%;height:100%;background:#101816");

  const background = createSvgElement("rect");
  background.setAttribute("x", String(x));
  background.setAttribute("y", String(exportY));
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(exportHeight));
  background.setAttribute("fill", "#101816");
  clone.insertBefore(background, clone.querySelector("defs"));

  const exportTitle = createSvgElement("text");
  exportTitle.setAttribute("class", "assembly-plan-export-title");
  exportTitle.setAttribute("x", String(x + band * 0.5));
  exportTitle.setAttribute("y", String(y - band * 0.43));
  exportTitle.setAttribute("font-size", String(fontSize));
  exportTitle.textContent = `ROTORBENCH · ${
    metadata.source === "selected-build" ? "SELECTED BUILD" : "SAMPLE"
  } · TOP VIEW`;

  const boundary = createSvgElement("text");
  boundary.setAttribute("class", "assembly-plan-export-boundary");
  boundary.setAttribute("x", String(x + band * 0.5));
  boundary.setAttribute("y", String(y + height + band * 0.57));
  boundary.setAttribute("font-size", String(fontSize * 0.88));
  boundary.textContent =
    "PLANNING SCHEMATIC · MOTOR COORDINATES IN mm · NOT PRODUCT-EXACT OR HARDWARE-READY";

  clone.append(exportTitle, boundary);
  const serializer = serialize
    || (typeof XMLSerializer !== "undefined" ? new XMLSerializer() : null);
  if (!serializer) throw new Error("SVG serialization is unavailable.");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
}

export default function TwoDViewer({
  assemblySpec = {},
  propellerDirection = "props-out",
  clearedComponents = [],
}) {
  const svgRef = useRef(null);
  const [exportStatus, setExportStatus] = useState("");
  const model = buildSchematicModel({
    assemblySpec,
    propellerDirection,
    clearedComponents,
  });
  const {
    batteryPlacement,
    bladeCount,
    electronics,
    electronicsDims,
    hidden,
    label,
    labelSize,
    maxX,
    minX,
    motorRadius,
    mounts,
    padding,
    propellerDiameter,
    propellerOrigins,
    stackLabelY,
    viewMinX,
    viewMinZ,
    viewSize,
  } = model;
  const frameDims = model.frameDims;

  const downloadSchematic = () => {
    try {
      const metadata = buildSchematicExportMetadata(model);
      const svg = createStandaloneSchematicSvg(svgRef.current, metadata);
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rotorbench-assembly-schematic-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus(
        "Schematic SVG downloaded. Planning view only; not hardware verification.",
      );
    } catch {
      setExportStatus("Could not download the schematic. Try again.");
    }
  };

  return (
    <div className="drone-wrapper assembly-plan-view">
      <div className="assembly-plan-toolbar">
        <div className="assembly-plan-toolbar-copy">
          <strong>Top view</strong>
          <span>
            {mounts.length} motor station{mounts.length === 1 ? "" : "s"} ·
            schematic, not product-exact
          </span>
        </div>
        <button
          type="button"
          className="assembly-plan-download"
          onClick={downloadSchematic}
        >
          <Download size={15} aria-hidden="true" />
          Download SVG
        </button>
      </div>
      {exportStatus && (
        <span className="visually-hidden" role="status" aria-live="polite">
          {exportStatus}
        </span>
      )}
      <svg
        ref={svgRef}
        viewBox={`${viewMinX} ${viewMinZ} ${viewSize} ${viewSize}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>
        <desc>
          Planning schematic from shared assembly coordinates. Not a product-exact
          render or hardware verification.
        </desc>
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
