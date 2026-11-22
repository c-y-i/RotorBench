export const AERIALKIT_PID_GAIN_FIELDS = Object.freeze([
  { key: "rateKpRoll", runtimeName: "rate_kp_roll", label: "Roll P" },
  { key: "rateKpPitch", runtimeName: "rate_kp_pitch", label: "Pitch P" },
  { key: "rateKpYaw", runtimeName: "rate_kp_yaw", label: "Yaw P" },
  { key: "rateKiRoll", runtimeName: "rate_ki_roll", label: "Roll I" },
  { key: "rateKiPitch", runtimeName: "rate_ki_pitch", label: "Pitch I" },
  { key: "rateKiYaw", runtimeName: "rate_ki_yaw", label: "Yaw I" },
  {
    key: "rateILimit",
    runtimeName: "rate_i_limit",
    label: "Integral limit",
  },
  {
    key: "torqueLimit",
    runtimeName: "torque_limit",
    label: "Per-axis torque limit",
  },
]);

const FIRMWARE_DEFAULTS = Object.freeze({
  rateKpRoll: 0.25,
  rateKpPitch: 0.25,
  rateKpYaw: 0.35,
  rateKiRoll: 0.15,
  rateKiPitch: 0.15,
  rateKiYaw: 0.2,
  rateILimit: 0.3,
  torqueLimit: 0.6,
});

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitPidGainPlan(config = {}) {
  const axes = [
    ["roll", "Roll", "rateKpRoll", "rateKiRoll"],
    ["pitch", "Pitch", "rateKpPitch", "rateKiPitch"],
    ["yaw", "Yaw", "rateKpYaw", "rateKiYaw"],
  ].map(([id, label, pKey, iKey]) => ({
    id,
    label,
    p: finiteNumber(config[pKey]) ?? 0,
    i: finiteNumber(config[iKey]) ?? 0,
  }));
  const rateILimit = finiteNumber(config.rateILimit) ?? 0;
  const torqueLimit = finiteNumber(config.torqueLimit) ?? 0;
  const matchesFirmwareDefaults = Object.entries(FIRMWARE_DEFAULTS).every(
    ([key, expected]) => (finiteNumber(config[key]) ?? 0) === expected,
  );

  return {
    axes,
    rateILimit,
    torqueLimit,
    matchesFirmwareDefaults,
    status: matchesFirmwareDefaults ? "source-default" : "edited",
  };
}
