import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import FlightControllerSetup from "./FlightControllerSetup";
import { getA11yViolations } from "../test/a11y";

test("renders a local flight-controller configuration plan", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByRole("heading", { name: "Flight controller" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Flight controller sections" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sensor" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Summary" })).toBeInTheDocument();
  expect(screen.getByText("Local configuration plan")).toBeInTheDocument();
  expect(screen.getByLabelText("Flight controller plan summary"))
    .toHaveAttribute("tabindex", "0");
  expect(screen.getByLabelText("Firmware family")).toHaveValue("aerialkit");
  expect(screen.getByLabelText("Protocol")).toHaveValue("crsf");
  expect(screen.getByLabelText("Full low")).toHaveValue(172);
  expect(screen.getByLabelText("Centre")).toHaveValue(992);
  expect(screen.getByLabelText("Full high")).toHaveValue(1811);
  expect(screen.getByLabelText("Deadband")).toHaveValue(0.02);
  expect(screen.getByText("Battery telemetry plan")).toBeInTheDocument();
  expect(screen.getByLabelText("ADC divider ratio")).toHaveValue(11);
  expect(screen.getByLabelText("Cell override")).toHaveValue(0);
  expect(screen.getByLabelText("Warning threshold")).toHaveValue(3.5);
  expect(screen.getByLabelText("Minimum threshold")).toHaveValue(3.3);
  expect(screen.getByRole("checkbox", {
    name: /Return home on critical pack/i,
  })).not.toBeChecked();
  expect(screen.getByRole("checkbox", {
    name: /Enable Aerial Kit geofence/i,
  })).not.toBeChecked();
  expect(screen.getByLabelText("Fence radius")).toHaveValue(0);
  expect(screen.getByLabelText("Fence ceiling")).toHaveValue(0);
  expect(screen.getByLabelText("Return floor")).toHaveValue(0);
  expect(screen.getByLabelText("GPS minimum")).toHaveValue(6);
  expect(screen.getByRole("heading", { name: "Sensor and power" })).toBeInTheDocument();
  expect(screen.getByLabelText("Alignment roll")).toHaveValue(0);
  expect(screen.getByLabelText("Alignment pitch")).toHaveValue(0);
  expect(screen.getByLabelText("Alignment yaw")).toHaveValue(0);
  expect(screen.getByLabelText("Requested gyro rate")).toHaveValue(0);
  expect(screen.getByLabelText("Loop divisor")).toHaveValue(1);
  expect(screen.getByRole("status")).toHaveTextContent("Driver default");
});

test("jumps from the section strip to the plan summary", () => {
  render(<FlightControllerSetup />);

  fireEvent.click(screen.getByRole("button", { name: "Summary" }));

  expect(screen.getByRole("heading", { name: "Plan summary" })).toHaveFocus();
});

test("shows the selected Aerial Kit airframe motor output map", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByText("Motor output map")).toBeInTheDocument();
  let outputs = screen.getByRole("list", { name: "Quad X motor outputs" });
  expect(within(outputs).getAllByRole("listitem")).toHaveLength(4);
  expect(within(outputs).getByText("RR")).toBeInTheDocument();
  expect(within(outputs).getByText("FL")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "quadx1234" },
  });
  outputs = screen.getByRole("list", {
    name: "Quad X, motors 1-4 front-left first motor outputs",
  });
  const items = within(outputs).getAllByRole("listitem");
  expect(items[0]).toHaveTextContent("1FLCCW");
  expect(items[3]).toHaveTextContent("4RLCW");
});

test("Aerial Kit wings expose source-backed servo output planning", async () => {
  const onChange = jest.fn();
  const { container } = render(<FlightControllerSetup onChange={onChange} />);

  expect(screen.queryByRole("heading", { name: "Servo outputs" }))
    .not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "elevonwing" },
  });

  expect(screen.getByRole("heading", { name: "Servo outputs" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Servos" })).toBeInTheDocument();
  const servo1 = screen.getByRole("group", { name: /Servo 1/i });
  expect(within(servo1).getByLabelText("Centre trim")).toHaveValue(0);
  expect(within(servo1).getByLabelText("Travel")).toHaveValue(500);
  fireEvent.click(within(servo1).getByRole("checkbox", {
    name: /Reverse linkage/i,
  }));
  fireEvent.change(within(servo1).getByLabelText("Centre trim"), {
    target: { value: "18" },
  });
  fireEvent.change(within(servo1).getByLabelText("Travel"), {
    target: { value: "460" },
  });

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    servo1Reverse: true,
    servo1TrimUs: 18,
    servo1TravelUs: 460,
  }));
  expect(await getA11yViolations(container)).toEqual([]);
});

