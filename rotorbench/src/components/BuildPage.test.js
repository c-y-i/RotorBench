import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Link, MemoryRouter, useLocation } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import BuildPage from "./BuildPage";
import { createBuildShareToken } from "../utils/buildLink";

jest.mock("./BabylonViewer.jsx", () => ({
  cameraView,
  autoRotate,
  exploded,
  frameCornerPositions,
  assemblySpec,
  propellerDirection,
  showFitOverlay,
  fitOverlayStatus,
  onReady,
}) => (
  <div
    data-testid="assembly-viewer"
    data-camera-view={cameraView}
    data-auto-rotate={String(autoRotate)}
    data-exploded={String(exploded)}
    data-frame={assemblySpec?.frame?.id || ""}
    data-motor-mount-count={frameCornerPositions?.length || 0}
    data-motor={assemblySpec?.motor?.id || ""}
    data-motor-shaft={assemblySpec?.motor?.propShaftMm ?? ""}
    data-motor-measured={assemblySpec?.motor?.measuredFields?.join(",") || ""}
    data-propeller={assemblySpec?.propeller?.id || ""}
    data-propeller-direction={propellerDirection || ""}
    data-esc={assemblySpec?.esc?.id || ""}
    data-battery={assemblySpec?.battery?.id || ""}
    data-flight-controller={assemblySpec?.flightController?.id || ""}
    data-receiver={assemblySpec?.receiver?.id || ""}
    data-fit-overlay={String(showFitOverlay)}
    data-fit-motor-conflict={String(Boolean(fitOverlayStatus?.motorConflict))}
  >
    <button type="button" onClick={() => onReady?.()}>
      Assembly ready
    </button>
  </div>
));

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <output data-testid="location-search">{location.search}</output>
      <output data-testid="location-path">{location.pathname}</output>
      <output data-testid="location-build-id">{location.state?.build?.id || ""}</output>
      <output data-testid="location-fc-id">
        {location.state?.build?.componentIds?.flightControllerId || ""}
      </output>
      <output data-testid="location-motor-shaft">
        {location.state?.build?.geometryOverrides?.categories?.motors?.[
          location.state?.build?.componentIds?.motorId
        ]?.propShaftMm || ""}
      </output>
      <output data-testid="location-build-note">
        {location.state?.build?.note || ""}
      </output>
    </>
  );
}

const build = {
  id: "build-camera-test",
  name: "Camera test",
  componentIds: {
    frameId: "frame-5inch-220mm",
    motorId: null,
    propellerId: null,
    escId: null,
    flightControllerId: null,
    batteryId: null,
    receiverId: null,
  },
};

