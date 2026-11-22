import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import {
  createDefaultFlightControllerConfig,
  getBoardProfile,
} from "../data/flightControllerProfiles";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";
import SetupPage from "./SetupPage";
import { getA11yViolations } from "../test/a11y";
import {
  createCombinedHardwarePlan,
  parseCombinedHardwarePlanJson,
} from "../utils/hardwarePlanTransfer";

jest.mock("./FlightControllerSetup", () => function MockFlightControllerSetup(props = {}) {
  const {
    selectedFlightController,
    buildMotorCount,
    buildServoCount,
    value,
    onOpenEvidenceReview,
  } = props;
  return (
    <div>
      Flight controller panel: {selectedFlightController?.name || "none"} / motors {buildMotorCount ?? "unknown"} / servos {buildServoCount ?? "unknown"} / arm {value?.armChannel ?? "none"}
      <button type="button" onClick={onOpenEvidenceReview}>
        Review mock parameters
      </button>
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
  const { runbook, expectedUid, onAdoptPlanPatch, open } = props;
  return (
    <div data-testid="mock-bench-runbook" data-open={String(Boolean(open))}>
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

test("renders the hardware planning page and switches to radio setup", async () => {
  const { container } = renderSetup();
  expect(screen.getByRole("heading", { name: "Hardware setup" })).toBeInTheDocument();
  expect(screen.getByText(/Flight controller panel/)).toBeInTheDocument();
  expect(screen.getByText(/Bench runbook: 4 stages · plan UID: none/)).toBeInTheDocument();
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
  expect(await getA11yViolations(container)).toEqual([]);
});

test("does not create setup drafts until a plan changes", () => {
  renderSetup();

  expect(localStorage.getItem(
    "rotorbench:hardware-plan:standalone:fc:draft",
  )).toBeNull();
  expect(localStorage.getItem(
    "rotorbench:hardware-plan:standalone:radio:draft",
  )).toBeNull();
  expect(screen.queryByText(/Recovered an unsaved local setup draft/i))
    .not.toBeInTheDocument();
});

test("opens the evidence review directly from bench tools", () => {
  renderSetup();

  fireEvent.click(screen.getByText("Bench tools"));
  expect(screen.getByTestId("mock-bench-runbook")).toHaveAttribute(
    "data-open",
    "false",
  );
  fireEvent.click(screen.getByRole("button", {
    name: /Review imported evidence/i,
  }));
  expect(screen.getByTestId("mock-bench-runbook")).toHaveAttribute(
    "data-open",
    "true",
  );
});

test("opens the evidence review from an ArduPilot parameter plan", () => {
  renderSetup();

  fireEvent.click(screen.getByRole("button", {
    name: "Review mock parameters",
  }));
  expect(screen.getByTestId("setup-bench-tools"))
    .toHaveAttribute("open");
  expect(screen.getByTestId("mock-bench-runbook")).toHaveAttribute(
    "data-open",
    "true",
  );
});

test("stages imported hardware plans until the user reviews and applies them", async () => {
  const { container } = renderSetup();
  const importedPlan = {
    schema: "rotorbench.hardware-plan.v1",
    build: null,
    receiver: null,
    flightController: {
      config: {
        planVersion: 3,
        armChannel: 7,
        armHoldMs: 800,
      },
    },
    radio: {
      target: { id: "aerialkit-elrs-rev-a3" },
      configuration: {
        role: "tx",
        powerDbm: -14,
        packetRateMode: "250",
        linkMode: "normal",
        telemetryRatio: "std",
        switchMode: "wide",
        dynamicPower: "off",
        hostTransport: "native-usb",
        hostBay: "native-usb",
        handsetId: "verify",
        channelMap: { arm: 7, flightMode: 6 },
        antennaConfirmed: false,
        roleSwitchConfirmed: false,
      },
    },
  };
  const file = {
    name: "bench-plan.json",
    text: async () => JSON.stringify(importedPlan),
  };
  const input = screen.getByLabelText("Import combined hardware plan");

  fireEvent.change(input, { target: { files: [file] } });

  const review = await screen.findByRole("region", {
    name: "Review imported hardware plan",
  });
  expect(within(review).getByText("bench-plan.json · staged only, nothing sent or saved"))
    .toBeInTheDocument();
  expect(within(review).getAllByText(/arm channel/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Flight controller panel: none.*arm 6/i))
    .toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);

  fireEvent.click(within(review).getByRole("button", { name: "Cancel import" }));
  expect(screen.queryByRole("region", {
    name: "Review imported hardware plan",
  })).not.toBeInTheDocument();
  expect(screen.getByText(/Flight controller panel: none.*arm 6/i))
    .toBeInTheDocument();

  fireEvent.change(input, { target: { files: [file] } });
  const secondReview = await screen.findByRole("region", {
    name: "Review imported hardware plan",
  });
  fireEvent.click(within(secondReview).getByRole("button", {
    name: "Apply imported plan",
  }));
  expect(screen.getByText(/Flight controller panel: none.*arm 7/i))
    .toBeInTheDocument();
});

test("surfaces stale ArduPilot metadata without staging the plan", async () => {
  renderSetup();
  const profile = getBoardProfile("matek-h743-wing-v3-ardupilot");
  const config = {
    ...createDefaultFlightControllerConfig(),
    firmwareFamily: "ardupilot",
    profileId: profile.id,
    receiverProtocol: "crsf",
    receiverUart: "UART6",
  };
  const plan = createCombinedHardwarePlan({
    build: null,
    flightController: { config, profile, issues: [] },
    radio: DEFAULT_RADIO_CONFIG,
    generatedAt: "2026-05-01T00:00:00.000Z",
  });
  plan.flightController.parameterRequirements[0].value = "0";
  expect(plan.flightController.parameterRequirements[0].value).toBe("0");
  expect(() => parseCombinedHardwarePlanJson(JSON.stringify(plan)))
    .toThrow(/do not match the selected board profile/i);
  const file = {
    name: "stale-h743-plan.json",
    text: async () => JSON.stringify(plan),
  };

  fireEvent.change(screen.getByLabelText("Import combined hardware plan"), {
    target: { files: [file] },
  });

  expect(await screen.findByRole("status")).toHaveTextContent(
    /Could not import hardware plan:.*do not match the selected board profile.*Export a fresh plan/i,
  );
  expect(screen.queryByRole("region", {
    name: "Review imported hardware plan",
  })).not.toBeInTheDocument();
});

test("copies a sanitized human-readable hardware plan summary", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderSetup();

  fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));

  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("RotorBench hardware plan briefing"),
    );
  });
  const text = writeText.mock.calls[0][0];
  expect(text).toContain("## Flight-controller plan");
  expect(text).toContain("## Radio plan");
  expect(text).toContain("Binding phrase and direct UID are intentionally excluded.");
  expect(await screen.findByText(/Binding material was excluded/i)).toBeInTheDocument();
});

