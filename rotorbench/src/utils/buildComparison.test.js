import {
  comparisonReportFilename,
  comparisonRows,
  createComparisonReport,
  readHardwarePlanStatus,
  summarizeBuild,
} from "./buildComparison";

const build = {
  id: "build-a",
  name: "Five inch",
  componentIds: {
    frameId: "frame-5inch-220mm",
    motorId: "motor-2207-1750kv",
    propellerId: "prop-5040-tri",
    batteryId: "battery-4s-1550mah-95c",
    escId: "esc-mamba-f55a",
    flightControllerId: "fc-holybro-kakute-f7",
    receiverId: "rx-elrs-24g",
  },
};

test("summarizes catalog weight and price using frame motor count", () => {
  const summary = summarizeBuild(build);
  expect(summary.selectedCount).toBe(7);
  expect(summary.motorCount).toBe(4);
  expect(summary.totalWeight).toBeGreaterThan(0);
  expect(summary.totalPrice).toBeGreaterThan(0);
});

test("comparison rows include all seven component categories", () => {
  const left = summarizeBuild(build);
  const right = summarizeBuild({ ...build, id: "build-b", name: "Second build" });
  const rows = comparisonRows(left, right);
  expect(rows.filter((row) => row.left?.id)).toHaveLength(7);
  expect(rows.map((row) => row.id)).toEqual(
    expect.arrayContaining([
      "selected-count",
      "physical-fit",
      "power-path",
      "electrical-limits",
      "source-backed",
      "estimated-fields",
      "measured-geometry",
      "geometry-fallbacks",
      "hardware-plan",
      "receiver-wiring",
      "board-map",
      "radio-host",
      "navigation-safety",
      "mission-controls",
      "bench-evidence",
      "frame-size",
      "motor-kv",
      "motor-size",
      "propeller-size",
      "propeller-blades",
      "propeller-thrust-data",
      "battery-cells",
      "battery-capacity",
      "esc-current",
      "fc-firmware",
      "fc-processor",
      "receiver-protocol",
      "receiver-channels",
      "total-weight",
      "total-price",
    ]),
  );
});

test("comparison rows distinguish estimated and unavailable thrust data", () => {
  const estimated = summarizeBuild(build);
  const unavailable = summarizeBuild({
    ...build,
    id: "build-25",
    componentIds: {
      ...build.componentIds,
      frameId: "frame-aos-cine25-v5",
      motorId: "motor-tmotor-f1404-4600kv",
      propellerId: "prop-gemfan-hurricane-2520-3",
      batteryId: "battery-tattu-rline-4s-850-95c",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      receiverId: "rx-radiomaster-rp4td",
    },
  });
  const row = comparisonRows(estimated, unavailable)
    .find((item) => item.id === "propeller-thrust-data");

  expect(estimated.thrustDataStatus).toBe("estimated");
  expect(unavailable.thrustDataStatus).toBe("unavailable");
  expect(row).toMatchObject({
    changed: true,
    left: "estimated",
    right: "unavailable",
  });
  expect(row.format(row.left)).toBe("Estimated");
  expect(row.format(row.right)).toBe("Unavailable");
});

test("saved-build summaries apply build-local geometry to their parts", () => {
  const measured = summarizeBuild({
    ...build,
    geometryOverrides: {
      schema: "rotorbench.measured-geometry.v1",
      categories: {
        motors: {
          [build.componentIds.motorId]: {
            dimensionsMm: [30, 30, 30],
          },
        },
      },
    },
  });
  expect(measured.measuredFieldCount).toBe(1);
  expect(measured.parts.find((part) => part.category === "motors").part)
    .toMatchObject({
      dimensionsMm: [30, 30, 30],
      measuredFields: ["dimensionsMm"],
      geometrySource: "user-measured",
    });
  expect(measured).toMatchObject({
    powerPathStatus: expect.any(String),
    powerPathLabel: expect.any(String),
  });
});

test("comparison summaries expose documented versus unverified receiver wiring", () => {
  const left = summarizeBuild(build);
  expect(left).toMatchObject({
    fcBoardName: "KAKUTEF7",
    fcBoardDocumented: true,
    receiverPins: expect.any(String),
    receiverWiringStatus: expect.stringMatching(/documented|unverified/),
    radioHostTransport: "native-usb",
    radioHostTransportLabel: "Native USB CDC",
    radioHostDocumented: true,
    radioHostBay: "native-usb",
    radioHostBayLabel: "Native USB",
    radioHostBayCompatible: true,
    fcMotorDirection: "props-in",
    fcMotorDirectionLabel: "Normal · props in",
    fcMotorOrder: "1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
    radioReceiverBandStatus: "unconfigured",
    radioReceiverBands: ["2.4 GHz"],
    radioSharedBands: [],
  });
  const rows = comparisonRows(left, summarizeBuild(build));
  expect(rows.find((row) => row.id === "receiver-wiring")).toMatchObject({
    changed: false,
    left: expect.stringMatching(/documented|unverified/),
  });
  expect(rows.find((row) => row.id === "radio-host")).toMatchObject({
    changed: false,
    left: "Native USB CDC · documented",
  });
  expect(rows.find((row) => row.id === "radio-host-bay")).toMatchObject({
    changed: false,
    left: "Native USB · supported",
  });
  expect(rows.find((row) => row.id === "fc-motor-order")).toMatchObject({
    changed: false,
    left: "Normal · props in · 1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
  });
  expect(rows.find((row) => row.id === "navigation-safety")).toMatchObject({
    changed: false,
    left: "Not configured",
    right: "Not configured",
  });
  expect(rows.find((row) => row.id === "radio-power-limit")).toMatchObject({
    changed: false,
    left: "No region-specific limit",
  });
  expect(rows.find((row) => row.id === "radio-receiver-bands")).toMatchObject({
    changed: false,
    left: "2.4 GHz · no radio plan",
  });
  expect(rows.find((row) => row.id === "power-path")).toMatchObject({
    changed: false,
    left: expect.any(String),
  });
});

