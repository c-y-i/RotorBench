const STATUS_PROTOCOLS = new Set(["akp", "betaflight"]);
const PREFLIGHT_VERDICTS = {
  0: { status: "fail", label: "Fail" },
  1: { status: "pass", label: "Pass" },
  2: { status: "fact", label: "Fact" },
};
const BETAFLIGHT_ARMING_DISABLE_FLAGS = [
  "No gyro",
  "Failsafe",
  "RX failsafe",
  "Not disarmed",
  "Box failsafe",
  "Runaway takeoff",
  "Crash detected",
  "Throttle",
  "Angle",
  "Boot grace time",
  "No prearm",
  "Load",
  "Calibrating",
  "CLI",
  "CMS menu",
  "BST",
  "MSP",
  "Paralyze",
  "GPS",
  "Rescue",
  "DShot telemetry",
  "Reboot required",
  "DShot bitbang",
  "Accelerometer calibration",
  "Motor protocol",
  "Crash flip",
  "Altitude hold",
  "Position hold",
  "Autopilot",
  "Arm switch",
];
const BETAFLIGHT_FAILSAFE_MASK = (1 << 1) | (1 << 2);
const RC_PROTOCOLS = new Set(["akp", "betaflight"]);
const RC_FRESHNESS_LIMIT_MS = 10 * 60 * 1000;

function finiteNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function identityField(identity, name) {
  const match = String(identity).match(
    new RegExp(`(?:^|\\s)${name}=([^\\s]+)`),
  );
  return match?.[1] || null;
}

function sanitizedIdentity(identity) {
  return String(identity)
    .replace(/(?:^|\s)(?:--port\s+)?\/dev\/\S+/g, "")
    .trim();
}

function betaflightArmingDisableFlags(value) {
  if (value == null || value === "") return { raw: null, labels: null };
  const text = String(value).trim();
  const parsed = /^0x[0-9a-f]+$/i.test(text)
    ? Number.parseInt(text.slice(2), 16)
    : /^\d+$/.test(text) ? Number.parseInt(text, 10) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return { raw: text, labels: null };
  }
  return {
    raw: text,
    labels: BETAFLIGHT_ARMING_DISABLE_FLAGS.filter((_, bit) => (
      (parsed & (1 << bit)) !== 0
    )),
  };
}

export function parseFcStatusJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || typeof payload.identity !== "string"
    || !payload.state
    || typeof payload.state !== "object"
  ) {
    throw new Error("The selected JSON is not an ak fc status snapshot.");
  }
  const protocol = identityField(payload.identity, "protocol");
  if (!STATUS_PROTOCOLS.has(protocol)) {
    throw new Error("The FC status snapshot does not identify akp or betaflight.");
  }
  const state = payload.state;
  const identity = sanitizedIdentity(payload.identity);
  return {
    kind: "fc-status",
    protocol,
    product: identityField(payload.identity, "product"),
    firmware: identityField(payload.identity, "firmware"),
    parameterCount: finiteNumber(
      identityField(payload.identity, "parameters"),
      null,
    ),
    changedParameters: identityField(payload.identity, "changed"),
    identity,
    state: {
      armed: finiteNumber(state.armed, null),
      linkLive: finiteNumber(state.link_live, null),
      rollDeg: finiteNumber(state.roll_deg, null),
      pitchDeg: finiteNumber(state.pitch_deg, null),
      yawDeg: finiteNumber(state.yaw_deg, null),
      gpsFixType: finiteNumber(state.gps_fix_type, null),
      gpsSatellites: finiteNumber(state.gps_satellites, null),
      armingDisableFlags: finiteNumber(state.arming_disable_flags, null),
      vbatV: finiteNumber(state.vbat_v, null),
      mah: finiteNumber(state.mah, null),
    },
  };
}

