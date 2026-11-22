import {
  AERIALKIT_RC_SMOOTHING_FIELDS,
  buildAerialKitRcSmoothingPlan,
} from "./aerialKitRcSmoothing";

const config = {
  rcSmooth: 1,
  rcSmoothHz: 0,
  rcSmoothFactor: 30,
  gyroRateHz: 0,
  pidDenom: 1,
};

test("uses the Aerial Kit runtime RC-smoothing parameter names", () => {
  expect(AERIALKIT_RC_SMOOTHING_FIELDS.map((field) => field.runtimeName))
    .toEqual(["rc_smooth", "rc_smooth_hz", "rc_smooth_factor"]);
});

test("derives the auto cutoff from a nominal 250 Hz radio link", () => {
  const plan = buildAerialKitRcSmoothingPlan(config, {
    linkRateHz: 250,
    linkRateLabel: "250",
  });

  expect(plan).toMatchObject({
    status: "auto",
    source: "auto",
    linkRateHz: 250,
    linkRateLabel: "250",
    derivedCutoffHz: 93.75,
    appliedCutoffHz: null,
    clampKnown: false,
  });
});

test("manual cutoff overrides the link-derived cutoff", () => {
  const plan = buildAerialKitRcSmoothingPlan({
    ...config,
    rcSmoothHz: 56,
  }, { linkRateHz: 250 });

  expect(plan).toMatchObject({
    status: "manual",
    source: "manual",
    manualHz: 56,
    derivedCutoffHz: 56,
  });
});

test("the auto factor changes smoothing and respects the 15 Hz floor", () => {
  const defaultFactor = buildAerialKitRcSmoothingPlan(config, {
    linkRateHz: 150,
  });
  const higherFactor = buildAerialKitRcSmoothingPlan({
    ...config,
    rcSmoothFactor: 60,
  }, { linkRateHz: 150 });
  const floor = buildAerialKitRcSmoothingPlan(config, {
    linkRateHz: 20,
  });

  expect(defaultFactor.derivedCutoffHz).toBeCloseTo(56.25, 2);
  expect(higherFactor.derivedCutoffHz).toBeCloseTo(32.143, 2);
  expect(floor.derivedCutoffHz).toBe(15);
});

test("applies the PT3 runtime ceiling without inventing a driver-owned loop", () => {
  const known = buildAerialKitRcSmoothingPlan({
    ...config,
    rcSmoothFactor: 0,
    gyroRateHz: 1000,
    pidDenom: 1,
  }, { linkRateHz: 1000 });
  expect(known.derivedCutoffHz).toBe(1500);
  expect(known.requestedLoopCeilingHz).toBeCloseTo(127.456, 3);
  expect(known.appliedCutoffHz).toBeCloseTo(127.456, 3);
  expect(known.clamped).toBe(true);

  const driverOwned = buildAerialKitRcSmoothingPlan(config, {
    linkRateHz: 250,
  });
  expect(driverOwned.appliedCutoffHz).toBeNull();
  expect(driverOwned.clampKnown).toBe(false);
});

test("reports disabled and waiting states without pretending a filter exists", () => {
  expect(buildAerialKitRcSmoothingPlan({
    ...config,
    rcSmooth: 0,
  }, { linkRateHz: 250 })).toMatchObject({
    status: "off",
    appliedCutoffHz: 0,
  });
  expect(buildAerialKitRcSmoothingPlan(config)).toMatchObject({
    status: "waiting",
    source: null,
    derivedCutoffHz: 0,
    appliedCutoffHz: 0,
  });
});
