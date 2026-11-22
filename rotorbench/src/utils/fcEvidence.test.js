import {
  fcEvidenceChecks,
  fcIdentityChecks,
  fcParameterChecks,
  fcRcChecks,
  parseAerialKitLiveStatusJson,
  parseFcIdentityJson,
  parseFcPreflightJson,
  parseFcPreflightText,
  parseFcParameterSnapshotText,
  parseFcRcJson,
  parseFcStatusJson,
} from "./fcEvidence";

test("keeps an absent Aerial Kit capability word distinct from zero", () => {
  const absent = parseFcIdentityJson({
    protocol: "akp",
    version: 48,
    product: "aerialkit-f405",
    parameter_count: 46,
    changed: "0",
    features: null,
    config_hash: null,
  });
  const empty = parseFcIdentityJson({
    protocol: "akp",
    version: 48,
    product: "aerialkit-empty",
    parameter_count: 46,
    changed: "0",
    features: 0,
    config_hash: 0,
  });

  expect(absent).toMatchObject({
    kind: "fc-identity",
    protocolVersion: 48,
    capabilityState: "absent",
    features: null,
    featureNames: [],
  });
  expect(absent).not.toHaveProperty("firmwareVersion");
  expect(empty).toMatchObject({
    capabilityState: "reported",
    features: 0,
    featureNames: [],
  });
  expect(fcIdentityChecks(absent, { firmwareFamily: "aerialkit" })
    .find((check) => check.id === "fc-identity-capability-word"))
    .toMatchObject({
      status: "unverified",
      detail: expect.stringMatching(/predates the field/i),
    });
  expect(fcIdentityChecks(empty, { firmwareFamily: "aerialkit" })
    .find((check) => check.id === "fc-identity-capability-word"))
    .toMatchObject({
      status: "pass",
      detail: expect.stringMatching(/0x00000000/i),
    });
});

test("decodes capability bits without trusting a supplied feature-name list", () => {
  const identity = parseFcIdentityJson({
    protocol: "akp",
    version: 49,
    product: "aerialkit-f405",
    parameter_count: 46,
    changed: "2",
    features: (1 << 0) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 16),
    feature_names: ["APPLIES_ON_WRITE"],
    config_hash: 0x12345678,
  });
  const checks = fcIdentityChecks(identity, { firmwareFamily: "aerialkit" });

  expect(identity.featureNames).toEqual([
    "PARAM_INFO",
    "APPLIES_ON_WRITE",
    "GATES_ON_ARMED",
    "RC_CHANNELS",
  ]);
  expect(identity.unrecognizedFeatureMask).toBe(1 << 16);
  expect(checks.find((check) => check.id === "fc-capability-param-info").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-capability-preflight").status)
    .toBe("unverified");
});

