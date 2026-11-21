import {
  RADIO_DYNAMIC_POWER,
  RADIO_LINK_MODES,
  RADIO_PACKET_RATES,
  RADIO_POWER_LEVELS,
  RADIO_TELEMETRY_RATIOS,
} from "../data/radioProfiles";
import {
  AERIALKIT_AIRFRAME_IDS,
  AERIALKIT_RC_PROTOCOL_IDS,
} from "./flightControllerCommands";

const INFERRED_AIRFRAMES = Object.fromEntries(
  Object.entries(AERIALKIT_AIRFRAME_IDS).map(([name, id]) => [id, name]),
);
const INFERRED_RC_PROTOCOLS = Object.fromEntries(
  Object.entries(AERIALKIT_RC_PROTOCOL_IDS).map(([name, id]) => [id, name]),
);

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integer(value) {
  const number = finite(value);
  return Number.isInteger(number) ? number : null;
}

function boundedInteger(value, minimum, maximum) {
  const number = integer(value);
  return number != null && number >= minimum && number <= maximum
    ? number
    : null;
}

function optionalChannel(value) {
  const number = integer(value);
  if (number === 0) return null;
  return number != null && number >= 1 && number <= 16 ? number : null;
}

function displayValue(value) {
  if (value == null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
}

function valuesEqual(left, right) {
  if (left == null || left === "") return right == null || right === "";
  return left === right || String(left) === String(right);
}

function buildPatch(snapshot, plan, definitions, { missingReason, unsupportedReason }) {
  if (!snapshot || !plan) {
    return {
      supported: false,
      reason: missingReason,
      fields: [],
      matchedCount: 0,
      invalidFields: [],
    };
  }
  const fields = [];
  const invalidFields = [];
  let matchedCount = 0;
  definitions.forEach((definition) => {
    const raw = snapshot[definition.snapshotKey];
    if (raw == null || raw === "") return;
    const value = definition.parse(raw);
    const validNull = value == null
      && definition.allowNull
      && definition.nullWhen?.(raw);
    if (value == null && !validNull) {
      invalidFields.push({
        key: definition.key,
        label: definition.label,
        rawValue: String(raw),
      });
      return;
    }
    const current = plan[definition.key];
    if (valuesEqual(current, value)) {
      matchedCount += 1;
      return;
    }
    fields.push({
      id: `${definition.key}:${definition.source}`,
      key: definition.key,
      label: definition.label,
      source: definition.source,
      currentValue: current,
      observedValue: value,
      currentDisplay: displayValue(current),
      observedDisplay: definition.display
        ? definition.display(value, raw)
        : displayValue(value),
    });
  });
  if (!fields.length && !invalidFields.length && matchedCount === 0) {
    return {
      supported: false,
      reason: unsupportedReason,
      fields: [],
      matchedCount: 0,
      invalidFields: [],
    };
  }
  return {
    supported: true,
    reason: null,
    fields,
    matchedCount,
    invalidFields,
  };
}

export function buildFcEvidencePlanPatch(snapshot, plan) {
  const definitions = [
    {
      key: "airframe",
      source: "airframe",
      snapshotKey: "airframe",
      label: "Airframe",
      parse: (raw) => INFERRED_AIRFRAMES[boundedInteger(raw, 0, 7)] || null,
      display: (value, raw) => `${value} (${raw})`,
    },
    {
      key: "dshotKhz",
      source: "dshot_khz",
      snapshotKey: "dshot_khz",
      label: "DShot rate",
      parse: (raw) => [150, 300, 600].includes(Number(raw)) ? Number(raw) : null,
      display: (value) => `${value} kHz`,
    },
    {
      key: "receiverProtocol",
      source: "rc_protocol",
      snapshotKey: "rc_protocol",
      label: "Receiver protocol",
      parse: (raw) => INFERRED_RC_PROTOCOLS[boundedInteger(raw, 0, 1)] || null,
    },
    {
      key: "armChannel",
      source: "arm_channel",
      snapshotKey: "arm_channel",
      label: "Arm channel",
      parse: optionalChannel,
      allowNull: true,
      nullWhen: (raw) => Number(raw) === 0,
    },
    {
      key: "modeChannel",
      source: "mode_channel",
      snapshotKey: "mode_channel",
      label: "Flight-mode channel",
      parse: optionalChannel,
      allowNull: true,
      nullWhen: (raw) => Number(raw) === 0,
    },
    {
      key: "velocityChannel",
      source: "velocity_channel",
      snapshotKey: "velocity_channel",
      label: "Velocity channel",
      parse: optionalChannel,
      allowNull: true,
      nullWhen: (raw) => Number(raw) === 0,
    },
    {
      key: "manualChannel",
      source: "manual_channel",
      snapshotKey: "manual_channel",
      label: "Manual channel",
      parse: optionalChannel,
      allowNull: true,
      nullWhen: (raw) => Number(raw) === 0,
    },
    {
      key: "ctrlChannel",
      source: "ctrl_channel",
      snapshotKey: "ctrl_channel",
      label: "Control channel",
      parse: optionalChannel,
      allowNull: true,
      nullWhen: (raw) => Number(raw) === 0,
    },
    {
      key: "sysidChannel",
      source: "sysid_channel",
      snapshotKey: "sysid_channel",
      label: "System ID channel",
      parse: optionalChannel,
      allowNull: true,
      nullWhen: (raw) => Number(raw) === 0,
    },
    {
      key: "armHoldMs",
      source: "arm_hold_ms",
      snapshotKey: "arm_hold_ms",
      label: "Arm hold",
      parse: (raw) => boundedInteger(raw, 0, 5000),
      display: (value) => `${value} ms`,
    },
    {
      key: "armMaxTiltDeg",
      source: "arm_max_tilt_deg",
      snapshotKey: "arm_max_tilt_deg",
      label: "Maximum arm tilt",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 0 && number <= 180 ? number : null;
      },
      display: (value) => `${value}°`,
    },
    {
      key: "throttleLow",
      source: "throttle_low",
      snapshotKey: "throttle_low",
      label: "Low-throttle gate",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 0 && number <= 0.5 ? number : null;
      },
    },
    {
      key: "rcTimeoutMs",
      source: "rc_timeout_ms",
      snapshotKey: "rc_timeout_ms",
      label: "Receiver timeout",
      parse: (raw) => boundedInteger(raw, 50, 2000),
      display: (value) => `${value} ms`,
    },
    {
      key: "rcMin",
      source: "rc_min",
      snapshotKey: "rc_min",
      label: "Receiver low",
      parse: (raw) => boundedInteger(raw, 0, 500),
    },
    {
      key: "rcMid",
      source: "rc_mid",
      snapshotKey: "rc_mid",
      label: "Receiver centre",
      parse: (raw) => boundedInteger(raw, 500, 1500),
    },
    {
      key: "rcMax",
      source: "rc_max",
      snapshotKey: "rc_max",
      label: "Receiver high",
      parse: (raw) => boundedInteger(raw, 1200, 2500),
    },
    {
      key: "rcDeadband",
      source: "rc_deadband",
      snapshotKey: "rc_deadband",
      label: "Receiver deadband",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 0 && number <= 0.2 ? number : null;
      },
    },
    {
      key: "vbatRatio",
      source: "vbat_ratio",
      snapshotKey: "vbat_ratio",
      label: "Battery divider ratio",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 1 && number <= 50 ? number : null;
      },
    },
    {
      key: "vbatCells",
      source: "vbat_cells",
      snapshotKey: "vbat_cells",
      label: "Battery cell override",
      parse: (raw) => boundedInteger(raw, 0, 8),
      display: (value) => value === 0 ? "Auto-detect" : `${value} cells`,
    },
    {
      key: "vbatWarnCell",
      source: "vbat_warn_cell",
      snapshotKey: "vbat_warn_cell",
      label: "Battery warning threshold",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 1 && number <= 5 ? number : null;
      },
      display: (value) => `${value} V/cell`,
    },
    {
      key: "vbatMinCell",
      source: "vbat_min_cell",
      snapshotKey: "vbat_min_cell",
      label: "Battery minimum threshold",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 1 && number <= 5 ? number : null;
      },
      display: (value) => `${value} V/cell`,
    },
    {
      key: "batteryRthEnabled",
      source: "battery_rth",
      snapshotKey: "battery_rth",
      label: "Critical-pack return",
      parse: (raw) => {
        const number = integer(raw);
        return number === 0 ? false : number === 1 ? true : null;
      },
    },
    {
      key: "fenceEnabled",
      source: "fence_enable",
      snapshotKey: "fence_enable",
      label: "Geofence enabled",
      parse: (raw) => {
        const number = integer(raw);
        return number === 0 ? false : number === 1 ? true : null;
      },
    },
    {
      key: "fenceRadiusM",
      source: "fence_radius_m",
      snapshotKey: "fence_radius_m",
      label: "Geofence radius",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 0 && number <= 5000 ? number : null;
      },
      display: (value) => `${value} m`,
    },
    {
      key: "fenceCeilingM",
      source: "fence_ceiling_m",
      snapshotKey: "fence_ceiling_m",
      label: "Geofence ceiling",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= 0 && number <= 5000 ? number : null;
      },
      display: (value) => value === 0 ? "No ceiling" : `${value} m`,
    },
    {
      key: "alignRollDeg",
      source: "align_roll_deg",
      snapshotKey: "align_roll_deg",
      label: "Board alignment roll",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= -180 && number <= 180 ? number : null;
      },
      display: (value) => `${value}°`,
    },
    {
      key: "alignPitchDeg",
      source: "align_pitch_deg",
      snapshotKey: "align_pitch_deg",
      label: "Board alignment pitch",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= -180 && number <= 180 ? number : null;
      },
      display: (value) => `${value}°`,
    },
    {
      key: "alignYawDeg",
      source: "align_yaw_deg",
      snapshotKey: "align_yaw_deg",
      label: "Board alignment yaw",
      parse: (raw) => {
        const number = finite(raw);
        return number != null && number >= -180 && number <= 180 ? number : null;
      },
      display: (value) => `${value}°`,
    },
    {
      key: "gyroRateHz",
      source: "gyro_rate_hz",
      snapshotKey: "gyro_rate_hz",
      label: "Requested gyro rate",
      parse: (raw) => boundedInteger(raw, 0, 8000),
      display: (value) => value === 0 ? "Driver default" : `${value} Hz`,
    },
    {
      key: "pidDenom",
      source: "pid_denom",
      snapshotKey: "pid_denom",
      label: "Control-loop divisor",
      parse: (raw) => boundedInteger(raw, 1, 32),
      display: (value) => `1 / ${value}`,
    },
    {
      key: "rthEnabled",
      source: "rth_enable",
      snapshotKey: "rth_enable",
      label: "Return to home",
      parse: (raw) => {
        const number = integer(raw);
        return number === 0 ? false : number === 1 ? true : null;
      },
    },
  ];
  return buildPatch(
    snapshot.values,
    plan,
    definitions,
    {
      missingReason: "Import an Aerial Kit FC parameter snapshot to compare values.",
      unsupportedReason: "The snapshot contains no supported Aerial Kit plan values.",
    },
  );
}

