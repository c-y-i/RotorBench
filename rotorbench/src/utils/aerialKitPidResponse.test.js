import {
  AERIALKIT_PID_RESPONSE_FIELDS,
  buildAerialKitPidResponsePlan,
} from "./aerialKitPidResponse";

const config = {
  rateFfRoll: 0,
  rateFfPitch: 0,
  rateFfYaw: 0,
  itermRelaxHz: 0,
};

test("uses Aerial Kit static feed-forward and I-term relax names", () => {
  expect(AERIALKIT_PID_RESPONSE_FIELDS.map((field) => field.runtimeName))
    .toEqual([
      "rate_ff_roll",
      "rate_ff_pitch",
      "rate_ff_yaw",
      "iterm_relax_hz",
    ]);
});

test("keeps both response features off at their firmware defaults", () => {
  expect(buildAerialKitPidResponsePlan(config)).toMatchObject({
    status: "off",
    staticFeedForwardEnabled: false,
    itermRelaxEnabled: false,
    enabledAxes: [],
  });
});

test("reports static feed-forward, relax, and combined states", () => {
  const feedForward = buildAerialKitPidResponsePlan({
    ...config,
    rateFfRoll: 0.125,
    rateFfPitch: 0.125,
  });
  expect(feedForward).toMatchObject({
    status: "feed-forward",
    staticFeedForwardEnabled: true,
    itermRelaxEnabled: false,
  });
  expect(feedForward.enabledAxes.map((axis) => axis.id)).toEqual([
    "roll",
    "pitch",
  ]);

  expect(buildAerialKitPidResponsePlan({
    ...config,
    itermRelaxHz: 15,
  })).toMatchObject({
    status: "relax",
    itermRelaxHz: 15,
  });

  expect(buildAerialKitPidResponsePlan({
    ...config,
    rateFfYaw: 0.05,
    itermRelaxHz: 15,
  })).toMatchObject({
    status: "combined",
    staticFeedForwardEnabled: true,
    itermRelaxEnabled: true,
  });
});
