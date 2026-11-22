import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import AnalysisPage, {
  ANALYSIS_PLAN_RETURN_FOCUS_KEY,
} from "./AnalysisPage";
import { createBenchEvidenceScope } from "../utils/benchEvidenceAttachment";

jest.mock("recharts", () => {
  const Container = ({ children }) => <div>{children}</div>;
  const Empty = () => null;

  return {
    ResponsiveContainer: Container,
    LineChart: Container,
    Line: Empty,
    XAxis: Empty,
    YAxis: Empty,
    CartesianGrid: Empty,
    Tooltip: Empty,
    Legend: Empty,
  };
});

const build = {
  id: "analysis-build",
  name: "3.5-inch bench quad",
  note: "Verify receiver UART direction before the bench run.",
  componentIds: {
    frameId: "frame-aos-35-v51",
    motorId: "motor-tmotor-f1404-3800kv",
    propellerId: "prop-gemfan-hurricane-3520-3",
    batteryId: "battery-tattu-rline-4s-850-95c",
    escId: "esc-speedybee-bls-35a-mini-v2",
    flightControllerId: "fc-speedybee-f405-mini",
    receiverId: null,
  },
  createdAt: "2026-11-20T00:00:00.000Z",
  updatedAt: "2026-11-20T00:00:00.000Z",
};

const analysis = {
  performance: {
    totalWeight: 298.6,
    maxThrust: 3340,
    thrustToWeightRatio: 11.2,
    powerDraw: 412,
    rating: { thrustToWeight: "excellent" },
  },
  flightSimulation: {
    batteryCapacity: 850,
    avgCurrentDraw: 24.5,
    estimatedFlightTime: 4.7,
    estimatedRange: 7.8,
    hoverTime: 6.1,
    maxSpeed: 142,
    efficiency: 108,
    dischargeData: [
      { time: 0, voltage: 16.8, remainingCapacity: 850 },
      { time: 1, voltage: 15.9, remainingCapacity: 620 },
    ],
  },
  errors: [],
  warnings: ["Estimated thrust curve"],
  totalCost: 389.95,
};

function renderAnalysis(stateBuild = build) {
  return render(
    <MemoryRouter initialEntries={[{
      pathname: "/analysis",
      state: { build: stateBuild },
    }]}>
      <BuildProvider>
        <Routes>
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/setup" element={<div>Hardware setup route</div>} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );
}

function renderAnalysisWithoutRouteState() {
  return render(
    <MemoryRouter initialEntries={["/analysis"]}>
      <BuildProvider>
        <Routes>
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/setup" element={<div>Hardware setup route</div>} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:analysis-report"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => analysis,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

test("renders the completed analysis and opens the browser print dialog", async () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
  renderAnalysis();

  const printButton = await screen.findByRole("button", { name: /print report/i });
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  expect(screen.getByText(/3.5-inch bench quad/)).toBeInTheDocument();
  expect(screen.getByRole("note", { name: "Build note" }))
    .toHaveTextContent("Verify receiver UART direction before the bench run.");
  expect(screen.getByRole("note", { name: "Model geometry basis" }))
    .toHaveTextContent(
      "0/6 catalog GLBs · 6 generated fallbacks. Performance estimates use component specifications; fallback geometry affects placement inspection, not the thrust model.",
    );
  expect(screen.getByText("1 analysis notice")).toBeInTheDocument();
  expect(screen.getByText("Estimated thrust curve")).toBeInTheDocument();
  const hardwareSection = screen.getByRole("region", {
    name: /Betaflight · CRSF \/ ExpressLRS/i,
  });
  expect(within(hardwareSection).getByText("Plan not saved")).toBeInTheDocument();
  expect(within(hardwareSection).getByText("Local plan · hardware not tested"))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText("SPEEDYBEEF405MINI · documented"))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText("Pins documented")).toBeInTheDocument();
  expect(within(hardwareSection).getByText("Native USB CDC · documented"))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText("XT30 match")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Download report" }));
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(anchorClick).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:analysis-report");

  await userEvent.click(printButton);
  expect(printSpy).toHaveBeenCalledTimes(1);

  await userEvent.click(screen.getByRole("button", { name: "Hardware setup" }));
  expect(screen.getByText("Hardware setup route")).toBeInTheDocument();
});