export function parseFcPreflightText(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty ak fc preflight report.");
  }
  const betaflight = text.trim().match(
    /^armed=(\d+)\s+arming_disable_flags=(\S+)$/,
  );
  if (betaflight) {
    const armed = Number(betaflight[1]);
    const flags = betaflight[2];
    const decodedFlags = betaflightArmingDisableFlags(flags);
    const flagDetail = decodedFlags.labels?.length
      ? ` (${decodedFlags.labels.join(", ")})`
      : "";
    return {
      kind: "fc-preflight",
      protocol: "betaflight",
      lines: [
        {
          name: "armed",
          id: "armed",
          verdict: armed === 0 ? 1 : 0,
          status: armed === 0 ? "pass" : "fail",
          label: armed === 0 ? "Pass" : "Fail",
          detail: `Betaflight reports armed=${armed}.`,
        },
        {
          name: "arming_disable_flags",
          id: "arming-disable-flags",
          verdict: 2,
          status: "fact",
          label: "Fact",
          detail: `Betaflight reports arming_disable_flags=${flags}${flagDetail}.`,
        },
      ],
      passCount: armed === 0 ? 1 : 0,
      failCount: armed === 0 ? 0 : 1,
      factCount: 1,
      armed,
      armingDisableFlags: flags,
      armingDisableFlagLabels: decodedFlags.labels,
    };
  }
  const lines = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const match = rawLine.match(/^(.+?)\s+verdict=([0-2])(?:\s+(.*))?$/);
    if (!match) {
      throw new Error("The selected text is not an ak fc preflight report.");
    }
    const verdict = PREFLIGHT_VERDICTS[Number(match[2])];
    const name = match[1].trim();
    lines.push({
      name,
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      verdict: Number(match[2]),
      status: verdict.status,
      label: verdict.label,
      detail: (match[3] || "").trim(),
    });
  }
  if (lines.length === 0) {
    throw new Error("The preflight report contains no checklist lines.");
  }
  return {
    kind: "fc-preflight",
    lines,
    passCount: lines.filter((line) => line.status === "pass").length,
    failCount: lines.filter((line) => line.status === "fail").length,
    factCount: lines.filter((line) => line.status === "fact").length,
  };
}

export function parseFcPreflightJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || !["akp", "betaflight"].includes(payload.protocol)
  ) {
    throw new Error("The selected JSON is not an ak fc preflight report.");
  }
  if (payload.protocol === "akp") {
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw new Error("The Aerial Kit preflight JSON contains no checklist lines.");
    }
    const lines = payload.lines.map((line) => {
      const numericVerdict = Number(line?.verdict);
      const verdict = PREFLIGHT_VERDICTS[numericVerdict];
      if (!line?.name || !verdict) {
        throw new Error("The Aerial Kit preflight JSON contains an invalid line.");
      }
      const name = String(line.name).trim();
      return {
        name,
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        verdict: numericVerdict,
        status: verdict.status,
        label: verdict.label,
        detail: typeof line.detail === "string" ? line.detail.trim() : "",
      };
    });
    return {
      kind: "fc-preflight",
      protocol: "akp",
      lines,
      passCount: lines.filter((line) => line.status === "pass").length,
      failCount: lines.filter((line) => line.status === "fail").length,
      factCount: lines.filter((line) => line.status === "fact").length,
    };
  }
  if (!Object.hasOwn(payload, "arming_disable_flags")) {
    throw new Error("The Betaflight preflight JSON does not contain arming flags.");
  }
  const armed = finiteNumber(payload.armed, null);
  if (armed == null) {
    throw new Error("The Betaflight preflight JSON does not contain armed state.");
  }
  const flags = String(payload.arming_disable_flags);
  const decodedFlags = betaflightArmingDisableFlags(flags);
  const labels = Array.isArray(payload.arming_disable_names)
    ? payload.arming_disable_names.filter((name) => typeof name === "string")
    : decodedFlags.labels || [];
  const lines = [
    {
      name: "armed",
      id: "armed",
      verdict: armed === 0 ? 1 : 0,
      status: armed === 0 ? "pass" : "fail",
      label: armed === 0 ? "Pass" : "Fail",
      detail: `Betaflight reports armed=${armed}.`,
    },
    {
      name: "arming_disable_flags",
      id: "arming-disable-flags",
      verdict: 2,
      status: "fact",
      label: "Fact",
      detail: `Betaflight reports arming_disable_flags=${flags}${
        labels.length ? ` (${labels.join(", ")})` : ""
      }.`,
    },
  ];
  return {
    kind: "fc-preflight",
    protocol: "betaflight",
    lines,
    passCount: armed === 0 ? 1 : 0,
    failCount: armed === 0 ? 0 : 1,
    factCount: 1,
    armed,
    armingDisableFlags: flags,
    armingDisableFlagLabels: labels,
    reportedVerdict: typeof payload.verdict === "string"
      ? payload.verdict.toLowerCase()
      : null,
  };
}

function timestampMilliseconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number > 1e12 ? number : number * 1000;
}

export function parseFcRcJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || !RC_PROTOCOLS.has(payload.protocol)
    || !Array.isArray(payload.channels)
  ) {
    throw new Error("The selected JSON is not an ak fc rc observation.");
  }
  if (payload.channels.length < 1 || payload.channels.length > 16) {
    throw new Error("The FC RC observation must contain between 1 and 16 channels.");
  }
  const channels = payload.channels.map((value) => {
    const channel = Number(value);
    if (!Number.isInteger(channel) || channel < 0 || channel > 65535) {
      throw new Error("The FC RC observation contains an invalid channel value.");
    }
    return channel;
  });
  return {
    kind: "fc-rc",
    protocol: payload.protocol,
    channels,
    observedAtMs: timestampMilliseconds(payload.observed_at),
    linkLive: payload.protocol === "akp"
      ? payload.link_live === true ? true : payload.link_live === false ? false : null
      : null,
    flags: Array.isArray(payload.flags)
      ? payload.flags.filter((flag) => typeof flag === "string").slice(0, 32)
      : [],
    note: typeof payload.note === "string" ? payload.note.slice(0, 240) : null,
    counters: payload.counters && typeof payload.counters === "object"
      ? payload.counters
      : null,
  };
}

function makeCheck(id, label, status, detail) {
  return { id, label, status, detail };
}

function expectedProtocol(firmwareFamily) {
  if (firmwareFamily === "aerialkit") return "akp";
  if (firmwareFamily === "betaflight") return "betaflight";
  return null;
}

export function fcRcChecks(rc, {
  firmwareFamily = null,
  now = Date.now(),
} = {}) {
  if (!rc) return [];
  const protocol = expectedProtocol(firmwareFamily);
  const plausibleChannels = rc.channels.filter(
    (channel) => channel >= 100 && channel <= 3000,
  );
  const distinctChannels = new Set(rc.channels.slice(0, 8)).size;
  const channelShapePass = plausibleChannels.length >= 4
    && distinctChannels >= 2;
  const ageMs = rc.observedAtMs == null
    ? null
    : Math.max(0, now - rc.observedAtMs);
  const fresh = ageMs != null && ageMs <= RC_FRESHNESS_LIMIT_MS;
  const linkStatus = rc.protocol === "betaflight"
    ? fresh && channelShapePass ? "pass" : "unverified"
    : rc.linkLive === true && fresh && channelShapePass ? "pass"
      : rc.linkLive === false ? "fail" : "unverified";
  return [
    makeCheck(
      "fc-rc-protocol",
      "FC RC observation protocol",
      protocol === null
        ? "unverified"
        : rc.protocol === protocol ? "pass" : "fail",
      protocol === null
        ? `Imported ${rc.protocol} RC channels; the selected firmware family has no comparable protocol.`
        : rc.protocol === protocol
          ? `Imported ${rc.protocol} RC channels, matching the selected ${firmwareFamily} plan.`
          : `Imported ${rc.protocol} RC channels; the selected ${firmwareFamily} plan expects ${protocol}.`,
    ),
    makeCheck(
      "fc-rc-freshness",
      "FC RC observation freshness",
      fresh ? "pass" : "unverified",
      fresh
        ? `The FC RC observation is ${Math.round(ageMs / 1000)} seconds old.`
        : ageMs == null
          ? "The FC RC observation does not contain a usable observation time."
          : `The FC RC observation is ${Math.round(ageMs / 1000)} seconds old; import a fresh sample.`,
    ),
    makeCheck(
      "fc-rc-channel-values",
      "FC RC channel values",
      channelShapePass ? "pass" : "unverified",
      channelShapePass
        ? `${plausibleChannels.length} plausible channels were sampled across ${distinctChannels} values.`
        : "The channels have too little plausible variation. Move the controls or switch before sampling.",
    ),
    makeCheck(
      "fc-rc-link-state",
      "FC RC link observation",
      linkStatus,
      rc.protocol === "betaflight"
        ? linkStatus === "pass"
          ? "A fresh MSP RC query returned plausible channel values. MSP status itself does not expose a link flag, and this does not prove RF."
          : "A fresh MSP RC query did not return enough plausible channel variation to establish a receiver observation."
        : linkStatus === "pass"
          ? "The Aerial Kit RC report flags a live link and returned plausible channel values."
          : linkStatus === "fail"
            ? "The Aerial Kit RC report does not flag a live link."
            : "The Aerial Kit RC report is fresh enough and the link state is known, but channel values remain inconclusive.",
    ),
  ];
}

