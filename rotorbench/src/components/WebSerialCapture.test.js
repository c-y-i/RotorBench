import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WebSerialCapture from "./WebSerialCapture";

const originalSerial = navigator.serial;

function setSerial(value) {
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value,
  });
}

function crc8(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0xd5) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

function rcFrame(channels) {
  const payload = new Uint8Array(22);
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const channel of channels) {
    accumulator |= channel << bits;
    bits += 11;
    while (bits >= 8) {
      payload[offset] = accumulator & 0xff;
      offset += 1;
      accumulator >>>= 8;
      bits -= 8;
    }
  }
  if (bits > 0) payload[offset] = accumulator & 0xff;
  const body = [0x16, ...payload];
  return [0xc8, 0x18, ...body, crc8(body)];
}

afterEach(() => {
  setSerial(originalSerial);
});

test("explains the read-only boundary when Web Serial is unavailable", () => {
  setSerial(undefined);
  render(<WebSerialCapture />);

  expect(screen.getByText("Web Serial is unavailable")).toBeInTheDocument();
  expect(screen.getByText(/never writes commands/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open port" })).not.toBeInTheDocument();
});

test("opens and stops two explicitly selected endpoints from one session command", async () => {
  const makePort = () => {
    let finishRead;
    const reader = {
      read: jest.fn(() => new Promise((resolve) => {
        finishRead = resolve;
      })),
      cancel: jest.fn(async () => finishRead?.({ value: undefined, done: true })),
      releaseLock: jest.fn(),
    };
    return {
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      readable: { getReader: jest.fn(() => reader) },
      reader,
    };
  };
  const txPort = makePort();
  const rxPort = makePort();
  const requestPort = jest.fn()
    .mockResolvedValueOnce(txPort)
    .mockResolvedValueOnce(rxPort);
  setSerial({ requestPort });
  const txCapture = React.createRef();
  const rxCapture = React.createRef();
  render(
    <>
      <WebSerialCapture ref={txCapture} expectedBaud={400000} role="tx" syncMode />
      <WebSerialCapture ref={rxCapture} expectedBaud={420000} role="rx" syncMode />
    </>,
  );

  await act(async () => {
    expect(await txCapture.current.preparePort()).toBe(true);
    expect(await rxCapture.current.preparePort()).toBe(true);
  });
  expect(requestPort).toHaveBeenCalledTimes(2);

  await act(async () => {
    const results = await Promise.all([
      txCapture.current.startCapture(),
      rxCapture.current.startCapture(),
    ]);
    expect(results).toEqual([true, true]);
  });
  expect(txPort.open).toHaveBeenCalledWith({ baudRate: 400000 });
  expect(rxPort.open).toHaveBeenCalledWith({ baudRate: 420000 });

  await act(async () => {
    const results = await Promise.all([
      txCapture.current.stopCapture(),
      rxCapture.current.stopCapture(),
    ]);
    expect(results).toEqual([true, true]);
  });
  await waitFor(() => expect(txPort.close).toHaveBeenCalled());
  await waitFor(() => expect(rxPort.close).toHaveBeenCalled());
  expect(txPort.reader.cancel).toHaveBeenCalledTimes(1);
  expect(rxPort.reader.cancel).toHaveBeenCalledTimes(1);
});

test("captures bytes only after an explicit port selection and never writes", async () => {
  let finishRead;
  const captured = Uint8Array.from([
    ...Buffer.from("c81816e0031ff8c0073ef0810f7ce0031ff8c0073ef0810f7cad", "hex"),
    ...rcFrame([172, 950, 992, 1811, 992, 992, 992, 992, 992, 992, 992, 992, 992, 992, 992, 992]),
    ...rcFrame([1811, 992, 1000, 170, 992, 992, 992, 992, 992, 992, 992, 992, 992, 992, 992, 992]),
    ...Buffer.from(
      "ea0c145a5c5807010203504604d7" +
      "ea081e03e8ec782ee084" +
      "ea0a0800a8007b0005dc58d1" +
      "ea06092be2ff0688" +
      "ea11021c4050a80517b6000168232805aa0cbd" +
      "ea0821414e474c450087",
      "hex",
    ),
  ]);
  const reader = {
    read: jest.fn()
      .mockResolvedValueOnce({
        value: captured,
        done: false,
      })
      .mockImplementationOnce(() => new Promise((resolve) => {
        finishRead = resolve;
      })),
    cancel: jest.fn(async () => finishRead?.({ value: undefined, done: true })),
    releaseLock: jest.fn(),
  };
  const writer = { write: jest.fn() };
  const port = {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    readable: { getReader: jest.fn(() => reader) },
    writable: { getWriter: jest.fn(() => writer) },
  };
  const requestPort = jest.fn().mockResolvedValue(port);
  setSerial({ requestPort });
  render(
    <React.StrictMode>
      <WebSerialCapture
        expectedBaud={420000}
        role="rx"
        targetName="Aerial Kit ELRS USB TX Rev A3"
        channelMap={{ arm: 5, flightMode: 6, velocity: null }}
        receiverCalibration={{
          min: 172,
          mid: 992,
          max: 1811,
          deadband: 0.02,
        }}
      />
    </React.StrictMode>,
  );

  await userEvent.click(screen.getByText("Live serial capture"));
  await userEvent.click(screen.getByRole("button", { name: "Open port" }));
  await waitFor(() => expect(port.open).toHaveBeenCalled());

  expect(requestPort).toHaveBeenCalledTimes(1);
  expect(port.open).toHaveBeenCalledWith({ baudRate: 420000 });
  expect(await screen.findByLabelText(/^Channel 1 raw 1811/)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Arm channel 5 raw 992/)).toHaveTextContent(
    "Arm · CH 5",
  );
  expect(screen.getByLabelText(/^Flight mode channel 6 raw 992/)).toHaveTextContent(
    "Flight mode · CH 6",
  );
  expect(screen.getByText(/Plan context: RX · Aerial Kit ELRS USB TX Rev A3/))
    .toBeInTheDocument();
  expect(screen.getByLabelText("CRSF parser health")).toHaveTextContent(
    "Framing errors",
  );
  expect(screen.getByText(`${captured.length} bytes received`)).toBeInTheDocument();
  expect(screen.getByText("9 valid · 0 CRC errors")).toBeInTheDocument();
  expect(screen.getByText("88%")).toBeInTheDocument();
  expect(screen.getByText("-90 dBm")).toBeInTheDocument();
  expect(screen.getByText("Armed state unknown")).toBeInTheDocument();
  expect(screen.getByText(/cannot prove the aircraft is disarmed/i))
    .toBeInTheDocument();
  expect(screen.getByText("ANGLE")).toBeInTheDocument();
  expect(screen.getByRole("img", {
    name: /observed serial attitude.*read-only observation, not flight verification/i,
  })).toBeInTheDocument();
  expect(screen.getByText(/16\.8 V · 12\.3 A/)).toBeInTheDocument();
  expect(screen.getByText(/88% · 1500 mAh/)).toBeInTheDocument();
  expect(screen.getByText(/12 sats · 10\.0 m\/s/)).toBeInTheDocument();
  const ladder = screen.getByRole("list", {
    name: "CRSF observation evidence stages",
  });
  expect(within(ladder).getByText("Port opened")).toBeInTheDocument();
  expect(within(ladder).getByText("Valid CRSF frames")).toBeInTheDocument();
  expect(within(ladder).getByText("RC observed")).toBeInTheDocument();
  expect(within(ladder).getByText("Link stats observed")).toBeInTheDocument();
  expect(within(ladder).getByText("Telemetry observed")).toBeInTheDocument();
  expect(within(ladder).getByText("RF path not verified")).toBeInTheDocument();
  expect(screen.getByText(/Last valid frame .* s ago/)).toBeInTheDocument();
  const calibration = screen.getByRole("region", {
    name: "Receiver calibration observation",
  });
  expect(within(calibration).getByText("16/16")).toBeInTheDocument();
  expect(within(calibration).getAllByText("1")).toHaveLength(3);
  expect(within(calibration).getByText("13")).toBeInTheDocument();
  expect(within(calibration).getByText(/does not apply calibration values/i))
    .toBeInTheDocument();
  expect(screen.getByText("Full planned range · 172–1811")).toBeInTheDocument();
  expect(screen.getByText("Outside plan · 170–1811")).toBeInTheDocument();
  expect(port.writable.getWriter).not.toHaveBeenCalled();

  const createObjectURL = jest.fn(() => "blob:crsf-evidence");
  const revokeObjectURL = jest.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await userEvent.click(screen.getByRole("button", { name: "Download evidence" }));
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(anchorClick).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:crsf-evidence");
  expect(screen.getByRole("status")).toHaveTextContent(/without raw bytes, port identity/i);

  await userEvent.click(screen.getByRole("button", { name: "Stop capture" }));
  await waitFor(() => expect(port.close).toHaveBeenCalled());
  expect(reader.cancel).toHaveBeenCalled();
  expect(reader.releaseLock).toHaveBeenCalled();
  expect(writer.write).not.toHaveBeenCalled();
});

test("exports a stopped capture even when no valid frames arrived", async () => {
  let finishRead;
  const reader = {
    read: jest.fn(() => new Promise((resolve) => {
      finishRead = resolve;
    })),
    cancel: jest.fn(async () => finishRead?.({ value: undefined, done: true })),
    releaseLock: jest.fn(),
  };
  const port = {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    readable: { getReader: jest.fn(() => reader) },
  };
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(
    <WebSerialCapture
      expectedBaud={400000}
      role="tx"
      targetName="Aerial Kit ELRS USB TX Rev A3"
      channelMap={{ arm: 5, flightMode: 6 }}
    />,
  );

  await userEvent.click(screen.getByText("Live serial capture"));
  expect(screen.getByLabelText("Logical baud")).toHaveValue("400000");
  await userEvent.click(screen.getByRole("button", { name: "Open port" }));
  await waitFor(() => expect(port.open).toHaveBeenCalledWith({ baudRate: 400000 }));
  expect(screen.getByRole("button", { name: "Download evidence" })).toBeDisabled();

  await userEvent.click(screen.getByRole("button", { name: "Stop capture" }));
  await waitFor(() => expect(port.close).toHaveBeenCalled());
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Download evidence" })).toBeEnabled();
  });

  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:crsf-failure"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
  await userEvent.click(screen.getByRole("button", { name: "Download evidence" }));
  expect(click).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveTextContent(/without raw bytes, port identity/i);
  click.mockRestore();
});
