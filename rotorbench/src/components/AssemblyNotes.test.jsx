import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import AssemblyNotes, { getAssemblyNotes } from "./AssemblyNotes";
import componentsData from "../data/components.json";
import { getA11yViolations } from "../test/a11y";

function getPart(category, id) {
  return componentsData[category].find((part) => part.id === id);
}

const sourceParts = {
  frame: getPart("frames", "frame-aos-35-v51"),
  motor: getPart("motors", "motor-tmotor-f1404-3800kv"),
  propeller: getPart("propellers", "prop-gemfan-hurricane-3520-3"),
  esc: getPart("escs", "esc-speedybee-bls-35a-mini-v2"),
  flightController: getPart("flight_controllers", "fc-speedybee-f405-mini"),
  receiver: getPart("receivers", "rx-radiomaster-rp3-h"),
  battery: getPart("batteries", "battery-tattu-rline-4s-850-95c"),
};

test("derives assembly anchors and source states from real catalog parts", () => {
  const notes = getAssemblyNotes(sourceParts);

  expect(notes.map((note) => note.label)).toEqual([
    "Frame",
    "Motors",
    "Propellers",
    "ESC",
    "Flight controller",
    "Receiver",
    "Battery",
  ]);
  expect(notes.every((note) => note.sourceUrl.startsWith("https://"))).toBe(true);
  expect(notes.every((note) => note.sourceState.label === "Source + estimate"))
    .toBe(true);
  expect(notes.find((note) => note.label === "Motors").facts).toEqual([
    "Mount 9 × 9 mm",
    "1.5 mm shaft",
    "3800 KV",
  ]);
  expect(notes.find((note) => note.label === "Battery").facts).toContain(
    "Connector XT30",
  );
});

test("renders source links, model provenance, and the planning boundary", () => {
  render(<AssemblyNotes {...sourceParts} />);

  expect(screen.getByText("Source-backed assembly notes")).toBeInTheDocument();
  expect(screen.getByText("7 generated fallbacks")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Source-backed assembly notes"));

  const list = screen.getByRole("list", {
    name: "Source-backed assembly notes",
  });
  const motorNote = within(list).getByRole("listitem", {
    name: "Motors assembly note",
  });
  expect(motorNote).toHaveTextContent(
    "Each base-centre anchor is seated on a frame motor mount.",
  );
  expect(motorNote).toHaveTextContent("Source + estimate");
  expect(motorNote).toHaveTextContent("Generated fallback");
  expect(within(motorNote).getByRole("link", {
    name: "Open product source for Motors",
  })).toHaveAttribute("href", sourceParts.motor.sourceUrl);
  expect(screen.getByText(/not a wiring, physical-fit, or hardware check/i))
    .toBeInTheDocument();
});

test("keeps local measurements and catalog-only rows distinct", () => {
  const notes = getAssemblyNotes({
    motor: {
      id: "motor-measured",
      name: "Measured motor",
      measuredFields: ["mountingPoint", "propShaftMm"],
      estimatedFields: ["mounting_point"],
      sourceUrl: "https://example.com/motor",
    },
    receiver: {
      id: "receiver-catalog",
      name: "Catalog receiver",
    },
  });

  expect(notes[0].sourceState).toEqual({
    label: "Measured locally",
    tone: "measured",
  });
  expect(notes[1].sourceState).toEqual({
    label: "Catalog only",
    tone: "unverified",
  });
});

test("shows a published board footprint when full thickness is not catalogued", () => {
  const notes = getAssemblyNotes({
    esc: getPart("escs", "esc-holybro-tekko32-f4-65a"),
  });

  expect(notes[0].facts).toContain("43 × 44 mm footprint");
  expect(notes[0].sourceState.label).toBe("Footprint + estimate");
});

test("has no structural WCAG A or AA violations", async () => {
  const { container } = render(<AssemblyNotes {...sourceParts} />);

  fireEvent.click(screen.getByText("Source-backed assembly notes"));
  expect(await getA11yViolations(container)).toEqual([]);
});

test("renders nothing without a selected part", () => {
  const { container } = render(<AssemblyNotes />);

  expect(container).toBeEmptyDOMElement();
});
