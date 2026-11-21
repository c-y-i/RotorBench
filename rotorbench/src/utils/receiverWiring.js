import { RECEIVER_PROTOCOLS } from "../data/flightControllerProfiles";

const UNMAPPED_PIN_PATTERN = /not mapped|unknown|not assigned/i;

function hasDocumentedPins(profile) {
  return Boolean(
    profile?.receiverUart
    && profile?.receiverPins
    && !UNMAPPED_PIN_PATTERN.test(profile.receiverPins),
  );
}

export function buildReceiverWiringPlan(config = {}, profile = {}, receiver = null) {
  const protocol = RECEIVER_PROTOCOLS.find(
    (item) => item.value === config.receiverProtocol,
  ) || RECEIVER_PROTOCOLS[0];
  const documented = hasDocumentedPins(profile);
  const uart = config.receiverUart || profile.receiverUart || "UART not assigned";
  const pins = profile.receiverPins || "Pins not mapped";
  const baud = config.receiverBaud || protocol.baud || null;
  const steps = [
    {
      id: "signal",
      label: protocol.value === "sbus"
        ? "Receiver SBUS signal to FC RX"
        : "Receiver CRSF TX to FC RX",
      detail: `Route the receiver output to the documented ${uart} pads: ${pins}. Confirm TX/RX direction against the board map before soldering.`,
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
    ...steps.map((step, index) => `${index + 1}. ${step.label}: ${step.detail}`),
    "",
    "# Props off. Verify polarity, continuity, receiver supply voltage, and TX/RX direction.",
    "# RotorBench did not test this wiring or establish hardware readiness.",
  ].join("\n");

  return {
    protocol: protocol.value,
    protocolLabel: protocol.label,
    documented,
    uart,
    pins,
    baud,
    receiverName: receiver?.name || "Receiver not selected",
    steps,
    copyText,
    wiringVerified: false,
    scope: "planning continuity checklist; hardware not tested",
  };
}
