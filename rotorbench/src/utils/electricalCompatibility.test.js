import {
  checkEscCurrent,
  checkEscVoltage,
  checkFlightControllerVoltage,
  checkMotorVoltage,
  checkPropellerClearance,
  electricalChecksFor,
  summarizeElectricalChecks,
} from "./electricalCompatibility";

const frame = { name: "AOS 3.5", maxPropSize: 3.5 };
const propeller = { name: "Gemfan 3520", size: 3.5 };
const motor = {
  name: "F1404",
  voltage: { min: 11.1, max: 16.8 },
  maxCurrent: 11.1,
};
const battery = { name: "Tattu 4S", voltage: 14.8 };
const esc = {
  name: "BLS 35A",
  voltage: { min: 12, max: 25.2 },
  currentRating: 35,
};
const flightController = {
  name: "F405 Mini",
  maxVoltage: 25.2,
};

test("propeller clearance uses the frame maximum", () => {
  expect(checkPropellerClearance(propeller, frame)).toMatchObject({
    status: "compatible",
    label: "Gemfan 3520 frame clearance",
  });
  expect(checkPropellerClearance({ name: "51466", size: 5.1 }, frame)).toMatchObject({
    status: "conflict",
  });
});

test("voltage and current limits identify the exact conflicting components", () => {
  expect(checkMotorVoltage(motor, battery)).toMatchObject({ status: "compatible" });
  expect(checkEscVoltage(esc, battery)).toMatchObject({ status: "compatible" });
  expect(checkEscCurrent(esc, motor)).toMatchObject({ status: "compatible" });
  expect(checkFlightControllerVoltage(flightController, battery)).toMatchObject({
    status: "compatible",
  });

  expect(checkMotorVoltage(motor, { name: "6S", voltage: 22.2 })).toMatchObject({
    status: "conflict",
    message: expect.stringMatching(/6S is 22.2 V/),
  });
  expect(checkEscCurrent({ name: "10A", currentRating: 10 }, motor)).toMatchObject({
    status: "conflict",
  });
  expect(checkFlightControllerVoltage({ name: "5V", maxVoltage: 5 }, battery))
    .toMatchObject({ status: "conflict" });
});

test("missing measurements remain unverified", () => {
  expect(checkPropellerClearance({}, {})).toMatchObject({ status: "unknown" });
  expect(checkMotorVoltage({}, battery)).toMatchObject({ status: "unknown" });
  expect(checkEscVoltage(esc, {})).toMatchObject({ status: "unknown" });
  expect(checkEscCurrent({}, {})).toMatchObject({ status: "unknown" });
  expect(checkFlightControllerVoltage({}, {})).toMatchObject({ status: "unknown" });
});

test("selected-build electrical checks summarize every limit", () => {
  const checks = electricalChecksFor({
    frame,
    propeller,
    motor,
    battery,
    esc,
    flightController,
  });
  expect(checks).toHaveLength(5);
  expect(summarizeElectricalChecks(checks)).toMatchObject({
    ok: true,
    verified: true,
  });

  const conflict = summarizeElectricalChecks([
    ...checks,
    checkEscCurrent({ name: "10A", currentRating: 10 }, motor),
  ]);
  expect(conflict).toMatchObject({
    ok: false,
    verified: false,
    reason: expect.stringMatching(/10A.*10 A continuous/),
  });
});
