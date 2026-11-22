import React, { useState } from "react";
import { Box, Check, Clipboard } from "lucide-react";
import { summarizeModelSources } from "../utils/modelAssets";

export default function ModelAssetAudit({ parts = {} }) {
  const [message, setMessage] = useState("");
  const summary = summarizeModelSources(parts);
  const entries = summary.sources;
  if (!entries.length) return null;

  const catalogCount = summary.catalogModelCount;
  const fallbackCount = summary.generatedFallbackCount;
  const stateLabel = catalogCount === entries.length
    ? "All catalog"
    : catalogCount === 0
      ? "All fallback"
      : `${catalogCount} catalog / ${fallbackCount} fallback`;
  const copyReport = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(createModelSourceReport(parts));
      setMessage(
        "Model-source report copied. Planning geometry metadata only; no hardware verification.",
      );
    } catch {
      setMessage("Could not copy the model-source report. Try again.");
    }
  };

  return (
    <details className="viewer-placement-audit viewer-model-asset-audit">
      <summary>
        <Box size={16} aria-hidden="true" />
        <span>
          <strong>Model sources</strong>
          <small>Catalog assets and generated fallback geometry</small>
        </span>
        <em className={catalogCount === entries.length ? "is-catalog" : "is-fallback"}>
          {stateLabel}
        </em>
      </summary>
      <div className="viewer-placement-audit-body">
        <p>
          Catalog GLBs provide the available product geometry. Generated
          fallbacks use catalogued dimensions, mounting points, and assembly
          transforms; they are useful for placement review but are not
          product-exact meshes.
        </p>
        <div className="viewer-model-source-actions">
          <button
            type="button"
            className="action-btn secondary"
            onClick={copyReport}
          >
            <Clipboard size={15} aria-hidden="true" />
            Copy model sources
          </button>
          {message && (
            <span className="visually-hidden" role="status">
              {message}
            </span>
          )}
        </div>
        <ul aria-label="Selected component model sources">
          {entries.map((entry) => (
            <li
              key={entry.key}
              className={entry.catalogModel ? "is-catalog" : "is-fallback"}
              aria-label={`${entry.label} model source`}
            >
              {entry.catalogModel
                ? <Check size={14} aria-hidden="true" />
                : <Box size={14} aria-hidden="true" />}
              <span>
                <strong>{entry.label}</strong>
                <small>
                  {entry.name}
                  {entry.catalogModel
                    && entry.legacyNormalizationUnverified
                    ? " · legacy normalization unverified"
                    : ""}
                </small>
              </span>
              <em>{entry.catalogModel ? "Catalog GLB" : "Generated fallback"}</em>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export function createModelSourceReport(parts = {}) {
  const summary = summarizeModelSources(parts);
  const entries = summary.sources;
  return [
    "RotorBench model source report",
    "Local planning metadata only. No hardware verification is claimed.",
    `Selected parts: ${summary.selectedCount}`,
    `Catalog GLBs: ${summary.catalogModelCount}`,
    `Generated fallbacks: ${summary.generatedFallbackCount}`,
    "",
    ...entries.map((entry) => (
      `- ${entry.label}: ${entry.name} | ${
        entry.catalogModel ? entry.provenance : "Generated fallback geometry"
      }`
    )),
    "",
    "Generated fallback geometry uses catalogued dimensions, mounting points, and shared assembly transforms.",
    "It is useful for placement review but is not a product-exact mesh.",
  ].join("\n");
}
