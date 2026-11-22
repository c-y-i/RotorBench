import { RADIO_POWER_LEVELS } from "../data/radioProfiles";
import {
  fcEvidenceChecks,
  fcIdentityChecks,
  fcParameterChecks,
  parseFcIdentityJson,
  parseFcPreflightJson,
  parseFcPreflightText,
  parseFcParameterSnapshotText,
  parseFcRcJson,
  parseFcStatusJson,
} from "./fcEvidence";
import {
  parseRadioStatusJson,
  radioStatusChecks,
} from "./radioDeviceEvidence";

const MAX_EVIDENCE_BYTES = 1024 * 1024;

const PASS = "PASS";
const FAIL = "FAIL";
const NOT_TESTED = "NOT TESTED";
const UNVERIFIED = "UNVERIFIED";

const RADIO_PARAMETER_OPTIONS = Object.freeze({
  "Packet Rate": ["50Hz", "100Hz", "150Hz", "250Hz", "333Hz Full", "500Hz"],
  "Telem Ratio": ["Std", "Off", "1:128", "1:64", "1:32", "1:16", "1:8", "1:4", "1:2", "Race"],
  "Switch Mode": ["Wide", "Hybrid"],
  "Link Mode": ["Normal", "MAVLink"],
  "Max Power": ["10", "25", "50", "100", "250"],
  Dynamic: ["Off", "Dyn", "AUX9", "AUX10"],
  "Model Match": ["Off", "On"],
});