test("comparison rows mark only the values that differ", () => {
  const left = summarizeBuild(build);
  const changedBuild = {
    ...build,
    id: "build-b",
    componentIds: {
      ...build.componentIds,
      motorId: "motor-1804-2800kv",
    },
  };
  const right = summarizeBuild(changedBuild);
  const rows = comparisonRows(left, right);

  expect(rows.find((row) => row.id === "motorId")).toMatchObject({ changed: true });
  expect(rows.find((row) => row.id === "motor-kv")).toMatchObject({ changed: true });
  expect(rows.find((row) => row.id === "frameId")).toMatchObject({ changed: false });
  expect(rows.filter((row) => row.changed).map((row) => row.id))
    .toEqual(expect.arrayContaining(["motorId", "total-weight", "total-price"]));
  expect(comparisonRows(left, summarizeBuild(build)).every((row) => !row.changed))
    .toBe(true);
});

test("comparison reports contain portable specimen rows and explicit boundaries", () => {
  const left = summarizeBuild(build);
  const right = summarizeBuild({
    ...build,
    id: "build-b",
    componentIds: { ...build.componentIds, motorId: "motor-1804-2800kv" },
  });
  const rows = comparisonRows(left, right);
  const report = createComparisonReport(
    left,
    right,
    rows,
    "2026-11-20T12:00:00.000Z",
  );

  expect(report).toMatchObject({
    schema: "rotorbench.build-comparison.v1",
    differenceCount: expect.any(Number),
    verification: {
      catalogComparisonOnly: true,
      hardwareVerified: false,
      performanceAnalyzed: false,
    },
  });
  expect(report.rows.find((row) => row.id === "motor-kv")).toMatchObject({
    changed: true,
    left: expect.any(Number),
    right: expect.any(Number),
  });
  expect(report.rows.find((row) => row.id === "frameId").left).toEqual({
    id: expect.any(String),
    name: expect.any(String),
  });
  expect(comparisonReportFilename(left, right))
    .toBe("rotorbench-compare-build-a-build-b.json");
});

test("hardware plan status distinguishes complete, partial, and invalid plans", () => {
  localStorage.clear();
  expect(readHardwarePlanStatus("build-a")).toBe("not-configured");
  localStorage.setItem(
    `rotorbench:hardware-plan:build-a:fc`,
    JSON.stringify({ planVersion: 3 }),
  );
  expect(readHardwarePlanStatus("build-a")).toBe("partial");
  localStorage.setItem(
    `rotorbench:hardware-plan:build-a:radio`,
    JSON.stringify({ planVersion: 3 }),
  );
  expect(summarizeBuild(build).hardwarePlanStatus).toBe("saved");
  localStorage.setItem(`rotorbench:hardware-plan:build-a:radio`, "{");
  expect(readHardwarePlanStatus("build-a")).toBe("invalid");
});

test("saved build summaries and comparisons retain mission and launch controls", () => {
  localStorage.clear();
  localStorage.setItem(
    "rotorbench:hardware-plan:mission-build:fc",
    JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "fc-holybro-kakute-f7",
      selectedReceiverId: "rx-elrs-24g",
      firmwareFamily: "aerialkit",
      profileId: "custom-board",
      airframe: "elevonwing",
      missionChannel: 7,
      launchChannel: 8,
      launchThrottle: 0.65,
      launchClimbDeg: 20,
      launchTimeoutS: 6,
    }),
  );
  const left = summarizeBuild({
    ...build,
    id: "mission-build",
    name: "Mission build",
  });
  const right = summarizeBuild({
    ...build,
    id: "mission-build-empty",
    name: "Mission build without plan",
  });

  expect(left.missionControlsLabel).toBe(
    "Mission CH7 · Launch CH8 · 65% · 20° · 6 s",
  );
  expect(left.hardwareReadinessStatus).toBe("blocked");
  expect(left.hardwareReadinessLabel).toMatch(/blocker/i);
  expect(comparisonRows(left, right).find(
    (row) => row.id === "mission-controls",
  )).toMatchObject({
    changed: true,
    left: "Mission CH7 · Launch CH8 · 65% · 20° · 6 s",
    right: "Not configured",
  });
});

test("saved wing summaries retain catalogued servo output coverage", () => {
  localStorage.clear();
  const t1Build = {
    id: "t1-coverage-build",
    name: "T1 coverage",
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
  localStorage.setItem(
    "rotorbench:hardware-plan:t1-coverage-build:fc",
    JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "fc-matek-f405-wmn",
      selectedReceiverId: "rx-radiomaster-rp4td-m",
      firmwareFamily: "aerialkit",
      profileId: "esp32dev",
      airframe: "elevonwing",
      armChannel: 6,
      modeChannel: 5,
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
    }),
  );

  const summary = summarizeBuild(t1Build);
  expect(summary).toMatchObject({
    buildServoCount: 3,
    fcServoOutputCount: 2,
    servoOutputCoverageStatus: "under-mapped",
    servoOutputCoverageLabel: "2/3 outputs mapped",
    servoOutputCoverageDetail: expect.stringMatching(
      /1 catalogued servo output remains unassigned/i,
    ),
  });
  expect(comparisonRows(summary, summarizeBuild({
    ...t1Build,
    id: "t1-coverage-empty",
  })).find((row) => row.id === "servo-output-coverage")).toMatchObject({
    changed: true,
    left: "2/3 outputs mapped",
    right: "Servo map not saved",
  });
});
