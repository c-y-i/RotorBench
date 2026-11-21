import {
  parseRadioStatusJson,
  radioStatusChecks,
} from "./radioDeviceEvidence";

const status = {
  path: "/dev/ttyACM0",
  usb_serial: "SER123",
  logical_baud: 400000,
  role: "tx",
  product: "Aerial Kit Rev A3",
  origin: 238,
  destination: 234,
  firmware_version: 262400,
  firmware_string: "4.1.0",
  parameter_count: 12,
  parameter_version: 0,
  device_serial: 305419896,
  hardware_version: 1,
};

test("normalizes radio status without retaining paths or serial identities", () => {
  const report = parseRadioStatusJson(status);

  expect(report).toMatchObject({
    kind: "radio-status",
    role: "tx",
    product: "Aerial Kit Rev A3",
    firmware: "4.1.0",
    logicalBaud: 400000,
  });
  expect(JSON.stringify(report)).not.toContain("/dev/tty");
  expect(JSON.stringify(report)).not.toContain("SER123");
  expect(JSON.stringify(report)).not.toContain("305419896");
});

test("correlates role, baud, firmware, and Rev A3 product identity", () => {
  const checks = radioStatusChecks(parseRadioStatusJson(status), {
    role: "tx",
    expectedBaud: 400000,
    targetName: "Aerial Kit ELRS USB TX Rev A3",
    firmwareVersion: "ExpressLRS 4.1.0",
  });

  expect(checks.map((check) => check.status)).toEqual(["pass", "pass", "pass", "pass"]);
});

test("wrong role and baud fail closed", () => {
  const checks = radioStatusChecks(parseRadioStatusJson(status), {
    role: "rx",
    expectedBaud: 420000,
  });

  expect(checks.find((check) => check.id === "radio-status-role").status).toBe("fail");
  expect(checks.find((check) => check.id === "radio-status-baud").status).toBe("fail");
});

test("malformed radio status reports are rejected", () => {
  expect(() => parseRadioStatusJson({ role: "tx", product: "x" }))
    .toThrow(/ak radio status/i);
});
