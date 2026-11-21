import { fireEvent, render, screen, within } from "@testing-library/react";
import FlightControllerSetup from "./FlightControllerSetup";

test("renders a local flight-controller configuration plan", () => {
  render(<FlightControllerSetup />);
  expect(screen.getByRole("heading", { name: "Flight controller" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Flight controller sections" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sensor" })).toBeInTheDocument();
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
  expect(screen.getByRole("heading", { name: "Sensor and power" })).toBeInTheDocument();
  expect(screen.getByLabelText("Alignment roll")).toHaveValue(0);
  expect(screen.getByLabelText("Alignment pitch")).toHaveValue(0);
  expect(screen.getByLabelText("Alignment yaw")).toHaveValue(0);
  expect(screen.getByLabelText("Requested gyro rate")).toHaveValue(0);
  expect(screen.getByLabelText("Loop divisor")).toHaveValue(1);
  expect(screen.getByRole("status")).toHaveTextContent("Driver default");
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

test("choosing Betaflight switches to its documented bench channel preset", () => {
  render(<FlightControllerSetup />);
  fireEvent.change(screen.getByLabelText("Firmware family"), {
    target: { value: "betaflight" },
  });
  expect(screen.getByLabelText("Arm channel")).toHaveValue(5);
  expect(screen.getByLabelText("Flight-mode channel")).toHaveValue(null);
  expect(screen.getByLabelText("Mapping preset")).toHaveValue("betaflight-bench");
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

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fenceEnabled: true }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fenceRadiusM: 250 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fenceCeilingM: 120 }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rthMinAltM: 30 }));
  expect(screen.getByText(/not a stick clamp/i)).toBeInTheDocument();
  expect(screen.getByText(/holds 10 m below the lid/i)).toBeInTheDocument();
  expect(screen.getByText(/fused altitude estimate, not GPS alone/i)).toBeInTheDocument();
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
