import {
  parseBenchEvidenceBundle,
  parseBenchEvidenceJson,
  parseRadioDiagJson,
  parseRadioParameterText,
} from "./benchEvidence";
import { createAerialKitLogExport } from "./aerialKitLogExport";

const pairEvidence = {
  expected_uid: "10:73:A1:1F:A8:0F",
  tx_before_uid: "00:00:00:00:00:00",
  rx_before_uid: "00:00:00:00:00:00",
  tx_uid: "10:73:A1:1F:A8:0F",
  rx_uid: "10:73:A1:1F:A8:0F",
  uids_match: true,
  overall: "PASS",
  bench: {
    overall: "PASS",
    requirements: {
      tx_device_info: "PASS",
      rx_device_info: "PASS",
      tx_rc_drive: "PASS",
      rx_rc_capture: "PASS",
      tx_link_statistics: "PASS",
      rx_link_statistics: "PASS",
      telemetry_round_trip: "PASS",
      rf_link: "PASS",
    },
    tx: {
      duration_sec: 15,
      frames_sent: 2250,
      actual_hz: 150,
      disarmed_at_end: true,
      telemetry: { link_statistics: {}, battery: {} },
    },
    rx: {
      duration_sec: 15,
      frames: 120,
      rc_frames: 96,
      rc_cadence_hz: 150,
      link_statistics_frames: 8,
      channels: Array.from({ length: 16 }, () => 992),
      missed_intervals: 0,
      crc_errors: 0,
      resyncs: 0,
      framing_errors: 0,
    },
  },
  tx_path: "/dev/ttyACM0",
  rx_path: "/dev/ttyACM1",
};

const txBoot = {
  path: "/dev/ttyACM0",
  logical_baud: 400000,
  line: "AK-BOOT role=tx uid=1073a11fa80f domain=ISM_2400",
  fields: {
    role: "tx",
    uid: "1073a11fa80f",
    seed: "0xa80fa80d",
    crc: "0xa80f",
    rate_enum: "27",
    fhss0: "42",
    freq: "2400000000",
    domain: "ISM_2400",
    conn: "3",
    txen: "0",
    rxen: "0",
  },
  rf_lines: [],
};

const rxBoot = {
  path: "/dev/ttyACM1",
  logical_baud: 420000,
  line: "AK-BOOT role=rx uid=1073a11fa80f domain=ISM_2400",
  fields: {
    role: "rx",
    uid: "1073a11fa80f",
    seed: "0xa80fa80d",
    crc: "0xa80f",
    rate_enum: "5",
    fhss0: "42",
    freq: "2400000000",
    domain: "ISM_2400",
    conn: "2",
    txen: "0",
    rxen: "1",
  },
  rf_lines: [],
};

const txParametersText = [
  "  1 Packet Rate      3                text_selection",
  "  2 Telem Ratio      0                text_selection",
  "  3 Switch Mode      0                text_selection",
  "  4 Link Mode        0                text_selection",
  "  5 Max Power        0                text_selection",
  "  6 Dynamic          0                text_selection",
  "  7 Model Match      0                text_selection",
].join("\n");

const expectedSettings = {
  packetRateMode: "250",
  powerDbm: -18,
  telemetryRatio: "std",
  switchMode: "wide",
  linkMode: "normal",
  dynamicPower: "off",
  modelMatch: false,
};