const importedPlanBuild = {
  ...build,
  id: "build-imported-plan",
  importedEvidence: {
    status: "plan-comparison",
    label: "FC plan comparison matched",
    planComparison: {
      targetName: "SpeedyBee F405 V5",
      currentPlanMatches: true,
      compared: 38,
      matched: 1,
      differing: 1,
      notObserved: 36,
      hardwareVerified: false,
    },
  },
};

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  }
});

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => new Promise(() => {}));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("inspection presets control the viewer without leaving orbit mode ambiguous", async () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build } }]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-camera-view", "orbit");
  expect(viewer).toHaveAttribute("data-auto-rotate", "true");
  expect(viewer).toHaveAttribute("data-exploded", "false");
  expect(screen.getByText("Build provenance")).toBeInTheDocument();
  expect(screen.getByText("0/1 source-backed")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export build sheet" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export BOM CSV" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reset all components" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save and go home" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Top" }));
  expect(screen.getByRole("button", { name: "Top" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(viewer).toHaveAttribute("data-camera-view", "top");
  expect(viewer).toHaveAttribute("data-auto-rotate", "false");

  fireEvent.click(screen.getByRole("button", { name: "Orbit" }));
  expect(viewer).toHaveAttribute("data-camera-view", "orbit");
  expect(viewer).toHaveAttribute("data-auto-rotate", "true");

  fireEvent.click(screen.getByRole("button", { name: "Exploded" }));
  expect(screen.getByRole("button", { name: "Assembled" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(viewer).toHaveAttribute("data-exploded", "true");
  expect(screen.getByTestId("location-search")).toHaveTextContent("?exploded=1");
  expect(screen.getByText("Exploded inspection")).toBeInTheDocument();
  expect(screen.getByText("Source-backed assembly notes")).toBeInTheDocument();
  expect(screen.getByText("1 catalog GLB")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Source-backed assembly notes"));
  expect(screen.getByRole("listitem", { name: "Frame assembly note" }))
    .toHaveTextContent("4 motor mounts");
  expect(screen.getAllByText(/catalog geometry/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/not a product-exact fit, wiring, or hardware check/i))
    .toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Assembled" }));
  expect(viewer).toHaveAttribute("data-exploded", "false");
  expect(screen.getByTestId("location-search")).toBeEmptyDOMElement();

  fireEvent.change(screen.getByLabelText("Starter platform"), {
    target: { value: "source-35" },
  });
  expect(viewer).toHaveAttribute("data-frame", "frame-aos-35-v51");
  expect(viewer).toHaveAttribute("data-motor", "motor-tmotor-f1404-3800kv");
  expect(viewer).toHaveAttribute("data-battery", "battery-tattu-rline-4s-850-95c");
  expect(screen.getByText("Mounting interfaces")).toBeInTheDocument();
  expect(screen.getByText("5 matched")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Physical fit checks"));
  expect(screen.getByText("SpeedyBee BLS 35A Mini V2 stack mount")).toBeInTheDocument();
  expect(screen.getByText("SpeedyBee F405 Mini stack mount")).toBeInTheDocument();
  expect(screen.getByText("T-Motor F1404 3800KV mount")).toBeInTheDocument();
  expect(screen.getByText("Gemfan Hurricane 3520 3-Blade hub fit")).toBeInTheDocument();
  expect(screen.getByText("Battery to ESC connector")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Electrical limits"));
  expect(screen.getByText("Gemfan Hurricane 3520 3-Blade frame clearance")).toBeInTheDocument();
  expect(screen.getByText("T-Motor F1404 3800KV voltage")).toBeInTheDocument();
  expect(screen.getByText("SpeedyBee BLS 35A Mini V2 current")).toBeInTheDocument();
  expect(screen.getByText("SpeedyBee F405 Mini input voltage")).toBeInTheDocument();
  expect(screen.getByText("Ready")).toBeInTheDocument();
});

test("shows imported plan-comparison metadata without promoting it to hardware evidence", async () => {
  render(
    <MemoryRouter initialEntries={[{
      pathname: "/build",
      state: { build: importedPlanBuild },
    }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const metadata = screen.getByRole("region", {
    name: "Imported plan comparison metadata",
  });
  expect(within(metadata).getByText("Imported plan comparison")).toBeInTheDocument();
  expect(within(metadata).getByText(/SpeedyBee F405 V5/)).toBeInTheDocument();
  expect(within(metadata).getByText(/1 match.*1 differ.*36 not observed/))
    .toBeInTheDocument();
  expect(within(metadata).getByText("Plan matched")).toBeInTheDocument();
  expect(within(metadata).getByText(/Raw parameter values were excluded/))
    .toBeInTheDocument();
  expect(within(metadata).getByText(/not attached evidence, a write, or hardware verification/))
    .toBeInTheDocument();
});

test("marks the viewer live only after the normalized assembly is ready", async () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build } }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByText("Preparing")).toBeInTheDocument();
  expect(screen.getByText("Preparing assembly geometry")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Assembly ready" }));
  expect(screen.getByText("Live")).toBeInTheDocument();
  expect(screen.queryByText("Preparing assembly geometry"))
    .not.toBeInTheDocument();
});

test("orbit auto-rotation respects the reduced-motion preference", async () => {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });

  try {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/build", state: { build } }]}>
        <BuildProvider>
          <BuildPage />
        </BuildProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const viewer = screen.getByTestId("assembly-viewer");
    expect(screen.getByRole("button", { name: "Orbit" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(viewer).toHaveAttribute("data-auto-rotate", "false");

    fireEvent.click(screen.getByRole("button", { name: "Top" }));
    fireEvent.click(screen.getByRole("button", { name: "Orbit" }));
    expect(viewer).toHaveAttribute("data-camera-view", "orbit");
    expect(viewer).toHaveAttribute("data-auto-rotate", "false");
  } finally {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  }
});

test("build provenance names estimated fields in readable language", async () => {
  render(
    <MemoryRouter initialEntries={[{
      pathname: "/build",
      state: {
        build: {
          id: "estimated-provenance-build",
          name: "Estimated provenance",
          componentIds: {
            frameId: "frame-aos-5-v5",
            motorId: null,
            propellerId: null,
            escId: null,
            flightControllerId: null,
            batteryId: null,
            receiverId: null,
          },
        },
      },
    }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByText("Build provenance"));
  expect(screen.getByText(
    "Estimated: motor positions, stack height",
  )).toBeInTheDocument();
});

test("loads a portable shared build above stored draft state", async () => {
  const token = createBuildShareToken({
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      batteryId: "battery-tattu-rline-4s-850-95c",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      receiverId: "rx-radiomaster-rp4td",
    },
    geometryOverrides: {
      schema: "rotorbench.measured-geometry.v1",
      categories: {
        motors: {
          "motor-tmotor-f1404-3800kv": {
            propShaftMm: 1.5,
          },
        },
      },
    },
  });
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: "stale-draft",
    name: "Stale draft",
    componentIds: build.componentIds,
  }));

  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", search: `?share=${token}` }]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-aos-35-v51");
  expect(viewer).toHaveAttribute("data-motor-measured", "propShaftMm");
  expect(screen.getByText(/Shared build loaded/i)).toBeInTheDocument();
  expect(screen.getByTestId("location-search")).toHaveTextContent("");
  expect(screen.getByTestId("location-build-note")).toHaveTextContent("");
});

test("copies a portable share link without build notes or hardware state", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: {
      build: {
        ...build,
        componentIds: {
          ...build.componentIds,
          motorId: "motor-tmotor-f1404-3800kv",
          propellerId: "prop-gemfan-hurricane-3520-3",
          batteryId: "battery-tattu-rline-4s-850-95c",
          escId: "esc-speedybee-bls-35a-mini-v2",
          flightControllerId: "fc-speedybee-f405-mini",
          receiverId: "rx-radiomaster-rp4td",
        },
        note: "Do not share this note",
      },
    } }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  const link = writeText.mock.calls[0][0];
  expect(link).toContain("/build?share=");
  expect(decodeURIComponent(link)).not.toContain("Do not share this note");
  expect(await screen.findByText(/Share link copied/i)).toBeInTheDocument();
});

test("recovers from a malformed shared build link", async () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", search: "?share=not*valid" }]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByText(/Could not load shared build/i)).toBeInTheDocument();
  expect(screen.getByTestId("location-search")).toHaveTextContent("");
});

test("a starter-platform deep link selects all seven components and consumes the query", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=source-35"]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-aos-35-v51");
  expect(viewer).toHaveAttribute("data-motor", "motor-tmotor-f1404-3800kv");
  expect(viewer).toHaveAttribute("data-propeller", "prop-gemfan-hurricane-3520-3");
  expect(viewer).toHaveAttribute("data-esc", "esc-speedybee-bls-35a-mini-v2");
  expect(viewer).toHaveAttribute("data-flight-controller", "fc-speedybee-f405-mini");
  expect(viewer).toHaveAttribute("data-battery", "battery-tattu-rline-4s-850-95c");
  expect(viewer).toHaveAttribute("data-receiver", "rx-radiomaster-rp1-v2");
  expect(screen.getByTestId("location-search")).toHaveTextContent("");
  expect(screen.getByRole("button", { name: "Save and go home" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Compare" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Compare" }));
  expect(JSON.parse(localStorage.getItem("currentBuild")).componentIds)
    .toMatchObject({
      frameId: "frame-aos-35-v51",
      flightControllerId: "fc-speedybee-f405-mini",
    });
  expect(screen.getByText("4/8 verified · 4 estimated")).toBeInTheDocument();
  const powerPath = screen.getByRole("region", {
    name: "Battery to ESC power path",
  });
  expect(within(powerPath).getByText("XT30 match")).toBeInTheDocument();
  expect(within(powerPath).getByText("Tattu R-Line 4S 850mAh 95C"))
    .toBeInTheDocument();
  expect(within(powerPath).getByRole("link", {
    name: /battery connector source/i,
  })).toHaveAttribute("href", expect.stringContaining("genstattu.com"));
  expect(within(powerPath).getByRole("link", {
    name: /ESC power termination source/i,
  })).toHaveAttribute("href", expect.stringContaining("rotorama.com"));
  fireEvent.click(screen.getByText("Prop rotation map"));
  expect(screen.getByRole("img", {
    name: "Propeller rotation by frame corner",
  })).toBeVisible();
  expect(screen.getByText(/Output numbers are omitted until a supported saved/i))
    .toBeVisible();
  fireEvent.click(screen.getByText("Viewer placement"));
  expect(screen.getByRole("list", { name: "Viewer placement checks" })).toHaveTextContent(
    "Propeller-to-shaft alignment",
  );
  expect(screen.getByRole("list", { name: "Viewer placement checks" })).toHaveTextContent(
    "Battery above electronics",
  );
  expect(screen.getByRole("list", { name: "Viewer placement checks" })).toHaveTextContent(
    "Motor mount interface",
  );
  expect(screen.getByRole("list", { name: "Viewer placement checks" })).toHaveTextContent(
    "Propeller sweep separation",
  );
  const fitOverlay = screen.getByRole("button", { name: "Fit overlay" });
  fireEvent.click(fitOverlay);
  expect(viewer).toHaveAttribute("data-fit-overlay", "true");
  expect(screen.getByText(/Verified interface/)).toBeInTheDocument();
});

test("the T1 Ranger starter loads a two-motor wing assembly", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=source-t1-ranger"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-heewing-t1-ranger");
  expect(viewer).toHaveAttribute("data-motor", "motor-heewing-fx1406-3150kv");
  expect(viewer).toHaveAttribute("data-motor-mount-count", "2");
  expect(viewer).toHaveAttribute("data-propeller", "prop-heewing-fx3830-2");
  expect(viewer).toHaveAttribute("data-esc", "esc-heewing-fx20a-bls-twin");
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  const planningTotals = screen.getByRole("region", { name: "Planning totals" });
  expect(within(planningTotals).getByText("506 g")).toBeInTheDocument();
  expect(within(planningTotals).getByText("$297.89")).toBeInTheDocument();
  expect(within(planningTotals).getByText("+6 g over 500 g envelope"))
    .toBeInTheDocument();
  fireEvent.click(screen.getByText("Prop rotation map"));
  expect(screen.getByRole("img", {
    name: "Propeller rotation for twin motors",
  })).toBeVisible();
  expect(screen.getByText("LEFT")).toBeVisible();
  expect(screen.getByText("RIGHT")).toBeVisible();
  const servos = screen.getByRole("region", {
    name: "Control-surface hardware",
  });
  expect(within(servos).getByText("3 servos")).toBeInTheDocument();
  expect(within(servos).getByText(
    "HeeWing FX-7G Digital Metal Gear Servo Set",
  )).toBeInTheDocument();
  expect(within(servos).getByText(/2 × 180 mm aileron, 1 × 400 mm tail/i))
    .toBeInTheDocument();
  expect(within(servos).getByRole("link", {
    name: /open servo source/i,
  })).toHaveAttribute("href", expect.stringContaining("7g-digital-metal-gear-servo"));
  expect(within(servos).getByLabelText("Servo output coverage"))
    .toHaveTextContent("Servo map not saved");
});

