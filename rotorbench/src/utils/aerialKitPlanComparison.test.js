import { createAerialKitPlanComparisonEvidence } from "./aerialKitPlanComparison";

test("creates a read-only plan comparison artifact with expected values", () => {
  const evidence = createAerialKitPlanComparisonEvidence({
    checks: [
      {
        id: "fc-param-arm-channel",
        label: "FC parameter arm_channel",
        status: "fail",
        detail: "Board-reported arm_channel=5; the staged plan expects 6.",
      },
      {
        id: "fc-param-dshot-khz",
        label: "FC parameter dshot_khz",
        status: "unverified",
        detail: "The board-reported evidence does not include dshot_khz.",
      },
    ],
    plan: {
      firmwareFamily: "aerialkit",
      armChannel: 6,
      dshotKhz: 300,
    },
    targetName: "SpeedyBee F405 V5",
    statusObservedAtMs: Date.UTC(2026, 10, 22, 12, 0, 0),
    parameterValuesRead: true,
    parameterMetadataRead: true,
    sessionActive: false,
    nowMs: Date.UTC(2026, 10, 22, 12, 1, 0),
  });

  expect(evidence.schema).toBe("rotorbench.aerial-kit-plan-comparison.v1");
  expect(evidence.target).toEqual({
    name: "SpeedyBee F405 V5",
    firmwareFamily: "aerialkit",
    profileId: null,
  });
  expect(evidence.source).toMatchObject({
    readOnly: true,
    sessionActive: false,
    parameterValuesRead: true,
    parameterMetadataRead: true,
  });
  expect(evidence.summary).toEqual({
    compared: 2,
    matched: 0,
    differing: 1,
    notObserved: 1,
  });
  expect(evidence.parameters).toEqual([
    expect.objectContaining({
      parameter: "arm_channel",
      status: "fail",
      expected: "6",
    }),
    expect.objectContaining({
      parameter: "dshot_khz",
      status: "unverified",
      expected: "300",
    }),
  ]);
  expect(evidence.boundaries).toEqual({
    valuesAdopted: false,
    valuesWritten: false,
    valuesPersisted: false,
    hardwareVerified: false,
    rfVerified: false,
    flightReady: false,
  });
});
