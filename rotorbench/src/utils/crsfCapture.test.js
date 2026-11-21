import {
  CrsfStreamParser,
  channelCalibrationStatus,
  channelPercent,
  createCrsfObservationEvidence,
  crsfObservationFilename,
  decodeCrsfFrame,
  decodeCrsfLinkStatistics,
  getCrsfParserDiagnostics,
  summarizeChannelRanges,
  unpackCrsfChannels,
  updateChannelRanges,
} from "./crsfCapture";

const centerRc = Uint8Array.from(
  Buffer.from("c81816e0031ff8c0073ef0810f7ce0031ff8c0073ef0810f7cad", "hex"),
);
const linkStats = Uint8Array.from(
  Buffer.from("ea0c145a5c5807010203504604d7", "hex"),
);
const telemetryFrames = [
  "ea081e03e8ec782ee084",
  "ea0a0800a8007b0005dc58d1",
  "ea06092be2ff0688",
  "ea11021c4050a80517b6000168232805aa0cbd",
  "ea0821414e474c450087",
].map((hex) => Buffer.from(hex, "hex"));

test("Aerial Kit RC and link-statistics vectors decode exactly", () => {
  const parser = new CrsfStreamParser();
  const frames = parser.feed(Uint8Array.from([...centerRc, ...linkStats]));
  expect(frames).toHaveLength(2);

  const rc = decodeCrsfFrame(frames[0]);
  expect(rc).toEqual({
    kind: "rc",
    channels: Array(16).fill(992),
  });
  expect(unpackCrsfChannels(frames[0].payload)).toEqual(Array(16).fill(992));

  const link = decodeCrsfFrame(frames[1]);
  expect(link).toEqual({
    kind: "link",
    link: {
      uplinkRssi1Dbm: -90,
      uplinkRssi2Dbm: -92,
      uplinkLinkQuality: 88,
      uplinkSnrDb: 7,
      activeAntenna: 1,
      rfMode: 2,
      uplinkTxPowerRaw: 3,
      downlinkRssiDbm: -80,
      downlinkLinkQuality: 70,
      downlinkSnrDb: 4,
    },
  });
  expect(channelPercent(172)).toBe(0);
  expect(channelPercent(992)).toBeCloseTo(50, 0);
  expect(channelPercent(1811)).toBe(100);
});

test("the parser survives split frames, noise, and bad CRCs", () => {
  const parser = new CrsfStreamParser();
  expect(parser.feed(centerRc.slice(0, 8))).toEqual([]);
  expect(parser.pendingBytes).toBe(8);
  expect(parser.feed(centerRc.slice(8))).toHaveLength(1);

  const corrupt = Uint8Array.from(centerRc);
  corrupt[corrupt.length - 1] ^= 0xff;
  expect(parser.feed(corrupt)).toEqual([]);
  expect(parser.crcErrors).toBe(1);

  expect(parser.feed(Uint8Array.from([0x01, 0x02, ...linkStats]))).toHaveLength(1);
  expect(parser.validFrames).toBe(2);
  expect(parser.resyncs).toBeGreaterThan(0);
  expect(getCrsfParserDiagnostics(parser)).toMatchObject({
    validFrames: 2,
    crcErrors: 1,
    frameTypeCounts: {
      rc: 1,
      link: 1,
    },
  });
});

test("malformed payload lengths are rejected instead of guessed", () => {
  expect(() => unpackCrsfChannels(new Uint8Array(21))).toThrow(/22 bytes/i);
  expect(decodeCrsfLinkStatistics(new Uint8Array(9))).toBeNull();
});

test("Aerial Kit attitude, battery, barometer, GPS, and mode vectors decode", () => {
  const parser = new CrsfStreamParser();
  const decoded = parser
    .feed(Uint8Array.from(telemetryFrames.flatMap((frame) => [...frame])))
    .map(decodeCrsfFrame);

  expect(decoded).toEqual([
    {
      kind: "attitude",
      telemetry: { pitchRad: 0.1, rollRad: -0.5, yawRad: 1.2 },
    },
    {
      kind: "battery",
      telemetry: {
        voltageV: 16.8,
        currentA: 12.3,
        capacityMah: 1500,
        remainingPercent: 88,
      },
    },
    {
      kind: "barometer",
      telemetry: { altitudeM: 123.4, verticalSpeedMps: -2.5 },
    },
    {
      kind: "gps",
      telemetry: {
        latitudeDeg: 47.3977,
        longitudeDeg: 8.544,
        groundspeedMps: 10,
        headingDeg: 90,
        altitudeM: 450,
        satellites: 12,
      },
    },
    { kind: "flightMode", telemetry: { mode: "ANGLE" } },
  ]);
});