test("the T1 H743 starter loads the documented ArduPilot wing controller", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=source-t1-ranger-h743"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-heewing-t1-ranger");
  expect(viewer).toHaveAttribute("data-flight-controller", "fc-matek-h743-wing-v3");
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  expect(screen.getAllByText(/Matek H743-WING V3/).length).toBeGreaterThan(0);
  expect(screen.getByText(
    /ArduPilot parameters: BRD_ALT_CONFIG=1 · SERIAL7_PROTOCOL=23/i,
  )).toBeInTheDocument();
});

test("the 5-inch Xrossband starter loads the DBR4 receiver", async () => {
  render(
    <MemoryRouter
      initialEntries={["/build?preset=source-5-aos-f722-xrossband"]}
    >
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByTestId("assembly-viewer")).toHaveAttribute(
    "data-receiver",
    "rx-radiomaster-dbr4-gemini-xrossband",
  );
  expect(screen.getByText(
    "5-inch AOS F722 Xrossband build",
  )).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
});

test("a PWM-only receiver does not claim a serial receiver route", async () => {
  render(
    <MemoryRouter initialEntries={[{
      pathname: "/build",
      state: {
        build: {
          id: "t1-pwm-receiver",
          name: "T1 PWM receiver",
          componentIds: {
            frameId: "frame-heewing-t1-ranger",
            motorId: "motor-heewing-fx1406-3150kv",
            propellerId: "prop-heewing-fx3830-2",
            escId: "esc-heewing-fx20a-bls-twin",
            flightControllerId: "fc-matek-f405-wmn",
            batteryId: "battery-cnhl-black-4s-1500-100c",
            receiverId: "rx-radiomaster-er3c-i-24-pwm",
          },
        },
      },
    }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByText(/PWM outputs only · no serial route published/i))
    .toBeInTheDocument();
  expect(screen.queryByText(/UART2 \/ 420000 baud · PWM outputs only/i))
    .not.toBeInTheDocument();
});

test("a saved Aerial Kit wing plan maps the T1 left and right outputs", async () => {
  const t1Build = {
    id: "t1-saved-plan",
    name: "T1 saved plan",
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
    "rotorbench:hardware-plan:t1-saved-plan:fc",
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
  render(
    <MemoryRouter initialEntries={[{
      pathname: "/build",
      state: { build: t1Build },
    }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-propeller-direction", "props-out");
  fireEvent.click(screen.getByText("Prop rotation map"));
  const map = screen.getByRole("img", {
    name: "Propeller rotation for twin motors",
  });
  expect(map).toHaveAccessibleDescription(/UL output 1 \(CCW\).*UR output 2 \(CW\)/i);
  expect(screen.getByText("OUT 1")).toBeVisible();
  expect(screen.getByText("OUT 2")).toBeVisible();
  expect(screen.getByText(/saved flight-controller wing mixer plan/i))
    .toBeVisible();
  const servos = screen.getByRole("region", {
    name: "Control-surface hardware",
  });
  expect(within(servos).getByLabelText("Servo output coverage"))
    .toHaveTextContent("2/3 outputs mapped");
  expect(within(servos).getByLabelText("Servo output coverage"))
    .toHaveTextContent("1 catalogued servo output remains unassigned");
});

test("the 5.5-inch XING2 6S preset exposes estimated geometry honestly", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=source-55-xing2"]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-motor", "motor-iflight-xing2-2207-1855kv");
  expect(viewer).toHaveAttribute("data-battery", "battery-tattu-rline-v3-6s-1050-120c");
  expect(viewer).toHaveAttribute("data-esc", "esc-speedybee-bl32-50a");
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  expect(screen.getByText("2/8 verified · 6 estimated")).toBeInTheDocument();
});

test("Volador II VX5 starter loads its source-backed physical interfaces", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=source-5-volador-51499"]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-volador-ii-vx5-o4");
  expect(viewer).toHaveAttribute("data-motor", "motor-aos-supernova-2207-1980kv");
  expect(viewer).toHaveAttribute("data-propeller", "prop-gemfan-hurricane-51499-3");
  expect(viewer).toHaveAttribute("data-battery", "battery-tattu-rline-v6-6s-1480-160c");
  expect(screen.getByLabelText("Starter platform"))
    .toHaveValue("source-5-volador-51499");
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  expect(screen.getByText("Fit needs manual verification")).toBeInTheDocument();
});

test("F405 V5 and OX32 starter keeps the published stack fully aligned", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=source-5-volador-f405v5"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-volador-ii-vx5-o4");
  expect(viewer).toHaveAttribute("data-esc", "esc-speedybee-ox32-55a");
  expect(viewer).toHaveAttribute("data-flight-controller", "fc-speedybee-f405-v5");
  expect(screen.getByLabelText("Starter platform"))
    .toHaveValue("source-5-volador-f405v5");
  expect(screen.getAllByText("5 verified · no data gaps").length)
    .toBeGreaterThanOrEqual(2);
  expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
});

