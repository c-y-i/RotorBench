import { readJsonStorage, writeJsonStorage } from "./storage";

export const BENCH_EVIDENCE_ATTACHMENT_SCHEMA = "rotorbench.build-bench-evidence.v1";
export const BENCH_EVIDENCE_HISTORY_SCHEMA = "rotorbench.build-bench-evidence-history.v1";
export const BENCH_EVIDENCE_SCOPE_SCHEMA = "rotorbench.build-bench-evidence-scope.v1";
export const BENCH_EVIDENCE_HISTORY_LIMIT = 8;

const COMPONENT_ID_KEYS = [
  "frameId",
  "motorId",
  "propellerId",
  "batteryId",
  "escId",
  "flightControllerId",
  "receiverId",
];

const FLIGHT_CONTROLLER_SCOPE_KEYS = [
  "planVersion",
  "firmwareFamily",
  "profileId",
  "selectedFlightControllerId",
  "selectedReceiverId",
  "airframe",
  "receiverProtocol",
  "receiverUart",
  "receiverBaud",
  "rcMin",
  "rcMid",
  "rcMax",
  "rcDeadband",
  "dshotKhz",
  "failsafeAction",
  "failsafeThrottle",
  "armChannel",
  "modeChannel",
  "beeperChannel",
  "velocityChannel",
  "missionChannel",
  "launchChannel",
  "launchThrottle",
  "launchClimbDeg",
  "launchTimeoutS",
  "manualChannel",
  "ctrlChannel",
  "sysidChannel",
  "armHoldMs",
  "armMaxTiltDeg",
  "throttleLow",
  "rcTimeoutMs",
  "rthEnabled",
];

const RADIO_SCOPE_KEYS = [
  "planVersion",
  "targetId",
  "selectedReceiverId",
  "role",
  "packetRateMode",
  "powerDbm",
  "telemetryRatio",
  "switchMode",
  "linkMode",
  "dynamicPower",
  "modelMatch",
];

export function benchEvidenceStorageKey(buildId) {
  return buildId ? `rotorbench:bench-evidence:${buildId}:v1` : null;
}

export function benchEvidenceHistoryStorageKey(buildId) {
  return buildId ? `rotorbench:bench-evidence-history:${buildId}:v1` : null;
}

function pickValues(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source?.[key] ?? null]));
}

function sortedValues(source) {
  return source && typeof source === "object"
    ? Object.fromEntries(
        Object.entries(source).sort(([left], [right]) => left.localeCompare(right)),
      )
    : null;
}

function stableFingerprint(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

function pairingFingerprint(uid) {
  const compact = String(uid || "")
    .trim()
    .replace(/[\s:_-]/g, "")
    .toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(compact)) return null;
  return stableFingerprint(compact);
}

function checkSetFingerprint(checks) {
  const identifiers = (Array.isArray(checks) ? checks : [])
    .map((check) => check.id || check.label || "")
    .filter(Boolean)
    .sort();
  return identifiers.length ? stableFingerprint(identifiers.join("|")) : null;
}

function sanitizeStoredAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return null;
  const {
    txUid: legacyTxUid,
    rxUid: legacyRxUid,
    planUid: legacyPlanUid,
    ...stored
  } = attachment;
  const txUidFingerprint = stored.txUidFingerprint
    || pairingFingerprint(legacyTxUid);
  const rxUidFingerprint = stored.rxUidFingerprint
    || pairingFingerprint(legacyRxUid);
  const planUidFingerprint = stored.planUidFingerprint
    || pairingFingerprint(legacyPlanUid);
  return {
    ...stored,
    txUidFingerprint: txUidFingerprint || null,
    rxUidFingerprint: rxUidFingerprint || null,
    planUidFingerprint: planUidFingerprint || null,
    uidPairMatches: stored.uidPairMatches
      ?? (legacyTxUid && legacyRxUid ? legacyTxUid === legacyRxUid : null),
    currentPlanUidMatch: stored.currentPlanUidMatch
      ?? (
        legacyTxUid && legacyRxUid && legacyPlanUid
          ? legacyTxUid === legacyPlanUid && legacyRxUid === legacyPlanUid
          : null
      ),
    hasImportedUids: stored.hasImportedUids
      ?? Boolean(legacyTxUid && legacyRxUid),
  };
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== "object") return null;
  return {
    schema: BENCH_EVIDENCE_SCOPE_SCHEMA,
    componentIds: pickValues(scope.componentIds, COMPONENT_ID_KEYS),
    flightController: scope.flightController
      ? {
          ...pickValues(
            scope.flightController,
            FLIGHT_CONTROLLER_SCOPE_KEYS,
          ),
          features: sortedValues(scope.flightController.features),
        }
      : null,
    radio: scope.radio
      ? {
          ...pickValues(scope.radio, RADIO_SCOPE_KEYS),
          pairingFingerprint: scope.radio.pairingFingerprint
            || pairingFingerprint(scope.radio.pairingUid),
          channelMap: sortedValues(scope.radio.channelMap),
        }
      : null,
  };
}