function normalizedLabel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9:/+]+/g, "");
}

function matchLabel(items, label, getLabel) {
  const normalized = normalizedLabel(label);
  return items.find((item) => normalizedLabel(getLabel(item)) === normalized) || null;
}

const RADIO_SWITCH_LABELS = Object.freeze({
  wide: "Wide",
  hybrid: "Hybrid",
  "8ch-rate2": "8ch Rate/2",
  "12ch-mixed": "12ch Mixed",
  "16ch-rate2": "16ch Rate/2",
});
const RADIO_PACKET_LABEL_VALUES = Object.freeze({
  "50hz": "50",
  "100hz": "100-full",
  "150hz": "150",
  "250hz": "250",
  "333hzfull": "333-full",
  "500hz": "500",
});
const RADIO_TELEMETRY_LABEL_VALUES = Object.freeze({
  std: "std",
  off: "off",
  "1:128": "1:128",
  "1:64": "1:64",
  "1:32": "1:32",
  "1:16": "1:16",
  "1:8": "1:8",
  "1:4": "1:4",
  "1:2": "1:2",
  race: "race",
});

export function buildRadioEvidencePlanPatch(snapshot, plan) {
  const settings = snapshot?.settings;
  const definitions = [
    {
      key: "packetRateMode",
      source: "Packet Rate",
      snapshotKey: "packetRate",
      label: "Packet rate",
      parse: (setting) => (
        RADIO_PACKET_LABEL_VALUES[normalizedLabel(setting.label)]
        || matchLabel(
          RADIO_PACKET_RATES,
          setting.label,
          (item) => item.label,
        )?.value
        || null
      ),
      display: (value, raw) => raw?.label || value,
    },
    {
      key: "powerDbm",
      source: "Max Power",
      snapshotKey: "maxPower",
      label: "Maximum power",
      parse: (setting) => matchLabel(
        RADIO_POWER_LEVELS,
        setting.label,
        (item) => String(item.menuMw),
      )?.value ?? null,
      display: (value, raw) => `${raw?.label || value} mW menu · ${value} dBm drive`,
    },
    {
      key: "telemetryRatio",
      source: "Telem Ratio",
      snapshotKey: "telemetryRatio",
      label: "Telemetry ratio",
      parse: (setting) => (
        RADIO_TELEMETRY_LABEL_VALUES[normalizedLabel(setting.label)]
        || matchLabel(
          RADIO_TELEMETRY_RATIOS,
          setting.label,
          (item) => item.label,
        )?.value
        || null
      ),
      display: (value, raw) => raw?.label || value,
    },
    {
      key: "switchMode",
      source: "Switch Mode",
      snapshotKey: "switchMode",
      label: "Switch mode",
      parse: (setting) => (
        Object.entries(RADIO_SWITCH_LABELS).find(([, label]) => (
          normalizedLabel(label) === normalizedLabel(setting.label)
        ))?.[0] || null
      ),
      display: (value, raw) => raw?.label || RADIO_SWITCH_LABELS[value] || value,
    },
    {
      key: "linkMode",
      source: "Link Mode",
      snapshotKey: "linkMode",
      label: "Link mode",
      parse: (setting) => matchLabel(
        RADIO_LINK_MODES,
        setting.label,
        (item) => normalizedLabel(item.label).replace("crsf", ""),
      )?.value || null,
      display: (value, raw) => raw?.label || value,
    },
    {
      key: "dynamicPower",
      source: "Dynamic",
      snapshotKey: "dynamicPower",
      label: "Dynamic power",
      parse: (setting) => {
        const normalized = normalizedLabel(setting.label);
        if (normalized === "dyn") return "dynamic";
        return matchLabel(
          RADIO_DYNAMIC_POWER,
          setting.label,
          (item) => item.label,
        )?.value || null;
      },
      display: (value, raw) => raw?.label || value,
    },
    {
      key: "modelMatch",
      source: "Model Match",
      snapshotKey: "modelMatch",
      label: "Model Match",
      parse: (setting) => (
        normalizedLabel(setting.label) === "on"
          ? true
          : normalizedLabel(setting.label) === "off" ? false : null
      ),
      display: (value) => value ? "On" : "Off",
    },
  ];
  return buildPatch(
    settings,
    plan,
    definitions,
    {
      missingReason: "Import a TX module parameter snapshot to compare radio values.",
      unsupportedReason: "The snapshot contains no supported TX module plan values.",
    },
  );
}

export function evidencePatchValues(patch, selectedIds) {
  if (!patch?.supported) return {};
  const selected = new Set(selectedIds);
  return Object.fromEntries(
    patch.fields
      .filter((field) => selected.has(field.id))
      .map((field) => [field.key, field.observedValue]),
  );
}