test("build-local measurements update fit evidence without claiming verification", async () => {
  const measuredBuild = {
    id: "measured-build",
    name: "Measured build",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-tmotor-f60-pro-v-1750kv",
      propellerId: "prop-gemfan-hurricane-51466-v2",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-speedybee-f405-v4",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp3-h",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build: measuredBuild } }]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByText("Viewer placement"));
  fireEvent.click(screen.getByRole("button", {
    name: "Measure prop shaft diameter for Propeller hub interface",
  }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByRole("group", { name: "Choose a part to measure" }))
    .toBeVisible();
  expect(screen.getByRole("button", {
    name: /Motor T-Motor F60 Pro V 2207.5 1750KV/i,
  })).toHaveAttribute("aria-pressed", "true");
  const shaft = screen.getByLabelText(
    "Motor Prop shaft diameter in millimetres",
  );
  expect(shaft).toHaveValue(null);
  await waitFor(() => expect(shaft).toHaveFocus());
  fireEvent.change(shaft, { target: { value: "5" } });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByTestId("assembly-viewer")).toHaveAttribute(
    "data-motor-measured",
    "propShaftMm",
  );

  const hubCheck = screen.getByRole("listitem", {
    name: "Propeller hub interface",
  });
  expect(within(hubCheck).getByText("Measured")).toBeInTheDocument();
  expect(within(hubCheck).queryByText("Verified")).not.toBeInTheDocument();
  expect(screen.queryByText("Physical fit verified")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Physical fit checks"));
  const measuredPhysicalFit = screen.getByRole("listitem", {
    name: "Gemfan Hurricane 51466 V2 hub fit",
  });
  expect(within(measuredPhysicalFit).getByText("Measured")).toBeInTheDocument();

  const draft = JSON.parse(localStorage.getItem("rotorbench:build-draft:v1"));
  expect(draft.geometryOverrides.categories.motors[
    "motor-tmotor-f60-pro-v-1750kv"
  ].propShaftMm).toBe(5);

  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
  expect(screen.getByTestId("location-path")).toHaveTextContent("/analysis");
  expect(screen.getByTestId("location-motor-shaft")).toHaveTextContent("5");
});