const fcStatusEvidence = {
  identity: "protocol=akp product=aerialkit-f405 firmware=46 parameters=46 changed=0",
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

const fcPreflightEvidence = [
  "console verdict=1 console attached to the board's own port",
  "clock verdict=1 clock on the crystal",
  "tick verdict=1 tick advanced after 41250 spins",
  "outputs verdict=1 outputs: 4 motors, 2 servos",
  "configuration verdict=1 saved configuration: none stored",
  "fault verdict=1 no fault recorded since power on",
  "imu verdict=2 imu: icm42688p",
  "receiver verdict=2 receiver: 8412 bytes, 401 frames",
].join("\n");

const radioStatusEvidence = {
  path: "/dev/ttyACM0",
  usb_serial: "SER123",
  logical_baud: 400000,
  role: "tx",
  product: "Aerial Kit Rev A3",
  origin: 238,
  destination: 234,
  firmware_version: 262400,
  firmware_string: "4.1.0",
  parameter_count: 12,
  parameter_version: 0,
  device_serial: 305419896,
  hardware_version: 1,
};

function observationPayload(role, {
  start = "2026-11-20T12:00:00.000Z",
  end = "2026-11-20T12:00:15.000Z",
  target = "Aerial Kit ELRS USB TX Rev A3",
} = {}) {
  return {
    schema: "rotorbench.crsf-observation.v1",
    generatedAt: end,
    captureSessionId: "capture-test-session",
    status: "frames-observed",
    baudRate: role === "tx" ? 400000 : 420000,
    expectedBaud: role === "tx" ? 400000 : 420000,
    captureStatus: "stopped",
    captureStartedAt: start,
    captureEndedAt: end,
    plan: { role, targetName: target },
    channelsObserved: role === "rx",
    linkStatisticsObserved: true,
    telemetryObserved: false,
    lastFrameAgeMs: 250,
    rcCadenceMs: role === "rx" ? 6.67 : null,
    diagnostics: {
      validFrames: 20,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      bytesReceived: 800,
      pendingBytes: 0,
    },
    channels: role === "rx" ? Array.from({ length: 16 }, () => 992) : null,
    link: {
      uplinkLinkQuality: 98,
      downlinkLinkQuality: 92,
    },
  };
}

test("pair evidence is complete only when UID, RC, and both link-stat gates pass", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify(pairEvidence), {
    expectedUid: "10:73:a1:1f:a8:0f",
  });

  expect(evidence.kind).toBe("pair");
  expect(evidence.rfReportedPass).toBe(true);
  expect(evidence.rfEvidenceComplete).toBe(true);
  expect(evidence.currentPlanMatches).toBe(true);
  expect(evidence.checks.find((check) => check.id === "uid-match").status).toBe("pass");
  expect(evidence.checks.find((check) => check.id === "parser-integrity").status)
    .toBe("pass");
  expect(evidence.checks.find((check) => check.id === "rc-cadence").status)
    .toBe("pass");
  expect(evidence.checks.find((check) => check.id === "frame-freshness").status)
    .toBe("unverified");
  expect(evidence.metrics).toMatchObject({
    txFramesSent: 2250,
    rcFrames: 96,
    rcCadenceHz: 150,
    linkStatisticsFrames: 8,
    channels: 16,
  });
  expect(JSON.stringify(evidence)).not.toContain("/dev/ttyACM");
});

test("native CRSF observation files surface parser, cadence, freshness, and LQ", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify({
    schema: "rotorbench.crsf-observation.v1",
    status: "frames-observed",
    baudRate: 420000,
    expectedBaud: 420000,
    plan: {
      role: "rx",
      targetName: "Aerial Kit ELRS USB TX Rev A3",
      channelMap: { arm: 5, flightMode: 6 },
    },
    channelsObserved: true,
    linkStatisticsObserved: true,
    telemetryObserved: false,
    lastFrameAgeMs: 1200,
    rcCadenceMs: 6.67,
    diagnostics: {
      validFrames: 12,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      bytesReceived: 520,
      pendingBytes: 0,
    },
    channels: Array.from({ length: 16 }, (_, index) => ({
      channel: index + 1,
      raw: 992,
      protocolPercent: 50,
    })),
    link: {
      uplinkLinkQuality: 100,
      downlinkLinkQuality: 80,
      uplinkRssi1Dbm: -40,
      downlinkRssiDbm: -52,
      uplinkSnrDb: 9,
      downlinkSnrDb: 6,
    },
  }));

  expect(evidence.kind).toBe("observation");
  expect(evidence.rfReportedPass).toBe(false);
  expect(evidence.rfEvidenceComplete).toBe(false);
  expect(evidence.metrics).toMatchObject({
    bytesReceived: 520,
    validFrames: 12,
    rcCadenceHz: expect.any(Number),
    lastFrameAgeMs: 1200,
    channels: 16,
  });
  expect(evidence.planContext).toMatchObject({
    role: "rx",
    targetName: "Aerial Kit ELRS USB TX Rev A3",
  });
  expect(evidence.checks.find((check) => check.id === "parser-integrity").status)
    .toBe("pass");
  expect(evidence.checks.find((check) => check.id === "rc-cadence").status)
    .toBe("pass");
  expect(evidence.checks.find((check) => check.id === "frame-freshness").status)
    .toBe("pass");
  expect(evidence.checks.find((check) => check.id === "link-quality").status)
    .toBe("pass");
});

test("native CRSF observation files expose parser and stale-frame failures", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify({
    schema: "rotorbench.crsf-observation.v1",
    status: "frames-observed",
    baudRate: 420000,
    channelsObserved: true,
    linkStatisticsObserved: true,
    lastFrameAgeMs: 3500,
    rcCadenceMs: 6.67,
    diagnostics: {
      validFrames: 3,
      crcErrors: 2,
      resyncs: 1,
      framingErrors: 0,
      bytesReceived: 200,
      pendingBytes: 0,
    },
    link: {
      uplinkLinkQuality: 0,
      downlinkLinkQuality: 0,
    },
  }));

  expect(evidence.checks.find((check) => check.id === "parser-integrity"))
    .toMatchObject({ status: "fail" });
  expect(evidence.checks.find((check) => check.id === "frame-freshness"))
    .toMatchObject({ status: "fail" });
  expect(evidence.checks.find((check) => check.id === "link-quality"))
    .toMatchObject({ status: "fail" });
});

