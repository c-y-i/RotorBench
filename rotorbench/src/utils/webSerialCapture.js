export const SERIAL_CAPTURE_BAUD_RATES = [
  { value: 420000, label: "420000 · RX to FC" },
  { value: 400000, label: "400000 · Host to Rev A3 TX" },
  { value: 115200, label: "115200" },
  { value: 57600, label: "57600" },
];

export function hasWebSerial(
  navigatorObject = typeof navigator !== "undefined" ? navigator : null,
) {
  return Boolean(
    navigatorObject?.serial
    && typeof navigatorObject.serial.requestPort === "function",
  );
}

export function formatSerialChunk(value) {
  const bytes = value instanceof Uint8Array
    ? value
    : new Uint8Array(value || []);
  const preview = Array.from(bytes.slice(0, 24))
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
  return {
    length: bytes.length,
    preview,
    suffix: bytes.length > 24 ? " …" : "",
  };
}

export function serialCaptureErrorMessage(error) {
  if (error?.name === "NotFoundError") {
    return "No serial port was selected.";
  }
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Serial access was denied. Use a secure Chromium page and select a port explicitly.";
  }
  if (error?.name === "NetworkError" || error?.name === "InvalidStateError") {
    return "The serial port could not be opened. It may already be in use.";
  }
  return error?.message || "The serial capture stopped unexpectedly.";
}