test("a measured battery deck produces a build-local footprint check", async () => {
  const deckBuild = {
    id: "deck-build",
    name: "Deck measurement build",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-tmotor-f60-pro-v-1750kv",
      propellerId: "prop-gemfan-hurricane-51466-v2",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-speedybee-f405-v4",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp3-h",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build: deckBuild } }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByText("Measured geometry"));
  fireEvent.change(screen.getByLabelText(
    "Frame Usable battery deck axis 1 in millimetres",
  ), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText(
    "Frame Usable battery deck axis 2 in millimetres",
  ), { target: { value: "80" } });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByText("Physical fit checks"));
  const deckCheck = screen.getByRole("listitem", {
    name: "Battery deck footprint",
  });
  expect(within(deckCheck).getByText("Measured")).toBeInTheDocument();
  expect(within(deckCheck).getByText(
    /measured usable battery deck of 70 × 80 mm/i,
  )).toBeInTheDocument();
});

test("build notes persist through the draft and analysis handoff", async () => {
  const noteBuild = {
    id: "note-build",
    name: "Note build",
    note: "Initial bench note",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-tmotor-f60-pro-v-1750kv",
      propellerId: "prop-gemfan-hurricane-51466-v2",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-speedybee-f405-v4",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp3-h",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build: noteBuild } }]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByText("Build provenance"));
  const note = screen.getByLabelText("Build notes");
  expect(note).toHaveValue("Initial bench note");
  fireEvent.change(note, {
    target: { value: "Check prop direction and receiver UART before the bench run." },
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(JSON.parse(localStorage.getItem("rotorbench:build-draft:v1")).note)
    .toBe("Check prop direction and receiver UART before the bench run.");
  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
  expect(screen.getByTestId("location-build-note")).toHaveTextContent(
    "Check prop direction and receiver UART before the bench run.",
  );
});

