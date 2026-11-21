import { CUSTOM_BOARD_PROFILE, FC_BOARD_PROFILES } from "../data/flightControllerProfiles";
import { buildReceiverWiringPlan } from "./receiverWiring";

const esp32 = FC_BOARD_PROFILES.find((profile) => profile.id === "esp32dev");
const feather = FC_BOARD_PROFILES.find((profile) => profile.id === "feather-f405");

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
  expect(plan.steps[0].detail).toMatch(/confirm TX\/RX direction/i);
});
