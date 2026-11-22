export const AERIALKIT_PID_RESPONSE_FIELDS = Object.freeze([
  {
    key: "rateFfRoll",
    runtimeName: "rate_ff_roll",
    label: "Roll static feed-forward",
  },
  {
    key: "rateFfPitch",
    runtimeName: "rate_ff_pitch",
    label: "Pitch static feed-forward",
  },
  {
    key: "rateFfYaw",
    runtimeName: "rate_ff_yaw",
    label: "Yaw static feed-forward",
  },
  {
    key: "itermRelaxHz",
    runtimeName: "iterm_relax_hz",
    label: "I-term relax cutoff",
  },
]);

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitPidResponsePlan(config = {}) {
  const axes = [
    { id: "roll", label: "Roll", gain: finiteNumber(config.rateFfRoll) ?? 0 },
    { id: "pitch", label: "Pitch", gain: finiteNumber(config.rateFfPitch) ?? 0 },
    { id: "yaw", label: "Yaw", gain: finiteNumber(config.rateFfYaw) ?? 0 },
  ];
  const enabledAxes = axes.filter((axis) => axis.gain > 0);
  const itermRelaxHz = finiteNumber(config.itermRelaxHz) ?? 0;
  const staticFeedForwardEnabled = enabledAxes.length > 0;
  const itermRelaxEnabled = itermRelaxHz > 0;

  return {
    axes,
    enabledAxes,
    staticFeedForwardEnabled,
    itermRelaxEnabled,
    itermRelaxHz,
    status: !staticFeedForwardEnabled && !itermRelaxEnabled
      ? "off"
      : staticFeedForwardEnabled && itermRelaxEnabled
        ? "combined"
        : staticFeedForwardEnabled
          ? "feed-forward"
          : "relax",
  };
}
