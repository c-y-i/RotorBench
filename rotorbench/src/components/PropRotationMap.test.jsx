import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

test("twin-motor layouts show left and right prop directions", () => {
  render(
    <PropRotationMap
      motor={{ id: "motor-test", name: "Twin motor" }}
      propeller={{ id: "prop-test", name: "Twin propeller" }}
      motorCount={2}
      motorOutputs={[
        { output: 1, label: "Left pusher", spin: "CCW" },
        { output: 2, label: "Right pusher", spin: "CW" },
      ]}
      direction="props-out"
    />,
  );
  expect(screen.getByRole("img", {
    name: "Propeller rotation for twin motors",
  })).toHaveAccessibleDescription(
    /left propeller rotates counter-clockwise and the right propeller rotates clockwise/i,
  );
  expect(screen.getByText("LEFT")).toBeInTheDocument();
  expect(screen.getByText("RIGHT")).toBeInTheDocument();
  expect(screen.getByText("OUT 1")).toBeInTheDocument();
  expect(screen.getByText("OUT 2")).toBeInTheDocument();
  expect(screen.getByText("props out · outputs mapped")).toBeInTheDocument();
  expect(screen.getByText(/saved flight-controller wing mixer plan/i))
    .toBeInTheDocument();
  expect(screen.queryByText("UL")).not.toBeInTheDocument();
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

test("copies a portable prop-map handoff with the output mapping and boundary", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
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

  fireEvent.click(screen.getByRole("button", { name: "Copy prop map" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  const text = writeText.mock.calls[0][0];
  expect(text).toContain("Motor: Test motor");
  expect(text).toContain("Propeller: Test propeller");
  expect(text).toContain("Direction: props in");
  expect(text).toContain("- Front-left: CW · output 4 (FL)");
  expect(text).toContain("- Rear-right: CW · output 1 (RR)");
  expect(text).toContain(
    "Planning data only. Confirm motor order, wiring, propeller markings, and direction",
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Prop map copied. Nothing was sent to hardware.",
  );
});