export function createBenchEvidenceScope({
  build,
  flightControllerPlan = null,
  radioPlan = null,
  pairingUid = null,
} = {}) {
  return normalizeScope({
    componentIds: build?.componentIds,
    flightController: flightControllerPlan,
    radio: radioPlan
      ? { ...radioPlan, pairingUid }
      : null,
  });
}

export function benchEvidenceScopeMatches(attachedScope, currentScope) {
  if (!attachedScope || !currentScope) return false;
  const attached = normalizeScope(attachedScope);
  const current = normalizeScope(currentScope);
  if (
    attached.radio
    && current.radio
  ) {
    current.radio.pairingFingerprint = attached.radio.pairingFingerprint;
  }
  return JSON.stringify(attached) === JSON.stringify(current);
}

export function benchEvidenceDomainScopeMatches(
  attachedScope,
  currentScope,
  domain,
) {
  if (
    !attachedScope
    || !currentScope
    || !["flightController", "radio"].includes(domain)
  ) {
    return false;
  }
  const attached = normalizeScope(attachedScope);
  const current = normalizeScope(currentScope);
  const componentKey = domain === "radio" ? "receiverId" : "flightControllerId";
  return attached.componentIds[componentKey] === current.componentIds[componentKey]
    && JSON.stringify(attached[domain]) === JSON.stringify(current[domain]);
}

export function readCurrentBenchEvidenceScope(
  build,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  if (!build?.id || !storage) return null;
  const base = `rotorbench:hardware-plan:${build.id}`;
  const flightControllerPlan = readJsonStorage(`${base}:fc`, null, storage);
  const radioPlan = readJsonStorage(`${base}:radio`, null, storage);
  return createBenchEvidenceScope({
    build,
    flightControllerPlan:
      flightControllerPlan?.planVersion === 3 ? flightControllerPlan : null,
    radioPlan: radioPlan?.planVersion === 3 ? radioPlan : null,
  });
}

