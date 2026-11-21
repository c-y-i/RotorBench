import {
  DEFAULT_RADIO_CONFIG,
  applyFlightControllerChannelMap,
  bindingPhraseByteLength,
  buildChannelMappingWarnings,
  buildRadioSummary,
  buildRadioWarnings,
  getAvailableSwitchModes,
  getDefaultHostTransport,
  getDefaultPowerDbm,
  getPacketRatesForTarget,
  getRadioHostTransports,
  getRadioTarget,
  getRadioTargetForRole,
  getSuggestedTelemetryRatio,
  hasStagedBinding,
  isUnboundUid,
  isValidUidFormat,
  normalizeRadioConfig,
} from "./radioProfiles";

test("Aerial Kit defaults preserve the documented serial roles", () => {
  const target = getRadioTarget("aerialkit-elrs-rev-a3");
  expect(target.serial.txBaud).toBe(400000);
  expect(target.serial.rxBaud).toBe(420000);
  expect(target.hostLink.uart).toMatchObject({
    baud: 400000,
    frame: "8N1, non-inverted, full duplex",
  });
  expect(target.frequency).toBe("2.4 GHz");
  expect(DEFAULT_RADIO_CONFIG.powerDbm).toBe(-18);
  expect(DEFAULT_RADIO_CONFIG.packetRateMode).toBe("250");
  expect(DEFAULT_RADIO_CONFIG.hostTransport).toBe("native-usb");
});

test("packet rates expose the source-backed Standard telemetry mapping", () => {
  expect(getSuggestedTelemetryRatio("50")).toBe("1:16");
  expect(getSuggestedTelemetryRatio("100-full")).toBe("1:32");
  expect(getSuggestedTelemetryRatio("150")).toBe("1:32");
  expect(getSuggestedTelemetryRatio("250")).toBe("1:64");
  expect(getSuggestedTelemetryRatio("333-full")).toBe("1:128");
  expect(getSuggestedTelemetryRatio("f1000")).toBe("1:128");
});

test("switch modes follow the packet family and MAVLink override", () => {
  expect(getAvailableSwitchModes("250", "normal")).toEqual(["wide", "hybrid"]);
  expect(getAvailableSwitchModes("333-full", "normal")).toEqual([
    "8ch-rate2",
    "12ch-mixed",
    "16ch-rate2",
  ]);
  expect(getAvailableSwitchModes("500", "mavlink")).toEqual(["hybrid"]);
  expect(getAvailableSwitchModes("100-full", "mavlink")).toEqual([
    "16ch-rate2",
  ]);
});

test("packet-rate choices stay within the selected target's packaged modes", () => {
  const rates = getPacketRatesForTarget("aerialkit-elrs-rev-a3");
  expect(rates.map((rate) => rate.value)).toEqual(
    expect.arrayContaining(["50", "100-full", "333-full", "d250", "f1000"]),
  );
  expect(getPacketRatesForTarget("missing-target")).toHaveLength(10);
});

test("Ranger Nano keeps its manufacturer-published module-bay and power bounds", () => {
  const target = getRadioTarget("radiomaster-ranger-nano-elrs-24-tx");

  expect(target).toMatchObject({
    frequency: "2.4 GHz",
    roles: ["tx"],
    defaultHostTransport: "module-bay",
    sourceUrl: "https://radiomasterrc.com/products/ranger-nano-2-4ghz-elrs-module",
    power: {
      defaultDbm: 20,
      defaultMw: 100,
      menuVerified: false,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
        { region: "CE", dbm: 20, mw: 100 },
      ],
    },
  });
  expect(target.hostLink.moduleBay.pins).toMatch(/CRSF, GND, 5-12 V/i);
  expect(target.serial.txBaud).toBeNull();
  expect(getDefaultHostTransport(target.id)).toBe("module-bay");
  expect(getRadioHostTransports(target.id).map((transport) => transport.value))
    .toEqual(["module-bay", "unspecified"]);
  expect(getDefaultPowerDbm(target.id)).toBe(20);
  expect(getRadioHostTransports("generic-elrs-24-tx").map((transport) => transport.value))
    .toEqual(["native-usb", "uart", "module-bay", "unspecified"]);
});

test("Ranger Nano warns on regional power bounds without inventing a menu", () => {
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    targetId: "radiomaster-ranger-nano-elrs-24-tx",
    hostTransport: "module-bay",
    powerDbm: 31,
  });

  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/FCC 30 dBm \/ 1000 mW.*CE 20 dBm \/ 100 mW/i),
    expect.stringMatching(/exceeds every published maximum of 30 dBm/i),
  ]));

  const summary = buildRadioSummary({
    ...DEFAULT_RADIO_CONFIG,
    targetId: "radiomaster-ranger-nano-elrs-24-tx",
    hostTransport: "module-bay",
    powerDbm: 20,
  });
  expect(summary.target.power).toMatchObject({
    defaultDbm: 20,
    menuVerified: false,
  });
  expect(summary.configuration.powerMenuMw).toBeNull();
  expect(summary.target.sourceUrl).toContain("radiomasterrc.com");
});

