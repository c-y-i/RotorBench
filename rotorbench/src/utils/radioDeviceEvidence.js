function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function makeCheck(id, label, status, detail) {
  return { id, label, status, detail };
}

export function parseRadioStatusJson(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || !["tx", "rx"].includes(payload.role)
    || !payload.product
    || !payload.firmware_string
  ) {
    throw new Error("The selected JSON is not an ak radio status report.");
  }
  const logicalBaud = finiteNumber(payload.logical_baud, null);
  if (logicalBaud === null || logicalBaud <= 0) {
    throw new Error("The radio status report does not contain a logical baud rate.");
  }
  return {
    kind: "radio-status",
    role: payload.role,
    product: String(payload.product),
    firmware: String(payload.firmware_string),
    firmwareVersion: finiteNumber(payload.firmware_version, null),
    logicalBaud,
    parameterCount: finiteNumber(payload.parameter_count, null),
    parameterVersion: finiteNumber(payload.parameter_version, null),
    hardwareVersion: finiteNumber(payload.hardware_version, null),
  };
}

export function radioStatusChecks(report, {
  role = null,
  expectedBaud = null,
  targetName = null,
  firmwareVersion = null,
} = {}) {
  const expectedFirmware = String(firmwareVersion || "")
    .match(/\d+\.\d+\.\d+/)?.[0] || null;
  return [
    makeCheck(
      "radio-status-role",
      "Radio endpoint role",
      role === null ? "unverified" : report.role === role ? "pass" : "fail",
      role === null
        ? `Imported ${report.role.toUpperCase()} without a selected role.`
        : report.role === role
          ? `Imported ${report.role.toUpperCase()}, matching the selected role.`
          : `Imported ${report.role.toUpperCase()}; the plan expects ${role.toUpperCase()}.`,
    ),
    makeCheck(
      "radio-status-baud",
      "Radio logical baud",
      expectedBaud === null
        ? "unverified"
        : report.logicalBaud === Number(expectedBaud) ? "pass" : "fail",
      expectedBaud === null
        ? `Imported ${report.logicalBaud} baud without an expected value.`
        : report.logicalBaud === Number(expectedBaud)
          ? `Imported ${report.logicalBaud} baud as expected.`
          : `Imported ${report.logicalBaud} baud; the plan expects ${expectedBaud}.`,
    ),
    makeCheck(
      "radio-status-firmware",
      "Radio firmware",
      expectedFirmware === null
        ? "unverified"
        : report.firmware.includes(expectedFirmware) ? "pass" : "fail",
      expectedFirmware === null
        ? `Imported firmware ${report.firmware}; the selected target has no comparable version.`
        : report.firmware.includes(expectedFirmware)
          ? `Imported firmware ${report.firmware}, matching ${expectedFirmware}.`
          : `Imported firmware ${report.firmware}; the plan expects ${expectedFirmware}.`,
    ),
    makeCheck(
      "radio-status-product",
      "Radio product identity",
      !targetName ? "unverified" : report.product === "Aerial Kit Rev A3" && targetName.includes("Rev A3")
        ? "pass"
        : "unverified",
      !targetName
        ? `Imported ${report.product} without a selected target.`
        : report.product === "Aerial Kit Rev A3" && targetName.includes("Rev A3")
          ? "The report identifies Aerial Kit Rev A3, matching the selected Rev A3 target."
          : `Imported ${report.product}; confirm this product against ${targetName}.`,
    ),
  ];
}
