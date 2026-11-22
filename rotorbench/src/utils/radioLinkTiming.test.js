import {
  buildRadioLinkTiming,
  formatRadioTimingInterval,
} from "./radioLinkTiming";

test("resolves standard telemetry cadence and timeout frame coverage", () => {
  expect(buildRadioLinkTiming({
    packetRateMode: "250",
    telemetryRatio: "std",
  }, {
    receiverTimeoutMs: 250,
  })).toMatchObject({
    controlIntervalMs: 4,
    telemetryRatio: "1:64",
    telemetryRatioStatus: "resolved",
    telemetryIntervalMs: 256,
    timeoutFrames: 62.5,
    reviewRequired: false,
  });
});

test("marks a timeout spanning fewer than two control frames for review", () => {
  expect(buildRadioLinkTiming({
    packetRateMode: "25",
    telemetryRatio: "1:16",
  }, {
    receiverTimeoutMs: 50,
  })).toMatchObject({
    controlIntervalMs: 40,
    telemetryRatio: "1:16",
    telemetryIntervalMs: 640,
    timeoutFrames: 1.25,
    reviewRequired: true,
  });
});

test("keeps telemetry off and target-specific mappings distinct", () => {
  expect(buildRadioLinkTiming({
    packetRateMode: "250",
    telemetryRatio: "off",
  })).toMatchObject({
    telemetryRatioStatus: "off",
    telemetryIntervalMs: null,
  });
  expect(buildRadioLinkTiming({
    packetRateMode: "x150",
    telemetryRatio: "std",
  })).toMatchObject({
    telemetryRatioStatus: "unbundled",
    telemetryIntervalMs: null,
  });
  expect(formatRadioTimingInterval(256)).toBe("256 ms");
  expect(formatRadioTimingInterval(4)).toBe("4.0 ms");
});
