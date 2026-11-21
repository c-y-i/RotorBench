import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import HomePage from "./HomePage";
import { getA11yViolations } from "../test/a11y";

jest.mock("./BabylonViewer", () => () => <div data-testid="home-assembly-viewer" />);
jest.mock("./TwoDViewer", () => () => <div data-testid="home-two-d-viewer" />);

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-path">{`${location.pathname}${location.search}`}</output>;
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <BuildProvider>
        <HomePage />
        <LocationProbe />
      </BuildProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => new Promise(() => {}));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("offers all complete source-backed platforms from an empty overview", async () => {
  const { container } = renderHome();

  expect(await screen.findByTestId("home-assembly-viewer")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Start with a complete platform" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 3.5-inch source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5-inch Source One V5 source build" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch diversity source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 3.5-inch 4600KV source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch XING2 6S build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch XING2 4S build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 7-inch long-range source build" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 2.5-inch AOS Cine25 source build" }))
    .toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "Open 3.5-inch source build" }))
    .getByText("Estimated thrust data")).toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "Open 3.5-inch source build" }))
    .getByText("Fit verified")).toBeInTheDocument();
  expect(within(screen.getByRole("button", {
    name: "Open 7-inch long-range source build",
  })).getByText("Thrust data unavailable")).toBeInTheDocument();
  expect(within(screen.getByRole("button", {
    name: "Open 2.5-inch AOS Cine25 source build",
  })).getByText("Thrust data unavailable")).toBeInTheDocument();
  expect(within(screen.getByRole("button", {
    name: "Open 5-inch Source One V5 source build",
  })).getByText("Thrust data unavailable")).toBeInTheDocument();
  expect(within(screen.getByRole("button", {
    name: "Open 5-inch Source One V5 source build",
  })).getByText("Fit review")).toBeInTheDocument();
  expect(screen.getByText("Sample assembly")).toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("starter platform actions open a preassembled build draft", async () => {
  renderHome();

  await screen.findByTestId("home-assembly-viewer");
  fireEvent.click(screen.getByRole("button", { name: "Open 3.5-inch source build" }));

  expect(screen.getByTestId("location-path")).toHaveTextContent(
    "/build?preset=source-35",
  );
});

test("starter platforms filter by frame size while preserving direct launch actions", async () => {
  const { container } = renderHome();
  await screen.findByTestId("home-assembly-viewer");

  const filters = screen.getByRole("group", {
    name: "Filter starter platforms by frame size",
  });
  expect(within(filters).getAllByRole("button")).toHaveLength(6);
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(13);

  const fiveInch = within(filters).getByRole("button", {
    name: /^5-inch builds\s*5$/,
  });
  fireEvent.click(fiveInch);
  expect(fiveInch).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(5);
  expect(screen.getByRole("button", {
    name: "Open 5-inch Volador II VX5 51499 build",
  })).toBeInTheDocument();
  expect(screen.queryByRole("button", {
    name: "Open 7-inch long-range source build",
  })).not.toBeInTheDocument();

  fireEvent.click(within(filters).getByRole("button", {
    name: /^2.5-inch builds\s*1$/,
  }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(1);
  expect(screen.getByRole("button", {
    name: "Open 2.5-inch AOS Cine25 source build",
  })).toBeInTheDocument();

  fireEvent.click(within(filters).getByRole("button", {
    name: /^All builds\s*13$/,
  }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(13);

  const evidenceFilters = screen.getByRole("group", {
    name: "Filter starter platforms by fit evidence",
  });
  const verifiedOnly = within(evidenceFilters).getByRole("button", {
    name: /^Verified only\s*9$/,
  });
  fireEvent.click(verifiedOnly);
  expect(verifiedOnly).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(9);

  fireEvent.click(within(filters).getByRole("button", {
    name: /^5-inch builds\s*5$/,
  }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(1);
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS 5 V5 source build",
  })).toBeInTheDocument();
  expect(screen.queryByRole("button", {
    name: "Open 5-inch Volador II VX5 51499 build",
  })).not.toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("new build actions request a fresh draft even when one is saved", async () => {
  renderHome();
  await screen.findByTestId("home-assembly-viewer");

  fireEvent.click(screen.getByRole("button", { name: "New build" }));
  expect(screen.getByTestId("location-path")).toHaveTextContent("/build?new=1");
});
