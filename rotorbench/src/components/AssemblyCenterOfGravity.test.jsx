import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssemblyCenterOfGravity from "./AssemblyCenterOfGravity";
import { getA11yViolations } from "../test/a11y";

const parts = {
  frame: {
    id: "frame",
    name: "Test frame",
    weight: 100,
    dimensionsMm: [100, 10, 100],
    motorPositionsMm: [
      [-30, 5, -30],
      [30, 5, -30],
      [30, 5, 30],
      [-30, 5, 30],
    ],
  },
  motor: {
    id: "motor",
    name: "Test motor",
    weight: 10,
    dimensionsMm: [20, 20, 20],
  },
  propeller: {
    id: "prop",
    name: "Test prop",
    weight: 2,
    dimensionsMm: [50, 5, 50],
  },
  battery: {
    id: "battery",
    name: "Test battery",
    weight: 100,
    dimensionsMm: [60, 20, 30],
    mounting_point: [0, 0, -20],
  },
};

test("renders and copies a transparent catalog-mass CG estimate", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const onMeasuredCgChange = jest.fn();
  const { container } = render(
    <AssemblyCenterOfGravity
      parts={parts}
      buildName="CG test"
      measuredCg={[-1.2, -7.5]}
      onMeasuredCgChange={onMeasuredCgChange}
    />,
  );

  expect(screen.getByText(/248 g placed/)).toBeInTheDocument();
  expect(screen.getAllByText("Measured").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByText("Center of gravity"));
  const plot = screen.getByRole("img", {
    name: /^Estimated center-of-gravity offset/,
  });
  expect(plot).toHaveAccessibleName(
    /Top-view planning plot on a 100 by 100 millimetre frame envelope/,
  );
  expect(screen.getByText(/50 g build allowance is excluded/i))
    .toBeInTheDocument();
  expect(screen.getByLabelText("Lateral X (mm)")).toHaveValue(-1.2);
  expect(screen.getByLabelText("Fore / aft Z (mm)")).toHaveValue(-7.5);
  expect(screen.getByText("Measured − estimate")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Lateral X (mm)"), {
    target: { value: "-2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update measurement" }));
  expect(onMeasuredCgChange).toHaveBeenCalledWith([-2, -7.5]);

  fireEvent.click(screen.getByRole("button", { name: "Copy CG estimate" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  expect(writeText.mock.calls[0][0]).toContain("# Build: CG test");
  expect(writeText.mock.calls[0][0]).toContain("Longitudinal offset (Z");
  expect(writeText.mock.calls[0][0]).toContain("Measured lateral X: -1.2 mm");
  expect(writeText.mock.calls[0][0]).toContain("Measured minus estimate");
  expect(writeText.mock.calls[0][0]).toContain("not a measured aircraft CG");
  expect(await getA11yViolations(container)).toEqual([]);
});

test("keeps missing catalog mass visible as a partial estimate", () => {
  render(
    <AssemblyCenterOfGravity
      parts={{
        ...parts,
        battery: { ...parts.battery, weight: null },
      }}
    />,
  );
  fireEvent.click(screen.getByText("Center of gravity"));
  expect(screen.getByText("Partial")).toBeInTheDocument();
  expect(screen.getByText(/Missing mass: Test battery/i)).toBeInTheDocument();
});
