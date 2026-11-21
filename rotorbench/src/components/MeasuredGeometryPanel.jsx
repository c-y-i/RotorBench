import React, { useEffect, useId, useRef, useState } from "react";
import { RotateCcw, Ruler, Settings2 } from "lucide-react";
import {
  GEOMETRY_CATEGORY_FIELDS,
  geometryProvenance,
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
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(scalarText(value));
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
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (Number(next) > 0) onChange(next);
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (draft === "") {
          onChange("");
        } else if (!(Number(draft) > 0)) {
          setDraft(scalarText(value));
        }
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
  const focusedRef = useRef(false);
  const valueSignature = Array.isArray(value) ? value.join("|") : scalarText(value);

  useEffect(() => {
    if (focusedRef.current) return;
    const synchronized = valueSignature === "" ? [] : valueSignature.split("|");
    setDraft(Array.from({ length }, (_, index) => synchronized[index] || ""));
  }, [valueSignature, length]);

  const updateAxis = (index, nextValue) => {
    const next = [...draft];
    next[index] = nextValue;
    setDraft(next);
    const complete = next.every((axis) => axis !== "" && Number(axis) > 0);
    if (complete) onChange(next);
  };

  return (
    <span
      className="measured-vector-inputs"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focusedRef.current = false;
        const complete = draft.every((entry) => entry !== "" && Number(entry) > 0);
        if (draft.every((entry) => entry === "")) {
          onChange("");
        } else if (!complete) {
          setDraft(vectorText(value, length));
        }
      }}
    >
      {["X", "Y", "Z"].slice(0, length).map((axis, index) => (
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
        />
      ))}
    </span>
  );
}

