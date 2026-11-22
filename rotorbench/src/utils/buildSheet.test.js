import {
  buildSheetFilename,
  createBuildSheet,
  parseBuildSheetJson,
} from "./buildSheet";

const frame = {
  id: "frame-aos-55-v2",
  name: "AOS 5.5 V2",
  sourceUrl: "https://example.com/frame",
  stackMountPatternsMm: [[30.5, 30.5]],
  dimensionsMm: [235, 30, 235],
  estimatedFields: ["motor positions"],
};

const esc = {
  id: "esc-speedybee-bl32-50a",
  name: "SpeedyBee BL32",
  sourceUrl: "https://example.com/esc",
  mountingPatternMm: [30.5, 30.5],
  includedPowerConnector: "XT60",
  voltage: { min: 12, max: 25.2 },
};

const battery = {
  id: "battery-tattu-rline-6s-1300-120c",
  name: "Tattu",
  voltage: 22.2,
  sourceUrl: "https://example.com/battery",
  dischargeConnector: "XT60",
  modelStatus: "not_available",
  estimatedFields: ["dischargeProfile"],
};

test("build sheets include source, estimate, fallback, and fit state", () => {
  const sheet = createBuildSheet({
    build: {
      id: "build-a",
      name: "AOS test build",
      note: "Inspect the battery lead before power.",
      componentIds: { frameId: frame.id, escId: esc.id, batteryId: battery.id },
    },
    assemblySpec: { frame, esc, battery },
    generatedAt: "2026-03-01T00:00:00.000Z",
  });

  expect(sheet).toMatchObject({
    schema: "rotorbench.build-sheet.v1",
    generatedAt: "2026-03-01T00:00:00.000Z",
    status: "draft",
    analysisIncluded: false,
    hardwareVerified: false,
    build: {
      note: "Inspect the battery lead before power.",
    },
    physicalFit: {
      status: "verified",
      checks: expect.arrayContaining([
        expect.objectContaining({
          label: "SpeedyBee BL32 stack mount",
          status: "compatible",
        }),
        expect.objectContaining({
          label: "Battery to ESC connector",
          status: "compatible",
        }),
      ]),
    },
    electricalLimits: {
      status: "unverified",
      checks: expect.arrayContaining([
        expect.objectContaining({
          label: "SpeedyBee BL32 voltage",
          status: "compatible",
        }),
        expect.objectContaining({
          label: "Propeller frame clearance",
          status: "unknown",
        }),
      ]),
    },
    provenance: {
      selectedCount: 3,
      sourceBackedCount: 3,
      estimatedFieldCount: 2,
      geometryFallbackCount: 3,
    },
    modelSources: {
      selectedCount: 3,
      catalogModelCount: 0,
      generatedFallbackCount: 3,
    },
  });
});

test("build sheet filenames are portable and deterministic", () => {
  expect(buildSheetFilename("AOS Bench / 6S")).toBe(
    "aos-bench-6s-build-sheet.json",
  );
  expect(buildSheetFilename("")).toBe("rotorbench-build-build-sheet.json");
});

test("build sheets carry planning weight and published-envelope fit", () => {
  const sheet = createBuildSheet({
    build: {
      id: "t1-build-sheet",
      name: "T1 Ranger",
      componentIds: {
        frameId: "frame-heewing-t1-ranger",
        motorId: "motor-heewing-fx1406-3150kv",
        propellerId: "prop-heewing-fx3830-2",
        escId: "esc-heewing-fx20a-bls-twin",
        flightControllerId: "fc-matek-f405-wmn",
        batteryId: "battery-cnhl-black-4s-1500-100c",
        receiverId: "rx-radiomaster-rp4td-m",
      },
    },
    assemblySpec: {},
    generatedAt: "2026-11-21T00:00:00.000Z",
  });

  expect(sheet.planning).toEqual({
    scope: "catalog planning estimate; not measured takeoff weight",
    selectedPartCount: 7,
    catalogWeightG: 456,
    planningAllowanceG: 50,
    totalWeightG: 506,
    totalPriceUsd: 297.89,
    publishedTakeoffRangeG: [350, 500],
    takeoffEnvelopeStatus: "above",
    takeoffEnvelopeShortLabel: "+6 g over 500 g envelope",
    takeoffEnvelopeLabel: "506 g planning estimate · 6 g over the 500 g published maximum · verify with a scale",
  });
});