export function createBenchEvidenceAttachment(
  review,
  attachedAt = new Date().toISOString(),
  scope = null,
) {
  if (!review || review.schema !== "rotorbench.bench-evidence-review.v1") {
    throw new Error("A reviewed bench evidence bundle is required.");
  }
  const checkCounts = {
    pass: review.checks.filter((check) => check.status === "pass").length,
    fail: review.checks.filter((check) => check.status === "fail").length,
    unverified: review.checks.filter((check) => check.status === "unverified").length,
  };
  const normalizedScope = normalizeScope(scope);
  const txUidFingerprint = pairingFingerprint(review.txUid);
  const rxUidFingerprint = pairingFingerprint(review.rxUid);
  const planUidFingerprint = pairingFingerprint(review.planUid);
  return {
    schema: BENCH_EVIDENCE_ATTACHMENT_SCHEMA,
    attachedAt,
    ...(normalizedScope ? { scope: normalizedScope } : {}),
    kind: review.kind,
    fileOverall: review.fileOverall,
    importTrust: review.importTrust,
    hardwareVerifiedByRotorBench: false,
    rfReportedPass: Boolean(review.rfReportedPass),
    rfEvidenceComplete: Boolean(review.rfEvidenceComplete),
    observationCorrelationComplete: Boolean(review.observationCorrelationComplete),
    fcEvidenceComplete: Boolean(review.fcEvidence?.evidenceComplete),
    fcParametersComplete: review.kind === "fc-parameters"
      && review.checks.some((check) => check.status === "pass")
      && review.checks.every((check) => check.status === "pass"),
    missionRouteComplete: review.kind === "fc-mission-route"
      && review.fcEvidence?.missionRoute?.geometryRecomputed === true,
    missionRoute: review.kind === "fc-mission-route"
      && review.fcEvidence?.missionRoute
      ? {
          waypointCount: review.fcEvidence.missionRoute.route.waypointCount,
          totalDistanceM: review.fcEvidence.missionRoute.route.totalDistanceM,
          activeWaypointIndex:
            review.fcEvidence.missionRoute.activeTarget.index,
          staleOnImport: review.fcEvidence.missionRoute.staleOnImport,
          geometryRecomputed: true,
        }
      : null,
    radioEvidenceComplete: Boolean(review.radioDeviceEvidence?.evidenceComplete),
    diagnosticsComplete: review.bundle?.complete ?? null,
    settingsComplete: review.bundle?.settingsComplete ?? null,
    integrityClean: review.integrityClean ?? null,
    checkSetFingerprint: checkSetFingerprint(review.checks),
    txUidFingerprint,
    rxUidFingerprint,
    planUidFingerprint,
    uidPairMatches: review.importedUidsMatch
      ?? (
        review.txUid && review.rxUid
          ? review.txUid === review.rxUid
          : null
      ),
    currentPlanUidMatch: review.currentPlanMatches
      ?? (
        review.txUid && review.rxUid && review.planUid
          ? review.txUid === review.planUid
            && review.rxUid === review.planUid
          : null
      ),
    hasImportedUids: Boolean(review.txUid && review.rxUid),
    planContext: review.planContext || null,
    reportedBaud: review.reportedBaud ?? null,
    checkCounts,
    failedChecks: review.checks
      .filter((check) => check.status === "fail")
      .map((check) => check.label),
    unverifiedChecks: review.checks
      .filter((check) => check.status === "unverified")
      .map((check) => check.label),
  };
}

export function saveBenchEvidenceAttachment(
  buildId,
  review,
  storage = typeof window !== "undefined" ? window.localStorage : null,
  scope = null,
) {
  const key = benchEvidenceStorageKey(buildId);
  if (!key) return false;
  const attachment = createBenchEvidenceAttachment(review, undefined, scope);
  if (!writeJsonStorage(key, attachment, storage)) return false;
  appendBenchEvidenceAttachmentHistory(buildId, attachment, storage);
  return attachment;
}

export function readBenchEvidenceAttachment(
  buildId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const key = benchEvidenceStorageKey(buildId);
  if (!key) return null;
  const attachment = readJsonStorage(key, null, storage);
  if (attachment?.schema !== BENCH_EVIDENCE_ATTACHMENT_SCHEMA) return null;
  const safeAttachment = sanitizeStoredAttachment(attachment);
  if (
    Object.hasOwn(attachment, "txUid")
    || Object.hasOwn(attachment, "rxUid")
    || Object.hasOwn(attachment, "planUid")
  ) {
    writeJsonStorage(key, safeAttachment, storage);
  }
  return safeAttachment;
}

export function readBenchEvidenceAttachmentHistory(
  buildId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const key = benchEvidenceHistoryStorageKey(buildId);
  if (!key) return [];
  const stored = readJsonStorage(key, null, storage);
  if (stored?.schema !== BENCH_EVIDENCE_HISTORY_SCHEMA || !Array.isArray(stored.runs)) {
    return [];
  }
  const runs = stored.runs
    .filter((run) => run?.schema === BENCH_EVIDENCE_ATTACHMENT_SCHEMA)
    .map(sanitizeStoredAttachment)
    .sort((left, right) => (
      new Date(right.attachedAt).getTime() - new Date(left.attachedAt).getTime()
    ))
    .slice(0, BENCH_EVIDENCE_HISTORY_LIMIT);
  const changed = runs.some((run, index) => (
    JSON.stringify(run) !== JSON.stringify(stored.runs[index])
  ));
  if (changed) {
    writeJsonStorage(key, {
      schema: BENCH_EVIDENCE_HISTORY_SCHEMA,
      runs,
    }, storage);
  }
  return runs;
}

