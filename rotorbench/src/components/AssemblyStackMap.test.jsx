import React from "react";
import { render, screen } from "@testing-library/react";
import AssemblyStackMap from "./AssemblyStackMap";

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

test("renders the same vertical order used by the 3D assembly", () => {
  render(
    <AssemblyStackMap
      frame={frame}
      esc={esc}
      flightController={flightController}
      receiver={receiver}
      battery={battery}
    />,
  );

  expect(screen.getByText("Stack profile")).toBeInTheDocument();
  expect(screen.getByText("3 stack layers · battery above")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem").map((item) => item.textContent))
    .toEqual(expect.arrayContaining([
      expect.stringContaining("Battery"),
      expect.stringContaining("Receiver"),
      expect.stringContaining("Flight controller"),
      expect.stringContaining("ESC"),
      expect.stringContaining("Frame"),
    ]));
  expect(screen.getByText(/frame stack height is estimated/i)).toBeInTheDocument();
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
