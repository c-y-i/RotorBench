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
const frame = componentsData.frames.find(
  (part) => part.id === "frame-aos-55-v2",
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

test("shows one focused part at a time and exposes measurement coverage", () => {
  const overrides = setMeasuredGeometryValue(
    normalizeGeometryOverrides(null),
    "motors",
    motor.id,
    "propShaftMm",
    5,
  );
  render(
    <MeasuredGeometryPanel
      parts={[
        { category: "frames", label: "Frame", part: frame },
        { category: "motors", label: "Motor", part: motor },
      ]}
      overrides={overrides}
      onChange={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByText("Measured geometry"));
  expect(screen.getByText("1/7 fields measured")).toBeInTheDocument();
  expect(screen.getByLabelText(
    "Frame Frame dimensions axis 1 in millimetres",
  )).toBeInTheDocument();
  expect(screen.queryByLabelText(
    "Motor Prop shaft diameter in millimetres",
  )).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", {
    name: /Motor T-Motor F60 Pro V 2207.5 1750KV 1\/4 measured/i,
  }));
  expect(screen.getByLabelText(
    "Motor Prop shaft diameter in millimetres",
  )).toHaveValue(5);
  expect(screen.queryByLabelText(
    "Frame Frame dimensions axis 1 in millimetres",
  )).not.toBeInTheDocument();
});

test("clearing a measured value commits only after focus leaves the field", () => {
  const overrides = setMeasuredGeometryValue(
    normalizeGeometryOverrides(null),
    "motors",
    motor.id,
    "propShaftMm",
    5,
  );
  const onChange = jest.fn();
  render(
    <MeasuredGeometryPanel
      parts={[{ category: "motors", label: "Motor", part: motor }]}
      overrides={overrides}
      onChange={onChange}
      onReset={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByText("Measured geometry"));
  const shaft = screen.getByLabelText(
    "Motor Prop shaft diameter in millimetres",
  );
  fireEvent.focus(shaft);
  fireEvent.change(shaft, { target: { value: "" } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.blur(shaft);
  expect(onChange).toHaveBeenCalledWith("motors", motor.id, "propShaftMm", "");
});

test("vector measurements accept axes one at a time", () => {
  const overrides = normalizeGeometryOverrides(null);
  const onChange = jest.fn();
  const motorWithoutDimensions = {
    ...motor,
    dimensionsMm: undefined,
    estimatedFields: ["dimensionsMm"],
  };
  render(
    <MeasuredGeometryPanel
      parts={[{
        category: "motors",
        label: "Motor",
        part: motorWithoutDimensions,
      }]}
      overrides={overrides}
      onChange={onChange}
      onReset={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByText("Measured geometry"));
  const axis1 = screen.getByLabelText(
    "Motor Motor dimensions axis 1 in millimetres",
  );
  const axis2 = screen.getByLabelText(
    "Motor Motor dimensions axis 2 in millimetres",
  );
  const axis3 = screen.getByLabelText(
    "Motor Motor dimensions axis 3 in millimetres",
  );
  fireEvent.focus(axis1);
  fireEvent.change(axis1, { target: { value: "27" } });
  fireEvent.change(axis2, { target: { value: "32" } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(axis3, { target: { value: "27" } });
  expect(onChange).toHaveBeenCalledWith(
    "motors",
    motor.id,
    "dimensionsMm",
    ["27", "32", "27"],
  );
});
