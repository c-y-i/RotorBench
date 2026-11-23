import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import AssemblyInterfaceMap, {
  getAssemblyInterfaces,
} from "./AssemblyInterfaceMap";
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
  battery: getPart("batteries", "battery-tattu-rline-4s-850-95c"),
};

test("maps real source-backed mounting and power interfaces", () => {
  const rows = getAssemblyInterfaces(sourceParts);

  expect(rows).toHaveLength(5);
  expect(rows.map((row) => row.id)).toEqual([
    "frame-motor",
    "motor-propeller",
    "frame-fc",
    "frame-esc",
    "battery-esc",
  ]);
  expect(rows.every((row) => row.status === "compatible")).toBe(true);
  expect(rows[0]).toMatchObject({
    fromValue: "9 × 9 mm / 12 × 12 mm",
    toValue: "9 × 9 mm",
  });
  expect(rows[1]).toMatchObject({
    fromValue: "1.5 mm shaft",
    toValue: "1.5 mm bore",
  });
});

test("shows the interface chain and conflict count", () => {
  render(
    <AssemblyInterfaceMap
      {...sourceParts}
      battery={{ ...sourceParts.battery, dischargeConnector: "XT60" }}
    />,
  );

  expect(screen.getByText("Mounting interfaces")).toBeInTheDocument();
  expect(screen.getByText("1 conflict")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Mounting interfaces"));

  const list = screen.getByRole("list", { name: "Assembly mounting interfaces" });
  expect(within(list).getByRole("listitem", { name: "Frame to motor" }))
    .toHaveTextContent("9 × 9 mm");
  expect(within(list).getByRole("listitem", { name: "Shaft to propeller" }))
    .toHaveTextContent("1.5 mm shaft");
  expect(within(list).getByRole("listitem", { name: "Battery to ESC" }))
    .toHaveTextContent("XT60");
  expect(within(list).getByRole("listitem", { name: "Battery to ESC" }))
    .toHaveTextContent("XT30");
  expect(within(list).getByRole("listitem", { name: "Battery to ESC" }))
    .toHaveTextContent("Add the required adapter or replace the lead");
  expect(screen.getByText(/not a physical inspection/i)).toBeInTheDocument();
});

test("has no structural WCAG A or AA violations", async () => {
  const { container } = render(<AssemblyInterfaceMap {...sourceParts} />);

  fireEvent.click(screen.getByText("Mounting interfaces"));
  expect(await getA11yViolations(container)).toEqual([]);
});

test("keeps missing interface metadata in a verify state", () => {
  render(
    <AssemblyInterfaceMap
      frame={{ id: "frame-partial", name: "Partial frame" }}
      motor={{ id: "motor-partial", name: "Partial motor" }}
    />,
  );

  expect(screen.getByText("0 matched · 1 to verify")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Mounting interfaces"));
  expect(screen.getByRole("listitem", { name: "Frame to motor" }))
    .toHaveTextContent("Needs data");
});

test("renders no map until at least one interface has both endpoints", () => {
  const { container } = render(<AssemblyInterfaceMap frame={sourceParts.frame} />);

  expect(container).toBeEmptyDOMElement();
});