test("native observation direction keeps TX and RX evidence separate", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify({
    schema: "rotorbench.crsf-observation.v1",
    status: "frames-observed",
    plan: { role: "tx" },
    channelsObserved: true,
    linkStatisticsObserved: true,
    diagnostics: {
      validFrames: 4,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      bytesReceived: 120,
      pendingBytes: 0,
    },
  }));

  expect(evidence.checks.find((check) => check.id === "receiver-rc").status)
    .toBe("unverified");
  expect(evidence.checks.find((check) => check.id === "tx-link-statistics").status)
    .toBe("pass");
  expect(evidence.checks.find((check) => check.id === "rx-link-statistics").status)
    .toBe("unverified");
});

test("overlapping TX and RX observations correlate without becoming an RF pass", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "tx-observation.json",
      text: JSON.stringify(observationPayload("tx")),
    },
    {
      name: "rx-observation.json",
      text: JSON.stringify(observationPayload("rx")),
    },
  ], {
    targetName: "Aerial Kit ELRS USB TX Rev A3",
    expectedBauds: { tx: 400000, rx: 420000 },
  });

  expect(bundle).toMatchObject({
    kind: "observation-pair",
    observationCorrelationComplete: true,
    rfEvidenceComplete: false,
    rfReportedPass: false,
    hardwareVerifiedByRotorBench: false,
    observationPair: {
      targetMatch: true,
      overlapMs: 15000,
      tx: { baudRate: 400000 },
      rx: { baudRate: 420000 },
    },
    bundle: {
      reportCount: 2,
      observationCount: 2,
    },
  });
  expect(bundle.checks.find((check) => check.id === "observation-target").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "observation-plan-target").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "observation-overlap").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "observation-session").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "observation-tx-baud").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "observation-rx-baud").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "tx-tx-link-statistics").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "rx-receiver-rc").status)
    .toBe("pass");
});

test("non-overlapping endpoint observations fail correlation", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "tx-observation.json",
      text: JSON.stringify(observationPayload("tx", {
        start: "2026-11-20T12:00:00.000Z",
        end: "2026-11-20T12:00:05.000Z",
      })),
    },
    {
      name: "rx-observation.json",
      text: JSON.stringify(observationPayload("rx", {
        start: "2026-11-20T12:00:10.000Z",
        end: "2026-11-20T12:00:15.000Z",
      })),
    },
  ]);

  expect(bundle.observationCorrelationComplete).toBe(false);
  expect(bundle.rfEvidenceComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "observation-overlap"))
    .toMatchObject({ status: "fail" });
});

test("observations matching each other but not the current target fail correlation", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "tx-observation.json",
      text: JSON.stringify(observationPayload("tx", { target: "Different TX" })),
    },
    {
      name: "rx-observation.json",
      text: JSON.stringify(observationPayload("rx", { target: "Different TX" })),
    },
  ], {
    targetName: "Aerial Kit ELRS USB TX Rev A3",
  });

  expect(bundle.observationCorrelationComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "observation-target").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "observation-plan-target"))
    .toMatchObject({ status: "fail" });
});

test("endpoint observations fail when a direction uses the other endpoint baud", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "tx-observation.json",
      text: JSON.stringify(observationPayload("tx")),
    },
    {
      name: "rx-observation.json",
      text: JSON.stringify(observationPayload("rx")),
    },
  ], {
    expectedBauds: { tx: 420000, rx: 420000 },
  });

  expect(bundle.observationCorrelationComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "observation-tx-baud"))
    .toMatchObject({ status: "fail" });
  expect(bundle.checks.find((check) => check.id === "observation-rx-baud"))
    .toMatchObject({ status: "pass" });
});

test("observations from different capture sessions fail correlation", () => {
  const tx = observationPayload("tx");
  const rx = observationPayload("rx");
  rx.captureSessionId = "capture-other-session";
  const bundle = parseBenchEvidenceBundle([
    { name: "tx.json", text: JSON.stringify(tx) },
    { name: "rx.json", text: JSON.stringify(rx) },
  ]);

  expect(bundle.observationCorrelationComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "observation-session").status)
    .toBe("fail");
});

test("duplicate endpoint observations are rejected", () => {
  expect(() => parseBenchEvidenceBundle([
    {
      name: "tx-one.json",
      text: JSON.stringify(observationPayload("tx")),
    },
    {
      name: "tx-two.json",
      text: JSON.stringify(observationPayload("tx")),
    },
  ])).toThrow(/more than one TX native observation/i);
});

test("pair evidence with a different staged UID cannot complete the review", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify(pairEvidence), {
    expectedUid: "aa:bb:cc:dd:ee:ff",
  });

  expect(evidence.rfEvidenceComplete).toBe(false);
  expect(evidence.currentPlanMatches).toBe(false);
  expect(evidence.checks.find((check) => check.id === "plan-uid").status)
    .toBe("fail");
});

