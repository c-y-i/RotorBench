import { CrsfStreamParser } from "./crsfCapture";
import {
  ELRS_ADDRESS,
  ELRS_FRAME_TYPE,
  ElrsMenuReadOnlySession,
  createElrsDeviceMenuEvidence,
  decodeElrsDeviceInfo,
  decodeElrsParameter,
  decodeElrsParameterChunk,
  encodeElrsDevicePing,
  encodeElrsExtendedFrame,
  encodeElrsParameterRead,
} from "./elrsRadioMenu";

function u32be(value) {
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function parseFrame(frame) {
  return new CrsfStreamParser().feed(frame)[0];
}

test("encodes read-only device ping and parameter requests", () => {
  const ping = parseFrame(encodeElrsDevicePing());
  expect(ping).toMatchObject({
    address: 0xc8,
    frameType: ELRS_FRAME_TYPE.devicePing,
    payload: Uint8Array.of(ELRS_ADDRESS.broadcast, ELRS_ADDRESS.lua),
  });

  const read = parseFrame(encodeElrsParameterRead(ELRS_ADDRESS.receiver, 7, 2));
  expect(read).toMatchObject({
    address: 0xc8,
    frameType: ELRS_FRAME_TYPE.parameterRead,
    payload: Uint8Array.of(ELRS_ADDRESS.receiver, ELRS_ADDRESS.lua, 7, 2),
  });
});

test("decodes device identity without requiring a serial number to be displayed", () => {
  const payload = Uint8Array.from([
    ELRS_ADDRESS.usb,
    ELRS_ADDRESS.receiver,
    ...Buffer.from("Nomad DBR4\0"),
    ...u32be(0x12345678),
    ...u32be(0x01020304),
    ...u32be(0x41003),
    12,
    3,
  ]);
  const frame = parseFrame(encodeElrsExtendedFrame(
    ELRS_FRAME_TYPE.deviceInfo,
    ELRS_ADDRESS.usb,
    ELRS_ADDRESS.receiver,
    payload.slice(2),
  ));
  const info = decodeElrsDeviceInfo(frame);
  expect(info).toEqual({
    destination: ELRS_ADDRESS.usb,
    origin: ELRS_ADDRESS.receiver,
    name: "Nomad DBR4",
    serial: 0x12345678,
    hardwareVersion: 0x01020304,
    softwareVersion: 0x41003,
    parameterCount: 12,
    parameterVersion: 3,
  });

  const evidence = createElrsDeviceMenuEvidence({
    device: info,
    parameters: [],
    role: "rx",
    targetName: "Nomad DBR4",
    logicalBaud: 420000,
    diagnostics: { validFrames: 1 },
  });
  expect(evidence.device).not.toHaveProperty("serial");
  expect(evidence.boundaries).toMatchObject({
    readOnlyMenuQueriesOnly: true,
    writesAllowed: false,
    commandsExecuted: false,
    rfPathVerified: false,
  });
});

test("decodes chunked selection, number, and folder entries", () => {
  const selection = Uint8Array.from([
    2,
    9,
    ...Buffer.from("Packet Rate\0"),
    ...Buffer.from("50Hz;100Hz;250Hz\0"),
    2,
    0,
    2,
    0,
    ...Buffer.from("Hz\0"),
  ]);
  expect(decodeElrsParameter(4, selection)).toMatchObject({
    id: 4,
    parent: 2,
    kind: "selection",
    name: "Packet Rate",
    options: ["50Hz", "100Hz", "250Hz"],
    value: 2,
    min: 0,
    max: 2,
    units: "Hz",
  });

  const number = Uint8Array.from([
    2,
    0,
    ...Buffer.from("Power\0"),
    25,
    0,
    100,
    0,
    ...Buffer.from("mW\0"),
  ]);
  expect(decodeElrsParameter(5, number)).toMatchObject({
    kind: "number",
    value: 25,
    min: 0,
    max: 100,
    units: "mW",
  });

  const folder = Uint8Array.from([
    0,
    0x80 | 11,
    ...Buffer.from("Link\0"),
    4,
    5,
    0xff,
  ]);
  expect(decodeElrsParameter(2, folder)).toMatchObject({
    kind: "folder",
    hidden: true,
    children: [4, 5],
  });

  const chunkFrame = parseFrame(encodeElrsExtendedFrame(
    ELRS_FRAME_TYPE.parameterEntry,
    ELRS_ADDRESS.lua,
    ELRS_ADDRESS.transmitter,
    [4, 1, ...selection.slice(0, 8)],
  ));
  expect(decodeElrsParameterChunk(chunkFrame)).toMatchObject({
    origin: ELRS_ADDRESS.transmitter,
    field: 4,
    chunksRemaining: 1,
  });
});

test("identifies a radio and walks only read-only menu requests", async () => {
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
  const writer = {
    write: jest.fn(async (frame) => {
      const type = frame[2];
      if (type === ELRS_FRAME_TYPE.devicePing) {
        const info = Uint8Array.from([
          ...Buffer.from("Nomad DBR4\0"),
          ...u32be(0x12345678),
          ...u32be(1),
          ...u32be(0x41003),
          3,
          1,
        ]);
        deliver(encodeElrsExtendedFrame(
          ELRS_FRAME_TYPE.deviceInfo,
          ELRS_ADDRESS.usb,
          ELRS_ADDRESS.transmitter,
          info,
        ));
        return;
      }
      if (type === ELRS_FRAME_TYPE.parameterRead) {
        const field = frame[5];
        const chunk = frame[6];
        const body = parameterBodies[field];
        const first = body.slice(0, chunk ? body.length : 8);
        const second = body.slice(8);
        const data = chunk === 0 ? first : second;
        deliver(encodeElrsExtendedFrame(
          ELRS_FRAME_TYPE.parameterEntry,
          ELRS_ADDRESS.lua,
          ELRS_ADDRESS.transmitter,
          [field, chunk === 0 && second.length ? 1 : 0, ...data],
        ));
        return;
      }
      throw new Error(`Unexpected CRSF type 0x${type.toString(16)}`);
    }),
  };
  const session = new ElrsMenuReadOnlySession({ reader, writer });
  session.startReading();

  const device = await session.identify();
  expect(device).toMatchObject({
    name: "Nomad DBR4",
    parameterCount: 3,
  });
  expect(session.role).toBe("tx");

  const parameters = await session.readAll();
  expect(parameters.map((parameter) => parameter.kind)).toEqual([
    "folder",
    "selection",
    "number",
  ]);
  expect(parameters[1]).toMatchObject({
    name: "Packet Rate",
    options: ["50Hz", "100Hz", "250Hz"],
    value: 1,
  });
  expect(writer.write.mock.calls.every(([frame]) => (
    [ELRS_FRAME_TYPE.devicePing, ELRS_FRAME_TYPE.parameterRead].includes(frame[2])
  ))).toBe(true);

  await session.close();
  expect(reader.cancel).toHaveBeenCalled();
});