function utf8ByteLength(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function normalizedUid(value) {
  const raw = String(value || "").trim();
  if (!/^[0-9a-f:_\-\s]+$/i.test(raw)) return "";
  const compact = raw.replace(/[\s:_-]/g, "").toLowerCase();
  return /^[0-9a-f]{12}$/.test(compact) ? compact : "";
}

function formatUid(value) {
  const normalized = normalizedUid(value);
  if (normalized.length !== 12) return null;
  return normalized.match(/.{2}/g).join(":").toUpperCase();
}

function normalizeRequirement(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === PASS) return PASS;
  if (normalized === FAIL) return FAIL;
  if (normalized === NOT_TESTED || normalized === "UNTESTED") return NOT_TESTED;
  return UNVERIFIED;
}

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parsedTimestamp(value) {
  if (value == null || value === "") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function makeCheck(id, label, status, detail) {
  return { id, label, status, detail };
}

function statusFromRequirement(value) {
  const status = normalizeRequirement(value);
  if (status === PASS) return "pass";
  if (status === FAIL) return "fail";
  return "unverified";
}

function requirementDetail(status, source) {
  if (status === PASS) return `${source} reports PASS.`;
  if (status === FAIL) return `${source} reports FAIL.`;
  if (status === NOT_TESTED) return `${source} reports NOT TESTED.`;
  return `${source} does not contain this result.`;
}

export function parseBenchEvidenceJson(text, { expectedUid = null } = {}) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty Aerial Kit JSON evidence file.");
  }
  if (utf8ByteLength(text) > MAX_EVIDENCE_BYTES) {
    throw new Error("The evidence file is larger than the 1 MB review limit.");
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The selected JSON is not an Aerial Kit bench report.");
  }

  const nestedBench = payload.bench && typeof payload.bench === "object"
    ? payload.bench
    : null;
  const tx = nestedBench?.tx || (payload.tx && typeof payload.tx === "object" ? payload.tx : null);
  const rx = nestedBench?.rx || (payload.rx && typeof payload.rx === "object" ? payload.rx : null);
  const requirements = (
    nestedBench?.requirements
    || (payload.requirements && typeof payload.requirements === "object"
      ? payload.requirements
      : {})
  );
  const isPair = Boolean(nestedBench && (
    Object.hasOwn(payload, "tx_uid")
    || Object.hasOwn(payload, "rx_uid")
  ));
  const isBench = Boolean(requirements.rf_link && tx && rx);
  const isObservation = payload.schema === "rotorbench.crsf-observation.v1";
  const isCapture = finiteNumber(payload.rc_frames) !== null
    || finiteNumber(payload.link_statistics_frames) !== null;

  if (!isPair && !isBench && !isCapture && !isObservation) {
    throw new Error(
      "This is not a recognized pair, bench, capture, or CRSF observation report.",
    );
  }

  const kind = isPair
    ? "pair"
    : isBench
      ? "bench"
      : isObservation ? "observation" : "capture";
  const txUid = formatUid(payload.tx_uid);
  const rxUid = formatUid(payload.rx_uid);
  const planUid = formatUid(expectedUid);
  const uidsPresent = Boolean(txUid && rxUid);
  const importedUidsMatch = uidsPresent
    ? txUid === rxUid && normalizedUid(txUid) !== "000000000000"
    : null;
  const currentPlanMatches = uidsPresent && planUid
    ? txUid === planUid && rxUid === planUid
    : null;
  const observationRole = isObservation ? payload.plan?.role : null;

  const uidCheck = kind === "pair"
    ? makeCheck(
        "uid-match",
        "Imported endpoint UIDs",
        importedUidsMatch ? "pass" : "fail",
        importedUidsMatch
          ? `TX and RX both read back ${txUid}.`
          : "The pair report does not show matching non-zero TX/RX UIDs.",
      )
    : makeCheck(
        "uid-match",
        "Imported endpoint UIDs",
        "unverified",
        "This report does not include both endpoint UID readbacks.",
      );

  const planUidCheck = makeCheck(
    "plan-uid",
    "Current plan identity",
    currentPlanMatches === null
      ? "unverified"
      : currentPlanMatches ? "pass" : "fail",
    currentPlanMatches === null
      ? planUid
        ? "The imported report does not contain both endpoint UIDs."
        : "Stage a binding phrase or UID in the current plan to compare identities."
      : currentPlanMatches
        ? `The imported endpoints match the staged plan UID ${planUid}.`
        : `The imported endpoints do not match the staged plan UID ${planUid}.`,
  );

  const rxRcStatus = kind === "observation"
    ? observationRole === "rx"
      ? payload.channelsObserved ? PASS : FAIL
      : UNVERIFIED
    : kind === "capture"
      ? finiteNumber(rx?.rc_frames, finiteNumber(payload.rc_frames, 0)) > 0 ? PASS : FAIL
      : requirements.rx_rc_capture;
  const txLinkStatus = kind === "observation"
    ? observationRole === "tx"
      ? payload.linkStatisticsObserved ? PASS : NOT_TESTED
      : UNVERIFIED
    : kind === "capture"
      ? UNVERIFIED
    : requirements.tx_link_statistics;
  const rxLinkStatus = kind === "observation"
    ? observationRole === "rx"
      ? payload.linkStatisticsObserved ? PASS : NOT_TESTED
      : UNVERIFIED
    : kind === "capture"
      ? finiteNumber(payload.link_statistics_frames, 0) > 0 ? PASS : NOT_TESTED
      : requirements.rx_link_statistics;

  const rxRcCheck = makeCheck(
    "receiver-rc",
    "Receiver RC frames",
    statusFromRequirement(rxRcStatus),
    kind === "observation" && observationRole !== "rx"
      ? "This observation was not opened on the RX endpoint, so it cannot supply receiver RC frames."
      : requirementDetail(normalizeRequirement(rxRcStatus), "The imported evidence"),
  );
  const txLinkCheck = makeCheck(
    "tx-link-statistics",
    "TX link statistics",
    statusFromRequirement(txLinkStatus),
    kind === "observation" && observationRole !== "tx"
      ? "This observation was not opened on the TX endpoint, so it cannot supply TX link statistics."
      : requirementDetail(normalizeRequirement(txLinkStatus), "The imported evidence"),
  );
  const rxLinkCheck = makeCheck(
    "rx-link-statistics",
    "RX link statistics",
    statusFromRequirement(rxLinkStatus),
    kind === "observation" && observationRole !== "rx"
      ? "This observation was not opened on the RX endpoint, so it cannot supply RX link statistics."
      : requirementDetail(normalizeRequirement(rxLinkStatus), "The imported evidence"),
  );
  const disarmedCheck = makeCheck(
    "drive-disarmed",
    "Drive exit disarmed",
    tx?.disarmed_at_end === true
      ? "pass"
      : tx?.disarmed_at_end === false ? "fail" : "unverified",
    tx?.disarmed_at_end === true
      ? "The TX report says the bounded drive disarmed at exit."
      : tx?.disarmed_at_end === false
        ? "The TX report says the bounded drive did not report disarmed at exit."
        : "The imported report does not include the TX disarm-at-exit result.",
  );

  const diagnostics = payload.diagnostics && typeof payload.diagnostics === "object"
    ? payload.diagnostics
    : {};
  const crcErrors = finiteNumber(
    diagnostics.crcErrors,
    finiteNumber(rx?.crc_errors, finiteNumber(payload.crc_errors, null)),
  );
  const resyncs = finiteNumber(
    diagnostics.resyncs,
    finiteNumber(rx?.resyncs, finiteNumber(payload.resyncs, null)),
  );
  const framingErrors = finiteNumber(
    diagnostics.framingErrors,
    finiteNumber(rx?.framing_errors, finiteNumber(payload.framing_errors, null)),
  );
  const missedIntervals = finiteNumber(
    rx?.missed_intervals,
    finiteNumber(payload.missed_intervals, null),
  );
  const integrityValues = [crcErrors, resyncs, framingErrors, missedIntervals];
  const integrityKnown = integrityValues.some((value) => value !== null);
  const integrityClean = integrityKnown
    ? integrityValues.every((value) => value === null || value === 0)
    : null;
  const integrityCheck = makeCheck(
    "parser-integrity",
    "Parser and interval integrity",
    integrityClean === null ? "unverified" : integrityClean ? "pass" : "fail",
    integrityClean === null
      ? "The report does not include parser or missed-interval counters."
      : integrityClean
        ? "CRC, resync, framing, and missed-interval counters are clean."
        : `Observed ${[
            crcErrors ? `${crcErrors} CRC` : null,
            resyncs ? `${resyncs} resync` : null,
            framingErrors ? `${framingErrors} framing` : null,
            missedIntervals ? `${missedIntervals} missed interval` : null,
          ].filter(Boolean).join(", ")} errors or gaps.`,
  );

  const rcCadenceHz = finiteNumber(
    rx?.rc_cadence_hz,
    finiteNumber(
      payload.rc_cadence_hz,
      finiteNumber(payload.rcCadenceMs, null) > 0
        ? 1000 / finiteNumber(payload.rcCadenceMs)
        : null,
    ),
  );
  const cadenceCheck = makeCheck(
    "rc-cadence",
    "RC cadence measured",
    rcCadenceHz === null ? "unverified" : rcCadenceHz > 0 ? "pass" : "fail",
    rcCadenceHz === null
      ? "The report does not contain enough RC timing data."
      : `${rcCadenceHz.toFixed(1)} Hz was measured from the imported capture.`,
  );

  const lastFrameAgeMs = finiteNumber(payload.lastFrameAgeMs, null);
  const freshnessCheck = makeCheck(
    "frame-freshness",
    "Last-frame freshness",
    lastFrameAgeMs === null
      ? "unverified"
      : lastFrameAgeMs <= 2000 ? "pass" : "fail",
    lastFrameAgeMs === null
      ? "The report does not include a last-frame age."
      : `${(lastFrameAgeMs / 1000).toFixed(1)} seconds since the last valid frame at export.`,
  );

  const link = payload.link && typeof payload.link === "object"
    ? payload.link
    : null;
  const uplinkLq = finiteNumber(link?.uplinkLinkQuality, null);
  const downlinkLq = finiteNumber(link?.downlinkLinkQuality, null);
  const linkQualityCheck = makeCheck(
    "link-quality",
    "Observed link quality",
    uplinkLq === null || downlinkLq === null
      ? "unverified"
      : uplinkLq > 0 && downlinkLq > 0 ? "pass" : "fail",
    uplinkLq === null || downlinkLq === null
      ? "The report does not include both uplink and downlink LQ values."
      : `Uplink LQ ${uplinkLq}% and downlink LQ ${downlinkLq}%.`,
  );
  const channelRanges = Array.isArray(payload.channelRanges)
    ? payload.channelRanges
        .slice(0, 16)
        .map((range) => {
          const channel = finiteNumber(range?.channel, null);
          const samples = finiteNumber(range?.samples, null);
          const min = finiteNumber(range?.min, null);
          const max = finiteNumber(range?.max, null);
          const status = String(range?.calibrationStatus || "");
          if (
            !Number.isInteger(channel)
            || channel < 1
            || channel > 16
            || samples === null
            || samples < 1
            || min === null
            || max === null
            || min > max
            || !["sampled", "narrow", "partial", "full", "outside"].includes(status)
          ) {
            return null;
          }
          return { channel, samples, min, max, span: max - min, calibrationStatus: status };
        })
        .filter(Boolean)
    : [];
  const receiverCalibrationValues = payload.receiverCalibration;
  const receiverCalibrationMin = finiteNumber(receiverCalibrationValues?.min, null);
  const receiverCalibrationMid = finiteNumber(receiverCalibrationValues?.mid, null);
  const receiverCalibrationMax = finiteNumber(receiverCalibrationValues?.max, null);
  const receiverCalibrationDeadband = finiteNumber(
    receiverCalibrationValues?.deadband,
    null,
  );
  const receiverCalibration = (
    receiverCalibrationMin !== null
    && receiverCalibrationMid !== null
    && receiverCalibrationMax !== null
    && receiverCalibrationDeadband !== null
    && receiverCalibrationMin < receiverCalibrationMid
    && receiverCalibrationMid < receiverCalibrationMax
  ) ? {
      min: receiverCalibrationMin,
      mid: receiverCalibrationMid,
      max: receiverCalibrationMax,
      deadband: receiverCalibrationDeadband,
    } : null;

  const checks = [
    uidCheck,
    planUidCheck,
    rxRcCheck,
    txLinkCheck,
    rxLinkCheck,
    disarmedCheck,
    integrityCheck,
    cadenceCheck,
    freshnessCheck,
    linkQualityCheck,
  ];
  const qualityFailure = checks.some(
    (check) => [
      "parser-integrity",
      "rc-cadence",
      "frame-freshness",
      "link-quality",
    ].includes(check.id) && check.status === "fail",
  );
  const rfReportedPass = !["capture", "observation"].includes(kind)
    && normalizeRequirement(requirements.rf_link) === PASS;
  const rfEvidenceComplete = kind === "pair"
    && !qualityFailure
    && uidCheck.status === "pass"
    && planUidCheck.status !== "fail"
    && rxRcCheck.status === "pass"
    && txLinkCheck.status === "pass"
    && rxLinkCheck.status === "pass"
    && rfReportedPass;

  return {
    schema: "rotorbench.bench-evidence-review.v1",
    kind,
    fileOverall: String(
      payload.overall
      || nestedBench?.overall
      || payload.status
      || UNVERIFIED,
    ),
    importTrust: "locally selected file; authenticity not independently verified",
    hardwareVerifiedByRotorBench: false,
    rfReportedPass,
    rfEvidenceComplete,
    txUid,
    rxUid,
    planUid,
    uidsPresent,
    importedUidsMatch,
    currentPlanMatches,
    integrityClean,
    requirements: Object.fromEntries(
      Object.entries(requirements).map(([key, value]) => [
        key,
        normalizeRequirement(value),
      ]),
    ),
    checks,
    telemetry: tx?.telemetry && typeof tx.telemetry === "object"
      ? Object.keys(tx.telemetry)
      : Object.keys(payload.telemetry || {}),
    metrics: {
      durationSec: finiteNumber(
        rx?.duration_sec,
        finiteNumber(rx?.durationSec, finiteNumber(payload.duration_sec)),
      ),
      txFramesSent: finiteNumber(tx?.frames_sent, null),
      txActualHz: finiteNumber(tx?.actual_hz, null),
      rxFrames: finiteNumber(rx?.frames, finiteNumber(payload.frames, null)),
      rcFrames: finiteNumber(rx?.rc_frames, finiteNumber(payload.rc_frames, null)),
      rcCadenceHz,
      linkStatisticsFrames: finiteNumber(
        rx?.link_statistics_frames,
        finiteNumber(payload.link_statistics_frames, null),
      ),
      missedIntervals,
      crcErrors,
      resyncs,
      framingErrors,
      bytesReceived: finiteNumber(
        diagnostics.bytesReceived,
        finiteNumber(payload.capturedBytes, null),
      ),
      validFrames: finiteNumber(
        diagnostics.validFrames,
        finiteNumber(payload.frames, null),
      ),
      pendingBytes: finiteNumber(diagnostics.pendingBytes, null),
      lastFrameAgeMs,
      channels: Array.isArray(rx?.channels)
        ? rx.channels.length
        : Array.isArray(payload.channels) ? payload.channels.length : null,
      sampledChannels: channelRanges.length,
      fullCalibrationChannels: channelRanges.filter(
        (range) => range.calibrationStatus === "full",
      ).length,
      outsideCalibrationChannels: channelRanges.filter(
        (range) => range.calibrationStatus === "outside",
      ).length,
    },
    channelRanges,
    receiverCalibration,
    planContext: payload.plan && typeof payload.plan === "object"
      ? {
          role: payload.plan.role || null,
          targetName: payload.plan.targetName || null,
        }
      : null,
    observation: isObservation
      ? {
          role: observationRole,
          targetName: payload.plan?.targetName || null,
          baudRate: finiteNumber(payload.baudRate, null),
          expectedBaud: finiteNumber(payload.expectedBaud, null),
          captureStartedAt: payload.captureStartedAt || null,
          captureEndedAt: payload.captureEndedAt || null,
          generatedAt: payload.generatedAt || null,
          captureSessionId: payload.captureSessionId || null,
        }
      : null,
    reportedBaud: finiteNumber(
      payload.baudRate,
      finiteNumber(nestedBench?.tx_status?.logical_baud, null),
    ),
  };
}

