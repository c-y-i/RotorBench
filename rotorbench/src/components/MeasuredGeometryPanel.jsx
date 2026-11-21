import React, { useEffect, useState } from "react";
import { RotateCcw, Settings2 } from "lucide-react";
import {
  GEOMETRY_CATEGORY_FIELDS,
  geometryProvenance,
  measuredGeometryForPart,
} from "../utils/buildGeometry";

const sourceLabels = {
  "user-measured": "Measured",
  "catalog-estimated": "Catalog estimated",
  catalog: "Catalog",
  missing: "Missing",
};

function displayValue(value) {
  if (Array.isArray(value)) return value.join(" × ");
  if (value == null || value === "") return "Missing";
  return `${value} mm`;
}

function scalarText(value) {
  return value == null || value === "" ? "" : String(value);
}

function vectorText(value, length) {
  const values = Array.isArray(value) ? value : [];
  return Array.from(
    { length },
    (_, index) => scalarText(values[index]),
  );
}

function ScalarMeasurementInput({ label, fieldLabel, value, onChange }) {
  const [draft, setDraft] = useState(() => scalarText(value));

  useEffect(() => {
    setDraft(scalarText(value));
  }, [value]);

  return (
    <input
      type="number"
      min="0.01"
      step="0.01"
      inputMode="decimal"
      value={draft}
      placeholder="mm"
      aria-label={`${label} ${fieldLabel} in millimetres`}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next === "" || Number(next) > 0) onChange(next);
      }}
      onBlur={() => {
        if (draft !== "" && !(Number(draft) > 0)) setDraft(scalarText(value));
      }}
    />
  );
}

function VectorMeasurementInputs({
  label,
  fieldLabel,
  length,
  value,
  onChange,
}) {
  const [draft, setDraft] = useState(() => vectorText(value, length));
  const valueSignature = Array.isArray(value) ? value.join("|") : scalarText(value);

  useEffect(() => {
    const synchronized = valueSignature === "" ? [] : valueSignature.split("|");
    setDraft(Array.from({ length }, (_, index) => synchronized[index] || ""));
  }, [valueSignature, length]);

  const updateAxis = (index, nextValue) => {
    const next = [...draft];
    next[index] = nextValue;
    setDraft(next);
    const complete = next.every((axis) => axis !== "" && Number(axis) > 0);
    if (complete) onChange(next);
    if (next.every((axis) => axis === "")) onChange("");
  };

  return ["X", "Y", "Z"].slice(0, length).map((axis, index) => (
    <input
      key={axis}
      type="number"
      min="0.01"
      step="0.01"
      inputMode="decimal"
      value={draft[index] || ""}
      placeholder={axis}
      aria-label={`${label} ${fieldLabel} axis ${index + 1} in millimetres`}
      onChange={(event) => updateAxis(index, event.target.value)}
      onBlur={() => {
        const complete = draft.every((entry) => entry !== "" && Number(entry) > 0);
        if (!complete && !draft.every((entry) => entry === "")) {
          setDraft(vectorText(value, length));
        }
      }}
    />
  ));
}

export default function MeasuredGeometryPanel({
  parts = [],
  overrides,
  onChange,
  onReset,
}) {
  const availableParts = parts.filter(({ part }) => part?.id);
  if (!availableParts.length) return null;
  const measuredCount = availableParts.reduce(
    (total, { category, part }) => (
      total + Object.keys(measuredGeometryForPart(overrides, category, part.id)).length
    ),
    0,
  );

  return (
    <details className="measured-geometry">
      <summary>
        <Settings2 size={16} aria-hidden="true" />
        <span>
          <strong>Measured geometry</strong>
          <small>Build-local caliper values · not hardware verification</small>
        </span>
        <em>{measuredCount ? `${measuredCount} measured` : "Catalog values"}</em>
      </summary>
      <div className="measured-geometry-body">
        <p>
          Measure the physical part in millimetres. Measurements affect only this
          local build and remain distinct from source-backed catalog values and
          hardware verification.
        </p>
        {availableParts.map(({ category, label, part }) => {
          const measured = measuredGeometryForPart(overrides, category, part.id);
          const fields = geometryProvenance(overrides, category, part);
          const hasMeasured = Object.keys(measured).length > 0;
          return (
            <section key={`${category}-${part.id}`} aria-label={`${label} measurements`}>
              <div className="measured-geometry-part-heading">
                <div>
                  <strong>{label}</strong>
                  <small>{part.name}</small>
                </div>
                <button
                  type="button"
                  className="is-secondary"
                  disabled={!hasMeasured}
                  onClick={() => onReset(category, part.id)}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Reset to catalog
                </button>
              </div>
              <div className="measured-geometry-fields">
                {fields.map((field) => {
                  const definition = GEOMETRY_CATEGORY_FIELDS[category].find(
                    (candidate) => candidate.key === field.key,
                  );
                  const effective = field.effectiveValue;
                  return (
                    <div key={field.key} className="measured-geometry-field">
                      <label>
                        <span>{field.label}</span>
                        <small>{sourceLabels[field.source]}</small>
                      </label>
                      <div>
                        {definition.kind === "number" ? (
                          <ScalarMeasurementInput
                            label={label}
                            fieldLabel={field.label}
                            value={effective}
                            onChange={(value) => onChange(
                              category,
                              part.id,
                              field.key,
                              value,
                            )}
                          />
                        ) : (
                          <VectorMeasurementInputs
                            label={label}
                            fieldLabel={field.label}
                            length={definition.kind === "vector2" ? 2 : 3}
                            value={effective}
                            onChange={(value) => onChange(
                              category,
                              part.id,
                              field.key,
                              value,
                            )}
                          />
                        )}
                        <small>{displayValue(effective)}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </details>
  );
}
