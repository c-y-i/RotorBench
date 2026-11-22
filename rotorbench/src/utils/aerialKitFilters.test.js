import {
  AERIALKIT_FILTER_FIELDS,
  buildAerialKitFilterPlan,
} from "./aerialKitFilters";

const baseConfig = {
  gyroRateHz: 0,
  pidDenom: 1,
  gyroLpf1StaticHz: 250,
  gyroLpf1DynMinHz: 250,
  gyroLpf1DynMaxHz: 500,
  gyroLpf2StaticHz: 500,
  dtermLpf1StaticHz: 75,
  dtermLpf1DynMinHz: 75,
  dtermLpf1DynMaxHz: 150,
  dtermLpf2StaticHz: 150,
};

test("Aerial Kit filter fields mirror the runtime parameter names", () => {
  expect(AERIALKIT_FILTER_FIELDS.map((field) => field.runtimeName)).toEqual([
    "gyro_lpf1_static_hz",
    "gyro_lpf1_dyn_min_hz",
    "gyro_lpf1_dyn_max_hz",
    "gyro_lpf2_static_hz",
    "dterm_lpf1_static_hz",
    "dterm_lpf1_dyn_min_hz",
    "dterm_lpf1_dyn_max_hz",
    "dterm_lpf2_static_hz",
  ]);
});

test("reports dynamic bounds as requested when the driver owns the loop rate", () => {
  const plan = buildAerialKitFilterPlan(baseConfig);

  expect(plan).toMatchObject({
    requestedGyroRateHz: 0,
    loopHz: null,
    maxFilterHz: null,
    clampKnown: false,
    clampedCount: 0,
  });
  expect(plan.chains[0].primary).toMatchObject({
    mode: "dynamic",
    requestedLowHz: 250,
    requestedHighHz: 500,
    appliedLowHz: null,
    appliedHighHz: null,
    clampKnown: false,
  });
  expect(plan.chains[1].primary).toMatchObject({
    mode: "dynamic",
    requestedLowHz: 75,
    requestedHighHz: 150,
    appliedLowHz: null,
    appliedHighHz: null,
  });
});

test("applies the quarter-loop ceiling to both dynamic ends", () => {
  const plan = buildAerialKitFilterPlan({
    ...baseConfig,
    gyroRateHz: 1000,
    pidDenom: 2,
  });

  expect(plan.loopHz).toBe(500);
  expect(plan.maxFilterHz).toBe(125);
  expect(plan.chains[0].primary).toMatchObject({
    requestedLowHz: 250,
    requestedHighHz: 500,
    appliedLowHz: 125,
    appliedHighHz: 125,
    clamped: true,
  });
  expect(plan.chains[0].secondary).toMatchObject({
    requestedLowHz: 500,
    appliedLowHz: 125,
    clamped: true,
  });
  expect(plan.chains[1].primary).toMatchObject({
    requestedLowHz: 75,
    requestedHighHz: 150,
    appliedLowHz: 75,
    appliedHighHz: 125,
    clamped: true,
  });
  expect(plan.clampedCount).toBe(4);
});

test("a 2 kHz loop preserves the Aerial Kit D-term default cutoffs", () => {
  const plan = buildAerialKitFilterPlan({
    ...baseConfig,
    gyroRateHz: 4000,
    pidDenom: 2,
  });

  expect(plan.loopHz).toBe(2000);
  expect(plan.maxFilterHz).toBe(500);
  expect(plan.chains[0].primary).toMatchObject({
    appliedLowHz: 250,
    appliedHighHz: 500,
    clamped: false,
  });
  expect(plan.chains[0].secondary.clamped).toBe(false);
  expect(plan.chains[1].primary).toMatchObject({
    appliedLowHz: 75,
    appliedHighHz: 150,
    clamped: false,
  });
  expect(plan.clampedCount).toBe(0);
});

test("selects the static cutoff when dynamic low is zero", () => {
  const plan = buildAerialKitFilterPlan({
    ...baseConfig,
    gyroRateHz: 3200,
    gyroLpf1StaticHz: 210,
    gyroLpf1DynMinHz: 0,
    gyroLpf1DynMaxHz: 700,
  });

  expect(plan.chains[0].primary).toMatchObject({
    mode: "static",
    requestedLowHz: 210,
    requestedHighHz: 210,
    appliedLowHz: 210,
    appliedHighHz: 210,
    clamped: false,
  });
});

test("marks disabled, fixed, and inverted dynamic stages without inventing a filter", () => {
  const plan = buildAerialKitFilterPlan({
    ...baseConfig,
    gyroRateHz: 3200,
    gyroLpf1DynMinHz: 180,
    gyroLpf1DynMaxHz: 180,
    gyroLpf2StaticHz: 0,
    dtermLpf1StaticHz: 90,
    dtermLpf1DynMinHz: 0,
    dtermLpf1DynMaxHz: 0,
    dtermLpf2StaticHz: 0,
  });

  expect(plan.chains[0].primary).toMatchObject({
    mode: "dynamic",
    noDynamicMovement: true,
    appliedLowHz: 180,
    appliedHighHz: 180,
  });
  expect(plan.chains[0].secondary).toMatchObject({
    mode: "off",
    disabled: true,
    appliedLowHz: 0,
    appliedHighHz: 0,
  });
  expect(plan.chains[1].primary).toMatchObject({
    mode: "static",
    requestedLowHz: 90,
  });

  const inverted = buildAerialKitFilterPlan({
    ...baseConfig,
    gyroRateHz: 3200,
    dtermLpf1DynMinHz: 140,
    dtermLpf1DynMaxHz: 100,
  });
  expect(inverted.chains[1].primary).toMatchObject({
    dynamicMaxBelowFloor: true,
    requestedLowHz: 140,
    requestedHighHz: 140,
  });
});
