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
const HELLO_PAYLOAD_WITH_PERF = "0161657269616c6b69742d663430350002003000f1130000920638cf";
const HELLO_PAYLOAD_WITH_MOTORS = "0161657269616c6b69742d663430350002003000f1330000920638cf";
const HELLO_PAYLOAD_WITH_MISSION = "0161657269616c6b69742d663430350002003000f13b0000920638cf";
const HELLO_PAYLOAD_WITH_CALIBRATION = "0161657269616c6b69742d663430350002003000f13f0000920638cf";
const HELLO_PAYLOAD_WITH_WAYPOINTS = "0161657269616c6b69742d663430350005003000f13b0000920638cf";
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

function motorTelemetryReply(status = 0) {
  if (status === 1) return buildAerialKitFrame(0x96, Uint8Array.of(1));
  const payload = new Uint8Array(3 + 2 * 19);
  const view = new DataView(payload.buffer);
  payload.set([0, 2, 14], 0);
  payload[3] = 0x1f;
  view.setUint32(4, 100000, true);
  view.setUint32(8, 7142, true);
  payload[12] = 40;
  payload[13] = 45;
  view.setUint16(14, 24000, true);
  view.setUint16(16, 18000, true);
  view.setUint16(18, 100, true);
  view.setUint16(20, 2, true);
  payload[22] = 0;
  return buildAerialKitFrame(0x96, payload);
}

function telemetryFrame(uptimeMs, {
  rollDeg = 12.5,
  pitchDeg = -2.5,
  yawDeg = 90,
} = {}) {
  const payload = new Uint8Array(26);
  const view = new DataView(payload.buffer);
  view.setUint32(0, uptimeMs, true);
  payload.set([1, 1, 3, 11], 4);
  view.setInt16(8, Math.round(rollDeg * 10), true);
  view.setInt16(10, Math.round(pitchDeg * 10), true);
  view.setInt16(12, Math.round(yawDeg * 10), true);
  view.setInt32(14, 376774000, true);
  view.setInt32(18, -1224194000, true);
  payload.set([10, 20, 30, 40], 22);
  return buildAerialKitFrame(0x08, payload);
}

function missionReply(status = 0, index = 2) {
  const payload = new Uint8Array(17);
  const view = new DataView(payload.buffer);
  payload.set([status, 0, 1, 1, 4, index, 7], 0);
  view.setUint16(7, 2, true);
  view.setUint16(9, 3, true);
  view.setUint16(11, 1, true);
  view.setInt32(13, 120000, true);
  return buildAerialKitFrame(0x94, payload);
}

function calibrationReply({
  status = 0,
  verb = 1,
  active = true,
  step = 255,
  faces = 0,
  samples = 1000,
  rejected = 3,
  results = [-1, -2, -3, 0, 0, 0],
} = {}) {
  const payload = new Uint8Array(37);
  const view = new DataView(payload.buffer);
  payload.set([status, verb, active ? 1 : 0, step, faces], 0);
  view.setUint32(5, samples, true);
  view.setUint32(9, rejected, true);
  results.forEach((value, index) => {
    view.setInt32(13 + index * 4, value, true);
  });
  return buildAerialKitFrame(0x93, payload);
}

function logRecordBody(bytes, timeMs) {
  const payload = new Uint8Array(bytes);
  const view = new DataView(payload.buffer);
  view.setUint32(0, timeMs, true);
  [1, 2, 3, 4, 5, 6].forEach((value, index) => {
    view.setInt16(4 + index * 2, value, true);
  });
  view.setInt16(16, 125, true);
  view.setInt16(18, -25, true);
  view.setInt16(20, 900, true);
  view.setInt32(22, 1500, true);
  payload.set([11, 12, 13, 14], 37);
  view.setInt32(43, 376774000, true);
  view.setInt32(47, -1224194000, true);
  if (bytes >= 66) {
    [7, 8, 9].forEach((value, index) => {
      view.setInt16(51 + index * 2, value, true);
    });
  }
  if (bytes >= 87) {
    payload[42] = 0x10;
    view.setUint16(85, 15800, true);
  }
  return payload;
}

