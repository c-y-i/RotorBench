import { render, screen } from "@testing-library/react";
import AerialKitSensorReadings from "./AerialKitSensorReadings";

test("keeps zero readings, range sentinels, missing pin readings, and no-fix positions distinct", () => {
  const { rerender } = render(<AerialKitSensorReadings sensor={{
    topic: 1,
    topicName: "Barometer",
    body: {
      pressurePa: 0,
      temperatureC: 0,
      haveReference: false,
      heightCm: 0,
      haveGpsReference: false,
      fusedCm: 0,
      samples: 0,
      errors: 0,
      fails: 0,
    },
  }} />);
  expect(screen.getByText("0 Pa")).toBeInTheDocument();
  expect(screen.getByText("No reference")).toBeInTheDocument();

  rerender(<AerialKitSensorReadings sensor={{
    topic: 2,
    topicName: "Rangefinder",
    body: {
      distanceMm: -1,
      maxMm: 4000,
      ageMs: 12,
      samples: 4,
      outOfRange: 1,
      rejected: 0,
    },
  }} />);
  expect(screen.getByText("Out of range")).toBeInTheDocument();
  expect(screen.queryByText("-1 mm")).not.toBeInTheDocument();

  rerender(<AerialKitSensorReadings sensor={{
    topic: 3,
    topicName: "Battery",
    body: {
      ready: true,
      haveReading: true,
      state: 1,
      stateName: "ok",
      cells: 4,
      volts: 15.8,
      voltsPerCell: 3.95,
      pinMv: -1,
      warnCellV: 3.5,
      criticalCellV: 3.2,
      samples: 40,
      rejected: 0,
    },
  }} />);
  expect(screen.getByText("No pin reading")).toBeInTheDocument();
  expect(screen.queryByText("-1 mV")).not.toBeInTheDocument();

  rerender(<AerialKitSensorReadings sensor={{
    topic: 4,
    topicName: "GPS",
    body: {
      haveFix: false,
      fixType: 0,
      fixName: "no fix",
      satellites: 0,
      lat: 37.6774,
      lon: -122.4194,
      altMslMm: 0,
      speedMmS: 0,
      haveHome: false,
      homeDistanceM: -1,
      homeBearingDeg: 0,
    },
  }} />);
  expect(screen.getByText("No position fix")).toBeInTheDocument();
  expect(screen.getAllByText("Not shown without a fix")).toHaveLength(2);
  expect(screen.queryByText(/37\.6774000/)).not.toBeInTheDocument();
  expect(screen.getByText("No home recorded")).toBeInTheDocument();
});

test("does not invent readings when a sensor carries no body", () => {
  const { container } = render(<AerialKitSensorReadings sensor={{
    topic: 0,
    topicName: "IMU",
    status: "absent",
    body: null,
  }} />);
  expect(container).toBeEmptyDOMElement();
});