test("servo validation reviews focus the affected output", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "elevonwing" },
  });
  const servo2 = screen.getByRole("group", { name: /Servo 2/i });

  fireEvent.change(within(servo2).getByLabelText("Travel"), {
    target: { value: "" },
  });
  expect(screen.getByText("1 blocked")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {
    name: "Review servo travel",
  }));

  expect(within(servo2).getByLabelText("Travel")).toHaveFocus();
});

test("shows the Aerial Kit arm-gate audit without claiming live readiness", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByRole("heading", { name: "Arm-gate preview" })).toBeInTheDocument();
  expect(screen.getByText("1 to verify")).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Aerial Kit plan checks" })).toBeInTheDocument();
  expect(screen.getByText("9 not observed")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Live gates"));
  expect(screen.getByRole("list", { name: "Aerial Kit live gates not observed" })).toBeInTheDocument();
  expect(screen.getByText("Receiver has spoken")).toBeInTheDocument();
  expect(screen.getByText("IMU sample is usable")).toBeInTheDocument();
  expect(screen.getByText("Arm switch released")).toBeInTheDocument();
  expect(screen.getByText(/need a live, disarmed aircraft/i)).toBeInTheDocument();
});

test("does not show Aerial Kit live gates for another firmware family", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  expect(screen.queryByRole("button", { name: "Sensor" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Arm-gate preview" })).not.toBeInTheDocument();
  expect(screen.getByText("Motor output map")).toBeInTheDocument();
  expect(screen.getByText("Betaflight Normal · props in QUAD X")).toBeInTheDocument();
  expect(screen.getByLabelText("Motor direction")).toHaveValue("props-in");
  expect(screen.queryByText("Battery telemetry plan")).not.toBeInTheDocument();
});

test("Betaflight props-out flips the motor map directions", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  fireEvent.change(screen.getByLabelText("Motor direction"), {
    target: { value: "props-out" },
  });

  const outputs = screen.getByRole("list", { name: "Quad X motor outputs" });
  const items = within(outputs).getAllByRole("listitem");
  expect(items[0]).toHaveTextContent("1RRCCW");
  expect(items[1]).toHaveTextContent("2FRCW");
  expect(screen.getByText("Betaflight Reversed · props out QUAD X"))
    .toBeInTheDocument();
  expect(screen.getByText(/uses props-out at the front/i)).toBeInTheDocument();
});

test("Betaflight exposes a missing map for unsupported mixer orders", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  fireEvent.change(screen.getByLabelText("Motor direction"), {
    target: { value: "props-out" },
  });
  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "quadp" },
  });
  const note = screen.getByRole("note");
  expect(note).toHaveTextContent("Motor output map unavailable");
  expect(note).toHaveTextContent(/normal QUAD X order only/i);
});

test("changing to an ESP32 profile exposes its documented UART", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "esp32dev" },
  });
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getAllByText(/GPIO17 TX/).length).toBeGreaterThan(0);
  expect(screen.getByLabelText("Internal flight log")).toHaveTextContent(
    "ESP32 aerialkit partition + retained RAM",
  );
});

test("selecting the SpeedyBee F405 V5 uses its documented board mapping", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-speedybee-f405-v5",
        name: "SpeedyBee F405 V5",
        processor: "STM32F405",
        imu: "ICM42688P",
        firmware: ["Betaflight"],
      }}
    />,
  );

  expect(screen.getByLabelText("Board profile"))
    .toHaveValue("speedybee-f405-v5");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getAllByText(/UART4 GPS/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/16 MB onboard blackbox/i)).toBeInTheDocument();
});

test("selecting the Adafruit Feather starts an Aerial Kit wing plan", () => {
  const feather = {
    id: "fc-adafruit-feather-f405",
    name: "Adafruit Feather STM32F405 Express",
    processor: "STM32F405",
    imu: "External LSM6DSO or BNO055",
    firmware: ["Aerial Kit"],
  };
  render(<FlightControllerSetup selectedFlightController={feather} />);

  expect(screen.getByLabelText("Board profile")).toHaveValue("feather-f405");
  expect(screen.getByLabelText("Firmware family")).toHaveValue("aerialkit");
  expect(screen.getByLabelText("Airframe")).toHaveValue("elevonwingsingle");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("USART3");
  expect(screen.getByRole("heading", { name: "Servo outputs" }))
    .toBeInTheDocument();
  expect(screen.getByText("1 motor · 2 servos")).toBeInTheDocument();
  const outputs = screen.getByRole("list", {
    name: "Single-motor elevon wing motor outputs",
  });
  expect(within(outputs).getByText("Centre pusher")).toBeInTheDocument();
});