test("default radio plan has deployment warnings and is not hardware verified", () => {
  const warnings = buildRadioWarnings(DEFAULT_RADIO_CONFIG);
  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/antenna/i),
    expect.stringMatching(/SW2/i),
    expect.stringMatching(/binding phrase or UID/i),
  ]));

  const summary = buildRadioSummary(DEFAULT_RADIO_CONFIG);
  expect(summary.status).toBe("draft");
  expect(summary.hardwareVerified).toBe(false);
  expect(summary.configuration.packetRateHz).toBe(250);
  expect(summary.configuration.powerMenuMw).toBe(10);
  expect(summary.configuration.hostTransport).toBe("native-usb");
});

test("Rev A3 unsupported power and packet rate fail closed", () => {
  const config = {
    ...DEFAULT_RADIO_CONFIG,
    powerDbm: 0,
    packetRateMode: "999",
  };
  const warnings = buildRadioWarnings(config);
  const summary = buildRadioSummary(config);

  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/power must be one of -18, -14, -10, -6, 5 dBm/i),
    expect.stringMatching(/does not support 999/i),
  ]));
  expect(summary.configuration.powerMenuMw).toBeNull();
  expect(summary.configuration.packetRateHz).toBeNull();
});

test("channel map and UID validation detect unsafe duplicates and malformed UIDs", () => {
  const config = normalizeRadioConfig({
    ...DEFAULT_RADIO_CONFIG,
    antennaConfirmed: true,
    roleSwitchConfirmed: true,
    uid: "1234",
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      pitch: 1,
    },
  });
  const warnings = buildRadioWarnings(config);
  expect(warnings).toEqual(expect.arrayContaining([
    "Two control roles share the same channel.",
    expect.stringMatching(/12 hexadecimal digits/i),
  ]));
});

test("binding material remains staged rather than verified", () => {
  const summary = buildRadioSummary({
    ...DEFAULT_RADIO_CONFIG,
    bindingPhrase: "local-test-phrase",
    antennaConfirmed: true,
    roleSwitchConfirmed: true,
  });
  expect(summary.hardwareVerified).toBe(false);
  expect(summary.configuration.bindingPhraseStaged).toBe(true);
  expect(summary.configuration).not.toHaveProperty("bindingPhrase");
});

test("all-zero UID is treated as unbound", () => {
  const config = {
    ...DEFAULT_RADIO_CONFIG,
    uid: "00:00:00:00:00:00",
    antennaConfirmed: true,
    roleSwitchConfirmed: true,
  };
  expect(isUnboundUid(config.uid)).toBe(true);
  expect(hasStagedBinding(config)).toBe(false);
  expect(buildRadioWarnings(config)).toEqual(
    expect.arrayContaining([expect.stringMatching(/all-zero UID is unbound/i)]),
  );
});

test("UID separators are accepted but non-hex characters are rejected", () => {
  expect(isValidUidFormat("10:73:a1:1f:a8:0f")).toBe(true);
  expect(isValidUidFormat("10-73-a1-1f-a8-0f")).toBe(true);
  expect(isValidUidFormat("1073a11fa80z")).toBe(false);
});

test("phrase and direct UID cannot define two competing identities", () => {
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    bindingPhrase: "shared phrase",
    uid: "1073a11fa80f",
  });
  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/either a binding phrase or a direct UID/i),
  ]));
});

test("binding phrases report the firmware's 48-byte limit", () => {
  expect(bindingPhraseByteLength("short phrase")).toBeLessThanOrEqual(48);
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    bindingPhrase: "x".repeat(49),
  });
  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/48 UTF-8 bytes/i),
  ]));
});

test("cross-plan mapping reports arm, mode, and beeper differences", () => {
  const warnings = buildChannelMappingWarnings(
    { armChannel: 5, modeChannel: 7, beeperChannel: 8 },
    DEFAULT_RADIO_CONFIG,
  );
  expect(warnings).toHaveLength(3);
  expect(warnings.join(" ")).toMatch(/arm/i);
  expect(warnings.join(" ")).toMatch(/flight mode/i);
});

test("configured optional FC roles must also exist in the radio map", () => {
  const warnings = buildChannelMappingWarnings(
    { armChannel: 6, modeChannel: 5, beeperChannel: null, manualChannel: 7, ctrlChannel: null, sysidChannel: null },
    DEFAULT_RADIO_CONFIG,
  );
  expect(warnings.join(" ")).toMatch(/manual override/i);
});

