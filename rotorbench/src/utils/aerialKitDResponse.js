export const AERIALKIT_D_RESPONSE_FIELDS = Object.freeze([
  {
    key: "rateKdRoll",
    runtimeName: "rate_kd_roll",
    label: "Roll D at rest",
  },
  {
    key: "rateKdPitch",
    runtimeName: "rate_kd_pitch",
    label: "Pitch D at rest",
  },
  {
    key: "rateKdYaw",
    runtimeName: "rate_kd_yaw",
    label: "Yaw D at rest",
  },
  {
    key: "rateKdMaxRoll",
    runtimeName: "rate_kd_max_roll",
    label: "Roll D_MAX",
  },
  {
    key: "rateKdMaxPitch",
    runtimeName: "rate_kd_max_pitch",
    label: "Pitch D_MAX",
  },
  {
    key: "rateKdMaxYaw",
    runtimeName: "rate_kd_max_yaw",
    label: "Yaw D_MAX",
  },
  {
    key: "dMaxGain",
    runtimeName: "d_max_gain",
    label: "D_MAX gyro boost",
  },
  {
    key: "dMaxAdvance",
    runtimeName: "d_max_advance",
    label: "D_MAX stick advance",
  },
]);

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitDResponsePlan(config = {}) {
  const definitions = [
    {
      id: "roll",
      label: "Roll",
      baseKey: "rateKdRoll",
      maxKey: "rateKdMaxRoll",
    },
    {
      id: "pitch",
      label: "Pitch",
      baseKey: "rateKdPitch",
      maxKey: "rateKdMaxPitch",
    },
    {
      id: "yaw",
      label: "Yaw",
      baseKey: "rateKdYaw",
      maxKey: "rateKdMaxYaw",
    },
  ];
  const axes = definitions.map((definition) => {
    const base = finiteNumber(config[definition.baseKey]) ?? 0;
    const maximum = finiteNumber(config[definition.maxKey]) ?? 0;
    return {
      ...definition,
      base,
      maximum,
      enabled: maximum > 0 && maximum > base,
      noHeadroom: maximum > 0 && maximum <= base,
      headroom: Math.max(0, maximum - base),
    };
  });
  const enabledAxes = axes.filter((axis) => axis.enabled);
  const noHeadroomAxes = axes.filter((axis) => axis.noHeadroom);
  const dMaxGain = finiteNumber(config.dMaxGain) ?? 0;
  const dMaxAdvance = finiteNumber(config.dMaxAdvance) ?? 0;

  return {
    axes,
    enabledAxes,
    noHeadroomAxes,
    enabled: enabledAxes.length > 0,
    status: enabledAxes.length > 0
      ? "configured"
      : noHeadroomAxes.length > 0
        ? "no-headroom"
        : "off",
    dMaxGain,
    dMaxAdvance,
  };
}