test("selecting Kakute H7 V2 exposes its documented Betaflight mapping", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-holybro-kakute-h7-v2",
        name: "Holybro Kakute H7 V2",
        processor: "STM32H743",
        imu: "BMI270",
        firmware: ["Betaflight", "INAV"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile")).toHaveValue("kakute-h7-v2");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART6");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByText("8 motors / 0 servos")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("ESC telemetry").closest("li"))
    .toHaveTextContent("R7 only");
  expect(within(ports).getByText(/R4 \/ T4/).closest("li"))
    .toHaveTextContent("GPS");
  expect(screen.getByText(/128 MB onboard blackbox/i)).toBeInTheDocument();
});

test("selecting Kakute F7 AIO exposes its documented mapping", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-holybro-kakute-f7",
        name: "Kakute F7 AIO",
        processor: "STM32F745",
        imu: "ICM20689 or MPU6000",
        firmware: ["Betaflight", "ArduPilot"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile")).toHaveValue("kakute-f7-aio");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART6");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByText("6 shared PWM pads")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("T3 / R3").closest("li"))
    .toHaveTextContent("GPS");
  expect(within(ports).getByText("ESC telemetry").closest("li"))
    .toHaveTextContent("R7 on each AIO corner");
  expect(screen.getByText(/MicroSD blackbox · card required/i))
    .toBeInTheDocument();
});

test("selecting MAMBA F722 MK2 exposes its target map as a planning choice", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-mamba-f722",
        name: "MAMBA F722 MK2",
        processor: "STM32F722",
        imu: "ICM42688P",
        firmware: ["Betaflight"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile")).toHaveValue("mamba-f722-mk2");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART5");
  expect(screen.getByLabelText("Receiver UART")).not.toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByText("4 motors / 0 servos")).toBeInTheDocument();
  expect(screen.queryByText(/UART5 is documented for FPort/i))
    .not.toBeInTheDocument();
  expect(screen.queryByText(/alternate receiver port on MAMBA/i))
    .not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText(/PC12 TX \/ PD2 RX/).closest("li"))
    .toHaveTextContent(/dedicated FPort\/receiver pad/i);
  expect(within(ports).getByText("GPS-capable user serial").closest("li"))
    .toHaveTextContent("GPS");
  expect(screen.getByText(/16 MB onboard blackbox/i)).toBeInTheDocument();
});

test("selecting Borg 5S RX exposes its integrated receiver mapping", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-iflight-borg-5s-rx",
        name: "iFlight Borg 5S RX",
        processor: "AT32F435RGT7",
        imu: "ICM42688",
        firmware: ["Betaflight"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile")).toHaveValue("iflight-borg-5s-rx");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART4");
  expect(screen.getByLabelText("Receiver UART")).not.toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Barometer altitude" }))
    .toBeDisabled();
  expect(screen.getByText("4 motors / 0 servos")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("ESC telemetry").closest("li"))
    .toHaveTextContent("Dedicated ESC telemetry route");
  expect(within(ports).getByText("GPS-capable user serial").closest("li"))
    .toHaveTextContent("GPS");
  expect(screen.getByText(/16 MB onboard blackbox/i)).toBeInTheDocument();
});

test("selecting SpeedyBee F405 Mini exposes its documented BT stack", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-speedybee-f405-mini",
        name: "SpeedyBee F405 Mini",
        processor: "STM32F405",
        imu: "ICM42688P",
        firmware: ["Betaflight"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile"))
    .toHaveValue("speedybee-f405-mini");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByText("4 motors / 0 servos")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("ESC telemetry").closest("li"))
    .toHaveTextContent("PD2 RX / PC12 TX");
  expect(within(ports).getByText(/PC7 RX \/ PC6 TX/).closest("li"))
    .toHaveTextContent("GPS");
  expect(screen.getByText(/8 MB onboard blackbox/i)).toBeInTheDocument();
});

test("selecting SpeedyBee F405 V3 exposes its documented target", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-speedybee-f405-v3",
        name: "SpeedyBee F405 V3",
        processor: "STM32F405",
        imu: "BMI270",
        firmware: ["Betaflight", "INAV"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile")).toHaveValue("speedybee-f405-v3");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByText("8 motors / 1 servo")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("ESC telemetry").closest("li"))
    .toHaveTextContent("PD2 RX / PC12 TX");
  expect(within(ports).getByText(/PC7 RX \/ PC6 TX/).closest("li"))
    .toHaveTextContent("GPS");
  expect(screen.getByText(/MicroSD blackbox · 4 GB recognized/i))
    .toBeInTheDocument();
});

