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
        rc_protocol: "1",
        arm_channel: "5",
        mode_channel: "6",
        velocity_channel: "0",
        mission_channel: "7",
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
      receiverProtocol: "crsf",
      armChannel: 5,
      modeChannel: 6,
      velocityChannel: null,
      missionChannel: null,
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
  expect(patch.matchedCount).toBe(8);
  expect(patch.fields).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "missionChannel", observedValue: 7 }),
    expect.objectContaining({ key: "dshotKhz", observedValue: 600 }),
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
