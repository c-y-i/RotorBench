import { fireEvent, render, screen, within } from "@testing-library/react";
import PartPicker from "./PartPicker";

const parts = [
  {
    id: "frame-a",
    name: "Frame A",
    size: 220,
    weight: 95,
    maxPropSize: 5,
    price: 55,
    sourceUrl: "https://example.com/frame-a",
    modelStatus: "available",
  },
  {
    id: "frame-b",
    name: "Frame B",
    size: 230,
    weight: 110,
    maxPropSize: 4,
    price: 20,
    modelStatus: "not_available",
    estimatedFields: ["motor positions"],
  },
];

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
});

test("filters catalog results by compatibility and model availability", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => ({ ok: part.id === "frame-a", reason: "Wrong prop size" })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const results = screen.getByRole("listbox", { name: "Frame options" });
  expect(within(results).getAllByRole("option")).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: "No known conflict" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "3D ready" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();
});

test("verified physical checks are distinct from missing fit data", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => part.id === "frame-a"
        ? { ok: true, verified: true, reason: "Stack pattern matches." }
        : { ok: true, verified: false, reason: "Stack pattern is not catalogued." }}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  expect(screen.getByText("Compatible and physically checked")).toBeInTheDocument();
  expect(screen.getByText("Stack pattern is not catalogued.")).toBeInTheDocument();
});

test("recently selected parts are available through an explicit filter", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const results = () => screen.getByRole("listbox", { name: "Frame options" });
  fireEvent.click(within(results()).getByRole("option", { name: /Frame A/ }));
  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.click(screen.getByRole("button", { name: "Recent" }));

  expect(within(results()).getAllByRole("option")).toHaveLength(1);
  expect(screen.getByText(/Recent · Source-backed/)).toBeInTheDocument();
});

test("verified-fit and conflict filters keep evidence states separate", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => part.id === "frame-a"
        ? { ok: true, verified: true, reason: "Stack pattern matches." }
        : { ok: false, verified: false, reason: "Propeller clearance conflict." }}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const results = screen.getByRole("listbox", { name: "Frame options" });
  fireEvent.click(screen.getByRole("button", { name: "Verified fit" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Review conflicts" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame B")).toBeInTheDocument();
});

test("source-backed filtering excludes legacy catalog entries", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.click(screen.getByRole("button", { name: "Source-backed" }));
  const results = screen.getByRole("listbox", { name: "Frame options" });
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();
  expect(within(results).queryByText("Frame B")).not.toBeInTheDocument();
});

test("propeller options expose missing thrust data before selection", () => {
  render(
    <PartPicker
      category="propellers"
      parts={[
        {
          id: "prop-no-curve",
          name: "7-inch test prop",
          size: 7,
          pitch: 4,
          bladeCount: 3,
          weight: 7.9,
          price: 7.99,
          performanceDataStatus: "not_published",
          sourceUrl: "https://example.com/prop",
        },
      ]}
      value=""
      onChange={jest.fn()}
      placeholder="Choose a propeller"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a propeller/i }));
  expect(screen.getByText(/Thrust data unavailable/)).toBeInTheDocument();
});

test("catalog options can be sorted by price without hiding conflicts", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => part.id === "frame-a"
        ? { ok: true, verified: true, reason: "Stack pattern matches." }
        : { ok: false, verified: false, reason: "Propeller clearance conflict." }}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.change(screen.getByLabelText("Sort catalog results"), {
    target: { value: "price" },
  });
  const options = within(screen.getByRole("listbox", { name: "Frame options" }))
    .getAllByRole("option");
  expect(options[0]).toHaveTextContent("Frame B");
  expect(options[1]).toHaveTextContent("Frame A");
});

test("keyboard arrows move through catalog options without tabbing through each one", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const search = screen.getByLabelText("Search frames");
  const listbox = screen.getByRole("listbox", { name: "Frame options" });
  const options = within(listbox).getAllByRole("option");

  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(options[0]).toHaveFocus();
  fireEvent.keyDown(options[0], { key: "ArrowDown" });
  expect(options[1]).toHaveFocus();
  fireEvent.keyDown(options[1], { key: "Home" });
  expect(options[0]).toHaveFocus();
});