function parseEvidencePayload(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty JSON evidence file.");
  }
  if (utf8ByteLength(text) > MAX_EVIDENCE_BYTES) {
    throw new Error("The evidence file is larger than the 1 MB review limit.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
}

export function parseRadioDiagJson(text) {
  const payload = parseEvidencePayload(text);
  const fields = payload?.fields;
  if (!fields || typeof fields !== "object" || !fields.role) {
    throw new Error("The selected JSON is not an Aerial Kit boot diagnostic.");
  }
  const role = String(fields.role).toLowerCase();
  if (!["tx", "rx"].includes(role)) {
    throw new Error("The boot diagnostic does not report a TX or RX role.");
  }
  const uid = formatUid(fields.uid);
  if (!uid || normalizedUid(uid) === "000000000000") {
    throw new Error("The boot diagnostic does not contain a valid six-byte UID.");
  }
  const logicalBaud = finiteNumber(payload.logical_baud, null);
  if (logicalBaud === null || logicalBaud <= 0) {
    throw new Error("The boot diagnostic does not contain a logical baud rate.");
  }
  return {
    kind: "diag",
    role,
    uid,
    logicalBaud,
    seed: fields.seed || null,
    crc: fields.crc || null,
    rateEnum: finiteNumber(fields.rate_enum, null),
    fhss0: finiteNumber(fields.fhss0, null),
    frequency: finiteNumber(fields.freq, null),
    domain: fields.domain || null,
    connection: fields.conn || null,
    txEnable: fields.txen || null,
    rxEnable: fields.rxen || null,
    firmware: fields.elf || null,
  };
}

function optionLabel(name, rawValue) {
  const index = Number(rawValue);
  const options = RADIO_PARAMETER_OPTIONS[name];
  return options && Number.isInteger(index) && options[index] != null
    ? options[index]
    : null;
}

export function parseRadioParameterText(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty radio parameter snapshot.");
  }
  if (utf8ByteLength(text) > MAX_EVIDENCE_BYTES) {
    throw new Error("The parameter snapshot is larger than the 1 MB review limit.");
  }
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+(.+?)\s{2,}(\S*)\s+(\S+)\s*$/);
    if (!match) continue;
    entries.push({
      id: Number(match[1]),
      name: match[2].trim(),
      value: match[3],
      type: match[4],
    });
  }
  if (entries.length === 0) {
    throw new Error("The selected text is not an ak radio params snapshot.");
  }
  const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry]));
  const knownNames = [
    "Packet Rate",
    "Telem Ratio",
    "Switch Mode",
    "Link Mode",
    "Max Power",
    "Dynamic",
    "Model Match",
  ];
  if (!knownNames.some((name) => byName[name])) {
    throw new Error("The parameter snapshot contains no recognized ExpressLRS settings.");
  }
  const role = byName["Packet Rate"]
    ? "tx"
    : byName["Bind Storage"] ? "rx" : null;
  const setting = (name) => {
    const entry = byName[name];
    if (!entry) return null;
    return {
      name,
      index: finiteNumber(entry.value, null),
      label: optionLabel(name, entry.value),
      type: entry.type,
    };
  };
  return {
    kind: "params",
    role,
    entries,
    settings: {
      packetRate: setting("Packet Rate"),
      telemetryRatio: setting("Telem Ratio"),
      switchMode: setting("Switch Mode"),
      linkMode: setting("Link Mode"),
      maxPower: setting("Max Power"),
      dynamicPower: setting("Dynamic"),
      modelMatch: setting("Model Match"),
    },
  };
}

