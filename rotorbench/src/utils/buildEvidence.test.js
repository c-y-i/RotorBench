import { summarizeBuildEvidence } from "./buildEvidence";

test("build evidence separates source-backed, estimated, and fallback parts", () => {
  const summary = summarizeBuildEvidence({
    frame: {
      id: "frame-test",
      name: "Frame test",
      sourceUrl: "https://example.com/frame",
      modelStatus: "not_available",
      estimatedFields: ["motor positions"],
    },
    battery: {
      id: "battery-test",
      name: "Battery test",
      sourceUrl: "https://example.com/battery",
      connectorSourceUrl: "https://example.com/connector",
      estimatedFields: [],
      modelStatus: "not_available",
    },
    motor: {
      id: "motor-legacy",
      name: "Legacy motor",
    },
  });

  expect(summary).toMatchObject({
    selectedCount: 3,
    sourceBackedCount: 2,
    estimatedPartCount: 1,
    estimatedFieldCount: 1,
    geometryFallbackCount: 2,
    legacyUnsupportedCount: 1,
  });
  expect(summarizeBuildEvidence({ frame: null }).parts).toEqual([]);
});
