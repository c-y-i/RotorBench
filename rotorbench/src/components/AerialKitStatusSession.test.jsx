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
const HELLO_PAYLOAD_TWO_PARAMETERS = "0161657269616c6b69742d663430350002003000f1010000920638cf";
const HELLO_PAYLOAD_WITH_PREFLIGHT = "0161657269616c6b69742d663430350002003000f1030000920638cf";
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
      else if (command === 0x02) {
        const index = frame[5];
        const name = index === 0 ? "rate_kp_roll" : "rate_ki_roll";
        const value = index === 0 ? "0.250" : "1.500";
        deliver(buildAerialKitFrame(
          0x82,
          Uint8Array.from([0, ...Buffer.from(`${name}\0${value}\0`)]),
        ));
      }
      else if (command === 0x0a) {
        const first = frame[5];
        const entries = [
          {
            name: "rate_kp_roll",
            min: "0.000",
            max: "3.000",
            defaultValue: "0.250",
          },
          {
            name: "rate_ki_roll",
            min: "0.000",
            max: "2.000",
            defaultValue: "0.150",
          },
        ].slice(first, first + 2);
        const payload = [
          0,
          first,
          entries.length,
          ...entries.flatMap((entry) => [
            ...Buffer.from(`${entry.name}\0`),
            0,
            1,
            3,
            0,
            ...Buffer.from(`${entry.min}\0`),
            ...Buffer.from(`${entry.max}\0`),
            ...Buffer.from(`${entry.defaultValue}\0`),
          ]),
        ];
        deliver(buildAerialKitFrame(0x8a, Uint8Array.from(payload)));
      }
      else if (command === 0x0b) {
        const field = frame[5];
        const offset = frame[6] | (frame[7] << 8);
        const text = Buffer.from(
          field === 0
            ? "Rate-loop proportional gain."
            : "Rate-loop integral gain.",
        );
        const chunk = text.slice(offset);
        const payload = Uint8Array.from([
          0,
          field,
          offset & 0xff,
          (offset >> 8) & 0xff,
          text.length & 0xff,
          (text.length >> 8) & 0xff,
          chunk.length,
          ...chunk,
        ]);
        deliver(buildAerialKitFrame(0x8b, payload));
      }
      else if (command === 0x0e) {
        const topic = frame[5];
        if (topic === 0) {
          const body = new Uint8Array(46);
          const view = new DataView(body.buffer);
          body.set(Buffer.from("BMI270"), 0);
          [0, 0, 1000, 2, 3, 4].forEach((value, index) => {
            view.setInt16(14 + index * 2, value, true);
          });
          deliver(buildAerialKitFrame(
            0x8e,
            Uint8Array.from([0, 0, 1, ...body]),
          ));
        } else if (topic === 2) {
          deliver(buildAerialKitFrame(0x8e, Uint8Array.of(1, 2, 0)));
        } else {
          deliver(buildAerialKitFrame(0x8e, Uint8Array.of(0, topic, 0)));
        }
      }
      else if (command === 0x0f) {
        const payload = [
          0,
          2,
          1,
          1,
          15,
          0, 0, 0, 0, 0, 0, 0,
          1, 0, 1, 12, 0, 0xf4, 0x01,
        ];
        deliver(buildAerialKitFrame(0x8f, Uint8Array.from(payload)));
      }
      else if (command === 0x12) {
        const index = frame[5];
        const offset = frame[6] | (frame[7] << 8);
        const entries = [
          {
            name: "clock",
            verdict: 1,
            detail: "clock on the crystal",
          },
          {
            name: "receiver",
            verdict: 2,
            detail: "receiver: 8412 bytes, 401 frames",
          },
        ];
        const entry = entries[index];
        if (!entry) {
          deliver(buildAerialKitFrame(
            0x92,
            Uint8Array.from([1, index, entries.length]),
          ));
        } else {
          const sentence = Buffer.from(entry.detail);
          const chunk = sentence.subarray(offset, offset + 7);
          deliver(buildAerialKitFrame(
            0x92,
            Uint8Array.from([
              0,
              index,
              entries.length,
              entry.verdict,
              entry.name.length,
              ...Buffer.from(entry.name),
              sentence.length & 0xff,
              (sentence.length >> 8) & 0xff,
              chunk.length,
              ...chunk,
            ]),
          ));
        }
      }
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
  const onObservation = jest.fn();
  setSerial({ requestPort });
  const { container } = render(
    <AerialKitStatusSession
      firmwareFamily="aerialkit"
      targetName="Aerial Kit F405"
      channelMap={{ arm: 2, flightMode: 3 }}
      onObservation={onObservation}
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
  expect(onObservation).toHaveBeenCalledWith(expect.objectContaining({
    active: true,
    status: expect.objectContaining({ flightState: 1 }),
  }));

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
  await waitFor(() => expect(port.close).toHaveBeenCalled());
  expect(reader.cancel).toHaveBeenCalled();
  expect(reader.releaseLock).toHaveBeenCalled();
  expect(writer.releaseLock).toHaveBeenCalled();
  expect(onObservation).toHaveBeenLastCalledWith(expect.objectContaining({
    active: false,
  }));
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

test("reads a bounded parameter inventory with PARAM_GET only", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_TWO_PARAMETERS);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read parameter values",
  }));

  expect(await screen.findByText(/2 values read.*metadata/i)).toBeInTheDocument();
  expect(screen.getByText("rate_kp_roll")).toBeInTheDocument();
  expect(screen.getByText("0.250")).toBeInTheDocument();
  expect(screen.getByText("rate_ki_roll")).toBeInTheDocument();
  expect(screen.getByText("1.500")).toBeInTheDocument();
  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands.filter((command) => command === 0x02)).toHaveLength(2);
  expect(commands.every((command) => [0x01, 0x02, 0x05, 0x0d].includes(command)))
    .toBe(true);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads capability-gated parameter metadata without requesting help", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_TWO_PARAMETERS);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read ranges/defaults",
  }));

  expect(await screen.findByText("rate_kp_roll")).toBeInTheDocument();
  expect(screen.getByText(/rates · float · 0\.000 to 3\.000 · default 0\.250/i))
    .toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read descriptions",
  }));
  expect(await screen.findByText("Rate-loop proportional gain."))
    .toBeInTheDocument();
  expect(screen.getByText("Rate-loop integral gain.")).toBeInTheDocument();
  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands).toContain(0x0a);
  expect(commands).toContain(0x0b);
  expect(commands).not.toContain(0x2d);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads sensor presence and output descriptors without testing outputs", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_TWO_PARAMETERS);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  expect(screen.getByRole("button", {
    name: "Read preflight checklist",
  })).toBeDisabled();

  await userEvent.click(screen.getByRole("button", {
    name: "Read sensor presence",
  }));
  expect(await screen.findByText("Present")).toBeInTheDocument();
  expect(screen.getByText("BMI270")).toBeInTheDocument();
  expect(screen.getByText("0 / 0 / 1000 mg")).toBeInTheDocument();
  expect(screen.getByText("2 / 3 / 4 mrad/s")).toBeInTheDocument();
  expect(screen.getByText("No such topic")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read output map",
  }));
  expect(await screen.findByText("1 motor · 1 servo · 15% test cap"))
    .toBeInTheDocument();
  expect(screen.getByText("motor 0")).toBeInTheDocument();
  expect(screen.getByText(/reversed · trim 12 µs · travel 500 µs/))
    .toBeInTheDocument();

  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands).toContain(0x0e);
  expect(commands).toContain(0x0f);
  expect(commands).not.toContain(0x10);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads the board preflight checklist without issuing a state change", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_PREFLIGHT);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read preflight checklist",
  }));
  expect(await screen.findByText("clock on the crystal")).toBeInTheDocument();
  expect(screen.getByText("receiver: 8412 bytes, 401 frames"))
    .toBeInTheDocument();
  expect(screen.getByText("0 fail · 1 pass · 1 reading")).toBeInTheDocument();
  expect(screen.getByText("Board preflight checklist")).toBeInTheDocument();

  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands).toContain(0x12);
  expect(commands).not.toContain(0x10);
  expect(commands).not.toContain(0x11);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});