test("build sheets include sanitized local hardware-plan context", () => {
  const geometryOverrides = {
    schema: "rotorbench.measured-geometry.v1",
    categories: {
      frames: {
        [frame.id]: { stackHeight: 31.2 },
      },
    },
  };
  const sheet = createBuildSheet({
    build: {
      id: "build-hardware",
      name: "Hardware plan build",
      componentIds: { frameId: frame.id, escId: esc.id, batteryId: battery.id },
      geometryOverrides,
    },
    assemblySpec: { frame, esc, battery },
    hardwareReadiness: {
      status: "review",
      label: "4 checks open",
      configured: true,
      complete: false,
      issueCount: 4,
      blockerCount: 0,
      firmwareLabel: "Betaflight",
      protocolLabel: "CRSF / ExpressLRS",
      receiverUart: "UART1",
      receiverBaud: 420000,
      radioTargetName: "Aerial Kit ELRS USB TX Rev A3",
      radioPlan: {
        bindingPhrase: "must-not-export",
        uid: "10:73:a1:1f:a8:0f",
      },
    },
    importedEvidence: {
      status: "correlated",
      label: "Imported evidence correlated",
      configured: true,
      scopeStatus: "matched",
      identityStatus: "not-staged",
      attachedAt: "2026-11-20T11:00:00.000Z",
      checkCounts: { pass: 8, fail: 0, unverified: 2 },
      planComparison: {
        targetName: "SpeedyBee F405 V5",
        firmwareFamily: "aerialkit",
        profileId: "speedybee-f405-v5",
        generatedAt: "2026-11-20T10:55:00.000Z",
        currentPlanMatches: true,
        planFingerprint: "fnv1a-12345678",
        compared: 38,
        matched: 1,
        differing: 1,
        notObserved: 36,
        parameterValuesRead: true,
        parameterMetadataRead: true,
        parameters: [{ parameter: "arm_channel", expected: "6" }],
      },
      rawFiles: ["pair.json"],
    },
    viewerPlacement: {
      complete: false,
      verifiedCount: 5,
      measuredCount: 0,
      estimatedCount: 1,
      fallbackCount: 0,
      awaitingCount: 0,
      conflictCount: 0,
      assembledCount: 6,
      checks: [
        { id: "frame-mounts", label: "Frame motor mounts", status: "verified", detail: "Four mounts." },
        { id: "motor-roots", label: "Four motor roots", status: "verified", detail: "Aligned." },
      ],
    },
  });

  expect(sheet).toMatchObject({
    analysisIncluded: false,
    hardwareVerified: false,
    build: {
      geometryOverrides,
    },
    measuredGeometry: {
      schema: "rotorbench.measured-geometry-summary.v1",
      partCount: 1,
      fieldCount: 1,
      parts: [{
        key: "frame",
        id: frame.id,
        name: frame.name,
        fields: [{
          key: "stackHeight",
          label: "Stack height",
          value: 31.2,
          catalogValue: null,
          source: "user-measured",
        }],
      }],
    },
    powerPath: {
      displayState: "verified",
      label: "XT60 match",
      batteryName: "Tattu",
      escName: "SpeedyBee BL32",
      batteryConnector: "XT60",
      escConnector: "XT60",
    },
    hardwarePlan: {
      status: "review",
      label: "4 checks open",
      configured: true,
      complete: false,
      issueCount: 4,
      firmware: "Betaflight",
      receiverProtocol: "CRSF / ExpressLRS",
      receiverUart: "UART1",
      receiverBaud: 420000,
      receiverPins: null,
      wiringStatus: "unverified",
      radioHostTransport: null,
      radioHostTransportLabel: null,
      radioHostDocumented: false,
      radioTarget: "Aerial Kit ELRS USB TX Rev A3",
      hardwareVerified: false,
    },
    importedEvidence: {
      status: "correlated",
      label: "Imported evidence correlated",
      scopeStatus: "matched",
      identityStatus: "not-staged",
      checkCounts: { pass: 8, fail: 0, unverified: 2 },
      planComparison: {
        scope: "sanitized plan identity and counts; raw parameter values excluded",
        targetName: "SpeedyBee F405 V5",
        firmwareFamily: "aerialkit",
        profileId: "speedybee-f405-v5",
        generatedAt: "2026-11-20T10:55:00.000Z",
        currentPlanMatches: true,
        planFingerprint: "fnv1a-12345678",
        compared: 38,
        matched: 1,
        differing: 1,
        notObserved: 36,
        parameterValuesRead: true,
        parameterMetadataRead: true,
        hardwareVerified: false,
      },
      hardwareVerified: false,
      authenticityVerified: false,
    },
    viewerPlacement: {
      scope: "viewer-placement",
      complete: false,
      verifiedCount: 5,
      measuredCount: 0,
      estimatedCount: 1,
      fallbackCount: 0,
      awaitingCount: 0,
      conflictCount: 0,
      assembledCount: 6,
    },
  });
  expect(sheet.hardwarePlan).not.toHaveProperty("radioPlan");
  expect(sheet.importedEvidence.planComparison).not.toHaveProperty("parameters");
  expect(JSON.stringify(sheet)).not.toContain("must-not-export");
  expect(JSON.stringify(sheet)).not.toContain("pair.json");
});

