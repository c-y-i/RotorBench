import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BuildProvider } from "../context/BuildContext";
import HomePage from "./HomePage";

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
  renderHome();

  expect(await screen.findByTestId("home-assembly-viewer")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Start with a complete platform" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 3.5-inch source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch diversity source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 3.5-inch 4600KV source build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch XING2 6S build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open 5.5-inch XING2 4S build" })).toBeInTheDocument();
  expect(screen.getByText("Sample assembly")).toBeInTheDocument();
});

test("starter platform actions open a preassembled build draft", async () => {
  renderHome();

  await screen.findByTestId("home-assembly-viewer");
  fireEvent.click(screen.getByRole("button", { name: "Open 3.5-inch source build" }));

  expect(screen.getByTestId("location-path")).toHaveTextContent(
    "/build?preset=source-35",
  );
});

test("new build actions request a fresh draft even when one is saved", async () => {
  renderHome();
  await screen.findByTestId("home-assembly-viewer");

  fireEvent.click(screen.getByRole("button", { name: "New build" }));
  expect(screen.getByTestId("location-path")).toHaveTextContent("/build?new=1");
});