test("passes the staged binding UID to evidence review without putting it in a draft", async () => {
  localStorage.setItem(
    "rotorbench:hardware-plan:standalone:radio",
    JSON.stringify({
      ...DEFAULT_RADIO_CONFIG,
      bindingPhrase: "local-test-phrase",
    }),
  );

  renderSetup();

  expect(screen.getByText(/plan UID: 83:63:42:33:50:ab/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Radio link" }));
  fireEvent.click(screen.getByRole("button", { name: "Adopt mock radio values" }));
  await waitFor(() => {
    expect(localStorage.getItem(
      "rotorbench:hardware-plan:standalone:radio:draft",
    )).not.toBeNull();
  });
  const draft = localStorage.getItem(
    "rotorbench:hardware-plan:standalone:radio:draft",
  );
  expect(draft).not.toContain("local-test-phrase");
  expect(JSON.parse(draft).bindingPhrase).toBe("");
});

test("does not restore binding material from a local draft", async () => {
  localStorage.setItem(
    "rotorbench:hardware-plan:standalone:radio:draft",
    JSON.stringify({
      ...DEFAULT_RADIO_CONFIG,
      bindingPhrase: "draft-secret",
      uid: "10:73:a1:1f:a8:0f",
    }),
  );

  renderSetup();

  expect(screen.getByText(/plan UID: none/)).toBeInTheDocument();
  await waitFor(() => {
    expect(localStorage.getItem(
      "rotorbench:hardware-plan:standalone:radio:draft",
    )).toBeNull();
  });
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

test("adopts reviewed values into local plans and preserves a safe draft", async () => {
  renderSetup();

  expect(screen.getByText(/arm 6/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Adopt mock FC values" }));
  expect(screen.getByText(/arm 5/)).toBeInTheDocument();
  expect(screen.getByText(/Adopted 2 observed flight-controller values/i))
    .toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Flight controller" }))
    .toHaveClass("has-unsaved");
  expect(screen.getByRole("tab", { name: "Radio link" }))
    .not.toHaveClass("has-unsaved");

  fireEvent.click(screen.getByRole("tab", { name: "Radio link" }));
  expect(screen.getByText(/packet 250/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Adopt mock radio values" }));
  expect(screen.getByText(/packet 100-full/)).toBeInTheDocument();
  expect(screen.getByText(/Adopted 2 observed radio values/i))
    .toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Radio link" }))
    .toHaveClass("has-unsaved");
  expect(screen.getByText("Unsaved local changes")).toBeInTheDocument();
  expect(localStorage.getItem("rotorbench:hardware-plan:standalone:fc")).toBeNull();
  expect(localStorage.getItem("rotorbench:hardware-plan:standalone:radio")).toBeNull();
  await waitFor(() => {
    expect(localStorage.getItem(
      "rotorbench:hardware-plan:standalone:fc:draft",
    )).not.toBeNull();
  });
  const fcDraft = JSON.parse(localStorage.getItem(
    "rotorbench:hardware-plan:standalone:fc:draft",
  ));
  const radioDraft = JSON.parse(localStorage.getItem(
    "rotorbench:hardware-plan:standalone:radio:draft",
  ));
  expect(fcDraft.armChannel).toBe(5);
  expect(radioDraft.packetRateMode).toBe("100-full");
  expect(radioDraft.bindingPhrase).toBe("");
  expect(radioDraft.uid).toBe("");
});

test("restores an unsaved local setup draft after remounting", async () => {
  const view = renderSetup();
  fireEvent.click(screen.getByRole("button", { name: "Adopt mock FC values" }));
  expect(screen.getByText(/arm 5/)).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem(
      "rotorbench:hardware-plan:standalone:fc:draft",
    )).armChannel).toBe(5);
  });

  view.unmount();
  renderSetup();

  expect(await screen.findByText(/arm 5/)).toBeInTheDocument();
  expect(screen.getByText(/Recovered an unsaved local setup draft/i))
    .toBeInTheDocument();
  expect(screen.getByText(/Binding phrase and direct UID are not retained/i))
    .toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Flight controller" }))
    .toHaveClass("has-unsaved");
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
  expect(screen.getByText(/Radio panel: JHEMCU EP24S ExpressLRS Receiver \/ roles all/))
    .toBeInTheDocument();
});

test("carries the selected T1 frame servo hardware into Setup", () => {
  localStorage.setItem("currentBuild", JSON.stringify({
    id: "t1-setup",
    name: "T1 setup",
    componentIds: {
      frameId: "frame-heewing-t1-ranger",
      flightControllerId: "fc-matek-f405-wmn",
      receiverId: "rx-radiomaster-rp4td-m",
    },
  }));
  renderSetup();
  expect(screen.getByText(/motors 2 \/ servos 3/)).toBeInTheDocument();
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
