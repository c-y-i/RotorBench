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
  parseAerialKitOutputInfo,
  parseAerialKitParamGet,
  parseAerialKitPerf,
  parseAerialKitPreflightPage,
  parseAerialKitRcChannels,
  parseAerialKitStatus,
  parseAerialKitSensorInfo,
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

test("parses PREFLIGHT pages without turning no checklist into a pass", () => {
  expect(parseAerialKitPreflightPage(Uint8Array.of(2), 0, 0)).toEqual({
    status: "none",
    index: null,
    count: 0,
    verdict: null,
    verdictName: null,
    verdictLabel: null,
    name: null,
    sentenceLength: 0,
    offset: 0,
    detail: "",
    complete: true,
  });
  expect(parseAerialKitPreflightPage(Uint8Array.of(1, 4, 6), 4, 0))
    .toMatchObject({
      status: "no-index",
      index: 4,
      count: 6,
      complete: false,
    });

  const detail = Buffer.from("receiver: 8412 bytes");
  const name = Buffer.from("receiver");
  const pageHeader = detailLength => Uint8Array.from([
    0,
    2,
    5,
    2,
    name.length,
    ...name,
    detail.length & 0xff,
    (detail.length >> 8) & 0xff,
    detailLength,
  ]);
  expect(parseAerialKitPreflightPage(
    Uint8Array.from([...pageHeader(7), ...detail.subarray(0, 7)]),
    2,
    0,
  )).toEqual({
    status: "ok",
    index: 2,
    count: 5,
    verdict: 2,
    verdictName: "fact",
    verdictLabel: "Reading",
    name: "receiver",
    sentenceLength: detail.length,
    offset: 0,
    detail: "receive",
    complete: false,
  });
  expect(parseAerialKitPreflightPage(
    Uint8Array.from([...pageHeader(detail.length - 7), ...detail.subarray(7)]),
    2,
    7,
  )).toMatchObject({
    status: "ok",
    detail: "r: 8412 bytes",
    complete: true,
  });
  expect(() => parseAerialKitPreflightPage(Uint8Array.of(0x7f), 0, 0))
    .toThrow(/predates PREFLIGHT/i);
  expect(() => parseAerialKitPreflightPage(Uint8Array.of(2, 0), 0, 0))
    .toThrow(/one status byte/i);
});

test("parses the PERF window in its exact wire units", () => {
  const bytes = new Uint8Array(59);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0;
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
  expect(parseAerialKitPerf(bytes)).toEqual({
    status: "ok",
    loops: 1200,
    samples: 1190,
    nominalUs: 500,
    periodLastUs: 503,
    periodMinUs: 496,
    periodMaxUs: 612,
    late: 4,
    jitterP50Us: 12,
    jitterP99Us: 31,
    jitterMaxUs: 72,
    jitterOver: 11,
    sectionAvgUsX10: [21, 22, 23, 24, 25],
    sectionMaxUs: [30, 31, 32, 33, 34],
    loadPermille: 123,
  });
  const unavailable = new Uint8Array(59);
  unavailable[0] = 1;
  expect(parseAerialKitPerf(unavailable)).toMatchObject({
    status: "none",
    loops: 0,
    sectionAvgUsX10: [0, 0, 0, 0, 0],
  });
  expect(() => parseAerialKitPerf(Uint8Array.of(1)))
    .toThrow(/59-byte window/i);
  expect(() => parseAerialKitPerf(Uint8Array.of(0x7f)))
    .toThrow(/predates PERF/i);
});

test("parses sensor presence without inventing a body for an absent sensor", () => {
  const body = new Uint8Array(46);
  body.set(Buffer.from("BMI270"), 0);
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 0, 1, ...body])))
    .toMatchObject({
      status: "present",
      topicName: "IMU",
      driver: "BMI270",
      present: true,
    });
  expect(parseAerialKitSensorInfo(Uint8Array.of(0, 1, 0))).toMatchObject({
    status: "absent",
    topicName: "Barometer",
    present: false,
  });
  expect(parseAerialKitSensorInfo(Uint8Array.of(1, 2, 0))).toMatchObject({
    status: "no-such-topic",
    topicName: "Rangefinder",
  });
});

