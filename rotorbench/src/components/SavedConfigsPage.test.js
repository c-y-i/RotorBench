import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SavedConfigsPage from "./SavedConfigsPage";
import { createBenchEvidenceScope } from "../utils/benchEvidenceAttachment";
import { getA11yViolations } from "../test/a11y";

const offlineBuild = {
  id: "offline-build",
  name: "Offline build",
  note: "Inspect the motor direction map before assembly.",
  componentIds: {
    frameId: "frame-5inch-220mm",
    motorId: "motor-2207-1750kv",
    propellerId: "prop-5040-tri",
    batteryId: "battery-4s-1550mah-95c",
    escId: null,
    flightControllerId: null,
    receiverId: null,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("offlineBuilds", JSON.stringify([offlineBuild]));
  localStorage.setItem(
    "rotorbench:hardware-plan:offline-build:fc",
    JSON.stringify({ planVersion: 3 }),
  );
});

test("offline builds can be renamed and duplicated with their saved plan and evidence", async () => {
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  await screen.findByRole("heading", { name: "Offline build" });
  expect(screen.getByText("Hardware partial")).toBeInTheDocument();
  expect(screen.getByText("Fit review")).toBeInTheDocument();
  expect(screen.getByText("Inspect the motor direction map before assembly."))
    .toBeInTheDocument();
  expect(screen.getByText("0/4 sourced")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));
  fireEvent.change(screen.getByLabelText("Rename Offline build"), {
    target: { value: "Renamed build" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save build name" }));
  await screen.findByRole("heading", { name: "Renamed build" });

  localStorage.setItem(
    "rotorbench:bench-evidence:offline-build:v1",
    JSON.stringify({
      schema: "rotorbench.build-bench-evidence.v1",
      attachedAt: "2026-11-20T12:00:00.000Z",
      rfReportedPass: true,
      rfEvidenceComplete: true,
      diagnosticsComplete: true,
      settingsComplete: true,
      checkCounts: { pass: 8, fail: 0, unverified: 2 },
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  await screen.findByRole("heading", { name: "Renamed build copy" });

  const saved = JSON.parse(localStorage.getItem("offlineBuilds"));
  expect(saved).toHaveLength(2);
  const copy = saved.find((build) => build.name === "Renamed build copy");
  expect(copy).toBeTruthy();
  expect(
    localStorage.getItem(`rotorbench:hardware-plan:${copy.id}:fc`),
  ).toBe('{"planVersion":3}');
  expect(
    JSON.parse(localStorage.getItem(`rotorbench:bench-evidence:${copy.id}:v1`)),
  ).toMatchObject({
    schema: "rotorbench.build-bench-evidence.v1",
    attachedAt: "2026-11-20T12:00:00.000Z",
    rfEvidenceComplete: true,
  });
});

test("a valid build sheet imports as a new offline build", async () => {
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Offline build" });
  const file = {
    name: "import.json",
    text: async () => JSON.stringify({
      schema: "rotorbench.build-sheet.v1",
      build: {
        id: "source-sheet",
        name: "Imported AOS",
        componentIds: {
          frameId: "frame-aos-55-v2",
          motorId: "motor-emax-eco-ii-2207-1900kv",
        },
      },
    }),
  };

  fireEvent.change(screen.getByLabelText("Import RotorBench build sheet"), {
    target: { files: [file] },
  });

  await screen.findByRole("heading", { name: "Imported AOS (imported)" });
  const saved = JSON.parse(localStorage.getItem("offlineBuilds"));
  expect(saved).toHaveLength(2);
  expect(saved[0]).toMatchObject({
    name: "Imported AOS (imported)",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-emax-eco-ii-2207-1900kv",
    },
  });
});

test("saved hardware builds expose their documented board target", async () => {
  const hardwareBuild = {
    ...offlineBuild,
    id: "hardware-build",
    name: "Hardware build",
    componentIds: {
      ...offlineBuild.componentIds,
      flightControllerId: "fc-holybro-kakute-f7",
      receiverId: "rx-elrs-24g",
    },
  };
  localStorage.setItem("offlineBuilds", JSON.stringify([hardwareBuild]));

  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText("KAKUTEF7 · documented"))
    .toBeInTheDocument();
});

test("saved T1 builds expose incomplete servo output coverage", async () => {
  const t1Build = {
    ...offlineBuild,
    id: "t1-saved-coverage",
    name: "T1 saved coverage",
    componentIds: {
      frameId: "frame-heewing-t1-ranger",
      motorId: "motor-heewing-fx1406-3150kv",
      propellerId: "prop-heewing-fx3830-2",
      batteryId: "battery-cnhl-black-4s-1500-100c",
      escId: "esc-heewing-fx20a-bls-twin",
      flightControllerId: "fc-matek-f405-wmn",
      receiverId: "rx-radiomaster-rp4td-m",
    },
  };
  localStorage.setItem("offlineBuilds", JSON.stringify([t1Build]));
  localStorage.setItem(
    "rotorbench:hardware-plan:t1-saved-coverage:fc",
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
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText("2/3 outputs mapped")).toBeInTheDocument();
  expect(screen.getByText("+6 g over 500 g envelope")).toBeInTheDocument();
});

test("saved H743 builds expose ArduPilot receiver parameters", async () => {
  const h743Build = {
    ...offlineBuild,
    id: "h743-saved-params",
    name: "H743 saved parameters",
    componentIds: {
      frameId: "frame-heewing-t1-ranger",
      motorId: "motor-heewing-fx1406-3150kv",
      propellerId: "prop-heewing-fx3830-2",
      batteryId: "battery-cnhl-black-4s-1500-100c",
      escId: "esc-heewing-fx20a-bls-twin",
      flightControllerId: "fc-matek-h743-wing-v3",
      receiverId: "rx-radiomaster-rp4td-m",
    },
  };
  localStorage.setItem("offlineBuilds", JSON.stringify([h743Build]));
  localStorage.setItem(
    "rotorbench:hardware-plan:h743-saved-params:fc",
    JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "fc-matek-h743-wing-v3",
      selectedReceiverId: "rx-radiomaster-rp4td-m",
      firmwareFamily: "ardupilot",
      profileId: "matek-h743-wing-v3-ardupilot",
      receiverProtocol: "crsf",
      receiverUart: "UART6",
    }),
  );

  const { container } = render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText("H743 saved parameters")).toBeInTheDocument();
  expect(screen.getByText("BRD_ALT_CONFIG=1 · SERIAL7_PROTOCOL=23"))
    .toHaveAttribute(
      "title",
      "Documented receiver parameters; no controller writes performed",
    );
  expect(await getA11yViolations(container)).toEqual([]);
});

