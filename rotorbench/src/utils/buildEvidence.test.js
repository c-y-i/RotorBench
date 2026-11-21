import componentsData from "../data/components.json";
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
      measuredFields: ["dimensionsMm"],
      estimatedFields: ["dimensionsMm", "mounting_point"],
    },
  });

  expect(summary).toMatchObject({
    selectedCount: 3,
    sourceBackedCount: 2,
    estimatedPartCount: 2,
    estimatedFieldCount: 2,
    measuredFieldCount: 1,
    geometryFallbackCount: 3,
    legacyUnsupportedCount: 1,
  });
  expect(summarizeBuildEvidence({ frame: null }).parts).toEqual([]);
});

test("manifest-bound legacy GLBs are not counted as generated fallbacks", () => {
  const summary = summarizeBuildEvidence({
    frame: componentsData.frames.find((part) => part.id === "frame-5inch-220mm"),
  });

  expect(summary.parts[0]).toMatchObject({
    id: "frame-5inch-220mm",
    modelStatus: "available",
    modelContractStatus: "legacy-unverified",
    geometryFallback: false,
  });
  expect(summary.geometryFallbackCount).toBe(0);
});
