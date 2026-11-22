import React, { useState } from "react";
import { Clipboard, ExternalLink, FileText } from "lucide-react";
import { getCatalogModelEntry } from "../utils/modelAssets";

const NOTE_PARTS = [
  {
    key: "frame",
    label: "Frame",
    category: "frames",
    anchor: "Defines the motor-mount coordinates and the electronics footprint.",
    fields: ["motorpositions", "motormountpatternsmm", "stackheight", "dimensionsmm"],
  },
  {
    key: "motor",
    label: "Motors",
    category: "motors",
    anchor: "Each base-centre anchor is seated on a frame motor mount.",
    fields: ["mountingpoint", "mountingpatternmm", "propshaftmm", "dimensionsmm"],
  },
  {
    key: "propeller",
    label: "Propellers",
    category: "propellers",
    anchor: "Each hub-plane anchor is centred over a motor shaft.",
    fields: ["mountingpoint", "shaftmm", "hubthicknessmm", "dimensionsmm"],
  },
  {
    key: "esc",
    label: "ESC",
    category: "escs",
    anchor: "The bottom face sets the first electronics layer above the frame.",
    fields: ["mountingpoint", "mountingpatternmm", "dimensionsmm"],
  },
  {
    key: "flightController",
    label: "Flight controller",
    category: "flight_controllers",
    anchor: "The bottom face stacks above the ESC on the shared centreline.",
    fields: ["mountingpoint", "mountingpatternmm", "dimensionsmm"],
  },
  {
    key: "receiver",
    label: "Receiver",
    category: "receivers",
    anchor: "The bottom face stacks above the flight controller on the shared centreline.",
    fields: ["mountingpoint", "dimensionsmm"],
  },
  {
    key: "battery",
    label: "Battery",
    category: "batteries",
    anchor: "The bottom face sits above the electronics stack.",
    fields: ["mountingpoint", "dimensionsmm", "dischargeconnector"],
  },
];

function normalizeField(value) {
  return String(value || "").toLowerCase().replace(/[\s_-]/g, "");
}

function formatPatterns(patterns) {
  const values = Array.isArray(patterns) ? patterns : [];
  return values
    .filter((pattern) => (
      Array.isArray(pattern)
      && pattern.length === 2
      && pattern.every((value) => Number.isFinite(Number(value)))
    ))
    .map((pattern) => `${Number(pattern[0])} × ${Number(pattern[1])} mm`)
    .join(" / ");
}

function formatDimensions(part) {
  const dimensions = Array.isArray(part?.dimensionsMm) ? part.dimensionsMm : [];
  if (
    dimensions.length !== 3
    || !dimensions.every((value) => Number.isFinite(Number(value)))
  ) {
    const planform = Array.isArray(part?.planformMm) ? part.planformMm : [];
    return planform.length === 2
      && planform.every((value) => Number.isFinite(Number(value)))
      ? `${planform.map(Number).join(" × ")} mm footprint`
      : "";
  }
  return `${dimensions.map(Number).join(" × ")} mm`;
}

function formatList(values) {
  return Array.isArray(values)
    ? values.filter(Boolean).join(" / ")
    : "";
}

function factsFor(part, key) {
  if (!part) return [];
  const dimensions = formatDimensions(part);
  if (key === "frame") {
    return [
      Number(part.motorCount) ? `${Number(part.motorCount)} motor mounts` : "",
      formatPatterns(part.motorMountPatternsMm)
        ? `Motor mounts ${formatPatterns(part.motorMountPatternsMm)}`
        : "",
      formatPatterns(part.stackMountPatternsMm)
        ? `Stack mounts ${formatPatterns(part.stackMountPatternsMm)}`
        : dimensions,
    ].filter(Boolean).slice(0, 3);
  }
  if (key === "motor") {
    return [
      formatPatterns(part.mountingPatternMm && [part.mountingPatternMm])
        ? `Mount ${formatPatterns([part.mountingPatternMm])}`
        : "",
      Number.isFinite(Number(part.propShaftMm))
        ? `${Number(part.propShaftMm)} mm shaft`
        : "",
      part.kv ? `${Number(part.kv)} KV` : dimensions,
    ].filter(Boolean).slice(0, 3);
  }
  if (key === "propeller") {
    return [
      Number(part.bladeCount) ? `${Number(part.bladeCount)} blades` : "",
      Number.isFinite(Number(part.shaftMm))
        ? `${Number(part.shaftMm)} mm bore`
        : "",
      Number.isFinite(Number(part.hubThicknessMm))
        ? `${Number(part.hubThicknessMm)} mm hub`
        : dimensions,
    ].filter(Boolean).slice(0, 3);
  }
  if (key === "esc") {
    return [
      formatPatterns(part.mountingPatternMm && [part.mountingPatternMm])
        ? `Mount ${formatPatterns([part.mountingPatternMm])}`
        : dimensions,
      dimensions,
      Number(part.currentRating) ? `${Number(part.currentRating)} A continuous` : "",
      part.includedPowerConnector ? `Power ${part.includedPowerConnector}` : "",
    ].filter(Boolean).slice(0, 4);
  }
  if (key === "flightController") {
    return [
      formatPatterns(part.mountingPatternMm && [part.mountingPatternMm])
        ? `Mount ${formatPatterns([part.mountingPatternMm])}`
        : dimensions,
      dimensions,
      part.processor || "",
      formatList(part.firmware),
    ].filter(Boolean).slice(0, 4);
  }
  if (key === "receiver") {
    return [
      part.protocol || "",
      formatList(part.frequencyBands),
      dimensions,
      Number(part.channels) ? `${Number(part.channels)} channels` : dimensions,
    ].filter(Boolean).slice(0, 4);
  }
  if (key === "battery") {
    return [
      Number(part.cells) && Number(part.capacity)
        ? `${Number(part.cells)}S ${Number(part.capacity)} mAh`
        : "",
      part.dischargeConnector ? `Connector ${part.dischargeConnector}` : "",
      dimensions,
    ].filter(Boolean).slice(0, 3);
  }
  return [];
}