test("decodes every SENSOR_INFO body with exact wire lengths and units", () => {
  const imu = new Uint8Array(46);
  const imuView = new DataView(imu.buffer);
  imu.set(Buffer.from("BMI270"), 0);
  imu[12] = 3;
  imu[13] = 0x42;
  [12, -34, 1000, 1, 2, 3].forEach((value, index) => {
    imuView.setInt16(14 + index * 2, value, true);
  });
  [4, 5, 6, -7, -8, -9].forEach((value, index) => {
    imuView.setInt16(26 + index * 2, value, true);
  });
  imuView.setUint32(38, 1234, true);
  imuView.setUint32(42, 2, true);
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 0, 1, ...imu])))
    .toMatchObject({
      status: "present",
      driver: "BMI270",
      body: {
        driver: "BMI270",
        absent: 3,
        absentReason: "known part would not configure",
        whoami: 0x42,
        accelMg: [12, -34, 1000],
        gyroMradS: [1, 2, 3],
        alignDeg: [4, 5, 6],
        gyroBiasMdps: [-7, -8, -9],
        samples: 1234,
        errors: 2,
      },
    });

  const baro = new Uint8Array(52);
  const baroView = new DataView(baro.buffer);
  baro.set(Buffer.from("DPS310"), 0);
  baroView.setInt32(12, 101325, true);
  baroView.setInt16(16, 2150, true);
  baro[18] = 1;
  baroView.setInt32(19, 101000, true);
  baroView.setInt32(23, 320, true);
  baro[27] = 1;
  baroView.setInt32(28, 315, true);
  [10, 1, 2, 8, 2].forEach((value, index) => {
    baroView.setUint32(32 + index * 4, value, true);
  });
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 1, 1, ...baro])))
    .toMatchObject({
      driver: "DPS310",
      body: {
        pressurePa: 101325,
        temperatureC: 21.5,
        haveReference: true,
        referencePa: 101000,
        heightCm: 320,
        haveGpsReference: true,
        fusedCm: 315,
        samples: 10,
        errors: 1,
        fails: 2,
        baroSamples: 8,
        gpsSamples: 2,
      },
    });

  const range = new Uint8Array(49);
  const rangeView = new DataView(range.buffer);
  range.set(Buffer.from("VL53L1X"), 0);
  range[12] = 0x29;
  rangeView.setUint16(13, 4000, true);
  rangeView.setInt32(15, -1, true);
  [20, 30, 2, 1, 3, 4, 5].forEach((value, index) => {
    rangeView.setUint32(19 + index * 4, value, true);
  });
  rangeView.setUint16(47, 7, true);
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 2, 1, ...range])))
    .toMatchObject({
      driver: "VL53L1X",
      body: {
        address: 0x29,
        maxMm: 4000,
        distanceMm: -1,
        ageMs: 20,
        samples: 30,
        outOfRange: 2,
        rejected: 1,
        faults: 3,
        fails: 4,
        landMm: 5,
      },
    });

  const battery = new Uint8Array(29);
  const batteryView = new DataView(battery.buffer);
  battery.set([1, 1, 1, 4], 0);
  batteryView.setUint16(4, 1580, true);
  batteryView.setUint16(6, 395, true);
  batteryView.setInt16(8, -1, true);
  batteryView.setUint16(10, 1000, true);
  battery[12] = 0;
  batteryView.setUint16(13, 3500, true);
  batteryView.setUint16(15, 3200, true);
  [40, 1, 2].forEach((value, index) => {
    batteryView.setUint32(17 + index * 4, value, true);
  });
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 3, 1, ...battery])))
    .toMatchObject({
      driver: null,
      body: {
        ready: true,
        haveReading: true,
        state: 1,
        stateName: "ok",
        cells: 4,
        volts: 15.8,
        voltsPerCell: 3.95,
        pinMv: -1,
        ratio: 1,
        rth: false,
        warnCellV: 3.5,
        criticalCellV: 3.2,
        samples: 40,
        rejected: 1,
        returns: 2,
      },
    });

  const gps = new Uint8Array(56);
  const gpsView = new DataView(gps.buffer);
  gps.set([1, 3, 1, 12, 1], 0);
  gpsView.setInt32(5, 376774000, true);
  gpsView.setInt32(9, -1224194000, true);
  gpsView.setInt32(13, 15240, true);
  gpsView.setInt32(17, 2500, true);
  gpsView.setInt32(21, 1234500, true);
  gps[25] = 1;
  gpsView.setInt32(26, 376770000, true);
  gpsView.setInt32(30, -1224190000, true);
  gpsView.setInt32(34, 42, true);
  gpsView.setInt32(38, 9000, true);
  gps.set([1, 1], 42);
  [20, 3, 1].forEach((value, index) => {
    gpsView.setUint32(44 + index * 4, value, true);
  });
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 4, 1, ...gps])))
    .toMatchObject({
      driver: null,
      body: {
        haveFix: true,
        fixType: 3,
        fixName: "3D fix",
        fixOk: true,
        satellites: 12,
        validNow: true,
        lat: 37.6774,
        lon: -122.4194,
        altMslMm: 15240,
        speedMmS: 2500,
        courseDeg: 12.345,
        haveHome: true,
        homeLat: 37.677,
        homeLon: -122.419,
        homeDistanceM: 42,
        homeBearingDeg: 90,
        returning: true,
        rthEnabled: true,
        fixes: 20,
        dropped: 3,
        configSends: 1,
      },
    });
});