test("selecting SpeedyBee F405 V4 exposes its documented 30x30 mapping", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-speedybee-f405-v4",
        name: "SpeedyBee F405 V4",
        processor: "STM32F405",
        imu: "ICM42688P",
        firmware: ["Betaflight"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("betaflight");
  expect(screen.getByLabelText("Board profile")).toHaveValue("speedybee-f405-v4");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  expect(screen.getByText("8 motors / 1 servo")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("ESC telemetry").closest("li"))
    .toHaveTextContent("R5 / TEL only");
  expect(within(ports).getByText(/T6 \/ R6/).closest("li"))
    .toHaveTextContent("GPS");
  expect(screen.getByText(/MicroSD blackbox · card required/i))
    .toBeInTheDocument();
});

test("copies the full serial allocation with a planning boundary", async () => {
  const originalClipboard = navigator.clipboard;
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  try {
    render(
      <FlightControllerSetup
        selectedFlightController={{
          id: "fc-speedybee-f405-v4",
          name: "SpeedyBee F405 V4",
          processor: "STM32F405",
          imu: "ICM42688P",
          firmware: ["Betaflight"],
        }}
      />,
    );

    fireEvent.click(screen.getByText("Serial allocation"));
    fireEvent.click(screen.getByRole("button", {
      name: "Copy serial allocation",
    }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0];
    expect(text).toContain("# Board: SpeedyBee F405 V4 (SPEEDYBEEF405V4)");
    expect(text).toContain("# Receiver route: UART2");
    expect(text).toContain("# GPS route: UART6");
    expect(text).toContain("UART4: Bluetooth tuning");
    expect(text).toContain("UART5: ESC telemetry");
    expect(text).toContain("RotorBench did not test this serial allocation");
    await waitFor(() => {
      expect(screen.getByText(/Serial allocation copied/i)).toBeInTheDocument();
    });
  } finally {
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete navigator.clipboard;
    }
  }
});

test("selecting Matek F405-WMN exposes its documented INAV wing mapping", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-matek-f405-wmn",
        name: "Matek F405-WMN",
        processor: "STM32F405RGT6",
        imu: "ICM42688-P",
        firmware: ["INAV", "ArduPilot"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("inav");
  expect(screen.getByLabelText("Board profile")).toHaveValue("matek-f405-wmn");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByText("12 shared PWM pads")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getAllByText("GPS-capable user serial")).toHaveLength(2);
  expect(within(ports).getByText("TX5 / RX5").closest("li"))
    .toHaveTextContent("Documented");
});

test("selecting Matek H743-WING exposes the ArduPilot UART and servo map", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-matek-h743-wing-v3",
        name: "Matek H743-WING V3",
        processor: "STM32H743VIT6",
        imu: "ICM42688P",
        firmware: ["ArduPilot"],
      }}
    />,
  );

  expect(screen.getByLabelText("Firmware family")).toHaveValue("ardupilot");
  expect(screen.getByLabelText("Board profile")).toHaveValue(
    "matek-h743-wing-v3-ardupilot",
  );
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART6");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByText("13 shared PWM pads")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("UART6").closest("li")).toHaveTextContent(
    "BRD_ALT_CONFIG=1",
  );

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "inav" },
  });
  expect(screen.getByLabelText("Board profile")).toHaveValue("custom-board");
});

test("Matek keeps its documented mapping when switching to ArduPilot", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-matek-f405-wmn",
        name: "Matek F405-WMN",
        processor: "STM32F405RGT6",
        imu: "ICM42688-P",
        firmware: ["INAV", "ArduPilot"],
      }}
    />,
  );

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "ardupilot" },
  });
  expect(screen.getByLabelText("Board profile"))
    .toHaveValue("matek-f405-wmn-ardupilot");
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("UART2");
  expect(screen.getByRole("checkbox", { name: "GPS navigation" }))
    .toBeChecked();
  fireEvent.click(screen.getByText("Serial allocation"));
  const ports = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  expect(within(ports).getByText("ArduPilot GPS1").closest("li"))
    .toHaveTextContent("GPS");
  expect(within(ports).getByText("ArduPilot GPS2").closest("li"))
    .toHaveTextContent("Documented");
});

