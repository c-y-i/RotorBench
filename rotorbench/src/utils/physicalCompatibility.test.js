import {
  checkBatteryEnvelope,
  checkBoardStack,
  checkMotorMount,
  checkPowerConnector,
  checkPropellerFit,
  physicalChecksFor,
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
    label: "Oversized envelope",
  });
  expect(checkBatteryEnvelope(
    { name: "Unknown", dimensionsMm: null },
    smallFrame,
  )).toBeNull();
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
