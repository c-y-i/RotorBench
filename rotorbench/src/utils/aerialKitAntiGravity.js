export const AERIALKIT_ANTI_GRAVITY_FIELDS = Object.freeze([
  {
    key: "antiGravityGain",
    runtimeName: "anti_gravity_gain",
    label: "Anti-gravity gain",
  },
  {
    key: "antiGravityCutoffHz",
    runtimeName: "anti_gravity_cutoff_hz",
    label: "Anti-gravity cutoff",
  },
  {
    key: "antiGravityPGain",
    runtimeName: "anti_gravity_p_gain",
    label: "Anti-gravity P share",
  },
]);

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitAntiGravityPlan(config = {}) {
  const gain = finiteNumber(config.antiGravityGain) ?? 0;
  const cutoffHz = finiteNumber(config.antiGravityCutoffHz) ?? 0;
  const pGainPercent = finiteNumber(config.antiGravityPGain) ?? 0;
  return {
    enabled: gain > 0,
    status: gain > 0 ? "enabled" : "off",
    gain,
    cutoffHz,
    pGainPercent,
    axes: gain > 0 ? ["roll", "pitch"] : [],
    scope:
      "roll and pitch only; yaw receives neither the integral accelerator nor the P boost",
  };
}