test("normalizes a live AKP snapshot without upgrading stale state", () => {
  const parsed = parseAerialKitLiveStatusJson({
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
      observedAt: "2026-11-22T10:00:00.000Z",
    },
    armedState: { fresh: true, state: "disarmed" },
    rc: {
      status: "ok",
      channels: [172, 1811, 992, 1000],
      flagNames: ["link", "decoded"],
      counters: { frames: 40 },
      observedAt: "2026-11-22T10:00:00.000Z",
    },
    parameters: [
      { index: 0, name: "rate_kp_roll", value: "0.250" },
      { index: 1, name: "dshot_khz", value: "600" },
    ],
    parameterMetadata: [{
      index: 0,
      name: "rate_kp_roll",
      groupName: "rates",
      typeName: "float",
      min: "0.000",
      max: "3.000",
      default: "0.250",
      help: "Rate-loop proportional gain.",
    }],
    sensorMetadata: [{
      topic: 0,
      topicName: "IMU",
      status: "present",
      present: true,
      driver: "BMI270",
      body: {
        driver: "BMI270",
        absent: 0,
        absentReason: null,
        whoami: 66,
        accelMg: [0, 0, 1000],
        gyroMradS: [2, 3, 4],
        alignDeg: [0, 0, 0],
        gyroBiasMdps: [0, 0, 0],
        samples: 1234,
        errors: 2,
      },
    }],
    outputMetadata: {
      status: "ok",
      count: 4,
      motors: 4,
      servos: 0,
      capPercent: 15,
      outputs: [],
    },
    preflight: {
      status: "ok",
      observedAt: "2026-11-22T10:00:00.000Z",
      lines: [
        {
          name: "clock",
          verdict: 1,
          detail: "clock on the crystal",
        },
        {
          name: "receiver",
          verdict: 2,
          detail: "receiver: 8412 bytes",
        },
      ],
    },
    performance: {
      status: "ok",
      observedAt: "2026-11-22T10:00:00.000Z",
      loops: 1200,
      samples: 1190,
      nominalUs: 500,
      periodLastUs: 503,
      periodMinUs: 496,
      periodMaxUs: 612,
      late: 4,
      jitterP50Us: 12,
      jitterP99Us: 31,
      jitterMaxUs: 72,
      jitterOver: 11,
      sectionAvgUsX10: [21, 22, 23, 24, 25],
      sectionMaxUs: [30, 31, 32, 33, 34],
      loadPermille: 123,
    },
    motorTelemetry: {
      status: "ok",
      observedAt: "2026-11-22T10:00:00.000Z",
      count: 1,
      poles: 14,
      motors: [{
        flags: 0x1f,
        erpm: 100000,
        rpm: 7142,
        temperature: 40,
        maxTemperature: 45,
        millivolts: 24000,
        milliamps: 18000,
        packets: 100,
        invalid: 2,
      }],
    },
    telemetryStream: {
      requestedHz: 20,
      agreedHz: 20,
      frameCount: 2,
      firstUptimeMs: 1000,
      lastUptimeMs: 1050,
      uptimeElapsedMs: 50,
      uptimeWraps: 0,
      uptimeRegressions: 0,
      startedAt: "2026-11-22T10:00:00.000Z",
      stoppedAt: null,
      lastObservedAt: "2026-11-22T10:00:00.050Z",
      latest: {
        uptimeMs: 1050,
        flightState: 1,
        linkLive: 1,
        gpsFixType: 3,
        gpsSatellites: 11,
        rollDeg: 13.5,
        pitchDeg: -2.5,
        yawDeg: 90,
        latitude: 37.6774,
        longitude: -122.4194,
        motors: [10, 20, 30, 40],
      },
    },
    mission: {
      status: "ok",
      op: 0,
      verb: "status",
      active: true,
      requested: true,
      count: 4,
      countCapped: false,
      index: 2,
      channel: 7,
      reached: 2,
      started: 3,
      cancelled: 1,
      holdAltMm: 120000,
      observedAt: "2026-11-22T10:00:00.000Z",
    },
    calibration: {
      status: "done",
      verb: "gyro",
      verbRaw: 1,
      active: true,
      step: null,
      faces: 0,
      facesDone: 0,
      samples: 1000,
      rejected: 3,
      results: [-1, -2, -3, 0, 0, 0],
      resultNames: [
        "bias roll (mdps)",
        "bias pitch (mdps)",
        "bias yaw (mdps)",
      ],
      resultValues: [
        { name: "bias roll (mdps)", value: -1 },
        { name: "bias pitch (mdps)", value: -2 },
        { name: "bias yaw (mdps)", value: -3 },
      ],
      observedAt: "2026-11-22T10:00:00.000Z",
    },
    logInventory: [{
      status: "available",
      requestedSource: 0,
      source: 0,
      sourceName: "fast",
      count: 2,
    }],
    logSample: {
      source: 0,
      sourceName: "fast",
      first: 0,
      count: 1,
      requestedCount: 1,
      hz: 20,
      observedAt: "2026-11-22T10:00:00.000Z",
      frames: [
        {
          status: "record",
          source: 0,
          sourceName: "fast",
          index: 0,
          record: {
            index: 0,
            version: 2,
            bytes: 51,
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
            flags: 0,
            lat: 0,
            lon: 0,
            gyroFiltered: null,
            notchHz: null,
            notchEngaged: null,
            timeUs: null,
            rateSetpoint: null,
            pidP: null,
            pidI: null,
            pidD: null,
            vbatMv: null,
          },
        },
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

  expect(parsed).toMatchObject({
    kind: "fc-live-status",
    identity: {
      product: "aerialkit-f405",
      featureNames: ["PARAM_INFO", "RC_CHANNELS"],
    },
    status: {
      protocol: "akp",
      state: { armed: null, linkLive: 1 },
      liveSource: "web-serial",
    },
    rc: {
      protocol: "akp",
      channels: [172, 1811, 992, 1000],
      linkLive: true,
    },
    parameters: {
      format: "aerial-kit",
      values: {
        rate_kp_roll: "0.250",
        dshot_khz: "600",
      },
      metadata: [{
        name: "rate_kp_roll",
        help: "Rate-loop proportional gain.",
      }],
    },
    parameterMetadata: [{
      name: "rate_kp_roll",
      help: "Rate-loop proportional gain.",
    }],
    sensorMetadata: [{
      topicName: "IMU",
      driver: "BMI270",
      body: {
        driver: "BMI270",
        accelMg: [0, 0, 1000],
        samples: 1234,
      },
    }],
    outputMetadata: {
      motors: 4,
      servos: 0,
      capPercent: 15,
    },
    preflight: {
      protocol: "akp",
      status: "ok",
      passCount: 1,
      factCount: 1,
      lines: [
        {
          name: "clock",
          id: "clock",
          verdict: 1,
          status: "pass",
          label: "Pass",
          detail: "clock on the crystal",
        },
        {
          name: "receiver",
          id: "receiver",
          verdict: 2,
          status: "fact",
          label: "Fact",
          detail: "receiver: 8412 bytes",
        },
      ],
    },
    performance: {
      status: "ok",
      loops: 1200,
      periodLastUs: 503,
      sectionAvgUsX10: [21, 22, 23, 24, 25],
      loadPermille: 123,
    },
    motorTelemetry: {
      status: "ok",
      count: 1,
      poles: 14,
      motors: [{
        measured: true,
        erpm: 100000,
        rpm: 7142,
        temperature: 40,
        millivolts: 24000,
      }],
    },
    telemetryStream: {
      requestedHz: 20,
      agreedHz: 20,
      frameCount: 2,
      uptimeElapsedMs: 50,
      latest: {
        uptimeMs: 1050,
        rollDeg: 13.5,
        motors: [10, 20, 30, 40],
      },
    },
    mission: {
      status: "ok",
      active: true,
      requested: true,
      count: 4,
      index: 2,
      channel: 7,
      holdAltMm: 120000,
    },
    calibration: {
      status: "done",
      verb: "gyro",
      active: true,
      samples: 1000,
      resultValues: [
        { name: "bias roll (mdps)", value: -1 },
        { name: "bias pitch (mdps)", value: -2 },
        { name: "bias yaw (mdps)", value: -3 },
      ],
    },
    logInventory: [{
      status: "available",
      count: 2,
    }],
    logSample: {
      records: 1,
      holes: 0,
      done: true,
      frames: [{
        status: "record",
        record: {
          version: 2,
          bytes: 51,
          timeMs: 100,
        },
      }, {
        status: "done",
        index: 1,
        record: null,
      }],
    },
  });
});

test("keeps a live board's missing preflight checklist unverified", () => {
  const snapshot = {
    schema: "rotorbench.aerial-kit-live-status.v1",
    hello: {
      protocolVersion: 1,
      product: "aerialkit-f405",
      parameterCount: 46,
      changed: "0",
      features: (1 << 9),
      configHash: 0x12345678,
    },
    status: {
      flightState: 0,
      linkLive: 1,
      rollDeg: 0,
      pitchDeg: 0,
      yawDeg: 0,
      gpsFixType: 0,
      gpsSatellites: 0,
      observedAt: new Date().toISOString(),
    },
    armedState: { fresh: true, state: "disarmed" },
    preflight: {
      status: "none",
      observedAt: new Date().toISOString(),
      lines: [],
    },
  };
  const parsed = parseAerialKitLiveStatusJson(snapshot);
  const checks = fcEvidenceChecks(parsed.status, parsed.preflight, {
    firmwareFamily: "aerialkit",
  });
  expect(parsed.preflight).toMatchObject({
    protocol: "akp",
    status: "none",
    passCount: 0,
    failCount: 0,
  });
  expect(checks.find((check) => check.id === "fc-preflight-no-fail"))
    .toMatchObject({
      status: "unverified",
      detail: expect.stringMatching(/not a passing checklist/i),
    });
});

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
    "servo1_reverse=1 status=0",
    "servo1_trim_us=18 status=0",
    "servo1_travel_us=460 status=0",
    "servo2_reverse=0 status=0",
    "servo2_trim_us=-12 status=0",
    "servo2_travel_us=520 status=0",
    "mission_channel=7 status=0",
    "launch_channel=8 status=0",
    "launch_throttle=0.65 status=0",
    "launch_climb_deg=20 status=0",
    "launch_timeout_s=6 status=0",
    "rc_min=172 status=0",
    "rc_deadband=0.02 status=0",
    "vbat_ratio=10.8 status=0",
    "vbat_cells=0 status=0",
    "vbat_warn_cell=3.5 status=0",
    "vbat_min_cell=3.3 status=0",
    "battery_rth=1 status=0",
    "fence_enable=1 status=0",
    "fence_radius_m=250 status=0",
    "fence_ceiling_m=120 status=0",
    "rth_min_alt_m=30 status=0",
    "gps_min_sats=8 status=0",
    "align_roll_deg=0 status=0",
    "align_pitch_deg=0 status=0",
    "align_yaw_deg=90 status=0",
    "gyro_rate_hz=3200 status=0",
    "pid_denom=2 status=0",
    "rth_enable=0 status=0",
  ].join("\n"));
  const checks = fcParameterChecks(snapshot, {
    armChannel: 5,
    modeChannel: 7,
    servo1Reverse: true,
    servo1TrimUs: 18,
    servo1TravelUs: 460,
    servo2Reverse: false,
    servo2TrimUs: -12,
    servo2TravelUs: 520,
    missionChannel: 8,
    launchChannel: 9,
    launchThrottle: 0.7,
    launchClimbDeg: 18,
    launchTimeoutS: 5,
    rcMin: 172,
    rcDeadband: 0.02,
    vbatRatio: 11,
    vbatCells: 0,
    vbatWarnCell: 3.5,
    vbatMinCell: 3.3,
    batteryRthEnabled: false,
    fenceEnabled: false,
    fenceRadiusM: 200,
    fenceCeilingM: 0,
    rthMinAltM: 20,
    gpsMinSats: 6,
    alignRollDeg: 0,
    alignPitchDeg: 0,
    alignYawDeg: 0,
    gyroRateHz: 3200,
    pidDenom: 2,
    rthEnabled: false,
  });

  expect(checks.find((check) => check.id === "fc-param-arm-channel").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-mode-channel").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-servo1-reverse").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-servo1-trim-us").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-servo2-travel-us").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-mission-channel").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-launch-channel").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-launch-throttle").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-launch-climb-deg").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-launch-timeout-s").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-rth-enable").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-vbat-ratio").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-vbat-cells").status)
    .toBe("pass");
  expect(checks.find((check) => check.id === "fc-param-battery-rth").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-fence-enable").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-fence-radius-m").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-fence-ceiling-m").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-rth-min-alt-m").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-gps-min-sats").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-align-yaw-deg").status)
    .toBe("fail");
  expect(checks.find((check) => check.id === "fc-param-gyro-rate-hz").status)
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