function createPort(helloPayload = HELLO_PAYLOAD_WITH_RC, {
  perfStatus = 0,
  motorStatus = 0,
  telemetryAgreedHz = 20,
  telemetryPushCount = 2,
  missionStatus = 0,
  missionIndex = 2,
  calibrationStatus = 0,
  calibrationVerb = 1,
  calibrationActive = true,
  calibrationStep = 255,
  calibrationFaces = 0,
  calibrationSamples = 1000,
  calibrationRejected = 3,
  calibrationResults = [-1, -2, -3, 0, 0, 0],
  parameterValues = null,
  parameterGroups = [1, 1],
  parameterMetadata = null,
} = {}) {
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
        const fallback = {
          name: index === 0 ? "rate_kp_roll" : "rate_ki_roll",
          value: index === 0 ? "0.250" : "1.500",
        };
        const parameter = parameterValues?.[index] || fallback;
        deliver(buildAerialKitFrame(
          0x82,
          Uint8Array.from([
            0,
            ...Buffer.from(`${parameter.name}\0${parameter.value}\0`),
          ]),
        ));
      }
      else if (command === 0x0a) {
        const first = frame[5];
        const entries = (parameterMetadata || [
          {
            name: "rate_kp_roll",
            group: parameterGroups[0] ?? 1,
            min: "0.000",
            max: "3.000",
            defaultValue: "0.250",
          },
          {
            name: "rate_ki_roll",
            group: parameterGroups[1] ?? 1,
            min: "0.000",
            max: "2.000",
            defaultValue: "0.150",
          },
        ]).slice(first, first + 2);
        const payload = [
          0,
          first,
          entries.length,
          ...entries.flatMap((entry) => [
            ...Buffer.from(`${entry.name}\0`),
            0,
            entry.group,
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
      else if (command === 0x15) {
        const payload = new Uint8Array(59);
        const view = new DataView(payload.buffer);
        payload[0] = perfStatus;
        view.setUint32(1, 1200, true);
        view.setUint32(5, 1190, true);
        view.setUint16(9, 500, true);
        view.setUint32(11, 503, true);
        view.setUint32(15, 496, true);
        view.setUint32(19, 612, true);
        view.setUint32(23, 4, true);
        view.setUint16(27, 12, true);
        view.setUint16(29, 31, true);
        view.setUint16(31, 72, true);
        view.setUint32(33, 11, true);
        [21, 22, 23, 24, 25].forEach((value, index) => {
          view.setUint16(37 + index * 2, value, true);
        });
        [30, 31, 32, 33, 34].forEach((value, index) => {
          view.setUint16(47 + index * 2, value, true);
        });
        view.setUint16(57, 123, true);
        deliver(buildAerialKitFrame(0x95, payload));
      }
      else if (command === 0x16) {
        deliver(motorTelemetryReply(motorStatus));
      }
      else if (command === 0x08) {
        const requested = frame[5];
        const agreed = requested === 0 ? 0 : telemetryAgreedHz;
        deliver(buildAerialKitFrame(0x88, Uint8Array.of(agreed)));
        if (agreed > 0) {
          for (let index = 0; index < telemetryPushCount; index += 1) {
            deliver(telemetryFrame(1000 + index * 50, {
              rollDeg: 12.5 + index,
            }));
          }
        }
      }
      else if (command === 0x14) {
        deliver(missionReply(missionStatus, missionIndex));
      }
      else if (command === 0x13) {
        deliver(calibrationReply({
          status: calibrationStatus,
          verb: calibrationVerb,
          active: calibrationActive,
          step: calibrationStep,
          faces: calibrationFaces,
          samples: calibrationSamples,
          rejected: calibrationRejected,
          results: calibrationResults,
        }));
      }
      else if (command === 0x09) {
        const source = frame[5];
        if (source === 1) {
          deliver(buildAerialKitFrame(
            0x89,
            Uint8Array.from([1, 0, 0, 0]),
          ));
        } else {
          const count = source === 2 ? 24 : 3;
          deliver(buildAerialKitFrame(
            0x89,
            Uint8Array.from([
              0,
              source,
              count & 0xff,
              (count >> 8) & 0xff,
            ]),
          ));
        }
      }
      else if (command === 0x11) {
        deliver(buildAerialKitFrame(
          0x91,
          Uint8Array.from([0, 0, 0, 0, 3, 0, 20]),
        ));
        deliver(buildAerialKitFrame(
          0x11,
          Uint8Array.from([0, 0, 0, 0, ...logRecordBody(51, 100)]),
        ));
        deliver(buildAerialKitFrame(0x11, Uint8Array.of(1, 0, 1, 0)));
        deliver(buildAerialKitFrame(
          0x11,
          Uint8Array.from([0, 0, 2, 0, ...logRecordBody(87, 200)]),
        ));
        deliver(buildAerialKitFrame(0x11, Uint8Array.of(2, 0, 3, 0)));
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

test("filters live parameters by board-reported metadata groups", async () => {
  const { port } = createPort(HELLO_PAYLOAD_TWO_PARAMETERS, {
    parameterGroups: [1, 4],
  });
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
  expect(await screen.findByText(/receiver · float · 0\.000 to 2\.000/i))
    .toBeInTheDocument();

  const groups = screen.getByRole("group", {
    name: "Filter parameters by board-reported group",
  });
  expect(within(groups).getByRole("button", { name: "All, 2 parameters" }))
    .toHaveAttribute("aria-pressed", "true");
  expect(within(groups).getByRole("button", { name: "rates, 1 parameter" }))
    .toBeInTheDocument();

  await userEvent.click(within(groups).getByRole("button", {
    name: "receiver, 1 parameter",
  }));

  expect(screen.queryByText("rate_kp_roll")).not.toBeInTheDocument();
  expect(screen.getByText("rate_ki_roll")).toBeInTheDocument();
  expect(within(groups).getByRole("button", { name: "receiver, 1 parameter" }))
    .toHaveAttribute("aria-pressed", "true");

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("compares live board-reported parameters with the staged FC plan", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const { port } = createPort(HELLO_PAYLOAD_TWO_PARAMETERS, {
    parameterValues: [
      { name: "arm_channel", value: "5" },
      { name: "vbat_ratio", value: "11" },
    ],
    parameterMetadata: [
      {
        name: "arm_channel",
        group: 3,
        min: "0",
        max: "16",
        defaultValue: "6",
      },
      {
        name: "vbat_ratio",
        group: 7,
        min: "0",
        max: "100",
        defaultValue: "11",
      },
    ],
  });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(
    <AerialKitStatusSession
      firmwareFamily="aerialkit"
      flightControllerPlan={{
        firmwareFamily: "aerialkit",
        airframe: "quadx",
        armChannel: 6,
        dshotKhz: 300,
        vbatRatio: 11,
      }}
    />,
  );

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read parameter values",
  }));
  expect(await screen.findByText(/2 values read.*metadata/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read ranges/defaults",
  }));

  expect(await screen.findByText("1 match · 1 differ · 2 not observed"))
    .toBeInTheDocument();
  expect(screen.getByText("Differs")).toBeInTheDocument();
  expect(screen.getByText("Matches plan")).toBeInTheDocument();
  await userEvent.click(screen.getByText("Planned values not observed"));
  expect(screen.getByRole("listitem", {
    name: /dshot_khz: The board-reported evidence does not include dshot_khz/,
  })).toBeInTheDocument();
  expect(screen.getByRole("listitem", {
    name: /airframe: The board-reported evidence does not include airframe/,
  })).toBeInTheDocument();
  expect(screen.getByRole("listitem", {
    name: /arm_channel: 5\. Differs\. Board-reported arm_channel=5; the staged plan expects 6\./,
  })).toBeInTheDocument();

  await userEvent.type(
    screen.getByLabelText("Filter planned values not observed"),
    "dshot",
  );
  expect(screen.getByRole("listitem", {
    name: /dshot_khz: The board-reported evidence does not include dshot_khz/,
  })).toBeInTheDocument();
  expect(screen.queryByRole("listitem", {
    name: /airframe: The board-reported evidence does not include airframe/,
  })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Copy plan comparison",
  }));
  expect(await screen.findByText("Copied")).toBeInTheDocument();
  expect(screen.getByRole("button", {
    name: "Download comparison",
  })).toBeInTheDocument();
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0][0]).toContain("arm_channel");
  expect(writeText.mock.calls[0][0]).toContain("dshot_khz");
  expect(writeText.mock.calls[0][0]).toContain("airframe");
  expect(writeText.mock.calls[0][0]).toContain("read-only comparison");

  await userEvent.type(
    screen.getByLabelText("Filter observed parameter names or values"),
    "differs",
  );
  expect(screen.getByText("arm_channel")).toBeInTheDocument();
  expect(screen.queryByText("vbat_ratio")).not.toBeInTheDocument();

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

