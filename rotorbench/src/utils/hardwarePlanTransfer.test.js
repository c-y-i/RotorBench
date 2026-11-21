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
      hostTransport: "native-usb",
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

test("combined hardware plans retain receiver identity and RF-band compatibility", () => {
  const config = createDefaultFlightControllerConfig();
  const receiver = {
    id: "rx-xr4",
    name: "RadioMaster XR4 Gemini Xrossband",
    protocol: "CRSF",
    frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
  };
  const exported = createCombinedHardwarePlan({
    build: { id: "build-xr4", name: "XR4 build", componentIds: {} },
    flightController: {
      config,
      profile: getBoardProfile(config.profileId),
      issues: [],
    },
    radio: {
      ...DEFAULT_RADIO_CONFIG,
      selectedReceiverId: receiver.id,
    },
    receiver,
    generatedAt: "2026-05-01T00:00:00.000Z",
  });

  expect(exported.receiver).toEqual({
    id: "rx-xr4",
    name: "RadioMaster XR4 Gemini Xrossband",
    protocol: "CRSF",
    frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
  });
  expect(exported.radio.configuration.receiverBandCompatibility).toMatchObject({
    status: "compatible",
    sharedBands: ["2.4 ghz"],
  });
  const imported = parseCombinedHardwarePlanJson(JSON.stringify(exported));
  expect(imported.receiver.id).toBe("rx-xr4");

  const inconsistent = JSON.parse(JSON.stringify(exported));
  inconsistent.radio.configuration.selectedReceiverId = "rx-other";
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(inconsistent)))
    .toThrow(/receiver identity is inconsistent/i);
});

test("unsupported or incomplete hardware plans fail closed", () => {
  expect(() => parseCombinedHardwarePlanJson("{}")).toThrow(/not a RotorBench/i);
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify({
    schema: "rotorbench.hardware-plan.v1",
    flightController: { config: { planVersion: 2 } },
    radio: {},
  }))).toThrow(/unsupported plan version/i);
});

test("hardware-plan import validates the motor-direction enum", () => {
  const exported = samplePlan();
  exported.flightController.config.motorDirection = "props-out";
  expect(parseCombinedHardwarePlanJson(JSON.stringify(exported)).fcPlan)
    .toMatchObject({ motorDirection: "props-out" });

  exported.flightController.config.motorDirection = "both";
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(exported)))
    .toThrow(/motor direction is unsupported/i);
});

test("hardware-plan import preserves and validates Betaflight failsafe throttle", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    firmwareFamily: "betaflight",
    failsafeThrottle: 1200,
  };
  const exported = createCombinedHardwarePlan({
    build: { id: "build-bf-failsafe", name: "Betaflight failsafe", componentIds: {} },
    flightController: {
      config,
      profile: getBoardProfile(config.profileId),
      issues: [],
    },
    radio: DEFAULT_RADIO_CONFIG,
  });
  expect(parseCombinedHardwarePlanJson(JSON.stringify(exported)).fcPlan)
    .toMatchObject({ failsafeThrottle: 1200 });

  delete exported.flightController.config.failsafeThrottle;
  expect(parseCombinedHardwarePlanJson(JSON.stringify(exported)).fcPlan)
    .toMatchObject({ failsafeThrottle: 1000 });

  exported.flightController.config.failsafeThrottle = 999;
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(exported)))
    .toThrow(/failsafe throttle must be a whole PWM value/i);
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
    ["hostTransport", "telepathy", /host transport is unsupported/i],
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

test("Ranger Nano imports only its module-bay transport and published power ceiling", () => {
  const exported = samplePlan();
  exported.radio.target.id = "radiomaster-ranger-nano-elrs-24-tx";
  exported.radio.configuration.role = "tx";
  exported.radio.configuration.hostTransport = "module-bay";
  exported.radio.configuration.hostBay = "nano-8";
  exported.radio.configuration.powerDbm = 20;
  exported.radio.configuration.regulatoryRegion = "fcc";

  const imported = parseCombinedHardwarePlanJson(JSON.stringify(exported));
  expect(imported.radioPlan).toMatchObject({
    targetId: "radiomaster-ranger-nano-elrs-24-tx",
    role: "tx",
    hostTransport: "module-bay",
    hostBay: "nano-8",
    powerDbm: 20,
    regulatoryRegion: "fcc",
  });

  const missingRegion = JSON.parse(JSON.stringify(exported));
  delete missingRegion.radio.configuration.regulatoryRegion;
  expect(parseCombinedHardwarePlanJson(JSON.stringify(missingRegion)).radioPlan)
    .toMatchObject({
      regulatoryRegion: "verify",
      hostBay: "nano-8",
    });

  const wrongTransport = JSON.parse(JSON.stringify(exported));
  wrongTransport.radio.configuration.hostTransport = "native-usb";
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(wrongTransport)))
    .toThrow(/host transport is unsupported/i);

  const wrongBay = JSON.parse(JSON.stringify(exported));
  wrongBay.radio.configuration.hostBay = "jr-standard-5";
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(wrongBay)))
    .toThrow(/handset bay is incompatible/i);

  const overLimit = JSON.parse(JSON.stringify(exported));
  overLimit.radio.configuration.powerDbm = 31;
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(overLimit)))
    .toThrow(/published maximum/i);

  const unsupportedRegion = JSON.parse(JSON.stringify(exported));
  unsupportedRegion.radio.configuration.regulatoryRegion = "world";
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(unsupportedRegion)))
    .toThrow(/RF region is unsupported/i);

  const ceOverLimit = JSON.parse(JSON.stringify(exported));
  ceOverLimit.radio.configuration.regulatoryRegion = "ce";
  ceOverLimit.radio.configuration.powerDbm = 25;
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(ceOverLimit)))
    .toThrow(/selected CE maximum/i);
});