test("the power path surfaces source-backed manual termination", async () => {
  const solderBuild = {
    id: "solder-power-build",
    name: "Solder power build",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-tmotor-f60-pro-v-1750kv",
      propellerId: "prop-gemfan-hurricane-51466-v2",
      escId: "esc-holybro-tekko32-f4-65a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp3-h",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build: solderBuild } }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const powerPath = screen.getByRole("region", {
    name: "Battery to ESC power path",
  });
  expect(within(powerPath).getByText("Solder lead")).toBeInTheDocument();
  expect(within(powerPath).getByText("Solder pads")).toBeInTheDocument();
  expect(within(powerPath).getByText(/verify polarity and wire gauge/i))
    .toBeInTheDocument();
  expect(within(powerPath).getByLabelText("Power polarity inspection"))
    .toHaveTextContent(/verify red\/black polarity and connector gender/i);
});

test("the power path names an adapter for a connector mismatch", async () => {
  const adapterBuild = {
    id: "adapter-power-build",
    name: "Adapter power build",
    componentIds: {
      frameId: "frame-aos-5-v5",
      motorId: "motor-iflight-xing2-2207-1855kv",
      propellerId: "prop-hqprop-pizzacutters-5037-3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp4td-m",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build: adapterBuild } }]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const powerPath = screen.getByRole("region", {
    name: "Battery to ESC power path",
  });
  expect(within(powerPath).getByText("Adapter required")).toBeInTheDocument();
  expect(within(powerPath).getByLabelText("Connector adapter requirement"))
    .toHaveTextContent("XT30-to-XT60 adapter");
  expect(within(powerPath).getByLabelText("Connector adapter requirement"))
    .toHaveTextContent(/confirm connector gender/i);
});