test("keeps zero readings distinct from absent hardware and rejects bad lengths", () => {
  const zeroBaro = new Uint8Array(52);
  zeroBaro.set(Buffer.from("DPS310"), 0);
  expect(parseAerialKitSensorInfo(Uint8Array.from([0, 1, 1, ...zeroBaro])))
    .toMatchObject({
      status: "present",
      present: true,
      body: {
        pressurePa: 0,
        temperatureC: 0,
        haveReference: false,
      },
    });
  expect(parseAerialKitSensorInfo(Uint8Array.of(0, 1, 0))).toEqual({
    status: "absent",
    topic: 1,
    topicName: "Barometer",
    present: false,
    driver: null,
  });
  expect(parseAerialKitSensorInfo(Uint8Array.of(1, 99, 0))).toEqual({
    status: "no-such-topic",
    topic: 99,
    topicName: "Topic 99",
    present: false,
    driver: null,
  });
  expect(() => parseAerialKitSensorInfo(
    Uint8Array.from([0, 1, 1, ...new Uint8Array(51)]),
  )).toThrow(/Barometer must carry a 52-byte body/i);
});

test("parses output descriptors and preserves servo linkage only for servos", () => {
  const bytes = new Uint8Array(5 + 2 * 7);
  const view = new DataView(bytes.buffer);
  bytes.set([0, 2, 1, 1, 15], 0);
  bytes.set([0, 0, 0, 0, 0, 0, 0], 5);
  bytes.set([1, 0, 1, 0, 0, 0, 0], 12);
  view.setInt16(15, 12, true);
  view.setUint16(17, 500, true);
  expect(parseAerialKitOutputInfo(bytes)).toEqual({
    status: "ok",
    count: 2,
    motors: 1,
    servos: 1,
    capPercent: 15,
    outputs: [
      {
        kind: 0,
        kindName: "motor",
        index: 0,
        reversed: false,
        trimUs: null,
        travelUs: null,
      },
      {
        kind: 1,
        kindName: "servo",
        index: 0,
        reversed: true,
        trimUs: 12,
        travelUs: 500,
      },
    ],
  });
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
    preflight: {
      status: "ok",
      lines: [{ name: "clock", verdict: 1, detail: "clock on the crystal" }],
      observedAtMs: 1250,
    },
    performance: {
      status: "ok",
      loops: 1200,
      samples: 1190,
      nominalUs: 500,
      periodLastUs: 503,
      periodMinUs: 496,
      periodMaxUs: 612,
      late: 4,
      jitterP50Us: 12,
      jitterP99Us: 31,
      jitterMaxUs: 72,
      jitterOver: 11,
      sectionAvgUsX10: [21, 22, 23, 24, 25],
      sectionMaxUs: [30, 31, 32, 33, 34],
      loadPermille: 123,
      observedAtMs: 1250,
    },
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
        "PREFLIGHT",
        "PERF",
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
    preflight: {
      status: "ok",
      observedAt: "1970-01-01T00:00:01.250Z",
      lines: [{ name: "clock", verdict: 1, detail: "clock on the crystal" }],
    },
    performance: {
      status: "ok",
      loops: 1200,
      loadPermille: 123,
      observedAt: "1970-01-01T00:00:01.250Z",
    },
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
