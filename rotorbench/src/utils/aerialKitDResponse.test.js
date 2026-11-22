import {
  AERIALKIT_D_RESPONSE_FIELDS,
  buildAerialKitDResponsePlan,
} from "./aerialKitDResponse";

const config = {
  rateKdRoll: 0.0025,
  rateKdPitch: 0.0025,
  rateKdYaw: 0,
  rateKdMaxRoll: 0,
  rateKdMaxPitch: 0,
  rateKdMaxYaw: 0,
  dMaxGain: 0,
  dMaxAdvance: 35,
};

test("uses Aerial Kit D-at-rest and D_MAX runtime names", () => {
  expect(AERIALKIT_D_RESPONSE_FIELDS.map((field) => field.runtimeName))
    .toEqual([
      "rate_kd_roll",
      "rate_kd_pitch",
      "rate_kd_yaw",
      "rate_kd_max_roll",
      "rate_kd_max_pitch",
      "rate_kd_max_yaw",
      "d_max_gain",
      "d_max_advance",
    ]);
});

test("keeps D_MAX off at the firmware defaults", () => {
  expect(buildAerialKitDResponsePlan(config)).toMatchObject({
    status: "off",
    enabled: false,
    enabledAxes: [],
    noHeadroomAxes: [],
    dMaxGain: 0,
    dMaxAdvance: 35,
  });
});

test("activates D_MAX only above the axis's D-at-rest value", () => {
  const plan = buildAerialKitDResponsePlan({
    ...config,
    rateKdMaxRoll: 0.005,
    rateKdMaxPitch: 0.002,
  });

  expect(plan).toMatchObject({
    status: "configured",
    enabled: true,
  });
  expect(plan.enabledAxes).toEqual([
    expect.objectContaining({
      id: "roll",
      base: 0.0025,
      maximum: 0.005,
      headroom: 0.0025,
    }),
  ]);
  expect(plan.noHeadroomAxes).toEqual([
    expect.objectContaining({
      id: "pitch",
      base: 0.0025,
      maximum: 0.002,
    }),
  ]);
});

test("reports a staged D_MAX with no active axis when every value lacks headroom", () => {
  const plan = buildAerialKitDResponsePlan({
    ...config,
    rateKdMaxRoll: 0.0025,
    rateKdMaxPitch: 0.001,
    rateKdMaxYaw: 0,
  });

  expect(plan).toMatchObject({
    status: "no-headroom",
    enabled: false,
  });
  expect(plan.noHeadroomAxes.map((axis) => axis.id)).toEqual([
    "roll",
    "pitch",
  ]);
});
