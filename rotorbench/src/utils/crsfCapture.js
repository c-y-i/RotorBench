export const CRSF_MAX_FRAME_LENGTH = 64;
export const CRSF_CHANNEL_MIN = 172;
export const CRSF_CHANNEL_MID = 992;
export const CRSF_CHANNEL_MAX = 1811;
export const CRSF_FRAMETYPE_GPS = 0x02;
export const CRSF_FRAMETYPE_BATTERY = 0x08;
export const CRSF_FRAMETYPE_BAROMETER = 0x09;
export const CRSF_FRAMETYPE_LINK_STATISTICS = 0x14;
export const CRSF_FRAMETYPE_RC_CHANNELS = 0x16;
export const CRSF_FRAMETYPE_ATTITUDE = 0x1e;
export const CRSF_FRAMETYPE_FLIGHT_MODE = 0x21;

const VALID_ADDRESSES = new Set([0x00, 0x10, 0xc8, 0xea, 0xec, 0xee, 0xef]);
const FRAME_TYPE_NAMES = Object.freeze({
  [CRSF_FRAMETYPE_GPS]: "gps",
  [CRSF_FRAMETYPE_BATTERY]: "battery",
  [CRSF_FRAMETYPE_BAROMETER]: "barometer",
  [CRSF_FRAMETYPE_LINK_STATISTICS]: "link",
  [CRSF_FRAMETYPE_RC_CHANNELS]: "rc",
  [CRSF_FRAMETYPE_ATTITUDE]: "attitude",
  [CRSF_FRAMETYPE_FLIGHT_MODE]: "flightMode",
});

export function crsfFrameTypeName(frameType) {
  return FRAME_TYPE_NAMES[frameType] || `type-0x${Number(frameType).toString(16)}`;
}

export function crc8DvbS2(value) {
  let crc = 0;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0xd5) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export function unpackCrsfChannels(payload) {
  const arrayLike = Array.isArray(payload) || payload instanceof Uint8Array;
  if (!arrayLike || payload.length !== 22) {
    throw new Error("CRSF RC payload must be 22 bytes.");
  }
  const channels = [];
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (let channel = 0; channel < 16; channel += 1) {
    while (bits < 11) {
      accumulator |= payload[offset] << bits;
      offset += 1;
      bits += 8;
    }
    channels.push(accumulator & 0x7ff);
    accumulator >>= 11;
    bits -= 11;
  }
  return channels;
}

function signedByte(value) {
  return value > 127 ? value - 256 : value;
}

function uint16be(payload, offset) {
  return (payload[offset] << 8) | payload[offset + 1];
}

function int16be(payload, offset) {
  const value = uint16be(payload, offset);
  return value > 0x7fff ? value - 0x10000 : value;
}

function uint24be(payload, offset) {
  return (payload[offset] << 16) | (payload[offset + 1] << 8) | payload[offset + 2];
}

function int32be(payload, offset) {
  return (
    (payload[offset] << 24)
    | (payload[offset + 1] << 16)
    | (payload[offset + 2] << 8)
    | payload[offset + 3]
  );
}

export function decodeCrsfLinkStatistics(payload) {
  if (!payload || payload.length !== 10) return null;
  return {
    uplinkRssi1Dbm: -payload[0],
    uplinkRssi2Dbm: -payload[1],
    uplinkLinkQuality: payload[2],
    uplinkSnrDb: signedByte(payload[3]),
    activeAntenna: payload[4],
    rfMode: payload[5],
    uplinkTxPowerRaw: payload[6],
    downlinkRssiDbm: -payload[7],
    downlinkLinkQuality: payload[8],
    downlinkSnrDb: signedByte(payload[9]),
  };
}

export function decodeCrsfTelemetry(frame) {
  const payload = frame.payload;
  if (frame.frameType === CRSF_FRAMETYPE_ATTITUDE && payload.length >= 6) {
    return {
      kind: "attitude",
      telemetry: {
        pitchRad: int16be(payload, 0) / 10000,
        rollRad: int16be(payload, 2) / 10000,
        yawRad: int16be(payload, 4) / 10000,
      },
    };
  }
  if (frame.frameType === CRSF_FRAMETYPE_BATTERY && payload.length >= 8) {
    return {
      kind: "battery",
      telemetry: {
        voltageV: uint16be(payload, 0) / 10,
        currentA: uint16be(payload, 2) / 10,
        capacityMah: uint24be(payload, 4),
        remainingPercent: payload[7],
      },
    };
  }
  if (frame.frameType === CRSF_FRAMETYPE_BAROMETER && payload.length >= 4) {
    const altitudeRaw = uint16be(payload, 0);
    return {
      kind: "barometer",
      telemetry: {
        altitudeM: altitudeRaw & 0x8000
          ? altitudeRaw & 0x7fff
          : (altitudeRaw - 10000) / 10,
        verticalSpeedMps: int16be(payload, 2) / 100,
      },
    };
  }
  if (frame.frameType === CRSF_FRAMETYPE_GPS && payload.length >= 15) {
    return {
      kind: "gps",
      telemetry: {
        latitudeDeg: int32be(payload, 0) / 1e7,
        longitudeDeg: int32be(payload, 4) / 1e7,
        groundspeedMps: uint16be(payload, 8) / 36,
        headingDeg: (uint16be(payload, 10) / 100) % 360,
        altitudeM: uint16be(payload, 12) - 1000,
        satellites: payload[14],
      },
    };
  }
  if (frame.frameType === CRSF_FRAMETYPE_FLIGHT_MODE) {
    const end = payload.indexOf(0);
    const text = payload.slice(0, end < 0 ? payload.length : end);
    return {
      kind: "flightMode",
      telemetry: {
        mode: Array.from(text)
          .map((byte) => byte < 0x80 ? String.fromCharCode(byte) : "\ufffd")
          .join(""),
      },
    };
  }
  return null;
}

