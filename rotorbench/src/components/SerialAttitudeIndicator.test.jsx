import React from "react";
import { render, screen } from "@testing-library/react";
import SerialAttitudeIndicator from "./SerialAttitudeIndicator";

test("renders observed attitude as an accessible read-only instrument", () => {
  const { container } = render(
    <SerialAttitudeIndicator
      rollRad={Math.PI / 15}
      pitchRad={-Math.PI / 18}
      yawRad={Math.PI / 2}
    />,
  );

  expect(screen.getByRole("img", {
    name: /Roll 12\.0 degrees, pitch -10\.0 degrees, yaw 90\.0 degrees/i,
  })).toBeInTheDocument();
  expect(screen.getByText("12.0°")).toBeInTheDocument();
  expect(screen.getByText("-10.0°")).toBeInTheDocument();
  expect(screen.getByText("90.0°")).toBeInTheDocument();
  expect(screen.getByText(/does not calibrate the IMU or verify flight readiness/i))
    .toBeInTheDocument();
  expect(container.querySelector(".serial-attitude-horizon"))
    .toHaveStyle({
      "--attitude-roll": "-12deg",
      "--attitude-pitch": "-7px",
    });
});

test("bounds the visual instrument without changing the numeric readout", () => {
  render(
    <SerialAttitudeIndicator
      rollRad={2}
      pitchRad={-2}
      yawRad={4}
    />,
  );

  const instrument = screen.getByRole("img");
  expect(instrument).toHaveAccessibleName(/Roll 114\.6 degrees, pitch -114\.6 degrees/i);
});
