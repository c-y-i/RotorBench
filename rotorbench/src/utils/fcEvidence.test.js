import {
  fcEvidenceChecks,
  fcParameterChecks,
  fcRcChecks,
  parseFcPreflightJson,
  parseFcPreflightText,
  parseFcParameterSnapshotText,
  parseFcRcJson,
  parseFcStatusJson,
} from "./fcEvidence";

const statusJson = {
  identity: "protocol=akp product=aerialkit-f405 firmware=46 parameters=46 changed=2",
  state: {
    armed: 0,
    link_live: 1,
    roll_deg: 0.1,
    pitch_deg: -0.2,
    yaw_deg: 0.3,
    gps_fix_type: 3,
    gps_satellites: 9,
    motors: [0, 0, 0, 0],
  },
};

const preflightText = [
  "console verdict=1 console attached to the board's own port",
  "clock verdict=1 clock on the crystal",
  "tick verdict=1 tick advanced",
  "outputs verdict=1 outputs: 4 motors, 2 servos",
  "configuration verdict=1 saved configuration: none stored",
  "fault verdict=1 no fault recorded since power on",
  "imu verdict=2 imu: icm42688p",
  "receiver verdict=2 receiver: 8412 bytes, 401 frames",
].join("\n");

test("normalizes ak fc status JSON without retaining serial paths", () => {
  const status = parseFcStatusJson({
    ...statusJson,
    identity: "protocol=akp product=aerialkit-f405 firmware=46 parameters=46 changed=2 --port /dev/ttyACM0",
  });

  expect(status).toMatchObject({
    kind: "fc-status",
    protocol: "akp",
    product: "aerialkit-f405",
    firmware: "46",
    parameterCount: 46,
    state: { armed: 0, linkLive: 1, gpsSatellites: 9 },
  });
  expect(JSON.stringify(status)).not.toContain("/dev/tty");
});

test("normalizes pass, fail, and fact preflight lines", () => {
  const preflight = parseFcPreflightText(
    `${preflightText}\noutputs verdict=0 this mix needs four motors`,
  );

  expect(preflight).toMatchObject({
    kind: "fc-preflight",
    failCount: 1,
    factCount: 2,
  });
  expect(preflight.lines.filter((line) => line.id === "outputs").at(-1)).toMatchObject({
    status: "fail",
    label: "Fail",
    detail: "this mix needs four motors",
  });
});

test("correlates firmware protocol, disarmed state, and preflight failures", () => {
  const status = parseFcStatusJson(statusJson);
  const preflight = parseFcPreflightText(preflightText);
  const checks = fcEvidenceChecks(status, preflight, {
    firmwareFamily: "aerialkit",
  });

  expect(checks.find((check) => check.id === "fc-status-protocol").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-status-disarmed").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-status-link").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-preflight-no-fail").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-preflight-outputs").status)
    .toBe("pass");
});

test("wrong protocol and armed status fail closed", () => {
  const status = parseFcStatusJson({
    ...statusJson,
    state: { ...statusJson.state, armed: 1 },
  });
  const checks = fcEvidenceChecks(status, null, {
    firmwareFamily: "betaflight",
  });

  expect(checks.find((check) => check.id === "fc-status-protocol").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-status-disarmed").status)
    .toBe("fail");
});

test("malformed status and preflight inputs are rejected", () => {
  expect(() => parseFcStatusJson({ identity: "protocol=akp", state: null }))
    .toThrow(/ak fc status/i);
  expect(() => parseFcPreflightText("ok everything is fine"))
    .toThrow(/ak fc preflight/i);
});

test("parses Betaflight's armed and disable-flag preflight summary", () => {
  const preflight = parseFcPreflightText(
    "armed=0 arming_disable_flags=0x104",
  );

  expect(preflight).toMatchObject({
    protocol: "betaflight",
    armed: 0,
    armingDisableFlags: "0x104",
    armingDisableFlagLabels: ["RX failsafe", "Angle"],
    passCount: 1,
    failCount: 0,
    factCount: 1,
  });
  expect(preflight.lines.find((line) => line.id === "armed").status).toBe("pass");
  expect(preflight.lines.find((line) => line.id === "arming-disable-flags").detail)
    .toMatch(/RX failsafe, Angle/i);
});

test("fails closed when Betaflight reports a failsafe arming-disable bit", () => {
  const preflight = parseFcPreflightText(
    "armed=0 arming_disable_flags=0x104",
  );
  const checks = fcEvidenceChecks(null, preflight, {
    firmwareFamily: "betaflight",
  });

  expect(checks.find((check) => check.id === "fc-preflight-arming-disable-failsafe"))
    .toMatchObject({
      status: "fail",
      detail: expect.stringMatching(/failsafe arming-disable bit/i),
    });
});

test("normalizes the merged CLI's Betaflight preflight JSON", () => {
  const preflight = parseFcPreflightJson({
    protocol: "betaflight",
    verdict: "blocked",
    armed: 0,
    arming_disable_flags: 0x100,
    arming_disable_names: ["ANGLE"],
    receiver_link: "not_represented_by_msp",
  });
  const checks = fcEvidenceChecks(null, preflight, {
    firmwareFamily: "betaflight",
  });

  expect(preflight).toMatchObject({
    protocol: "betaflight",
    armed: 0,
    reportedVerdict: "blocked",
    armingDisableFlagLabels: ["ANGLE"],
  });
  expect(checks.find((check) => check.id === "fc-preflight-reported-verdict"))
    .toMatchObject({ status: "unverified" });
});

test("accepts a fresh plausible Betaflight RC observation without inventing an MSP link flag", () => {
  const now = Date.now();
  const rc = parseFcRcJson({
    protocol: "betaflight",
    link_live: null,
    channels: [172, 992, 1811, 992, 992, 992, 992, 992],
    observed_at: now / 1000,
    note: "fresh MSP_RC observation",
  });
  const checks = fcRcChecks(rc, { firmwareFamily: "betaflight", now });

  expect(rc).toMatchObject({
    kind: "fc-rc",
    protocol: "betaflight",
    linkLive: null,
  });
  expect(checks.find((check) => check.id === "fc-rc-protocol").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-rc-freshness").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-rc-channel-values").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-rc-link-state")).toMatchObject({
    status: "pass",
    detail: expect.stringMatching(/does not prove RF/i),
  });
});