test("shows the documented serial map and marks active plan routes", async () => {
  const { container } = render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-speedybee-f405-v5",
        name: "SpeedyBee F405 V5",
        processor: "STM32F405",
        imu: "ICM42688P",
        firmware: ["Betaflight"],
      }}
    />,
  );

  fireEvent.click(screen.getByText("Serial allocation"));

  const portList = screen.getByRole("list", {
    name: "Documented serial port allocation",
  });
  const getPort = (port) => within(portList).getByText(port).closest("li");
  expect(getPort("UART3")).toHaveTextContent("DJI VTX");
  expect(getPort("UART4").querySelector("em")).toHaveTextContent("GPS");
  expect(getPort("UART5")).toHaveTextContent("ESC telemetry");
  expect(getPort("UART2").querySelector("em")).toHaveTextContent("Receiver");

  fireEvent.change(screen.getByLabelText("Receiver UART"), {
    target: { value: "UART6" },
  });

  expect(getPort("UART2").querySelector("em")).toHaveTextContent("Documented");
  expect(getPort("UART6").querySelector("em")).toHaveTextContent("Receiver");
  expect(screen.getAllByText(/Pins not mapped for UART6/).length)
    .toBeGreaterThan(0);
  expect(screen.getByText("Mapping incomplete")).toBeInTheDocument();
  expect(screen.getByText(/UART6.*pad mapping is not bundled/i))
    .toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("flags a receiver that takes over a documented peripheral UART", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-speedybee-f405-v5",
        name: "SpeedyBee F405 V5",
        processor: "STM32F405",
        imu: "ICM42688P",
        firmware: ["Betaflight"],
      }}
    />,
  );

  fireEvent.change(screen.getByLabelText("Receiver UART"), {
    target: { value: "UART3" },
  });

  expect(screen.getByText(/UART3 is documented for DJI VTX/i))
    .toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Review receiver UART",
  })).toBeInTheDocument();
});

test("receiver wiring expands into a documented continuity checklist", () => {
  render(
    <FlightControllerSetup
      selectedReceiver={{
        id: "rx-test",
        name: "RadioMaster RP3-H ExpressLRS",
        protocol: "CRSF",
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "esp32dev" },
  });
  fireEvent.click(screen.getByText("Receiver wiring"));

  const checklist = screen.getByRole("list", {
    name: "Receiver wiring checklist",
  });
  expect(within(checklist).getByText("Receiver CRSF TX to FC RX"))
    .toBeInTheDocument();
  expect(within(checklist).getByText(/GPIO17 TX \/ GPIO16 RX/))
    .toBeInTheDocument();
  expect(within(checklist).getByText("Connect signal ground")).toBeInTheDocument();
  expect(screen.getAllByText("Pins documented")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Copy wiring checklist" }))
    .toBeInTheDocument();
});

test("PWM-only receivers replace the serial route with direct-output guidance", () => {
  render(
    <FlightControllerSetup
      selectedReceiver={{
        id: "rx-er3c-i",
        name: "RadioMaster ER3C-i",
        protocol: "CRSF",
        pwmOutputs: 3,
        outputMode: "pwm",
      }}
    />,
  );

  const controlPath = screen.getByRole("region", { name: "Control path" });
  expect(within(controlPath).getByText("PWM outputs only")).toBeInTheDocument();
  expect(within(controlPath).getByText("PWM outputs")).toBeInTheDocument();
  expect(within(controlPath).getByText("3 channels")).toBeInTheDocument();
  expect(screen.getAllByText(
    /3 PWM outputs · no serial route published/i,
  ).length).toBeGreaterThan(0);
  expect(screen.queryByLabelText("Receiver UART")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Line rate")).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("Receiver wiring"));
  const checklist = screen.getByRole("list", {
    name: "Receiver wiring checklist",
  });
  expect(within(checklist).getByText("Use documented PWM receiver outputs"))
    .toBeInTheDocument();
  expect(within(checklist).queryByText("Receiver CRSF TX to FC RX"))
    .not.toBeInTheDocument();
});

test("SBUS wiring adds the documented inverter step", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "feather-f405" },
  });
  fireEvent.change(screen.getByLabelText("Protocol"), {
    target: { value: "sbus" },
  });
  fireEvent.click(screen.getByText("Receiver wiring"));

  const checklist = screen.getByRole("list", {
    name: "Receiver wiring checklist",
  });
  expect(within(checklist).getByText("SBUS is input-only")).toBeInTheDocument();
  expect(within(checklist).getByText("Fit the required SBUS inverter"))
    .toBeInTheDocument();
});

test("configuration changes reach the parent callback", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Arm channel"), {
    target: { value: "7" },
  });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ armChannel: 7 }));
});

test("control path keeps receiver, serial, airframe, and motor output in one view", () => {
  render(
    <FlightControllerSetup
      selectedReceiver={{
        id: "rx-test",
        name: "RadioMaster RP2 V2 ExpressLRS",
        protocol: "CRSF",
      }}
    />,
  );

  const controlPath = screen.getByRole("region", { name: "Control path" });
  expect(within(controlPath).getByText("RadioMaster RP2 V2 ExpressLRS")).toBeInTheDocument();
  expect(within(controlPath).getByText(/CRSF \/ ExpressLRS/)).toBeInTheDocument();
  expect(within(controlPath).getByText(/DShot 300 kHz/)).toBeInTheDocument();
  expect(within(controlPath).getByText("Mapping incomplete")).toBeInTheDocument();
});

