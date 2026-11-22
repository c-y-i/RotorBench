import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  FileCheck2,
  FileSearch,
  History,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { parseBenchEvidenceBundle } from "../utils/benchEvidence";
import {
  benchEvidenceDomainScopeMatches,
  clearBenchEvidenceAttachmentHistory,
  compareBenchEvidenceRuns,
  readBenchEvidenceAttachment,
  readBenchEvidenceAttachmentHistory,
  removeBenchEvidenceAttachment,
  saveBenchEvidenceAttachment,
  summarizeBenchEvidenceAttachment,
} from "../utils/benchEvidenceAttachment";
import FcParameterSnapshot from "./FcParameterSnapshot";
import {
  buildFcEvidencePlanPatch,
  buildRadioEvidencePlanPatch,
  evidencePatchValues,
} from "../utils/evidencePlanAdoption";

const evidenceKindLabels = {
  pair: "Pair + two-board bench",
  bench: "Two-board bench",
  capture: "Single-endpoint capture",
  observation: "Native CRSF observation",
  "observation-pair": "TX + RX native observations",
  diagnostics: "Endpoint boot diagnostics",
  "fc-evidence": "Flight-controller status + preflight",
  "fc-rc": "Flight-controller RC observation",
  "fc-parameters": "Flight-controller parameter snapshot",
  "radio-status-evidence": "Radio device status",
};

const checkStatusLabels = {
  pass: "Pass in file",
  fail: "Fail in file",
  unverified: "Unverified",
};

const calibrationStatusLabels = {
  sampled: "Observed",
  narrow: "Within deadband",
  partial: "Partial range",
  full: "Full planned range",
  outside: "Outside plan",
};

function metricValue(value, suffix = "") {
  return value == null ? null : `${value}${suffix}`;
}