test("pair evidence cannot complete when integrity or freshness checks fail", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify({
    ...pairEvidence,
    lastFrameAgeMs: 3500,
    bench: {
      ...pairEvidence.bench,
      rx: {
        ...pairEvidence.bench.rx,
        crc_errors: 2,
      },
    },
  }), {
    expectedUid: "10:73:a1:1f:a8:0f",
  });

  expect(evidence.rfReportedPass).toBe(true);
  expect(evidence.rfEvidenceComplete).toBe(false);
  expect(evidence.checks.find((check) => check.id === "parser-integrity").status)
    .toBe("fail");
  expect(evidence.checks.find((check) => check.id === "frame-freshness").status)
    .toBe("fail");
});

test("direct bench evidence keeps UID readback unverified", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify(pairEvidence.bench));

  expect(evidence.kind).toBe("bench");
  expect(evidence.rfReportedPass).toBe(true);
  expect(evidence.rfEvidenceComplete).toBe(false);
  expect(evidence.checks.find((check) => check.id === "uid-match").status)
    .toBe("unverified");
});

test("single-endpoint capture never claims a two-endpoint RF pass", () => {
  const evidence = parseBenchEvidenceJson(JSON.stringify({
    status: "valid_crsf",
    duration_sec: 10,
    frames: 50,
    rc_frames: 40,
    link_statistics_frames: 5,
    rc_cadence_hz: 150,
    channels: [992, 992, 992, 992],
    crc_errors: 1,
    resyncs: 2,
    framing_errors: 0,
  }));

  expect(evidence.kind).toBe("capture");
  expect(evidence.rfReportedPass).toBe(false);
  expect(evidence.rfEvidenceComplete).toBe(false);
  expect(evidence.checks.find((check) => check.id === "receiver-rc").status)
    .toBe("pass");
});

test("malformed and unknown evidence files fail closed", () => {
  expect(() => parseBenchEvidenceJson("{")).toThrow(/not valid JSON/i);
  expect(() => parseBenchEvidenceJson("{}")).toThrow(/not a recognized/i);
});

test("UID parsing accepts only separators permitted by the Python client", () => {
  const base = {
    ...txBoot,
    fields: {
      ...txBoot.fields,
      uid: "10:73:a1:1f:a8:0f",
    },
  };
  expect(parseRadioDiagJson(JSON.stringify(base)).uid).toBe("10:73:A1:1F:A8:0F");

  for (const invalid of [
    "garbage10:73:a1:1f:a8:0f",
    "10.73.a1.1f.a8.0f",
    "UID=1073a11fa80f",
  ]) {
    expect(() => parseRadioDiagJson(JSON.stringify({
      ...base,
      fields: { ...base.fields, uid: invalid },
    }))).toThrow(/valid six-byte UID/i);
  }
});

test("boot diagnostics normalize without retaining serial paths", () => {
  const diag = parseRadioDiagJson(JSON.stringify(txBoot));

  expect(diag).toMatchObject({
    kind: "diag",
    role: "tx",
    uid: "10:73:A1:1F:A8:0F",
    logicalBaud: 400000,
    rateEnum: 27,
    domain: "ISM_2400",
  });
  expect(JSON.stringify(diag)).not.toContain("/dev/tty");
});

test("radio parameter snapshots normalize the source-backed setting names", () => {
  const snapshot = parseRadioParameterText(txParametersText);

  expect(snapshot).toMatchObject({
    kind: "params",
    role: "tx",
    settings: {
      packetRate: { index: 3, label: "250Hz" },
      telemetryRatio: { index: 0, label: "Std" },
      switchMode: { index: 0, label: "Wide" },
      linkMode: { index: 0, label: "Normal" },
      maxPower: { index: 0, label: "10" },
      dynamicPower: { index: 0, label: "Off" },
      modelMatch: { index: 0, label: "Off" },
    },
  });
});

test("a report bundle correlates TX and RX boot diagnostics", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "pair.json", text: JSON.stringify(pairEvidence) },
    { name: "tx-boot.json", text: JSON.stringify(txBoot) },
    { name: "rx-boot.json", text: JSON.stringify(rxBoot) },
  ], {
    expectedUid: "10:73:a1:1f:a8:0f",
    expectedBauds: { tx: 400000, rx: 420000 },
    targetName: "Aerial Kit ELRS USB TX Rev A3",
  });

  expect(bundle.bundle).toMatchObject({
    reportCount: 1,
    diagnosticCount: 2,
    complete: true,
    targetName: "Aerial Kit ELRS USB TX Rev A3",
  });
  expect(bundle.checks.find((check) => check.id === "tx-boot-diag").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "rx-boot-diag").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "endpoint-agreement").status)
    .toBe("pass");
  expect(JSON.stringify(bundle)).not.toContain("/dev/tty");
});