export function appendBenchEvidenceAttachmentHistory(
  buildId,
  attachment,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const key = benchEvidenceHistoryStorageKey(buildId);
  if (
    !key
    || !attachment
    || attachment.schema !== BENCH_EVIDENCE_ATTACHMENT_SCHEMA
  ) {
    return false;
  }
  const existing = readBenchEvidenceAttachmentHistory(buildId, storage);
  const runs = [
    attachment,
    ...existing.filter((run) => run.attachedAt !== attachment.attachedAt),
  ].slice(0, BENCH_EVIDENCE_HISTORY_LIMIT);
  return writeJsonStorage(key, {
    schema: BENCH_EVIDENCE_HISTORY_SCHEMA,
    runs,
  }, storage);
}

export function clearBenchEvidenceAttachmentHistory(
  buildId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const key = benchEvidenceHistoryStorageKey(buildId);
  if (!key || !storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function compareBenchEvidenceRuns(current, previous, {
  currentScope = null,
} = {}) {
  if (!current || !previous) return null;
  const currentSummary = summarizeBenchEvidenceAttachment(current, currentScope);
  const previousSummary = summarizeBenchEvidenceAttachment(previous, currentScope);
  const currentPairing = current.scope?.radio?.pairingFingerprint || null;
  const previousPairing = previous.scope?.radio?.pairingFingerprint || null;
  const scopeComparable = current.scope && previous.scope
    ? benchEvidenceScopeMatches(current.scope, previous.scope)
    : !current.scope && !previous.scope;
  const comparisonIssue = current.kind !== previous.kind
    ? "Different evidence types cannot be compared."
    : !current.checkSetFingerprint
      || current.checkSetFingerprint !== previous.checkSetFingerprint
      ? "The runs cover different checks."
      : !scopeComparable
        ? "The runs were recorded against different build or plan scopes."
        : currentPairing !== previousPairing
          ? "The runs were recorded against different staged pairing identities."
          : ["stale", "identity-mismatch"].includes(currentSummary.scopeStatus)
            || ["stale", "identity-mismatch"].includes(previousSummary.scopeStatus)
            ? "At least one run no longer matches the current build scope."
            : null;
  if (comparisonIssue) {
    return {
      status: "not-comparable",
      label: "Not comparable",
      summary: comparisonIssue,
      comparable: false,
    };
  }
  const passDelta = (current.checkCounts?.pass || 0)
    - (previous.checkCounts?.pass || 0);
  const failDelta = (current.checkCounts?.fail || 0)
    - (previous.checkCounts?.fail || 0);
  const unverifiedDelta = (current.checkCounts?.unverified || 0)
    - (previous.checkCounts?.unverified || 0);
  const completionKeys = [
    "rfEvidenceComplete",
    "fcEvidenceComplete",
    "fcParametersComplete",
    "missionRouteComplete",
    "radioEvidenceComplete",
    "observationCorrelationComplete",
  ];
  const lostCompletion = completionKeys.some(
    (keyName) => previous[keyName] === true && current[keyName] !== true,
  );
  const gainedCompletion = completionKeys.some(
    (keyName) => previous[keyName] !== true && current[keyName] === true,
  );
  const status = lostCompletion
    || (failDelta > 0 && unverifiedDelta >= 0)
    || (passDelta < 0 && unverifiedDelta >= 0)
    ? "regressed"
    : (
      passDelta > 0
      || gainedCompletion
      || failDelta < 0
      || unverifiedDelta < 0
    )
      ? failDelta > 0 ? "mixed" : "improved"
      : failDelta === 0 && passDelta === 0 && unverifiedDelta === 0
        ? "unchanged"
        : "mixed";
  const changes = [
    passDelta ? `${passDelta > 0 ? "+" : ""}${passDelta} pass` : null,
    failDelta ? `${failDelta > 0 ? "+" : ""}${failDelta} fail` : null,
    unverifiedDelta
      ? `${unverifiedDelta > 0 ? "+" : ""}${unverifiedDelta} open`
      : null,
  ].filter(Boolean);
  return {
    comparable: true,
    status,
    label: status === "regressed"
      ? "Review regressed"
      : status === "improved"
        ? "Review improved"
        : status === "mixed"
          ? "Review coverage changed"
          : "No check-count change",
    summary: changes.length
      ? changes.join(" · ")
      : "Same pass, fail, and open counts.",
    passDelta,
    failDelta,
    unverifiedDelta,
  };
}

export function copyBenchEvidenceAttachment(
  sourceBuildId,
  targetBuildId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const sourceKey = benchEvidenceStorageKey(sourceBuildId);
  const targetKey = benchEvidenceStorageKey(targetBuildId);
  if (!sourceKey || !targetKey || !storage) return false;
  const attachment = readBenchEvidenceAttachment(sourceBuildId, storage);
  if (!attachment) return false;
  if (!writeJsonStorage(targetKey, attachment, storage)) return false;
  appendBenchEvidenceAttachmentHistory(targetBuildId, attachment, storage);
  return true;
}

export function removeBenchEvidenceAttachment(
  buildId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  const key = benchEvidenceStorageKey(buildId);
  if (!key || !storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function summarizeBenchEvidenceAttachment(attachment, currentScope = null) {
  if (!attachment) {
    return {
      status: "none",
      configured: false,
      label: "No imported evidence",
      hardwareVerified: false,
    };
  }
  const fileStatus = attachment.radioEvidenceComplete
    ? "radio-evidence"
    : attachment.missionRouteComplete
      ? "mission-route"
    : attachment.fcParametersComplete
      ? "fc-parameters"
    : attachment.fcEvidenceComplete
    ? "fc-evidence"
    : attachment.observationCorrelationComplete
      ? "observation-pair"
      : attachment.rfEvidenceComplete
    && attachment.diagnosticsComplete
    && attachment.settingsComplete
    ? "correlated"
    : attachment.rfEvidenceComplete && attachment.settingsComplete === false
      ? "settings-mismatch"
      : attachment.rfEvidenceComplete
        ? "rf-only"
        : attachment.rfReportedPass
          ? "claimed"
          : "observation";
  const scopeMismatch = Boolean(
    attachment.scope
    && currentScope
    && !benchEvidenceScopeMatches(attachment.scope, currentScope),
  );
  const scopeStatus = !attachment.scope
    ? "unrecorded"
    : !currentScope
      ? "unchecked"
      : scopeMismatch
        ? "stale"
        : "matched";
  const attachedFingerprint = attachment.scope?.radio?.pairingFingerprint || null;
  const currentFingerprint = currentScope?.radio?.pairingFingerprint || null;
  const identityStatus = !attachedFingerprint
    ? "not-recorded"
    : !currentFingerprint
      ? "not-staged"
      : attachedFingerprint === currentFingerprint ? "matched" : "mismatch";
  const successfulFileStatus = [
    "fc-evidence",
    "fc-parameters",
    "mission-route",
    "radio-evidence",
    "correlated",
    "observation-pair",
    "rf-only",
  ].includes(fileStatus);
  const status = scopeStatus === "unrecorded"
    ? "unscoped"
    : scopeMismatch
      ? "stale"
      : identityStatus === "mismatch"
        ? "identity-mismatch"
        : identityStatus === "not-staged" && successfulFileStatus
          ? "identity-unstaged"
          : fileStatus;
  const label = {
    "radio-evidence": "Radio device status reviewed",
    "fc-parameters": "FC parameter snapshot matched",
    "mission-route": attachment.missionRoute?.staleOnImport
      ? "Mission route validated · historical observation"
      : "Mission route geometry validated",
    "fc-evidence": "FC status and preflight reviewed",
    "identity-mismatch": "Imported evidence · staged UID changed",
    "identity-unstaged": "Imported evidence · UID not currently staged",
    "observation-pair": "Two-endpoint observations correlated",
    unscoped: "Imported evidence · build revision not recorded",
    stale: "Imported evidence · build or plan changed",
    correlated: "Imported evidence correlated",
    "settings-mismatch": "Imported settings mismatch",
    "rf-only": "Imported RF evidence; checks open",
    claimed: "Imported RF claim only",
    observation: "Imported observation only",
  }[status];
  return {
    status,
    configured: true,
    label,
    scopeStatus,
    identityStatus,
    attachedAt: attachment.attachedAt,
    checkCounts: attachment.checkCounts,
    failedChecks: attachment.failedChecks,
    unverifiedChecks: attachment.unverifiedChecks,
    importTrust: attachment.importTrust,
    hardwareVerified: false,
  };
}
