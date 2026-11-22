import React from "react";

const STATUS_LABELS = {
  pass: "Matches plan",
  fail: "Differs",
  unverified: "Not observed",
};

function observedAtLabel(value) {
  if (!value) return "No STATUS timestamp";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Timestamp unavailable"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
}

export default function AerialKitPlanComparisonEvidence({ comparison }) {
  if (!comparison) return null;
  const {
    summary,
    currentPlanMatches,
    parameters,
    source,
    target,
  } = comparison;
  return (
    <section
      className="aerial-kit-parameters aerial-kit-plan-comparison-evidence"
      aria-label="Imported Aerial Kit plan comparison"
    >
      <div className="aerial-kit-section-heading">
        <strong>Validated plan comparison</strong>
        <span>
          {summary.compared} checked · {" "}
          {currentPlanMatches === false
            ? "current plan differs"
            : currentPlanMatches
              ? "current plan matches"
              : "current plan not supplied"}
        </span>
      </div>
      <div
        className={`aerial-kit-plan-comparison-state ${
          currentPlanMatches === false
            ? "has-differences"
            : summary.differing
              ? "is-review"
              : "is-complete"
        }`}
        role="status"
      >
        <strong>
          {currentPlanMatches === false
            ? "Artifact belongs to a different staged plan"
            : "Artifact structure and counts validated"}
        </strong>
        <span>
          {target.name} · comparison generated {observedAtLabel(comparison.generatedAt)}
        </span>
      </div>
      <dl className="aerial-kit-route-evidence-facts">
        <div>
          <dt>Matches</dt>
          <dd>{summary.matched}</dd>
        </div>
        <div>
          <dt>Differences</dt>
          <dd>{summary.differing}</dd>
        </div>
        <div>
          <dt>Not observed</dt>
          <dd>{summary.notObserved}</dd>
        </div>
        <div>
          <dt>STATUS observed</dt>
          <dd>{observedAtLabel(source.statusObservedAt)}</dd>
        </div>
      </dl>
      <details className="aerial-kit-plan-comparison-rows">
        <summary>
          <span>Validated comparison rows</span>
          <em>{parameters.length}</em>
        </summary>
        <ul
          className="aerial-kit-parameter-list"
          aria-label="Imported plan comparison rows"
          tabIndex={0}
        >
          {parameters.map((parameter) => (
            <li
              key={parameter.id}
              aria-label={`${parameter.parameter}: ${STATUS_LABELS[parameter.status]}. ${parameter.detail}`}
            >
              <span>{parameter.parameter}</span>
              <code>
                {parameter.expected == null
                  ? "No staged value"
                  : `Plan ${parameter.expected}`}
              </code>
              <em className={`is-${parameter.status}`}>
                {STATUS_LABELS[parameter.status]}
              </em>
              <small>{parameter.detail}</small>
            </li>
          ))}
        </ul>
      </details>
      <p>
        RotorBench independently checked the artifact schema, row counts,
        staged expected values, timestamps, and hardware boundaries. Parameter
        values were read-only. Adoption, writes, persistence, hardware behavior,
        RF performance, and flight readiness remain unverified.
      </p>
    </section>
  );
}
