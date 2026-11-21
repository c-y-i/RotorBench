import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import AnalysisPage from "./AnalysisPage";
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

function renderAnalysis() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/analysis", state: { build } }]}>
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
  expect(screen.getByText("1 analysis notice")).toBeInTheDocument();
  expect(screen.getByText("Estimated thrust curve")).toBeInTheDocument();
  const hardwareSection = screen.getByRole("region", {
    name: /Betaflight · CRSF \/ ExpressLRS/i,
  });
  expect(within(hardwareSection).getByText("Plan not saved")).toBeInTheDocument();
  expect(within(hardwareSection).getByText("Local plan · hardware not tested"))
    .toBeInTheDocument();
  expect(within(hardwareSection).getByText("Verify pins")).toBeInTheDocument();

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
  expect(within(hardwareSection).getAllByText("Not selected")).toHaveLength(3);
  expect(within(hardwareSection).queryByText(/Aerial Kit Firmware/i)).not.toBeInTheDocument();
});
