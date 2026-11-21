import {
  createCombinedHardwarePlan,
  parseCombinedHardwarePlanJson,
} from "./hardwarePlanTransfer";
import {
  createDefaultFlightControllerConfig,
  getBoardProfile,
  validateFlightControllerConfig,
} from "../data/flightControllerProfiles";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";

function samplePlan() {
  const config = createDefaultFlightControllerConfig();
  return createCombinedHardwarePlan({
    build: { id: "build-a", name: "Bench build", componentIds: { frameId: "frame-a" } },
    flightController: {
      config,
      profile: getBoardProfile(config.profileId),
      issues: validateFlightControllerConfig(config, getBoardProfile(config.profileId)),
    },
    radio: {
      ...DEFAULT_RADIO_CONFIG,
      channelMap: {
        ...DEFAULT_RADIO_CONFIG.channelMap,
        arm: 5,
        flightMode: 6,
      },
      bindingPhrase: "never-export-this",
      uid: "10:73:a1:1f:a8:0f",
    },
    generatedAt: "2026-05-01T00:00:00.000Z",
    channelLimit: 8,
  });
}

test("combined hardware plans round-trip without binding secrets", () => {
  const exported = samplePlan();
  expect(JSON.stringify(exported)).not.toContain("never-export-this");
  const imported = parseCombinedHardwarePlanJson(JSON.stringify(exported));
  expect(imported).toMatchObject({
    buildId: "build-a",
    radioPlan: {
      planVersion: 3,
      bindingPhrase: "",
      uid: "",
      channelMap: {
        arm: 5,
        flightMode: 6,
      },
    },
  });
  expect(imported.fcPlan.planVersion).toBe(3);
  expect(exported.flightController.wiring).toMatchObject({
    documented: false,
    wiringVerified: false,
    scope: "planning continuity checklist; hardware not tested",
  });
});

test("combined hardware plans carry the documented receiver wiring checklist", () => {
  const profile = getBoardProfile("esp32dev");
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "esp32dev",
    receiverProtocol: "crsf",
    receiverUart: profile.receiverUart,
    receiverBaud: profile.receiverBaud,
  };
  const exported = createCombinedHardwarePlan({
    build: { id: "build-wiring", name: "Wiring build", componentIds: {} },
    flightController: {
      config,
      profile,
      issues: validateFlightControllerConfig(config, profile),
    },
    radio: DEFAULT_RADIO_CONFIG,
    receiver: { name: "RadioMaster RP3-H ExpressLRS", protocol: "CRSF" },
    generatedAt: "2026-05-01T00:00:00.000Z",
  });

  expect(exported.flightController.wiring).toMatchObject({
    documented: true,
    uart: "UART2",
    pins: "GPIO17 TX / GPIO16 RX",
    baud: 420000,
    receiverName: "RadioMaster RP3-H ExpressLRS",
    wiringVerified: false,
  });
  expect(exported.flightController.wiring.steps).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "signal" }),
    expect.objectContaining({ id: "telemetry" }),
    expect.objectContaining({ id: "ground" }),
  ]));
});

test("unsupported or incomplete hardware plans fail closed", () => {
  expect(() => parseCombinedHardwarePlanJson("{}")).toThrow(/not a RotorBench/i);
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify({
    schema: "rotorbench.hardware-plan.v1",
    flightController: { config: { planVersion: 2 } },
    radio: {},
  }))).toThrow(/unsupported plan version/i);
});

test("older partial v1 plans merge over safe configurator defaults", () => {
  const exported = samplePlan();
  delete exported.flightController.config.features;
  delete exported.radio.configuration.channelMap;
  const imported = parseCombinedHardwarePlanJson(JSON.stringify(exported));
  expect(imported.fcPlan.features).toEqual(
    expect.objectContaining({
      telemetry: expect.any(Boolean),
      gps: expect.any(Boolean),
    }),
  );
  expect(imported.radioPlan.channelMap).toHaveProperty("arm");
  expect(imported.radioPlan.channelMap).toHaveProperty("flightMode");
});

test("imported radio enums fail closed against the selected target", () => {
  const invalidCases = [
    ["powerDbm", 12, /power setting is not valid/i],
    ["packetRateMode", "9000", /packet rate is not valid/i],
    ["linkMode", "telepathy", /link mode is unsupported/i],
    ["telemetryRatio", "1:999", /telemetry ratio is unsupported/i],
    ["switchMode", "wide", /switch mode is not valid/i],
    ["dynamicPower", "turbo", /dynamic-power mode is unsupported/i],
  ];

  for (const [field, value, message] of invalidCases) {
    const exported = samplePlan();
    if (field === "switchMode") {
      exported.radio.configuration.packetRateMode = "100-full";
    }
    exported.radio.configuration[field] = value;
    expect(() => parseCombinedHardwarePlanJson(JSON.stringify(exported)))
      .toThrow(message);
  }

  const nullPower = samplePlan();
  nullPower.radio.configuration.powerDbm = null;
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(nullPower)))
    .toThrow(/valid power setting/i);
});
