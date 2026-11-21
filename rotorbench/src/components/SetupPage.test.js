import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";
import SetupPage from "./SetupPage";

jest.mock("./FlightControllerSetup", () => function MockFlightControllerSetup(props = {}) {
  const { selectedFlightController, buildMotorCount, value } = props;
  return (
    <div>
      Flight controller panel: {selectedFlightController?.name || "none"} / motors {buildMotorCount ?? "unknown"} / arm {value?.armChannel ?? "none"}
    </div>
  );
});
jest.mock("./RadioLinkSetup", () => function MockRadioLinkSetup(props = {}) {
  const { receiverName, controlRoles, value } = props;
  return (
    <div>
      Radio panel: {receiverName || "none"} / roles {(controlRoles || []).join(",") || "all"} / packet {value?.packetRateMode || "none"}
    </div>
  );
});
jest.mock("./BenchRunbook", () => function MockBenchRunbook(props = {}) {
  const { runbook, expectedUid, onAdoptPlanPatch } = props;
  return (
    <div>
      Bench runbook: {runbook.stages.length} stages · plan UID: {expectedUid || "none"}
      <button
        type="button"
        onClick={() => onAdoptPlanPatch?.({
          source: "fc",
          values: { armChannel: 5, armHoldMs: 750 },
          count: 2,
        })}
      >
        Adopt mock FC values
      </button>
      <button
        type="button"
        onClick={() => onAdoptPlanPatch?.({
          source: "radio",
          values: { packetRateMode: "100-full", powerDbm: -14 },
          count: 2,
        })}
      >
        Adopt mock radio values
      </button>
    </div>
  );
});
const mockCaptureStart = jest.fn().mockResolvedValue(true);
const mockCaptureStop = jest.fn().mockResolvedValue(true);
jest.mock("./WebSerialCapture", () => {
  const React = require("react");
  return React.forwardRef(function MockWebSerialCapture({
    expectedBaud,
    role,
    targetName,
    captureSessionId,
    onCaptureStateChange,
  }, ref) {
    const [status, setStatus] = React.useState("port-selected");
    React.useImperativeHandle(ref, () => ({
      preparePort: jest.fn().mockResolvedValue(true),
      startCapture: async () => {
        const started = await mockCaptureStart(role);
        if (started) setStatus("capturing");
        return started;
      },
      stopCapture: async () => {
        const stopped = await mockCaptureStop(role);
        if (stopped) setStatus("stopped");
        return stopped;
      },
    }));
    React.useEffect(() => {
      onCaptureStateChange?.(status);
    }, [onCaptureStateChange, status]);
    return (
      <div>
        Read-only serial capture: {expectedBaud} / {role} / {targetName} / {captureSessionId}
      </div>
    );
  });
});

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={["/setup"]}>
      <BuildProvider>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );
}

function BuildLocationProbe() {
  const location = useLocation();
  return (
    <div>
      Build route: {location.state?.build?.id || "no build"}
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  mockCaptureStart.mockReset().mockResolvedValue(true);
  mockCaptureStop.mockReset().mockResolvedValue(true);
});

test("renders the hardware planning page and switches to radio setup", () => {
  renderSetup();
  expect(screen.getByRole("heading", { name: "Hardware setup" })).toBeInTheDocument();
  expect(screen.getByText(/Flight controller panel/)).toBeInTheDocument();
  expect(screen.getByText(/Bench runbook: 3 stages · plan UID: none/)).toBeInTheDocument();
  expect(screen.getAllByText(/Read-only serial capture: 400000 \/ tx/)).toHaveLength(1);
  expect(screen.getByText(/Read-only serial capture: 420000 \/ rx/)).toBeInTheDocument();
  const initialSession = screen.getByText(/^…/).textContent;
  fireEvent.click(screen.getByRole("button", { name: "New capture session" }));
  expect(screen.getByText(/^…/).textContent).not.toBe(initialSession);
  expect(screen.getByLabelText("Import combined hardware plan")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Radio link" }));
  expect(screen.getByText(/Radio panel: none \/ roles arm,flightMode,velocity/)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Radio link" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("passes the staged binding UID to imported bench evidence review", () => {
  localStorage.setItem(
    "rotorbench:hardware-plan:standalone:radio",
    JSON.stringify({
      ...DEFAULT_RADIO_CONFIG,
      bindingPhrase: "local-test-phrase",
    }),
  );

  renderSetup();

  expect(screen.getByText(/plan UID: 83:63:42:33:50:ab/)).toBeInTheDocument();
});

test("copies the capture-session procedure with both endpoint rates", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderSetup();

  fireEvent.click(screen.getByRole("button", { name: "Copy session procedure" }));
  await screen.findByText(/Capture session procedure copied/i);

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining(
    "TX logical baud: 400000",
  ));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining(
    "RX logical baud: 420000",
  ));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining(
    "does not prove RF range",
  ));
});