test("malformed offline build storage recovers to an empty state", async () => {
  localStorage.setItem("offlineBuilds", "{");
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText("No saved builds yet")).toBeInTheDocument();
  expect(localStorage.getItem("offlineBuilds")).toBeNull();
});

test("saved builds show explicitly attached imported evidence", async () => {
  const evidenceScope = createBenchEvidenceScope({
    build: offlineBuild,
    flightControllerPlan: { planVersion: 3 },
  });
  localStorage.setItem(
    "rotorbench:bench-evidence:offline-build:v1",
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
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Imported evidence correlated")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Filter saved builds by status"), {
    target: { value: "evidence" },
  });
  expect(screen.getByRole("heading", { name: "Offline build" })).toBeInTheDocument();
});

test("status filters isolate hardware-plan review from clear plans", async () => {
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Offline build" });
  const filter = screen.getByLabelText("Filter saved builds by status");

  fireEvent.change(filter, { target: { value: "hardware-review" } });
  expect(screen.getByRole("heading", { name: "Offline build" })).toBeInTheDocument();

  fireEvent.change(filter, { target: { value: "hardware-clear" } });
  expect(screen.getByText("No matching builds")).toBeInTheDocument();

  fireEvent.change(filter, { target: { value: "all" } });
  expect(screen.getByRole("heading", { name: "Offline build" })).toBeInTheDocument();
});

test("saved builds can be sorted by planning totals and isolated by envelope", async () => {
  const lightBuild = {
    ...offlineBuild,
    id: "light-build",
    name: "Light build",
    updatedAt: "2026-02-01T00:00:00.000Z",
  };
  const heavyBuild = {
    ...offlineBuild,
    id: "heavy-build",
    name: "Heavy build",
    updatedAt: "2026-03-01T00:00:00.000Z",
    componentIds: {
      frameId: "frame-heewing-t1-ranger",
      motorId: "motor-heewing-fx1406-3150kv",
      propellerId: "prop-heewing-fx3830-2",
      batteryId: "battery-cnhl-black-4s-1500-100c",
      escId: "esc-heewing-fx20a-bls-twin",
      flightControllerId: "fc-matek-f405-wmn",
      receiverId: "rx-radiomaster-rp4td-m",
    },
  };
  localStorage.setItem(
    "offlineBuilds",
    JSON.stringify([heavyBuild, lightBuild]),
  );
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  await screen.findByRole("heading", { name: "Heavy build" });
  const sort = screen.getByLabelText("Sort saved builds");
  fireEvent.change(sort, { target: { value: "weight-low" } });
  let headings = screen.getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
  expect(headings.indexOf("Light build")).toBeLessThan(
    headings.indexOf("Heavy build"),
  );

  fireEvent.change(sort, { target: { value: "price-high" } });
  headings = screen.getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
  expect(headings.indexOf("Heavy build")).toBeLessThan(
    headings.indexOf("Light build"),
  );

  fireEvent.change(screen.getByLabelText("Filter saved builds by status"), {
    target: { value: "envelope-review" },
  });
  expect(screen.getByRole("heading", { name: "Heavy build" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Light build" }))
    .not.toBeInTheDocument();
});

test("saved builds copy sanitized portable share links", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(
    <MemoryRouter>
      <SavedConfigsPage />
    </MemoryRouter>,
  );

  await screen.findByRole("heading", { name: "Offline build" });
  fireEvent.click(screen.getByRole("button", { name: "Share link" }));
  await screen.findByText(/Share link copied for "Offline build"/i);

  const link = writeText.mock.calls[0][0];
  expect(link).toContain("/build?share=");
  expect(decodeURIComponent(link)).not.toContain(
    "Inspect the motor direction map before assembly.",
  );
  expect(screen.getByText(/Notes and hardware plan state were excluded/i))
    .toBeInTheDocument();
});