test("a complete bundle correlates reported module settings with the plan", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "pair.json", text: JSON.stringify(pairEvidence) },
    { name: "tx-boot.json", text: JSON.stringify(txBoot) },
    { name: "rx-boot.json", text: JSON.stringify(rxBoot) },
    { name: "tx-params.txt", text: txParametersText },
  ], {
    expectedUid: "10:73:a1:1f:a8:0f",
    expectedBauds: { tx: 400000, rx: 420000 },
    expectedSettings,
    targetName: "Aerial Kit ELRS USB TX Rev A3",
  });

  expect(bundle.bundle).toMatchObject({
    parameterCount: 1,
    complete: true,
    settingsComplete: true,
  });
  expect(bundle.checks.find((check) => check.id === "settings-packet-rate").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "settings-power").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "settings-telemetry").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "settings-link-mode").status)
    .toBe("pass");
});

test("reported module settings that differ from the plan fail closed", () => {
  const mismatchedParameters = txParametersText
    .replace("5 Max Power        0", "5 Max Power        4")
    .replace("2 Telem Ratio      0", "2 Telem Ratio      1")
    .replace("4 Link Mode        0", "4 Link Mode        1");
  const bundle = parseBenchEvidenceBundle([
    { name: "pair.json", text: JSON.stringify(pairEvidence) },
    { name: "tx-params.txt", text: mismatchedParameters },
  ], {
    expectedUid: "10:73:a1:1f:a8:0f",
    expectedSettings,
  });

  expect(bundle.bundle.settingsComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "settings-power").status)
    .toBe("fail");
  expect(bundle.checks.find((check) => check.id === "settings-telemetry").status)
    .toBe("fail");
  expect(bundle.checks.find((check) => check.id === "settings-link-mode").status)
    .toBe("fail");
});

test("endpoint boot mismatches fail bundle correlation", () => {
  const mismatchedRx = {
    ...rxBoot,
    fields: {
      ...rxBoot.fields,
      uid: "aabbccddeeff",
      domain: "ISM_2400",
    },
  };
  const bundle = parseBenchEvidenceBundle([
    { name: "pair.json", text: JSON.stringify(pairEvidence) },
    { name: "tx-boot.json", text: JSON.stringify(txBoot) },
    { name: "rx-boot.json", text: JSON.stringify(mismatchedRx) },
  ], {
    expectedBauds: { tx: 400000, rx: 420000 },
  });

  expect(bundle.bundle.complete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "rx-boot-diag").status)
    .toBe("fail");
  expect(bundle.checks.find((check) => check.id === "endpoint-agreement").status)
    .toBe("fail");
});

test("FHSS seed and initial-channel mismatches fail bundle correlation", () => {
  const mismatchedTx = {
    ...txBoot,
    fields: {
      ...txBoot.fields,
      seed: "0x11111111",
      fhss0: "7",
    },
  };
  const bundle = parseBenchEvidenceBundle([
    { name: "tx-boot.json", text: JSON.stringify(mismatchedTx) },
    { name: "rx-boot.json", text: JSON.stringify(rxBoot) },
  ], {
    expectedUid: "10:73:a1:1f:a8:0f",
    expectedBauds: { tx: 400000, rx: 420000 },
  });

  expect(bundle.checks.find((check) => check.id === "rf-seed").status)
    .toBe("fail");
  expect(bundle.checks.find((check) => check.id === "rf-fhss").status)
    .toBe("fail");
  expect(bundle.bundle.complete).toBe(false);
});

test("diagnostics alone never establish RF evidence", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "tx-boot.json", text: JSON.stringify(txBoot) },
    { name: "rx-boot.json", text: JSON.stringify(rxBoot) },
  ], {
    expectedUid: "10:73:a1:1f:a8:0f",
    expectedBauds: { tx: 400000, rx: 420000 },
  });

  expect(bundle.kind).toBe("diagnostics");
  expect(bundle.rfReportedPass).toBe(false);
  expect(bundle.rfEvidenceComplete).toBe(false);
  expect(bundle.bundle.complete).toBe(true);
});

test("FC status and preflight evidence correlate without claiming flight readiness", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "fc-status.json", text: JSON.stringify(fcStatusEvidence) },
    { name: "fc-preflight.txt", text: fcPreflightEvidence },
  ], {
    expectedFc: { firmwareFamily: "aerialkit" },
  });

  expect(bundle).toMatchObject({
    kind: "fc-evidence",
    fileOverall: "FC status and preflight reviewed",
    fcEvidence: {
      evidenceComplete: true,
      hardwareVerifiedByRotorBench: false,
      expectedFirmwareFamily: "aerialkit",
    },
    bundle: {
      fcEvidenceCount: 2,
    },
  });
  expect(bundle.checks.find((check) => check.id === "fc-status-protocol").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-status-disarmed").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-status-link").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-preflight-no-fail").status)
    .toBe("pass");
  expect(JSON.stringify(bundle)).not.toContain("/dev/tty");
});

