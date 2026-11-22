import {
  buildFcEvidencePlanPatch,
  buildRadioEvidencePlanPatch,
  evidencePatchValues,
} from "./evidencePlanAdoption";

test("builds typed FC plan differences from an Aerial Kit parameter snapshot", () => {
  const patch = buildFcEvidencePlanPatch(
    {
      values: {
        airframe: "0",
        dshot_khz: "600",
        servo1_reverse: "1",
        servo1_trim_us: "18",
        servo1_travel_us: "460",
        servo2_reverse: "0",
        servo2_trim_us: "-12",
        servo2_travel_us: "520",
        rc_protocol: "1",
        arm_channel: "5",
        mode_channel: "6",
        velocity_channel: "0",
        mission_channel: "7",
        launch_channel: "8",
        launch_throttle: "0.65",
        launch_climb_deg: "20",
        launch_timeout_s: "6",
        arm_hold_ms: "750",
        arm_max_tilt_deg: "30",
        throttle_low: "0.04",
        rc_timeout_ms: "300",
        rc_min: "170",
        rc_mid: "990",
        rc_max: "1815",
        rc_deadband: "0.01",
        vbat_ratio: "10.8",
        vbat_cells: "0",
        vbat_warn_cell: "3.4",
        vbat_min_cell: "3.3",
        battery_rth: "1",
        fence_enable: "1",
        fence_radius_m: "250",
        fence_ceiling_m: "120",
        rth_min_alt_m: "30",
        gps_min_sats: "8",
        align_roll_deg: "0",
        align_pitch_deg: "0",
        align_yaw_deg: "90",
        gyro_rate_hz: "1600",
        pid_denom: "2",
        rth_enable: "1",
      },
    },
    {
      airframe: "quadx",
      dshotKhz: 300,
      servo1Reverse: false,
      servo1TrimUs: 0,
      servo1TravelUs: 500,
      servo2Reverse: false,
      servo2TrimUs: 0,
      servo2TravelUs: 500,
      receiverProtocol: "crsf",
      armChannel: 5,
      modeChannel: 6,
      velocityChannel: null,
      missionChannel: null,
      launchChannel: null,
      launchThrottle: 0.7,
      launchClimbDeg: 18,
      launchTimeoutS: 5,
      armHoldMs: 500,
      armMaxTiltDeg: 25,
      throttleLow: 0.05,
      rcTimeoutMs: 250,
      rcMin: 172,
      rcMid: 992,
      rcMax: 1811,
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
      pidDenom: 1,
      rthEnabled: false,
    },
  );

  expect(patch.supported).toBe(true);
  expect(patch.matchedCount).toBe(9);
  expect(patch.fields).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "missionChannel", observedValue: 7 }),
    expect.objectContaining({ key: "launchChannel", observedValue: 8 }),
    expect.objectContaining({ key: "launchThrottle", observedValue: 0.65 }),
    expect.objectContaining({ key: "launchClimbDeg", observedValue: 20 }),
    expect.objectContaining({ key: "launchTimeoutS", observedValue: 6 }),
    expect.objectContaining({ key: "dshotKhz", observedValue: 600 }),
    expect.objectContaining({ key: "servo1Reverse", observedValue: true }),
    expect.objectContaining({ key: "servo1TrimUs", observedValue: 18 }),
    expect.objectContaining({ key: "servo1TravelUs", observedValue: 460 }),
    expect.objectContaining({ key: "servo2TrimUs", observedValue: -12 }),
    expect.objectContaining({ key: "servo2TravelUs", observedValue: 520 }),
    expect.objectContaining({ key: "receiverProtocol", observedValue: "sbus" }),
    expect.objectContaining({ key: "vbatRatio", observedValue: 10.8 }),
    expect.objectContaining({ key: "vbatWarnCell", observedValue: 3.4 }),
    expect.objectContaining({ key: "batteryRthEnabled", observedValue: true }),
    expect.objectContaining({ key: "fenceEnabled", observedValue: true }),
    expect.objectContaining({ key: "fenceRadiusM", observedValue: 250 }),
    expect.objectContaining({ key: "fenceCeilingM", observedValue: 120 }),
    expect.objectContaining({ key: "rthMinAltM", observedValue: 30 }),
    expect.objectContaining({ key: "gpsMinSats", observedValue: 8 }),
    expect.objectContaining({ key: "alignYawDeg", observedValue: 90 }),
    expect.objectContaining({ key: "gyroRateHz", observedValue: 1600 }),
    expect.objectContaining({ key: "pidDenom", observedValue: 2 }),
    expect.objectContaining({ key: "rthEnabled", observedValue: true }),
  ]));
  expect(patch.fields.find((field) => field.key === "airframe")).toBeUndefined();
});