test("analysis receives build-local measured geometry", async () => {
  const measuredBuild = {
    ...build,
    id: "analysis-measured",
    geometryOverrides: {
      schema: "rotorbench.measured-geometry.v1",
      categories: {
        motors: {
          [build.componentIds.motorId]: {
            propShaftMm: 1.5,
            dimensionsMm: [29.2, 32.1, 29.2],
          },
        },
      },
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/analysis", state: { build: measuredBuild } }]}>
      <BuildProvider>
        <Routes>
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );

  await screen.findByRole("button", { name: /print report/i });
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body.components.motors).toMatchObject({
    propShaftMm: 1.5,
    dimensionsMm: [29.2, 32.1, 29.2],
    geometrySource: "user-measured",
  });
});

test("copies a configuration link without claiming analysis was shared", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderAnalysis();

  await screen.findByRole("button", { name: /print report/i });
  await userEvent.click(screen.getByRole("button", { name: "Share build link" }));

  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining("/build?share="),
  );
  expect(await screen.findByText(/Config link copied · analysis excluded/i))
    .toBeInTheDocument();
});

test("keeps missing thrust and flight data visibly unavailable", async () => {
  const unavailableNote =
    "The selected propeller has no published or reviewed thrust curve.";
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      ...analysis,
      performance: {
        ...analysis.performance,
        maxThrust: 0,
        thrustToWeightRatio: 0,
        dataAvailable: false,
        dataNote: unavailableNote,
      },
      flightSimulation: {
        ...analysis.flightSimulation,
        avgCurrentDraw: 0,
        estimatedFlightTime: 0,
        estimatedRange: 0,
        hoverTime: 0,
        maxSpeed: 0,
        efficiency: 0,
        dischargeData: [],
        dataAvailable: false,
        dataNote: unavailableNote,
      },
    }),
  });
  renderAnalysis();

  expect(await screen.findByText("Flight performance unavailable")).toBeInTheDocument();
  expect(screen.getByText("Discharge curve unavailable")).toBeInTheDocument();
  expect(screen.getAllByText(unavailableNote)).toHaveLength(3);
  expect(screen.getAllByRole("status")).toHaveLength(2);
  expect(within(screen.getByRole("region", { name: "Analysis summary" }))
    .getByText("Unavailable")).toBeInTheDocument();
});

test("fixed-wing builds do not inherit multirotor performance claims", async () => {
  const t1Build = {
    id: "t1-analysis",
    name: "T1 Ranger analysis",
    componentIds: {
      frameId: "frame-heewing-t1-ranger",
      motorId: "motor-heewing-fx1406-3150kv",
      propellerId: "prop-heewing-fx3830-2",
      escId: "esc-heewing-fx20a-bls-twin",
      flightControllerId: "fc-matek-f405-wmn",
      batteryId: "battery-cnhl-black-4s-1500-100c",
      receiverId: "rx-radiomaster-rp4td-m",
    },
    createdAt: "2026-11-21T00:00:00.000Z",
    updatedAt: "2026-11-21T00:00:00.000Z",
  };
  const fixedWingNote =
    "Fixed-wing performance is not implemented in the multirotor analysis model.";
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      ...analysis,
      performance: {
        ...analysis.performance,
        totalWeight: 548,
        maxThrust: 0,
        thrustToWeightRatio: 0,
        powerDraw: 0,
        dataAvailable: false,
        dataNote: fixedWingNote,
      },
      flightSimulation: {
        ...analysis.flightSimulation,
        estimatedFlightTime: 0,
        estimatedRange: 0,
        hoverTime: 0,
        maxSpeed: 0,
        efficiency: 0,
        dischargeData: [],
        dataAvailable: false,
        dataNote: fixedWingNote,
      },
      warnings: ["Fixed-wing builds use the multirotor-only performance engine."],
    }),
  });
  render(
    <MemoryRouter initialEntries={[{
      pathname: "/analysis",
      state: { build: t1Build },
    }]}>
      <BuildProvider>
        <Routes>
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText("Flight performance unavailable"))
    .toBeInTheDocument();
  expect(screen.getAllByText(fixedWingNote).length).toBeGreaterThan(0);
  expect(screen.queryByText("11.2:1")).not.toBeInTheDocument();
  expect(screen.getByText("HeeWing FX-7G Digital Metal Gear Servo Set"))
    .toBeInTheDocument();
  expect(screen.getByText("Servo map not saved")).toBeInTheDocument();
  expect(screen.getAllByText(/3 servos/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/350–500 g takeoff · 25 km\/h minimum/i))
    .toBeInTheDocument();
  expect(screen.getByText(/PNP 1\.71:1 T\/W reference/i)).toBeInTheDocument();
  expect(screen.getByText(
    /548 g planning estimate · 48 g over the 500 g published maximum/i,
  )).toBeInTheDocument();
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body.components.frame).toMatchObject({
    id: "frame-heewing-t1-ranger",
    airframeShape: "wing",
  });
});

