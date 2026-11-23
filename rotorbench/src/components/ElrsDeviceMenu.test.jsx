import { vi } from "vitest";
import {
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ElrsDeviceMenu from "./ElrsDeviceMenu";
import { getA11yViolations } from "../test/a11y";
import {
  ELRS_ADDRESS,
  ELRS_FRAME_TYPE,
  encodeElrsCrsfFrame,
  encodeElrsExtendedFrame,
} from "../utils/elrsRadioMenu";

const originalSerial = navigator.serial;

function setSerial(value) {
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value,
  });
}

function u32be(value) {
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function createPort() {
  const waiters = [];
  const queued = [];
  const deliver = (value) => {
    const waiter = waiters.shift();
    if (waiter) waiter({ value, done: false });
    else queued.push(value);
  };
  const parameterBodies = {
    1: Uint8Array.from([0, 11, ...Buffer.from("Link\0"), 2, 3, 0xff]),
    2: Uint8Array.from([
      1,
      9,
      ...Buffer.from("Packet Rate\0"),
      ...Buffer.from("50Hz;100Hz;250Hz\0"),
      1,
      0,
      2,
      0,
      ...Buffer.from("Hz\0"),
    ]),
    3: Uint8Array.from([
      1,
      0,
      ...Buffer.from("Power\0"),
      25,
      0,
      100,
      0,
      ...Buffer.from("mW\0"),
    ]),
  };
  const reader = {
    read: vi.fn(() => {
      if (queued.length) return Promise.resolve({ value: queued.shift(), done: false });
      return new Promise((resolve) => waiters.push(resolve));
    }),
    cancel: vi.fn(async () => {
      waiters.splice(0).forEach((resolve) => resolve({ value: undefined, done: true }));
    }),
    releaseLock: vi.fn(),
  };
  const writer = {
    write: vi.fn(async (frame) => {
      const type = frame[2];
      if (type === ELRS_FRAME_TYPE.devicePing) {
        const info = encodeElrsExtendedFrame(
          ELRS_FRAME_TYPE.deviceInfo,
          ELRS_ADDRESS.usb,
          ELRS_ADDRESS.transmitter,
          Uint8Array.from([
            ...Buffer.from("Nomad DBR4\0"),
            ...u32be(0x12345678),
            ...u32be(1),
            ...u32be(0x41003),
            3,
            1,
          ]),
        );
        const link = encodeElrsCrsfFrame(
          ELRS_FRAME_TYPE.linkStatistics,
          Uint8Array.of(0x30, 0x34, 88, 0xe2, 1, 2, 3, 0x40, 77, 0xf0),
          ELRS_ADDRESS.radioTransmitter,
        );
        deliver(Uint8Array.from([...link, ...info]));
        return;
      }
      if (type === ELRS_FRAME_TYPE.parameterRead) {
        const field = frame[5];
        const chunk = frame[6];
        const body = parameterBodies[field];
        const first = body.slice(0, 8);
        const second = body.slice(8);
        deliver(encodeElrsExtendedFrame(
          ELRS_FRAME_TYPE.parameterEntry,
          ELRS_ADDRESS.lua,
          ELRS_ADDRESS.transmitter,
          [field, chunk === 0 && second.length ? 1 : 0, ...(chunk === 0 ? first : second)],
        ));
        return;
      }
      throw new Error(`Unexpected CRSF type 0x${type.toString(16)}`);
    }),
    releaseLock: vi.fn(),
  };
  const port = {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    readable: { getReader: vi.fn(() => reader) },
    writable: { getWriter: vi.fn(() => writer) },
  };
  return { port, reader, writer };
}

afterEach(() => {
  setSerial(originalSerial);
});

test("explains the read-only boundary when Web Serial is unavailable", async () => {
  setSerial(undefined);
  render(<ElrsDeviceMenu />);
  await userEvent.click(screen.getByText("ExpressLRS device menu"));

  expect(screen.getByText("Web Serial is unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Read device menu" }))
    .not.toBeInTheDocument();
});

test("reads an ExpressLRS device menu without write or command frames", async () => {
  const { port, reader, writer } = createPort();
  setSerial({ requestPort: vi.fn().mockResolvedValue(port) });
  const { container } = render(
    <ElrsDeviceMenu
      role="rx"
      targetName="Nomad DBR4"
      expectedBaud={420000}
    />,
  );

  await userEvent.click(screen.getByText("ExpressLRS device menu"));
  await userEvent.click(screen.getByRole("button", {
    name: "Read device menu",
  }));

  expect(await screen.findByText("Nomad DBR4")).toBeInTheDocument();
  expect(await screen.findByText("Menu loaded")).toBeInTheDocument();
  expect(screen.getByText(/3 fields · not written/i)).toBeInTheDocument();
  const identity = screen.getByRole("region", {
    name: "Observed radio identity",
  });
  expect(within(identity).getByText(/observed TX/)).toBeInTheDocument();
  expect(screen.getByText("Packet Rate")).toBeInTheDocument();
  expect(screen.getByText("100Hz · index 1")).toBeInTheDocument();
  expect(screen.getByText("25 mW · 0..100")).toBeInTheDocument();
  expect(screen.getByText("88%")).toBeInTheDocument();
  expect(screen.getByText("-48 / -52 dBm")).toBeInTheDocument();
  expect(screen.getByText(/not an RF range/i)).toBeInTheDocument();
  expect(screen.queryByText("Command")).not.toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);

  const types = writer.write.mock.calls.map(([frame]) => frame[2]);
  expect(types.every((type) => (
    [ELRS_FRAME_TYPE.devicePing, ELRS_FRAME_TYPE.parameterRead].includes(type)
  ))).toBe(true);
  expect(types).not.toContain(ELRS_FRAME_TYPE.parameterRead + 1);
  expect(types).not.toContain(0x32);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
  await waitFor(() => expect(port.close).toHaveBeenCalled());
  expect(reader.cancel).toHaveBeenCalled();
  expect(reader.releaseLock).toHaveBeenCalled();
  expect(writer.releaseLock).toHaveBeenCalled();
});
