function result(status, message, label) {
  return { status, message, label };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasVoltageRange(component) {
  return Boolean(
    component?.voltage
    && finiteNumber(component.voltage.min) != null
    && finiteNumber(component.voltage.max) != null,
  );
}

export function checkPropellerClearance(propeller, frame) {
  const label = propeller?.name ? `${propeller.name} frame clearance` : "Propeller frame clearance";
  const propSize = finiteNumber(propeller?.size);
  const maxPropSize = finiteNumber(frame?.maxPropSize);
  if (propSize == null || maxPropSize == null) {
    return result(
      "unknown",
      "Select a frame and propeller with catalogued diameter limits.",
      label,
    );
  }
  if (propSize <= maxPropSize) {
    return result(
      "compatible",
      `${propSize}" propeller fits the ${maxPropSize}" maximum for ${frame.name}.`,
      label,
    );
  }
  return result(
    "conflict",
    `${propeller.name} is ${propSize}", above the ${maxPropSize}" maximum for ${frame.name}.`,
    label,
  );
}

export function checkMotorVoltage(motor, battery) {
  const label = motor?.name ? `${motor.name} voltage` : "Motor voltage";
  if (!hasVoltageRange(motor) || finiteNumber(battery?.voltage) == null) {
    return result(
      "unknown",
      "Select a motor with a voltage range and a battery with catalogued voltage.",
      label,
    );
  }
  const minimum = Number(motor.voltage.min);
  const maximum = Number(motor.voltage.max);
  const voltage = Number(battery.voltage);
  if (voltage >= minimum && voltage <= maximum) {
    return result(
      "compatible",
      `${battery.voltage} V battery is inside the ${minimum}-${maximum} V motor range.`,
      label,
    );
  }
  return result(
    "conflict",
    `${battery.name} is ${battery.voltage} V; ${motor.name} accepts ${minimum}-${maximum} V.`,
    label,
  );
}

export function checkEscVoltage(esc, battery) {
  const label = esc?.name ? `${esc.name} voltage` : "ESC voltage";
  if (!hasVoltageRange(esc) || finiteNumber(battery?.voltage) == null) {
    return result(
      "unknown",
      "Select an ESC with a voltage range and a battery with catalogued voltage.",
      label,
    );
  }
  const minimum = Number(esc.voltage.min);
  const maximum = Number(esc.voltage.max);
  const voltage = Number(battery.voltage);
  if (voltage >= minimum && voltage <= maximum) {
    return result(
      "compatible",
      `${battery.voltage} V battery is inside the ${minimum}-${maximum} V ESC range.`,
      label,
    );
  }
  return result(
    "conflict",
    `${battery.name} is ${battery.voltage} V; ${esc.name} accepts ${minimum}-${maximum} V.`,
    label,
  );
}

export function checkEscCurrent(esc, motor) {
  const label = esc?.name ? `${esc.name} current` : "ESC current";
  const rating = finiteNumber(esc?.currentRating);
  const motorMaximum = finiteNumber(motor?.maxCurrent);
  if (rating == null || motorMaximum == null) {
    return result(
      "unknown",
      "Select an ESC current rating and a motor maximum current.",
      label,
    );
  }
  if (rating >= motorMaximum) {
    return result(
      "compatible",
      `${esc.currentRating} A continuous ESC rating covers the ${motor.maxCurrent} A motor maximum.`,
      label,
    );
  }
  return result(
    "conflict",
    `${esc.name} is rated for ${esc.currentRating} A continuous; ${motor.name} lists ${motor.maxCurrent} A maximum.`,
    label,
  );
}

export function checkFlightControllerVoltage(flightController, battery) {
  const label = flightController?.name
    ? `${flightController.name} input voltage`
    : "Flight controller input voltage";
  const maximum = finiteNumber(flightController?.maxVoltage);
  const voltage = finiteNumber(battery?.voltage);
  if (maximum == null || voltage == null) {
    return result(
      "unknown",
      "Select a flight controller input limit and a battery with catalogued voltage.",
      label,
    );
  }
  if (voltage <= maximum) {
    return result(
      "compatible",
      `${battery.voltage} V battery is within the ${maximum} V flight-controller limit.`,
      label,
    );
  }
  return result(
    "conflict",
    `${battery.name} is ${battery.voltage} V; ${flightController.name} accepts up to ${maximum} V.`,
    label,
  );
}

export function electricalChecksFor(selected = {}) {
  return [
    checkPropellerClearance(selected.propeller, selected.frame),
    checkMotorVoltage(selected.motor, selected.battery),
    checkEscVoltage(selected.esc, selected.battery),
    checkEscCurrent(selected.esc, selected.motor),
    checkFlightControllerVoltage(selected.flightController, selected.battery),
  ];
}

export function summarizeElectricalChecks(checks) {
  const uniqueChecks = Array.from(
    new Map(
      checks.map((item) => [`${item.status}:${item.label}:${item.message}`, item]),
    ).values(),
  );
  const conflict = uniqueChecks.find((item) => item.status === "conflict");
  if (conflict) {
    return { ok: false, verified: false, reason: conflict.message };
  }
  const compatible = uniqueChecks.filter((item) => item.status === "compatible");
  const unknown = uniqueChecks.filter((item) => item.status === "unknown");
  if (unknown.length === 0 && compatible.length > 0) {
    return {
      ok: true,
      verified: true,
      reason: compatible.map((item) => item.message).join(" "),
    };
  }
  return {
    ok: true,
    verified: false,
    reason:
      [...compatible, ...unknown]
        .map((item) => item.message)
        .slice(0, 2)
        .join(" ") || "No electrical checks apply to this selection.",
  };
}
