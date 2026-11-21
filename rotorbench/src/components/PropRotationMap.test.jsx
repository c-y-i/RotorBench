import { render, screen } from "@testing-library/react";
import PropRotationMap from "./PropRotationMap";

test("renders the four alternating propeller directions without vendor numbering", () => {
  render(
    <PropRotationMap
      motor={{ id: "motor-test", name: "Test motor" }}
      propeller={{ id: "prop-test", name: "Test propeller" }}
    />,
  );
  expect(screen.getByText("Test motor · Test propeller")).toBeInTheDocument();
  expect(screen.getByRole("img", {
    name: "Propeller rotation by frame corner",
  })).toBeInTheDocument();
  expect(screen.getAllByText("CW")).toHaveLength(2);
  expect(screen.getAllByText("CCW")).toHaveLength(2);
  expect(screen.getByText("UL")).toBeInTheDocument();
  expect(screen.getByText("UR")).toBeInTheDocument();
  expect(screen.getByText("LR")).toBeInTheDocument();
  expect(screen.getByText("LL")).toBeInTheDocument();
  expect(screen.getByText(/Output numbers are omitted until a supported saved/i))
    .toBeInTheDocument();
});

test("does not render without both propulsion parts", () => {
  const { container } = render(
    <PropRotationMap motor={{ id: "motor-test" }} propeller={null} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("props-in reverses the visible corner directions", () => {
  render(
    <PropRotationMap
      motor={{ id: "motor-test", name: "Test motor" }}
      propeller={{ id: "prop-test", name: "Test propeller" }}
      direction="props-in"
    />,
  );
  expect(screen.getByText("props in · CW / CCW")).toBeInTheDocument();
  const description = screen.getByRole("img", {
    name: "Propeller rotation by frame corner",
  });
  expect(description).toHaveAccessibleDescription(
    /Front-left and rear-right propellers rotate clockwise/i,
  );
});

test("saved flight-controller outputs label the corresponding corners", () => {
  render(
    <PropRotationMap
      motor={{ id: "motor-test", name: "Test motor" }}
      propeller={{ id: "prop-test", name: "Test propeller" }}
      direction="props-in"
      motorOutputByCorner={{
        upperLeft: { output: 4, label: "FL", spin: "CW" },
        upperRight: { output: 2, label: "FR", spin: "CCW" },
        lowerRight: { output: 1, label: "RR", spin: "CW" },
        lowerLeft: { output: 3, label: "RL", spin: "CCW" },
      }}
    />,
  );
  expect(screen.getByText("props in · outputs mapped")).toBeInTheDocument();
  expect(screen.getByText("OUT 4")).toBeInTheDocument();
  expect(screen.getByText("OUT 1")).toBeInTheDocument();
  expect(screen.getByRole("img", {
    name: "Propeller rotation by frame corner",
  })).toHaveAccessibleDescription(/UL output 4 \(CW\).*LL output 3 \(CCW\)/i);
  expect(screen.getByText(/Output numbers follow the saved flight-controller QUAD X plan/i))
    .toBeInTheDocument();
});
