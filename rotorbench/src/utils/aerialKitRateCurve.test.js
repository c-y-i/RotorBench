import {
  aerialKitRateAtStick,
  aerialKitTpaFactor,
  buildAerialKitRateCurve,
  summarizeAerialKitRateFeel,
} from "./aerialKitRateCurve";

const actualRateConfig = {
  maxRateDps: 700,
  rateCenterDps: 350,
  rateExpo: 0.5,
  tpaRate: 20,
  tpaBreakpoint: 0.5,
};

test("Aerial Kit rate curve matches the firmware Actual-rate equation", () => {
  expect(aerialKitRateAtStick(0.5, actualRateConfig)).toBeCloseTo(221.484375, 6);
  expect(aerialKitRateAtStick(-0.5, actualRateConfig)).toBeCloseTo(-221.484375, 6);
  expect(aerialKitRateAtStick(1, actualRateConfig)).toBe(700);
  expect(aerialKitRateAtStick(-1, actualRateConfig)).toBe(-700);
});

test("zero or excessive centre slope falls back to the firmware linear curve", () => {
  expect(aerialKitRateAtStick(0.25, {
    maxRateDps: 700,
    rateCenterDps: 0,
    rateExpo: 1,
  })).toBe(175);
  expect(aerialKitRateAtStick(0.25, {
    maxRateDps: 700,
    rateCenterDps: 700,
    rateExpo: 1,
  })).toBe(175);
});

test("rate curve samples span both stick extremes", () => {
  const points = buildAerialKitRateCurve(actualRateConfig, 21);
  expect(points).toHaveLength(21);
  expect(points[0]).toEqual({ stick: -1, rateDps: -700 });
  expect(points.at(-1)).toEqual({ stick: 1, rateDps: 700 });
});

test("TPA follows the multirotor and fixed-wing firmware branches", () => {
  expect(aerialKitTpaFactor(1, { tpaRate: 20, tpaBreakpoint: 0.5 })).toBeCloseTo(0.8);
  expect(aerialKitTpaFactor(0.75, { tpaRate: 20, tpaBreakpoint: 0.5 })).toBeCloseTo(0.9);
  expect(aerialKitTpaFactor(0.25, { tpaRate: 20, tpaBreakpoint: 0.5 })).toBe(1);
  expect(aerialKitTpaFactor(1, {
    tpaRate: 50,
    tpaBreakpoint: 0.5,
  }, true)).toBeCloseTo(0.8684210526);
  expect(aerialKitTpaFactor(0.2, {
    tpaRate: 100,
    tpaBreakpoint: 0.5,
  }, true)).toBeCloseTo(2);
});

test("rate-feel summary names the active shaping and full-throttle gain", () => {
  expect(summarizeAerialKitRateFeel(actualRateConfig, {
    fixedWing: false,
  })).toMatchObject({
    usesLinearCurve: false,
    centerRateDps: 350,
    halfStickRateDps: 221.484375,
    fullStickRateDps: 700,
    fullThrottleTpaFactor: 0.8,
    expo: 0.5,
    tpaRate: 20,
  });
  expect(summarizeAerialKitRateFeel({
    maxRateDps: 700,
    rateCenterDps: 0,
  }).usesLinearCurve).toBe(true);
});
