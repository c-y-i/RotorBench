import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import componentsData from "../data/components.json";
import MeasuredGeometryPanel from "./MeasuredGeometryPanel";
import {
  normalizeGeometryOverrides,
  setMeasuredGeometryValue,
} from "../utils/buildGeometry";

const motor = componentsData.motors.find(
  (part) => part.id === "motor-tmotor-f60-pro-v-1750kv",
);

test("renders accessible measured fields and resets them to catalog values", () => {
  let overrides = setMeasuredGeometryValue(
    normalizeGeometryOverrides(null),
    "motors",
    motor.id,
    "propShaftMm",
    5,
  );
  const onChange = jest.fn((category, partId, field, value) => {
    overrides = setMeasuredGeometryValue(
      overrides,
      category,
      partId,
      field,
      value,
    );
  });
  const onReset = jest.fn();
  const { rerender } = render(
    <MeasuredGeometryPanel
      parts={[{ category: "motors", label: "Motor", part: motor }]}
      overrides={overrides}
      onChange={onChange}
      onReset={onReset}
    />,
  );

  fireEvent.click(screen.getByText("Measured geometry"));
  const shaft = screen.getByLabelText(
    "Motor Prop shaft diameter in millimetres",
  );
  expect(shaft).toHaveValue(5);
  expect(screen.getByText("Measured")).toBeInTheDocument();
  fireEvent.change(shaft, { target: { value: "5.2" } });
  expect(onChange).toHaveBeenCalledWith(
    "motors",
    motor.id,
    "propShaftMm",
    "5.2",
  );

  rerender(
    <MeasuredGeometryPanel
      parts={[{ category: "motors", label: "Motor", part: motor }]}
      overrides={overrides}
      onChange={onChange}
      onReset={onReset}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset to catalog" }));
  expect(onReset).toHaveBeenCalledWith("motors", motor.id);
});
