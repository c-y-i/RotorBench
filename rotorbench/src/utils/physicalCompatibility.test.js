import {
  checkBatteryEnvelope,
  checkBoardFootprint,
  checkBoardStack,
  checkMotorMount,
  checkPowerConnector,
  checkPropellerFit,
  physicalChecksFor,
  summarizeAssemblyInterfaces,
  summarizePowerPath,
  summarizePhysicalChecks,
} from "./physicalCompatibility";

const frame = {
  name: "Frame",
  stackMountPatternsMm: [[30.5, 30.5], [20, 20]],
  motorMountPatternsMm: [[16, 16], [19, 19]],
};

test("stack and motor patterns are evaluated when the catalog has both sides", () => {
  expect(checkBoardStack({ name: "FC", mountingPatternMm: [30.5, 30.5] }, frame))
    .toMatchObject({ status: "compatible", label: "FC stack mount" });
  expect(checkBoardStack({ name: "FC", mountingPatternMm: [25.5, 25.5] }, frame))
    .toMatchObject({ status: "conflict", label: "FC stack mount" });
  expect(checkMotorMount({ name: "Motor", mountingPatternMm: [16, 16] }, frame))
    .toMatchObject({ status: "compatible", label: "Motor mount" });
  expect(checkMotorMount({ name: "Motor", mountingPatternMm: [12, 12] }, frame))
    .toMatchObject({ status: "conflict" });
});

test("prop bore and motor shaft data detect an exact mismatch", () => {
  expect(checkPropellerFit(
    { name: "Prop", shaftMm: 5, hubDiameterMm: 13 },
    { name: "Motor", propShaftMm: 5, bellDiameterMm: 27.5 },
  )).toMatchObject({ status: "compatible", label: "Prop hub fit" });
  expect(checkPropellerFit(
    { name: "Prop", shaftMm: 4, hubDiameterMm: 13 },
    { name: "Motor", propShaftMm: 5, bellDiameterMm: 27.5 },
  )).toMatchObject({ status: "conflict" });
});