test("rejects malformed FC values instead of coercing them into the plan", () => {
  const patch = buildFcEvidencePlanPatch(
    {
      values: {
        dshot_khz: "301",
        arm_hold_ms: "lots",
        arm_channel: "999",
      },
    },
    { dshotKhz: 300, armHoldMs: 500, armChannel: 6 },
  );

  expect(patch.fields).toEqual([]);
  expect(patch.invalidFields.map((field) => field.key)).toEqual(expect.arrayContaining([
    "dshotKhz",
    "armChannel",
    "armHoldMs",
  ]));
  expect(patch.invalidFields).toHaveLength(3);
});

test("adopts reviewed Aerial Kit flight-limit values into typed plan fields", () => {
  const patch = buildFcEvidencePlanPatch(
    {
      values: {
        gyro_lpf1_static_hz: "220",
        gyro_lpf1_dyn_min_hz: "180",
        gyro_lpf1_dyn_max_hz: "430",
        gyro_lpf2_static_hz: "480",
        dterm_lpf1_static_hz: "70",
        dterm_lpf1_dyn_min_hz: "65",
        dterm_lpf1_dyn_max_hz: "140",
        dterm_lpf2_static_hz: "0",
        dyn_notch_count: "4",
        dyn_notch_q: "280",
        dyn_notch_min_hz: "120",
        dyn_notch_max_hz: "580",
        rc_smooth: "1",
        rc_smooth_hz: "0",
        rc_smooth_factor: "35",
        rate_ffd_roll: "0.012",
        rate_ffd_pitch: "0.009",
        rate_ffd_yaw: "0",
        ff_smooth_factor: "60",
        ff_jitter_factor: "8",
        ff_boost: "20",
        ff_max_rate_limit: "85",
        max_rate_dps: "680.5",
        rate_center_dps: "300",
        rate_expo: "0.35",
        tpa_rate: "18",
        tpa_breakpoint: "0.55",
        max_tilt_deg: "40",
        yaw_rate_dps: "320",
        max_dt_ms: "25",
        wing_descend_bank_deg: "24",
        wing_descend_pitch_deg: "7",
        wing_descend_throttle: "0.2",
        fs_recover_ms: "900",
        fs_stick_threshold: "0.15",
        sysid_axis: "2",
        sysid_pattern: "1",
        sysid_amplitude: "0.08",
        sysid_duration_ms: "7500",
      },
    },
    {
      gyroLpf1StaticHz: 250,
      gyroLpf1DynMinHz: 250,
      gyroLpf1DynMaxHz: 500,
      gyroLpf2StaticHz: 500,
      dtermLpf1StaticHz: 75,
      dtermLpf1DynMinHz: 75,
      dtermLpf1DynMaxHz: 150,
      dtermLpf2StaticHz: 150,
      dynNotchCount: 3,
      dynNotchQ: 300,
      dynNotchMinHz: 100,
      dynNotchMaxHz: 600,
      rcSmooth: 0,
      rcSmoothHz: 56,
      rcSmoothFactor: 30,
      rateFfdRoll: 0,
      rateFfdPitch: 0,
      rateFfdYaw: 0.001,
      ffSmoothFactor: 65,
      ffJitterFactor: 7,
      ffBoost: 15,
      ffMaxRateLimit: 90,
      maxRateDps: 700,
      rateCenterDps: 0,
      rateExpo: 0,
      tpaRate: 0,
      tpaBreakpoint: 0.5,
      maxTiltDeg: 35,
      yawRateDps: 350,
      maxDtMs: 50,
      wingDescendBankDeg: 30,
      wingDescendPitchDeg: 8,
      wingDescendThrottle: 0.15,
      fsRecoverMs: 700,
      fsStickThreshold: 0.1,
      sysidAxis: 0,
      sysidPattern: 0,
      sysidAmplitude: 0.1,
      sysidDurationMs: 5000,
    },
  );

  expect(patch.supported).toBe(true);
  expect(patch.fields).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "gyroLpf1StaticHz", observedValue: 220 }),
    expect.objectContaining({ key: "gyroLpf1DynMinHz", observedValue: 180 }),
    expect.objectContaining({ key: "gyroLpf1DynMaxHz", observedValue: 430 }),
    expect.objectContaining({ key: "gyroLpf2StaticHz", observedValue: 480 }),
    expect.objectContaining({ key: "dtermLpf1StaticHz", observedValue: 70 }),
    expect.objectContaining({ key: "dtermLpf1DynMinHz", observedValue: 65 }),
    expect.objectContaining({ key: "dtermLpf1DynMaxHz", observedValue: 140 }),
    expect.objectContaining({
      key: "dtermLpf2StaticHz",
      observedValue: 0,
      observedDisplay: "Disabled",
    }),
    expect.objectContaining({
      key: "dynNotchCount",
      observedValue: 4,
      observedDisplay: "4 per axis",
    }),
    expect.objectContaining({
      key: "dynNotchQ",
      observedValue: 280,
      observedDisplay: "Q 2.8",
    }),
    expect.objectContaining({ key: "dynNotchMinHz", observedValue: 120 }),
    expect.objectContaining({ key: "dynNotchMaxHz", observedValue: 580 }),
    expect.objectContaining({
      key: "rcSmooth",
      observedValue: 1,
      observedDisplay: "On",
    }),
    expect.objectContaining({
      key: "rcSmoothHz",
      observedValue: 0,
      observedDisplay: "Derive from link",
    }),
    expect.objectContaining({ key: "rcSmoothFactor", observedValue: 35 }),
    expect.objectContaining({
      key: "rateFfdRoll",
      observedValue: 0.012,
    }),
    expect.objectContaining({
      key: "rateFfdPitch",
      observedValue: 0.009,
    }),
    expect.objectContaining({
      key: "rateFfdYaw",
      observedValue: 0,
      observedDisplay: "Off",
    }),
    expect.objectContaining({ key: "ffSmoothFactor", observedValue: 60 }),
    expect.objectContaining({ key: "ffJitterFactor", observedValue: 8 }),
    expect.objectContaining({ key: "ffBoost", observedValue: 20 }),
    expect.objectContaining({ key: "ffMaxRateLimit", observedValue: 85 }),
    expect.objectContaining({ key: "maxRateDps", observedValue: 680.5 }),
    expect.objectContaining({ key: "rateCenterDps", observedValue: 300 }),
    expect.objectContaining({ key: "rateExpo", observedValue: 0.35 }),
    expect.objectContaining({ key: "tpaRate", observedValue: 18 }),
    expect.objectContaining({ key: "tpaBreakpoint", observedValue: 0.55 }),
    expect.objectContaining({ key: "maxTiltDeg", observedValue: 40 }),
    expect.objectContaining({ key: "yawRateDps", observedValue: 320 }),
    expect.objectContaining({ key: "maxDtMs", observedValue: 25 }),
    expect.objectContaining({ key: "wingDescendBankDeg", observedValue: 24 }),
    expect.objectContaining({ key: "wingDescendPitchDeg", observedValue: 7 }),
    expect.objectContaining({ key: "wingDescendThrottle", observedValue: 0.2 }),
    expect.objectContaining({ key: "fsRecoverMs", observedValue: 900 }),
    expect.objectContaining({ key: "fsStickThreshold", observedValue: 0.15 }),
    expect.objectContaining({ key: "sysidAxis", observedValue: 2 }),
    expect.objectContaining({ key: "sysidPattern", observedValue: 1 }),
    expect.objectContaining({ key: "sysidAmplitude", observedValue: 0.08 }),
    expect.objectContaining({ key: "sysidDurationMs", observedValue: 7500 }),
  ]));
});

