import {
  buildViewerPlacementAudit,
  getBatteryPlacementMm,
  getExplodedOffsetMm,
  getFrameMountPointsMm,
  getMotorOriginsMm,
  getPropellerHubDiameterMm,
  getPropellerOriginsMm,
  getPropellerVariant,
  getStackLevelsMm,
} from "./assemblyTransforms";

const frame = {
  id: "frame-test",
  size: 220,
  stackHeight: 30,
  upper_left_motor_position: [-86.01, 4.75, -70.74],
  upper_right_motor_position: [86.01, 4.75, -70.74],
  lower_right_motor_position: [86.01, 4.75, 70.74],
  lower_left_motor_position: [-86.01, 4.75, 70.74],
  motorMountPatternsMm: [[16, 16], [19, 19]],
};

const motor = {
  size: "2207",
  mounting_point: [0, 20.15, 0],
  dimensionsMm: [28, 31, 28],
  mountingPatternMm: [16, 16],
  propShaftMm: 5,
};

const propeller = {
  size: 5,
  bladeCount: 3,
  mounting_point: [0, 0, 0],
  shaftMm: 5,
  dimensionsMm: [127, 7, 127],
};

test("motor roots use the frame mount centers after model normalization", () => {
  expect(getMotorOriginsMm(frame, motor)).toEqual(getFrameMountPointsMm(frame));
});

test("propellers sit above each motor shaft with alternating handedness", () => {
  const origins = getPropellerOriginsMm(frame, motor, propeller);
  const motorOrigins = getMotorOriginsMm(frame, motor);

  origins.forEach((origin, index) => {
    expect(origin[0]).toBeCloseTo(motorOrigins[index][0]);
    expect(origin[2]).toBeCloseTo(motorOrigins[index][2]);
    expect(origin[1]).toBeGreaterThan(motorOrigins[index][1] + motor.dimensionsMm[1]);
  });

  expect(origins.map((origin) => origin[3])).toEqual([
    getPropellerVariant(0),
    getPropellerVariant(1),
    getPropellerVariant(2),
    getPropellerVariant(3),
  ]);
});

test("electronics stack in order and battery clears the stack", () => {
  const esc = { dimensionsMm: [45.6, 8.8, 40] };
  const flightController = { dimensionsMm: [41.6, 7.8, 39.4] };
  const receiver = { dimensionsMm: [28, 8, 24] };
  const battery = { mounting_point: [0, -25, 0], dimensionsMm: [78, 39, 38] };
  const levels = getStackLevelsMm(frame, { esc, flightController, receiver });

  expect(levels.esc).toBeLessThan(levels.flightController);
  expect(levels.flightController).toBeLessThan(levels.receiver);
  expect(getBatteryPlacementMm(frame, battery, { esc, flightController, receiver }).origin[1])
    .toBeGreaterThan(levels.receiver + receiver.dimensionsMm[1]);
});

test("props without explicit hub dimensions get a finite size-derived hub", () => {
  expect(getPropellerHubDiameterMm({
    size: 3.5,
    dimensionsMm: [89.5, 5.5, 89.5],
  })).toBeCloseTo(10.74);
  expect(getPropellerHubDiameterMm({
    size: 5,
    hubDiameterMm: 13,
  })).toBe(13);
});

test("exploded inspection preserves mount axes and restores exact zero offsets", () => {
  expect(getExplodedOffsetMm("frame", true)).toBe(0);
  expect(getExplodedOffsetMm("motor", true)).toBe(0);
  expect(getExplodedOffsetMm("propeller", true)).toBeGreaterThan(0);
  expect(getExplodedOffsetMm("esc", true))
    .toBeLessThan(getExplodedOffsetMm("flight_controller", true));
  expect(getExplodedOffsetMm("flight_controller", true))
    .toBeLessThan(getExplodedOffsetMm("receiver", true));
  expect(getExplodedOffsetMm("battery", true))
    .toBeGreaterThan(getExplodedOffsetMm("receiver", true));
  expect(getExplodedOffsetMm("battery", false)).toBe(0);
  expect(getExplodedOffsetMm("propeller", false)).toBe(0);
});

test("viewer placement audit verifies mounts, shaft alignment, stack, and battery", () => {
  const audit = buildViewerPlacementAudit(frame, {
    motor,
    propeller,
    esc: { id: "esc", dimensionsMm: [45, 8, 40] },
    flightController: { id: "fc", dimensionsMm: [36, 8, 36] },
    receiver: { id: "rx", dimensionsMm: [24, 7, 18] },
    battery: { id: "battery", dimensionsMm: [78, 39, 38] },
  });

  expect(audit.scope).toBe("viewer-placement");
  expect(audit.complete).toBe(true);
  expect(audit.verifiedCount).toBe(8);
  expect(audit.awaitingCount).toBe(0);
  expect(audit.conflictCount).toBe(0);
  expect(audit.checks.map((check) => check.id)).toEqual([
    "frame-mounts",
    "motor-roots",
    "propeller-shafts",
    "electronics-stack",
    "battery-clearance",
    "motor-interface",
    "propeller-hub",
    "propeller-sweep",
  ]);
});

test("viewer placement audit reports missing parts without claiming a placement pass", () => {
  const audit = buildViewerPlacementAudit(frame, {
    motor,
    esc: { id: "esc", dimensionsMm: [45, 8, 40] },
  });

  expect(audit.complete).toBe(false);
  expect(audit.verifiedCount).toBe(3);
  expect(audit.checks.find((check) => check.id === "propeller-shafts")).toMatchObject({
    status: "awaiting",
  });
  expect(audit.checks.find((check) => check.id === "battery-clearance")).toMatchObject({
    status: "awaiting",
  });
});

test("viewer placement audit awaits a frame when no mounts can be resolved", () => {
  const audit = buildViewerPlacementAudit(null, { motor });

  expect(audit.complete).toBe(false);
  expect(audit.verifiedCount).toBe(0);
  expect(audit.checks.every((check) => check.status === "awaiting")).toBe(true);
});

test("viewer placement audit flags mount, hub, and sweep conflicts", () => {
  const audit = buildViewerPlacementAudit(
    { ...frame, motorMountPatternsMm: [[12, 12]] },
    {
      ...{
        motor,
        propeller: {
          ...propeller,
          shaftMm: 1.5,
          dimensionsMm: [180, 7, 180],
        },
      },
    },
  );

  expect(audit.complete).toBe(false);
  expect(audit.conflictCount).toBe(3);
  expect(audit.checks.find((check) => check.id === "motor-interface").status)
    .toBe("conflict");
  expect(audit.checks.find((check) => check.id === "propeller-hub").status)
    .toBe("conflict");
  expect(audit.checks.find((check) => check.id === "propeller-sweep").status)
    .toBe("conflict");
});
