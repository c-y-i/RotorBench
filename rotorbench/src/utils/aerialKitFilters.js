export const AERIALKIT_FILTER_FIELDS = Object.freeze([
  {
    key: "gyroLpf1StaticHz",
    runtimeName: "gyro_lpf1_static_hz",
    label: "Gyro LPF1 static",
  },
  {
    key: "gyroLpf1DynMinHz",
    runtimeName: "gyro_lpf1_dyn_min_hz",
    label: "Gyro LPF1 dynamic low",
  },
  {
    key: "gyroLpf1DynMaxHz",
    runtimeName: "gyro_lpf1_dyn_max_hz",
    label: "Gyro LPF1 dynamic high",
  },
  {
    key: "gyroLpf2StaticHz",
    runtimeName: "gyro_lpf2_static_hz",
    label: "Gyro LPF2 static",
  },
  {
    key: "dtermLpf1StaticHz",
    runtimeName: "dterm_lpf1_static_hz",
    label: "D-term LPF1 static",
  },
  {
    key: "dtermLpf1DynMinHz",
    runtimeName: "dterm_lpf1_dyn_min_hz",
    label: "D-term LPF1 dynamic low",
  },
  {
    key: "dtermLpf1DynMaxHz",
    runtimeName: "dterm_lpf1_dyn_max_hz",
    label: "D-term LPF1 dynamic high",
  },
  {
    key: "dtermLpf2StaticHz",
    runtimeName: "dterm_lpf2_static_hz",
    label: "D-term LPF2 static",
  },
]);

export const AERIALKIT_FILTER_CHAINS = Object.freeze([
  {
    id: "gyro",
    label: "Gyro chain",
    signal: "Gyro",
    staticKey: "gyroLpf1StaticHz",
    dynMinKey: "gyroLpf1DynMinHz",
    dynMaxKey: "gyroLpf1DynMaxHz",
    secondaryKey: "gyroLpf2StaticHz",
  },
  {
    id: "dterm",
    label: "D-term chain",
    signal: "D-term",
    staticKey: "dtermLpf1StaticHz",
    dynMinKey: "dtermLpf1DynMinHz",
    dynMaxKey: "dtermLpf1DynMaxHz",
    secondaryKey: "dtermLpf2StaticHz",
  },
]);

function finiteHz(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function appliedCutoff(requestedHz, maxFilterHz) {
  if (maxFilterHz == null) return null;
  return Math.min(requestedHz, maxFilterHz);
}

function resolveStage({
  staticHz,
  dynMinHz,
  dynMaxHz,
  maxFilterHz,
}) {
  const requestedStaticHz = finiteHz(staticHz);
  const requestedDynMinHz = finiteHz(dynMinHz);
  const requestedDynMaxHz = finiteHz(dynMaxHz);
  const dynamic = requestedDynMinHz > 0;
  const requestedLowHz = dynamic ? requestedDynMinHz : requestedStaticHz;
  const requestedHighHz = dynamic
    ? Math.max(requestedDynMinHz, requestedDynMaxHz)
    : requestedStaticHz;
  const appliedLowHz = appliedCutoff(requestedLowHz, maxFilterHz);
  const appliedHighHz = appliedCutoff(requestedHighHz, maxFilterHz);
  const disabled = requestedLowHz === 0 && requestedHighHz === 0;
  const clamped = !disabled
    && appliedLowHz != null
    && (
      appliedLowHz < requestedLowHz
      || appliedHighHz < requestedHighHz
    );

  return {
    mode: disabled ? "off" : dynamic ? "dynamic" : "static",
    dynamic,
    disabled,
    requestedStaticHz,
    requestedDynMinHz,
    requestedDynMaxHz,
    requestedLowHz,
    requestedHighHz,
    appliedLowHz,
    appliedHighHz,
    clampKnown: maxFilterHz != null,
    clamped,
    noDynamicMovement: dynamic && requestedDynMinHz === requestedDynMaxHz,
    dynamicMaxBelowFloor: dynamic
      && requestedDynMaxHz < requestedDynMinHz,
    ignoredStaticHz: dynamic && requestedStaticHz > 0,
  };
}

function resolveChain(config, definition, maxFilterHz) {
  const primary = resolveStage({
    staticHz: config[definition.staticKey],
    dynMinHz: config[definition.dynMinKey],
    dynMaxHz: config[definition.dynMaxKey],
    maxFilterHz,
  });
  const secondary = resolveStage({
    staticHz: config[definition.secondaryKey],
    dynMinHz: 0,
    dynMaxHz: 0,
    maxFilterHz,
  });

  return {
    ...definition,
    primary,
    secondary,
    clampedCount: Number(primary.clamped) + Number(secondary.clamped),
  };
}

export function buildAerialKitFilterPlan(config = {}) {
  const requestedGyroRateHz = Number(config.gyroRateHz);
  const pidDenom = Number(config.pidDenom);
  const loopHz = requestedGyroRateHz > 0 && pidDenom > 0
    ? requestedGyroRateHz / pidDenom
    : null;
  const maxFilterHz = loopHz == null ? null : loopHz / 4;
  const chains = AERIALKIT_FILTER_CHAINS.map((definition) => (
    resolveChain(config, definition, maxFilterHz)
  ));

  return {
    requestedGyroRateHz,
    pidDenom,
    loopHz,
    maxFilterHz,
    clampKnown: maxFilterHz != null,
    clampedCount: chains.reduce((total, chain) => total + chain.clampedCount, 0),
    chains,
  };
}
