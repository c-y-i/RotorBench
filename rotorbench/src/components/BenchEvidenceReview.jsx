import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
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
import { getBoardProfile } from "../data/flightControllerProfiles";
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
import RadioParameterSnapshot from "./RadioParameterSnapshot";
import AerialKitSensorReadings from "./AerialKitSensorReadings";
import AerialKitPerformanceReadings from "./AerialKitPerformanceReadings";
import AerialKitMotorTelemetryReadings from "./AerialKitMotorTelemetryReadings";
import AerialKitLogReadings from "./AerialKitLogReadings";
import AerialKitWaypointRouteSummary from "./AerialKitWaypointRouteSummary";
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
  "fc-live-status": "Aerial Kit live status + RC",
  "fc-log-sample": "Aerial Kit bounded log sample",
  "fc-identity": "Aerial Kit identity + capabilities",
  "fc-rc": "Flight-controller RC observation",
  "fc-parameters": "Flight-controller parameter snapshot",
  "radio-menu-inventory": "ExpressLRS device-reported menu",
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

const RADIO_EVIDENCE_KINDS = new Set([
  "pair",
  "bench",
  "capture",
  "observation",
  "observation-pair",
  "diagnostics",
  "radio-status-evidence",
]);

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
  onEvidenceChange = null,
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
      onEvidenceChange?.(parsed);
      setMessage(
        `${files.length} evidence file${files.length === 1 ? "" : "s"} reviewed locally and not yet attached.`,
      );
    } catch (readError) {
      setEvidence(null);
      onEvidenceChange?.(null);
      setError(readError.message);
    }
  };

  const clearEvidence = () => {
    setEvidence(null);
    onEvidenceChange?.(null);
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

  const fcBoardProfile = expectedFc?.plan?.profileId
    ? getBoardProfile(
        expectedFc.plan.profileId,
        expectedFc.selectedFlightController || null,
      )
    : null;
  const fcPlanTarget = [
    expectedFc?.targetName || fcBoardProfile?.label,
    expectedFc?.boardName || fcBoardProfile?.board,
  ].filter(Boolean).join(" · ");
  const fcEvidencePresent = Boolean(
    evidence?.fcEvidence?.identity
    || evidence?.fcEvidence?.status
    || evidence?.fcEvidence?.rc
    || evidence?.fcEvidence?.preflight
    || evidence?.fcEvidence?.parameters
    || evidence?.fcEvidence?.logSample
    || evidence?.bundle?.fcEvidenceCount,
  );
  const radioEvidencePresent = Boolean(
    evidence
    && (
      RADIO_EVIDENCE_KINDS.has(evidence.kind)
      || evidence.bundle?.observationCount
      || evidence.bundle?.diagnosticCount
      || evidence.bundle?.txParameters
      || evidence.bundle?.radioStatusCount
    ),
  );
  const radioPlanTarget = evidence?.planContext?.targetName
    || evidence?.bundle?.targetName
    || expectedRadio?.targetName
    || null;
  const combinedPlanTargets = fcEvidencePresent && radioEvidencePresent;
  const planTargetFacts = [
    fcEvidencePresent && {
      label: combinedPlanTargets ? "FC plan target" : "Plan target",
      value: fcPlanTarget || "Selected flight-controller plan",
    },
    radioEvidencePresent && {
      label: combinedPlanTargets ? "Radio plan target" : "Plan target",
      value: radioPlanTarget || "Selected radio endpoint",
    },
  ].filter(Boolean);
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
    {
      label: "Plan role",
      value: radioEvidencePresent
        ? evidence.planContext?.role?.toUpperCase() || null
        : null,
    },
    ...planTargetFacts,
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
      value: evidence.fcEvidence?.status?.protocol?.toUpperCase()
        || evidence.fcEvidence?.identity?.protocol?.toUpperCase()
        || null,
    },
    {
      label: "FC product",
      value: evidence.fcEvidence?.status?.product
        || evidence.fcEvidence?.identity?.product
        || null,
    },
    {
      label: "FC firmware",
      value: evidence.fcEvidence?.status?.firmware || null,
    },
    {
      label: "HELLO protocol",
      value: evidence.fcEvidence?.identity?.protocolVersion ?? null,
    },
    {
      label: "FC capability word",
      value: evidence.fcEvidence?.identity
        ? evidence.fcEvidence.identity.features == null
          ? "Absent — predates the field"
          : `0x${evidence.fcEvidence.identity.features.toString(16).padStart(8, "0")}`
        : null,
    },
    {
      label: "FC capabilities",
      value: evidence.fcEvidence?.identity
        ? evidence.fcEvidence.identity.features == null
          ? "Unknown"
          : evidence.fcEvidence.identity.featureNames.length
            ? evidence.fcEvidence.identity.featureNames.join(" · ")
            : "None reported"
        : null,
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
      label: "Log source",
      value: evidence.fcEvidence?.logSample?.sourceName || null,
    },
    {
      label: "Log records / holes",
      value: evidence.fcEvidence?.logSample
        ? `${evidence.fcEvidence.logSample.records} / ${evidence.fcEvidence.logSample.holes}`
        : null,
    },
    {
      label: "Log completion",
      value: evidence.fcEvidence?.logSample
        ? evidence.fcEvidence.logSample.noStream
          ? "No stream"
          : evidence.fcEvidence.logSample.manifest.delivery.complete
            ? "DONE"
            : "Incomplete"
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
  const fcIdentityEvidence = evidence?.kind === "fc-identity";
  const fcLiveStatusEvidence = evidence?.kind === "fc-live-status";
  const fcLogSampleEvidence = evidence?.kind === "fc-log-sample";
  const radioMenuEvidence = evidence?.kind === "radio-menu-inventory";
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
    <section
      id="bench-evidence-review"
      className="bench-file-review"
      aria-labelledby="bench-file-review-title"
      tabIndex={-1}
    >
      <div className="bench-file-review-heading">
        <div>
          <FileSearch size={18} aria-hidden="true" />
          <span>
            <strong id="bench-file-review-title">Review hardware evidence</strong>
            <small>
              Import Aerial Kit reports, observations, diagnostics, or Aerial Kit,
              Mission Planner, and QGroundControl parameter snapshots
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
          accept="application/json,.json,text/plain,.txt,.param,.params,.parm"
          aria-label="Choose hardware evidence files"
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
                    : radioMenuEvidence
                      ? "is-radio-evidence"
                  : fcEvidenceComplete || fcRcComplete || fcIdentityEvidence
                    || fcLiveStatusEvidence
                    ? "is-fc-evidence"
                : evidence.rfReportedPass ? "is-claimed" : "is-incomplete"
            }`}
          >
            {evidence.rfEvidenceComplete
              || observationPairComplete
              || fcEvidenceComplete
              || fcRcComplete
              || fcIdentityEvidence
              || fcLiveStatusEvidence
              || fcLogSampleEvidence
              || radioEvidenceComplete
              || radioMenuEvidence
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
                      : radioMenuEvidence
                        ? "ExpressLRS menu inventory reviewed; RF and hardware remain unverified"
                  : fcLiveStatusEvidence
                    ? evidence?.fcEvidence?.preflight
                      ? evidence.fcEvidence.preflight.status === "none"
                        ? "Live AKP status reviewed; board reports no preflight checklist"
                        : "Live AKP status and board preflight reviewed; hardware remains unverified"
                      : "Live AKP status and RC reviewed; board preflight not observed"
                    : fcLogSampleEvidence
                      ? evidence.fcEvidence?.logSample?.holes
                        ? "Bounded AKP log sample validated with retained holes; hardware remains unverified"
                        : "Bounded AKP log sample and manifest validated; hardware remains unverified"
                    : fcEvidenceComplete
                    ? "FC status and preflight are complete; hardware remains unverified"
                    : fcEvidenceIncomplete
                      ? receiverLinkNotEstablished
                        ? "FC status and preflight imported; receiver link not established"
                        : "FC evidence does not yet satisfy the selected plan"
                      : fcIdentityEvidence
                        ? "FC identity and capability word reviewed; hardware remains unverified"
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
                {evidence.kind === "fc-live-status"
                  ? evidence.fcEvidence?.preflight
                    ? " The live status, board preflight, and RC readback are time-bounded observations. Persistence, RF performance, and flight readiness remain unverified."
                    : " The live status, arming state, and RC readback are time-bounded observations. Board preflight, persistence, RF performance, and flight readiness remain unverified."
                  : ""}
                {evidence.kind === "fc-log-sample"
                  ? " The manifest was checked against every exported frame. It covers only the bounded sample, not the aircraft's full log."
                  : ""}
                {evidence.kind === "fc-identity"
                  ? " The capability word is a compiled-firmware claim from HELLO, not proof that RotorBench exercised any capability."
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
                {evidence.kind === "radio-menu-inventory"
                  ? " The menu inventory is a read-only snapshot of fields the module returned. It does not prove endpoint pairing, RF behavior, or persistence."
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

          <dl
            className="bench-file-review-facts"
            aria-label="Evidence review facts"
          >
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {evidence.fcEvidence?.identity && (
            <section
              className="bench-fc-identity"
              aria-label="Aerial Kit identity and capabilities"
            >
              <div className="bench-fc-identity-heading">
                <span>
                  <strong>{evidence.fcEvidence.identity.product}</strong>
                  <small>
                    Protocol {evidence.fcEvidence.identity.protocolVersion} ·{" "}
                    {evidence.fcEvidence.identity.parameterCount} parameters ·{" "}
                    {evidence.fcEvidence.identity.changed || "changed count not reported"}
                  </small>
                </span>
                <em
                  className={`is-${evidence.fcEvidence.identity.capabilityState}`}
                >
                  {evidence.fcEvidence.identity.capabilityState === "absent"
                    ? "Word absent"
                    : "Word reported"}
                </em>
              </div>
              <dl>
                <div>
                  <dt>Capability word</dt>
                  <dd>
                    {evidence.fcEvidence.identity.features == null
                      ? "Absent — this firmware predates the field"
                      : `0x${evidence.fcEvidence.identity.features.toString(16).padStart(8, "0")}`}
                  </dd>
                </div>
                <div>
                  <dt>Configuration hash</dt>
                  <dd>
                    {evidence.fcEvidence.identity.configHash == null
                      ? "Absent"
                      : `0x${evidence.fcEvidence.identity.configHash.toString(16).padStart(8, "0")}`}
                  </dd>
                </div>
              </dl>
              {evidence.fcEvidence.identity.features == null ? (
                <p>
                  HELLO ended before the capability word. RotorBench cannot
                  determine which optional commands this firmware answers; that
                  is different from a board reporting no capabilities.
                </p>
              ) : evidence.fcEvidence.identity.featureDetails.length ? (
                <ul aria-label="Reported firmware capabilities">
                  {evidence.fcEvidence.identity.featureDetails.map((feature) => (
                    <li key={feature.name}>
                      <strong>{feature.label}</strong>
                      <code>{feature.name}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>The firmware reports a capability word with no known bits set.</p>
              )}
              {evidence.fcEvidence.identity.unrecognizedFeatureMask > 0 && (
                <p>
                  Unrecognized feature bits:{" "}
                  <code>
                    0x{evidence.fcEvidence.identity.unrecognizedFeatureMask
                      .toString(16)
                      .padStart(8, "0")}
                  </code>
                </p>
              )}
              <p>
                Capability bits describe the compiled firmware. They do not show
                that a command was sent, accepted, applied, or persisted.
              </p>
            </section>
          )}

          {(evidence.fcEvidence?.liveStatus?.sensorMetadata?.length > 0
            || evidence.fcEvidence?.liveStatus?.outputMetadata) && (
            <section
              className="bench-fc-identity bench-live-hardware"
              aria-label="Imported Aerial Kit hardware metadata"
            >
              <div className="bench-fc-identity-heading">
                <span>
                  <strong>Board-reported hardware metadata</strong>
                  <small>Presence and descriptors from the imported live snapshot</small>
                </span>
                <em>Read-only</em>
              </div>
              {evidence.fcEvidence.liveStatus.sensorMetadata?.length > 0 && (
                <dl className="aerial-kit-hardware-list">
                  {evidence.fcEvidence.liveStatus.sensorMetadata.map((sensor) => (
                    <div key={sensor.topic} className={`is-${sensor.status}`}>
                      <dt>
                        <span>{sensor.topicName || `Topic ${sensor.topic}`}</span>
                        <em>
                          {sensor.status === "present"
                            ? "Present"
                            : sensor.status === "absent"
                              ? "Absent"
                              : "No such topic"}
                        </em>
                      </dt>
                      <dd>
                        <span>{sensor.driver || "No driver reported"}</span>
                        <AerialKitSensorReadings sensor={sensor} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {evidence.fcEvidence.liveStatus.outputMetadata && (
                <p>
                  Outputs: {evidence.fcEvidence.liveStatus.outputMetadata.motors} motor
                  {evidence.fcEvidence.liveStatus.outputMetadata.motors === 1 ? "" : "s"},{" "}
                  {evidence.fcEvidence.liveStatus.outputMetadata.servos} servo
                  {evidence.fcEvidence.liveStatus.outputMetadata.servos === 1 ? "" : "s"},{" "}
                  {evidence.fcEvidence.liveStatus.outputMetadata.capPercent}% test cap.
                  No output was driven.
                </p>
              )}
            </section>
          )}

          {evidence.fcEvidence?.parameters?.values && (
            <FcParameterSnapshot
              values={evidence.fcEvidence.parameters.values}
              checks={evidence.checks}
              format={evidence.fcEvidence.parameters.format}
              metadata={evidence.fcEvidence.parameters.metadata || []}
            />
          )}
          {evidence.bundle?.txParameters?.entries && (
            <RadioParameterSnapshot
              entries={evidence.bundle.txParameters.entries}
              checks={evidence.checks}
            />
          )}
          {evidence.bundle?.radioMenuParameters?.entries && (
            <RadioParameterSnapshot
              entries={evidence.bundle.radioMenuParameters.entries}
              checks={evidence.checks}
              title={`Observed ${evidence.bundle.radioMenuParameters.role?.toUpperCase() || "radio"} device menu`}
            />
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
                  {evidence.fcEvidence.preflight.status === "none"
                    ? "no checklist served"
                    : `${evidence.fcEvidence.preflight.passCount} pass · ${evidence.fcEvidence.preflight.failCount} fail · ${evidence.fcEvidence.preflight.factCount} fact`}
                </span>
              </div>
              {evidence.fcEvidence.preflight.status === "none" ? (
                <p>
                  The board answered that this build serves no preflight
                  checklist. RotorBench does not turn that response into a pass.
                </p>
              ) : (
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
              )}
              <p>
                These are imported, read-only observations from the selected flight
                controller. They do not arm, fly, or authorize the build.
              </p>
            </div>
          )}

          {evidence.fcEvidence?.liveStatus?.performance && (
            <section
              className="aerial-kit-perf"
              aria-label="Imported Aerial Kit performance window"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported loop performance</strong>
                <span>
                  {evidence.fcEvidence.liveStatus.performance.status === "none"
                    ? "No profiler"
                    : `${evidence.fcEvidence.liveStatus.performance.loops} loops · ${evidence.fcEvidence.liveStatus.performance.late} late`}
                </span>
              </div>
              <p>
                Period, jitter, section time, and instrumented load are preserved
                from the imported read-only snapshot. Load is a lower bound.
              </p>
              {evidence.fcEvidence.liveStatus.performance.status === "none" ? (
                <div className="aerial-kit-preflight-empty" role="note">
                  <Activity size={16} aria-hidden="true" />
                  <span>
                    <strong>No profiler in this build</strong>
                    <small>
                      The zeroed window is not a performance reading.
                    </small>
                  </span>
                </div>
              ) : (
                <AerialKitPerformanceReadings
                  performance={evidence.fcEvidence.liveStatus.performance}
                />
              )}
            </section>
          )}

          {evidence.fcEvidence?.liveStatus?.telemetryStream && (
            <section
              className="aerial-kit-telemetry-stream"
              aria-label="Imported Aerial Kit telemetry stream"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported telemetry stream</strong>
                <span>
                  {evidence.fcEvidence.liveStatus.telemetryStream.requestedHz}
                  {" → "}
                  {evidence.fcEvidence.liveStatus.telemetryStream.agreedHz} Hz
                </span>
              </div>
              <dl className="aerial-kit-telemetry-health">
                <div>
                  <dt>Frames</dt>
                  <dd>{evidence.fcEvidence.liveStatus.telemetryStream.frameCount}</dd>
                </div>
                <div>
                  <dt>Last observed</dt>
                  <dd>
                    {evidence.fcEvidence.liveStatus.telemetryStream.lastObservedAtMs
                      ? observationTime(new Date(
                        evidence.fcEvidence.liveStatus.telemetryStream.lastObservedAtMs,
                      ).toISOString())
                      : "No frame"}
                  </dd>
                </div>
                <div>
                  <dt>Uptime wraps / regressions</dt>
                  <dd>
                    {evidence.fcEvidence.liveStatus.telemetryStream.uptimeWraps}
                    {" / "}
                    {evidence.fcEvidence.liveStatus.telemetryStream.uptimeRegressions}
                  </dd>
                </div>
                <div>
                  <dt>Observed stream span</dt>
                  <dd>
                    {evidence.fcEvidence.liveStatus.telemetryStream.uptimeElapsedMs == null
                      ? "None"
                      : `${(evidence.fcEvidence.liveStatus.telemetryStream.uptimeElapsedMs / 1000).toFixed(3)} s`}
                  </dd>
                </div>
              </dl>
              {evidence.fcEvidence.liveStatus.telemetryStream.latest && (
                <dl className="aerial-kit-telemetry-latest">
                  <div>
                    <dt>Uptime</dt>
                    <dd>
                      {(evidence.fcEvidence.liveStatus.telemetryStream.latest.uptimeMs / 1000).toFixed(3)} s
                    </dd>
                  </div>
                  <div>
                    <dt>Flight state</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.flightState}
                    </dd>
                  </div>
                  <div>
                    <dt>Link</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.linkLive
                        ? "Live"
                        : "Not live"}
                    </dd>
                  </div>
                  <div>
                    <dt>Attitude</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.rollDeg.toFixed(1)} /{" "}
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.pitchDeg.toFixed(1)} /{" "}
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.yawDeg.toFixed(1)}°
                    </dd>
                  </div>
                  <div>
                    <dt>GPS</dt>
                    <dd>
                      fix {evidence.fcEvidence.liveStatus.telemetryStream.latest.gpsFixType} ·{" "}
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.gpsSatellites} satellites
                    </dd>
                  </div>
                  <div>
                    <dt>Motors</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.telemetryStream.latest.motors.join(" / ")}
                    </dd>
                  </div>
                </dl>
              )}
              <p>
                Imported stream timing is historical. Uptime regressions are
                preserved as anomalies, and a stream absence is not treated as a
                live aircraft state.
              </p>
            </section>
          )}

          {evidence.fcEvidence?.liveStatus?.mission && (
            <section
              className="aerial-kit-mission"
              aria-label="Imported Aerial Kit mission status"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported mission status</strong>
                <span>{evidence.fcEvidence.liveStatus.mission.status}</span>
              </div>
              {evidence.fcEvidence.liveStatus.mission.status === "ok" ? (
                <dl className="aerial-kit-mission-state">
                  <div>
                    <dt>Navigator</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.mission.active
                        ? "Mission active"
                        : "No mission active"}
                    </dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{evidence.fcEvidence.liveStatus.mission.requested ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Waypoints</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.mission.count}
                      {evidence.fcEvidence.liveStatus.mission.countCapped ? "+" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Current waypoint</dt>
                    <dd>{evidence.fcEvidence.liveStatus.mission.index ?? "None"}</dd>
                  </div>
                  <div>
                    <dt>Mission switch</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.mission.channel == null
                        ? "Not configured"
                        : `CH ${evidence.fcEvidence.liveStatus.mission.channel}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Hold altitude</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.mission.active
                        ? `${evidence.fcEvidence.liveStatus.mission.holdAltMm} mm`
                        : "No mission running"}
                    </dd>
                  </div>
                  <div>
                    <dt>Reached / started / cancelled</dt>
                    <dd>
                      {evidence.fcEvidence.liveStatus.mission.reached} /{" "}
                      {evidence.fcEvidence.liveStatus.mission.started} /{" "}
                      {evidence.fcEvidence.liveStatus.mission.cancelled}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="aerial-kit-preflight-empty" role="note">
                  <Activity size={16} aria-hidden="true" />
                  <span>
                    <strong>Mission state not available</strong>
                    <small>
                      The imported board reply was {evidence.fcEvidence.liveStatus.mission.status};
                      RotorBench does not reinterpret it as an empty mission.
                    </small>
                  </span>
                </div>
              )}
              <p>
                This is an imported status observation. It does not start, stop,
                clear, or upload a mission.
              </p>
            </section>
          )}

          {evidence.fcEvidence?.liveStatus?.waypointInventory && (
            <section
              className="aerial-kit-mission aerial-kit-waypoints"
              aria-label="Imported Aerial Kit waypoint inventory"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported waypoint inventory</strong>
                <span>
                  {evidence.fcEvidence.liveStatus.waypointInventory.count ?? "Unknown"}
                  {" configured · "}
                  {evidence.fcEvidence.liveStatus.waypointInventory.availableSlots}
                  {" available slots"}
                </span>
              </div>
              <p>
                Coordinates come from the imported `wp_count`, `wpN_lat`, and
                `wpN_lon` parameters. This is a read-only inventory, not an
                uploaded mission.
              </p>
              {evidence.fcEvidence.liveStatus.waypointInventory.status !== "ok" && (
                <div className="aerial-kit-rc-unavailable" role="note">
                  <ShieldAlert size={16} aria-hidden="true" />
                  <span>
                    <strong>Waypoint inventory incomplete</strong>
                    <small>
                      {evidence.fcEvidence.liveStatus.waypointInventory.reason
                        || evidence.fcEvidence.liveStatus.waypointInventory.status}
                    </small>
                  </span>
                </div>
              )}
              {evidence.fcEvidence.liveStatus.waypointInventory.slots.length > 0 && (
                <ol>
                  {evidence.fcEvidence.liveStatus.waypointInventory.slots.map((slot) => (
                    <li key={slot.index} className={slot.complete ? "is-complete" : "is-incomplete"}>
                      <strong>WP {slot.index}</strong>
                      <span>
                        {slot.complete
                          ? `${slot.lat.toFixed(7)}, ${slot.lon.toFixed(7)}`
                          : slot.errors.join(" · ")}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <AerialKitWaypointRouteSummary
                route={evidence.fcEvidence.liveStatus.routeSummary}
              />
            </section>
          )}

          {evidence.fcEvidence?.liveStatus?.calibration && (
            <section
              className="aerial-kit-calibration"
              aria-label="Imported Aerial Kit calibration status"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported calibration session</strong>
                <span>{evidence.fcEvidence.liveStatus.calibration.status}</span>
              </div>
              {evidence.fcEvidence.liveStatus.calibration.status === "done" ? (
                <>
                  <dl className="aerial-kit-calibration-state">
                    <div>
                      <dt>Session</dt>
                      <dd>{evidence.fcEvidence.liveStatus.calibration.verb || "No session named"}</dd>
                    </div>
                    <div>
                      <dt>State</dt>
                      <dd>{evidence.fcEvidence.liveStatus.calibration.active ? "Sampling" : "Idle"}</dd>
                    </div>
                    <div>
                      <dt>Face</dt>
                      <dd>
                        {evidence.fcEvidence.liveStatus.calibration.step == null
                          ? "Not sampling"
                          : evidence.fcEvidence.liveStatus.calibration.step}
                      </dd>
                    </div>
                    <div>
                      <dt>Faces complete</dt>
                      <dd>
                        {evidence.fcEvidence.liveStatus.calibration.verb === "accel"
                          ? `${evidence.fcEvidence.liveStatus.calibration.facesDone} / 6`
                          : "Not applicable"}
                      </dd>
                    </div>
                    <div>
                      <dt>Samples / rejected</dt>
                      <dd>
                        {evidence.fcEvidence.liveStatus.calibration.samples} /{" "}
                        {evidence.fcEvidence.liveStatus.calibration.rejected}
                      </dd>
                    </div>
                  </dl>
                  {evidence.fcEvidence.liveStatus.calibration.resultValues.length > 0 && (
                    <dl className="aerial-kit-calibration-results">
                      {evidence.fcEvidence.liveStatus.calibration.resultValues.map((result) => (
                        <div key={result.name}>
                          <dt>{result.name}</dt>
                          <dd>{result.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              ) : (
                <div className="aerial-kit-preflight-empty" role="note">
                  <Activity size={16} aria-hidden="true" />
                  <span>
                    <strong>Calibration response</strong>
                    <small>
                      The imported board reply was {evidence.fcEvidence.liveStatus.calibration.status}.
                      Its result slots are not presented as a completed calibration.
                    </small>
                  </span>
                </div>
              )}
              <p>
                This is an imported status observation. It did not start, abort,
                or apply a calibration.
              </p>
            </section>
          )}

          {evidence.fcEvidence?.liveStatus?.motorTelemetry && (
            <section
              className="aerial-kit-motors"
              aria-label="Imported Aerial Kit ESC telemetry"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported ESC telemetry</strong>
                <span>
                  {evidence.fcEvidence.liveStatus.motorTelemetry.status === "none"
                    ? "No telemetry path"
                    : `${evidence.fcEvidence.liveStatus.motorTelemetry.motors.filter((motor) => motor.measured).length}/${evidence.fcEvidence.liveStatus.motorTelemetry.count} answering`}
                </span>
              </div>
              <p>
                Per-output fields follow the imported flags. Missing RPM,
                temperature, voltage, or current remains not reported, and an
                unmeasured motor is not treated as stopped.
              </p>
              {evidence.fcEvidence.liveStatus.motorTelemetry.status === "none" ? (
                <div className="aerial-kit-preflight-empty" role="note">
                  <Activity size={16} aria-hidden="true" />
                  <span>
                    <strong>No ESC telemetry path</strong>
                    <small>
                      The imported snapshot contains no motor readings.
                    </small>
                  </span>
                </div>
              ) : (
                <>
                  <p className="aerial-kit-motor-poles">
                    Pole count reported by the board:{" "}
                    {evidence.fcEvidence.liveStatus.motorTelemetry.poles || "unknown"}.
                  </p>
                  <AerialKitMotorTelemetryReadings
                    telemetry={evidence.fcEvidence.liveStatus.motorTelemetry}
                  />
                </>
              )}
            </section>
          )}

          {(evidence.fcEvidence?.liveStatus?.logInventory
            || evidence.fcEvidence?.liveStatus?.logSample) && (
            <section
              className="aerial-kit-logs"
              aria-label="Imported Aerial Kit log sample"
            >
              <div className="aerial-kit-section-heading">
                <strong>Imported flight-log sample</strong>
                <span>
                  {evidence.fcEvidence.liveStatus.logSample
                    ? `${evidence.fcEvidence.liveStatus.logSample.records} records · ${evidence.fcEvidence.liveStatus.logSample.holes} holes`
                    : `${evidence.fcEvidence.liveStatus.logInventory?.filter((entry) => entry.status === "available").length || 0} sources`}
                </span>
              </div>
              <p>
                Source availability, record indexes, holes, completion, and
                record versions are preserved from the imported read-only
                snapshot.
              </p>
              <AerialKitLogReadings
                inventory={evidence.fcEvidence.liveStatus.logInventory}
                sample={evidence.fcEvidence.liveStatus.logSample}
                sourceLabels={["Fast ring", "Long ring", "Flash log"]}
              />
            </section>
          )}

          {evidence.kind === "fc-log-sample"
            && evidence.fcEvidence?.logSample && (
            <section
              className="aerial-kit-logs"
              aria-label="Imported bounded Aerial Kit log artifact"
            >
              <div className="aerial-kit-section-heading">
                <strong>Validated log-sample manifest</strong>
                <span>
                  {evidence.fcEvidence.logSample.records} records ·{" "}
                  {evidence.fcEvidence.logSample.holes} holes
                </span>
              </div>
              <p>
                The declared source, range, delivery counts, completion, holes,
                and record versions agree with every frame in this artifact. It
                is a bounded sample, not the aircraft&apos;s full log.
              </p>
              <dl
                className="aerial-kit-log-manifest"
                aria-label="Validated log sample manifest"
              >
                <div>
                  <dt>Source</dt>
                  <dd>{evidence.fcEvidence.logSample.sourceName || "Unknown"}</dd>
                </div>
                <div>
                  <dt>Requested range</dt>
                  <dd>
                    #{evidence.fcEvidence.logSample.first} ·{" "}
                    {evidence.fcEvidence.logSample.count} records ·{" "}
                    {evidence.fcEvidence.logSample.hz} Hz
                  </dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>
                    {evidence.fcEvidence.logSample.noStream
                      ? "No stream"
                      : evidence.fcEvidence.logSample.done
                        ? "Terminal DONE"
                        : "Incomplete"}
                  </dd>
                </div>
                <div>
                  <dt>Record versions</dt>
                  <dd>
                    v2 {evidence.fcEvidence.logSample.manifest.recordVersions["2"]}
                    {" · "}
                    v3 {evidence.fcEvidence.logSample.manifest.recordVersions["3"]}
                    {" · "}
                    v4 {evidence.fcEvidence.logSample.manifest.recordVersions["4"]}
                  </dd>
                </div>
              </dl>
              <AerialKitLogReadings
                inventory={evidence.fcEvidence.logSample.inventory}
                sample={evidence.fcEvidence.logSample}
                sourceLabels={["Fast ring", "Long ring", "Flash log"]}
              />
            </section>
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
