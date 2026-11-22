import {
  AERIALKIT_SERVO_OUTPUTS,
  AIRFRAMES,
  BETAFLIGHT_FAILSAFE_THROTTLE,
  supportsAerialKitWingFailsafe,
} from "../data/flightControllerProfiles";
import { AERIALKIT_FILTER_FIELDS } from "./aerialKitFilters";
import { AERIALKIT_DYNAMIC_NOTCH_FIELDS } from "./aerialKitNotch";
import { AERIALKIT_RC_SMOOTHING_FIELDS } from "./aerialKitRcSmoothing";
import { AERIALKIT_FEED_FORWARD_FIELDS } from "./aerialKitFeedForward";
import { AERIALKIT_PID_RESPONSE_FIELDS } from "./aerialKitPidResponse";

export const AERIALKIT_AIRFRAME_IDS = {
  quadx: 0,
  elevonwing: 1,
  quadx1234: 2,
  quadp: 3,
  y4: 4,
  vtail4: 5,
  tri: 6,
  elevonwingsingle: 7,
};

export const AERIALKIT_RC_PROTOCOL_IDS = {
  crsf: 0,
  sbus: 1,
};

export function buildFlightControllerCommands(
  config = {},
  { issues = [], profile = null } = {},
) {
  if (config.firmwareFamily !== "aerialkit") {
    if (config.firmwareFamily === "betaflight") {
      const failsafeThrottle = Number(config.failsafeThrottle);
      const failsafeThrottleValid = (
        Number.isInteger(failsafeThrottle)
        && failsafeThrottle >= BETAFLIGHT_FAILSAFE_THROTTLE.minPwm
        && failsafeThrottle <= BETAFLIGHT_FAILSAFE_THROTTLE.maxPwm
      );
      const lines = [
        "# Aerial Kit unified FC client preview.",
        "# Reads use the Betaflight MSP client on the selected serial port.",
        "ak fc status --port /dev/ttyACM0 --protocol betaflight --json fc-status.json",
        "ak fc preflight --port /dev/ttyACM0 --protocol betaflight --json fc-preflight.json",
        "ak fc rc --port /dev/ttyACM0 --protocol betaflight --json fc-rc.json",
        "ak fc get failsafe_throttle --port /dev/ttyACM0",
        ...(failsafeThrottleValid
          ? [
              `ak fc set failsafe_throttle ${failsafeThrottle} --port /dev/ttyACM0 --write`,
              "# Confirm Stage 2 uses Landing Mode before changing or relying on failsafe_throttle.",
            ]
          : []),
        "ak fc params --port /dev/ttyACM0 --name <exact-setting>",
        "# Writes require exact setting names, a disarmed aircraft, and --write:",
        "ak fc set <exact-setting> <value> --port /dev/ttyACM0 --write",
      ];
      return {
        supported: true,
        kind: "msp-query",
        lines,
        text: lines.join("\n"),
        reason:
          "Betaflight settings must be addressed by exact name. RotorBench emits only the source-backed failsafe_throttle write; other settings require exact names.",
      };
    }
    if (config.firmwareFamily === "inav") {
      return {
        supported: false,
        lines: [],
        text: "",
        reason:
          "The reviewed ak fc settings client is Betaflight-specific. INAV uses different parameter-group commands, so RotorBench does not generate a write preview for it.",
      };
    }
    return {
      supported: false,
      lines: [],
      text: "",
      reason:
        "No command preview is generated for this firmware family. Its serial, AUX, and mixer syntax must be verified against the selected board configuration.",
    };
  }

  const blockers = issues.filter((issue) => issue.severity === "error");
  if (blockers.length > 0) {
    return {
      supported: false,
      blocked: true,
      lines: [],
      text: "",
      reason: `Resolve ${blockers.length} plan blocker${blockers.length === 1 ? "" : "s"} before copying an executable Aerial Kit preview.`,
    };
  }

  const airframe = AERIALKIT_AIRFRAME_IDS[config.airframe];
  const airframeSpec = AIRFRAMES.find((item) => item.value === config.airframe);
  const activeServoOutputs = AERIALKIT_SERVO_OUTPUTS.slice(
    0,
    airframeSpec?.servos || 0,
  );
  const protocol = AERIALKIT_RC_PROTOCOL_IDS[config.receiverProtocol];
  const finite = (value) => (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
  const integer = (value) => finite(value) && Number.isInteger(Number(value));
  const optionalInteger = (value) => value == null || integer(value);
  const sysidAxis = config.sysidAxis ?? 0;
  const sysidPattern = config.sysidPattern ?? 0;
  const sysidAmplitude = config.sysidAmplitude ?? 0.1;
  const sysidDurationMs = config.sysidDurationMs ?? 5000;
  const validPlan =
    Number.isInteger(airframe) &&
    integer(config.dshotKhz) &&
    Number.isInteger(protocol) &&
    integer(config.armChannel) &&
    integer(config.modeChannel) &&
    integer(config.rcMin) &&
    integer(config.rcMid) &&
    integer(config.rcMax) &&
    finite(config.rcDeadband) &&
    optionalInteger(config.velocityChannel) &&
    optionalInteger(config.missionChannel) &&
    optionalInteger(config.launchChannel) &&
    optionalInteger(config.manualChannel) &&
    optionalInteger(config.ctrlChannel) &&
    optionalInteger(config.sysidChannel) &&
    (profile?.buildScope !== "workspace"
      || (
        integer(sysidAxis)
        && integer(sysidPattern)
        && finite(sysidAmplitude)
        && integer(sysidDurationMs)
      )) &&
    integer(config.armHoldMs) &&
    finite(config.armMaxTiltDeg) &&
    finite(config.throttleLow) &&
    integer(config.rcTimeoutMs) &&
    finite(config.vbatRatio) &&
    integer(config.vbatCells) &&
    finite(config.vbatWarnCell) &&
    finite(config.vbatMinCell) &&
    typeof config.batteryRthEnabled === "boolean" &&
    typeof config.fenceEnabled === "boolean" &&
    finite(config.fenceRadiusM) &&
    finite(config.fenceCeilingM) &&
    finite(config.rthMinAltM) &&
    finite(config.launchThrottle) &&
    finite(config.launchClimbDeg) &&
    integer(config.launchTimeoutS) &&
    integer(config.gpsMinSats) &&
    finite(config.alignRollDeg) &&
    finite(config.alignPitchDeg) &&
    finite(config.alignYawDeg) &&
    integer(config.gyroRateHz) &&
    integer(config.pidDenom) &&
    AERIALKIT_FILTER_FIELDS.every(({ key }) => (
      finite(config[key])
      && Number(config[key]) >= 0
      && Number(config[key]) <= 1000
    )) &&
    AERIALKIT_DYNAMIC_NOTCH_FIELDS.every(({ key }) => finite(config[key])) &&
    integer(config.dynNotchCount) &&
    Number(config.dynNotchCount) >= 0 &&
    Number(config.dynNotchCount) <= 5 &&
    Number(config.dynNotchQ) >= 1 &&
    Number(config.dynNotchQ) <= 1000 &&
    Number(config.dynNotchMinHz) >= 20 &&
    Number(config.dynNotchMinHz) <= 250 &&
    Number(config.dynNotchMaxHz) >= 200 &&
    Number(config.dynNotchMaxHz) <= 1000 &&
    integer(config.rcSmooth) &&
    [0, 1].includes(Number(config.rcSmooth)) &&
    finite(config.rcSmoothHz) &&
    Number(config.rcSmoothHz) >= 0 &&
    Number(config.rcSmoothHz) <= 250 &&
    finite(config.rcSmoothFactor) &&
    Number(config.rcSmoothFactor) >= 0 &&
    Number(config.rcSmoothFactor) <= 250 &&
    AERIALKIT_FEED_FORWARD_FIELDS.every(({ key }) => finite(config[key])) &&
    [config.rateFfdRoll, config.rateFfdPitch, config.rateFfdYaw]
      .every((value) => Number(value) >= 0 && Number(value) <= 0.5) &&
    Number(config.ffSmoothFactor) >= 0 &&
    Number(config.ffSmoothFactor) <= 95 &&
    Number(config.ffJitterFactor) >= 0 &&
    Number(config.ffJitterFactor) <= 20 &&
    Number(config.ffBoost) >= 0 &&
    Number(config.ffBoost) <= 50 &&
    Number(config.ffMaxRateLimit) >= 0 &&
    Number(config.ffMaxRateLimit) <= 150 &&
    AERIALKIT_PID_RESPONSE_FIELDS.every(({ key }) => finite(config[key])) &&
    [config.rateFfRoll, config.rateFfPitch, config.rateFfYaw]
      .every((value) => Number(value) >= 0 && Number(value) <= 2) &&
    Number(config.itermRelaxHz) >= 0 &&
    Number(config.itermRelaxHz) <= 100 &&
    finite(config.maxRateDps) &&
    finite(config.rateCenterDps) &&
    finite(config.rateExpo) &&
    finite(config.tpaRate) &&
    finite(config.tpaBreakpoint) &&
    finite(config.maxTiltDeg) &&
    finite(config.yawRateDps) &&
    integer(config.maxDtMs) &&
    (!supportsAerialKitWingFailsafe(config.airframe)
      || (
        finite(config.wingDescendBankDeg)
        && finite(config.wingDescendPitchDeg)
        && finite(config.wingDescendThrottle)
        && integer(config.fsRecoverMs)
        && finite(config.fsStickThreshold)
      )) &&
    activeServoOutputs.every((servo) => (
      typeof config[servo.reverseKey] === "boolean" &&
      finite(config[servo.trimKey]) &&
      integer(config[servo.travelKey])
    ));

  if (!validPlan) {
    return {
      supported: false,
      blocked: true,
      lines: [],
      text: "",
      reason: "The plan contains missing or invalid values. Resolve validation blockers before copying an executable preview.",
    };
  }

  const lines = [
    "# Aerial Kit console preview. Review each line before using it.",
    "# RotorBench does not send or save these commands.",
  ];
  lines.push(`set airframe ${airframe}`);
  lines.push(`set dshot_khz ${Number(config.dshotKhz)}`);
  activeServoOutputs.forEach((servo) => {
    lines.push(
      `set servo${servo.output}_reverse ${config[servo.reverseKey] ? 1 : 0}`,
      `set servo${servo.output}_trim_us ${Number(config[servo.trimKey])}`,
      `set servo${servo.output}_travel_us ${Number(config[servo.travelKey])}`,
    );
  });
  lines.push(`set rc_protocol ${protocol}`);
  lines.push(`set arm_channel ${Number(config.armChannel)}`);
  lines.push(`set mode_channel ${Number(config.modeChannel)}`);
  if (profile?.buildScope === "workspace") {
    lines.push(
      `set manual_channel ${Number(config.manualChannel ?? 0)}`,
      `set ctrl_channel ${Number(config.ctrlChannel ?? 0)}`,
      `set sysid_channel ${Number(config.sysidChannel ?? 0)}`,
      `set sysid_axis ${Number(sysidAxis)}`,
      `set sysid_pattern ${Number(sysidPattern)}`,
      `set sysid_amplitude ${Number(sysidAmplitude)}`,
      `set sysid_duration_ms ${Number(sysidDurationMs)}`,
    );
  } else {
    lines.push(`set velocity_channel ${Number(config.velocityChannel ?? 0)}`);
  }
  lines.push(`set mission_channel ${Number(config.missionChannel ?? 0)}`);
  lines.push(`set launch_channel ${Number(config.launchChannel ?? 0)}`);
  lines.push(
    `set arm_hold_ms ${Number(config.armHoldMs)}`,
    `set arm_max_tilt_deg ${Number(config.armMaxTiltDeg)}`,
    `set throttle_low ${Number(config.throttleLow)}`,
    `set rc_timeout_ms ${Number(config.rcTimeoutMs)}`,
    `set rc_min ${Number(config.rcMin)}`,
    `set rc_mid ${Number(config.rcMid)}`,
    `set rc_max ${Number(config.rcMax)}`,
    `set rc_deadband ${Number(config.rcDeadband)}`,
    `set vbat_ratio ${Number(config.vbatRatio)}`,
    `set vbat_cells ${Number(config.vbatCells)}`,
    `set vbat_warn_cell ${Number(config.vbatWarnCell)}`,
    `set vbat_min_cell ${Number(config.vbatMinCell)}`,
    `set battery_rth ${config.batteryRthEnabled ? 1 : 0}`,
    `set fence_enable ${config.fenceEnabled ? 1 : 0}`,
    `set fence_radius_m ${Number(config.fenceRadiusM)}`,
    `set fence_ceiling_m ${Number(config.fenceCeilingM)}`,
    `set rth_min_alt_m ${Number(config.rthMinAltM)}`,
    `set launch_throttle ${Number(config.launchThrottle)}`,
    `set launch_climb_deg ${Number(config.launchClimbDeg)}`,
    `set launch_timeout_s ${Number(config.launchTimeoutS)}`,
    `set gps_min_sats ${Number(config.gpsMinSats)}`,
    `set align_roll_deg ${Number(config.alignRollDeg)}`,
    `set align_pitch_deg ${Number(config.alignPitchDeg)}`,
    `set align_yaw_deg ${Number(config.alignYawDeg)}`,
    `set gyro_rate_hz ${Number(config.gyroRateHz)}`,
    `set pid_denom ${Number(config.pidDenom)}`,
    ...AERIALKIT_FILTER_FIELDS.map(({ key, runtimeName }) => (
      `set ${runtimeName} ${Number(config[key])}`
    )),
    ...AERIALKIT_DYNAMIC_NOTCH_FIELDS.map(({ key, runtimeName }) => (
      `set ${runtimeName} ${Number(config[key])}`
    )),
    ...AERIALKIT_RC_SMOOTHING_FIELDS.map(({ key, runtimeName }) => (
      `set ${runtimeName} ${Number(config[key])}`
    )),
    ...AERIALKIT_FEED_FORWARD_FIELDS.map(({ key, runtimeName }) => (
      `set ${runtimeName} ${Number(config[key])}`
    )),
    ...AERIALKIT_PID_RESPONSE_FIELDS.map(({ key, runtimeName }) => (
      `set ${runtimeName} ${Number(config[key])}`
    )),
    `set max_rate_dps ${Number(config.maxRateDps)}`,
    `set rate_center_dps ${Number(config.rateCenterDps)}`,
    `set rate_expo ${Number(config.rateExpo)}`,
    `set tpa_rate ${Number(config.tpaRate)}`,
    `set tpa_breakpoint ${Number(config.tpaBreakpoint)}`,
    `set max_tilt_deg ${Number(config.maxTiltDeg)}`,
    `set yaw_rate_dps ${Number(config.yawRateDps)}`,
    `set max_dt_ms ${Number(config.maxDtMs)}`,
  );
  if (supportsAerialKitWingFailsafe(config.airframe)) {
    lines.push(
      `set wing_descend_bank_deg ${Number(config.wingDescendBankDeg)}`,
      `set wing_descend_pitch_deg ${Number(config.wingDescendPitchDeg)}`,
      `set wing_descend_throttle ${Number(config.wingDescendThrottle)}`,
      `set fs_recover_ms ${Number(config.fsRecoverMs)}`,
      `set fs_stick_threshold ${Number(config.fsStickThreshold)}`,
    );
  }
  lines.push(`set rth_enable ${config.rthEnabled ? 1 : 0}`);

  return {
    supported: true,
    lines,
    text: lines.join("\n"),
    reason: "",
  };
}
