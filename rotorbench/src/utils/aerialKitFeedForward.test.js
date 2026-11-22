import {
  AERIALKIT_FEED_FORWARD_FIELDS,
  buildAerialKitFeedForwardPlan,
} from "./aerialKitFeedForward";

const config = {
  rateFfdRoll: 0,
  rateFfdPitch: 0,
  rateFfdYaw: 0,
  ffSmoothFactor: 65,
  ffJitterFactor: 7,
  ffBoost: 15,
  ffMaxRateLimit: 90,
};

test("uses Aerial Kit feed-forward names and defaults", () => {
  expect(AERIALKIT_FEED_FORWARD_FIELDS.map((field) => field.runtimeName))
    .toEqual([
      "rate_ffd_roll",
      "rate_ffd_pitch",
      "rate_ffd_yaw",
      "ff_smooth_factor",
      "ff_jitter_factor",
      "ff_boost",
      "ff_max_rate_limit",
    ]);
  expect(buildAerialKitFeedForwardPlan(config)).toMatchObject({
    enabled: false,
    status: "off",
    smoothFactor: 65,
    jitterFactor: 7,
    boost: 15,
    maxRateLimit: 90,
  });
});

test("derives the two-stage smoothing response at a nominal radio rate", () => {
  const plan = buildAerialKitFeedForwardPlan({
    ...config,
    rateFfdRoll: 0.012,
  }, {
    linkRateHz: 250,
    linkRateLabel: "250",
  });

  expect(plan).toMatchObject({
    enabled: true,
    status: "planned",
    linkRateHz: 250,
    linkRateLabel: "250",
    sampleIntervalMs: 4,
    jitterDivisor: 8,
    boostScale: 0.015,
  });
  expect(plan.enabledAxes).toEqual([
    { id: "roll", label: "Roll", gain: 0.012 },
  ]);
  expect(plan.tauMs).toBeCloseTo(7.4286, 3);
  expect(plan.filterK).toBeCloseTo(0.35, 3);
});

test("keeps enabled feed-forward unverified until a radio rate exists", () => {
  const plan = buildAerialKitFeedForwardPlan({
    ...config,
    rateFfdRoll: 0.01,
    rateFfdYaw: 0.02,
  });

  expect(plan).toMatchObject({
    enabled: true,
    status: "unverified",
    linkRateHz: null,
    sampleIntervalMs: null,
    filterK: null,
  });
  expect(plan.enabledAxes.map((axis) => axis.id)).toEqual(["roll", "yaw"]);
});

test("clamps the firmware smooth factor at 95 for response math", () => {
  const plan = buildAerialKitFeedForwardPlan({
    ...config,
    rateFfdRoll: 0.01,
    ffSmoothFactor: 100,
  }, { linkRateHz: 250 });

  expect(plan.tauMs).toBeGreaterThan(60);
  expect(plan.filterK).toBeGreaterThan(0);
  expect(plan.filterK).toBeLessThan(0.1);
});