test("evidence export excludes raw bytes, port identity, and RF claims", () => {
  const evidence = createCrsfObservationEvidence({
    baudRate: 420000,
    diagnostics: { validFrames: 2, crcErrors: 1, resyncs: 3 },
    channels: Array(16).fill(992),
    link: decodeCrsfFrame({
      frameType: 0x14,
      payload: linkStats.slice(3, 13),
    }).link,
    telemetry: { flightMode: "ANGLE", battery: { voltageV: 16.8 } },
    lastFrameAgeMs: 420,
    generatedAt: "2026-11-20T12:00:00.000Z",
    captureSessionId: "capture-test-session",
  });

  expect(evidence).toMatchObject({
    schema: "rotorbench.crsf-observation.v1",
    generatedAt: "2026-11-20T12:00:00.000Z",
    captureSessionId: "capture-test-session",
    baudRate: 420000,
    status: "frames-observed",
    observationStage: "rc-and-link-observed",
    channelsObserved: true,
    linkStatisticsObserved: true,
    telemetryObserved: true,
    lastFrameAgeMs: 420,
    rfPathVerified: false,
    rawBytesIncluded: false,
    serialPortIdentityIncluded: false,
    diagnostics: { validFrames: 2, crcErrors: 1, resyncs: 3 },
  });
  expect(evidence.channels[0]).toEqual({
    channel: 1,
    raw: 992,
    protocolPercent: 50,
  });
  expect(evidence).not.toHaveProperty("port");
  expect(evidence).not.toHaveProperty("rawBytes");
  expect(crsfObservationFilename()).toBe("rotorbench-crsf-observation.json");
});

test("channel extrema are accumulated and compared with the planned calibration", () => {
  let ranges = [];
  ranges = updateChannelRanges(ranges, [172, 950, 992, 1811]);
  ranges = updateChannelRanges(ranges, [1811, 992, 1000, 170]);

  expect(ranges[0]).toEqual({ samples: 2, min: 172, max: 1811 });
  expect(ranges[1]).toEqual({ samples: 2, min: 950, max: 992 });
  expect(channelCalibrationStatus(ranges[0], {
    min: 172,
    mid: 992,
    max: 1811,
    deadband: 0.02,
  })).toBe("full");
  expect(channelCalibrationStatus(ranges[1], {
    min: 172,
    mid: 992,
    max: 1811,
    deadband: 0.02,
  })).toBe("partial");
  expect(channelCalibrationStatus(ranges[3], {
    min: 172,
    mid: 992,
    max: 1811,
    deadband: 0.02,
  })).toBe("outside");
  expect(summarizeChannelRanges(ranges, {
    min: 172,
    mid: 992,
    max: 1811,
    deadband: 0.02,
  })).toMatchObject({
    sampled: 4,
    unobserved: 12,
    full: 1,
    partial: 1,
    outside: 1,
  });

  const evidence = createCrsfObservationEvidence({
    baudRate: 420000,
    diagnostics: { validFrames: 2 },
    channels: [172, 950, 992, 1811],
    channelRanges: ranges,
    receiverCalibration: {
      min: 172,
      mid: 992,
      max: 1811,
      deadband: 0.02,
    },
    generatedAt: "2026-11-20T12:00:00.000Z",
  });
  expect(evidence).toMatchObject({
    receiverCalibration: {
      min: 172,
      mid: 992,
      max: 1811,
      deadband: 0.02,
    },
  });
  expect(evidence.channelRanges.map((range) => ({
    channel: range.channel,
    samples: range.samples,
    min: range.min,
    max: range.max,
    calibrationStatus: range.calibrationStatus,
  }))).toEqual([
    {
      channel: 1,
      samples: 2,
      min: 172,
      max: 1811,
      calibrationStatus: "full",
    },
    {
      channel: 2,
      samples: 2,
      min: 950,
      max: 992,
      calibrationStatus: "partial",
    },
    {
      channel: 3,
      samples: 2,
      min: 992,
      max: 1000,
      calibrationStatus: "narrow",
    },
    {
      channel: 4,
      samples: 2,
      min: 170,
      max: 1811,
      calibrationStatus: "outside",
    },
  ]);
});

test("failed captures remain exportable evidence without invented RF success", () => {
  const noBytes = createCrsfObservationEvidence({
    baudRate: 400000,
    expectedBaud: 400000,
    diagnostics: {
      bytesReceived: 0,
      validFrames: 0,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      pendingBytes: 0,
      frameTypeCounts: {},
    },
    captureStatus: "stopped",
    capturedBytes: 0,
    role: "tx",
    targetName: "Aerial Kit ELRS USB TX Rev A3",
    channelMap: { arm: 5, flightMode: 6, velocity: null },
    generatedAt: "2026-11-20T12:00:00.000Z",
  });
  expect(noBytes).toMatchObject({
    status: "no-bytes",
    captureStatus: "stopped",
    expectedBaud: 400000,
    observedBaud: 400000,
    rfPathVerified: false,
    rawBytesIncluded: false,
    plan: {
      role: "tx",
      targetName: "Aerial Kit ELRS USB TX Rev A3",
      channelMap: { arm: 5, flightMode: 6, velocity: null },
    },
  });

  const parserNoise = createCrsfObservationEvidence({
    baudRate: 420000,
    diagnostics: {
      bytesReceived: 12,
      validFrames: 0,
      crcErrors: 2,
      resyncs: 4,
      framingErrors: 1,
      pendingBytes: 3,
      frameTypeCounts: {},
    },
    captureStatus: "stopped",
    capturedBytes: 12,
  });
  expect(parserNoise).toMatchObject({
    status: "no-valid-frames",
    serialCaptureObserved: false,
    channelsObserved: false,
    linkStatisticsObserved: false,
    diagnostics: {
      bytesReceived: 12,
      crcErrors: 2,
      resyncs: 4,
      framingErrors: 1,
      pendingBytes: 3,
    },
  });
});
