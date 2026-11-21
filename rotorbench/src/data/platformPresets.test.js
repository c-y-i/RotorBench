import {
  PLATFORM_PRESETS,
  getPlatformPreset,
  matchesPlatformPreset,
  validatePlatformPreset,
} from "./platformPresets";
import { summarizeBuild } from "../utils/buildComparison";

test("every starter platform references a complete catalog build", () => {
  expect(PLATFORM_PRESETS).toHaveLength(4);
  PLATFORM_PRESETS.forEach((preset) => {
    expect(validatePlatformPreset(preset)).toBe(true);
    expect(Object.keys(preset.componentIds)).toHaveLength(7);
    expect(summarizeBuild({ componentIds: preset.componentIds })).toMatchObject({
      selectedCount: 7,
      sourceBackedCount: 7,
      physicalFitStatus: "verified",
      electricalFitStatus: "verified",
    });
  });
  expect(getPlatformPreset("source-35")?.name).toBe("3.5-inch source build");
  expect(getPlatformPreset("source-55-diversity")).toMatchObject({
    componentIds: {
      flightControllerId: "fc-holybro-kakute-h7-v2",
      receiverId: "rx-radiomaster-rp4td",
    },
  });
  expect(getPlatformPreset("source-35-4600")).toMatchObject({
    componentIds: {
      motorId: "motor-tmotor-f1404-4600kv",
      receiverId: "rx-radiomaster-rp2-v2",
    },
  });
});

test("preset validation rejects missing or unknown parts", () => {
  expect(validatePlatformPreset({
    componentIds: {
      frameId: "missing-frame",
      motorId: "motor-2207-1750kv",
    },
  })).toBe(false);
  expect(validatePlatformPreset(null)).toBe(false);
});

test("a loaded preset stops matching when one component diverges", () => {
  const preset = getPlatformPreset("source-35");
  expect(matchesPlatformPreset(preset, preset.componentIds)).toBe(true);
  expect(matchesPlatformPreset(preset, {
    ...preset.componentIds,
    motorId: "motor-2207-1750kv",
  })).toBe(false);
});