const EXPECTED_PACKET_RATE_LABELS = {
  "50": "50Hz",
  "100-full": "100Hz",
  "150": "150Hz",
  "250": "250Hz",
  "333-full": "333Hz Full",
  "500": "500Hz",
};

const EXPECTED_TELEMETRY_LABELS = {
  std: "Std",
  off: "Off",
  "1:128": "1:128",
  "1:64": "1:64",
  "1:32": "1:32",
  "1:16": "1:16",
  "1:8": "1:8",
  "1:4": "1:4",
  "1:2": "1:2",
  race: "Race",
};

const EXPECTED_SWITCH_LABELS = {
  wide: "Wide",
  hybrid: "Hybrid",
};

const EXPECTED_DYNAMIC_LABELS = {
  off: "Off",
  dynamic: "Dyn",
  aux9: "AUX9",
  aux10: "AUX10",
};

function settingCheck(id, label, actual, expected) {
  if (expected == null) {
    return makeCheck(
      id,
      label,
      "unverified",
      "The current plan does not define a comparable value.",
    );
  }
  if (!actual?.label) {
    return makeCheck(
      id,
      label,
      "unverified",
      "The parameter snapshot does not contain a recognized value.",
    );
  }
  const matches = String(actual.label).toLowerCase() === String(expected).toLowerCase();
  return makeCheck(
    id,
    label,
    matches ? "pass" : "fail",
    matches
      ? `Module reports ${actual.label}, matching the current plan.`
      : `Module reports ${actual.label}; the current plan expects ${expected}.`,
  );
}

function expectedRadioSettingChecks(snapshot, expectedSettings) {
  if (!snapshot || snapshot.role !== "tx" || !expectedSettings) return [];
  const power = RADIO_POWER_LEVELS.find(
    (level) => level.value === Number(expectedSettings.powerDbm),
  );
  const checks = [
    settingCheck(
      "settings-packet-rate",
      "Module packet rate",
      snapshot.settings.packetRate,
      EXPECTED_PACKET_RATE_LABELS[expectedSettings.packetRateMode] || null,
    ),
    settingCheck(
      "settings-power",
      "Module max power",
      snapshot.settings.maxPower,
      power ? String(power.menuMw) : null,
    ),
    settingCheck(
      "settings-telemetry",
      "Module telemetry ratio",
      snapshot.settings.telemetryRatio,
      EXPECTED_TELEMETRY_LABELS[expectedSettings.telemetryRatio] || null,
    ),
    settingCheck(
      "settings-switch-mode",
      "Module switch mode",
      snapshot.settings.switchMode,
      EXPECTED_SWITCH_LABELS[expectedSettings.switchMode] || null,
    ),
    settingCheck(
      "settings-link-mode",
      "Module link mode",
      snapshot.settings.linkMode,
      {
        normal: "Normal",
        mavlink: "MAVLink",
      }[expectedSettings.linkMode] || null,
    ),
    settingCheck(
      "settings-dynamic-power",
      "Module dynamic power",
      snapshot.settings.dynamicPower,
      EXPECTED_DYNAMIC_LABELS[expectedSettings.dynamicPower] || null,
    ),
    settingCheck(
      "settings-model-match",
      "Module model match",
      snapshot.settings.modelMatch,
      expectedSettings.modelMatch ? "On" : "Off",
    ),
  ];
  return checks;
}

function diagCheck(diag, report, expectedBaud, expectedUid) {
  if (!diag) {
    return makeCheck(
      "missing-diag",
      "Boot diagnostics",
      "unverified",
      "Import both TX and RX boot diagnostics to correlate endpoint identity.",
    );
  }
  const expectedRole = diag.role;
  const reportUid = expectedRole === "tx" ? report?.txUid : report?.rxUid;
  const uidTarget = reportUid || formatUid(expectedUid);
  const uidMatches = uidTarget ? reportUid ? reportUid === diag.uid : uidTarget === diag.uid : null;
  const baudMatches = expectedBaud == null
    ? null
    : Number(expectedBaud) === diag.logicalBaud;
  const failures = [
    uidMatches === false ? "UID differs from the report or staged plan" : null,
    baudMatches === false ? `baud is ${diag.logicalBaud}, expected ${expectedBaud}` : null,
  ].filter(Boolean);
  return makeCheck(
    `${expectedRole}-boot-diag`,
    `${expectedRole.toUpperCase()} boot diagnostics`,
    failures.length ? "fail" : uidMatches === null || baudMatches === null
      ? "unverified"
      : "pass",
    failures.length
      ? `${failures.join("; ")}.`
      : `${expectedRole.toUpperCase()} reports UID ${diag.uid}, ${diag.logicalBaud} baud, domain ${diag.domain || "unknown"}, rate enum ${diag.rateEnum ?? "unknown"}.`,
  );
}