function attachmentDate(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function observationTime(value) {
  if (!value) return "time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "time unavailable"
    : date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

function redactBindingIdentifiers(value) {
  return JSON.parse(
    JSON.stringify(value)
      .replace(/\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi, "[UID redacted]")
      .replace(/\b[0-9a-f]{12}\b/gi, "[UID redacted]"),
  );
}

function EvidenceAdoptionCard({
  source,
  title,
  patch,
  selectedIds,
  onSelectionChange,
  blockedReason,
  onAdopt,
}) {
  if (!patch) return null;
  const selected = new Set(selectedIds);
  const fieldCount = patch.fields.length;
  const label = source === "fc" ? "FC" : "radio";
  return (
    <section
      className="bench-plan-adoption"
      aria-labelledby={`bench-plan-adoption-${source}`}
    >
      <div className="bench-plan-adoption-heading">
        <div>
          <strong id={`bench-plan-adoption-${source}`}>{title}</strong>
          <small>
            Current local plan compared with the imported snapshot.
            {" "}Only selected values leave this review when you confirm.
          </small>
        </div>
        <em>Local only</em>
      </div>
      {blockedReason ? (
        <p className="bench-plan-adoption-blocked">{blockedReason}</p>
      ) : fieldCount === 0 && patch.invalidFields.length === 0 ? (
        <p className="bench-plan-adoption-empty">
          Observed values already match the local {label} plan.
        </p>
      ) : (
        <>
          {patch.invalidFields.length > 0 && (
            <p className="bench-plan-adoption-invalid">
              Ignored {patch.invalidFields.length} malformed or unsupported
              value{patch.invalidFields.length === 1 ? "" : "s"}:
              {" "}
              {patch.invalidFields.map((field) => field.label).join(", ")}.
            </p>
          )}
          {fieldCount > 0 && (
            <>
              <ul>
                {patch.fields.map((field) => (
                  <li key={field.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.has(field.id)}
                        onChange={(event) => {
                          onSelectionChange(
                            event.target.checked
                              ? [...selectedIds, field.id]
                              : selectedIds.filter((id) => id !== field.id),
                          );
                        }}
                      />
                      <span>
                        <strong>{field.label}</strong>
                        <small>{field.source}</small>
                      </span>
                      <dl>
                        <div>
                          <dt>Current</dt>
                          <dd>{field.currentDisplay}</dd>
                        </div>
                        <div>
                          <dt>Observed</dt>
                          <dd>{field.observedDisplay}</dd>
                        </div>
                      </dl>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="bench-plan-adoption-actions">
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onSelectionChange(
                    patch.fields.map((field) => field.id),
                  )}
                >
                  Select all differences
                </button>
                <button
                  type="button"
                  className="is-secondary"
                  disabled={selectedIds.length === 0}
                  onClick={() => onSelectionChange([])}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={onAdopt}
                >
                  Adopt selected {label} values
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default function BenchEvidenceReview({
  expectedUid = null,
  expectedBauds = null,
  expectedSettings = null,
  targetName = null,
  buildId = null,
  evidenceScope = null,
  expectedFc = null,
  expectedRadio = null,
  onAdoptPlanPatch = null,
}) {
  const [evidence, setEvidence] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [checkFilter, setCheckFilter] = useState("all");
  const [reviewedScope, setReviewedScope] = useState(null);
  const [fcAdoptIds, setFcAdoptIds] = useState([]);
  const [radioAdoptIds, setRadioAdoptIds] = useState([]);
  const [attachedAt, setAttachedAt] = useState(null);
  const [attachment, setAttachment] = useState(
    () => readBenchEvidenceAttachment(buildId),
  );
  const [history, setHistory] = useState(
    () => readBenchEvidenceAttachmentHistory(buildId),
  );
  const inputRef = useRef(null);

  useEffect(() => {
    setAttachment(readBenchEvidenceAttachment(buildId));
    setHistory(readBenchEvidenceAttachmentHistory(buildId));
    setAttachedAt(null);
  }, [buildId]);

  const chooseFile = () => inputRef.current?.click();

  const importFile = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    setError("");
    setMessage("");
    try {
      const documents = await Promise.all(files.map(async (file) => ({
        name: file.name,
        text: await file.text(),
      })));
      const parsed = parseBenchEvidenceBundle(documents, {
        expectedUid,
        expectedBauds,
        expectedSettings,
        targetName,
        expectedFc,
        expectedRadio,
      });
      setEvidence(parsed);
      setCheckFilter("all");
      setReviewedScope(evidenceScope);
      setFcAdoptIds([]);
      setRadioAdoptIds([]);
      setAttachedAt(null);
      setMessage(
        `${files.length} evidence file${files.length === 1 ? "" : "s"} reviewed locally and not yet attached.`,
      );
    } catch (readError) {
      setEvidence(null);
      setError(readError.message);
    }
  };

  const clearEvidence = () => {
    setEvidence(null);
    setCheckFilter("all");
    setReviewedScope(null);
    setFcAdoptIds([]);
    setRadioAdoptIds([]);
    setError("");
    setMessage("Imported evidence cleared from this page.");
  };

  const attachToBuild = () => {
    const saved = saveBenchEvidenceAttachment(
      buildId,
      evidence,
      undefined,
      evidenceScope,
    );
    if (!saved) {
      setError("The browser could not attach the evidence summary to this build.");
      return;
    }
    setError("");
    setAttachedAt(saved.attachedAt);
    setAttachment(saved);
    setHistory(readBenchEvidenceAttachmentHistory(buildId));
    setMessage(
      "Sanitized evidence attached to this build. Hardware remains unverified.",
    );
  };

  const removeAttachment = () => {
    if (!removeBenchEvidenceAttachment(buildId)) {
      setError("The browser could not remove the attached evidence summary.");
      return;
    }
    setAttachment(null);
    setAttachedAt(null);
    setError("");
    setMessage(
      "Evidence summary removed from this build. Imported files were not retained.",
    );
  };

  const clearHistory = () => {
    if (!clearBenchEvidenceAttachmentHistory(buildId)) {
      setError("The browser could not clear the local evidence history.");
      return;
    }
    setHistory([]);
    setError("");
    setMessage("Local evidence run history cleared. The current attachment was kept.");
  };

  const downloadReview = () => {
    if (!evidence) return;
    const payload = {
      schema: "rotorbench.bench-evidence-summary.v1",
      generatedAt: new Date().toISOString(),
      review: redactBindingIdentifiers(evidence),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rotorbench-bench-review-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(
      "Review downloaded without raw files, serial paths, or direct binding identifiers.",
    );
  };

  const facts = evidence ? [
    { label: "Report", value: evidenceKindLabels[evidence.kind] },
    {
      label: "Evidence files",
      value: evidence.bundle
        ? evidence.bundle.reportCount
          + evidence.bundle.diagnosticCount
          + evidence.bundle.parameterCount
          + (evidence.bundle.fcEvidenceCount || 0)
          + (evidence.bundle.radioStatusCount || 0)
        : 1,
    },
    { label: "File overall", value: evidence.fileOverall },
    { label: "Plan role", value: evidence.planContext?.role?.toUpperCase() || null },
    {
      label: "Plan target",
      value: evidence.planContext?.targetName
        || evidence.bundle?.targetName
        || null,
    },
    {
      label: "Reported baud",
      value: evidence.reportedBaud ? `${evidence.reportedBaud} baud` : null,
    },
    {
      label: "Current plan UID",
      value: evidence.planUid
        ? `${evidence.planUid}${
            evidence.currentPlanMatches === null
              ? " · not comparable"
              : evidence.currentPlanMatches ? " · match" : " · mismatch"
          }`
        : null,
    },
    { label: "TX UID", value: evidence.txUid },
    { label: "RX UID", value: evidence.rxUid },
    {
      label: "TX boot report",
      value: evidence.bundle?.txDiag
        ? `${evidence.bundle.txDiag.uid} · ${evidence.bundle.txDiag.logicalBaud} baud · FHSS ${evidence.bundle.txDiag.fhss0 ?? "—"} · rate ${evidence.bundle.txDiag.rateEnum ?? "—"}`
        : null,
    },
    {
      label: "RX boot report",
      value: evidence.bundle?.rxDiag
        ? `${evidence.bundle.rxDiag.uid} · ${evidence.bundle.rxDiag.logicalBaud} baud · FHSS ${evidence.bundle.rxDiag.fhss0 ?? "—"} · rate ${evidence.bundle.rxDiag.rateEnum ?? "—"}`
        : null,
    },
    {
      label: "Boot domain",
      value: evidence.bundle?.txDiag?.domain
        || evidence.bundle?.rxDiag?.domain
        || null,
    },
    {
      label: "Boot frequency",
      value: evidence.bundle?.txDiag?.frequency
        ? `${(evidence.bundle.txDiag.frequency / 1e9).toFixed(3)} GHz`
        : evidence.bundle?.rxDiag?.frequency
          ? `${(evidence.bundle.rxDiag.frequency / 1e9).toFixed(3)} GHz`
          : null,
    },
    {
      label: "Module packet rate",
      value: evidence.bundle?.txParameters?.settings?.packetRate?.label || null,
    },
    {
      label: "Module max power",
      value: evidence.bundle?.txParameters?.settings?.maxPower?.label
        ? `${evidence.bundle.txParameters.settings.maxPower.label} mW`
        : null,
    },
    {
      label: "Module telemetry",
      value: evidence.bundle?.txParameters?.settings?.telemetryRatio?.label || null,
    },
    {
      label: "Module switch mode",
      value: evidence.bundle?.txParameters?.settings?.switchMode?.label || null,
    },
    {
      label: "Module link mode",
      value: evidence.bundle?.txParameters?.settings?.linkMode?.label || null,
    },
    {
      label: "Module dynamic power",
      value: evidence.bundle?.txParameters?.settings?.dynamicPower?.label || null,
    },
    {
      label: "Module model match",
      value: evidence.bundle?.txParameters?.settings?.modelMatch?.label || null,
    },
    { label: "TX frames", value: metricValue(evidence.metrics.txFramesSent) },
    { label: "RX frames", value: metricValue(evidence.metrics.rxFrames) },
    { label: "RX RC frames", value: metricValue(evidence.metrics.rcFrames) },
    {
      label: "RC cadence",
      value: evidence.metrics.rcCadenceHz == null
        ? null
        : metricValue(evidence.metrics.rcCadenceHz.toFixed(1), " Hz"),
    },
    {
      label: "Link-stat frames",
      value: metricValue(evidence.metrics.linkStatisticsFrames),
    },
    { label: "Channels", value: metricValue(evidence.metrics.channels) },
    { label: "Bytes received", value: metricValue(evidence.metrics.bytesReceived) },
    { label: "Valid frames", value: metricValue(evidence.metrics.validFrames) },
    { label: "Pending bytes", value: metricValue(evidence.metrics.pendingBytes) },
    {
      label: "Last-frame age",
      value: evidence.metrics.lastFrameAgeMs == null
        ? null
        : metricValue((evidence.metrics.lastFrameAgeMs / 1000).toFixed(1), " s"),
    },
    {
      label: "Channels sampled",
      value: evidence.channelRanges?.length
        ? metricValue(evidence.metrics.sampledChannels)
        : null,
    },
    {
      label: "Full calibration range",
      value: evidence.channelRanges?.length
        ? metricValue(evidence.metrics.fullCalibrationChannels)
        : null,
    },
    {
      label: "Outside calibration",
      value: evidence.channelRanges?.length
        ? metricValue(evidence.metrics.outsideCalibrationChannels)
        : null,
    },
    {
      label: "FC protocol",
      value: evidence.fcEvidence?.status?.protocol?.toUpperCase() || null,
    },
    {
      label: "FC product",
      value: evidence.fcEvidence?.status?.product || null,
    },
    {
      label: "FC firmware",
      value: evidence.fcEvidence?.status?.firmware || null,
    },
    {
      label: "FC armed state",
      value: evidence.fcEvidence?.status?.state?.armed == null
        ? null
        : evidence.fcEvidence.status.state.armed === 0 ? "Disarmed" : "Armed",
    },
    {
      label: "FC link state",
      value: evidence.fcEvidence?.status?.protocol === "betaflight"
        ? "Not exposed by MSP status"
        : evidence.fcEvidence?.status?.state?.linkLive == null
        ? null
        : evidence.fcEvidence.status.state.linkLive === 1 ? "Live" : "Not live",
    },
    {
      label: "FC RC channels",
      value: evidence.fcEvidence?.rc
        ? String(evidence.fcEvidence.rc.channels.length)
        : null,
    },
    {
      label: "FC RC observed",
      value: evidence.fcEvidence?.rc?.observedAtMs
        ? observationTime(new Date(evidence.fcEvidence.rc.observedAtMs).toISOString())
        : null,
    },
    {
      label: "FC RC values",
      value: evidence.fcEvidence?.rc
        ? evidence.checks.find(
          (check) => check.id === "fc-rc-channel-values",
        )?.status === "pass"
          ? "Plausible variation"
          : "Inconclusive"
        : null,
    },
    {
      label: "Preflight failures",
      value: evidence.fcEvidence?.preflight
        ? String(evidence.fcEvidence.preflight.failCount)
        : null,
    },
    {
      label: "FC parameters covered",
      value: evidence.fcEvidence?.parameters
        ? (() => {
            const parameterChecks = evidence.checks.filter(
              (check) => check.id.startsWith("fc-param-"),
            );
            const observed = parameterChecks.filter(
              (check) => check.status !== "unverified",
            ).length;
            return `${observed} / ${parameterChecks.length}`;
          })()
        : null,
    },
    {
      label: "Radio status reports",
      value: evidence.radioDeviceEvidence?.reports?.length
        ? String(evidence.radioDeviceEvidence.reports.length)
        : null,
    },
    {
      label: "Observation overlap",
      value: evidence.observationPair?.overlapMs > 0
        ? `${(evidence.observationPair.overlapMs / 1000).toFixed(1)} s`
        : evidence.observationPair?.overlapMs != null ? "No overlap" : null,
    },
    {
      label: "Capture session",
      value: evidence.observationPair
        ? evidence.observationPair.captureSessionId
          ? `…${evidence.observationPair.captureSessionId.slice(-12)}`
          : "Not recorded"
        : null,
    },
    {
      label: "Target correlation",
      value: evidence.observationPair
        ? evidence.observationPair.targetMatch === true
          ? "Match"
          : evidence.observationPair.targetMatch === false ? "Mismatch" : "Incomplete"
        : null,
    },
  ].filter((fact) => fact.value != null) : [];
  const summaryComplete = Boolean(
    evidence?.rfEvidenceComplete
    && evidence.bundle?.complete
    && evidence.bundle?.settingsComplete !== false,
  );
  const settingsMismatch = evidence?.bundle?.settingsComplete === false;
  const observationPairComplete = evidence?.observationCorrelationComplete === true;
  const observationPairIncomplete = evidence?.kind === "observation-pair"
    && !observationPairComplete;
  const fcEvidenceComplete = evidence?.fcEvidence?.evidenceComplete === true;
  const fcEvidenceIncomplete = evidence?.kind === "fc-evidence"
    && !fcEvidenceComplete;
  const fcRcEvidence = evidence?.kind === "fc-rc";
  const fcRcComplete = evidence?.fcEvidence?.rcEvidenceComplete === true;
  const receiverLinkNotEstablished = evidence?.fcEvidence?.status?.protocol
    === "betaflight"
    && evidence.checks.some(
      (check) => check.id === "fc-status-link" && check.status === "unverified",
    );
  const fcParameterEvidence = evidence?.kind === "fc-parameters";
  const fcParameterChecks = evidence?.checks?.filter(
    (check) => check.id.startsWith("fc-param-"),
  ) || [];
  const fcParametersComplete = fcParameterEvidence
    && fcParameterChecks.length > 0
    && fcParameterChecks.every((check) => check.status === "pass");
  const fcParametersMismatch = fcParameterEvidence
    && fcParameterChecks.some((check) => check.status === "fail");
  const radioEvidenceComplete = evidence?.radioDeviceEvidence?.evidenceComplete === true;
  const radioEvidenceIncomplete = evidence?.kind === "radio-status-evidence"
    && !radioEvidenceComplete;
  const attachmentSummary = summarizeBenchEvidenceAttachment(
    attachment,
    evidenceScope,
  );
  const previousRuns = history.filter(
    (run) => !attachment || run.attachedAt !== attachment.attachedAt,
  );
  const historyComparison = attachment && previousRuns[0]
    ? compareBenchEvidenceRuns(attachment, previousRuns[0], {
        currentScope: evidenceScope,
      })
    : null;
  const reviewChecks = evidence?.checks || [];
  const reviewIssueChecks = reviewChecks.filter(
    (check) => check.status !== "pass",
  );
  const visibleReviewChecks = checkFilter === "issues"
    ? reviewIssueChecks
    : reviewChecks;
  const fcAdoptionScopeCurrent = Boolean(
    reviewedScope
    && evidenceScope
    && benchEvidenceDomainScopeMatches(
      reviewedScope,
      evidenceScope,
      "flightController",
    ),
  );
  const radioAdoptionScopeCurrent = Boolean(
    reviewedScope
    && evidenceScope
    && benchEvidenceDomainScopeMatches(reviewedScope, evidenceScope, "radio"),
  );
  const fcAdoptionPatch = evidence?.fcEvidence?.parameters
    ? buildFcEvidencePlanPatch(
        evidence.fcEvidence.parameters,
        expectedFc?.plan || null,
      )
    : null;
  const radioAdoptionPatch = evidence?.bundle?.txParameters
    ? buildRadioEvidencePlanPatch(
        evidence.bundle.txParameters,
        expectedRadio?.plan || null,
      )
    : null;
  const fcProtocolFailure = evidence?.checks?.some(
    (check) => check.id === "fc-status-protocol" && check.status === "fail",
  );
  const fcAdoptionReason = !reviewedScope
    ? "Import evidence in this review before adopting values."
    : !fcAdoptionScopeCurrent
      ? "The local build or plan changed after this evidence was imported. Re-import it before adopting more values."
      : expectedFc?.firmwareFamily !== "aerialkit"
        ? "Observed FC parameter adoption is limited to Aerial Kit plans."
        : fcProtocolFailure
          ? "The imported FC protocol does not match the selected plan."
          : fcAdoptionPatch?.reason || null;
  const radioAdoptionReason = !reviewedScope
    ? "Import evidence in this review before adopting values."
    : !radioAdoptionScopeCurrent
      ? "The local build or plan changed after this evidence was imported. Re-import it before adopting more values."
      : expectedRadio?.plan?.targetId !== "aerialkit-elrs-rev-a3"
        ? "Radio value adoption is currently limited to the documented Rev A3 target menu."
      : evidence?.bundle?.txParameters?.role !== "tx"
        ? "A TX module parameter snapshot is required."
        : evidence?.radioDeviceEvidence?.evidenceComplete !== true
          ? "Include matching TX radio device status so the parameter snapshot can be tied to the selected target."
        : radioAdoptionPatch?.reason || null;
  const attachLabel = attachedAt
    ? "Attached to build"
    : attachment
      ? "Replace build evidence"
      : "Attach to build";

  const adoptPatch = (source, patch, selectedIds) => {
    const values = evidencePatchValues(patch, selectedIds);
    const count = Object.keys(values).length;
    if (!count || !onAdoptPlanPatch) return;
    onAdoptPlanPatch({ source, values, count });
    if (source === "fc") setFcAdoptIds([]);
    else setRadioAdoptIds([]);
    setMessage(
      `${count} observed ${source === "fc" ? "flight-controller" : "radio"} value${count === 1 ? "" : "s"} adopted into the local plan. Nothing was sent to hardware.`,
    );
  };

  return (
    <section className="bench-file-review" aria-labelledby="bench-file-review-title">
      <div className="bench-file-review-heading">
        <div>
          <FileSearch size={18} aria-hidden="true" />
          <span>
            <strong id="bench-file-review-title">Review Aerial Kit evidence</strong>
            <small>
              Import one report or matching TX/RX native observations, plus diagnostics
              and a TX parameter snapshot
            </small>
          </span>
        </div>
        <em>Read-only</em>
      </div>

      <p>
        RotorBench parses files locally and uploads nothing. Only a sanitized
        summary is saved when you explicitly attach it to this build.
      </p>
      <p>
        File-reported results are not authenticity-verified hardware state.
      </p>

      {attachment && (
        <div
          className={`bench-file-attachment is-${attachmentSummary.status}`}
          role="region"
          aria-label="Evidence attached to this build"
        >
          <div className="bench-file-attachment-summary">
            <FileCheck2 size={17} aria-hidden="true" />
            <span>
              <strong>Evidence attached to this build</strong>
              <small>{attachmentSummary.label}</small>
            </span>
          </div>
          <dl className="bench-file-attachment-facts">
            <div>
              <dt>Attached</dt>
              <dd>{attachmentDate(attachment.attachedAt)}</dd>
            </div>
            <div>
              <dt>Checks</dt>
              <dd>
                {attachmentSummary.checkCounts.pass} pass ·{" "}
                {attachmentSummary.checkCounts.fail} fail ·{" "}
                {attachmentSummary.checkCounts.unverified} open
              </dd>
            </div>
          </dl>
          <button type="button" className="is-secondary" onClick={removeAttachment}>
            <Trash2 size={15} aria-hidden="true" />
            Remove from build
          </button>
        </div>
      )}

      <div className="bench-file-review-controls">
        <button type="button" onClick={chooseFile}>
          <Upload size={15} aria-hidden="true" />
          Choose evidence files
        </button>
        <input
          ref={inputRef}
          className="bench-file-review-input"
          type="file"
          multiple
          accept="application/json,.json,text/plain,.txt"
          aria-label="Choose Aerial Kit evidence JSON files"
          onChange={importFile}
        />
        {evidence && (
          <>
            {buildId && (
              <button
                type="button"
                className="is-secondary"
                disabled={Boolean(attachedAt)}
                onClick={attachToBuild}
              >
                <Save size={15} aria-hidden="true" />
                {attachLabel}
              </button>
            )}
            <button type="button" className="is-secondary" onClick={downloadReview}>
              <Download size={15} aria-hidden="true" />
              Download review
            </button>
            <button type="button" className="is-secondary" onClick={clearEvidence}>
              <Trash2 size={15} aria-hidden="true" />
              Clear evidence
            </button>
          </>
        )}
      </div>

      {error && <p className="bench-file-review-error" role="alert">{error}</p>}
      {message && <p className="bench-file-review-message" role="status">{message}</p>}

      {evidence && (
        <div
          className="bench-file-review-result"
          role="region"
          aria-label="Imported evidence review"
        >
          <div
            className={`bench-file-review-summary ${
              summaryComplete
                ? "is-complete"
                : observationPairComplete
                  ? "is-correlated"
                  : radioEvidenceComplete
                    ? "is-radio-evidence"
                  : fcEvidenceComplete || fcRcComplete
                    ? "is-fc-evidence"
                : evidence.rfReportedPass ? "is-claimed" : "is-incomplete"
            }`}
          >
            {evidence.rfEvidenceComplete
              || observationPairComplete
              || fcEvidenceComplete
              || fcRcComplete
              || radioEvidenceComplete
              ? <FileCheck2 size={19} aria-hidden="true" />
              : <ShieldAlert size={19} aria-hidden="true" />}
            <div>
              <strong>
                {observationPairComplete
                  ? "TX and RX observations correlate; RF remains unverified"
                  : observationPairIncomplete
                    ? "TX and RX observations do not yet correlate"
                  : radioEvidenceComplete
                    ? "Radio identity matches the selected endpoint; RF remains unverified"
                    : radioEvidenceIncomplete
                      ? "Radio identity does not match the selected endpoint"
                  : fcEvidenceComplete
                    ? "FC status and preflight are complete; hardware remains unverified"
                    : fcEvidenceIncomplete
                      ? receiverLinkNotEstablished
                        ? "FC status and preflight imported; receiver link not established"
                        : "FC evidence does not yet satisfy the selected plan"
                    : fcRcEvidence
                      ? fcRcComplete
                        ? "Fresh FC RC channels observed; RF remains unverified"
                        : "FC RC observation is inconclusive"
                  : fcParametersComplete
                    ? "FC parameters match the staged plan; hardware remains unverified"
                    : fcParametersMismatch
                      ? "FC parameters differ from the staged plan"
                      : fcParameterEvidence
                        ? "FC parameter snapshot is incomplete"
                : evidence.rfEvidenceComplete && settingsMismatch
                  ? "RF gates and diagnostics match, but module settings differ"
                  : evidence.rfEvidenceComplete
                    && evidence.bundle?.complete
                    && evidence.bundle?.settingsComplete
                    ? "RF gates, diagnostics, and module settings correlate"
                    : evidence.rfEvidenceComplete && evidence.bundle?.complete
                      ? "RF gates and TX/RX diagnostics correlate"
                  : evidence.rfEvidenceComplete
                  ? "Required RF gates are present in the file"
                  : evidence.rfReportedPass
                    ? "File reports RF PASS, but required evidence is incomplete"
                    : "No two-endpoint RF PASS is established"}
              </strong>
              <span>
                {evidence.importTrust}. This review does not change the hardware
                readiness badge.
                {evidence.kind === "observation-pair"
                  ? " Matching direction, target, and capture windows are observation evidence only, not UID or RF verification."
                  : ""}
                {evidence.kind === "fc-evidence"
                  ? " Imported FC status and preflight lines are read-only observations, not flight-ready authorization."
                  : ""}
                {evidence.kind === "fc-rc"
                  ? " Fresh FC RC channels are read-only evidence; they do not prove RF range, authenticity, or flight readiness."
                  : ""}
                {evidence.kind === "fc-parameters"
                  ? " Imported parameter values are read-only and were not written or saved."
                  : ""}
                {evidence.kind === "radio-status-evidence"
                  ? " Imported radio identity proves the endpoint answered; it does not prove RF range or performance."
                  : ""}
                {settingsMismatch
                  ? " The TX parameter snapshot does not match the current plan."
                  : evidence.bundle?.settingsComplete
                    ? " The TX module settings match the current plan."
                    : ""}
                {evidence.bundle?.complete
                  ? " Both endpoint boot diagnostics agree with the selected evidence."
                  : evidence.bundle?.diagnosticCount
                    ? " Endpoint boot diagnostics are incomplete or inconsistent."
                    : ""}
              </span>
            </div>
          </div>

          <dl className="bench-file-review-facts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {evidence.fcEvidence?.parameters?.values && (
            <FcParameterSnapshot values={evidence.fcEvidence.parameters.values} />
          )}

          {onAdoptPlanPatch && fcAdoptionPatch && (
            <EvidenceAdoptionCard
              source="fc"
              title="Apply observed flight-controller values"
              patch={fcAdoptionPatch}
              selectedIds={fcAdoptIds}
              onSelectionChange={setFcAdoptIds}
              blockedReason={fcAdoptionReason}
              onAdopt={() => adoptPatch("fc", fcAdoptionPatch, fcAdoptIds)}
            />
          )}

          {onAdoptPlanPatch && radioAdoptionPatch && (
            <EvidenceAdoptionCard
              source="radio"
              title="Apply observed TX radio values"
              patch={radioAdoptionPatch}
              selectedIds={radioAdoptIds}
              onSelectionChange={setRadioAdoptIds}
              blockedReason={radioAdoptionReason}
              onAdopt={() => adoptPatch(
                "radio",
                radioAdoptionPatch,
                radioAdoptIds,
              )}
            />
          )}

          {evidence.observationPair && (
            <div
              className="bench-observation-pair"
              role="region"
              aria-label="Native observation correlation"
            >
              <div className="bench-observation-pair-heading">
                <strong>Native endpoint observations</strong>
                <span>
                  {evidence.observationPair.targetMatch === true
                    ? "Same target"
                    : evidence.observationPair.targetMatch === false
                      ? "Targets differ"
                      : "Target not comparable"}
                  {evidence.observationPair.overlapMs > 0
                    ? ` · ${(evidence.observationPair.overlapMs / 1000).toFixed(1)} s overlap`
                    : evidence.observationPair.overlapMs != null
                      ? " · no overlap"
                      : " · timing incomplete"}
                </span>
              </div>
              <dl>
                {["tx", "rx"].map((role) => {
                  const observation = evidence.observationPair[role];
                  return (
                    <div key={role}>
                      <dt>{role.toUpperCase()} observation</dt>
                      <dd>
                        <span>
                          {observation.targetName || "Target not recorded"}
                        </span>
                        <span>
                          {observationTime(observation.captureStartedAt)}
                          {" – "}
                          {observationTime(
                            observation.captureEndedAt || observation.generatedAt,
                          )}
                        </span>
                        <span>
                          {observation.baudRate ?? "—"} baud ·{" "}
                          {observation.validFrames ?? 0} valid · CRC{" "}
                          {observation.crcErrors ?? "unknown"} · last frame{" "}
                          {observation.lastFrameAgeMs == null
                            ? "unknown"
                            : `${(observation.lastFrameAgeMs / 1000).toFixed(1)} s`}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p>
                Overlapping endpoint observations can corroborate direction and timing.
                They cannot prove endpoint UID pairing, authenticity, RF performance, or
                hardware readiness.
              </p>
            </div>
          )}

          {evidence.fcEvidence?.status && evidence.fcEvidence?.preflight && (
            <div
              className="bench-fc-evidence"
              role="region"
              aria-label="Flight controller status and preflight evidence"
            >
              <div className="bench-fc-evidence-heading">
                <strong>Flight-controller preflight</strong>
                <span>
                  {evidence.fcEvidence.status.protocol.toUpperCase()} ·{" "}
                  {evidence.fcEvidence.status.product || "product unknown"} ·{" "}
                  {evidence.fcEvidence.preflight.passCount} pass ·{" "}
                  {evidence.fcEvidence.preflight.failCount} fail ·{" "}
                  {evidence.fcEvidence.preflight.factCount} fact
                </span>
              </div>
              <ul>
                {evidence.fcEvidence.preflight.lines.map((line, index) => (
                  <li key={`${line.id}-${index}`} className={`is-${line.status}`}>
                    <span>
                      <strong>{line.name}</strong>
                      <small>{line.detail || "No additional detail."}</small>
                    </span>
                    <em>{line.label}</em>
                  </li>
                ))}
              </ul>
              <p>
                These are imported, read-only observations from the selected flight
                controller. They do not arm, fly, or authorize the build.
              </p>
            </div>
          )}

          {evidence.fcEvidence?.rc && (
            <div
              className="bench-fc-rc"
              role="region"
              aria-label="Flight controller RC observation"
            >
              <div className="bench-fc-rc-heading">
                <strong>Flight-controller RC observation</strong>
                <span>
                  {evidence.fcEvidence.rc.protocol.toUpperCase()}
                  {evidence.fcEvidence.rc.observedAtMs
                    ? ` · ${observationTime(
                      new Date(evidence.fcEvidence.rc.observedAtMs).toISOString(),
                    )}`
                    : " · time unavailable"}
                  {evidence.fcEvidence.rc.flags.length
                    ? ` · ${evidence.fcEvidence.rc.flags.join(", ")}`
                    : ""}
                </span>
              </div>
              <ol>
                {evidence.fcEvidence.rc.channels.map((channel, index) => (
                  <li key={`fc-rc-${index + 1}`}>
                    <span>CH {index + 1}</span>
                    <strong>{channel}</strong>
                  </li>
                ))}
              </ol>
              <p>
                These channels came from a fresh flight-controller read. Their
                presence does not prove RF range or that the displayed values
                came from a particular transmitter.
              </p>
            </div>
          )}

          {evidence.channelRanges?.length > 0 && (
            <div
              className="bench-file-calibration"
              role="region"
              aria-label="Imported receiver channel ranges"
            >
              <div>
                <strong>Observed receiver ranges</strong>
                {evidence.receiverCalibration && (
                  <span>
                    Plan {evidence.receiverCalibration.min} /{" "}
                    {evidence.receiverCalibration.mid} /{" "}
                    {evidence.receiverCalibration.max} ·{" "}
                    {(evidence.receiverCalibration.deadband * 100).toFixed(1)}%
                    deadband
                  </span>
                )}
              </div>
              <dl>
                {evidence.channelRanges.map((range) => (
                  <div key={range.channel}>
                    <dt>CH {range.channel}</dt>
                    <dd>{range.min}–{range.max}</dd>
                    <small className={`is-${range.calibrationStatus}`}>
                      {calibrationStatusLabels[range.calibrationStatus]
                        || range.calibrationStatus}
                    </small>
                  </div>
                ))}
              </dl>
              <p>
                Extrema are read-only observations and were not applied to the
                controller.
              </p>
            </div>
          )}

          <div
            className="bench-check-filter"
            role="group"
            aria-label="Filter imported evidence checks"
          >
            <button
              type="button"
              aria-pressed={checkFilter === "all"}
              onClick={() => setCheckFilter("all")}
            >
              All checks <span>{reviewChecks.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={checkFilter === "issues"}
              onClick={() => setCheckFilter("issues")}
            >
              Review items <span>{reviewIssueChecks.length}</span>
            </button>
          </div>
          {visibleReviewChecks.length > 0 ? (
            <ul className="bench-file-review-checks" aria-label="Imported evidence checks">
              {visibleReviewChecks.map((check) => (
                <li key={check.id} className={`is-${check.status}`}>
                  <span>
                    <strong>{check.label}</strong>
                    <small>{check.detail}</small>
                  </span>
                  <em>{checkStatusLabels[check.status]}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bench-check-filter-empty">
              No failed or unverified checks in this review.
            </p>
          )}
        </div>
      )}

      {previousRuns.length > 0 && (
        <details
          className="bench-evidence-history"
          aria-label="Evidence run history"
        >
          <summary>
            <History size={17} aria-hidden="true" />
            <span>
              <strong>Evidence run history</strong>
              <small>
                {previousRuns.length} earlier run
                {previousRuns.length === 1 ? "" : "s"}
                {historyComparison ? ` · ${historyComparison.label}` : ""}
              </small>
            </span>
          </summary>
          <div className="bench-evidence-history-body">
            <div className="bench-evidence-history-heading">
              <div>
                <span>
                  <h3>Compare local runs</h3>
                  <small>
                    Sanitized summaries only · up to eight local runs
                  </small>
                </span>
              </div>
              <button type="button" className="is-secondary" onClick={clearHistory}>
                <Trash2 size={15} aria-hidden="true" />
                Clear history
              </button>
            </div>
            {historyComparison && (
              <p className={`bench-evidence-history-delta is-${historyComparison.status}`}>
                <strong>{historyComparison.label}</strong>
                <span>
                  Compared with the previous run: {historyComparison.summary}
                </span>
              </p>
            )}
            <ol>
              {previousRuns.map((run, index) => {
                const runSummary = summarizeBenchEvidenceAttachment(run, evidenceScope);
                return (
                  <li key={`${run.attachedAt}-${index}`}>
                    <div>
                      <time dateTime={run.attachedAt}>{attachmentDate(run.attachedAt)}</time>
                      <strong>{runSummary.label}</strong>
                    </div>
                    <dl>
                      <div>
                        <dt>Pass</dt>
                        <dd>{runSummary.checkCounts?.pass ?? 0}</dd>
                      </div>
                      <div>
                        <dt>Fail</dt>
                        <dd>{runSummary.checkCounts?.fail ?? 0}</dd>
                      </div>
                      <div>
                        <dt>Open</dt>
                        <dd>{runSummary.checkCounts?.unverified ?? 0}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      )}
    </section>
  );
}
