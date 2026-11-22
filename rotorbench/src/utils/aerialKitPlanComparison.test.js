import {
  createAerialKitPlanComparisonEvidence,
  parseAerialKitPlanComparisonEvidence,
} from "./aerialKitPlanComparison";

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

test("independently validates a plan comparison artifact against the current plan", () => {
  const plan = {
    firmwareFamily: "aerialkit",
    armChannel: 6,
    dshotKhz: 300,
  };
  const evidence = createAerialKitPlanComparisonEvidence({
    checks: [
      {
        id: "fc-param-arm-channel",
        label: "FC parameter arm_channel",
        status: "fail",
        detail: "Board-reported arm_channel=5; the staged plan expects 6.",
      },
    ],
    plan,
    targetName: "SpeedyBee F405 V5",
    statusObservedAtMs: Date.UTC(2026, 10, 22, 12, 0, 0),
    parameterValuesRead: true,
    parameterMetadataRead: true,
    nowMs: Date.UTC(2026, 10, 22, 12, 1, 0),
  });

  const parsed = parseAerialKitPlanComparisonEvidence(evidence, {
    expectedPlan: plan,
  });
  expect(parsed.summary).toEqual({
    compared: 1,
    matched: 0,
    differing: 1,
    notObserved: 0,
  });
  expect(parsed.currentPlanMatches).toBe(true);
  expect(parsed.checks.find((check) => check.id === "akp-plan-current"))
    .toMatchObject({ status: "pass" });

  expect(parseAerialKitPlanComparisonEvidence(evidence, {
    expectedPlan: { ...plan, armChannel: 5 },
  }).currentPlanMatches).toBe(false);
});

test("rejects tampered summaries and positive hardware boundaries", () => {
  const evidence = createAerialKitPlanComparisonEvidence({
    checks: [
      {
        id: "fc-param-dshot-khz",
        label: "FC parameter dshot_khz",
        status: "unverified",
        detail: "The board-reported evidence does not include dshot_khz.",
      },
    ],
    plan: { firmwareFamily: "aerialkit", dshotKhz: 300 },
    parameterValuesRead: true,
    nowMs: Date.UTC(2026, 10, 22, 12, 1, 0),
  });

  expect(() => parseAerialKitPlanComparisonEvidence({
    ...evidence,
    summary: { ...evidence.summary, notObserved: 0 },
  })).toThrow(/summary.notObserved/);
  expect(() => parseAerialKitPlanComparisonEvidence({
    ...evidence,
    boundaries: { ...evidence.boundaries, hardwareVerified: true },
  })).toThrow(/hardwareVerified/);
});