test("reads the loop performance window in board-reported units", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_PERF);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read performance window",
  }));
  expect(await screen.findByText("1200 loops · 4 late")).toBeInTheDocument();
  expect(screen.getByText("503 / 496 / 612 µs")).toBeInTheDocument();
  expect(screen.getByText("12.3% · 123‰")).toBeInTheDocument();
  expect(screen.getByText("2.1 µs avg")).toBeInTheDocument();
  expect(screen.getByText("30 µs max")).toBeInTheDocument();
  expect(screen.getByText("IMU")).toBeInTheDocument();
  expect(screen.getByText("Output")).toBeInTheDocument();

  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands).toContain(0x15);
  expect(commands).not.toContain(0x10);
  expect(commands).not.toContain(0x11);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("keeps a zeroed profiler window distinct from measured performance", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_PERF, { perfStatus: 1 });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read performance window",
  }));

  expect(await screen.findByText("No profiler in this build"))
    .toBeInTheDocument();
  expect(screen.queryByText("503 / 496 / 612 µs")).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads ESC telemetry without inventing stopped or missing values", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_MOTORS);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read ESC telemetry",
  }));

  expect(await screen.findByText("1/2 answering")).toBeInTheDocument();
  expect(screen.getByText("100000 eRPM")).toBeInTheDocument();
  expect(screen.getByText("7142 RPM")).toBeInTheDocument();
  expect(screen.getByText("40 / 45 °C")).toBeInTheDocument();
  expect(screen.getByText("24000 mV · 18000 mA")).toBeInTheDocument();
  expect(screen.getByText("Not heard")).toBeInTheDocument();
  expect(screen.getByText(/No ESC telemetry in this window/)).toBeInTheDocument();
  expect(screen.getByText(/Pole count reported by the board: 14/))
    .toBeInTheDocument();

  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands).toContain(0x16);
  expect(commands).not.toContain(0x10);
  expect(commands).not.toContain(0x11);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("keeps a missing ESC telemetry path distinct from stopped motors", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_MOTORS, { motorStatus: 1 });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read ESC telemetry",
  }));

  expect(await screen.findByText("No ESC telemetry path")).toBeInTheDocument();
  expect(screen.getByText(/does not replace that answer with a list of stopped motors/i))
    .toBeInTheDocument();
  expect(screen.queryByText("Motor 1")).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("streams telemetry at the agreed rate and stops explicitly", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_MOTORS);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Start telemetry",
  }));

  expect(await screen.findByText("20 / 20 Hz")).toBeInTheDocument();
  expect(screen.getByText("10 / 20 / 30 / 40")).toBeInTheDocument();
  expect(screen.getByText("13.5 / -2.5 / 90.0°")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Stop telemetry",
  }));
  expect(await screen.findByText("Stopped")).toBeInTheDocument();
  expect(screen.getByText(/Telemetry stream stopped and STATUS\/RC polling resumed/i))
    .toBeInTheDocument();

  const telemetryRequests = writer.write.mock.calls
    .map(([frame]) => frame)
    .filter((frame) => frame[3] === 0x08)
    .map((frame) => frame[5]);
  expect(telemetryRequests).toEqual([20, 0]);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("keeps a declined telemetry stream distinct from a running stream", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_MOTORS, {
    telemetryAgreedHz: 0,
    telemetryPushCount: 0,
  });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Start telemetry",
  }));

  expect(await screen.findByText("Board declined the stream"))
    .toBeInTheDocument();
  expect(screen.getAllByText(/No pushed frames are expected/i).length)
    .toBeGreaterThan(0);
  expect(screen.queryByText("20 / 20 Hz")).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("marks a silent telemetry stream stale instead of keeping it live", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_MOTORS, {
    telemetryPushCount: 1,
  });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Start telemetry",
  }));
  expect(await screen.findByText("20 / 20 Hz")).toBeInTheDocument();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
  });
  expect(screen.getByText("Telemetry stream is stale")).toBeInTheDocument();
  expect(screen.getByText(/last observation remains historical/i))
    .toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads mission status without exposing mission-changing verbs", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_MISSION);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read mission status",
  }));

  expect(await screen.findByText("Mission active")).toBeInTheDocument();
  expect(screen.getByText("Waypoint list")).toBeInTheDocument();
  expect(screen.getByText("4 waypoints")).toBeInTheDocument();
  expect(screen.getByText("CH 7")).toBeInTheDocument();
  expect(screen.getByText("120000 mm")).toBeInTheDocument();
  expect(screen.getByText("2 / 3 / 1")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /start mission/i }))
    .not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /stop mission/i }))
    .not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /home set/i }))
    .not.toBeInTheDocument();

  const missionRequests = writer.write.mock.calls
    .map(([frame]) => frame)
    .filter((frame) => frame[3] === 0x14)
    .map((frame) => frame[5]);
  expect(missionRequests).toEqual([0]);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("keeps a no-navigator mission refusal distinct from an empty mission", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_MISSION, { missionStatus: 2 });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read mission status",
  }));

  expect(await screen.findByText("Mission state not available")).toBeInTheDocument();
  expect(screen.getByText(/answered no-navigator/)).toBeInTheDocument();
  expect(screen.queryByText("Waypoint list")).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads calibration-session status without exposing calibration verbs", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_CALIBRATION);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read calibration status",
  }));

  expect(await screen.findByText("Sampling")).toBeInTheDocument();
  expect(screen.getByText("gyro")).toBeInTheDocument();
  expect(screen.getByText("1000 / 3")).toBeInTheDocument();
  expect(screen.getByText("bias roll (mdps)")).toBeInTheDocument();
  expect(screen.getByText("-1")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /calibrate gyro/i }))
    .not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /abort calibration/i }))
    .not.toBeInTheDocument();

  const calibrationRequests = writer.write.mock.calls
    .map(([frame]) => frame)
    .filter((frame) => frame[3] === 0x13)
    .map((frame) => frame[5]);
  expect(calibrationRequests).toEqual([0]);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("keeps no calibration session distinct from zeroed measurements", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_CALIBRATION, {
    calibrationVerb: 255,
    calibrationActive: false,
    calibrationSamples: 0,
    calibrationRejected: 0,
    calibrationResults: [0, 0, 0, 0, 0, 0],
  });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read calibration status",
  }));

  expect(await screen.findAllByText("No session named")).not.toHaveLength(0);
  expect(screen.getByText(/zeroed result slots are not measurements/i))
    .toBeInTheDocument();
  expect(screen.queryByText("bias roll (mdps)")).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("does not present calibration results after an armed refusal", async () => {
  const { port } = createPort(HELLO_PAYLOAD_WITH_CALIBRATION, {
    calibrationStatus: 2,
    calibrationVerb: 255,
    calibrationActive: false,
    calibrationResults: [1, 2, 3, 4, 5, 6],
  });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read calibration status",
  }));

  expect(await screen.findByText("Calibration response")).toBeInTheDocument();
  expect(screen.getByText(/answered aircraft-armed/)).toBeInTheDocument();
  expect(screen.queryByText("bias roll (mdps)")).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads a waypoint inventory from advertised parameters without upload controls", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_WAYPOINTS, {
    missionIndex: 1,
    parameterValues: [
      { name: "wp_count", value: "2" },
      { name: "wp0_lat", value: "37.6774000" },
      { name: "wp0_lon", value: "-122.4194000" },
      { name: "wp1_lat", value: "37.7000000" },
      { name: "wp1_lon", value: "-122.4000000" },
    ],
  });
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  const { container } = render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read mission status",
  }));
  expect(await screen.findByText("Mission active")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Read waypoint inventory",
  }));

  expect(await screen.findByText("2 configured · 2 available slots"))
    .toBeInTheDocument();
  expect(screen.getByText("37.6774000, -122.4194000")).toBeInTheDocument();
  expect(screen.getByText("37.7000000, -122.4000000")).toBeInTheDocument();
  expect(screen.getByText("Total route")).toBeInTheDocument();
  expect(screen.getByText("WP 0 → WP 1")).toBeInTheDocument();
  expect(screen.getByText(/Spherical great-circle estimate/i)).toBeInTheDocument();
  expect(screen.getByRole("group", {
    name: "Local north-up sketch of board-reported waypoint coordinates and active target WP 1",
  })).toBeInTheDocument();
  expect(screen.getByText(/WP 1 is the active target/i)).toBeInTheDocument();
  expect(screen.queryByText("Board")).not.toBeInTheDocument();
  expect(screen.getByText(/not a basemap or flown path/i)).toBeInTheDocument();
  expect(screen.getByText("Distance to active waypoint")).toBeInTheDocument();
  expect(screen.getByText(/WP 1 · STATUS position · fix 3/)).toBeInTheDocument();
  expect(screen.getByText("Mission progress")).toBeInTheDocument();
  expect(screen.getByText("Active target WP 1")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy mission briefing" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download mission route" }))
    .toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: /WP 0 37\.6774000/,
  }));
  expect(screen.getByText("Selected WP 0")).toBeInTheDocument();
  expect(container.querySelector(".route-selected-ring")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Inspect waypoint WP 1",
  }));
  expect(screen.getByText("Selected WP 1")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /upload waypoint/i }))
    .not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /save mission/i }))
    .not.toBeInTheDocument();

  const parameterRequests = writer.write.mock.calls
    .map(([frame]) => frame)
    .filter((frame) => frame[3] === 0x02)
    .map((frame) => frame[5]);
  expect(parameterRequests).toEqual([0, 1, 2, 3, 4]);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});

