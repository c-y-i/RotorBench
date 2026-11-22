import {
  AERIALKIT_PID_GAIN_FIELDS,
  buildAerialKitPidGainPlan,
} from "./aerialKitPidGains";

const defaults = {
  rateKpRoll: 0.25,
  rateKpPitch: 0.25,
  rateKpYaw: 0.35,
  rateKiRoll: 0.15,
  rateKiPitch: 0.15,
  rateKiYaw: 0.2,
  rateILimit: 0.3,
  torqueLimit: 0.6,
};

test("uses the Aerial Kit baseline PID runtime names", () => {
  expect(AERIALKIT_PID_GAIN_FIELDS.map((field) => field.runtimeName))
    .toEqual([
      "rate_kp_roll",
      "rate_kp_pitch",
      "rate_kp_yaw",
      "rate_ki_roll",
      "rate_ki_pitch",
      "rate_ki_yaw",
      "rate_i_limit",
      "torque_limit",
    ]);
});

test("identifies the firmware source defaults", () => {
  const plan = buildAerialKitPidGainPlan(defaults);
  expect(plan).toMatchObject({
    status: "source-default",
    matchesFirmwareDefaults: true,
    rateILimit: 0.3,
    torqueLimit: 0.6,
  });
  expect(plan.axes).toEqual([
    { id: "roll", label: "Roll", p: 0.25, i: 0.15 },
    { id: "pitch", label: "Pitch", p: 0.25, i: 0.15 },
    { id: "yaw", label: "Yaw", p: 0.35, i: 0.2 },
  ]);
});

test("marks edited gains without recommending replacement values", () => {
  expect(buildAerialKitPidGainPlan({
    ...defaults,
    rateKpRoll: 0.3,
  })).toMatchObject({
    status: "edited",
    matchesFirmwareDefaults: false,
  });
});