test("parses Mission Planner and QGroundControl parameter files", () => {
  const missionPlanner = parseFcParameterSnapshotText(
    [
      "# Mission Planner export",
      "BRD_ALT_CONFIG,1",
      "SERIAL7_PROTOCOL,23",
      "SERIAL7_BAUD,57",
    ].join("\n"),
  );
  expect(missionPlanner).toMatchObject({
    kind: "fc-parameters",
    format: "mission-planner",
    values: {
      brd_alt_config: "1",
      serial7_protocol: "23",
      serial7_baud: "57",
    },
  });

  const qgroundControl = parseFcParameterSnapshotText(
    [
      "# MAV ID COMPONENT ID PARAM NAME VALUE TYPE",
      "1\t1\tBRD_ALT_CONFIG\t1\t6",
      "1\t1\tSERIAL7_PROTOCOL\t23\t6",
    ].join("\n"),
  );
  expect(qgroundControl).toMatchObject({
    kind: "fc-parameters",
    format: "qgroundcontrol",
    values: {
      brd_alt_config: "1",
      serial7_protocol: "23",
    },
  });
});

test("checks the documented H743 UART6 requirements in ArduPilot snapshots", () => {
  const matching = parseFcParameterSnapshotText(
    "BRD_ALT_CONFIG,1\nSERIAL7_PROTOCOL,23",
  );
  const plan = {
    profileId: "matek-h743-wing-v3-ardupilot",
    receiverProtocol: "crsf",
    firmwareFamily: "ardupilot",
  };
  const checks = fcParameterChecks(matching, plan);

  expect(checks.find((check) => check.id === "fc-param-brd-alt-config")).toMatchObject({
    status: "pass",
    detail: expect.stringMatching(/true UART RX on UART6/i),
  });
  expect(checks.find((check) => check.id === "fc-param-serial7-protocol")).toMatchObject({
    status: "pass",
    detail: expect.stringMatching(/CRSF\/ELRS on SERIAL7/i),
  });
  expect(checks.some((check) => check.id === "fc-param-rc-protocol"))
    .toBe(false);

  const mismatch = fcParameterChecks(
    parseFcParameterSnapshotText("BRD_ALT_CONFIG,0\nSERIAL7_PROTOCOL,2"),
    plan,
  );
  expect(mismatch.find((check) => check.id === "fc-param-brd-alt-config").status)
    .toBe("fail");
  expect(mismatch.find((check) => check.id === "fc-param-serial7-protocol").status)
    .toBe("fail");
});

test("uses profile data to check the F405-WMN ArduPilot receiver route", () => {
  const checks = fcParameterChecks(
    parseFcParameterSnapshotText("SERIAL6_PROTOCOL,23"),
    {
      profileId: "matek-f405-wmn-ardupilot",
      receiverProtocol: "crsf",
      firmwareFamily: "ardupilot",
    },
  );

  expect(checks).toHaveLength(1);
  expect(checks[0]).toMatchObject({
    id: "fc-param-serial6-protocol",
    status: "pass",
    detail: expect.stringMatching(/CRSF\/ELRS on SERIAL6\/UART2/i),
  });
});