test("copies a sanitized human-readable build briefing", async () => {
  const originalClipboard = navigator.clipboard;
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  try {
    render(
      <MemoryRouter initialEntries={["/build?preset=source-35"]}>
        <BuildProvider>
          <BuildPage />
        </BuildProvider>
      </MemoryRouter>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    fireEvent.click(screen.getByText("Build provenance"));
    fireEvent.click(screen.getByRole("button", { name: "Copy briefing" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const briefing = writeText.mock.calls[0][0];
    expect(briefing).toContain("# RotorBench briefing:");
    expect(briefing).toContain("## Parts");
    expect(briefing).toContain("## Planning");
    expect(briefing).toMatch(/Planning weight: \d+(?:\.\d)? g/);
    expect(briefing).toContain("XT30 match");
    expect(briefing).toContain("Hardware, wiring, continuity, RF link, and flight readiness are not verified.");
  } finally {
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete navigator.clipboard;
    }
  }
});

test("an invalid starter-platform deep link leaves the required build gates intact", async () => {
  render(
    <MemoryRouter initialEntries={["/build?preset=not-a-platform"]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByRole("heading", { name: "Start with a frame" })).toBeInTheDocument();
  expect(screen.getByTestId("location-search")).toHaveTextContent("");
  expect(screen.getByRole("button", { name: "Save and go home" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Analyze" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Compare" })).toBeDisabled();
});

test("hardware setup carries the unsaved draft identity and selected FC/receiver", async () => {
  const hardwareDraft = {
    id: "hardware-draft",
    name: "Hardware draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/build", state: { build: hardwareDraft } }]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByText("Plan not saved")).toBeInTheDocument();
  expect(screen.getByText(/Betaflight · CRSF \/ ExpressLRS · UART2 \/ 420000 baud/i))
    .toBeInTheDocument();
  expect(screen.getByText(/Board map: SPEEDYBEEF405MINI · documented/i))
    .toBeInTheDocument();
  expect(screen.getByText(/Pins documented/i)).toBeInTheDocument();
  expect(screen.getByText(/Native USB CDC · Transport documented/i))
    .toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open setup" }));

  expect(screen.getByTestId("location-path")).toHaveTextContent("/setup");
  expect(screen.getByTestId("location-build-id")).toHaveTextContent("hardware-draft");
  expect(screen.getByTestId("location-fc-id"))
    .toHaveTextContent("fc-speedybee-f405-mini");
});

test("restores an automatically saved unsaved build draft", async () => {
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: "recovered-draft",
    name: "Recovered draft",
    note: "Recovered note",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  }));

  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const viewer = screen.getByTestId("assembly-viewer");
  expect(viewer).toHaveAttribute("data-frame", "frame-aos-35-v51");
  expect(viewer).toHaveAttribute("data-motor", "motor-tmotor-f1404-3800kv");
  expect(viewer).toHaveAttribute("data-receiver", "rx-radiomaster-rp1-v2");
  expect(screen.getByRole("button", { name: "Save and go home" })).toBeEnabled();
  expect(screen.getByText("Recovered draft restored from this browser."))
    .toHaveAttribute("role", "status");
  fireEvent.click(screen.getByText("Build provenance"));
  expect(screen.getByLabelText("Build notes")).toHaveValue("Recovered note");
});

test("receiver picker explains RF-band compatibility with the saved radio plan", async () => {
  const buildId = "rf-picker-build";
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: buildId,
    name: "RF picker draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp4td",
    },
  }));
  localStorage.setItem(`rotorbench:hardware-plan:${buildId}:radio`, JSON.stringify({
    planVersion: 3,
    selectedReceiverId: "rx-radiomaster-rp4td",
    targetId: "aerialkit-elrs-rev-a3",
    role: "tx",
  }));

  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByRole("button", {
    name: /RadioMaster RP4TD.*CRSF/i,
  }));
  expect(await screen.findByRole("option", {
    name: /RadioMaster XR4.*2.4 GHz.*Sub-G 900 MHz.*Shares 2.4 GHz with Aerial Kit/i,
  })).toBeInTheDocument();
}, 10000);

