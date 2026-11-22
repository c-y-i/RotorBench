import {
  RECEIVER_PROTOCOLS,
  normalizeSerialPortName,
} from "../data/flightControllerProfiles";

const UNMAPPED_PIN_PATTERN = /not mapped|unknown|not assigned/i;

function hasDocumentedPins(pins) {
  return Boolean(
    pins
    && !UNMAPPED_PIN_PATTERN.test(pins)
    && !/not bundled/i.test(pins),
  );
}

export function buildReceiverWiringPlan(config = {}, profile = {}, receiver = null) {
  const pwmOutputs = Number(receiver?.pwmOutputs) || 0;
  const receiverSerialProtocols = Array.isArray(receiver?.serialProtocols)
    ? receiver.serialProtocols.filter(Boolean)
    : [];
  const pwmOnly = receiver?.outputMode === "pwm"
    || (pwmOutputs > 0 && receiverSerialProtocols.length === 0);
  if (pwmOnly) {
    const steps = [
      {
        id: "pwm-outputs",
        label: "Use documented PWM receiver outputs",
        detail: `${pwmOutputs} PWM output${pwmOutputs === 1 ? "" : "s"} are documented. The manufacturer page does not publish a CRSF or SBUS serial route, so do not infer a flight-controller UART from the receiver's ELRS link. Use the PWM outputs for their documented devices or select a receiver with a documented serial output.`,
      },
      {
        id: "ground",
        label: "Connect signal ground",
        detail: "Confirm a common signal ground between the receiver and every device receiving its PWM outputs.",
      },
      {
        id: "supply",
        label: "Verify receiver supply",
        detail: "Check the documented receiver voltage and current requirements before applying power.",
      },
      {
        id: "continuity",
        label: "Continuity check before power",
        detail: "Props off. Perform continuity and polarity checks before the first powered connection; RotorBench has not tested this wiring.",
      },
    ];
    return {
      protocol: "pwm",
      protocolLabel: "PWM servo outputs",
      outputMode: "pwm-only",
      receiverOutputs: {
        serialProtocols: receiverSerialProtocols,
        pwmOutputs,
      },
      documented: false,
      uart: null,
      pins: `${pwmOutputs} PWM outputs · no serial route published`,
      portDetail: null,
      baud: null,
      receiverName: receiver?.name || "Receiver not selected",
      steps,
      copyText: [
        "# RotorBench receiver wiring checklist - planning only",
        `# Receiver: ${receiver?.name || "Not selected"}`,
        `# Output: ${pwmOutputs} PWM channels; no serial route published`,
        ...steps.map((step, index) => `${index + 1}. ${step.label}: ${step.detail}`),
        "",
        "# Props off. Verify polarity, continuity, receiver supply voltage, and PWM output allocation.",
        "# RotorBench did not test this wiring or establish hardware readiness.",
      ].join("\n"),
      wiringVerified: false,
      scope: "planning continuity checklist; hardware not tested",
    };
  }
  const protocol = RECEIVER_PROTOCOLS.find(
    (item) => item.value === config.receiverProtocol,
  ) || RECEIVER_PROTOCOLS[0];
  const uart = config.receiverUart || profile.receiverUart || "UART not assigned";
  const selectedPort = (profile.serialPorts || []).find(
    (port) => normalizeSerialPortName(port.id) === normalizeSerialPortName(uart),
  );
  const pins = profile.serialPorts?.length
    ? selectedPort?.pins || `Pins not mapped for ${uart}`
    : profile.receiverPins || "Pins not mapped";
  const documented = hasDocumentedPins(pins);
  const baud = config.receiverBaud || protocol.baud || null;
  const steps = [
    {
      id: "signal",
      label: protocol.value === "sbus"
        ? "Receiver SBUS signal to FC RX"
        : "Receiver CRSF TX to FC RX",
      detail: documented
        ? `Route the receiver output to the documented ${uart} pads: ${pins}. Confirm TX/RX direction against the board map before soldering.`
        : `Assign the receiver to ${uart}, then verify the pad mapping before soldering. ${selectedPort?.detail || pins}.`,
    },
  ];

  if (protocol.value === "crsf") {
    steps.push({
      id: "telemetry",
      label: "FC TX to receiver CRSF RX",
      detail: protocol.telemetry
        ? "Wire the return path when receiver telemetry is required, then confirm the receiver accepts the FC UART voltage."
        : "CRSF telemetry is not available on this planned protocol configuration.",
    });
  } else {
    steps.push({
      id: "input-only",
      label: "SBUS is input-only",
      detail: "Do not expect a receiver telemetry return path over SBUS.",
    });
  }

  if (protocol.value === "sbus" && profile.sbusNeedsInverter) {
    steps.push({
      id: "inverter",
      label: "Fit the required SBUS inverter",
      detail: "The documented board path requires an external inverter before the receiver signal reaches the FC RX pin.",
    });
  }

  steps.push(
    {
      id: "ground",
      label: "Connect signal ground",
      detail: "Confirm a common signal ground between receiver and flight controller.",
    },
    {
      id: "supply",
      label: "Verify receiver supply",
      detail: "Check receiver voltage and current requirements against both product documents before applying power.",
    },
    {
      id: "continuity",
      label: "Continuity check before power",
      detail: "Props off. Perform continuity and polarity checks before the first powered connection; RotorBench has not tested this wiring.",
    },
  );

  const copyText = [
    "# RotorBench receiver wiring checklist - planning only",
    `# Receiver: ${receiver?.name || "Not selected"}`,
    `# FC route: ${uart} | ${pins} | ${baud || "rate not set"} baud`,
    `# Protocol: ${protocol.label}`,
    ...(pwmOutputs > 0 && receiverSerialProtocols.length > 0
      ? [
          `# Receiver outputs: ${receiverSerialProtocols.join(" / ")} serial; ${pwmOutputs} PWM outputs also documented`,
          "# Flight control is planned through the serial route. PWM allocations are not assigned by RotorBench.",
        ]
      : []),
    ...steps.map((step, index) => `${index + 1}. ${step.label}: ${step.detail}`),
    "",
    "# Props off. Verify polarity, continuity, receiver supply voltage, and TX/RX direction.",
    "# RotorBench did not test this wiring or establish hardware readiness.",
  ].join("\n");

  return {
    protocol: protocol.value,
    protocolLabel: protocol.label,
    outputMode: pwmOutputs > 0 && receiverSerialProtocols.length > 0
      ? "serial-pwm"
      : "serial",
    receiverOutputs: {
      serialProtocols: receiverSerialProtocols,
      pwmOutputs,
    },
    documented,
    uart,
    pins,
    portDetail: selectedPort?.detail || null,
    baud,
    receiverName: receiver?.name || "Receiver not selected",
    steps,
    copyText,
    wiringVerified: false,
    scope: "planning continuity checklist; hardware not tested",
  };
}