export default function MeasuredGeometryPanel({
  parts = [],
  overrides,
  onChange,
  onReset,
  focusTarget = null,
}) {
  const idBase = useId().replace(/:/g, "");
  const [activePartKey, setActivePartKey] = useState("");
  const detailsRef = useRef(null);
  const availableParts = parts.filter(({ part }) => part?.id);
  const partSummaries = availableParts.map(({ category, label, part }) => {
    const fields = geometryProvenance(overrides, category, part);
    const measuredCount = fields.filter(
      (field) => field.source === "user-measured",
    ).length;
    const missingCount = fields.filter((field) => field.source === "missing").length;
    return {
      category,
      label,
      part,
      fields,
      key: `${category}:${part.id}`,
      measuredCount,
      missingCount,
    };
  });
  const activePart = partSummaries.find(({ key }) => key === activePartKey)
    || partSummaries[0];
  const coverage = partSummaries.reduce((summary, part) => ({
    total: summary.total + part.fields.length,
    measured: summary.measured + part.measuredCount,
    missing: summary.missing + part.missingCount,
    estimated: summary.estimated + part.fields.filter(
      (field) => field.source === "catalog-estimated",
    ).length,
  }), { total: 0, measured: 0, missing: 0, estimated: 0 });
  const activeId = activePart
    ? `${idBase}-${activePart.key.replace(/[^a-z0-9]+/gi, "-")}`
    : idBase;
  const availablePartKeys = partSummaries.map(({ key }) => key).join("|");

  useEffect(() => {
    if (!focusTarget?.category || !focusTarget?.partId) return;
    const requestedKey = `${focusTarget.category}:${focusTarget.partId}`;
    if (!availablePartKeys.split("|").includes(requestedKey)) return;
    if (detailsRef.current) detailsRef.current.open = true;
    if (activePart?.key !== requestedKey) setActivePartKey(requestedKey);
  }, [
    focusTarget?.requestId,
    focusTarget?.category,
    focusTarget?.partId,
    activePart?.key,
    availablePartKeys,
  ]);

  useEffect(() => {
    if (
      !focusTarget?.fieldKey
      || activePart?.category !== focusTarget.category
      || activePart?.part.id !== focusTarget.partId
    ) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const field = document.getElementById(
        `${activeId}-field-${focusTarget.fieldKey}`,
      );
      if (!field) return;
      field.scrollIntoView?.({
        block: "center",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
          ? "auto"
          : "smooth",
      });
      field.querySelector("input")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    focusTarget?.requestId,
    focusTarget?.fieldKey,
    focusTarget?.category,
    focusTarget?.partId,
    activePart?.category,
    activePart?.part.id,
    activeId,
  ]);

  if (!availableParts.length || !activePart) return null;

  return (
    <details className="measured-geometry" ref={detailsRef}>
      <summary>
        <Settings2 size={16} aria-hidden="true" />
        <span>
          <strong>Measured geometry</strong>
          <small>Build-local caliper values · not hardware verification</small>
        </span>
        <em>
          {coverage.measured
            ? `${coverage.measured} measured · ${coverage.missing} missing`
            : coverage.missing ? `${coverage.missing} missing` : "Catalog values"}
        </em>
      </summary>
      <div className="measured-geometry-body">
        <p>
          Measure the physical part in millimetres. Measurements affect only this
          local build and remain distinct from source-backed catalog values and
          hardware verification.
        </p>
        <div className="measured-geometry-coverage">
          <Ruler size={15} aria-hidden="true" />
          <span>
            <strong>{coverage.measured}/{coverage.total} fields measured</strong>
            <small>
              {coverage.missing
                ? `${coverage.missing} still missing`
                : "All selected-part fields have a value"}
              {coverage.estimated
                ? ` · ${coverage.estimated} catalog estimated`
                : ""}
            </small>
          </span>
        </div>
        <div
          className="measured-geometry-part-selector"
          role="group"
          aria-label="Choose a part to measure"
        >
          {partSummaries.map((summary) => (
            <button
              key={summary.key}
              type="button"
              className={summary.key === activePart.key ? "is-active" : ""}
              aria-pressed={summary.key === activePart.key}
              aria-controls={activeId}
              onClick={() => setActivePartKey(summary.key)}
            >
              <span>{summary.label}</span>
              <small>{summary.part.name}</small>
              <em>
                {summary.measuredCount
                  ? `${summary.measuredCount}/${summary.fields.length} measured`
                  : summary.missingCount
                    ? `${summary.missingCount} missing`
                    : "Catalog"}
              </em>
            </button>
          ))}
        </div>
        <section
          id={activeId}
          key={activePart.key}
          aria-label={`${activePart.label} measurements`}
        >
          <div className="measured-geometry-part-heading">
            <div>
              <strong>{activePart.label}</strong>
              <small>{activePart.part.name}</small>
            </div>
            <button
              type="button"
              className="is-secondary"
              disabled={!activePart.measuredCount}
              onClick={() => onReset(activePart.category, activePart.part.id)}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset to catalog
            </button>
          </div>
          <div className="measured-geometry-fields">
            {activePart.fields.map((field) => {
              const definition = GEOMETRY_CATEGORY_FIELDS[activePart.category].find(
                (candidate) => candidate.key === field.key,
              );
              const effective = field.effectiveValue;
              return (
                <div
                  key={field.key}
                  id={`${activeId}-field-${field.key}`}
                  className={`measured-geometry-field ${
                    focusTarget?.category === activePart.category
                    && focusTarget?.partId === activePart.part.id
                    && focusTarget?.fieldKey === field.key
                      ? "is-targeted"
                      : ""
                  }`}
                >
                  <label>
                    <span>{field.label}</span>
                    <small>{sourceLabels[field.source]}</small>
                    {definition.help && (
                      <small className="measured-geometry-help">
                        {definition.help}
                      </small>
                    )}
                  </label>
                  <div>
                    {definition.kind === "number" ? (
                      <ScalarMeasurementInput
                        label={activePart.label}
                        fieldLabel={field.label}
                        value={effective}
                        onChange={(value) => onChange(
                          activePart.category,
                          activePart.part.id,
                          field.key,
                          value,
                        )}
                      />
                    ) : (
                      <VectorMeasurementInputs
                        label={activePart.label}
                        fieldLabel={field.label}
                        length={definition.kind === "vector2" ? 2 : 3}
                        value={effective}
                        onChange={(value) => onChange(
                          activePart.category,
                          activePart.part.id,
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
      </div>
    </details>
  );
}
