export const AERIALKIT_DYNAMIC_NOTCH = Object.freeze({
  countMax: 5,
  minimumLoopHz: 2000,
  fftPoints: 64,
});

export const AERIALKIT_DYNAMIC_NOTCH_FIELDS = Object.freeze([
  {
    key: "dynNotchCount",
    runtimeName: "dyn_notch_count",
    label: "Dynamic notch count",
  },
  {
    key: "dynNotchQ",
    runtimeName: "dyn_notch_q",
    label: "Dynamic notch Q",
  },
  {
    key: "dynNotchMinHz",
    runtimeName: "dyn_notch_min_hz",
    label: "Dynamic notch low",
  },
  {
    key: "dynNotchMaxHz",
    runtimeName: "dyn_notch_max_hz",
    label: "Dynamic notch high",
  },
]);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nearestBin(hz, binHz) {
  return Math.max(1, Math.round(hz / binHz));
}

export function buildAerialKitNotchPlan(config = {}) {
  const count = finiteNumber(config.dynNotchCount) ?? 0;
  const qHundredths = finiteNumber(config.dynNotchQ) ?? 0;
  const requestedMinHz = finiteNumber(config.dynNotchMinHz) ?? 0;
  const requestedMaxHz = finiteNumber(config.dynNotchMaxHz) ?? 0;
  const requestedGyroRateHz = Number(config.gyroRateHz);
  const pidDenom = Number(config.pidDenom);
  const loopHz = requestedGyroRateHz > 0 && pidDenom > 0
    ? requestedGyroRateHz / pidDenom
    : null;

  const base = {
    requestedGyroRateHz,
    pidDenom,
    loopHz,
    count,
    qHundredths,
    q: qHundredths / 100,
    requestedMinHz,
    requestedMaxHz,
    decimation: null,
    analysisRateHz: null,
    binHz: null,
    effectiveMinHz: null,
    effectiveMaxHz: null,
    eligible: false,
  };

  if (count === 0) {
    return {
      ...base,
      status: "off",
      detail: "Dynamic notches are disabled by request.",
    };
  }
  if (loopHz == null) {
    return {
      ...base,
      status: "unverified",
      detail:
        "The board driver owns the loop rate, so the 2 kHz notch gate remains unverified.",
    };
  }
  if (loopHz < AERIALKIT_DYNAMIC_NOTCH.minimumLoopHz) {
    return {
      ...base,
      status: "loop-gate",
      detail:
        `The requested ${loopHz} Hz loop is below the ${AERIALKIT_DYNAMIC_NOTCH.minimumLoopHz} Hz notch gate, so the firmware does not measure or filter.`,
    };
  }
  if (!(requestedMaxHz > requestedMinHz)) {
    return {
      ...base,
      status: "band-invalid",
      detail:
        "The high edge must be above the low edge. The firmware refuses this band rather than choosing one.",
    };
  }

  const nyquistHz = loopHz / 2;
  const decimation = Math.max(1, Math.trunc(nyquistHz / requestedMaxHz));
  const analysisRateHz = loopHz / decimation;
  const binHz = analysisRateHz / AERIALKIT_DYNAMIC_NOTCH.fftPoints;
  const topBin = Math.floor(AERIALKIT_DYNAMIC_NOTCH.fftPoints / 2) - 1;
  const firstBin = Math.min(topBin, nearestBin(requestedMinHz, binHz));
  const lastBin = Math.max(
    firstBin,
    Math.min(topBin, nearestBin(
      Math.min(requestedMaxHz, analysisRateHz / 2),
      binHz,
    )),
  );

  return {
    ...base,
    status: "eligible",
    eligible: true,
    detail:
      "The requested loop clears the notch gate. The bank still engages only after live gyro spectra produce a peak.",
    decimation,
    analysisRateHz,
    binHz,
    effectiveMinHz: firstBin * binHz,
    effectiveMaxHz: lastBin * binHz,
  };
}