function observationWindow(observation) {
  const start = parsedTimestamp(observation?.captureStartedAt);
  const end = parsedTimestamp(observation?.captureEndedAt)
    ?? parsedTimestamp(observation?.generatedAt);
  return start !== null && end !== null && end > start
    ? { start, end }
    : null;
}

function mergeObservationReports(
  txReport,
  rxReport,
  { expectedTargetName = null, expectedBauds = null } = {},
) {
  const txWindow = observationWindow(txReport.observation);
  const rxWindow = observationWindow(rxReport.observation);
  const overlapMs = txWindow && rxWindow
    ? Math.min(txWindow.end, rxWindow.end) - Math.max(txWindow.start, rxWindow.start)
    : null;
  const txTarget = txReport.observation?.targetName?.trim() || null;
  const rxTarget = rxReport.observation?.targetName?.trim() || null;
  const txSessionId = txReport.observation?.captureSessionId || null;
  const rxSessionId = rxReport.observation?.captureSessionId || null;
  const targetMatch = txTarget && rxTarget
    ? txTarget.toLowerCase() === rxTarget.toLowerCase()
    : null;
  const expectedTarget = expectedTargetName?.trim() || null;
  const planTargetMatch = expectedTarget && txTarget && rxTarget
    ? txTarget.toLowerCase() === expectedTarget.toLowerCase()
      && rxTarget.toLowerCase() === expectedTarget.toLowerCase()
    : null;
  const roleChecks = (report, role) => report.checks.map((check) => ({
    ...check,
    id: `${role}-${check.id}`,
    label: `${role.toUpperCase()} · ${check.label}`,
  }));
  const txRoleChecks = roleChecks(txReport, "tx");
  const rxRoleChecks = roleChecks(rxReport, "rx");
  const roleCheck = (checks, id) => checks.find(
    (check) => check.id === `${
      checks === txRoleChecks ? "tx" : "rx"
    }-${id}`,
  )?.status;
  const targetCheck = makeCheck(
    "observation-target",
    "Observation target correlation",
    targetMatch === null ? "unverified" : targetMatch ? "pass" : "fail",
    targetMatch === null
      ? "Both observation files must identify their radio target."
      : targetMatch
        ? `Both observations target ${txTarget}.`
        : `TX targets ${txTarget}; RX targets ${rxTarget}.`,
  );
  const overlapCheck = makeCheck(
    "observation-overlap",
    "Observation time-window overlap",
    overlapMs === null ? "unverified" : overlapMs > 0 ? "pass" : "fail",
    overlapMs === null
      ? "Both observation files need a start and end/export time."
      : overlapMs > 0
        ? `Capture windows overlap for ${(overlapMs / 1000).toFixed(1)} s.`
        : "The TX and RX capture windows do not overlap.",
  );
  const planTargetCheck = makeCheck(
    "observation-plan-target",
    "Current plan target correlation",
    planTargetMatch === null ? "unverified" : planTargetMatch ? "pass" : "fail",
    planTargetMatch === null
      ? "The current plan target is unavailable or the files omit target names."
      : planTargetMatch
        ? `Both observations match the current target ${expectedTarget}.`
        : `The observations do not both match the current target ${expectedTarget}.`,
  );
  const directionCheck = makeCheck(
    "observation-directions",
    "Endpoint direction correlation",
    "pass",
    "One TX-host observation and one RX-FC observation were supplied.",
  );
  const sessionMatch = txSessionId && rxSessionId
    ? txSessionId === rxSessionId
    : null;
  const sessionCheck = makeCheck(
    "observation-session",
    "Capture session correlation",
    sessionMatch === null ? "unverified" : sessionMatch ? "pass" : "fail",
    sessionMatch === null
      ? "One or both observations do not include a capture-session identifier."
      : sessionMatch
        ? "Both observations came from the same dual-capture session."
        : "The observations belong to different dual-capture sessions.",
  );
  const observationBaudCheck = (role, report, planBaud) => {
    const observedBaud = report.observation?.baudRate;
    const fileExpectedBaud = report.observation?.expectedBaud;
    const expectedBaud = finiteNumber(planBaud, fileExpectedBaud);
    const mismatch = observedBaud != null
      && expectedBaud != null
      && observedBaud !== expectedBaud;
    return makeCheck(
      `observation-${role}-baud`,
      `${role.toUpperCase()} observation baud`,
      observedBaud == null || expectedBaud == null
        ? "unverified"
        : mismatch ? "fail" : "pass",
      observedBaud == null || expectedBaud == null
        ? `The ${role.toUpperCase()} observation needs observed and expected baud values.`
        : mismatch
          ? `${role.toUpperCase()} observed ${observedBaud} baud; expected ${expectedBaud}.`
          : `${role.toUpperCase()} observed ${observedBaud} baud as expected.`,
    );
  };
  const txBaudCheck = observationBaudCheck("tx", txReport, expectedBauds?.tx);
  const rxBaudCheck = observationBaudCheck("rx", rxReport, expectedBauds?.rx);
  const sharedQualityPass = [
    "parser-integrity",
    "frame-freshness",
    "link-quality",
  ].every(
    (id) => roleCheck(txRoleChecks, id) === "pass"
      && roleCheck(rxRoleChecks, id) === "pass",
  );
  const qualityPass = sharedQualityPass
    && roleCheck(rxRoleChecks, "rc-cadence") === "pass";
  const directionalEvidencePass = roleCheck(txRoleChecks, "tx-link-statistics") === "pass"
    && roleCheck(rxRoleChecks, "receiver-rc") === "pass"
    && roleCheck(rxRoleChecks, "rx-link-statistics") === "pass";
  const observationCorrelationComplete = Boolean(
    targetMatch
    && (!expectedTarget || planTargetMatch)
    && overlapMs > 0
    && sessionMatch !== false
    && directionalEvidencePass
    && txBaudCheck.status === "pass"
    && rxBaudCheck.status === "pass"
    && qualityPass,
  );
  const observationSummary = (report, window) => ({
    targetName: report.observation?.targetName || null,
    baudRate: report.observation?.baudRate ?? null,
    expectedBaud: report.observation?.expectedBaud ?? null,
    captureStartedAt: report.observation?.captureStartedAt || null,
    captureEndedAt: report.observation?.captureEndedAt || null,
    generatedAt: report.observation?.generatedAt || null,
    captureSessionId: report.observation?.captureSessionId || null,
    durationMs: window ? window.end - window.start : null,
    validFrames: report.metrics.validFrames,
    lastFrameAgeMs: report.metrics.lastFrameAgeMs,
    crcErrors: report.metrics.crcErrors,
    channels: report.metrics.channels,
  });
  const checks = [
    ...txRoleChecks,
    ...rxRoleChecks,
    directionCheck,
    sessionCheck,
    targetCheck,
    planTargetCheck,
    txBaudCheck,
    rxBaudCheck,
    overlapCheck,
  ];
  return {
    schema: "rotorbench.bench-evidence-review.v1",
    kind: "observation-pair",
    fileOverall: observationCorrelationComplete
      ? "Two-endpoint observations correlated"
      : "Observation correlation incomplete",
    importTrust: "locally selected files; authenticity not independently verified",
    hardwareVerifiedByRotorBench: false,
    rfReportedPass: false,
    rfEvidenceComplete: false,
    observationCorrelationComplete,
    integrityClean: qualityPass ? true : null,
    checks,
    telemetry: [...new Set([...txReport.telemetry, ...rxReport.telemetry])],
    metrics: {
      durationSec: overlapMs > 0 ? overlapMs / 1000 : null,
      txFramesSent: txReport.metrics.txFramesSent,
      rxFrames: rxReport.metrics.rxFrames,
      rcFrames: rxReport.metrics.rcFrames,
      rcCadenceHz: rxReport.metrics.rcCadenceHz,
      linkStatisticsFrames: rxReport.metrics.linkStatisticsFrames,
      bytesReceived:
        (txReport.metrics.bytesReceived || 0)
        + (rxReport.metrics.bytesReceived || 0),
      validFrames:
        (txReport.metrics.validFrames || 0)
        + (rxReport.metrics.validFrames || 0),
      lastFrameAgeMs: Math.max(
        txReport.metrics.lastFrameAgeMs || 0,
        rxReport.metrics.lastFrameAgeMs || 0,
      ) || null,
      channels: rxReport.metrics.channels ?? txReport.metrics.channels,
      sampledChannels: rxReport.metrics.sampledChannels,
      fullCalibrationChannels: rxReport.metrics.fullCalibrationChannels,
      outsideCalibrationChannels: rxReport.metrics.outsideCalibrationChannels,
    },
    channelRanges: rxReport.channelRanges.length
      ? rxReport.channelRanges
      : txReport.channelRanges,
    receiverCalibration: rxReport.receiverCalibration || txReport.receiverCalibration,
    planContext: {
      role: "TX + RX",
      targetName: targetMatch ? txTarget : null,
    },
    observationPair: {
      targetMatch,
      overlapMs,
      captureSessionId: sessionMatch ? txSessionId : null,
      tx: observationSummary(txReport, txWindow),
      rx: observationSummary(rxReport, rxWindow),
    },
    requirements: {
      tx: txReport.requirements,
      rx: rxReport.requirements,
    },
    reportedBaud: null,
    txUid: null,
    rxUid: null,
    planUid: null,
    uidsPresent: false,
    importedUidsMatch: null,
    currentPlanMatches: null,
  };
}