test("saved navigation safety remains visible on the build hardware plan", async () => {
  const buildId = "navigation-safety-build";
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: buildId,
    name: "Navigation safety draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  }));
  localStorage.setItem(`rotorbench:hardware-plan:${buildId}:fc`, JSON.stringify({
    planVersion: 3,
    selectedFlightControllerId: "fc-speedybee-f405-mini",
    selectedReceiverId: "rx-radiomaster-rp1-v2",
    firmwareFamily: "aerialkit",
    profileId: "custom-board",
    airframe: "quadx",
    fenceEnabled: true,
    fenceRadiusM: 250,
    fenceCeilingM: 120,
    rthMinAltM: 30,
    gpsMinSats: 8,
    batteryRthEnabled: true,
    missionChannel: 7,
  }));

  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByText(
    "Navigation safety: Fence 250 m / 120 m ceiling · Floor 30 m · GPS 8 sats · Pack RTH on",
  )).toBeInTheDocument();
  expect(screen.getByText(
    "Mission controls: Mission CH7 · Launch N/A",
  )).toBeInTheDocument();
});

test("saved Betaflight QUAD X direction drives the assembly prop handedness", async () => {
  const buildId = "props-in-build";
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: buildId,
    name: "Props-in draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  }));
  localStorage.setItem(`rotorbench:hardware-plan:${buildId}:fc`, JSON.stringify({
    planVersion: 3,
    selectedFlightControllerId: "fc-speedybee-f405-mini",
    selectedReceiverId: "rx-radiomaster-rp1-v2",
    firmwareFamily: "betaflight",
    profileId: "custom-board",
    airframe: "quadx",
    motorDirection: "props-in",
  }));

  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByTestId("assembly-viewer"))
    .toHaveAttribute("data-propeller-direction", "props-in");
  expect(screen.getByText("props in · outputs mapped")).toBeInTheDocument();
  expect(screen.getByText("OUT 1")).toBeInTheDocument();
  expect(screen.getByText("OUT 4")).toBeInTheDocument();
});

test("saved Aerial Kit QUAD X derives props-in from its corner map", async () => {
  const buildId = "aerialkit-props-in-build";
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: buildId,
    name: "Aerial Kit props-in draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  }));
  localStorage.setItem(`rotorbench:hardware-plan:${buildId}:fc`, JSON.stringify({
    planVersion: 3,
    selectedFlightControllerId: "fc-speedybee-f405-mini",
    selectedReceiverId: "rx-radiomaster-rp1-v2",
    firmwareFamily: "aerialkit",
    profileId: "custom-board",
    airframe: "quadx",
    motorDirection: "props-in",
  }));

  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByTestId("assembly-viewer"))
    .toHaveAttribute("data-propeller-direction", "props-in");
  expect(screen.getByText("props in · outputs mapped")).toBeInTheDocument();
});

test("new build requests ignore and consume an existing draft", async () => {
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: "old-draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
    },
  }));

  render(
    <MemoryRouter initialEntries={["/build?new=1"]}>
      <BuildProvider>
        <BuildPage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByRole("heading", { name: "Start with a frame" })).toBeInTheDocument();
  expect(screen.getByTestId("location-search")).toHaveTextContent("");
  expect(screen.getByRole("button", { name: "Save and go home" })).toBeDisabled();
});

test("new build resets cleanly when selected from the already-open Build route", async () => {
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: "draft-to-clear",
    name: "Loaded draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  }));
  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
        <Link to="/build?new=1">Start clean draft</Link>
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByTestId("assembly-viewer")).toHaveAttribute(
    "data-frame",
    "frame-aos-35-v51",
  );

  fireEvent.click(screen.getByRole("link", { name: "Start clean draft" }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.getByRole("heading", { name: "Start with a frame" })).toBeInTheDocument();
  expect(screen.getByText("New build started.")).toBeInTheDocument();
  expect(screen.getByTestId("location-search")).toHaveTextContent("");
});

test("stale draft IDs cannot satisfy required build gates", async () => {
  localStorage.setItem("rotorbench:build-draft:v1", JSON.stringify({
    version: 1,
    id: "stale-draft",
    name: "Stale draft",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-removed-from-catalog",
      propellerId: "prop-removed-from-catalog",
      batteryId: "battery-removed-from-catalog",
    },
  }));
  render(
    <MemoryRouter initialEntries={["/build"]}>
      <BuildProvider>
        <BuildPage />
      </BuildProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(screen.getByTestId("assembly-viewer")).toHaveAttribute(
    "data-frame",
    "frame-aos-35-v51",
  );
  expect(screen.getByTestId("assembly-viewer")).toHaveAttribute("data-motor", "");
  expect(screen.getByText("1/4")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save and go home" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Analyze" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Compare" })).toBeEnabled();
});
