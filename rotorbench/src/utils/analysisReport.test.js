import {
  ANALYSIS_REPORT_SCHEMA,
  analysisReportFilename,
  createAnalysisReport,
} from "./analysisReport";

const build = {
  id: "build-analysis-export",
  name: "Bench quad",
  description: "Export test",
  componentIds: {
    frameId: "frame-aos-35-v51",
    motorId: "motor-tmotor-f1404-3800kv",
    propellerId: "prop-gemfan-hurricane-3520-3",
    batteryId: "battery-tattu-rline-4s-850-95c",
  },
  createdAt: "2026-11-20T00:00:00.000Z",
  updatedAt: "2026-11-20T01:00:00.000Z",
};

const analysis = {
  performance: {
    totalWeight: 297.6,
    maxThrust: 3340,
    thrustToWeightRatio: 11.2,
    rating: { thrustToWeight: "excellent" },
  },
  flightSimulation: {
    estimatedFlightTime: 4.7,
    dischargeData: [],
  },
  errors: [],
  warnings: [],
  totalCost: 389.95,
};

test("creates a versioned analysis report without mutating the build", () => {
  const report = createAnalysisReport(
    build,
    analysis,
    "2026-11-20T12:00:00.000Z",
    {
      hardwarePlan: {
        status: "review",
        label: "3 checks open",
        configured: true,
        complete: false,
        issueCount: 3,
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
        failedChecks: [],
        unverifiedChecks: ["Last-frame freshness"],
        importTrust: "locally selected file; authenticity not independently verified",
        rawFiles: ["pair.json"],
        serialPath: "/dev/ttyACM0",
      },
      viewerPlacement: {
        complete: true,
        verifiedCount: 5,
        awaitingCount: 0,
        checks: [
          { id: "motor-roots", label: "Four motor roots", status: "verified", detail: "Aligned." },
        ],
      },
    },
  );

  expect(report).toMatchObject({
    schema: ANALYSIS_REPORT_SCHEMA,
    generatedAt: "2026-11-20T12:00:00.000Z",
    build: {
      id: "build-analysis-export",
      name: "Bench quad",
      componentIds: build.componentIds,
    },
    verification: {
      analysisIsEstimate: true,
      hardwareVerified: false,
      evidenceAuthenticityVerified: false,
    },
    hardwarePlan: {
      status: "review",
      label: "3 checks open",
      configured: true,
      complete: false,
      issueCount: 3,
      blockerCount: 0,
      firmware: "Betaflight",
      receiverProtocol: "CRSF / ExpressLRS",
      receiverUart: "UART1",
      receiverBaud: 420000,
      radioTarget: "Aerial Kit ELRS USB TX Rev A3",
      hardwareVerified: false,
    },
    importedEvidence: {
      status: "correlated",
      label: "Imported evidence correlated",
      scopeStatus: "matched",
      identityStatus: "not-staged",
      attachedAt: "2026-11-20T11:00:00.000Z",
      checkCounts: { pass: 8, fail: 0, unverified: 2 },
      failedChecks: [],
      unverifiedChecks: ["Last-frame freshness"],
      hardwareVerified: false,
      authenticityVerified: false,
    },
    viewerPlacement: {
      scope: "viewer-placement",
      complete: true,
      verifiedCount: 5,
      awaitingCount: 0,
    },
  });
  expect(report.analysis).toEqual(analysis);
  expect(report.build.componentIds).not.toBe(build.componentIds);
  expect(report.hardwarePlan).not.toHaveProperty("radioPlan");
  expect(JSON.stringify(report)).not.toContain("must-not-export");
  expect(report.importedEvidence).not.toHaveProperty("rawFiles");
  expect(JSON.stringify(report)).not.toContain("/dev/tty");
});

test("rejects incomplete build or analysis data", () => {
  expect(() => createAnalysisReport({ name: "No ID" }, analysis)).toThrow(
    /identified build/i,
  );
  expect(() => createAnalysisReport(build, { warnings: [] })).toThrow(
    /completed analysis/i,
  );
});

test("uses a stable filesystem-safe report filename", () => {
  expect(analysisReportFilename("Build: Bench / 35")).toBe(
    "rotorbench-analysis-build-bench-35.json",
  );
  expect(analysisReportFilename()).toBe("rotorbench-analysis-build.json");
});
