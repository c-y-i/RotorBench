import {
  AERIALKIT_ANTI_GRAVITY_FIELDS,
  buildAerialKitAntiGravityPlan,
} from "./aerialKitAntiGravity";

const config = {
  antiGravityGain: 0,
  antiGravityCutoffHz: 5,
  antiGravityPGain: 100,
};

test("uses the Aerial Kit anti-gravity runtime names", () => {
  expect(AERIALKIT_ANTI_GRAVITY_FIELDS.map((field) => field.runtimeName))
    .toEqual([
      "anti_gravity_gain",
      "anti_gravity_cutoff_hz",
      "anti_gravity_p_gain",
    ]);
});

test("keeps anti-gravity off at the firmware default gain", () => {
  expect(buildAerialKitAntiGravityPlan(config)).toMatchObject({
    enabled: false,
    status: "off",
    gain: 0,
    cutoffHz: 5,
    pGainPercent: 100,
    axes: [],
  });
});

test("enables anti-gravity only on roll and pitch", () => {
  expect(buildAerialKitAntiGravityPlan({
    ...config,
    antiGravityGain: 80,
  })).toMatchObject({
    enabled: true,
    status: "enabled",
    gain: 80,
    cutoffHz: 5,
    pGainPercent: 100,
    axes: ["roll", "pitch"],
  });
});