test("source-backed board planforms stay conservative about usable stack clearance", () => {
  expect(checkBoardFootprint(
    { name: "Tekko32", planformMm: [43, 44] },
    { name: "AOS 5 V5", dimensionsMm: [180, 34, 140] },
  )).toBeNull();
  expect(checkBoardFootprint(
    { name: "Oversized board", planformMm: [160, 160] },
    { name: "Small frame", dimensionsMm: [133, 30, 93] },
  )).toMatchObject({
    status: "conflict",
    message: expect.stringMatching(/exceeds the Small frame's overall/i),
  });
  expect(checkBoardFootprint(
    { name: "Board without planform" },
    { name: "Frame", dimensionsMm: [180, 34, 140] },
  )).toBeNull();
});

test("build-local measurements stay measured instead of becoming verified", () => {
  const measured = checkPropellerFit(
    { name: "Prop", shaftMm: 5, hubDiameterMm: 13 },
    {
      name: "Motor",
      propShaftMm: 5,
      bellDiameterMm: 27.5,
      measuredFields: ["propShaftMm"],
    },
  );
  expect(measured).toMatchObject({ status: "measured" });
  expect(summarizePhysicalChecks([measured])).toEqual({
    ok: true,
    verified: false,
    measured: 1,
    reason: "5 mm prop mounting matches the motor shaft.",
  });
});

test("incomplete metadata stays unverified instead of claiming compatibility", () => {
  const checks = physicalChecksFor(
    "motors",
    { name: "Legacy motor", mountingPatternMm: [16, 16] },
    { frame: { name: "Legacy frame" }, propeller: null },
  );
  expect(summarizePhysicalChecks(checks)).toMatchObject({
    ok: true,
    verified: false,
  });
});

test("battery and ESC power connectors produce verified matches and conflicts", () => {
  expect(checkPowerConnector(
    { name: "Battery", dischargeConnector: "XT60" },
    { name: "ESC", includedPowerConnector: "XT60" },
  )).toMatchObject({ status: "compatible", label: "Battery to ESC connector" });
  expect(checkPowerConnector(
    { name: "Battery", dischargeConnector: "XT30" },
    { name: "ESC", includedPowerConnector: "XT60" },
  )).toMatchObject({ status: "conflict" });
  expect(checkPowerConnector(
    { name: "Battery" },
    { name: "ESC", includedPowerConnector: "XT60" },
  )).toMatchObject({ status: "unknown" });
});

test("source-backed power termination remains manual when no connector is supplied", () => {
  expect(checkPowerConnector(
    { name: "Battery", dischargeConnector: "XT60" },
    { name: "Solder-pad ESC", powerConnection: "solder-pads" },
  )).toMatchObject({
    status: "unknown",
    message: expect.stringMatching(/bare power pads/i),
  });
  expect(checkPowerConnector(
    { name: "Battery", dischargeConnector: "XT60" },
    { name: "Cable ESC", powerConnection: "supplied-cable" },
  )).toMatchObject({
    status: "unknown",
    message: expect.stringMatching(/does not publish its connector type/i),
  });
});

test("assembly interface summaries count matched, review, and conflict joints", () => {
  expect(summarizeAssemblyInterfaces({
    frame: {
      id: "frame",
      name: "Frame",
      stackMountPatternsMm: [[20, 20]],
      motorMountPatternsMm: [[12, 12]],
    },
    motor: {
      id: "motor",
      name: "Motor",
      mountingPatternMm: [12, 12],
      propShaftMm: 1.5,
    },
    propeller: {
      id: "prop",
      name: "Prop",
      shaftMm: 1.5,
    },
    flightController: {
      id: "fc",
      name: "FC",
      mountingPatternMm: [20, 20],
    },
    esc: {
      id: "esc",
      name: "ESC",
      mountingPatternMm: [20, 20],
      includedPowerConnector: "XT30",
    },
    battery: {
      id: "battery",
      name: "Battery",
      dischargeConnector: "XT30",
    },
  })).toEqual({
    totalCount: 5,
    matchedCount: 5,
    unknownCount: 0,
    conflictCount: 0,
    complete: true,
  });

  expect(summarizeAssemblyInterfaces({
    frame: { id: "frame", name: "Incomplete frame" },
    motor: { id: "motor", name: "Motor" },
    propeller: { id: "prop", name: "Prop" },
    esc: { id: "esc", name: "ESC" },
    battery: { id: "battery", name: "Battery" },
  })).toMatchObject({
    matchedCount: 0,
    unknownCount: 4,
    conflictCount: 0,
    complete: false,
  });
});

test("power path summaries name matches, adapters, solder pads, and unpublished cables", () => {
  expect(summarizePowerPath(
    {
      name: "XT60 pack",
      dischargeConnector: "XT60",
      connectorSourceUrl: "https://example.com/battery",
    },
    {
      name: "XT60 ESC",
      includedPowerConnector: "XT60",
      powerConnection: "connector",
      connectorSourceUrl: "https://example.com/esc",
    },
  )).toMatchObject({
    displayState: "verified",
    label: "XT60 match",
    batteryConnectorSourceUrl: "https://example.com/battery",
    escConnectorSourceUrl: "https://example.com/esc",
  });
  expect(summarizePowerPath(
    { name: "XT30 pack", dischargeConnector: "XT30" },
    {
      name: "XT60 ESC",
      includedPowerConnector: "XT60",
      powerConnection: "connector",
    },
  )).toMatchObject({
    displayState: "conflict",
    label: "Adapter required",
    adapterLabel: "XT30-to-XT60 adapter",
    polarityNote: expect.stringMatching(/red\/black polarity and connector gender/i),
  });
  expect(summarizePowerPath(
    { name: "XT60 pack", dischargeConnector: "XT60" },
    { name: "Pad ESC", powerConnection: "solder-pads" },
  )).toMatchObject({
    displayState: "manual",
    label: "Solder lead",
    adapterLabel: null,
  });
  expect(summarizePowerPath(
    { name: "XT60 pack", dischargeConnector: "XT60" },
    { name: "Cable ESC", powerConnection: "supplied-cable" },
  )).toMatchObject({
    displayState: "review",
    label: "Verify termination",
  });
});

test("battery envelopes only flag dimensions that exceed the complete frame footprint", () => {
  const smallFrame = {
    name: "Small frame",
    dimensionsMm: [120, 30, 100],
  };
  expect(checkBatteryEnvelope(
    { name: "Fits", dimensionsMm: [90, 40, 35] },
    smallFrame,
  )).toBeNull();
  expect(checkBatteryEnvelope(
    { name: "Oversized", dimensionsMm: [140, 50, 130] },
    smallFrame,
  )).toMatchObject({
    status: "conflict",
    label: "Battery deck footprint",
  });
  expect(checkBatteryEnvelope(
    { name: "Unknown", dimensionsMm: null },
    smallFrame,
  )).toBeNull();
});

test("measured usable battery decks produce measured footprint checks", () => {
  const frameWithDeck = {
    name: "Measured deck frame",
    dimensionsMm: [220, 30, 190],
    batteryDeckDimensionsMm: [70, 80],
    measuredFields: ["batteryDeckDimensionsMm"],
  };
  expect(checkBatteryEnvelope(
    { name: "Fits", dimensionsMm: [75, 35, 65] },
    frameWithDeck,
  )).toMatchObject({
    status: "measured",
    label: "Battery deck footprint",
    message: expect.stringMatching(/measured usable battery deck of 70 × 80 mm/i),
  });
  expect(checkBatteryEnvelope(
    { name: "Oversized", dimensionsMm: [90, 45, 85] },
    frameWithDeck,
  )).toMatchObject({
    status: "conflict",
    label: "Battery deck footprint",
    message: expect.stringMatching(/measured usable battery deck of 70 × 80 mm/i),
  });
  expect(checkBatteryEnvelope(
    { name: "Fits legacy frame", dimensionsMm: [75, 35, 65] },
    {
      name: "Deck-only frame",
      batteryDeckDimensionsMm: [70, 80],
      measuredFields: ["batteryDeckDimensionsMm"],
    },
  )).toMatchObject({
    status: "measured",
    label: "Battery deck footprint",
  });
});

test("shared compatibility checks are summarized once", () => {
  const repeated = {
    status: "compatible",
    message: "XT30 battery connector matches the supplied lead.",
  };
  expect(summarizePhysicalChecks([repeated, { ...repeated }])).toEqual({
    ok: true,
    verified: true,
    measured: 0,
    reason: "XT30 battery connector matches the supplied lead.",
  });
});
