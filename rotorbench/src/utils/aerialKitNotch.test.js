import {
  AERIALKIT_DYNAMIC_NOTCH_FIELDS,
  buildAerialKitNotchPlan,
} from "./aerialKitNotch";

const config = {
  gyroRateHz: 0,
  pidDenom: 1,
  dynNotchCount: 3,
  dynNotchQ: 300,
  dynNotchMinHz: 100,
  dynNotchMaxHz: 600,
};

test("uses the runtime names and defaults of the Aerial Kit notch bank", () => {
  expect(AERIALKIT_DYNAMIC_NOTCH_FIELDS.map((field) => field.runtimeName))
    .toEqual([
      "dyn_notch_count",
      "dyn_notch_q",
      "dyn_notch_min_hz",
      "dyn_notch_max_hz",
    ]);
  expect(buildAerialKitNotchPlan(config)).toMatchObject({
    count: 3,
    qHundredths: 300,
    q: 3,
    requestedMinHz: 100,
    requestedMaxHz: 600,
    loopHz: null,
    status: "unverified",
    eligible: false,
  });
});

test("derives decimation and analysis bins for an eligible 2 kHz loop", () => {
  const plan = buildAerialKitNotchPlan({
    ...config,
    gyroRateHz: 4000,
    pidDenom: 2,
  });

  expect(plan).toMatchObject({
    status: "eligible",
    eligible: true,
    loopHz: 2000,
    decimation: 1,
    analysisRateHz: 2000,
    binHz: 31.25,
    effectiveMinHz: 93.75,
    effectiveMaxHz: 593.75,
  });
});

test("uses the firmware decimation law at an 8 kHz loop", () => {
  const plan = buildAerialKitNotchPlan({
    ...config,
    gyroRateHz: 8000,
  });

  expect(plan).toMatchObject({
    status: "eligible",
    decimation: 6,
  });
  expect(plan.analysisRateHz).toBeCloseTo(1333.333, 3);
  expect(plan.binHz).toBeCloseTo(20.833, 3);
});

test("keeps the bank off below the 2 kHz loop gate", () => {
  const plan = buildAerialKitNotchPlan({
    ...config,
    gyroRateHz: 3200,
    pidDenom: 2,
  });

  expect(plan).toMatchObject({
    status: "loop-gate",
    loopHz: 1600,
    eligible: false,
    analysisRateHz: null,
  });
  expect(plan.detail).toMatch(/does not measure or filter/i);
});

test("reports count-off and invalid bands without inventing a notch", () => {
  expect(buildAerialKitNotchPlan({
    ...config,
    gyroRateHz: 4000,
    dynNotchCount: 0,
  })).toMatchObject({
    status: "off",
    detail: expect.stringMatching(/disabled by request/i),
  });

  expect(buildAerialKitNotchPlan({
    ...config,
    gyroRateHz: 4000,
    dynNotchMinHz: 600,
    dynNotchMaxHz: 600,
  })).toMatchObject({
    status: "band-invalid",
    analysisRateHz: null,
    detail: expect.stringMatching(/refuses this band/i),
  });
});
