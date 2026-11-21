import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AssemblyStackMap from "./AssemblyStackMap";
import { getA11yViolations } from "../test/a11y";

const frame = {
  id: "frame-test",
  name: "Test frame",
  dimensionsMm: [120, 20, 120],
  stackHeight: 20,
  sourceUrl: "https://example.com/frame",
  estimatedFields: ["stackHeight"],
};
const esc = {
  id: "esc-test",
  name: "Test ESC",
  dimensionsMm: [35, 6, 35],
  sourceUrl: "https://example.com/esc",
};
const flightController = {
  id: "fc-test",
  name: "Test FC",
  dimensionsMm: [30, 7, 30],
  sourceUrl: "https://example.com/fc",
};
const receiver = {
  id: "rx-test",
  name: "Test RX",
  dimensionsMm: [20, 5, 15],
  sourceUrl: "https://example.com/rx",
};
const battery = {
  id: "battery-test",
  name: "Test battery",
  dimensionsMm: [70, 30, 35],
  sourceUrl: "https://example.com/battery",
};
const motor = {
  id: "motor-test",
  name: "Test motor",
  dimensionsMm: [20, 20, 20],
  sourceUrl: "https://example.com/motor",
};
const propeller = {
  id: "propeller-test",
  name: "Test propeller",
  dimensionsMm: [64, 5, 64],
  sourceUrl: "https://example.com/propeller",
};

test("renders the full propulsion, electronics, and battery height order", () => {
  render(
    <AssemblyStackMap
      frame={frame}
      esc={esc}
      flightController={flightController}
      receiver={receiver}
      battery={battery}
      motor={motor}
      propeller={propeller}
    />,
  );

  expect(screen.getByText("Assembly profile")).toBeInTheDocument();
  expect(screen.getByText("7 component levels")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem").map((item) => item.textContent))
    .toEqual(expect.arrayContaining([
      expect.stringContaining("Propellers ×4"),
      expect.stringContaining("Motors ×4"),
      expect.stringContaining("Battery"),
      expect.stringContaining("Receiver"),
      expect.stringContaining("Flight controller"),
      expect.stringContaining("ESC"),
      expect.stringContaining("Frame"),
    ]));
  expect(screen.getByText(/frame stack height is estimated/i)).toBeInTheDocument();
  expect(screen.getAllByText("Generated fallback")).toHaveLength(7);
});

test("has no structural WCAG A or AA violations", async () => {
  const { container } = render(
    <AssemblyStackMap
      frame={frame}
      esc={esc}
      flightController={flightController}
      receiver={receiver}
      battery={battery}
      motor={motor}
      propeller={propeller}
      onToggleComponent={jest.fn()}
    />,
  );

  expect(await getA11yViolations(container)).toEqual([]);
});

test("marks measured dimensions and does not render without a frame", () => {
  const { container, rerender } = render(
    <AssemblyStackMap
      frame={frame}
      esc={{ ...esc, measuredFields: ["dimensionsMm"] }}
    />,
  );
  expect(screen.getByText("Measured")).toBeInTheDocument();

  rerender(<AssemblyStackMap frame={null} esc={esc} />);
  expect(container).toBeEmptyDOMElement();
});

test("labels a published footprint when only the board planform is known", () => {
  render(
    <AssemblyStackMap
      frame={frame}
      flightController={{
        id: "fc-footprint",
        name: "Footprint FC",
        planformMm: [34, 27],
        sourceUrl: "https://example.com/footprint-fc",
      }}
    />,
  );

  expect(screen.getByText("Footprint only")).toBeInTheDocument();
  expect(screen.getByText("23.0–31.0 mm")).toBeInTheDocument();
});

test("toggles component visibility through the 3D layer controls", () => {
  const onToggleComponent = jest.fn();
  render(
    <AssemblyStackMap
      frame={frame}
      motor={motor}
      propeller={propeller}
      battery={battery}
      clearedComponents={["motor"]}
      onToggleComponent={onToggleComponent}
    />,
  );

  fireEvent.click(screen.getByRole("button", {
    name: "Show Motors ×4 in 3D",
  }));
  expect(onToggleComponent).toHaveBeenCalledWith("motor");
  expect(screen.getByRole("button", {
    name: "Hide Battery in 3D",
  })).toHaveAttribute("aria-pressed", "true");
});