function sourceStateFor(part, fields) {
  const relevantFields = new Set(fields.map(normalizeField));
  const measured = (part?.measuredFields || [])
    .map(normalizeField)
    .some((field) => relevantFields.has(field));
  if (!measured && part?.planformMm && !part?.dimensionsMm) {
    return { label: "Footprint + estimate", tone: "estimated" };
  }
  const estimated = (part?.estimatedFields || [])
    .map(normalizeField)
    .some((field) => relevantFields.has(field));

  if (measured) {
    return { label: "Measured locally", tone: "measured" };
  }
  if (estimated) {
    return { label: "Source + estimate", tone: "estimated" };
  }
  if (part?.sourceUrl) {
    return { label: "Source spec", tone: "sourced" };
  }
  return { label: "Catalog only", tone: "unverified" };
}

function modelLabelFor(part, category) {
  const modelEntry = getCatalogModelEntry(part, category);
  if (!modelEntry) return "Generated fallback";
  if (
    Array.isArray(part.dimensionsMm)
    && part.dimensionsMm.length === 3
    && part.dimensionsMm.every((value) => Number(value) > 0)
  ) {
    return "Catalog GLB · envelope-targeted";
  }
  return modelEntry.contractStatus === "legacy-unverified"
    ? "Catalog GLB · legacy contract"
    : "Catalog GLB";
}

export function createAssemblyNotesText(notes) {
  const lines = [
    "RotorBench assembly notes",
    "Viewer anchors and catalog facts only. This is not a wiring, physical-fit, or hardware verification.",
  ];
  for (const note of notes) {
    lines.push(
      "",
      `${note.label} — ${note.sourceState.label} | ${note.modelLabel}`,
      `Anchor: ${note.anchor}`,
    );
    if (note.facts.length > 0) {
      lines.push(`Facts: ${note.facts.join(" | ")}`);
    }
    if (note.sourceUrl) {
      lines.push(`Source: ${note.sourceUrl}`);
    }
  }
  return lines.join("\n");
}

export function getAssemblyNotes({
  frame = null,
  motor = null,
  propeller = null,
  esc = null,
  flightController = null,
  receiver = null,
  battery = null,
} = {}) {
  const parts = {
    frame,
    motor,
    propeller,
    esc,
    flightController,
    receiver,
    battery,
  };

  return NOTE_PARTS.flatMap((definition) => {
    const part = parts[definition.key];
    if (!part?.id) return [];
    return [{
      key: definition.key,
      label: definition.label,
      anchor: definition.anchor,
      facts: factsFor(part, definition.key),
      sourceUrl: part.sourceUrl || "",
      sourceState: sourceStateFor(part, definition.fields),
      modelLabel: modelLabelFor(part, definition.category),
    }];
  });
}

export default function AssemblyNotes(props) {
  const notes = getAssemblyNotes(props);
  const [copyState, setCopyState] = useState("");
  if (notes.length === 0) return null;

  const fallbackCount = notes.filter(
    (note) => note.modelLabel === "Generated fallback",
  ).length;
  const catalogCount = notes.length - fallbackCount;

  const copyNotes = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(createAssemblyNotesText(notes));
      setCopyState("Copied");
    } catch {
      setCopyState("Clipboard unavailable. Copy from the notes.");
    }
  };

  return (
    <details className="assembly-notes">
      <summary>
        <FileText size={16} aria-hidden="true" />
        <span>
          <strong>Source-backed assembly notes</strong>
          <small>Viewer anchors and the catalog facts behind each part</small>
        </span>
        <em className={fallbackCount ? "is-review" : "is-complete"}>
          {fallbackCount === 0
            ? `${notes.length} catalog GLB${notes.length === 1 ? "" : "s"}`
            : catalogCount === 0
              ? `${fallbackCount} generated fallback${fallbackCount === 1 ? "" : "s"}`
              : `${catalogCount} catalog · ${fallbackCount} generated fallback${
                fallbackCount === 1 ? "" : "s"
              }`}
        </em>
      </summary>
      <div className="assembly-notes-body">
        <div className="assembly-notes-intro">
          <p>
            These notes expose the anchors used by the 3D assembly and the source
            state of each fact. Estimated fields and generated fallbacks remain
            labelled; this is not a wiring, physical-fit, or hardware check.
          </p>
          <div className="assembly-notes-copy">
            <button type="button" onClick={copyNotes}>
              <Clipboard size={14} aria-hidden="true" />
              Copy notes
            </button>
            <span role="status">{copyState}</span>
          </div>
        </div>
        <ol aria-label="Source-backed assembly notes">
          {notes.map((note) => (
            <li
              key={note.key}
              className={`is-${note.sourceState.tone}`}
              aria-label={`${note.label} assembly note`}
            >
              <div className="assembly-note-heading">
                <strong>{note.label}</strong>
                <em>{note.sourceState.label}</em>
              </div>
              <p>{note.anchor}</p>
              {note.facts.length > 0 && (
                <div className="assembly-note-facts">
                  {note.facts.map((fact) => (
                    <span key={fact}>{fact}</span>
                  ))}
                </div>
              )}
              <div className="assembly-note-footer">
                <span
                  className={
                    note.modelLabel === "Generated fallback" ? "is-fallback" : ""
                  }
                >
                  {note.modelLabel}
                </span>
                {note.sourceUrl ? (
                  <a
                    href={note.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open product source for ${note.label}`}
                  >
                    Product source
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : (
                  <span>No product source URL</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