test("review actions focus the field that owns a plan issue", () => {
  render(<FlightControllerSetup buildMotorCount={1} />);

  fireEvent.click(screen.getByRole("button", { name: "Review airframe" }));

  expect(screen.getByLabelText("Airframe")).toHaveFocus();
});

test("servo hardware coverage remains reviewable from the servo section", () => {
  render(<FlightControllerSetup buildServoCount={3} />);
  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "elevonwing" },
  });

  expect(screen.getByText("Catalogued servo hardware exceeds this mixer"))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review servo outputs" }))
    .toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review servo outputs" }));
  expect(screen.getByRole("heading", { name: "Servo outputs" })).toHaveFocus();
});

test("choosing Betaflight switches to its documented bench channel preset", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  expect(screen.getByLabelText("Arm channel")).toHaveValue(5);
  expect(screen.getByLabelText("Flight-mode channel")).toHaveValue(null);
  expect(screen.getByLabelText("Mapping preset")).toHaveValue("betaflight-bench");
});

test("Betaflight exposes its source-backed Stage 2 landing throttle", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);
  expect(screen.queryByLabelText("Stage 2 landing throttle"))
    .not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  const throttle = screen.getByLabelText("Stage 2 landing throttle");
  expect(throttle).toHaveValue(1000);
  expect(screen.getByText(/1000 is throttle off/i)).toBeInTheDocument();
  expect(screen.getByText(/uses it only in Stage 2 Landing Mode/i)).toBeInTheDocument();

  fireEvent.change(throttle, { target: { value: "1200" } });
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ failsafeThrottle: 1200 }),
  );

  fireEvent.change(throttle, { target: { value: "999" } });
  expect(throttle).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("button", {
    name: "Review Stage 2 landing throttle",
  })).toBeInTheDocument();
});

test("INAV requires an explicit channel map instead of inheriting Betaflight", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "inav" },
  });
  expect(screen.getByLabelText("Arm channel")).toHaveValue(null);
  expect(screen.getByLabelText("Flight-mode channel")).toHaveValue(null);
  expect(screen.getByLabelText("Mapping preset")).toHaveValue("custom");
  expect(screen.queryByRole("option", { name: "Betaflight bench mapping" }))
    .not.toBeInTheDocument();
});

test("returning to Aerial Kit removes control roles its firmware cannot register", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  fireEvent.change(screen.getByLabelText("Manual channel"), {
    target: { value: "7" },
  });
  fireEvent.change(screen.getByLabelText("Control channel"), {
    target: { value: "8" },
  });
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "aerialkit" },
  });

  expect(onChange.mock.calls.at(-1)[0]).toMatchObject({
    armChannel: 6,
    modeChannel: 5,
    velocityChannel: null,
    manualChannel: null,
    ctrlChannel: null,
    sysidChannel: null,
    beeperChannel: null,
    failsafeThrottle: null,
  });
  expect(screen.queryByLabelText("Manual channel")).not.toBeInTheDocument();
});

test("documented Aerial Kit receiver routing is read-only", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "weact-f405" },
  });
  expect(screen.getByLabelText("Receiver UART")).toHaveValue("USART1");
  expect(screen.getByLabelText("Receiver UART")).toBeDisabled();
  expect(screen.getByLabelText("Line rate")).toBeDisabled();
});

test("returning to a custom board keeps the selected controller hardware", () => {
  render(
    <FlightControllerSetup
      selectedFlightController={{
        id: "fc-kakute",
        name: "Kakute F7 AIO",
        processor: "STM32F722",
        imu: "MPU6000",
        firmware: ["Betaflight"],
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "esp32dev" },
  });
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "custom-board" },
  });
  expect(screen.getByText("STM32F722")).toBeInTheDocument();
  expect(screen.getByText("MPU6000")).toBeInTheDocument();
});

test("warnings are reviewed rather than presented as a valid plan", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByText("FC · 1 review item")).toBeInTheDocument();
  expect(screen.queryByText("Plan valid")).not.toBeInTheDocument();
});

test("blank required controls are marked invalid for assistive technology", () => {
  render(<FlightControllerSetup />);
  const armChannel = screen.getByLabelText("Arm channel");
  fireEvent.change(armChannel, { target: { value: "" } });
  expect(armChannel).toHaveAttribute("aria-invalid", "true");
});

test("changing boards preserves the SBUS line rate and input-only telemetry rule", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Protocol"), {
    target: { value: "sbus" },
  });
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "esp32dev" },
  });
  expect(screen.getByLabelText("Line rate")).toHaveValue(100000);
  expect(screen.getByRole("checkbox", { name: "Receiver telemetry" })).not.toBeChecked();
});