test("FC preflight failures fail the FC evidence review", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "fc-status.json", text: JSON.stringify(fcStatusEvidence) },
    {
      name: "fc-preflight.txt",
      text: `${fcPreflightEvidence}\noutputs verdict=0 this mix needs four motors`,
    },
  ], {
    expectedFc: { firmwareFamily: "aerialkit" },
  });

  expect(bundle.fcEvidence.evidenceComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "fc-preflight-no-fail").status)
    .toBe("fail");
  expect(bundle.checks.find((check) => check.id === "fc-preflight-outputs").status)
    .toBe("fail");
});

test("FC evidence cannot complete when receiver-link state is unknown", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "fc-status.json",
      text: JSON.stringify({
        ...fcStatusEvidence,
        state: { ...fcStatusEvidence.state, link_live: null },
      }),
    },
    { name: "fc-preflight.txt", text: fcPreflightEvidence },
  ], {
    expectedFc: { firmwareFamily: "aerialkit" },
  });

  expect(bundle.fcEvidence.evidenceComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "fc-status-link").status)
    .toBe("unverified");
});

test("Betaflight evidence cannot pass from synthetic MSP link state or failsafe bits", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "fc-status.json",
      text: JSON.stringify({
        ...fcStatusEvidence,
        identity: "protocol=betaflight product=BTFL firmware=2026.6.1",
      }),
    },
    {
      name: "fc-preflight.txt",
      text: "armed=0 arming_disable_flags=0x104",
    },
  ], {
    expectedFc: { firmwareFamily: "betaflight" },
  });

  expect(bundle.fcEvidence.evidenceComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "fc-status-link").status)
    .toBe("unverified");
  expect(
    bundle.checks.find(
      (check) => check.id === "fc-preflight-arming-disable-failsafe",
    ).status,
  ).toBe("fail");
});

test("fresh Betaflight RC evidence establishes a receiver observation without claiming RF", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "fc-status.json",
      text: JSON.stringify({
        ...fcStatusEvidence,
        identity: "protocol=betaflight product=BTFL firmware=2026.6.1",
      }),
    },
    {
      name: "fc-preflight.json",
      text: JSON.stringify({
        protocol: "betaflight",
        verdict: "pass",
        armed: 0,
        arming_disable_flags: 0,
        receiver_link: "not_represented_by_msp",
      }),
    },
    {
      name: "fc-rc.json",
      text: JSON.stringify({
        protocol: "betaflight",
        link_live: null,
        channels: [172, 992, 1811, 992, 992, 992, 992, 992],
        observed_at: Date.now() / 1000,
      }),
    },
  ], {
    expectedFc: { firmwareFamily: "betaflight" },
  });

  expect(bundle).toMatchObject({
    kind: "fc-evidence",
    fileOverall: "FC status, RC, and preflight reviewed",
    fcEvidence: {
      evidenceComplete: true,
      rcEvidenceComplete: true,
    },
    bundle: {
      fcEvidenceCount: 3,
    },
  });
  expect(bundle.checks.find((check) => check.id === "fc-status-link")).toMatchObject({
    status: "pass",
    detail: expect.stringMatching(/does not prove RF/i),
  });
});

test("standalone FC RC evidence is recognized but never becomes flight verification", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "fc-rc.json",
      text: JSON.stringify({
        protocol: "betaflight",
        channels: [172, 992, 1811, 992, 992, 992, 992, 992],
        observed_at: Date.now() / 1000,
      }),
    },
  ], {
    expectedFc: { firmwareFamily: "betaflight" },
  });

  expect(bundle).toMatchObject({
    kind: "fc-rc",
    fileOverall: "FC RC observation reviewed",
    fcEvidence: {
      evidenceComplete: false,
      rcEvidenceComplete: true,
      hardwareVerifiedByRotorBench: false,
    },
  });
});

test("FC parameter snapshots diff against the staged plan and block completion on mismatch", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "fc-status.json", text: JSON.stringify(fcStatusEvidence) },
    { name: "fc-preflight.txt", text: fcPreflightEvidence },
    {
      name: "fc-params.txt",
      text: "arm_channel=6 status=0\nrc_min=172 status=0",
    },
  ], {
    expectedFc: {
      firmwareFamily: "aerialkit",
      plan: { armChannel: 5, rcMin: 172 },
    },
  });

  expect(bundle.kind).toBe("fc-evidence");
  expect(bundle.fcEvidence.evidenceComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "fc-param-arm-channel").status)
    .toBe("fail");
  expect(bundle.checks.find((check) => check.id === "fc-param-rc-min").status)
    .toBe("pass");
});

