import {
  RADIO_HOST_TRANSPORTS,
  getRadioTarget,
} from "../data/radioProfiles";

function transportOption(value) {
  return RADIO_HOST_TRANSPORTS.find((option) => option.value === value)
    || RADIO_HOST_TRANSPORTS.find((option) => option.value === "unspecified");
}

export function buildRadioEndpointPlan(config = {}, target = null) {
  const radioTarget = target || getRadioTarget(config.targetId);
  const role = config.role === "rx" ? "rx" : "tx";
  const roleLabel = role === "tx" ? "transmitter" : "receiver";
  const hostTransport = config.hostTransport || "unspecified";
  const transport = transportOption(hostTransport);
  const hostUart = radioTarget.hostLink?.uart || null;
  const moduleBay = radioTarget.hostLink?.moduleBay || null;
  const documented = hostTransport === "native-usb"
    ? Boolean(radioTarget.hostLink?.nativeUsb)
    : hostTransport === "uart"
      ? Boolean(hostUart)
      : hostTransport === "module-bay"
        ? Boolean(moduleBay)
        : false;
  const steps = [
    {
      id: "role",
      label: `Confirm the ${roleLabel} role`,
      detail: role === "tx"
        ? "Verify the target is running the transmitter image and that its physical role selector agrees."
        : "Verify the target is running the receiver image and that its physical role selector agrees.",
    },
    {
      id: "antenna",
      label: "Fit the antenna or RF load",
      detail: "Do this before powering either endpoint. RotorBench cannot detect whether an antenna is fitted.",
    },
  ];

  if (hostTransport === "native-usb") {
    steps.push({
      id: "host-usb",
      label: "Use the target's native USB data port",
      detail: radioTarget.hostLink?.nativeUsb
        ? "Open the device's USB CDC endpoint. Native USB ignores the logical host UART baud setting; confirm the port belongs to the selected role."
        : "This target's native USB capability is not documented in the bundled profile. Confirm the transport in its firmware documentation.",
    });
  } else if (hostTransport === "uart") {
    steps.push({
      id: "host-uart",
      label: "Wire the documented host UART",
      detail: hostUart
        ? `${hostUart.pins} at ${hostUart.baud} baud, ${hostUart.frame}. Confirm logic level, ground, and TX/RX crossing before powering.`
        : "No host UART pin map is bundled. Verify baud, framing, logic level, ground, and TX/RX direction in the target documentation.",
    });
  } else if (hostTransport === "module-bay") {
    steps.push({
      id: "host-module-bay",
      label: "Verify the handset module-bay interface",
      detail: moduleBay
        ? `${moduleBay.pins}; supply ${moduleBay.voltage}. Confirm the handset pinout, ground, CRSF direction, and whether the module is seated without forcing the bay.`
        : "The target's handset module-bay pinout is not bundled. Verify the connector, supply voltage, ground, and CRSF direction before powering.",
    });
  } else {
    steps.push({
      id: "host-unknown",
      label: "Verify the host transport",
      detail: "Choose native USB or UART after checking the selected target's firmware and hardware documentation.",
    });
  }

  if (role === "rx") {
    steps.push({
      id: "fc-uart",
      label: "Keep the RX-to-FC path separate",
      detail: "The receiver-to-flight-controller CRSF UART is normally 420000 baud. Do not reuse a 400000-baud host UART assumption.",
    });
  }

  steps.push({
    id: "rf-observation",
    label: "Observe the RF path",
    detail: "A USB command, transmitted frame, or completed file does not prove RF. Observe receiver RC frames and link statistics before claiming a link.",
  });

  const copyText = [
    "# RotorBench radio endpoint checklist - planning only",
    `# Target: ${radioTarget.name}`,
    `# Role: ${roleLabel}`,
    `# Host transport: ${transport.label}`,
    ...steps.map((step, index) => `${index + 1}. ${step.label}: ${step.detail}`),
    "",
    "# Props off. Antenna or RF load fitted. RotorBench did not test RF or hardware state.",
  ].join("\n");

  return {
    targetId: radioTarget.id,
    targetName: radioTarget.name,
    role,
    roleLabel,
    hostTransport,
    hostTransportLabel: transport.label,
    hostTransportNote: transport.note,
    documented,
    steps,
    copyText,
    rfVerified: false,
    hardwareVerified: false,
    scope: "planning endpoint checklist; RF and hardware not tested",
  };
}