test("reads bounded log samples while retaining holes, completion, and record versions", async () => {
  const { port, writer } = createPort(HELLO_PAYLOAD_WITH_MOTORS);
  setSerial({ requestPort: jest.fn().mockResolvedValue(port) });
  render(<AerialKitStatusSession firmwareFamily="aerialkit" />);

  await userEvent.click(screen.getByText("Aerial Kit flight status"));
  await userEvent.click(screen.getByRole("button", {
    name: "Connect and monitor",
  }));
  expect(await screen.findByText("Monitoring")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read log inventory",
  }));
  expect(await screen.findByText("2 sources")).toBeInTheDocument();
  expect(screen.getByText("3 records")).toBeInTheDocument();
  expect(screen.getByText("Not available on this build")).toBeInTheDocument();
  expect(screen.getByText("24 records")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Read latest sample",
  }));
  expect(await screen.findByText("2 records · 1 holes")).toBeInTheDocument();
  expect(screen.getByText("Record #0")).toBeInTheDocument();
  expect(screen.getByText("HOLE at #1")).toBeInTheDocument();
  expect(screen.getByText("Record #2")).toBeInTheDocument();
  expect(screen.getByText("DONE at #3")).toBeInTheDocument();
  expect(screen.getByText("v2 · 51 B")).toBeInTheDocument();
  expect(screen.getByText("v4 · 87 B")).toBeInTheDocument();
  expect(screen.getByText("15800 mV")).toBeInTheDocument();

  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const createObjectUrl = jest.fn(() => "blob:log-sample");
  const anchorClick = jest.fn();
  URL.createObjectURL = createObjectUrl;
  URL.revokeObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = anchorClick;
  try {
    await userEvent.click(screen.getByRole("button", {
      name: "Export JSON",
    }));
    expect(screen.getByText(/exported with its source, range, holes/i))
      .toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", {
      name: "Export CSV",
    }));
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(anchorClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/CSV record rows exported/i)).toBeInTheDocument();
  } finally {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    HTMLAnchorElement.prototype.click = originalAnchorClick;
  }

  const commands = writer.write.mock.calls.map(([frame]) => frame[3]);
  expect(commands).toContain(0x09);
  expect(commands).toContain(0x11);
  expect(commands).not.toContain(0x10);

  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Stop session" }));
  });
});