export function channelPercent(value) {
  const bounded = Math.max(CRSF_CHANNEL_MIN, Math.min(CRSF_CHANNEL_MAX, value));
  return ((bounded - CRSF_CHANNEL_MIN) / (CRSF_CHANNEL_MAX - CRSF_CHANNEL_MIN)) * 100;
}

function finiteCalibration(calibration) {
  const min = Number(calibration?.min);
  const mid = Number(calibration?.mid);
  const max = Number(calibration?.max);
  const deadband = Number(calibration?.deadband);
  return Number.isFinite(min)
    && Number.isFinite(mid)
    && Number.isFinite(max)
    && Number.isFinite(deadband)
    && min < mid
    && mid < max
    && deadband >= 0
    ? { min, mid, max, deadband }
    : null;
}

export function updateChannelRanges(currentRanges, channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    return Array.isArray(currentRanges) ? currentRanges : [];
  }
  const next = Array.isArray(currentRanges) ? [...currentRanges] : [];
  channels.forEach((raw, index) => {
    if (!Number.isFinite(raw)) return;
    const previous = next[index];
    next[index] = previous
      ? {
          samples: previous.samples + 1,
          min: Math.min(previous.min, raw),
          max: Math.max(previous.max, raw),
        }
      : { samples: 1, min: raw, max: raw };
  });
  return next;
}

export function channelCalibrationStatus(channelRange, calibration) {
  if (!channelRange?.samples) return "unobserved";
  const plan = finiteCalibration(calibration);
  if (!plan) return "sampled";
  if (channelRange.min < plan.min || channelRange.max > plan.max) return "outside";
  if (channelRange.min <= plan.min && channelRange.max >= plan.max) return "full";
  const deadbandSpan = (plan.max - plan.min) * plan.deadband;
  return channelRange.max - channelRange.min <= deadbandSpan
    ? "narrow"
    : "partial";
}

export function summarizeChannelRanges(channelRanges, calibration) {
  const summary = {
    sampled: 0,
    unobserved: 0,
    narrow: 0,
    partial: 0,
    full: 0,
    outside: 0,
  };
  const channels = Array.isArray(channelRanges) ? channelRanges : [];
  for (let index = 0; index < Math.max(16, channels.length); index += 1) {
    const status = channelCalibrationStatus(channels[index], calibration);
    summary[status] += 1;
    if (status !== "unobserved") summary.sampled += 1;
  }
  return summary;
}

export class CrsfStreamParser {
  constructor() {
    this.buffer = [];
    this.resetDiagnostics();
  }

  reset() {
    this.buffer = [];
    this.resetDiagnostics();
  }

  resetDiagnostics() {
    this.bytesReceived = 0;
    this.validFrames = 0;
    this.crcErrors = 0;
    this.resyncs = 0;
    this.framingErrors = 0;
    this.frameTypeCounts = {};
  }

  get pendingBytes() {
    return this.buffer.length;
  }

  feed(value) {
    this.bytesReceived += value.length;
    this.buffer.push(...value);
    const frames = [];

    while (this.buffer.length >= 2) {
      if (!VALID_ADDRESSES.has(this.buffer[0])) {
        this.buffer.shift();
        this.resyncs += 1;
        continue;
      }
      const length = this.buffer[1];
      const total = length + 2;
      if (length < 2 || total > CRSF_MAX_FRAME_LENGTH) {
        this.buffer.shift();
        this.resyncs += 1;
        this.framingErrors += 1;
        continue;
      }
      if (this.buffer.length < total) break;

      const body = this.buffer.slice(2, total - 1);
      if (crc8DvbS2(body) !== this.buffer[total - 1]) {
        this.buffer.shift();
        this.crcErrors += 1;
        this.resyncs += 1;
        continue;
      }

      const payload = Uint8Array.from(this.buffer.slice(3, total - 1));
      frames.push({
        address: this.buffer[0],
        frameType: this.buffer[2],
        payload,
      });
      const frameTypeName = crsfFrameTypeName(this.buffer[2]);
      this.frameTypeCounts[frameTypeName] = (
        this.frameTypeCounts[frameTypeName] || 0
      ) + 1;
      this.validFrames += 1;
      this.buffer.splice(0, total);
    }
    return frames;
  }
}