test("starts and stops both endpoint captures from one session action", async () => {
  renderSetup();

  expect(await screen.findByText("Both ports ready")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start together" }));

  await waitFor(() => expect(mockCaptureStart).toHaveBeenCalledTimes(2));
  expect(mockCaptureStart.mock.calls.map(([role]) => role)).toEqual(["tx", "rx"]);
  expect(await screen.findByText("2/2 capturing")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Stop together" }));
  await waitFor(() => expect(mockCaptureStop).toHaveBeenCalledTimes(2));
  expect(mockCaptureStop.mock.calls.map(([role]) => role)).toEqual(["tx", "rx"]);
});

test("latches the synchronized start action against a double click", async () => {
  const starters = [];
  mockCaptureStart.mockImplementation(() => new Promise((resolve) => {
    starters.push(resolve);
  }));
  renderSetup();

  await screen.findByText("Both ports ready");
  const startButton = screen.getByRole("button", { name: "Start together" });
  fireEvent.click(startButton);
  fireEvent.click(startButton);

  await waitFor(() => expect(mockCaptureStart).toHaveBeenCalledTimes(2));
  await act(async () => {
    starters.forEach((resolve) => resolve(true));
  });
  expect(await screen.findByText("2/2 capturing")).toBeInTheDocument();
  expect(mockCaptureStart).toHaveBeenCalledTimes(2);
});

test("stops both endpoints when one synchronized port fails to open", async () => {
  mockCaptureStart
    .mockReset()
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false);
  renderSetup();

  await screen.findByText("Both ports ready");
  fireEvent.click(screen.getByRole("button", { name: "Start together" }));

  expect(await screen.findByText(/Both ports did not open/i)).toBeInTheDocument();
  expect(mockCaptureStop).toHaveBeenCalledTimes(2);
});

test("adopts reviewed values into local FC and radio plans without saving", () => {
  renderSetup();

  expect(screen.getByText(/arm 6/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Adopt mock FC values" }));
  expect(screen.getByText(/arm 5/)).toBeInTheDocument();
  expect(screen.getByText(/Adopted 2 observed flight-controller values/i))
    .toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Radio link" }));
  expect(screen.getByText(/packet 250/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Adopt mock radio values" }));
  expect(screen.getByText(/packet 100-full/)).toBeInTheDocument();
  expect(screen.getByText(/Adopted 2 observed radio values/i))
    .toBeInTheDocument();
  expect(localStorage.getItem("rotorbench:hardware-plan:standalone:fc")).toBeNull();
  expect(localStorage.getItem("rotorbench:hardware-plan:standalone:radio")).toBeNull();
});

test("uses the selected build controller and receiver", () => {
  localStorage.setItem("currentBuild", JSON.stringify({
    id: "build-test",
    name: "Bench quad",
    componentIds: {
      frameId: "frame-aos-35-v51",
      flightControllerId: "fc-holybro-kakute-f7",
      receiverId: "rx-elrs-24g",
    },
  }));
  renderSetup();
  expect(screen.getByText(/Flight controller panel: Kakute F7 AIO \/ motors 4/)).toBeInTheDocument();
  expect(screen.getAllByText(/Read-only serial capture: 400000 \/ tx/)).toHaveLength(1);
  expect(screen.getByText(/Read-only serial capture: 420000 \/ rx/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Radio link" }));
  expect(screen.getByText(/Radio panel: ELRS 2.4G RX \/ roles all/)).toBeInTheDocument();
});

test("editing the build carries its unsaved draft state back to Build", () => {
  const build = {
    id: "draft-build",
    name: "Unsaved draft",
    componentIds: {
      frameId: null,
      motorId: null,
      propellerId: null,
      escId: null,
      flightControllerId: "fc-holybro-kakute-f7",
      batteryId: null,
      receiverId: "rx-elrs-24g",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/setup", state: { build } }]}>
      <BuildProvider>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/build" element={<BuildLocationProbe />} />
        </Routes>
      </BuildProvider>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("link", { name: /Edit build/i }));
  expect(screen.getByText("Build route: draft-build")).toBeInTheDocument();
});

test("supports keyboard tab navigation", () => {
  renderSetup();
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Radio link" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