test("command preview uses Aerial Kit syntax or unified MSP discovery without guessing writes", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByText("Console command preview")).toBeInTheDocument();
  expect(screen.getByText("Copy-only · no save command · nothing is executed")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  expect(screen.getByText(/Betaflight settings must be addressed by exact name/i)).toBeInTheDocument();
  expect(screen.getByText(/ak fc status --port/)).toBeInTheDocument();
  expect(screen.getByRole("region", {
    name: "Flight controller command preview",
  })).toHaveAttribute("tabindex", "0");

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "inav" },
  });
  expect(screen.getByText(/INAV uses different parameter-group commands/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "ardupilot" },
  });
  expect(screen.getByText(/No command preview is generated/)).toBeInTheDocument();
});

test("Aerial Kit exposes its velocity switch and omits unsupported control roles", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByLabelText("Velocity channel")).toBeInTheDocument();
  expect(screen.queryByLabelText("Beeper channel")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Manual channel")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Control channel")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("System-ID channel")).not.toBeInTheDocument();
});

test("blank numeric safety fields remain invalid instead of becoming zero", () => {
  render(<FlightControllerSetup />);
  const armHold = screen.getByLabelText("Arm hold");
  fireEvent.change(armHold, { target: { value: "" } });
  expect(armHold).toHaveValue(null);
  expect(armHold).toHaveAttribute("aria-invalid", "true");
});

test("receiver calibration changes reach the parent plan", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Full low"), {
    target: { value: "180" },
  });
  fireEvent.change(screen.getByLabelText("Deadband"), {
    target: { value: "0.03" },
  });

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rcMin: 180 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rcDeadband: 0.03 }));
});

test("battery telemetry parameters reach the parent plan", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("ADC divider ratio"), {
    target: { value: "10.8" },
  });
  fireEvent.change(screen.getByLabelText("Cell override"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Warning threshold"), {
    target: { value: "3.4" },
  });
  fireEvent.change(screen.getByLabelText("Minimum threshold"), {
    target: { value: "3.2" },
  });

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ vbatRatio: 10.8 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ vbatCells: 4 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ vbatWarnCell: 3.4 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ vbatMinCell: 3.2 }));
});

test("critical-pack return reaches the parent plan with the documented latch copy", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  fireEvent.click(screen.getByRole("checkbox", {
    name: /Return home on critical pack/i,
  }));

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ batteryRthEnabled: true }),
  );
  expect(screen.getByText(/latches until landing or disarm/i)).toBeInTheDocument();
  expect(screen.getByText(/stick movement does not cancel it/i)).toBeInTheDocument();
});

test("geofence settings reach the parent plan with trigger semantics", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  fireEvent.click(screen.getByRole("checkbox", {
    name: /Enable Aerial Kit geofence/i,
  }));
  fireEvent.change(screen.getByLabelText("Fence radius"), {
    target: { value: "250" },
  });
  fireEvent.change(screen.getByLabelText("Fence ceiling"), {
    target: { value: "120" },
  });
  fireEvent.change(screen.getByLabelText("Return floor"), {
    target: { value: "30" },
  });
  fireEvent.change(screen.getByLabelText("GPS minimum"), {
    target: { value: "8" },
  });

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fenceEnabled: true }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fenceRadiusM: 250 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fenceCeilingM: 120 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rthMinAltM: 30 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gpsMinSats: 8 }));
  expect(screen.getByText(/not a stick clamp/i)).toBeInTheDocument();
  expect(screen.getByText(/holds 10 m below the lid/i)).toBeInTheDocument();
  expect(screen.getByText(/fused altitude estimate, not GPS alone/i)).toBeInTheDocument();
});

test("mission switch is optional, scoped to Aerial Kit, and lands in the channel map", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  const mission = screen.getByLabelText("Mission channel");
  expect(mission).toHaveValue(null);
  fireEvent.change(mission, { target: { value: "7" } });
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ missionChannel: 7 }),
  );
  expect(screen.getByText("Mission switch")).toBeInTheDocument();
  expect(screen.getByText("CH 7")).toBeInTheDocument();
  expect(screen.getByText(/high transition and ends when switched low/i))
    .toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  expect(screen.queryByLabelText("Mission channel")).not.toBeInTheDocument();
  expect(onChange.mock.calls.at(-1)[0]).toMatchObject({ missionChannel: null });
});