test("builds radio plan differences from module labels", () => {
  const patch = buildRadioEvidencePlanPatch(
    {
      settings: {
        packetRate: { label: "333Hz Full" },
        maxPower: { label: "25" },
        telemetryRatio: { label: "1:128" },
        switchMode: { label: "16ch Rate/2" },
        linkMode: { label: "MAVLink" },
        dynamicPower: { label: "Dyn" },
        modelMatch: { label: "On" },
      },
    },
    {
      packetRateMode: "250",
      powerDbm: -18,
      telemetryRatio: "std",
      switchMode: "wide",
      linkMode: "normal",
      dynamicPower: "off",
      modelMatch: false,
    },
  );

  expect(patch.fields.map((field) => [field.key, field.observedValue])).toEqual([
    ["packetRateMode", "333-full"],
    ["powerDbm", -14],
    ["telemetryRatio", "1:128"],
    ["switchMode", "16ch-rate2"],
    ["linkMode", "mavlink"],
    ["dynamicPower", "dynamic"],
    ["modelMatch", true],
  ]);
});

test("recognizes ExpressLRS short labels without creating false differences", () => {
  const patch = buildRadioEvidencePlanPatch(
    {
      settings: {
        packetRate: { label: "100Hz" },
        telemetryRatio: { label: "Std" },
      },
    },
    {
      packetRateMode: "100-full",
      telemetryRatio: "std",
    },
  );

  expect(patch.supported).toBe(true);
  expect(patch.matchedCount).toBe(2);
  expect(patch.fields).toEqual([]);
});

test("returns only selected typed patch values", () => {
  const patch = {
    supported: true,
    fields: [
      { id: "a", key: "armChannel", observedValue: 5 },
      { id: "b", key: "armHoldMs", observedValue: 750 },
    ],
  };

  expect(evidencePatchValues(patch, ["b"])).toEqual({ armHoldMs: 750 });
});
