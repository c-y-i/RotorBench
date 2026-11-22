import {
  AERIALKIT_AIRFRAME_IDS,
  buildFlightControllerCommands,
} from "./flightControllerCommands";
import { getBoardProfile } from "../data/flightControllerProfiles";

const config = {
  firmwareFamily: "aerialkit",
  airframe: "elevonwing",
  dshotKhz: 300,
  servo1Reverse: false,
  servo1TrimUs: 0,
  servo1TravelUs: 500,
  servo2Reverse: true,
  servo2TrimUs: -12,
  servo2TravelUs: 420,
  receiverProtocol: "crsf",
  armChannel: 5,
  modeChannel: 6,
  missionChannel: 7,
  launchChannel: 8,
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
  batteryRthEnabled: true,
  fenceEnabled: true,
  fenceRadiusM: 250,
  fenceCeilingM: 120,
  rthMinAltM: 30,
  gpsMinSats: 8,
  alignRollDeg: 0,
  alignPitchDeg: -1.5,
  alignYawDeg: 90,
  gyroRateHz: 3200,
  pidDenom: 2,
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
  rcSmooth: 1,
  rcSmoothHz: 0,
  rcSmoothFactor: 30,
  rateFfdRoll: 0,
  rateFfdPitch: 0,
  rateFfdYaw: 0,
  ffSmoothFactor: 65,
  ffJitterFactor: 7,
  ffBoost: 15,
  ffMaxRateLimit: 90,
  maxRateDps: 700,
  rateCenterDps: 350,
  rateExpo: 0.4,
  tpaRate: 20,
  tpaBreakpoint: 0.5,
  maxTiltDeg: 35,
  yawRateDps: 350,
  maxDtMs: 50,
  wingDescendBankDeg: 30,
  wingDescendPitchDeg: 8,
  wingDescendThrottle: 0.15,
  fsRecoverMs: 700,
  fsStickThreshold: 0.1,
  rthEnabled: false,
};

test("Aerial Kit preview uses current runtime parameter names and omits save", () => {
  const preview = buildFlightControllerCommands(config);
  expect(preview.supported).toBe(true);
  expect(preview.lines).toEqual(expect.arrayContaining([
    "set airframe 1",
    "set dshot_khz 300",
    "set servo1_reverse 0",
    "set servo1_trim_us 0",
    "set servo1_travel_us 500",
    "set servo2_reverse 1",
    "set servo2_trim_us -12",
    "set servo2_travel_us 420",
    "set rc_protocol 0",
    "set arm_channel 5",
    "set mode_channel 6",
    "set mission_channel 7",
    "set launch_channel 8",
    "set arm_hold_ms 500",
    "set arm_max_tilt_deg 25",
    "set throttle_low 0.05",
    "set rc_timeout_ms 250",
    "set rc_min 172",
    "set rc_mid 992",
    "set rc_max 1811",
    "set rc_deadband 0.02",
    "set vbat_ratio 11",
    "set vbat_cells 0",
    "set vbat_warn_cell 3.5",
    "set vbat_min_cell 3.3",
    "set battery_rth 1",
    "set fence_enable 1",
    "set fence_radius_m 250",
    "set fence_ceiling_m 120",
    "set rth_min_alt_m 30",
    "set launch_throttle 0.7",
    "set launch_climb_deg 18",
    "set launch_timeout_s 5",
    "set gps_min_sats 8",
    "set align_roll_deg 0",
    "set align_pitch_deg -1.5",
    "set align_yaw_deg 90",
    "set gyro_rate_hz 3200",
    "set pid_denom 2",
    "set gyro_lpf1_static_hz 250",
    "set gyro_lpf1_dyn_min_hz 250",
    "set gyro_lpf1_dyn_max_hz 500",
    "set gyro_lpf2_static_hz 500",
    "set dterm_lpf1_static_hz 75",
    "set dterm_lpf1_dyn_min_hz 75",
    "set dterm_lpf1_dyn_max_hz 150",
    "set dterm_lpf2_static_hz 150",
    "set dyn_notch_count 3",
    "set dyn_notch_q 300",
    "set dyn_notch_min_hz 100",
    "set dyn_notch_max_hz 600",
    "set rc_smooth 1",
    "set rc_smooth_hz 0",
    "set rc_smooth_factor 30",
    "set rate_ffd_roll 0",
    "set rate_ffd_pitch 0",
    "set rate_ffd_yaw 0",
    "set ff_smooth_factor 65",
    "set ff_jitter_factor 7",
    "set ff_boost 15",
    "set ff_max_rate_limit 90",
    "set max_rate_dps 700",
    "set rate_center_dps 350",
    "set rate_expo 0.4",
    "set tpa_rate 20",
    "set tpa_breakpoint 0.5",
    "set max_tilt_deg 35",
    "set yaw_rate_dps 350",
    "set max_dt_ms 50",
    "set wing_descend_bank_deg 30",
    "set wing_descend_pitch_deg 8",
    "set wing_descend_throttle 0.15",
    "set fs_recover_ms 700",
    "set fs_stick_threshold 0.1",
    "set rth_enable 0",
    "set velocity_channel 0",
  ]));
  expect(preview.text).not.toMatch(/^save$/m);
  expect(AERIALKIT_AIRFRAME_IDS.quadx).toBe(0);
});

test("omits fixed-wing descent parameters for a quad plan", () => {
  const preview = buildFlightControllerCommands({
    ...config,
    airframe: "quadx",
    wingDescendBankDeg: 60,
    wingDescendPitchDeg: 30,
    wingDescendThrottle: 0.6,
  });

  expect(preview.supported).toBe(true);
  expect(preview.text).not.toContain("set wing_descend_bank_deg");
  expect(preview.text).not.toContain("set wing_descend_pitch_deg");
  expect(preview.text).not.toContain("set wing_descend_throttle");
  expect(preview.text).not.toContain("set fs_recover_ms");
  expect(preview.text).not.toContain("set fs_stick_threshold");
});

test("workspace controller preview includes system-ID excitation settings", () => {
  const workspaceConfig = {
    ...config,
    sysidAxis: 2,
    sysidPattern: 1,
    sysidAmplitude: 0.08,
    sysidDurationMs: 7500,
  };
  const preview = buildFlightControllerCommands(workspaceConfig, {
    profile: getBoardProfile("weact-f405"),
  });

  expect(preview.supported).toBe(true);
  expect(preview.lines).toEqual(expect.arrayContaining([
    "set sysid_axis 2",
    "set sysid_pattern 1",
    "set sysid_amplitude 0.08",
    "set sysid_duration_ms 7500",
  ]));

  const publicPreview = buildFlightControllerCommands(config, {
    profile: getBoardProfile("feather-f405"),
  });
  expect(publicPreview.text).not.toContain("set sysid_axis");
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

test("Betaflight preview carries only the source-backed failsafe throttle write", () => {
  const preview = buildFlightControllerCommands({
    ...config,
    firmwareFamily: "betaflight",
    failsafeThrottle: 1200,
  });
  expect(preview.lines).toEqual(expect.arrayContaining([
    "ak fc get failsafe_throttle --port /dev/ttyACM0",
    "ak fc set failsafe_throttle 1200 --port /dev/ttyACM0 --write",
  ]));
  expect(preview.text).toContain(
    "Confirm Stage 2 uses Landing Mode before changing or relying on failsafe_throttle.",
  );
  expect(preview.text).toContain("--name <exact-setting>");
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
