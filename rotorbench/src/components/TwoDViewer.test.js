import { render, screen } from "@testing-library/react";
import TwoDViewer from "./TwoDViewer";
import { getA11yViolations } from "../test/a11y";

test("renders the sample top view with four motors and three-blade propellers", async () => {
  const { container } = render(<TwoDViewer />);

  expect(screen.getByRole("img", {
    name: /Top view of sample assembly.*4 motors.*3-blade propellers.*props-out/i,
  })).toBeInTheDocument();
  expect(screen.getAllByText(/^M[1-4]/)).toHaveLength(4);
  await expect(getA11yViolations(container)).resolves.toEqual([]);
});

test("uses selected frame mounts and respects hidden component groups", () => {
  const assemblySpec = {
    frame: {
      id: "frame-wing",
      name: "Twin wing",
      motorCount: 2,
      dimensionsMm: [730, 140, 645],
      motorPositionsMm: [[-230, 4.75, -240], [230, 4.75, -240]],
    },
    motor: {
      id: "motor-wing",
      name: "Wing motor",
      size: "1406",
    },
    propeller: {
      id: "prop-wing",
      name: "Wing propeller",
      size: 3.83,
      bladeCount: 2,
    },
    battery: {
      id: "battery-wing",
      name: "Wing pack",
      dimensionsMm: [75, 32, 36],
    },
  };
  const { rerender } = render(
    <TwoDViewer assemblySpec={assemblySpec} propellerDirection="props-in" />,
  );

  expect(screen.getByRole("img", {
    name: /Top view of selected assembly.*2 motors.*2-blade propellers.*props-in/i,
  })).toBeInTheDocument();
  expect(screen.getByText("M1 CW")).toBeInTheDocument();
  expect(screen.getByText("M2 CCW")).toBeInTheDocument();

  rerender(
    <TwoDViewer
      assemblySpec={assemblySpec}
      propellerDirection="props-in"
      clearedComponents={["propeller", "motor"]}
    />,
  );
  expect(screen.queryByText("M1 CW")).not.toBeInTheDocument();
  expect(screen.getByRole("img", {
    name: /no propellers visible.*props-in/i,
  })).toBeInTheDocument();
});
