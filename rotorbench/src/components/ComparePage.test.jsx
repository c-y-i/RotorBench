import { vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ComparePage from "./ComparePage";
import { getA11yViolations } from "../test/a11y";
import { createBuildShareToken } from "../utils/buildLink";

const build = {
  id: "build-compare",
  name: "Compare build",
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

beforeEach(() => {
  localStorage.clear();
});

test("comparison surfaces fit, evidence, and hardware-plan state", async () => {
  const { container } = render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/compare",
          state: {
            builds: [
              { ...build, id: "build-left", name: "Left build" },
              { ...build, id: "build-right", name: "Right build" },
            ],
          },
        },
      ]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Compare builds" })).toBeInTheDocument();
  expect(screen.getByText("Physical fit")).toBeInTheDocument();
  expect(screen.getByText("Electrical limits")).toBeInTheDocument();
  expect(screen.getByText("Source-backed parts")).toBeInTheDocument();
  expect(screen.getByText("Catalog model coverage")).toBeInTheDocument();
  expect(within(screen.getByRole("rowheader", {
    name: "Catalog model coverage",
  }).closest("tr")).getAllByText("7/7")).toHaveLength(2);
  expect(screen.getByText("Legacy-normalized GLBs")).toBeInTheDocument();
  expect(within(screen.getByRole("rowheader", {
    name: "Legacy-normalized GLBs",
  }).closest("tr")).getAllByText("7")).toHaveLength(2);
  expect(screen.getByText("Hardware plan")).toBeInTheDocument();
  expect(screen.getAllByText("Fit needs review").length).toBeGreaterThan(1);
  expect(screen.getAllByText("Electrical limits verified").length).toBeGreaterThan(1);
  expect(screen.getAllByText("Plan not saved").length).toBeGreaterThan(1);
  expect(screen.getByText("No catalog differences")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Changed only" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Export comparison" })).toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("comparison surfaces published takeoff-envelope fit", async () => {
  const t1Build = {
    ...build,
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
  const { container } = render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/compare",
          state: {
            builds: [
              { ...t1Build, id: "t1-left", name: "T1 left" },
              { ...t1Build, id: "t1-right", name: "T1 right" },
            ],
          },
        },
      ]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getByRole("rowheader", { name: "Takeoff envelope fit" }))
    .toBeInTheDocument();
  expect(screen.getAllByText("+6 g over 500 g envelope")).toHaveLength(2);
  expect(screen.getAllByText(
    /506 g planning estimate · 6 g over the 500 g published maximum/i,
  )).toHaveLength(2);
  expect(await getA11yViolations(container)).toEqual([]);
});

test("comparison surfaces ArduPilot receiver parameters", async () => {
  const h743Build = {
    ...build,
    id: "h743-compare-ui",
    name: "H743 compare",
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
  for (const id of ["h743-left", "h743-right"]) {
    localStorage.setItem(
      `rotorbench:hardware-plan:${id}:fc`,
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
  }
  const { container } = render(
    <MemoryRouter
      initialEntries={[{
        pathname: "/compare",
        state: {
          builds: [
            { ...h743Build, id: "h743-left", name: "H743 left" },
            { ...h743Build, id: "h743-right", name: "H743 right" },
          ],
        },
      }]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getByRole("rowheader", {
    name: "ArduPilot receiver parameters",
  })).toBeInTheDocument();
  expect(screen.getAllByText("BRD_ALT_CONFIG=1 · SERIAL7_PROTOCOL=23"))
    .toHaveLength(2);
  expect(await getA11yViolations(container)).toEqual([]);
});

test("marks changed rows and can show only differences", () => {
  const changed = {
    ...build,
    id: "build-changed",
    name: "Changed build",
    componentIds: {
      ...build.componentIds,
      motorId: "motor-1804-2800kv",
    },
  };
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/compare",
          state: { builds: [build, changed] },
        },
      ]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getByText(/\d+ differences/)).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Motors Changed" })).toBeInTheDocument();
  expect(screen.getAllByText("KAKUTEF7 · documented").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: "Changed only" }));
  expect(screen.getByRole("button", { name: "Show all" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByRole("rowheader", { name: "Frame" })).not.toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Motors Changed" })).toBeInTheDocument();
});

test("saved hardware plans show their local review count", () => {
  const plannedBuild = {
    ...build,
    id: "build-planned",
    name: "Planned build",
  };
  const base = `rotorbench:hardware-plan:${plannedBuild.id}`;
  localStorage.setItem(`${base}:fc`, JSON.stringify({
    planVersion: 3,
    selectedFlightControllerId: build.componentIds.flightControllerId,
    selectedReceiverId: build.componentIds.receiverId,
    firmwareFamily: "betaflight",
    profileId: "custom-board",
    armChannel: 5,
    modeChannel: null,
    beeperChannel: 9,
    velocityChannel: null,
    receiverProtocol: "crsf",
    receiverUart: "UART1",
    receiverBaud: 420000,
  }));
  localStorage.setItem(`${base}:radio`, JSON.stringify({
    planVersion: 3,
    selectedReceiverId: build.componentIds.receiverId,
    channelMap: {
      arm: 5,
      flightMode: null,
      beeper: 9,
    },
  }));

  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/compare",
          state: { builds: [plannedBuild, { ...build, id: "build-other", name: "Other build" }] },
        },
      ]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getAllByText(/\d+ checks? open/i).length).toBeGreaterThan(1);
  expect(screen.getByText("Kakute F7 AIO · custom mapping")).toBeInTheDocument();
  expect(screen.getByText("KAKUTEF7 · documented")).toBeInTheDocument();
});

test("comparison keeps unavailable thrust data visible", () => {
  const unavailable = {
    ...build,
    id: "build-cine25",
    name: "Cine25 build",
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
  };
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/compare",
          state: {
            builds: [
              { ...build, id: "build-estimated", name: "Estimated build" },
              unavailable,
            ],
          },
        },
      ]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getByText("Estimated thrust data")).toBeInTheDocument();
  expect(screen.getByText("Thrust data unavailable")).toBeInTheDocument();
  expect(screen.getByRole("rowheader", {
    name: "Propeller thrust data Changed",
  })).toBeInTheDocument();
});

test("loads a two-build comparison from portable tokens", () => {
  const changed = {
    ...build,
    componentIds: {
      ...build.componentIds,
      motorId: "motor-1804-2800kv",
    },
  };
  const left = createBuildShareToken(build);
  const right = createBuildShareToken(changed);
  render(
    <MemoryRouter
      initialEntries={[{
        pathname: "/compare",
        search: `?left=${left}&right=${right}`,
      }]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Shared build A" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Shared build B" })).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Motors Changed" })).toBeInTheDocument();
});

test("copies a comparison link and reports malformed shared links", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const { unmount } = render(
    <MemoryRouter
      initialEntries={[{
        pathname: "/compare",
        state: {
          builds: [
            { ...build, id: "left-share", name: "Left share" },
            { ...build, id: "right-share", name: "Right share" },
          ],
        },
      }]}
    >
      <ComparePage />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Share comparison" }));
  await screen.findByText(/Comparison link copied/i);
  const url = new URL(writeText.mock.calls[0][0]);
  expect(url.pathname).toBe("/compare");
  expect(url.searchParams.get("left")).toBeTruthy();
  expect(url.searchParams.get("right")).toBeTruthy();

  unmount();
  render(
    <MemoryRouter
      initialEntries={[{
        pathname: "/compare",
        search: "?left=not*valid&right=not*valid",
      }]}
    >
      <ComparePage />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Could not load shared comparison/i)).toBeInTheDocument();
});
