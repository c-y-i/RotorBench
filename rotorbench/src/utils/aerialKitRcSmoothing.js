export const AERIALKIT_RC_SMOOTHING_FIELDS = Object.freeze([
  {
    key: "rcSmooth",
    runtimeName: "rc_smooth",
    label: "RC smoothing",
  },
  {
    key: "rcSmoothHz",
    runtimeName: "rc_smooth_hz",
    label: "RC smoothing cutoff",
  },
  {
    key: "rcSmoothFactor",
    runtimeName: "rc_smooth_factor",
    label: "RC smoothing auto factor",
  },
]);

const PT3_CORRECTION = 1.96145918;

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitRcSmoothingPlan(
  config = {},
  {
    linkRateHz = null,
    linkRateLabel = null,
  } = {},
) {
  const enabled = Number(config.rcSmooth) === 1;
  const manualHz = finiteNumber(config.rcSmoothHz) ?? 0;
  const factor = finiteNumber(config.rcSmoothFactor) ?? 0;
  const requestedGyroRateHz = Number(config.gyroRateHz);
  const pidDenom = Number(config.pidDenom);
  const loopHz = requestedGyroRateHz > 0 && pidDenom > 0
    ? requestedGyroRateHz / pidDenom
    : null;
  const knownLinkRateHz = finiteNumber(linkRateHz);
  const source = manualHz > 0
    ? "manual"
    : knownLinkRateHz > 0
      ? "auto"
      : null;
  const derivedCutoffHz = manualHz > 0
    ? manualHz
    : knownLinkRateHz > 0
      ? Math.max(15, knownLinkRateHz * 1.5 / (1 + factor / 10))
      : 0;
  const requestedLoopCeilingHz = loopHz == null
    ? null
    : (loopHz * 0.25) / PT3_CORRECTION;
  const appliedCutoffHz = !enabled || derivedCutoffHz <= 0
    ? 0
    : requestedLoopCeilingHz == null
      ? null
      : Math.min(derivedCutoffHz, requestedLoopCeilingHz);

  return {
    enabled,
    manualHz,
    factor,
    source,
    status: !enabled
      ? "off"
      : !source
        ? "waiting"
        : source,
    linkRateHz: knownLinkRateHz,
    linkRateLabel,
    loopHz,
    derivedCutoffHz,
    requestedLoopCeilingHz,
    appliedCutoffHz,
    clamped: (
      enabled
      && appliedCutoffHz != null
      && appliedCutoffHz < derivedCutoffHz
    ),
    clampKnown: requestedLoopCeilingHz != null,
  };
}
