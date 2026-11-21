import {
  AERIALKIT_AIRFRAME_IDS,
  buildFlightControllerCommands,
} from "./flightControllerCommands";

const config = {
  firmwareFamily: "aerialkit",
  airframe: "elevonwing",
  dshotKhz: 300,
  receiverProtocol: "crsf",
  armChannel: 5,
  modeChannel: 6,
  armHoldMs: 500,
  armMaxTiltDeg: 25,
  throttleLow: 0.05,
  rcTimeoutMs: 250,
  rcMin: 172,
  rcMid: 992,
  rcMax: 1811,
  rcDeadband: 0.02,
  rthEnabled: false,
};

test("Aerial Kit preview uses current runtime parameter names and omits save", () => {
  const preview = buildFlightControllerCommands(config);
  expect(preview.supported).toBe(true);
  expect(preview.lines).toEqual(expect.arrayContaining([
    "set airframe 1",
    "set dshot_khz 300",
    "set rc_protocol 0",
    "set arm_channel 5",
    "set mode_channel 6",
    "set arm_hold_ms 500",
    "set arm_max_tilt_deg 25",
    "set throttle_low 0.05",
    "set rc_timeout_ms 250",
    "set rc_min 172",
    "set rc_mid 992",
    "set rc_max 1811",
    "set rc_deadband 0.02",
    "set rth_enable 0",
    "set velocity_channel 0",
  ]));
  expect(preview.text).not.toMatch(/^save$/m);
  expect(AERIALKIT_AIRFRAME_IDS.quadx).toBe(0);
});

test("Betaflight receives discovery commands but no invented setting names", () => {
  const preview = buildFlightControllerCommands({
    ...config,
    firmwareFamily: "betaflight",
  });
  expect(preview.supported).toBe(true);
  expect(preview.kind).toBe("msp-query");
  expect(preview.text).toContain(
    "ak fc status --port /dev/ttyACM0 --protocol betaflight --json fc-status.json",
  );
  expect(preview.text).toContain(
    "ak fc rc --port /dev/ttyACM0 --protocol betaflight --json fc-rc.json",
  );
  expect(preview.text).toContain("--name <exact-setting>");
  expect(preview.text).not.toContain("set arm_channel");
  expect(preview.reason).toMatch(/Betaflight settings must be addressed by exact name/i);
});

test("INAV does not inherit the Betaflight settings client", () => {
  const preview = buildFlightControllerCommands({
    ...config,
    firmwareFamily: "inav",
  });
  expect(preview.supported).toBe(false);
  expect(preview.text).toBe("");
  expect(preview.reason).toMatch(/Betaflight-specific/i);
});

test("unsupported firmware does not receive invented command syntax", () => {
  const preview = buildFlightControllerCommands({
    ...config,
    firmwareFamily: "ardupilot",
  });
  expect(preview.supported).toBe(false);
  expect(preview.lines).toEqual([]);
  expect(preview.reason).toMatch(/verified against the selected board/i);
});

test("workspace Aerial Kit profiles preview workspace switches, not velocity", () => {
  const preview = buildFlightControllerCommands(
    { ...config, manualChannel: 7, ctrlChannel: 8, sysidChannel: null },
    { profile: { buildScope: "workspace" } },
  );
  expect(preview.supported).toBe(true);
  expect(preview.text).toContain("set manual_channel 7");
  expect(preview.text).toContain("set ctrl_channel 8");
  expect(preview.text).toContain("set sysid_channel 0");
  expect(preview.text).not.toContain("set velocity_channel");
});

test("validation blockers and invalid values suppress executable previews", () => {
  const blocked = buildFlightControllerCommands(config, {
    issues: [{ severity: "error", code: "arm-hold-range" }],
  });
  expect(blocked.supported).toBe(false);
  expect(blocked.text).toBe("");
  expect(blocked.reason).toMatch(/resolve 1 plan blocker/i);

  const invalid = buildFlightControllerCommands({
    ...config,
    armHoldMs: null,
    rcTimeoutMs: Number.NaN,
  });
  expect(invalid.supported).toBe(false);
  expect(invalid.lines).toEqual([]);
  expect(invalid.reason).toMatch(/missing or invalid values/i);
});
