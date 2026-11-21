import {
  PLATFORM_PRESETS,
  getPlatformPreset,
  matchesPlatformPreset,
  validatePlatformPreset,
} from "./platformPresets";
import { summarizeBuild } from "../utils/buildComparison";

test("every starter platform references a complete catalog build", () => {
  expect(PLATFORM_PRESETS).toHaveLength(10);
  PLATFORM_PRESETS.forEach((preset) => {
    expect(validatePlatformPreset(preset)).toBe(true);
    expect(Object.keys(preset.componentIds)).toHaveLength(7);
    expect(summarizeBuild({ componentIds: preset.componentIds })).toMatchObject({
      selectedCount: 7,
      sourceBackedCount: 7,
      physicalFitStatus: preset.id === "source-5" ? "unverified" : "verified",
      electricalFitStatus: preset.id === "source-7-inch"
        ? "unverified"
        : "verified",
    });
  });
  expect(getPlatformPreset("source-35")?.name).toBe("3.5-inch source build");
  expect(getPlatformPreset("source-55-diversity")).toMatchObject({
    componentIds: {
      flightControllerId: "fc-holybro-kakute-h7-v2",
      receiverId: "rx-radiomaster-rp4td",
    },
  });
  expect(getPlatformPreset("source-5")).toMatchObject({
    componentIds: {
      frameId: "frame-tbs-source-one-v5",
      motorId: "motor-iflight-xing2-2207-1855kv",
      propellerId: "prop-hqprop-pizzacutters-5037-3",
      batteryId: "battery-tattu-rline-v3-6s-1050-120c",
    },
  });
  expect(getPlatformPreset("source-5-aos-v5")).toMatchObject({
    name: "5-inch AOS 5 V5 source build",
    componentIds: {
      frameId: "frame-aos-5-v5",
      motorId: "motor-iflight-xing2-2207-1855kv",
      propellerId: "prop-hqprop-pizzacutters-5037-3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-v3-6s-1050-120c",
      receiverId: "rx-radiomaster-rp4td",
    },
  });
  expect(getPlatformPreset("source-35-4600")).toMatchObject({
    componentIds: {
      motorId: "motor-tmotor-f1404-4600kv",
      receiverId: "rx-radiomaster-rp2-v2",
    },
  });
  expect(getPlatformPreset("source-55-xing2")).toMatchObject({
    componentIds: {
      motorId: "motor-iflight-xing2-2207-1855kv",
      escId: "esc-speedybee-bl32-50a",
      batteryId: "battery-tattu-rline-v3-6s-1050-120c",
    },
  });
  expect(getPlatformPreset("source-55-xing2-4s")).toMatchObject({
    componentIds: {
      motorId: "motor-iflight-xing2-2207-2755kv",
      batteryId: "battery-cnhl-black-4s-1500-100c",
      escId: "esc-speedybee-bl32-50a",
    },
  });
  expect(getPlatformPreset("source-7-inch")).toMatchObject({
    componentIds: {
      frameId: "frame-aos-7-evo-v12",
      motorId: "motor-iflight-xing-2806-5-1300kv",
      propellerId: "prop-gemfan-flash-7040-3",
      batteryId: "battery-tattu-rline-6s-1300-120c",
    },
  });
  expect(getPlatformPreset("source-25")).toMatchObject({
    componentIds: {
      frameId: "frame-aos-cine25-v5",
      motorId: "motor-tmotor-f1404-4600kv",
      propellerId: "prop-gemfan-hurricane-2520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      batteryId: "battery-tattu-rline-4s-850-95c",
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