test("only the complete documented bench profile receives the bench marker", () => {
  const benchProfile = {
    ...DEFAULT_RADIO_CONFIG,
    packetRateMode: "250",
    powerDbm: -14,
    antennaConfirmed: true,
    roleSwitchConfirmed: true,
    bindingPhrase: "RotorBench bench",
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      arm: 5,
      flightMode: 6,
      beeper: null,
      manual: null,
      control: null,
      systemId: null,
    },
  };
  expect(buildRadioSummary({
    ...benchProfile,
  }).matchesBenchSettings).toBe(true);
  expect(buildRadioSummary({
    ...benchProfile,
    packetRateMode: "500",
  }).matchesBenchSettings).toBe(false);
  expect(buildRadioSummary({
    ...benchProfile,
    bindingPhrase: "",
  }).matchesBenchSettings).toBe(false);
  expect(buildRadioSummary({
    ...benchProfile,
    channelMap: {
      ...benchProfile.channelMap,
      arm: 6,
      flightMode: 5,
    },
  }).matchesBenchSettings).toBe(false);
});

test("binding phrases longer than the ExpressLRS limit are rejected", () => {
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    bindingPhrase: "x".repeat(49),
  });
  expect(warnings).toEqual(
    expect.arrayContaining([expect.stringMatching(/48 UTF-8 bytes/i)]),
  );
});

test("role changes choose an endpoint profile that can represent that role", () => {
  expect(getRadioTargetForRole("tx", "generic-elrs-24-rx").id).toBe("aerialkit-elrs-rev-a3");
  expect(getRadioTargetForRole("rx", "generic-elrs-24-tx").id).toBe("aerialkit-elrs-rev-a3");
  expect(getRadioTargetForRole("rx", "generic-elrs-24-rx").id).toBe("generic-elrs-24-rx");
});

test("flight-controller mapping can be copied into every shared radio role", () => {
  const copied = applyFlightControllerChannelMap(DEFAULT_RADIO_CONFIG, {
    armChannel: 5,
    modeChannel: 6,
    beeperChannel: 7,
    manualChannel: 8,
    ctrlChannel: null,
    sysidChannel: null,
  });
  expect(copied.channelMap).toMatchObject({
    arm: 5,
    flightMode: 6,
    beeper: 7,
    manual: 8,
    control: null,
    systemId: null,
  });
});

test("invalid or missing radio channels are named before deployment", () => {
  const warnings = buildRadioWarnings(normalizeRadioConfig({
    ...DEFAULT_RADIO_CONFIG,
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      arm: 17,
      throttle: null,
    },
  }));
  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/Throttle/),
    expect.stringMatching(/channel from 1 to 16/i),
  ]));
});

test("packet rate and switch mode compatibility follows ExpressLRS packet families", () => {
  const fullResolutionWarning = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    packetRateMode: "100-full",
    switchMode: "wide",
  });
  expect(fullResolutionWarning).toEqual(
    expect.arrayContaining([expect.stringMatching(/100 Full and 333 Full/i)]),
  );

  const normalRateWarning = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    packetRateMode: "250",
    switchMode: "8ch-rate2",
  });
  expect(normalRateWarning).toEqual(
    expect.arrayContaining([expect.stringMatching(/Wide or Hybrid/i)]),
  );
});

test("Aerial Kit channel limit excludes stale roles its FC route cannot decode", () => {
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      beeper: 9,
      manual: 17,
    },
  }, { channelLimit: 8 });
  expect(warnings.join(" ")).not.toMatch(/beeper|manual override/i);
  const summary = buildRadioSummary({
    ...DEFAULT_RADIO_CONFIG,
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      beeper: 9,
      manual: 17,
    },
  }, { channelLimit: 8 });
  expect(summary.configuration.channelMap).toMatchObject({
    beeper: null,
    manual: null,
  });
});

test("MAVLink reports and normalizes its forced link settings", () => {
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    linkMode: "mavlink",
  });
  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/telemetry ratio to 1:2/i),
    expect.stringMatching(/Hybrid switch behavior/i),
  ]));
});

test("MAVLink full-resolution rates require 16ch Rate/2", () => {
  const warnings = buildRadioWarnings({
    ...DEFAULT_RADIO_CONFIG,
    packetRateMode: "333-full",
    linkMode: "mavlink",
    switchMode: "16ch-rate2",
    telemetryRatio: "1:2",
  });
  expect(warnings.join(" ")).not.toMatch(/Hybrid switch behavior/i);
  expect(getAvailableSwitchModes("333-full", "mavlink")).toEqual([
    "16ch-rate2",
  ]);
});
