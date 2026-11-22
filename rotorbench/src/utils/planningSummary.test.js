import {
  BUILD_WEIGHT_ALLOWANCE_G,
  summarizeBuildPlanning,
} from "./planningSummary";

const t1Build = {
  componentIds: {
    frameId: "frame-heewing-t1-ranger",
    motorId: "motor-heewing-fx1406-3150kv",
    propellerId: "prop-heewing-fx3830-2",
    escId: "esc-heewing-fx20a-bls-twin",
    flightControllerId: "fc-matek-f405-wmn",
    batteryId: "battery-cnhl-black-4s-1500-100c",
    receiverId: "rx-radiomaster-rp4td-m",
  },
};

test("summarizes planning totals using the frame motor count", () => {
  expect(summarizeBuildPlanning(t1Build)).toMatchObject({
    selectedCount: 7,
    motorCount: 2,
    catalogWeight: 456,
    planningAllowanceG: BUILD_WEIGHT_ALLOWANCE_G,
    totalWeight: 506,
    totalPrice: 297.89,
    publishedTakeoffRangeG: [350, 500],
    takeoffEnvelopeStatus: "above",
    takeoffEnvelopeShortLabel: "+6 g over 500 g envelope",
  });
});

test("does not add a planning allowance before a part is selected", () => {
  expect(summarizeBuildPlanning({ componentIds: {} })).toMatchObject({
    selectedCount: 0,
    catalogWeight: 0,
    planningAllowanceG: 0,
    totalWeight: 0,
    totalPrice: 0,
    takeoffEnvelopeStatus: "unavailable",
  });
});
