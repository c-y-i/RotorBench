import { summarizeTakeoffWeight } from "./flightEnvelope";

const envelope = {
  takeoffWeightG: [350, 500],
};

test("reports a planning estimate inside the published takeoff range", () => {
  expect(summarizeTakeoffWeight(425, envelope)).toMatchObject({
    status: "within",
    shortLabel: "Within 350–500 g envelope",
    label: "425 g planning estimate · within the 350–500 g published envelope · verify with a scale",
  });
});

test("reports how far an over-weight planning estimate exceeds the range", () => {
  expect(summarizeTakeoffWeight(548.04, envelope)).toMatchObject({
    status: "above",
    shortLabel: "+48 g over 500 g envelope",
    label: "548 g planning estimate · 48 g over the 500 g published maximum · verify with a scale",
  });
});

test("reports how far an under-weight planning estimate falls below the range", () => {
  expect(summarizeTakeoffWeight(320, envelope)).toMatchObject({
    status: "below",
    shortLabel: "−30 g under 350 g envelope",
    label: "320 g planning estimate · 30 g below the 350 g published minimum · verify with a scale",
  });
});

test("does not compare a missing weight to an invalid envelope", () => {
  expect(summarizeTakeoffWeight(null, envelope)).toBeNull();
  expect(summarizeTakeoffWeight(425, { takeoffWeightG: [500, 350] })).toBeNull();
});