test("shows saved hardware-plan review state in the analysis report", async () => {
  localStorage.setItem(
    "rotorbench:hardware-plan:analysis-build:fc",
    JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "fc-speedybee-f405-mini",
      selectedReceiverId: null,
      firmwareFamily: "betaflight",
      profileId: "custom-board",
      armChannel: 5,
      modeChannel: null,
      beeperChannel: 9,
      velocityChannel: null,
      receiverProtocol: "crsf",
      receiverUart: "UART1",
      receiverBaud: 420000,
    }),
  );
  renderAnalysis();

  const hardwareSection = await screen.findByRole("region", {
    name: /Betaflight · CRSF \/ ExpressLRS/i,
  });
  expect(within(hardwareSection).getByText(/\d+ checks? open/i)).toBeInTheDocument();
  expect(within(hardwareSection).queryByText("Plan not saved")).not.toBeInTheDocument();
});

test("keeps mission controls visible in the saved analysis hardware context", async () => {
  localStorage.setItem(
    "rotorbench:hardware-plan:analysis-build:fc",
    JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "fc-speedybee-f405-mini",
      selectedReceiverId: null,
      firmwareFamily: "aerialkit",
      profileId: "custom-board",
      airframe: "quadx",
      missionChannel: 7,
      receiverProtocol: "crsf",
      receiverUart: "UART1",
      receiverBaud: 420000,
    }),
  );
  renderAnalysis();

  const hardwareSection = await screen.findByRole("region", {
    name: /Aerial Kit Firmware · CRSF \/ ExpressLRS/i,
  });
  expect(within(hardwareSection).getByText("Mission controls")).toBeInTheDocument();
  expect(within(hardwareSection).getByText("Mission CH7 · Launch N/A"))
    .toBeInTheDocument();
});

test("shows the saved Aerial Kit tuning profile in analysis", async () => {
  const aerialBuild = {
    ...build,
    id: "analysis-aerial-tuning",
    componentIds: {
      ...build.componentIds,
      flightControllerId: "fc-adafruit-feather-f405",
      receiverId: null,
    },
  };
  localStorage.setItem(
    "rotorbench:hardware-plan:analysis-aerial-tuning:fc",
    JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "fc-adafruit-feather-f405",
      selectedReceiverId: null,
      firmwareFamily: "aerialkit",
      profileId: "feather-f405",
      airframe: "elevonwingsingle",
      receiverProtocol: "crsf",
      receiverUart: "USART3",
      receiverBaud: 420000,
      maxRateDps: 650,
      rateExpo: 0.25,
      tpaRate: 20,
      tpaBreakpoint: 0.55,
      rateKpRoll: 0.3,
      rateKiRoll: 0.18,
      rateKdRoll: 0.003,
      rcSmooth: 1,
      rcSmoothFactor: 30,
      rateFfdRoll: 0.01,
      rateKdMaxRoll: 0.005,
      antiGravityGain: 80,
    }),
  );
  localStorage.setItem(
    "rotorbench:hardware-plan:analysis-aerial-tuning:radio",
    JSON.stringify({
      planVersion: 3,
      selectedReceiverId: null,
      packetRateMode: "250",
    }),
  );

  renderAnalysis(aerialBuild);
  const hardwareSection = await screen.findByRole("region", {
    name: /Aerial Kit Firmware/i,
  });

  expect(within(hardwareSection).getByText("Rate response")).toBeInTheDocument();
  expect(within(hardwareSection).getByText(/650°\/s max · expo 25% · TPA 20% above 55%/))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText("PID gains")).toBeInTheDocument();
  expect(within(hardwareSection).getByText(/P 0.3\/0.25\/0.35 · I 0.18\/0.15\/0.2/))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText("Tuning features")).toBeInTheDocument();
  expect(within(hardwareSection).getByText(
    "RC auto · stick FF planned · D_MAX configured · anti-gravity enabled",
  )).toBeInTheDocument();
});

