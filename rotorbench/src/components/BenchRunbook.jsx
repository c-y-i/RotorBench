import React, { useState } from "react";
import {
  Clipboard,
  RadioTower,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import BenchEvidenceReview from "./BenchEvidenceReview";

export default function BenchRunbook({
  runbook,
  expectedUid = null,
  buildId = null,
  evidenceScope = null,
  expectedFc = null,
  expectedRadio = null,
  onAdoptPlanPatch = null,
}) {
  const [message, setMessage] = useState("");
  const [mutationAcknowledged, setMutationAcknowledged] = useState(false);
  const hasMutatingCommands = runbook.stages.some(
    (stage) => ["mutating", "live-input"].includes(stage.kind)
      && stage.commands.length > 0,
  );

  const copyText = async (text, successMessage) => {
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  return (
    <details className="bench-runbook">
      <summary>
        <Terminal size={19} aria-hidden="true" />
        <span>
          <strong>Bench runbook</strong>
          <small>Aerial Kit {runbook.source.commit} · copy-only workflow</small>
        </span>
        <em>Not executed</em>
      </summary>

      <div className="bench-runbook-body">
        <div className="bench-runbook-intro">
          <RadioTower size={18} aria-hidden="true" />
          <div>
            <strong>Prepared commands for a human-run bench session</strong>
            <p>
              RotorBench has not connected to hardware. Replace example ports and
              the phrase placeholder before running anything.
            </p>
          </div>
        </div>

        <div className="bench-runbook-stages">
          {runbook.stages.map((stage) => (
            <section key={stage.id} aria-labelledby={`bench-stage-${stage.id}`}>
              <div className="bench-runbook-stage-heading">
                <h2 id={`bench-stage-${stage.id}`}>{stage.title}</h2>
                <span className={`is-${stage.kind}`}>
                  {stage.kindLabel}
                </span>
              </div>
              <p>{stage.note}</p>
              {stage.commands.length > 0 ? (
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={`${stage.title} commands`}
                >
                  <code>{stage.commands.join("\n")}</code>
                </pre>
              ) : (
                <p className="bench-runbook-empty">
                  No supported command is generated for this selected firmware family.
                </p>
              )}
            </section>
          ))}
        </div>

        <div
          className="bench-runbook-evidence"
          role="region"
          aria-label="RF acceptance evidence"
        >
          <strong>RF acceptance evidence</strong>
          <ul>
            {runbook.evidenceRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </div>

        <BenchEvidenceReview
          expectedUid={expectedUid}
          expectedBauds={{
            tx: runbook.target.txBaud,
            rx: runbook.target.rxBaud,
          }}
          expectedSettings={runbook.expectedSettings}
          targetName={runbook.target.name}
          buildId={buildId}
          evidenceScope={evidenceScope}
          expectedFc={expectedFc}
          expectedRadio={expectedRadio}
          onAdoptPlanPatch={onAdoptPlanPatch}
        />

        <ul className="bench-runbook-warnings" aria-label="Bench safety boundaries">
          {runbook.warnings.map((warning) => (
            <li key={warning}>
              <ShieldAlert size={14} aria-hidden="true" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>

        {hasMutatingCommands && (
          <label className="bench-runbook-mutation-gate">
            <input
              type="checkbox"
              checked={mutationAcknowledged}
              onChange={(event) => setMutationAcknowledged(event.target.checked)}
            />
            <span>
              I reviewed the props-off and restrained-aircraft setup, antennas
              or RF loads, role switch, channel map, panic path, disconnect
              behavior, and every mutating or live-input command.
            </span>
          </label>
        )}

        <div className="bench-runbook-footer">
          <div className="bench-runbook-copy-actions">
            <button
              type="button"
              className="is-secondary"
              onClick={() => copyText(
                runbook.readOnlyCopyText,
                "Read-only discovery copied. Nothing was sent to hardware.",
              )}
            >
              <Clipboard size={15} aria-hidden="true" />
              Copy discovery
            </button>
            <button
              type="button"
              disabled={hasMutatingCommands && !mutationAcknowledged}
              onClick={() => copyText(
                runbook.copyText,
                "Full runbook copied. Nothing was sent to hardware.",
              )}
            >
              <Clipboard size={15} aria-hidden="true" />
              Copy full runbook
            </button>
          </div>
          <div className="bench-runbook-source">
            <span>
              Source: Aerial Kit package {runbook.source.packageVersion} ·{" "}
              {runbook.source.firmware}
            </span>
            <code>SHA-256 {runbook.source.artifact}</code>
          </div>
        </div>
        {message && <p className="bench-runbook-message" role="status">{message}</p>}
      </div>
    </details>
  );
}
