import React from "react";
import {
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AerialKitStatusSession from "./AerialKitStatusSession";
import { getA11yViolations } from "../test/a11y";
import { buildAerialKitFrame } from "../utils/aerialKitProtocol";

const originalSerial = navigator.serial;
const HELLO_PAYLOAD_NO_RC = "0161657269616c6b69742d66343035002e003000c1010000920638cf";
const HELLO_PAYLOAD_WITH_RC = "0161657269616c6b69742d66343035002e003000d1010000920638cf";
const STATUS_REPLY = "aa550185160101030b7d00d8ff84038768111f3f0ef90228283c3c8598";

function setSerial(value) {
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value,
  });
}

function bytes(hex) {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

function rcReply() {
  const count = 4;
  const payload = new Uint8Array(4 + count * 2 + 8 + 1 + 28);
  const view = new DataView(payload.buffer);
  payload[0] = 0;
  payload[1] = (1 << 0) | (1 << 2) | (1 << 4);
  payload[2] = 0;
  payload[3] = count;
  [172, 1811, 992, 1000].forEach((value, index) => {
    view.setUint16(4 + index * 2, value, true);
  });
  [-1000, 0, 1000, -500].forEach((value, index) => {
    view.setInt16(12 + index * 2, value, true);
  });
  payload[20] = (1 << 0) | (1 << 1);
  const counters = [1000, 40, 2, 1, 3, 4, 5];
  counters.forEach((value, index) => {
    view.setUint32(21 + index * 4, value, true);
  });
  return buildAerialKitFrame(0x8d, payload);
}

function createPort(helloPayload = HELLO_PAYLOAD_WITH_RC) {
  const waiters = [];
  const queued = [];
  const deliver = (value) => {
    const waiter = waiters.shift();
    if (waiter) waiter({ value, done: false });
    else queued.push(value);
  };
  const reader = {
    read: jest.fn(() => {
      if (queued.length) return Promise.resolve({ value: queued.shift(), done: false });
      return new Promise((resolve) => waiters.push(resolve));
    }),
    cancel: jest.fn(async () => {
      waiters.splice(0).forEach((resolve) => resolve({ value: undefined, done: true }));
    }),
    releaseLock: jest.fn(),
  };
  const writer = {
    write: jest.fn(async (frame) => {
      const command = frame[3];
      if (command === 0x01) {
        deliver(buildAerialKitFrame(0x81, bytes(helloPayload)));
      }
      else if (command === 0x05) deliver(bytes(STATUS_REPLY));
      else if (command === 0x0d) deliver(rcReply());
      else throw new Error(`Unexpected command 0x${command.toString(16)}`);
    }),
    releaseLock: jest.fn(),
  };
  const port = {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    readable: { getReader: jest.fn(() => reader) },
    writable: { getWriter: jest.fn(() => writer) },
  };
  return { port, reader, writer };
}

afterEach(() => {
  setSerial(originalSerial);
});

test("explains when Web Serial is unavailable", () => {
  setSerial(undefined);
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);
  userEvent.click(screen.getByText("Aerial Kit flight status"));

  expect(screen.getByText("Web Serial is unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Connect and monitor" }))
    .not.toBeInTheDocument();
});

test("does not offer AKP queries for a different firmware family", () => {
  setSerial({ requestPort: jest.fn() });
  const { rerender } = render(
    <AerialKitStatusSession firmwareFamily="betaflight" />,
  );
  userEvent.click(screen.getByText("Aerial Kit flight status"));

  expect(screen.getByText(/AKP live status is not available/i))
    .toBeInTheDocument();
  expect(screen.getByText(/selected firmware family is betaflight/i))
    .toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Connect and monitor" }))
    .not.toBeInTheDocument();

  rerender(<AerialKitStatusSession firmwareFamily="aerialkit" />);
  expect(screen.getByRole("button", { name: "Connect and monitor" }))
    .toBeInTheDocument();
});

test("queries HELLO, STATUS, and RC without issuing a mutation command", async () => {
  const { port, reader, writer } = createPort();
  const requestPort = jest.fn().mockResolvedValue(port);
  setSerial({ requestPort });
  const { container } = render(
    <AerialKitStatusSession
      firmwareFamily="aerialkit"
      targetName="Aerial Kit F405"
      channelMap={{ arm: 2, flightMode: 3 }}
    />,
  );

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));

  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  expect(requestPort).toHaveBeenCalledTimes(1);
  expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
  const identity = screen.getByRole("region", {
    name: "Observed Aerial Kit identity",
  });
  expect(within(identity).getByText("aerialkit-f405")).toBeInTheDocument();
  expect(within(identity).getByText("Capability word reported"))
    .toBeInTheDocument();
  expect(within(identity).getByText("Parameter metadata")).toBeInTheDocument();
  expect(screen.getByText("Armed or autonomous")).toBeInTheDocument();
  expect(screen.getByText("armed")).toBeInTheDocument();
  expect(await screen.findByText("CRSF")).toBeInTheDocument();
  expect(await screen.findByText("CH 1")).toBeInTheDocument();
  expect(screen.getByText("CH 2 · Arm")).toBeInTheDocument();
  expect(screen.getByText("CH 3 · Flight mode")).toBeInTheDocument();
  expect(screen.getByText("172")).toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);

  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands.slice(0, 3)).toEqual([0x01, 0x05, 0x0d]);
  expect(commands.every((command) => [0x01, 0x05, 0x0d].includes(command)))
    .toBe(true);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
  await waitFor(() => expect(port.close).toHaveBeenCalled());
  expect(reader.cancel).toHaveBeenCalled();
  expect(reader.releaseLock).toHaveBeenCalled();
  expect(writer.releaseLock).toHaveBeenCalled();
});

test("does not ask for RC when HELLO explicitly omits that capability", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_NO_RC);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));

  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  expect(screen.getByText(/does not claim RC_CHANNELS/i)).toBeInTheDocument();
  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands.slice(0, 2)).toEqual([0x01, 0x05]);
  expect(commands).not.toContain(0x0d);
  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});