test("shows imported bench evidence without changing hardware verification", async () => {
  const evidenceScope = createBenchEvidenceScope({ build });
  localStorage.setItem(
    "rotorbench:bench-evidence:analysis-build:v1",
    JSON.stringify({
      schema: "rotorbench.build-bench-evidence.v1",
      attachedAt: "2026-11-20T12:00:00.000Z",
      rfReportedPass: true,
      rfEvidenceComplete: true,
      diagnosticsComplete: true,
      settingsComplete: true,
      checkCounts: { pass: 8, fail: 0, unverified: 2 },
      scope: evidenceScope,
    }),
  );
  renderAnalysis();

  const hardwareSection = await screen.findByRole("region", {
    name: /Betaflight · CRSF \/ ExpressLRS/i,
  });
  expect(within(hardwareSection).getByText("Imported evidence correlated"))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText(/Imported file · not independently verified/i))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText(/hardware not tested/i)).toBeInTheDocument();
});

test("shows imported plan-comparison metadata without hardware verification", async () => {
  sessionStorage.setItem(ANALYSIS_PLAN_RETURN_FOCUS_KEY, JSON.stringify({
    buildId: build.id,
    at: Date.now(),
  }));
  renderAnalysis({
    ...build,
    importedEvidence: {
      status: "plan-comparison",
      label: "FC plan comparison matched",
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
        hardwareVerified: false,
      },
    },
  });

  const hardwareSection = await screen.findByRole("region", {
    name: /Betaflight · CRSF \/ ExpressLRS/i,
  });
  expect(within(hardwareSection).getByText("Imported plan comparison"))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText(
    /SpeedyBee F405 V5 · 1 match \/ 1 differ \/ 36 not observed/,
  )).toBeInTheDocument();
  expect(within(hardwareSection).getByText(
    "Portable plan metadata · not hardware evidence",
  )).toBeInTheDocument();
  expect(within(hardwareSection).getByText(/hardware not tested/i)).toBeInTheDocument();
  const reviewPlan = within(hardwareSection).getByRole("button", {
    name: "Review current plan",
  });
  await waitFor(() => expect(reviewPlan).toHaveFocus());
  expect(sessionStorage.getItem(ANALYSIS_PLAN_RETURN_FOCUS_KEY)).toBeNull();
  await userEvent.click(reviewPlan);
  expect(sessionStorage.getItem(ANALYSIS_PLAN_RETURN_FOCUS_KEY)).not.toBeNull();
  expect(screen.getByText("Hardware setup route")).toBeInTheDocument();
});

test("does not offer printing until analysis has completed", async () => {
  let resolveAnalysis;
  global.fetch.mockReturnValue(new Promise((resolve) => {
    resolveAnalysis = resolve;
  }));
  renderAnalysis();

  expect(screen.getByText("Analyzing build...")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /print report/i })).not.toBeInTheDocument();

  resolveAnalysis({
    ok: true,
    json: async () => analysis,
  });
  await waitFor(() => {
    expect(screen.queryByText("Analyzing build...")).not.toBeInTheDocument();
  });
  expect(screen.getByRole("button", { name: /print report/i })).toBeInTheDocument();
});

test("recovers the persisted build after a direct analysis refresh", async () => {
  localStorage.setItem("currentBuild", JSON.stringify(build));
  renderAnalysisWithoutRouteState();

  expect(await screen.findByRole("button", { name: /print report/i })).toBeInTheDocument();
  expect(screen.getByText(/3.5-inch bench quad/)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/builds/analyze"),
    expect.objectContaining({ method: "POST" }),
  );
});

test("empty analysis teaches build and saved-build recovery paths", () => {
  renderAnalysisWithoutRouteState();

  expect(screen.getByRole("heading", {
    name: "Choose an aircraft to analyze",
  })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start a build" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open saved builds" }))
    .toBeInTheDocument();
  expect(screen.getByText("What analysis needs")).toBeInTheDocument();
  expect(screen.queryByText(/No build selected/i)).not.toBeInTheDocument();
});

test("does not present fallback hardware defaults when no FC or receiver is selected", async () => {
  const partialBuild = {
    ...build,
    id: "analysis-no-hardware",
    componentIds: {
      ...build.componentIds,
      flightControllerId: null,
      receiverId: null,
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/analysis", state: { build: partialBuild } }]}>
      <BuildProvider>
        <Routes>
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );

  const hardwareSection = await screen.findByRole("region", {
    name: "No hardware selected",
  });
  expect(within(hardwareSection).getAllByText("Not selected")).toHaveLength(5);
  expect(within(hardwareSection).queryByText(/Aerial Kit Firmware/i)).not.toBeInTheDocument();
});