export function fcEvidenceChecks(status, preflight, {
  firmwareFamily = null,
  rc = null,
  now = Date.now(),
} = {}) {
  const checks = [];
  const protocol = expectedProtocol(firmwareFamily);
  const importedRcChecks = fcRcChecks(rc, { firmwareFamily, now });
  const rcLinkCheck = importedRcChecks.find(
    (check) => check.id === "fc-rc-link-state",
  );
  if (status) {
    checks.push(makeCheck(
      "fc-status-protocol",
      "FC status protocol",
      protocol === null
        ? "unverified"
        : status.protocol === protocol ? "pass" : "fail",
      protocol === null
        ? `Imported ${status.protocol}; the selected firmware family has no comparable status protocol.`
        : status.protocol === protocol
          ? `Imported ${status.protocol}, matching the selected ${firmwareFamily} plan.`
          : `Imported ${status.protocol}; the selected ${firmwareFamily} plan expects ${protocol}.`,
    ));
    checks.push(makeCheck(
      "fc-status-disarmed",
      "FC reported disarmed",
      status.state.armed === 0
        ? "pass"
        : status.state.armed === 1 ? "fail" : "unverified",
      status.state.armed === 0
        ? "The imported status reports armed=0."
        : status.state.armed === 1
          ? "The imported status reports armed=1. This is an observation, not an instruction to continue."
          : "The imported status does not contain an armed state.",
    ));
    checks.push(makeCheck(
      "fc-status-link",
      "FC receiver link / RC observation",
      rcLinkCheck
        ? rcLinkCheck.status
        : status.protocol === "betaflight"
          ? "unverified"
        : status.state.linkLive === 1
          ? "pass"
          : status.state.linkLive === 0 ? "fail" : "unverified",
      rcLinkCheck
        ? rcLinkCheck.detail
        : status.protocol === "betaflight"
          ? "Betaflight MSP status does not expose receiver link state. Import fresh ak fc rc evidence before treating the receiver path as observed."
        : status.state.linkLive === 1
          ? "The imported status reports a live receiver link."
          : status.state.linkLive === 0
            ? "The imported status reports no live receiver link."
            : "The imported status does not contain a link state.",
    ));
  }
  checks.push(...importedRcChecks);
  if (preflight) {
    checks.push(makeCheck(
      "fc-preflight-no-fail",
      "FC preflight failures",
      preflight.failCount === 0 ? "pass" : "fail",
      preflight.failCount === 0
        ? `All ${preflight.passCount} pass and ${preflight.factCount} fact lines were reviewed without a failure.`
        : `${preflight.failCount} preflight line${preflight.failCount === 1 ? "" : "s"} failed.`,
    ));
    if (preflight.protocol === "betaflight") {
      const flags = preflight.armingDisableFlags;
      const parsedFlags = /^0x[0-9a-f]+$/i.test(String(flags))
        ? Number.parseInt(String(flags).slice(2), 16)
        : /^\d+$/.test(String(flags)) ? Number.parseInt(String(flags), 10) : NaN;
      const flagsKnown = Number.isSafeInteger(parsedFlags) && parsedFlags >= 0;
      const failsafeActive = flagsKnown
        && (parsedFlags & BETAFLIGHT_FAILSAFE_MASK) !== 0;
      const activeLabels = preflight.armingDisableFlagLabels || [];
      checks.push(makeCheck(
        "fc-preflight-arming-disable-failsafe",
        "FC failsafe arming flags",
        !flagsKnown ? "unverified" : failsafeActive ? "fail" : "pass",
        !flagsKnown
          ? "Betaflight arming-disable flags could not be decoded."
          : failsafeActive
            ? `Betaflight reports a failsafe arming-disable bit${activeLabels.length ? `: ${activeLabels.join(", ")}` : "."}`
            : activeLabels.length
              ? `No failsafe bit is set. Other active flags: ${activeLabels.join(", ")}.`
              : "Betaflight reports no active arming-disable flags.",
      ));
      if (preflight.reportedVerdict) {
        checks.push(makeCheck(
          "fc-preflight-reported-verdict",
          "FC preflight result",
          preflight.reportedVerdict === "pass"
            ? "pass"
            : preflight.reportedVerdict === "fail" ? "fail" : "unverified",
          preflight.reportedVerdict === "pass"
            ? "The imported preflight report is clear."
            : preflight.reportedVerdict === "fail"
              ? "The imported preflight report failed."
              : `The imported preflight report is ${preflight.reportedVerdict}; review the active arming-disable flags.`,
        ));
      }
    }
    const lineChecks = [
      ["console", "FC console port"],
      ["clock", "FC clock source"],
      ["tick", "FC millisecond tick"],
      ["configuration", "FC saved configuration"],
      ["fault", "FC recorded faults"],
      ["outputs", "FC output mix"],
    ];
    lineChecks.forEach(([name, label]) => {
      const matchingLines = preflight.lines.filter((candidate) => candidate.id === name);
      const line = matchingLines.find((candidate) => candidate.status === "fail")
        || matchingLines.find((candidate) => candidate.status === "pass")
        || matchingLines.find((candidate) => candidate.status === "fact")
        || null;
      checks.push(makeCheck(
        `fc-preflight-${name}`,
        label,
        !line ? "unverified" : line.status === "fail" ? "fail" : line.status === "pass" ? "pass" : "unverified",
        line?.detail || `The preflight report has no ${name} line.`,
      ));
    });
  }
  return checks;
}