test("hand-launch planning is wing-only and reaches the parent plan", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);
  expect(screen.queryByLabelText("Launch channel")).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "elevonwing" },
  });
  expect(screen.getByText("Hand-launch plan"))
    .toBeInTheDocument();
  expect(screen.getByLabelText("Launch channel")).toHaveValue(null);
  expect(screen.getByLabelText("Launch throttle")).toHaveValue(0.7);
  expect(screen.getByLabelText("Launch climb")).toHaveValue(18);
  expect(screen.getByLabelText("Launch timeout")).toHaveValue(5);

  fireEvent.change(screen.getByLabelText("Launch channel"), {
    target: { value: "8" },
  });
  fireEvent.change(screen.getByLabelText("Launch throttle"), {
    target: { value: "0.65" },
  });
  fireEvent.change(screen.getByLabelText("Launch climb"), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText("Launch timeout"), {
    target: { value: "6" },
  });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    launchChannel: 8,
    launchThrottle: 0.65,
    launchClimbDeg: 20,
    launchTimeoutS: 6,
  }));
  expect(screen.getByText("Hand launch")).toBeInTheDocument();
  expect(screen.getByText("CH 8")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "quadx" },
  });
  expect(screen.queryByLabelText("Launch channel")).not.toBeInTheDocument();
  expect(onChange.mock.calls.at(-1)[0]).toMatchObject({
    airframe: "quadx",
    launchChannel: null,
  });
});

test("board alignment order and angles reach the parent plan", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  expect(screen.getByRole("note", {
    name: "Aerial Kit applies alignment roll, then pitch, then yaw",
  })).toHaveTextContent("1 · RollX axis2 · PitchY axis3 · YawZ axis");
  fireEvent.change(screen.getByLabelText("Alignment roll"), {
    target: { value: "0.5" },
  });
  fireEvent.change(screen.getByLabelText("Alignment pitch"), {
    target: { value: "-1.5" },
  });
  fireEvent.change(screen.getByLabelText("Alignment yaw"), {
    target: { value: "90" },
  });

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ alignRollDeg: 0.5 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ alignPitchDeg: -1.5 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ alignYawDeg: 90 }));
});

test("control-loop request derives its loop timing without claiming the observed rate", () => {
  const onChange = jest.fn();
  render(<FlightControllerSetup onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Requested gyro rate"), {
    target: { value: "3200" },
  });
  fireEvent.change(screen.getByLabelText("Loop divisor"), {
    target: { value: "2" },
  });

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gyroRateHz: 3200 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pidDenom: 2 }));
  const readout = screen.getByRole("status");
  expect(readout).toHaveTextContent("1600 Hz");
  expect(readout).toHaveTextContent("625 µs period");
  expect(readout).toHaveTextContent("Request only");
  expect(screen.getByText(/actual loop timing.*live flight-controller evidence/i))
    .toBeInTheDocument();
});

test("workspace Aerial Kit boards expose workspace switches instead of velocity", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Board profile"), {
    target: { value: "weact-f405" },
  });
  expect(screen.queryByLabelText("Velocity channel")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Manual channel")).toBeInTheDocument();
  expect(screen.getByLabelText("Control channel")).toBeInTheDocument();
  expect(screen.getByLabelText("System-ID channel")).toBeInTheDocument();
  expect(screen.getByText("AK_ARM_NO_IMU")).toBeInTheDocument();
});

test("build motor count mismatch appears before command copying", () => {
  render(<FlightControllerSetup buildMotorCount={4} />);
  fireEvent.change(screen.getByLabelText("Airframe"), {
    target: { value: "elevonwingsingle" },
  });
  expect(screen.getAllByText(/frame has 4 motor mounts.*uses 1/i)).toHaveLength(2);
  expect(screen.getByText(/Resolve \d+ plan blocker.*Aerial Kit preview/i)).toBeInTheDocument();
});

test("standalone FC plan export carries the board-specific wiring checklist", () => {
  const originalBlob = global.Blob;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const blobMock = jest.fn(function MockBlob(parts) {
    this.parts = parts;
  });
  const clickMock = jest.spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  global.Blob = blobMock;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:fc-plan"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });

  try {
    render(
      <FlightControllerSetup
        selectedReceiver={{
          id: "rx-test",
          name: "RadioMaster RP3-H ExpressLRS",
          protocol: "CRSF",
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Board profile"), {
      target: { value: "esp32dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Export plan" }));

    const payload = JSON.parse(blobMock.mock.calls[0][0][0]);
    expect(payload.wiring).toMatchObject({
      documented: true,
      uart: "UART2",
      pins: "GPIO17 TX / GPIO16 RX",
      wiringVerified: false,
    });
    expect(clickMock).toHaveBeenCalledTimes(1);
  } finally {
    clickMock.mockRestore();
    global.Blob = originalBlob;
    if (originalCreateObjectUrl) {
      URL.createObjectURL = originalCreateObjectUrl;
    } else {
      delete URL.createObjectURL;
    }
    if (originalRevokeObjectUrl) {
      URL.revokeObjectURL = originalRevokeObjectUrl;
    } else {
      delete URL.revokeObjectURL;
    }
  }
});