export function parseBenchEvidenceBundle(
  documents,
  {
    expectedUid = null,
    expectedBauds = null,
    targetName = null,
    expectedSettings = null,
    expectedFc = null,
    expectedRadio = null,
  } = {},
) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("Choose one or more evidence files.");
  }
  if (documents.length > 6) {
    throw new Error("Select at most six evidence files per review.");
  }

  let singleReport = null;
  let fcIdentity = null;
  let fcStatus = null;
  let fcRc = null;
  let fcPreflight = null;
  let fcParameters = null;
  const radioStatusesByRole = {};
  const observationsByRole = {};
  const diagnosticsByRole = {};
  const parameterSnapshotsByRole = {};
  for (const document of documents) {
    try {
      let payload = null;
      try {
        payload = parseEvidencePayload(document.text);
      } catch (jsonError) {
        let snapshot;
        try {
          snapshot = parseRadioParameterText(document.text);
        } catch {
          throw jsonError;
        }
        if (!snapshot.role) {
          throw new Error("The parameter snapshot does not identify a TX or RX endpoint.");
        }
        if (parameterSnapshotsByRole[snapshot.role]) {
          throw new Error(`More than one ${snapshot.role.toUpperCase()} parameter snapshot was selected.`);
        }
        parameterSnapshotsByRole[snapshot.role] = snapshot;
        continue;
      }
      if (payload?.fields?.role) {
        const diag = parseRadioDiagJson(document.text);
        if (diagnosticsByRole[diag.role]) {
          throw new Error(`More than one ${diag.role.toUpperCase()} boot diagnostic was selected.`);
        }
        diagnosticsByRole[diag.role] = diag;
      } else if (
        payload?.protocol === "akp"
        && Object.hasOwn(payload, "features")
        && Object.hasOwn(payload, "parameter_count")
      ) {
        if (fcIdentity) {
          throw new Error("More than one Aerial Kit identity report was selected.");
        }
        fcIdentity = parseFcIdentityJson(payload);
      } else if (payload?.identity && payload?.state) {
        if (fcStatus) {
          throw new Error("More than one ak fc status snapshot was selected.");
        }
        fcStatus = parseFcStatusJson(payload);
      } else if (
        ["akp", "betaflight"].includes(payload?.protocol)
        && Array.isArray(payload?.channels)
        && Object.hasOwn(payload, "observed_at")
      ) {
        if (fcRc) {
          throw new Error("More than one ak fc rc observation was selected.");
        }
        fcRc = parseFcRcJson(payload);
      } else if (
        ["akp", "betaflight"].includes(payload?.protocol)
        && (
          Array.isArray(payload?.lines)
          || Object.hasOwn(payload, "arming_disable_flags")
        )
      ) {
        if (fcPreflight) {
          throw new Error("More than one ak fc preflight report was selected.");
        }
        fcPreflight = parseFcPreflightJson(payload);
      } else if (
        payload?.role
        && payload?.product
        && payload?.firmware_string
        && payload?.logical_baud
      ) {
        const report = parseRadioStatusJson(payload);
        if (radioStatusesByRole[report.role]) {
          throw new Error(`More than one ${report.role.toUpperCase()} radio status report was selected.`);
        }
        radioStatusesByRole[report.role] = report;
      } else {
        const parsed = parseBenchEvidenceJson(document.text, { expectedUid });
        if (parsed.kind === "observation") {
          const role = parsed.planContext?.role;
          if (!["tx", "rx"].includes(role)) {
            throw new Error("A native CRSF observation must identify a TX or RX role.");
          }
          if (singleReport) {
            throw new Error("Select either one bench report or TX plus RX native observations.");
          }
          if (observationsByRole[role]) {
            throw new Error(`More than one ${role.toUpperCase()} native observation was selected.`);
          }
          observationsByRole[role] = parsed;
        } else {
          if (singleReport || Object.keys(observationsByRole).length) {
            throw new Error("Select either one bench report or TX plus RX native observations.");
          }
          singleReport = parsed;
        }
      }
    } catch (error) {
      try {
        fcParameters = parseFcParameterSnapshotText(document.text);
      } catch {
        try {
          if (fcPreflight) {
            throw new Error("More than one ak fc preflight report was selected.");
          }
          fcPreflight = parseFcPreflightText(document.text);
        } catch (preflightError) {
          if (fcPreflight || /verdict=/i.test(document.text || "")) {
            throw new Error(`${document.name || "Evidence file"}: ${preflightError.message}`);
          }
          throw new Error(`${document.name || "Evidence file"}: ${error.message}`);
        }
      }
    }
  }

  const observationCount = Object.keys(observationsByRole).length;
  const report = observationsByRole.tx && observationsByRole.rx
    ? mergeObservationReports(
        observationsByRole.tx,
        observationsByRole.rx,
        { expectedTargetName: targetName, expectedBauds },
      )
    : singleReport || observationsByRole.tx || observationsByRole.rx || null;
  const txDiag = diagnosticsByRole.tx || null;
  const rxDiag = diagnosticsByRole.rx || null;
  const txParameters = parameterSnapshotsByRole.tx || null;
  const diagnosticsPresent = Boolean(txDiag || rxDiag);
  const checks = report ? [...report.checks] : [];
  if (diagnosticsPresent) {
    checks.push(
      diagCheck(txDiag, report, expectedBauds?.tx, expectedUid),
      diagCheck(rxDiag, report, expectedBauds?.rx, expectedUid),
    );
    if (txDiag && rxDiag) {
      const uidAgreement = txDiag.uid === rxDiag.uid;
      const domainAgreement = Boolean(
        txDiag.domain && rxDiag.domain && txDiag.domain === rxDiag.domain,
      );
      checks.push(makeCheck(
        "endpoint-agreement",
        "TX/RX boot identity correlation",
        uidAgreement && domainAgreement ? "pass" : "fail",
        uidAgreement && domainAgreement
          ? `Both diagnostics report UID ${txDiag.uid} in domain ${txDiag.domain}.`
          : [
              uidAgreement ? null : "endpoint UIDs differ",
              domainAgreement ? null : "regulatory domains differ or are missing",
            ].filter(Boolean).join("; ") + ".",
      ));
      const seedAgreement = Boolean(
        txDiag.seed && rxDiag.seed && txDiag.seed === rxDiag.seed,
      );
      checks.push(makeCheck(
        "rf-seed",
        "FHSS seed correlation",
        seedAgreement ? "pass" : "fail",
        seedAgreement
          ? `TX and RX report the same seed ${txDiag.seed}.`
          : "TX and RX seeds differ or are missing.",
      ));
      const fhssAgreement = Boolean(
        txDiag.fhss0 != null
        && rxDiag.fhss0 != null
        && txDiag.fhss0 === rxDiag.fhss0,
      );
      checks.push(makeCheck(
        "rf-fhss",
        "FHSS initial channel",
        fhssAgreement ? "pass" : "fail",
        fhssAgreement
          ? `Both endpoints start at FHSS channel ${txDiag.fhss0}.`
          : "FHSS initial channels differ or are missing.",
      ));
      const frequencyAgreement = (
        txDiag.frequency != null
        && rxDiag.frequency != null
        && txDiag.frequency === rxDiag.frequency
      );
      checks.push(makeCheck(
        "rf-frequency",
        "Boot frequency correlation",
        frequencyAgreement ? "pass" : "unverified",
        frequencyAgreement
          ? `Both endpoints report ${txDiag.frequency} Hz at boot.`
          : `TX ${txDiag.frequency ?? "unknown"} Hz and RX ${rxDiag.frequency ?? "unknown"} Hz differ or are incomplete; a searching RX may change state.`,
      ));
      const rateAgreement = (
        txDiag.rateEnum != null
        && rxDiag.rateEnum != null
        && txDiag.rateEnum === rxDiag.rateEnum
      );
      checks.push(makeCheck(
        "rf-rate-state",
        "Boot packet-rate state",
        rateAgreement ? "pass" : "unverified",
        rateAgreement
          ? `Both endpoints report packet-rate enum ${txDiag.rateEnum}.`
          : `TX rate enum ${txDiag.rateEnum ?? "unknown"} and RX ${rxDiag.rateEnum ?? "unknown"}; RX may be cycling while searching.`,
      ));
    }
  }
  const settingsChecks = expectedRadioSettingChecks(txParameters, expectedSettings);
  checks.push(...settingsChecks);
  const importedFcChecks = fcEvidenceChecks(fcStatus, fcPreflight, {
    firmwareFamily: expectedFc?.firmwareFamily || null,
    rc: fcRc,
  });
  checks.push(...importedFcChecks);
  const importedFcIdentityChecks = fcIdentityChecks(fcIdentity, {
    firmwareFamily: expectedFc?.firmwareFamily || null,
  });
  checks.push(...importedFcIdentityChecks);
  const importedFcRcChecks = importedFcChecks.filter(
    (check) => check.id.startsWith("fc-rc-"),
  );
  const rcEvidenceComplete = Boolean(
    fcRc
    && importedFcRcChecks.length > 0
    && importedFcRcChecks.every((check) => check.status === "pass"),
  );
  const importedFcParameterChecks = fcParameterChecks(
    fcParameters,
    expectedFc?.plan
      ? {
          ...expectedFc.plan,
          firmwareFamily:
            expectedFc.plan.firmwareFamily || expectedFc.firmwareFamily || null,
        }
      : null,
  );
  checks.push(...importedFcParameterChecks);
  const fcParameterCoverageComplete = Boolean(
    fcParameters
    && importedFcParameterChecks.length > 0
    && importedFcParameterChecks.every((check) => check.status === "pass"),
  );
  const radioStatusReports = Object.values(radioStatusesByRole);
  const importedRadioStatusChecks = radioStatusReports.flatMap((report) => (
    radioStatusChecks(report, {
      role: radioStatusReports.length > 1 ? report.role : expectedRadio?.role || null,
      expectedBaud: report.role === "tx"
        ? expectedRadio?.txBaud ?? expectedRadio?.baud ?? null
        : expectedRadio?.rxBaud ?? expectedRadio?.baud ?? null,
      targetName: expectedRadio?.targetName || targetName,
      firmwareVersion: expectedRadio?.firmwareVersion || null,
    })
  ));
  checks.push(...importedRadioStatusChecks);
  const fcEvidenceComplete = Boolean(
    fcStatus
    && fcPreflight
    && importedFcChecks.every((check) => check.status !== "fail")
    && importedFcChecks.find((check) => check.id === "fc-status-protocol")?.status
      === "pass"
    && importedFcChecks.find((check) => check.id === "fc-status-disarmed")?.status
      === "pass"
    && importedFcChecks.find((check) => check.id === "fc-status-link")?.status
      === "pass"
    && (
      fcPreflight?.protocol !== "betaflight"
      || !fcPreflight?.reportedVerdict
      || importedFcChecks.find(
        (check) => check.id === "fc-preflight-reported-verdict",
      )?.status === "pass"
    )
    && (!fcRc || rcEvidenceComplete)
    && importedFcParameterChecks.every((check) => check.status === "pass")
  );
  const fcEvidence = {
    identity: fcIdentity,
    status: fcStatus,
    rc: fcRc,
    preflight: fcPreflight,
    parameters: fcParameters,
    expectedFirmwareFamily: expectedFc?.firmwareFamily || null,
    evidenceComplete: fcEvidenceComplete,
    parameterCoverageComplete: fcParameterCoverageComplete,
    rcEvidenceComplete,
    hardwareVerifiedByRotorBench: false,
  };
  const radioDeviceEvidence = {
    reports: radioStatusReports,
    expectedRole: expectedRadio?.role || null,
    evidenceComplete: radioStatusReports.length > 0
      && importedRadioStatusChecks.every((check) => check.status !== "fail"),
    hardwareVerifiedByRotorBench: false,
  };
  const settingsComplete = txParameters
    ? settingsChecks.length > 0
      && settingsChecks.every((check) => check.status === "pass")
    : null;

  const diagChecks = checks.slice(
    report?.checks.length || 0,
    (report?.checks.length || 0) + (diagnosticsPresent ? 2 : 0)
      + (txDiag && rxDiag ? 4 : 0),
  );
  const bundleComplete = Boolean(
    txDiag
    && rxDiag
    && diagChecks.every((check) => (
      check.status === "pass"
      || (["rf-frequency", "rf-rate-state"].includes(check.id)
        && check.status === "unverified")
    )),
  );
  if (report) {
    return {
      ...report,
      checks,
      fcEvidence,
      radioDeviceEvidence,
      bundle: {
        reportCount: report.kind === "observation-pair" ? 2 : 1,
        observationCount,
        diagnosticCount: Number(Boolean(txDiag)) + Number(Boolean(rxDiag)),
        parameterCount: Object.keys(parameterSnapshotsByRole).length,
        fcEvidenceCount: Number(Boolean(fcStatus))
          + Number(Boolean(fcRc))
          + Number(Boolean(fcPreflight))
          + Number(Boolean(fcIdentity)),
        radioStatusCount: radioStatusReports.length,
        txDiag,
        rxDiag,
        txParameters,
        complete: bundleComplete,
        settingsComplete,
        targetName: targetName || report.planContext?.targetName || null,
      },
    };
  }

  return {
    schema: "rotorbench.bench-evidence-review.v1",
    kind: fcStatus || fcPreflight
      ? "fc-evidence"
      : fcIdentity
        ? "fc-identity"
        : fcRc
          ? "fc-rc"
          : fcParameters
            ? "fc-parameters"
            : radioStatusReports.length ? "radio-status-evidence" : "diagnostics",
    fileOverall: fcStatus || fcPreflight
      ? fcEvidenceComplete
        ? fcRc
          ? "FC status, RC, and preflight reviewed"
          : "FC status and preflight reviewed"
        : "FC evidence incomplete"
      : fcIdentity
        ? fcIdentity.features == null
          ? "FC identity reviewed; capability word absent"
          : "FC identity and capability word reviewed"
        : fcRc
          ? rcEvidenceComplete
            ? "FC RC observation reviewed"
            : "FC RC evidence incomplete"
          : fcParameters
            ? fcParameterCoverageComplete
              ? "FC parameter snapshot reviewed"
              : "FC parameter evidence incomplete"
            : radioStatusReports.length
              ? "Radio device identity reviewed"
              : "Diagnostics only",
    importTrust: "locally selected files; authenticity not independently verified",
    hardwareVerifiedByRotorBench: false,
    rfReportedPass: false,
    rfEvidenceComplete: false,
    fcEvidence,
    radioDeviceEvidence,
    integrityClean: null,
    checks,
    bundle: {
      reportCount: 0,
      observationCount,
      diagnosticCount: Number(Boolean(txDiag)) + Number(Boolean(rxDiag)),
      parameterCount: Number(Boolean(fcParameters))
        + Object.keys(parameterSnapshotsByRole).length,
      fcEvidenceCount: Number(Boolean(fcStatus))
        + Number(Boolean(fcRc))
        + Number(Boolean(fcPreflight))
        + Number(Boolean(fcIdentity)),
      radioStatusCount: radioStatusReports.length,
      txDiag,
      rxDiag,
      txParameters,
      complete: bundleComplete,
      settingsComplete,
      targetName,
    },
    txUid: txDiag?.uid || null,
    rxUid: rxDiag?.uid || null,
    planUid: formatUid(expectedUid),
    uidsPresent: Boolean(txDiag?.uid && rxDiag?.uid),
    importedUidsMatch: txDiag?.uid && rxDiag?.uid
      ? txDiag.uid === rxDiag.uid
      : null,
    currentPlanMatches: null,
    requirements: {},
    telemetry: [],
    metrics: {},
    planContext: targetName ? { role: null, targetName } : null,
    reportedBaud: null,
  };
}
