export const AERIALKIT_FEED_FORWARD_FIELDS = Object.freeze([
  {
    key: "rateFfdRoll",
    runtimeName: "rate_ffd_roll",
    label: "Roll stick feed-forward",
  },
  {
    key: "rateFfdPitch",
    runtimeName: "rate_ffd_pitch",
    label: "Pitch stick feed-forward",
  },
  {
    key: "rateFfdYaw",
    runtimeName: "rate_ffd_yaw",
    label: "Yaw stick feed-forward",
  },
  {
    key: "ffSmoothFactor",
    runtimeName: "ff_smooth_factor",
    label: "Feed-forward smooth factor",
  },
  {
    key: "ffJitterFactor",
    runtimeName: "ff_jitter_factor",
    label: "Feed-forward jitter factor",
  },
  {
    key: "ffBoost",
    runtimeName: "ff_boost",
    label: "Feed-forward boost",
  },
  {
    key: "ffMaxRateLimit",
    runtimeName: "ff_max_rate_limit",
    label: "Feed-forward max-rate limit",
  },
]);

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitFeedForwardPlan(
  config = {},
  { linkRateHz = null, linkRateLabel = null } = {},
) {
  const smoothFactor = finiteNumber(config.ffSmoothFactor) ?? 0;
  const jitterFactor = finiteNumber(config.ffJitterFactor) ?? 0;
  const boost = finiteNumber(config.ffBoost) ?? 0;
  const maxRateLimit = finiteNumber(config.ffMaxRateLimit) ?? 0;
  const knownLinkRateHz = finiteNumber(linkRateHz);
  const axes = [
    { id: "roll", label: "Roll", gain: finiteNumber(config.rateFfdRoll) ?? 0 },
    { id: "pitch", label: "Pitch", gain: finiteNumber(config.rateFfdPitch) ?? 0 },
    { id: "yaw", label: "Yaw", gain: finiteNumber(config.rateFfdYaw) ?? 0 },
  ];
  const enabledAxes = axes.filter((axis) => axis.gain > 0);
  const f = Math.min(0.95, Math.max(0, smoothFactor / 100));
  const tauSeconds = (f / 250) / (1 - f);
  const sampleIntervalSeconds = knownLinkRateHz > 0
    ? 1 / knownLinkRateHz
    : null;
  const filterK = sampleIntervalSeconds == null
    ? null
    : sampleIntervalSeconds / (sampleIntervalSeconds + tauSeconds);

  return {
    axes,
    enabledAxes,
    enabled: enabledAxes.length > 0,
    status: enabledAxes.length === 0
      ? "off"
      : knownLinkRateHz > 0
        ? "planned"
        : "unverified",
    linkRateHz: knownLinkRateHz,
    linkRateLabel,
    smoothFactor,
    jitterFactor,
    boost,
    maxRateLimit,
    sampleIntervalMs: sampleIntervalSeconds == null
      ? null
      : sampleIntervalSeconds * 1000,
    tauMs: tauSeconds * 1000,
    filterK,
    jitterDivisor: 1 + jitterFactor,
    boostScale: boost / 1000,
  };
}