test("FC evidence stays incomplete when a planned parameter is absent", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "fc-status.json", text: JSON.stringify(fcStatusEvidence) },
    { name: "fc-preflight.txt", text: fcPreflightEvidence },
    { name: "fc-params.txt", text: "arm_channel=5 status=0" },
  ], {
    expectedFc: {
      firmwareFamily: "aerialkit",
      plan: { armChannel: 5, modeChannel: 6, rcMin: 172 },
    },
  });

  expect(bundle.fcEvidence.evidenceComplete).toBe(false);
  expect(bundle.checks.find((check) => check.id === "fc-param-mode-channel").status)
    .toBe("unverified");
  expect(bundle.checks.find((check) => check.id === "fc-param-rc-min").status)
    .toBe("unverified");
});

test("standalone FC parameter snapshots are recognized as read-only evidence", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "fc-params.txt", text: "arm_channel=5 status=0" },
  ], {
    expectedFc: { plan: { armChannel: 5 } },
  });

  expect(bundle.kind).toBe("fc-parameters");
  expect(bundle.fileOverall).toBe("FC parameter snapshot reviewed");
  expect(bundle.bundle.parameterCount).toBe(1);
  expect(bundle.fcEvidence.parameterCoverageComplete).toBe(true);
  expect(bundle.fcEvidence.parameters.values.arm_channel).toBe("5");
  expect(bundle.checks.find((check) => check.id === "fc-param-arm-channel").status)
    .toBe("pass");
});

test("standalone Aerial Kit identity preserves an absent capability word", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "fc-identity.json",
      text: JSON.stringify({
        protocol: "akp",
        version: 48,
        product: "aerialkit-f405",
        parameter_count: 46,
        changed: "0",
        features: null,
        config_hash: null,
        feature_names: [],
      }),
    },
  ], {
    expectedFc: { firmwareFamily: "aerialkit" },
  });

  expect(bundle).toMatchObject({
    kind: "fc-identity",
    fileOverall: "FC identity reviewed; capability word absent",
    fcEvidence: {
      identity: {
        capabilityState: "absent",
        features: null,
        hardwareVerifiedByRotorBench: false,
      },
    },
  });
  expect(bundle.checks.find((check) => check.id === "fc-identity-protocol").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-identity-capability-word"))
    .toMatchObject({
      status: "unverified",
      detail: expect.stringMatching(/unknown rather than empty/i),
    });
});

test("reviews a downloaded live AKP snapshot as read-only hardware evidence", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "aerialkit-live-status.json",
      text: JSON.stringify({
        schema: "rotorbench.aerial-kit-live-status.v1",
        hello: {
          protocolVersion: 1,
          product: "aerialkit-f405",
          parameterCount: 46,
          changed: "0",
          features: (1 << 0) | (1 << 4),
          configHash: 0x12345678,
        },
        status: {
          flightState: 0,
          linkLive: 1,
          gpsFixType: 3,
          gpsSatellites: 11,
          rollDeg: 1,
          pitchDeg: 2,
          yawDeg: 3,
          observedAt: new Date().toISOString(),
        },
        armedState: { fresh: true, state: "disarmed" },
        rc: {
          status: "ok",
          channels: [172, 1811, 992, 1000],
          flagNames: ["link", "decoded"],
          counters: { frames: 40 },
          observedAt: new Date().toISOString(),
        },
        parameters: [
          { index: 0, name: "arm_channel", value: "5" },
          { index: 1, name: "dshot_khz", value: "300" },
        ],
      }),
    },
  ], {
    expectedFc: { firmwareFamily: "aerialkit" },
  });

  expect(bundle).toMatchObject({
    kind: "fc-live-status",
    fileOverall: "Live AKP status reviewed; preflight not observed",
    fcEvidence: {
      liveStatus: {
        kind: "fc-live-status",
        identity: { product: "aerialkit-f405" },
        status: { state: { armed: 0 } },
        rc: { channels: [172, 1811, 992, 1000] },
        parameters: {
          format: "aerial-kit",
          values: {
            arm_channel: "5",
            dshot_khz: "300",
          },
        },
      },
      hardwareVerifiedByRotorBench: false,
    },
  });
  expect(bundle.checks.find((check) => check.id === "fc-status-protocol").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-status-disarmed").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-status-link").status)
    .toBe("pass");
});

