import { CUSTOM_BOARD_PROFILE, FC_BOARD_PROFILES } from "../data/flightControllerProfiles";
import { buildReceiverWiringPlan } from "./receiverWiring";

const esp32 = FC_BOARD_PROFILES.find((profile) => profile.id === "esp32dev");
const feather = FC_BOARD_PROFILES.find((profile) => profile.id === "feather-f405");
const speedybee = FC_BOARD_PROFILES.find(
  (profile) => profile.id === "speedybee-f405-v5",
);

test("builds a documented CRSF wiring checklist without claiming continuity", () => {
  const plan = buildReceiverWiringPlan(
    {
      receiverProtocol: "crsf",
      receiverUart: esp32.receiverUart,
      receiverBaud: esp32.receiverBaud,
    },
    esp32,
    { name: "RadioMaster RP3-H ExpressLRS" },
  );

  expect(plan).toMatchObject({
    documented: true,
    protocolLabel: "CRSF / ExpressLRS",
    uart: "UART2",
    pins: "GPIO17 TX / GPIO16 RX",
    baud: 420000,
    wiringVerified: false,
    scope: "planning continuity checklist; hardware not tested",
  });
  expect(plan.steps).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "signal" }),
    expect.objectContaining({ id: "telemetry" }),
    expect.objectContaining({ id: "ground" }),
    expect.objectContaining({ id: "continuity" }),
  ]));
  expect(plan.copyText).toMatch(/RotorBench did not test this wiring/i);
});

test("adds inverter and input-only steps for SBUS", () => {
  const plan = buildReceiverWiringPlan(
    {
      receiverProtocol: "sbus",
      receiverUart: feather.receiverUart,
      receiverBaud: feather.sbusBaud,
    },
    feather,
  );

  expect(plan.steps).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "input-only" }),
    expect.objectContaining({ id: "inverter" }),
  ]));
});

test("keeps custom-board pin assignments explicitly unverified", () => {
  const plan = buildReceiverWiringPlan(
    {
      receiverProtocol: "crsf",
      receiverUart: "UART4",
      receiverBaud: 420000,
    },
    CUSTOM_BOARD_PROFILE,
  );

  expect(plan).toMatchObject({
    documented: false,
    pins: "Not mapped",
    wiringVerified: false,
  });
  expect(plan.steps[0].detail).toMatch(/verify the pad mapping/i);
});

test("does not invent a serial route for a PWM-only receiver", () => {
  const plan = buildReceiverWiringPlan(
    {
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
    },
    speedybee,
    {
      name: "RadioMaster ER3C-i",
      pwmOutputs: 3,
      outputMode: "pwm",
    },
  );

  expect(plan).toMatchObject({
    protocol: "pwm",
    protocolLabel: "PWM servo outputs",
    outputMode: "pwm-only",
    documented: false,
    uart: null,
    pins: "3 PWM outputs · no serial route published",
    baud: null,
  });
  expect(plan.steps[0]).toMatchObject({
    id: "pwm-outputs",
    label: "Use documented PWM receiver outputs",
  });
  expect(plan.copyText).toMatch(/no serial route published/i);
  expect(plan.copyText).not.toMatch(/CRSF TX to FC RX/i);
});

test("keeps both documented output paths on a dual-output receiver", () => {
  const plan = buildReceiverWiringPlan(
    {
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
    },
    speedybee,
    {
      name: "RadioMaster ER16",
      protocol: "CRSF",
      pwmOutputs: 16,
      outputMode: "serial-pwm",
      serialProtocols: ["CRSF", "SBUS"],
    },
  );

  expect(plan).toMatchObject({
    protocol: "crsf",
    outputMode: "serial-pwm",
    receiverOutputs: {
      serialProtocols: ["CRSF", "SBUS"],
      pwmOutputs: 16,
    },
  });
  expect(plan.copyText).toContain(
    "# Receiver outputs: CRSF / SBUS serial; 16 PWM outputs also documented",
  );
  expect(plan.copyText).toMatch(/PWM allocations are not assigned/i);
});

test("does not inherit the primary receiver pads on an alternate UART", () => {
  const alternate = buildReceiverWiringPlan(
    {
      receiverProtocol: "crsf",
      receiverUart: "UART6",
      receiverBaud: 420000,
    },
    speedybee,
  );
  const unmapped = buildReceiverWiringPlan(
    {
      receiverProtocol: "crsf",
      receiverUart: "UART7",
      receiverBaud: 420000,
    },
    speedybee,
  );

  expect(alternate).toMatchObject({
    documented: false,
    pins: "Pins not mapped for UART6",
    portDetail: "Alternate receiver port",
  });
  expect(alternate.steps[0].detail).toMatch(/verify the pad mapping/i);
  expect(unmapped).toMatchObject({
    documented: false,
    pins: "Pins not mapped for UART7",
  });
});