const PARAMETER_PLAN_KEYS = {
  airframe: "airframe",
  dshot_khz: "dshotKhz",
  rc_protocol: "receiverProtocol",
  arm_channel: "armChannel",
  mode_channel: "modeChannel",
  velocity_channel: "velocityChannel",
  manual_channel: "manualChannel",
  ctrl_channel: "ctrlChannel",
  sysid_channel: "sysidChannel",
  arm_hold_ms: "armHoldMs",
  arm_max_tilt_deg: "armMaxTiltDeg",
  throttle_low: "throttleLow",
  rc_timeout_ms: "rcTimeoutMs",
  rc_min: "rcMin",
  rc_mid: "rcMid",
  rc_max: "rcMax",
  rc_deadband: "rcDeadband",
  vbat_ratio: "vbatRatio",
  vbat_cells: "vbatCells",
  vbat_warn_cell: "vbatWarnCell",
  vbat_min_cell: "vbatMinCell",
  align_roll_deg: "alignRollDeg",
  align_pitch_deg: "alignPitchDeg",
  align_yaw_deg: "alignYawDeg",
  rth_enable: "rthEnabled",
};

function comparableParameterValue(value) {
  if (typeof value === "boolean") return value ? "1" : "0";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value ?? "");
}

export function parseFcParameterSnapshotText(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a non-empty Aerial Kit parameter snapshot.");
  }
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const match = rawLine.trim().match(/^([a-z0-9_]+)=(.+?)\s+status=\S+$/i);
    if (!match) {
      throw new Error("The selected text is not an ak fc get parameter snapshot.");
    }
    values[match[1].toLowerCase()] = match[2].trim();
  }
  if (!Object.keys(values).length) {
    throw new Error("The parameter snapshot contains no values.");
  }
  return { kind: "fc-parameters", values };
}

export function fcParameterChecks(snapshot, plan) {
  if (!snapshot || !plan) return [];
  return Object.entries(PARAMETER_PLAN_KEYS)
    .filter(([, planKey]) => {
      const value = plan[planKey];
      return value !== null && value !== undefined && value !== "";
    })
    .map(([runtimeName, planKey]) => {
      if (!Object.hasOwn(snapshot.values, runtimeName)) {
        return makeCheck(
          `fc-param-${runtimeName.replaceAll("_", "-")}`,
          `FC parameter ${runtimeName}`,
          "unverified",
          `The imported snapshot does not include ${runtimeName}, so this planned value remains unverified.`,
        );
      }
      const actual = comparableParameterValue(snapshot.values[runtimeName]);
      const expected = comparableParameterValue(plan[planKey]);
      const matches = actual === expected;
      return makeCheck(
        `fc-param-${runtimeName.replaceAll("_", "-")}`,
        `FC parameter ${runtimeName}`,
        matches ? "pass" : "fail",
        matches
          ? `Imported ${runtimeName}=${actual}, matching the staged plan.`
          : `Imported ${runtimeName}=${actual}; the staged plan expects ${expected}.`,
      );
    });
}