export function getCrsfParserDiagnostics(parser) {
  return {
    bytesReceived: parser?.bytesReceived || 0,
    validFrames: parser?.validFrames || 0,
    crcErrors: parser?.crcErrors || 0,
    resyncs: parser?.resyncs || 0,
    framingErrors: parser?.framingErrors || 0,
    pendingBytes: parser?.pendingBytes || 0,
    frameTypeCounts: { ...(parser?.frameTypeCounts || {}) },
  };
}

export function decodeCrsfFrame(frame) {
  if (frame.frameType === CRSF_FRAMETYPE_RC_CHANNELS && frame.payload.length === 22) {
    return {
      kind: "rc",
      channels: unpackCrsfChannels(frame.payload),
    };
  }
  if (frame.frameType === CRSF_FRAMETYPE_LINK_STATISTICS) {
    const link = decodeCrsfLinkStatistics(frame.payload);
    return link ? { kind: "link", link } : null;
  }
  return decodeCrsfTelemetry(frame);
}

export function createCrsfObservationEvidence({
  baudRate,
  expectedBaud = null,
  diagnostics,
  channels,
  link,
  telemetry,
  lastFrameAgeMs = null,
  lastFrameObservedAt = null,
  rcCadenceMs = null,
  captureStatus = "unknown",
  capturedBytes = 0,
  captureStartedAt = null,
  captureEndedAt = null,
  captureSessionId = null,
  role = null,
  targetName = null,
  channelMap = null,
  channelRanges = null,
  receiverCalibration = null,
  generatedAt = new Date().toISOString(),
}) {
  const telemetryObserved = Boolean(telemetry && Object.keys(telemetry).length);
  let observationStage = "awaiting-valid-frames";
  if (channels && link) observationStage = "rc-and-link-observed";
  else if (channels) observationStage = "rc-observed";
  else if (link) observationStage = "link-observed";
  else if (telemetryObserved) observationStage = "telemetry-observed";
  else if (diagnostics?.validFrames) observationStage = "frames-observed";

  const status = diagnostics?.validFrames
    ? "frames-observed"
    : capturedBytes > 0
      ? "no-valid-frames"
      : captureStatus === "error"
        ? "capture-error"
        : "no-bytes";

  return {
    schema: "rotorbench.crsf-observation.v1",
    generatedAt,
    source: "read-only Web Serial capture",
    protocol: "CRSF",
    baudRate,
    expectedBaud,
    observedBaud: baudRate,
    captureStatus,
    capturedBytes,
    captureStartedAt,
    captureEndedAt,
    captureSessionId,
    plan: {
      role,
      targetName,
      channelMap: channelMap ? { ...channelMap } : null,
    },
    observationStage,
    status,
    serialCaptureObserved: Boolean(diagnostics?.validFrames),
    channelsObserved: Boolean(channels),
    linkStatisticsObserved: Boolean(link),
    telemetryObserved,
    lastFrameAgeMs,
    lastFrameObservedAt,
    rcCadenceMs,
    rfPathVerified: false,
    rawBytesIncluded: false,
    serialPortIdentityIncluded: false,
    diagnostics: {
      validFrames: diagnostics?.validFrames || 0,
      crcErrors: diagnostics?.crcErrors || 0,
      resyncs: diagnostics?.resyncs || 0,
      framingErrors: diagnostics?.framingErrors || 0,
      bytesReceived: diagnostics?.bytesReceived || 0,
      pendingBytes: diagnostics?.pendingBytes || 0,
      frameTypeCounts: { ...(diagnostics?.frameTypeCounts || {}) },
    },
    channels: channels
      ? channels.map((raw, index) => ({
          channel: index + 1,
          raw,
          protocolPercent: Number(channelPercent(raw).toFixed(1)),
        }))
      : null,
    channelRanges: Array.isArray(channelRanges)
      ? channelRanges
          .map((range, index) => range?.samples
            ? {
                channel: index + 1,
                samples: range.samples,
                min: range.min,
                max: range.max,
                span: range.max - range.min,
                calibrationStatus: channelCalibrationStatus(
                  range,
                  receiverCalibration,
                ),
              }
            : null)
          .filter(Boolean)
      : null,
    receiverCalibration: finiteCalibration(receiverCalibration),
    link: link || null,
    telemetry: telemetry || null,
    boundary:
      "Observed CRSF serial frames do not prove the intended TX-to-RX RF path.",
  };
}

export function crsfObservationFilename() {
  return "rotorbench-crsf-observation.json";
}
