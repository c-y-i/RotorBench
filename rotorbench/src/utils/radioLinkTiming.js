import {
  getRadioPacketIntervalMs,
  getSuggestedTelemetryRatio,
} from "../data/radioProfiles";

function ratioDenominator(packetRateMode, telemetryRatio) {
  const resolved = telemetryRatio === "std"
    ? getSuggestedTelemetryRatio(packetRateMode)
    : telemetryRatio;
  if (!resolved || ["off", "race"].includes(resolved)) return null;
  const match = String(resolved).match(/^1:(\d+)$/);
  if (!match) return null;
  const denominator = Number(match[1]);
  return Number.isInteger(denominator) && denominator > 0
    ? { label: resolved, value: denominator }
    : null;
}

export function buildRadioLinkTiming(
  {
    packetRateMode = "250",
    telemetryRatio = "std",
  } = {},
  { receiverTimeoutMs = null } = {},
) {
  const controlIntervalMs = getRadioPacketIntervalMs(packetRateMode);
  const telemetry = ratioDenominator(packetRateMode, telemetryRatio);
  const telemetryIntervalMs = controlIntervalMs && telemetry
    ? controlIntervalMs * telemetry.value
    : null;
  const timeout = Number(receiverTimeoutMs);
  const timeoutFrames = (
    controlIntervalMs
    && Number.isFinite(timeout)
    && timeout > 0
  )
    ? timeout / controlIntervalMs
    : null;
  return {
    packetRateMode,
    controlIntervalMs,
    telemetryRatio: telemetry?.label || null,
    telemetryRatioStatus: telemetry
      ? "resolved"
      : telemetryRatio === "off"
        ? "off"
        : telemetryRatio === "race"
          ? "target-specific"
          : "unbundled",
    telemetryIntervalMs,
    receiverTimeoutMs: timeoutFrames == null ? null : timeout,
    timeoutFrames,
    reviewRequired: timeoutFrames != null && timeoutFrames < 2,
    scope: "nominal planning cadence; measured airtime, RF delivery, and link quality are not established",
  };
}

export function formatRadioTimingInterval(value) {
  if (!Number.isFinite(Number(value))) return "Unavailable";
  const number = Number(value);
  return number >= 100
    ? `${Math.round(number)} ms`
    : `${number.toFixed(1)} ms`;
}