test("imported build sheets validate schema and catalog IDs", () => {
  const imported = parseBuildSheetJson(JSON.stringify({
    schema: "rotorbench.build-sheet.v1",
    build: {
      id: "old-id",
      name: "Imported AOS",
      note: "Imported bench note",
      componentIds: {
        frameId: "frame-aos-55-v2",
        motorId: "motor-emax-eco-ii-2207-1900kv",
      },
      geometryOverrides: {
        schema: "rotorbench.measured-geometry.v1",
        categories: {
          motors: {
            "motor-emax-eco-ii-2207-1900kv": { propShaftMm: 5 },
          },
        },
      },
    },
  }), {
    now: "2026-04-01T00:00:00.000Z",
  });
  expect(imported).toMatchObject({
    name: "Imported AOS",
    note: "Imported bench note",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-emax-eco-ii-2207-1900kv",
      propellerId: null,
    },
    createdAt: "2026-04-01T00:00:00.000Z",
    geometryOverrides: {
      schema: "rotorbench.measured-geometry.v1",
      categories: {
        motors: {
          "motor-emax-eco-ii-2207-1900kv": { propShaftMm: 5 },
        },
      },
    },
  });
  expect(imported.totalWeight).toBeGreaterThan(0);
  expect(imported).not.toHaveProperty("id");
});

test("invalid or unknown build sheets fail closed", () => {
  expect(() => parseBuildSheetJson("{}")).toThrow(/not a RotorBench build-sheet/i);
  expect(() => parseBuildSheetJson(JSON.stringify({
    schema: "rotorbench.build-sheet.v1",
    build: {
      name: "Bad",
      componentIds: { frameId: "not-a-frame" },
    },
  }))).toThrow(/Unknown catalog component/i);
});

test("validates sanitized plan-comparison metadata when importing a build sheet", () => {
  const sheet = {
    schema: "rotorbench.build-sheet.v1",
    build: {
      name: "Imported plan review",
      componentIds: {
        frameId: "frame-aos-55-v2",
        motorId: "motor-emax-eco-ii-2207-1900kv",
      },
    },
    importedEvidence: {
      status: "plan-comparison",
      label: "FC plan comparison matched",
      attachedAt: "2026-11-22T12:01:00.000Z",
      scopeStatus: "matched",
      identityStatus: "not-recorded",
      checkCounts: { pass: 5, fail: 0, unverified: 0 },
      planComparison: {
        targetName: "SpeedyBee F405 V5",
        firmwareFamily: "aerialkit",
        profileId: "speedybee-f405-v5",
        generatedAt: "2026-11-22T12:00:00.000Z",
        currentPlanMatches: true,
        planFingerprint: "fnv1a-12345678",
        compared: 38,
        matched: 1,
        differing: 1,
        notObserved: 36,
        parameterValuesRead: true,
        parameterMetadataRead: true,
        parameters: [{ parameter: "arm_channel", expected: "6" }],
        observedValue: "5",
      },
      hardwareVerified: false,
      authenticityVerified: false,
    },
  };

  const imported = parseBuildSheetJson(JSON.stringify(sheet), {
    now: "2026-11-22T12:02:00.000Z",
  });
  expect(imported.importedEvidence).toMatchObject({
    configured: true,
    status: "plan-comparison",
    planComparison: {
      targetName: "SpeedyBee F405 V5",
      planFingerprint: "fnv1a-12345678",
      compared: 38,
      matched: 1,
      differing: 1,
      notObserved: 36,
      hardwareVerified: false,
    },
    hardwareVerified: false,
    authenticityVerified: false,
  });
  expect(imported.importedEvidence.planComparison)
    .not.toHaveProperty("parameters");
  expect(imported.importedEvidence.planComparison)
    .not.toHaveProperty("observedValue");

  const badCounts = JSON.parse(JSON.stringify(sheet));
  badCounts.importedEvidence.planComparison.notObserved = 35;
  expect(() => parseBuildSheetJson(JSON.stringify(badCounts)))
    .toThrow(/counts do not add up/i);

  const badBoundary = JSON.parse(JSON.stringify(sheet));
  badBoundary.importedEvidence.planComparison.hardwareVerified = true;
  expect(() => parseBuildSheetJson(JSON.stringify(badBoundary)))
    .toThrow(/claims hardware verification/i);
});
