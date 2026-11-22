const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export const AERIALKIT_RATE_FEEL_LIMITS = Object.freeze({
  maxRateDps: [10, 1800],
  rateCenterDps: [0, 1800],
  rateExpo: [0, 1],
  tpaRate: [0, 100],
  tpaBreakpoint: [0, 1],
});

export function aerialKitRateAtStick(stick, config = {}) {
  const x = clamp(finiteNumber(stick) ?? 0, -1, 1);
  const maxDps = finiteNumber(config.maxRateDps) ?? 0;
  const centerDps = finiteNumber(config.rateCenterDps) ?? 0;
  const expo = clamp(finiteNumber(config.rateExpo) ?? 0, 0, 1);
  if (centerDps <= 0 || centerDps >= maxDps) {
    return x * maxDps;
  }
  const magnitude = Math.abs(x);
  const x5 = x * x * x * x * x;
  return (
    x * centerDps
    + (maxDps - centerDps) * magnitude * (x5 * expo + x * (1 - expo))
  );
}

export function buildAerialKitRateCurve(config = {}, sampleCount = 41) {
  const maxDps = finiteNumber(config.maxRateDps);
  if (maxDps === null || maxDps <= 0) return [];
  const count = Math.max(9, Math.min(121, Number(sampleCount) || 41));
  return Array.from({ length: count }, (_, index) => {
    const stick = -1 + (index * 2) / (count - 1);
    return {
      stick,
      rateDps: aerialKitRateAtStick(stick, config),
    };
  });
}

export function aerialKitTpaFactor(throttle, config = {}, fixedWing = false) {
  const normalizedThrottle = clamp(finiteNumber(throttle) ?? 0, 0, 1);
  const breakpoint = clamp(finiteNumber(config.tpaBreakpoint) ?? 0.5, 0, 1);
  const rate = clamp(finiteNumber(config.tpaRate) ?? 0, 0, 100);
  const idle = 0.05;
  if (rate <= 0) return 1;

  if (fixedWing) {
    if (breakpoint <= idle) return 1;
    const raw = normalizedThrottle > idle
      ? 0.5 + (breakpoint - idle) / (normalizedThrottle - idle) / 2
      : 2;
    return clamp(1 + (raw - 1) * (rate / 100), 0.3, 2);
  }

  if (normalizedThrottle < breakpoint) return 1;
  if (breakpoint >= 1) return 1 - rate / 100;
  if (normalizedThrottle < 1) {
    return (
      100 - rate * (normalizedThrottle - breakpoint) / (1 - breakpoint)
    ) / 100;
  }
  return 1 - rate / 100;
}

export function summarizeAerialKitRateFeel(config = {}, { fixedWing = false } = {}) {
  const maxRateDps = finiteNumber(config.maxRateDps);
  const centerDps = finiteNumber(config.rateCenterDps) ?? 0;
  const expo = clamp(finiteNumber(config.rateExpo) ?? 0, 0, 1);
  const tpaRate = clamp(finiteNumber(config.tpaRate) ?? 0, 0, 100);
  const usesLinearCurve = centerDps <= 0 || centerDps >= maxRateDps;
  return {
    usesLinearCurve,
    centerRateDps: usesLinearCurve ? 0 : centerDps,
    halfStickRateDps: aerialKitRateAtStick(0.5, config),
    fullStickRateDps: aerialKitRateAtStick(1, config),
    fullThrottleTpaFactor: aerialKitTpaFactor(1, config, fixedWing),
    expo,
    tpaRate,
  };
}
