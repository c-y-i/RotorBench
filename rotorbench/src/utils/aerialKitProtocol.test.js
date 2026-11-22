import {
  AERIAL_KIT_COMMANDS,
  AERIAL_KIT_SYNC1,
  AERIAL_KIT_SYNC2,
  AerialKitFrameDecoder,
  AerialKitReadOnlySession,
  aerialKitArmedState,
  aerialKitCrc16,
  buildAerialKitFrame,
  createAerialKitStatusEvidence,
  parseAerialKitHello,
  parseAerialKitParamHelpSlice,
  parseAerialKitParamInfoPage,
  parseAerialKitParamGet,
  parseAerialKitRcChannels,
  parseAerialKitStatus,
} from "./aerialKitProtocol";

const HELLO_REQUEST = "aa550101009dc8";
const HELLO_REPLY = "aa5501811c0161657269616c6b69742d66343035002e003000c1010000920638cfd0a3";
const STATUS_REQUEST = "aa550105005904";
const STATUS_REPLY = "aa550185160101030b7d00d8ff84038768111f3f0ef90228283c3c8598";

function bytes(hex) {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

function frame(command, payload) {
  const body = new Uint8Array(3 + payload.length);
  body[0] = 1;
  body[1] = command;
  body[2] = payload.length;
  body.set(payload, 3);
  const crc = aerialKitCrc16(body);
  return Uint8Array.from([
    AERIAL_KIT_SYNC1,
    AERIAL_KIT_SYNC2,
    ...body,
    crc & 0xff,
    crc >> 8,
  ]);
}

function rcPayload() {
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
  return payload;
}

test("builds source-compatible HELLO and STATUS requests", () => {
  expect(buildAerialKitFrame(AERIAL_KIT_COMMANDS.hello)).toEqual(
    bytes(HELLO_REQUEST),
  );
  expect(buildAerialKitFrame(AERIAL_KIT_COMMANDS.status)).toEqual(
    bytes(STATUS_REQUEST),
  );
});

test("decodes captured HELLO and STATUS replies independent of chunking", () => {
  const decoder = new AerialKitFrameDecoder();
  const frames = [...bytes(HELLO_REPLY)].flatMap((byte) => (
    decoder.feed(Uint8Array.of(byte))
  ));
  expect(frames).toHaveLength(1);
  expect(frames[0]).toMatchObject({
    command: AERIAL_KIT_COMMANDS.hello,
    response: true,
  });
  const hello = parseAerialKitHello(frames[0].payload);
  expect(hello).toMatchObject({
    protocolVersion: 1,
    product: "aerialkit-f405",
    parameterCount: 46,
    changed: "0",
    features: 0x1c1,
    capabilityState: "reported",
  });
  expect(hello.featureNames).toEqual([
    "PARAM_INFO",
    "OUTPUT_INFO",
    "OUTPUT_TEST",
    "LOG_STREAM",
  ]);

  const statusFrame = decoder.feed(bytes(STATUS_REPLY))[0];
  expect(parseAerialKitStatus(statusFrame.payload)).toEqual({
    flightState: 1,
    linkLive: 1,
    gpsFixType: 3,
    gpsSatellites: 11,
    rollDeg: 12.5,
    pitchDeg: -4,
    yawDeg: 90,
    latitude: expect.any(Number),
    longitude: expect.any(Number),
    motors: [40, 40, 60, 60],
  });
});

test("keeps no-receiver RC readback distinct from a linked receiver", () => {
  expect(parseAerialKitRcChannels(Uint8Array.of(1))).toMatchObject({
    status: "no-receiver",
    channels: [],
    counters: null,
  });

  const rc = parseAerialKitRcChannels(rcPayload());
  expect(rc).toMatchObject({
    status: "ok",
    protocolName: "CRSF",
    channels: [172, 1811, 992, 1000],
    sticks: [-1000, 0, 1000, -500],
    flagNames: ["link", "decoded", "telemetry"],
    switchNames: ["arm", "angle"],
    counters: {
      bytes: 1000,
      frames: 40,
      crcErrors: 2,
      rejected: 1,
      lost: 3,
      failsafeFrames: 4,
      dropped: 5,
    },
  });
  expect(() => parseAerialKitRcChannels(Uint8Array.of(0x7f)))
    .toThrow(/predates RC_CHANNELS/i);
});

test("parses a read-only PARAM_GET name and value", () => {
  expect(parseAerialKitParamGet(
    bytes("00726174655f6b705f726f6c6c00302e32353000"),
    0,
  )).toEqual({
    index: 0,
    name: "rate_kp_roll",
    value: "0.250",
  });
  expect(() => parseAerialKitParamGet(bytes("01"), 99))
    .toThrow(/no parameter at index 99/i);
});

test("parses board-reported parameter metadata without guessing", () => {
  const payload = Uint8Array.from([
    0,
    0,
    1,
    ...Buffer.from("rate_kp_roll\0"),
    0,
    1,
    3,
    0,
    ...Buffer.from("0.000\0"),
    ...Buffer.from("3.000\0"),
    ...Buffer.from("0.250\0"),
  ]);
  expect(parseAerialKitParamInfoPage(payload, 0)).toEqual({
    status: "ok",
    first: 0,
    entries: [{
      name: "rate_kp_roll",
      type: 0,
      typeName: "float",
      group: 1,
      groupName: "rates",
      decimals: 3,
      flags: 0,
      secret: false,
      min: "0.000",
      max: "3.000",
      maxLength: null,
      default: "0.250",
    }],
  });
  expect(parseAerialKitParamInfoPage(Uint8Array.of(2, 7, 0), 7))
    .toMatchObject({ status: "too-big", first: 7, entries: [] });
  expect(() => parseAerialKitParamInfoPage(Uint8Array.of(0x7f), 0))
    .toThrow(/predates PARAM_INFO/i);
});

test("parses an offset-checked PARAM_HELP slice", () => {
  const text = Buffer.from("Maximum loop rate");
  const payload = Uint8Array.from([
    0,
    4,
    0,
    0,
    text.length,
    0,
    text.length,
    ...text,
  ]);
  expect(parseAerialKitParamHelpSlice(payload, 4, 0)).toEqual({
    index: 4,
    offset: 0,
    total: text.length,
    bytes: Uint8Array.from(text),
  });
  expect(() => parseAerialKitParamHelpSlice(payload, 4, 1))
    .toThrow(/asked from offset 1/i);
});

test("carries RC frames through the frame decoder", () => {
  const decoder = new AerialKitFrameDecoder();
  const reply = frame(AERIAL_KIT_COMMANDS.rcChannels | 0x80, rcPayload());
  const [decoded] = decoder.feed(Uint8Array.from([
    0x23,
    0x53,
    ...reply,
  ]));
  expect(decoded.command).toBe(AERIAL_KIT_COMMANDS.rcChannels);
  expect(parseAerialKitRcChannels(decoded.payload).flagNames)
    .toContain("decoded");
  expect(decoder.stats.bytesDiscarded).toBe(2);
});

test("becomes unknown, not disarmed, when STATUS is stale", () => {
  const fresh = aerialKitArmedState(
    { flightState: 0 },
    { observedAtMs: 1000, nowMs: 2500 },
  );
  const stale = aerialKitArmedState(
    { flightState: 0 },
    { observedAtMs: 1000, nowMs: 3501 },
  );
  expect(fresh).toMatchObject({ state: "disarmed", fresh: true });
  expect(stale).toMatchObject({
    state: "unknown",
    fresh: false,
    detail: expect.stringMatching(/No fresh STATUS/i),
  });
  expect(aerialKitArmedState(
    { flightState: 2 },
    { observedAtMs: 1000, nowMs: 1500 },
  )).toMatchObject({
    state: "armed",
    flightStateName: "failsafe",
  });
  expect(aerialKitArmedState(
    { flightState: 0 },
    { observedAtMs: 1000, nowMs: 1500, connectionActive: false },
  )).toMatchObject({
    state: "unknown",
    detail: expect.stringMatching(/not monitoring.*historical/i),
  });
});

test("reports a closed AKP read stream instead of silently staying live", async () => {
  const onClose = jest.fn();
  const session = new AerialKitReadOnlySession({
    reader: {
      read: jest.fn().mockResolvedValue({ value: undefined, done: true }),
      cancel: jest.fn(),
    },
    writer: { write: jest.fn() },
    onClose,
  });

  await session.startReading();

  expect(session.active).toBe(false);
  expect(onClose).toHaveBeenCalledWith("The Aerial Kit read stream closed.");
});

test("creates a sanitized live-status evidence boundary", () => {
  const evidence = createAerialKitStatusEvidence({
    hello: { protocolVersion: 1, product: "aerialkit-f405" },
    status: { flightState: 0, linkLive: 1 },
    statusObservedAtMs: 1000,
    baudRate: 115200,
    targetName: "Aerial Kit F405",
    protocolStats: { framesDecoded: 3 },
    parameters: [{ index: 0, name: "rate_kp_roll", value: "0.250" }],
    parameterMetadata: [{
      index: 0,
      name: "rate_kp_roll",
      min: "0.000",
      max: "3.000",
      default: "0.250",
      help: "Rate-loop proportional gain.",
      secret: true,
    }],
    connectionActive: true,
    nowMs: 1500,
  });

  expect(evidence).toMatchObject({
    schema: "rotorbench.aerial-kit-live-status.v1",
    targetName: "Aerial Kit F405",
    transport: {
      kind: "web-serial",
      logicalBaud: 115200,
      queries: [
        "HELLO",
        "STATUS",
        "RC_CHANNELS",
        "PARAM_GET",
        "PARAM_INFO",
        "PARAM_HELP",
      ],
    },
    status: {
      flightState: 0,
      observedAt: "1970-01-01T00:00:01.000Z",
    },
    armedState: { state: "disarmed", fresh: true },
    parameters: [{
      index: 0,
      name: "rate_kp_roll",
      value: "[SECRET REDACTED]",
    }],
    parameterMetadata: [{
      index: 0,
      name: "rate_kp_roll",
      min: "0.000",
      max: "3.000",
      default: "0.250",
      help: "Rate-loop proportional gain.",
    }],
    boundaries: {
      readOnlyQueriesOnly: true,
      hardwareVerifiedByRotorBench: false,
      rfPathVerified: false,
      flightReady: false,
      writesApplied: false,
      persisted: false,
    },
  });
  expect(evidence).not.toHaveProperty("serialPort");
  expect(evidence).not.toHaveProperty("serialNumber");
});
