import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import HomePage from "./HomePage";
import { getA11yViolations } from "../test/a11y";
import { PLATFORM_PRESETS } from "../data/platformPresets";
import { summarizeBuild } from "../utils/buildComparison";

jest.mock("./BabylonViewer", () => () => <div data-testid="home-assembly-viewer" />);
jest.mock("./TwoDViewer", () => () => <div data-testid="home-two-d-viewer" />);

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-path">{`${location.pathname}${location.search}`}</output>;
}

function renderHome(initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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
  expect(screen.getByRole("button", { name: "Open 730mm HeeWing T1 Ranger wing" }))
    .toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "Open 3.5-inch source build" }))
    .getByText("Estimated thrust data")).toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "Open 3.5-inch source build" }))
    .getByText("Fit verified")).toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "Open 3.5-inch source build" }))
    .getByText("5 joints matched")).toBeInTheDocument();
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
  expect(within(screen.getByRole("button", {
    name: "Open 5-inch AOS 5 V5 source build",
  })).getByText("7 fallback meshes")).toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS 5 V5 source build",
  })).toHaveAccessibleDescription(
    /5 joints matched.*7 fallback meshes.*Planning weight \d+ g.*Catalog total \$\d+\.\d{2}/i,
  );
  expect(screen.getByText("Sample assembly")).toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
}, 10000);

test("exposes a mobile starter-gallery expansion without removing builds from data", async () => {
  renderHome();
  await screen.findByTestId("home-assembly-viewer");

  const showAll = screen.getByRole("button", {
    name: "Show all 19 builds",
  });
  expect(showAll).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(showAll);
  expect(screen.getByRole("button", { name: "Show fewer builds" }))
    .toHaveAttribute("aria-expanded", "true");

  const filters = screen.getByRole("group", {
    name: "Filter starter platforms by frame size",
  });
  fireEvent.click(within(filters).getByRole("button", {
    name: /^5-inch builds\s*9$/,
  }));
  expect(screen.getByRole("button", { name: "Show all 9 builds" }))
    .toHaveAttribute("aria-expanded", "false");
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(9);
});

test("defers the 3D runtime until the preview approaches the viewport", async () => {
  const originalIntersectionObserver = global.IntersectionObserver;
  let intersectionCallback;
  global.IntersectionObserver = jest.fn(function MockObserver(callback) {
    intersectionCallback = callback;
  });
  global.IntersectionObserver.prototype.observe = jest.fn();
  const disconnect = jest.fn();
  global.IntersectionObserver.prototype.disconnect = disconnect;

  try {
    renderHome();
    expect(screen.queryByTestId("home-assembly-viewer")).not.toBeInTheDocument();
    expect(screen.getByText(/loads when it reaches the viewport/i))
      .toBeInTheDocument();

    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });
    expect(await screen.findByTestId("home-assembly-viewer")).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "2D" }));
    expect(await screen.findByTestId("home-two-d-viewer")).toBeInTheDocument();
  } finally {
    global.IntersectionObserver = originalIntersectionObserver;
  }
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
  expect(within(filters).getByText(/swipe/i)).toBeInTheDocument();
  expect(within(filters).getAllByRole("button")).toHaveLength(7);
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(19);

  const fiveInch = within(filters).getByRole("button", {
    name: /^5-inch builds\s*9$/,
  });
  fireEvent.click(fiveInch);
  expect(fiveInch).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(9);
  expect(screen.getByRole("button", {
    name: "Open 5-inch Volador II VX5 51499 build",
  })).toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 source build",
  })).toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 900MHz build",
  })).toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 Xrossband build",
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
    name: /^All builds\s*19$/,
  }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(19);

  fireEvent.click(within(filters).getByRole("button", {
    name: /^730 mm wing\s*2$/,
  }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(2);
  expect(screen.getByRole("button", {
    name: "Open 730mm HeeWing T1 Ranger wing",
  })).toBeInTheDocument();

  fireEvent.click(within(filters).getByRole("button", {
    name: /^All builds\s*19$/,
  }));

  const evidenceFilters = screen.getByRole("group", {
    name: "Filter starter platforms by fit evidence",
  });
  const verifiedOnly = within(evidenceFilters).getByRole("button", {
    name: /^Verified only\s*13$/,
  });
  fireEvent.click(verifiedOnly);
  expect(verifiedOnly).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(13);

  fireEvent.click(within(filters).getByRole("button", {
    name: /^5-inch builds\s*9$/,
  }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(5);
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS 5 V5 source build",
  })).toBeInTheDocument();
  expect(screen.queryByRole("button", {
    name: "Open 5-inch Volador II VX5 51499 build",
  })).not.toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Open 5-inch Volador F405 V5 OX32 build",
  })).toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("starter platform search matches components and resets cleanly", async () => {
  const { container } = renderHome();
  await screen.findByTestId("home-assembly-viewer");
  const search = screen.getByLabelText("Search starter builds");

  fireEvent.change(search, { target: { value: "bandit" } });
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(1);
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 900MHz build",
  })).toBeInTheDocument();
  expect(screen.getByText("1 of 19 source builds")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Clear starter search" }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(19);

  fireEvent.change(search, { target: { value: "F722 900" } });
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(1);
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 900MHz build",
  })).toBeInTheDocument();

  fireEvent.change(search, { target: { value: "not-a-real-platform" } });
  expect(screen.getByText("No starter builds match")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset starter filters" }));
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(19);
  expect(await getA11yViolations(container)).toEqual([]);
});

test("starter filters survive through shareable URL state", async () => {
  renderHome(["/?q=F722&size=5&fit=verified&sort=price"]);
  await screen.findByTestId("home-assembly-viewer");

  expect(screen.getByLabelText("Search starter builds")).toHaveValue("F722");
  expect(screen.getByRole("button", { name: /^5-inch builds\s*9$/ }))
    .toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /^Verified only\s*13$/ }))
    .toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("Sort starter builds")).toHaveValue("price");
  expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(3);
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 900MHz build",
  })).toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Open 5-inch AOS F722 Xrossband build",
  })).toBeInTheDocument();
  expect(screen.getByTestId("location-path")).toHaveTextContent(
    "/?q=F722&size=5&fit=verified&sort=price",
  );
});

test("starter sorting by catalog price uses full-build totals", async () => {
  const expected = [...PLATFORM_PRESETS]
    .sort((left, right) => {
      const leftPrice = summarizeBuild({
        componentIds: left.componentIds,
      }).totalPrice;
      const rightPrice = summarizeBuild({
        componentIds: right.componentIds,
      }).totalPrice;
      return leftPrice - rightPrice || left.name.localeCompare(right.name);
    })[0];
  renderHome();
  await screen.findByTestId("home-assembly-viewer");

  fireEvent.change(screen.getByLabelText("Sort starter builds"), {
    target: { value: "price" },
  });

  expect(screen.getAllByRole("button", { name: /^Open / })[0])
    .toHaveAccessibleName(`Open ${expected.name}`);
  expect(screen.getByTestId("location-path")).toHaveTextContent(
    "/?sort=price",
  );
});

test("new build actions request a fresh draft even when one is saved", async () => {
  renderHome();
  await screen.findByTestId("home-assembly-viewer");

  fireEvent.click(screen.getByRole("button", { name: "New build" }));
  expect(screen.getByTestId("location-path")).toHaveTextContent("/build?new=1");
});
