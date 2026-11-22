import React from "react";
import { Box, Check } from "lucide-react";
import { resolveModelForComponent } from "../utils/modelAssets";

const MODEL_PARTS = [
  ["frame", "Frame", "frames"],
  ["motor", "Motors", "motors"],
  ["propeller", "Propellers", "propellers"],
  ["battery", "Battery", "batteries"],
  ["esc", "ESC", "escs"],
  ["flightController", "Flight controller", "flight_controllers"],
  ["receiver", "Receiver", "receivers"],
];

export default function ModelAssetAudit({ parts = {} }) {
  const entries = MODEL_PARTS.flatMap(([key, label, category]) => {
    const part = parts[key];
    if (!part?.id) return [];
    const asset = resolveModelForComponent(category, part.id);
    return [{
      key,
      label,
      part,
      category,
      asset,
      catalogModel: asset.kind === "catalog-glb",
    }];
  });
  if (!entries.length) return null;

  const catalogCount = entries.filter((entry) => entry.catalogModel).length;
  const fallbackCount = entries.length - catalogCount;
  const stateLabel = catalogCount === entries.length
    ? "All catalog"
    : catalogCount === 0
      ? "All fallback"
      : `${catalogCount} catalog / ${fallbackCount} fallback`;

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
                  {entry.part.name}
                  {entry.catalogModel
                    && entry.asset.provenance.includes("legacy normalization unverified")
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