test("stale or flat FC RC samples remain inconclusive", () => {
  const now = Date.now();
  const stale = parseFcRcJson({
    protocol: "betaflight",
    channels: [172, 992, 1811, 992, 992, 992, 992, 992],
    observed_at: (now - 11 * 60 * 1000) / 1000,
  });
  const flat = parseFcRcJson({
    protocol: "betaflight",
    channels: [992, 992, 992, 992],
    observed_at: now / 1000,
  });

  expect(fcRcChecks(stale, { firmwareFamily: "betaflight", now })
    .find((check) => check.id === "fc-rc-link-state").status)
    .toBe("unverified");
  expect(fcRcChecks(flat, { firmwareFamily: "betaflight", now })
    .find((check) => check.id === "fc-rc-channel-values").status)
    .toBe("unverified");
});

test("rejects malformed FC RC channel values", () => {
  expect(() => parseFcRcJson({
    protocol: "betaflight",
    channels: [992, "bad"],
    observed_at: Date.now() / 1000,
  })).toThrow(/invalid channel value/i);
});

test("does not inherit Aerial Kit link semantics into Betaflight MSP status", () => {
  const status = parseFcStatusJson({
    ...statusJson,
    identity: "protocol=betaflight product=BTFL firmware=2026.6.1",
    state: { ...statusJson.state, link_live: 1 },
  });
  const checks = fcEvidenceChecks(status, null, {
    firmwareFamily: "betaflight",
  });

  expect(checks.find((check) => check.id === "fc-status-link")).toMatchObject({
    status: "unverified",
    detail: expect.stringMatching(/does not expose receiver link state/i),
  });
});

test("compares read-only Aerial Kit runtime parameters with the staged plan", () => {
  const snapshot = parseFcParameterSnapshotText([
    "arm_channel=5 status=0",
    "mode_channel=6 status=0",
    "rc_min=172 status=0",
    "rc_deadband=0.02 status=0",
    "rth_enable=0 status=0",
  ].join("\n"));
  const checks = fcParameterChecks(snapshot, {
    armChannel: 5,
    modeChannel: 7,
    rcMin: 172,
    rcDeadband: 0.02,
    rthEnabled: false,
  });

  expect(checks.find((check) => check.id === "fc-param-arm-channel").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-mode-channel").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-rth-enable").status)
    .toBe("pass");
});

test("marks planned parameters missing from a partial snapshot as unverified", () => {
  const snapshot = parseFcParameterSnapshotText("arm_channel=5 status=0");
  const checks = fcParameterChecks(snapshot, {
    armChannel: 5,
    modeChannel: 6,
    rcMin: 172,
  });

  expect(checks.find((check) => check.id === "fc-param-arm-channel").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-mode-channel")).toMatchObject({
    status: "unverified",
    detail: expect.stringMatching(/does not include mode_channel/i),
  });
  expect(checks.find((check) => check.id === "fc-param-rc-min").status)
    .toBe("unverified");
});
