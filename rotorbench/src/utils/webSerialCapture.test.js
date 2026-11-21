import {
  formatSerialChunk,
  hasWebSerial,
  serialCaptureErrorMessage,
} from "./webSerialCapture";

test("Web Serial support requires the explicit port chooser", () => {
  expect(hasWebSerial({ serial: {} })).toBe(false);
  expect(hasWebSerial({ serial: { requestPort: () => {} } })).toBe(true);
  expect(hasWebSerial(null)).toBe(false);
});

test("capture chunks are converted to bounded hexadecimal previews", () => {
  expect(formatSerialChunk(new Uint8Array([0xaa, 0x05, 0xff]))).toEqual({
    length: 3,
    preview: "AA 05 FF",
    suffix: "",
  });
  const large = formatSerialChunk(new Uint8Array(25).fill(0x1a));
  expect(large).toMatchObject({ length: 25, suffix: " …" });
});

test("serial errors retain actionable recovery copy", () => {
  expect(serialCaptureErrorMessage({ name: "NotFoundError" })).toMatch(/No serial port/i);
  expect(serialCaptureErrorMessage({ name: "SecurityError" })).toMatch(/secure Chromium/i);
  expect(serialCaptureErrorMessage({ name: "NetworkError" })).toMatch(/already be in use/i);
});