test("reviews an ExpressLRS menu inventory without claiming RF verification", () => {
  const bundle = parseBenchEvidenceBundle([
    {
      name: "elrs-menu.json",
      text: JSON.stringify({
        schema: "rotorbench.elrs-device-menu.v1",
        targetName: "Nomad DBR4",
        role: "rx",
        logicalBaud: 420000,
        device: {
          name: "Nomad DBR4",
          hardwareVersion: 1,
          softwareVersion: 4,
          parameterCount: 1,
          parameterVersion: 3,
        },
        parameters: [{
          id: 1,
          parent: 0,
          kind: "selection",
          name: "Packet Rate",
          options: ["50Hz", "100Hz"],
          value: 1,
          min: 0,
          max: 1,
          units: "Hz",
        }],
        diagnostics: { validFrames: 2 },
        boundaries: {
          readOnlyMenuQueriesOnly: true,
          writesAllowed: false,
          commandsExecuted: false,
          rfPathVerified: false,
          hardwareVerifiedByRotorBench: false,
        },
      }),
    },
  ], {
    expectedRadio: {
      targetName: "Nomad DBR4",
      role: "rx",
      rxBaud: 420000,
    },
    expectedSettings: {
      packetRateMode: "100-full",
    },
  });

  expect(bundle).toMatchObject({
    kind: "radio-menu-inventory",
    fileOverall: "ExpressLRS menu inventory reviewed; hardware remains unverified",
    hardwareVerifiedByRotorBench: false,
    rfEvidenceComplete: false,
    bundle: {
      radioMenuCount: 1,
      radioMenuParameters: {
        entries: [{
          name: "Packet Rate",
          value: "100Hz · index 1",
        }],
      },
    },
  });
  expect(bundle.checks.find((check) => check.id === "elrs-menu-read-only").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "elrs-menu-field-count").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "settings-packet-rate"))
    .toMatchObject({
      status: "pass",
    });
});

test("radio status evidence correlates identity without retaining device paths", () => {
  const bundle = parseBenchEvidenceBundle([
    { name: "tx-status.json", text: JSON.stringify(radioStatusEvidence) },
  ], {
    expectedRadio: {
      role: "tx",
      txBaud: 400000,
      targetName: "Aerial Kit ELRS USB TX Rev A3",
      firmwareVersion: "ExpressLRS 4.1.0",
    },
  });

  expect(bundle).toMatchObject({
    kind: "radio-status-evidence",
    fileOverall: "Radio device identity reviewed",
    radioDeviceEvidence: {
      evidenceComplete: true,
      hardwareVerifiedByRotorBench: false,
      reports: [{ role: "tx", product: "Aerial Kit Rev A3" }],
    },
  });
  expect(bundle.checks.find((check) => check.id === "radio-status-role").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "radio-status-baud").status)
    .toBe("pass");
  expect(JSON.stringify(bundle)).not.toContain("/dev/tty");
  expect(JSON.stringify(bundle)).not.toContain("SER123");
});

test("validates a standalone bounded Aerial Kit log artifact against its frames", () => {
  const record = {
    status: "record",
    source: 0,
    sourceName: "fast",
    index: 0,
    record: {
      index: 0,
      version: 4,
      bytes: 87,
      timeMs: 100,
      gyro: [1, 2, 3],
      accel: [4, 5, 6],
      rollDeg: 1,
      pitchDeg: 2,
      yawDeg: 3,
      altMm: 1000,
      stick: [10, 20, 30, 40],
      torque: [1, 2, 3],
      motors: [11, 12, 13, 14],
      state: 0,
      flags: 0x10,
      lat: 0,
      lon: 0,
      gyroFiltered: [7, 8, 9],
      notchHz: [120, 130, 140],
      notchEngaged: [1, 0, 2],
      timeUs: 987654,
      rateSetpoint: [10, 20, 30],
      pidP: [1, 2, 3],
      pidI: [4, 5, 6],
      pidD: [7, 8, 9],
      vbatMv: 15800,
    },
  };
  const exported = createAerialKitLogExport({
    targetName: "Aerial Kit F405",
    inventory: [{
      requestedSource: 0,
      sourceName: "fast",
      status: "available",
      count: 1,
    }],
    sample: {
      source: 0,
      sourceName: "fast",
      first: 0,
      count: 1,
      hz: 20,
      frames: [
        record,
        {
          status: "done",
          source: 0,
          sourceName: "fast",
          index: 1,
          record: null,
        },
      ],
    },
  });
  const bundle = parseBenchEvidenceBundle([{
    name: "log-sample.json",
    text: JSON.stringify(exported),
  }]);

  expect(bundle).toMatchObject({
    kind: "fc-log-sample",
    fileOverall: "Bounded AKP log sample and manifest validated; hardware remains unverified",
    fcEvidence: {
      logSample: {
        sourceName: "fast",
        records: 1,
        holes: 0,
        done: true,
      },
    },
  });
  expect(bundle.checks.find((check) => check.id === "fc-log-manifest").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-log-completion").status)
    .toBe("pass");
  expect(bundle.checks.find((check) => check.id === "fc-log-holes").status)
    .toBe("pass");

  const tampered = JSON.parse(JSON.stringify(exported));
  tampered.manifest.delivery.records = 2;
  expect(() => parseBenchEvidenceBundle([{
    name: "tampered-log-sample.json",
    text: JSON.stringify(tampered),
  }])).toThrow(/manifest does not agree/i);
});
