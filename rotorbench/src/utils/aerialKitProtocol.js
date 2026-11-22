import { AK_FEATURE_NAMES } from "./fcEvidence";

// Aerial Kit AKP framing and read-only reply parsers. Source:
// aerial-kit/firmware/src/core/ak_proto.c and
// aerial-kit/apps/configurator/src/protocol/{frame,messages}.ts.
export const AERIAL_KIT_SYNC1 = 0xaa;
export const AERIAL_KIT_SYNC2 = 0x55;
export const AERIAL_KIT_PROTOCOL_VERSION = 1;
export const AERIAL_KIT_RESPONSE_BIT = 0x80;
export const AERIAL_KIT_MAX_PAYLOAD = 96;
export const AERIAL_KIT_UNKNOWN_COMMAND = 0x7f;
export const AERIAL_KIT_FEATURE_PARAM_INFO = 1 << 0;
export const AERIAL_KIT_FEATURE_RC_CHANNELS = 1 << 4;
export const AERIAL_KIT_FEATURE_SENSOR_INFO = 1 << 5;
export const AERIAL_KIT_FEATURE_OUTPUT_INFO = 1 << 6;
export const AERIAL_KIT_FEATURE_LOG_STREAM = 1 << 8;
export const AERIAL_KIT_FEATURE_PREFLIGHT = 1 << 9;
export const AERIAL_KIT_FEATURE_PERF = 1 << 12;
export const AERIAL_KIT_FEATURE_MOTOR_TELEMETRY = 1 << 13;
export const AERIAL_KIT_PARAMETER_READ_LIMIT = 255;
export const AERIAL_KIT_PREFLIGHT_MAX_LINES = 32;
export const AERIAL_KIT_PREFLIGHT_NAME_MAX = 24;
export const AERIAL_KIT_PERF_SECTIONS = 5;
export const AERIAL_KIT_MOTOR_MAX = 4;
export const AERIAL_KIT_MOTOR_ENTRY_BYTES = 19;
export const AERIAL_KIT_LOG_STREAM_MAX_HZ = 50;
export const AERIAL_KIT_TELEMETRY_MAX_HZ = 50;
export const AERIAL_KIT_COMMANDS = Object.freeze({
  hello: 0x01,
  paramGet: 0x02,
  status: 0x05,
  telemetry: 0x08,
  paramInfo: 0x0a,
  paramHelp: 0x0b,
  rcChannels: 0x0d,
  sensorInfo: 0x0e,
  outputInfo: 0x0f,
  logStream: 0x11,
  preflight: 0x12,
  perf: 0x15,
  motorTelemetry: 0x16,
  logSource: 0x09,
});

export const AERIAL_KIT_SENSOR_TOPICS = Object.freeze([
  { id: 0, name: "IMU", bodyLength: 12 + 1 + 1 + 6 + 6 + 6 + 6 + 4 + 4 },
  { id: 1, name: "Barometer", bodyLength: 12 + 4 + 2 + 1 + 4 + 4 + 1 + 4 + 4 + 4 + 4 + 4 + 4 },
  { id: 2, name: "Rangefinder", bodyLength: 12 + 1 + 2 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 2 },
  { id: 3, name: "Battery", bodyLength: 1 + 1 + 1 + 1 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 4 + 4 + 4 },
  { id: 4, name: "GPS", bodyLength: 1 + 1 + 1 + 1 + 1 + 4 + 4 + 4 + 4 + 4 + 1 + 4 + 4 + 4 + 4 + 1 + 1 + 4 + 4 + 4 },
]);

const OUTPUT_KIND_NAMES = Object.freeze({
  0: "motor",
  1: "servo",
});

const IMU_ABSENT_REASONS = Object.freeze({
  1: "nothing answered on the bus",
  2: "unknown part answered",
  3: "known part would not configure",
});

const BATTERY_STATE_NAMES = Object.freeze({
  0: "absent",
  1: "ok",
  2: "warn",
  3: "critical",
});

const GPS_FIX_NAMES = Object.freeze({
  0: "no fix",
  1: "dead reckoning only",
  2: "2D fix",
  3: "3D fix",
  4: "3D fix with dead reckoning",
  5: "time only, no position",
});

const PREFLIGHT_VERDICTS = Object.freeze({
  0: { name: "fail", label: "Fail" },
  1: { name: "pass", label: "Pass" },
  2: { name: "fact", label: "Reading" },
});

const MOTOR_FLAGS = Object.freeze([
  { bit: 1 << 0, name: "measured" },
  { bit: 1 << 1, name: "rpm" },
  { bit: 1 << 2, name: "temperature" },
  { bit: 1 << 3, name: "voltage" },
  { bit: 1 << 4, name: "current" },
]);

const LOG_SOURCE_NAMES = Object.freeze({
  0: "fast",
  1: "long",
  2: "flash",
});

const LOG_STREAM_STATUS_NAMES = Object.freeze({
  0: "record",
  1: "hole",
  2: "done",
});

export const AERIAL_KIT_PARAMETER_TYPES = Object.freeze({
  0: "float",
  1: "u32",
  2: "text",
});

export const AERIAL_KIT_PARAMETER_GROUPS = Object.freeze({
  0: "none",
  1: "rates",
  2: "angle",
  3: "arming",
  4: "receiver",
  5: "airframe",
  6: "outputs",
  7: "power",
  8: "failsafe",
  9: "navigation",
  10: "sensors",
  11: "network",
  12: "timing",
});

export const AERIAL_KIT_FLIGHT_STATES = Object.freeze([
  "disarmed",
  "armed",
  "failsafe",
  "return to home",
  "autopilot",
  "descend",
]);

const RC_FLAG_NAMES = Object.freeze([
  { bit: 1 << 0, name: "link", label: "Link" },
  { bit: 1 << 1, name: "failsafe", label: "Failsafe" },
  { bit: 1 << 2, name: "decoded", label: "Decoded" },
  { bit: 1 << 3, name: "no-inverter", label: "No inverter" },
  { bit: 1 << 4, name: "telemetry", label: "Telemetry" },
]);

const RC_SWITCH_NAMES = Object.freeze([
  { bit: 1 << 0, name: "arm", label: "Arm high" },
  { bit: 1 << 1, name: "angle", label: "Angle high" },
]);

const RC_PROTOCOLS = Object.freeze({
  0: "CRSF",
  1: "SBUS",
});

function asBytes(value) {
  return value instanceof Uint8Array ? value : Uint8Array.from(value || []);
}

function decodeAscii(bytes) {
  return Array.from(bytes)
    .map((byte) => byte < 0x80 ? String.fromCharCode(byte) : "\ufffd")
    .join("");
}

export function decodeAerialKitText(bytes) {
  const value = asBytes(bytes);
  if (typeof TextDecoder === "function") {
    try {
      return new TextDecoder().decode(value);
    } catch {
      // Fall through to the ASCII-preserving decoder below.
    }
  }
  return decodeAscii(value);
}

function readCString(bytes, offset, label) {
  if (offset < 0 || offset >= bytes.length) {
    throw new Error(`${label} is missing.`);
  }
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) end += 1;
  if (end >= bytes.length) {
    throw new Error(`${label} has no terminator.`);
  }
  return {
    value: decodeAscii(bytes.subarray(offset, end)),
    next: end + 1,
  };
}

function u16le(bytes, offset, label) {
  if (offset + 2 > bytes.length) throw new Error(`${label} is missing.`);
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32le(bytes, offset, label) {
  if (offset + 4 > bytes.length) throw new Error(`${label} is missing.`);
  return (
    bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)
  ) >>> 0;
}

function namedBits(mask, definitions) {
  return definitions
    .filter((entry) => (mask & entry.bit) !== 0)
    .map((entry) => entry.name);
}

export function aerialKitCrc16(bytes) {
  let crc = 0xffff;
  for (const byte of asBytes(bytes)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

export function buildAerialKitFrame(command, payload = new Uint8Array()) {
  const bytes = asBytes(payload);
  if (!Number.isInteger(command) || command < 0 || command > 0xff) {
    throw new RangeError("AKP command must fit in one byte.");
  }
  if (bytes.length > AERIAL_KIT_MAX_PAYLOAD) {
    throw new RangeError(`AKP payload exceeds ${AERIAL_KIT_MAX_PAYLOAD} bytes.`);
  }
  const body = new Uint8Array(3 + bytes.length);
  body[0] = AERIAL_KIT_PROTOCOL_VERSION;
  body[1] = command;
  body[2] = bytes.length;
  body.set(bytes, 3);
  const crc = aerialKitCrc16(body);
  return Uint8Array.from([
    AERIAL_KIT_SYNC1,
    AERIAL_KIT_SYNC2,
    ...body,
    crc & 0xff,
    crc >> 8,
  ]);
}

export class AerialKitFrameDecoder {
  constructor() {
    this.buffer = new Uint8Array();
    this.issues = [];
    this.stats = {
      bytesReceived: 0,
      framesDecoded: 0,
      checksumErrors: 0,
      lengthErrors: 0,
      versionErrors: 0,
      bytesDiscarded: 0,
    };
  }

  reset() {
    this.buffer = new Uint8Array();
    this.issues = [];
    Object.keys(this.stats).forEach((key) => {
      this.stats[key] = 0;
    });
  }

  takeIssues() {
    const issues = this.issues;
    this.issues = [];
    return issues;
  }

  consume(count) {
    const amount = Math.max(0, Math.min(count, this.buffer.length));
    this.buffer = this.buffer.slice(amount);
  }

  discard(count) {
    const amount = Math.max(0, Math.min(count, this.buffer.length));
    this.consume(amount);
    this.stats.bytesDiscarded += amount;
  }

  feed(value) {
    const incoming = asBytes(value);
    this.stats.bytesReceived += incoming.length;
    if (!incoming.length) return [];
    const merged = new Uint8Array(this.buffer.length + incoming.length);
    merged.set(this.buffer);
    merged.set(incoming, this.buffer.length);
    this.buffer = merged;

    const frames = [];
    while (this.buffer.length >= 2) {
      const sync = this.buffer.findIndex((byte, index) => (
        byte === AERIAL_KIT_SYNC1
        && this.buffer[index + 1] === AERIAL_KIT_SYNC2
      ));
      if (sync < 0) {
        const keepTrailingSync = this.buffer[this.buffer.length - 1]
          === AERIAL_KIT_SYNC1;
        this.discard(this.buffer.length - (keepTrailingSync ? 1 : 0));
        break;
      }
      if (sync > 0) this.discard(sync);
      if (this.buffer.length < 6) break;
      const declared = this.buffer[4];
      if (declared > AERIAL_KIT_MAX_PAYLOAD) {
        this.stats.lengthErrors += 1;
        this.issues.push({
          kind: "length",
          detail: `AKP frame declared ${declared} payload bytes.`,
        });
        this.discard(1);
        continue;
      }
      const frameLength = 7 + declared;
      if (this.buffer.length < frameLength) break;
      const version = this.buffer[2];
      const command = this.buffer[3];
      const payload = this.buffer.slice(5, 5 + declared);
      const expected = aerialKitCrc16(this.buffer.slice(2, 5 + declared));
      const received = this.buffer[5 + declared]
        | (this.buffer[6 + declared] << 8);
      if (expected !== received) {
        this.stats.checksumErrors += 1;
        this.issues.push({
          kind: "checksum",
          expected,
          received,
          detail: "AKP checksum did not match.",
        });
        this.discard(1);
        continue;
      }
      if (version !== AERIAL_KIT_PROTOCOL_VERSION) {
        this.stats.versionErrors += 1;
        this.issues.push({
          kind: "version",
          version,
          detail: `AKP protocol version ${version} is not supported.`,
        });
        this.consume(frameLength);
        continue;
      }
      frames.push({
        version,
        command: command & ~AERIAL_KIT_RESPONSE_BIT,
        rawCommand: command,
        response: (command & AERIAL_KIT_RESPONSE_BIT) !== 0,
        payload,
      });
      this.stats.framesDecoded += 1;
      this.consume(frameLength);
    }
    return frames;
  }
}

export function parseAerialKitHello(payload) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit HELLO payload is empty.");
  const protocolVersion = bytes[0];
  const product = readCString(bytes, 1, "HELLO product");
  const parameterCount = u16le(bytes, product.next, "HELLO parameter count");
  const changed = readCString(
    bytes,
    product.next + 2,
    "HELLO changed count",
  );
  const trailing = bytes.length - changed.next;
  if (trailing === 0) {
    return {
      protocolVersion,
      product: product.value,
      parameterCount,
      changed: changed.value,
      features: null,
      configHash: null,
      featureNames: [],
      featureDetails: [],
      capabilityState: "absent",
    };
  }
  if (trailing < 8) {
    throw new Error(
      "Aerial Kit HELLO capability word and config hash must arrive together.",
    );
  }
  const features = u32le(bytes, changed.next, "HELLO capability word");
  const configHash = u32le(bytes, changed.next + 4, "HELLO config hash");
  const featureDetails = AK_FEATURE_NAMES.filter(
    (feature) => (features & feature.bit) !== 0,
  );
  return {
    protocolVersion,
    product: product.value,
    parameterCount,
    changed: changed.value,
    features,
    configHash,
    featureNames: featureDetails.map((feature) => feature.name),
    featureDetails,
    capabilityState: "reported",
  };
}

export function parseAerialKitStatus(payload) {
  const bytes = asBytes(payload);
  if (bytes.length < 22) {
    throw new Error("Aerial Kit STATUS payload is shorter than 22 bytes.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    flightState: bytes[0],
    linkLive: bytes[1],
    gpsFixType: bytes[2],
    gpsSatellites: bytes[3],
    rollDeg: view.getInt16(4, true) / 10,
    pitchDeg: view.getInt16(6, true) / 10,
    yawDeg: view.getInt16(8, true) / 10,
    latitude: view.getInt32(10, true) / 1e7,
    longitude: view.getInt32(14, true) / 1e7,
    motors: Array.from(bytes.slice(18, 22)),
  };
}

export function parseAerialKitTelemetry(payload) {
  const bytes = asBytes(payload);
  if (bytes.length !== 26) {
    throw new Error(
      `Aerial Kit TELEMETRY frame must carry 26 bytes; this one carries ${bytes.length}.`,
    );
  }
  return {
    uptimeMs: u32le(bytes, 0, "TELEMETRY uptime"),
    ...parseAerialKitStatus(bytes.subarray(4)),
  };
}

export function parseAerialKitTelemetryRate(payload) {
  const bytes = asBytes(payload);
  if (bytes.length !== 1 || bytes[0] > AERIAL_KIT_TELEMETRY_MAX_HZ) {
    throw new Error("TELEMETRY subscription reply must carry one rate from 0 to 50 Hz.");
  }
  return bytes[0];
}

export function parseAerialKitParamGet(payload, index) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit PARAM_GET payload is empty.");
  if (bytes[0] !== 0) {
    throw new Error(
      bytes[0] === 1
        ? `The board has no parameter at index ${index}.`
        : `PARAM_GET for index ${index} returned status ${bytes[0]}.`,
    );
  }
  const name = readCString(bytes, 1, `Parameter ${index} name`);
  const value = readCString(bytes, name.next, `Parameter ${index} value`);
  return {
    index,
    name: name.value,
    value: value.value,
  };
}

export function parseAerialKitParamInfoPage(payload, askedFrom) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit PARAM_INFO payload is empty.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates PARAM_INFO and answered with the unknown-command status.",
    );
  }
  if (bytes[0] === 1) {
    return {
      status: "no-index",
      first: askedFrom,
      entries: [],
    };
  }
  if (![0, 2].includes(bytes[0])) {
    throw new Error(`PARAM_INFO returned status ${bytes[0]}.`);
  }
  if (bytes.length < 3) throw new Error("PARAM_INFO page header is incomplete.");
  const first = bytes[1];
  const carried = bytes[2];
  if (first !== (askedFrom & 0xff)) {
    throw new Error(`PARAM_INFO asked from ${askedFrom} but answered from ${first}.`);
  }
  if (bytes[0] === 2) {
    return {
      status: "too-big",
      first,
      entries: [],
    };
  }
  let offset = 3;
  const entries = [];
  for (let entryIndex = 0; entryIndex < carried; entryIndex += 1) {
    const name = readCString(bytes, offset, `PARAM_INFO entry ${entryIndex} name`);
    offset = name.next;
    if (offset + 4 > bytes.length) {
      throw new Error(`PARAM_INFO entry ${entryIndex} header is incomplete.`);
    }
    const type = bytes[offset];
    const group = bytes[offset + 1];
    const decimals = bytes[offset + 2];
    const flags = bytes[offset + 3];
    offset += 4;
    let min = null;
    let max = null;
    let maxLength = null;
    if (type === 2) {
      if (offset >= bytes.length) {
        throw new Error(`PARAM_INFO entry ${entryIndex} is missing its text limit.`);
      }
      maxLength = bytes[offset];
      offset += 1;
    } else if (type === 0 || type === 1) {
      const minimum = readCString(bytes, offset, `PARAM_INFO entry ${entryIndex} minimum`);
      const maximum = readCString(
        bytes,
        minimum.next,
        `PARAM_INFO entry ${entryIndex} maximum`,
      );
      min = minimum.value;
      max = maximum.value;
      offset = maximum.next;
    } else {
      throw new Error(
        `PARAM_INFO entry ${entryIndex} has unknown type ${type}.`,
      );
    }
    const defaultValue = readCString(
      bytes,
      offset,
      `PARAM_INFO entry ${entryIndex} default`,
    );
    offset = defaultValue.next;
    entries.push({
      name: name.value,
      type,
      typeName: AERIAL_KIT_PARAMETER_TYPES[type] || null,
      group,
      groupName: AERIAL_KIT_PARAMETER_GROUPS[group] || null,
      decimals,
      flags,
      secret: (flags & 1) !== 0,
      min,
      max,
      maxLength,
      default: defaultValue.value,
    });
  }
  if (offset !== bytes.length) {
    throw new Error(
      `PARAM_INFO carried ${bytes.length - offset} unexpected trailing bytes.`,
    );
  }
  return {
    status: "ok",
    first,
    entries,
  };
}

export function parseAerialKitParamHelpSlice(payload, askedIndex, askedOffset) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit PARAM_HELP payload is empty.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates PARAM_HELP and answered with the unknown-command status.",
    );
  }
  if (bytes[0] !== 0) {
    throw new Error(`PARAM_HELP for index ${askedIndex} returned status ${bytes[0]}.`);
  }
  if (bytes.length < 7) throw new Error("PARAM_HELP slice header is incomplete.");
  const index = bytes[1];
  const offset = u16le(bytes, 2, "PARAM_HELP offset");
  const total = u16le(bytes, 4, "PARAM_HELP total");
  const length = bytes[6];
  if (index !== (askedIndex & 0xff)) {
    throw new Error(`PARAM_HELP asked about ${askedIndex} but answered for ${index}.`);
  }
  if (offset !== askedOffset) {
    throw new Error(
      `PARAM_HELP asked from offset ${askedOffset} but answered from ${offset}.`,
    );
  }
  if (bytes.length !== 7 + length) {
    throw new Error(
      `PARAM_HELP declares ${length} text bytes but carries ${bytes.length - 7}.`,
    );
  }
  return {
    index,
    offset,
    total,
    bytes: bytes.slice(7),
  };
}

export function parseAerialKitPreflightPage(
  payload,
  askedIndex,
  askedOffset,
) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit PREFLIGHT payload is empty.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates PREFLIGHT and answered with the unknown-command status.",
    );
  }
  if (bytes[0] === 2) {
    if (bytes.length !== 1) {
      throw new Error(
        "A board with no preflight checklist must answer with one status byte.",
      );
    }
    return {
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
    };
  }
  if (![0, 1].includes(bytes[0])) {
    throw new Error(`PREFLIGHT returned status ${bytes[0]}.`);
  }
  if (bytes.length < 3) throw new Error("PREFLIGHT page header is incomplete.");
  const index = bytes[1];
  const count = bytes[2];
  if (bytes[0] === 1) {
    if (bytes.length !== 3) {
      throw new Error("A no-index PREFLIGHT reply must contain three bytes.");
    }
    if (index !== (askedIndex & 0xff)) {
      throw new Error(`PREFLIGHT asked for line ${askedIndex} but refused line ${index}.`);
    }
    return {
      status: "no-index",
      index,
      count,
      verdict: null,
      verdictName: null,
      verdictLabel: null,
      name: null,
      sentenceLength: 0,
      offset: askedOffset,
      detail: "",
      complete: false,
    };
  }
  if (index !== (askedIndex & 0xff)) {
    throw new Error(`PREFLIGHT asked for line ${askedIndex} but answered line ${index}.`);
  }
  if (count < 1 || count > AERIAL_KIT_PREFLIGHT_MAX_LINES) {
    throw new Error(`PREFLIGHT reported an invalid line count of ${count}.`);
  }
  if (bytes.length < 8) throw new Error("PREFLIGHT line page header is incomplete.");
  const verdict = bytes[3];
  const verdictDefinition = PREFLIGHT_VERDICTS[verdict];
  if (!verdictDefinition) {
    throw new Error(`PREFLIGHT returned unknown verdict ${verdict}.`);
  }
  const nameLength = bytes[4];
  if (nameLength > AERIAL_KIT_PREFLIGHT_NAME_MAX) {
    throw new Error(
      `PREFLIGHT line name is ${nameLength} bytes; the protocol maximum is ${AERIAL_KIT_PREFLIGHT_NAME_MAX}.`,
    );
  }
  if (5 + nameLength + 3 > bytes.length) {
    throw new Error("PREFLIGHT line name or sentence header is incomplete.");
  }
  const name = decodeAscii(bytes.subarray(5, 5 + nameLength));
  const sentenceLength = u16le(
    bytes,
    5 + nameLength,
    "PREFLIGHT sentence length",
  );
  const detailLength = bytes[7 + nameLength];
  const detailOffset = 8 + nameLength;
  if (bytes.length !== detailOffset + detailLength) {
    throw new Error(
      `PREFLIGHT declares ${detailLength} text bytes but carries ${bytes.length - detailOffset}.`,
    );
  }
  if (detailLength > sentenceLength) {
    throw new Error(
      `PREFLIGHT page carries ${detailLength} bytes of a ${sentenceLength}-byte sentence.`,
    );
  }
  if (askedOffset > sentenceLength) {
    throw new Error(
      `PREFLIGHT asked from offset ${askedOffset}, beyond the ${sentenceLength}-byte sentence.`,
    );
  }
  return {
    status: "ok",
    index,
    count,
    verdict,
    verdictName: verdictDefinition.name,
    verdictLabel: verdictDefinition.label,
    name,
    sentenceLength,
    offset: askedOffset,
    detail: decodeAscii(bytes.subarray(detailOffset)),
    complete: askedOffset + detailLength >= sentenceLength,
  };
}

export function parseAerialKitPerf(payload) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit PERF payload is empty.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates PERF and answered with the unknown-command status.",
    );
  }
  if (![0, 1].includes(bytes[0])) {
    throw new Error(`PERF returned status ${bytes[0]}.`);
  }
  if (bytes.length !== 59) {
    throw new Error(`PERF carries a 59-byte window and this reply has ${bytes.length}.`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 1;
  const u16 = () => {
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };
  const u32 = () => {
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const window = {
    status: bytes[0] === 0 ? "ok" : "none",
    loops: u32(),
    samples: u32(),
    nominalUs: u16(),
    periodLastUs: u32(),
    periodMinUs: u32(),
    periodMaxUs: u32(),
    late: u32(),
    jitterP50Us: u16(),
    jitterP99Us: u16(),
    jitterMaxUs: u16(),
    jitterOver: u32(),
    sectionAvgUsX10: Array.from(
      { length: AERIAL_KIT_PERF_SECTIONS },
      () => u16(),
    ),
    sectionMaxUs: Array.from(
      { length: AERIAL_KIT_PERF_SECTIONS },
      () => u16(),
    ),
    loadPermille: u16(),
  };
  if (offset !== bytes.length) {
    throw new Error(`PERF left ${bytes.length - offset} bytes unparsed.`);
  }
  return window;
}

export function parseAerialKitMotorTelemetry(payload) {
  const bytes = asBytes(payload);
  if (!bytes.length) {
    throw new Error("Aerial Kit MOTOR_TELEMETRY payload is empty.");
  }
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates MOTOR_TELEMETRY and answered with the unknown-command status.",
    );
  }
  if (bytes[0] === 1) {
    if (bytes.length !== 1) {
      throw new Error(
        "A board with no motor telemetry path must answer with one status byte.",
      );
    }
    return {
      status: "none",
      count: 0,
      poles: 0,
      motors: [],
    };
  }
  if (bytes[0] !== 0) {
    throw new Error(`MOTOR_TELEMETRY returned status ${bytes[0]}.`);
  }
  if (bytes.length < 3) {
    throw new Error("MOTOR_TELEMETRY header is incomplete.");
  }
  const count = bytes[1];
  const poles = bytes[2];
  if (count > AERIAL_KIT_MOTOR_MAX) {
    throw new Error(
      `MOTOR_TELEMETRY reports ${count} motors; the protocol maximum is ${AERIAL_KIT_MOTOR_MAX}.`,
    );
  }
  if (bytes.length !== 3 + count * AERIAL_KIT_MOTOR_ENTRY_BYTES) {
    throw new Error(
      `MOTOR_TELEMETRY with ${count} motors must carry ${3 + count * AERIAL_KIT_MOTOR_ENTRY_BYTES} bytes.`,
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const motors = Array.from({ length: count }, (_, index) => {
    const offset = 3 + index * AERIAL_KIT_MOTOR_ENTRY_BYTES;
    const flags = bytes[offset];
    return {
      index,
      flags,
      flagNames: namedBits(flags, MOTOR_FLAGS),
      measured: (flags & (1 << 0)) !== 0,
      erpm: view.getUint32(offset + 1, true),
      rpm: (flags & (1 << 1))
        ? view.getUint32(offset + 5, true)
        : null,
      temperature: (flags & (1 << 2)) ? bytes[offset + 9] : null,
      maxTemperature: (flags & (1 << 2)) ? bytes[offset + 10] : null,
      millivolts: (flags & (1 << 3))
        ? view.getUint16(offset + 11, true)
        : null,
      milliamps: (flags & (1 << 4))
        ? view.getUint16(offset + 13, true)
        : null,
      packets: view.getUint16(offset + 15, true),
      invalid: view.getUint16(offset + 17, true),
    };
  });
  return {
    status: "ok",
    count,
    poles,
    motors,
  };
}

export function parseAerialKitLogSource(payload, requestedSource) {
  const bytes = asBytes(payload);
  if (bytes.length !== 4) {
    throw new Error("LOG_SOURCE must carry status, source, and count.");
  }
  if (bytes[0] !== 0) {
    return {
      status: "unavailable",
      requestedSource,
      source: null,
      sourceName: LOG_SOURCE_NAMES[requestedSource] || `Source ${requestedSource}`,
      count: null,
    };
  }
  if (![0, 1, 2].includes(bytes[1])) {
    throw new Error(`LOG_SOURCE selected unknown source ${bytes[1]}.`);
  }
  return {
    status: "available",
    requestedSource,
    source: bytes[1],
    sourceName: LOG_SOURCE_NAMES[bytes[1]],
    count: u16le(bytes, 2, "LOG_SOURCE record count"),
  };
}

export function parseAerialKitLogStreamReply(payload) {
  const bytes = asBytes(payload);
  if (bytes.length !== 7) {
    throw new Error("LOG_STREAM reply must carry seven bytes.");
  }
  const source = bytes[1];
  if (![0, 1, 2].includes(source)) {
    throw new Error(`LOG_STREAM named unknown source ${source}.`);
  }
  if (bytes[0] !== 0) {
    return {
      status: "refused",
      source: null,
      sourceName: null,
      first: null,
      count: null,
      hz: null,
    };
  }
  return {
    status: "accepted",
    source,
    sourceName: LOG_SOURCE_NAMES[source],
    first: u16le(bytes, 2, "LOG_STREAM first index"),
    count: u16le(bytes, 4, "LOG_STREAM count"),
    hz: bytes[6],
  };
}

function logRecordBodyLength(available) {
  if ([51, 66, 87].includes(available)) return available;
  throw new Error(
    `Aerial Kit log record must carry 51, 66, or 87 bytes; this one carries ${available}.`,
  );
}

function decodeAerialKitLogRecord(body, index) {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const version = body.length === 51 ? 2 : body.length === 66 ? 3 : 4;
  const vector16 = (offset) => [
    view.getInt16(offset, true),
    view.getInt16(offset + 2, true),
    view.getInt16(offset + 4, true),
  ];
  return {
    index,
    version,
    bytes: body.length,
    timeMs: view.getUint32(0, true),
    gyro: vector16(4),
    accel: vector16(10),
    rollDeg: view.getInt16(16, true) / 10,
    pitchDeg: view.getInt16(18, true) / 10,
    yawDeg: view.getInt16(20, true) / 10,
    altMm: view.getInt32(22, true),
    stick: [
      view.getInt16(26, true),
      view.getInt16(28, true),
      view.getInt16(30, true),
      view.getInt16(32, true),
    ],
    torque: [body[34], body[35], body[36]],
    motors: Array.from(body.slice(37, 41)),
    state: body[41],
    flags: body[42],
    lat: view.getInt32(43, true) / 1e7,
    lon: view.getInt32(47, true) / 1e7,
    gyroFiltered: version >= 3 ? vector16(51) : null,
    notchHz: version >= 3
      ? [
          view.getUint16(57, true),
          view.getUint16(59, true),
          view.getUint16(61, true),
        ]
      : null,
    notchEngaged: version >= 3
      ? Array.from(body.slice(63, 66))
      : null,
    timeUs: version >= 4 ? view.getUint32(66, true) : null,
    rateSetpoint: version >= 4 ? vector16(70) : null,
    pidP: version >= 4 ? Array.from(body.slice(76, 79)) : null,
    pidI: version >= 4 ? Array.from(body.slice(79, 82)) : null,
    pidD: version >= 4 ? Array.from(body.slice(82, 85)) : null,
    vbatMv: version >= 4 && (body[42] & 0x10) !== 0
      ? view.getUint16(85, true)
      : null,
  };
}

export function parseAerialKitLogStreamFrame(payload) {
  const bytes = asBytes(payload);
  if (bytes.length < 4) {
    throw new Error("LOG_STREAM frame header is incomplete.");
  }
  const status = bytes[0];
  const source = bytes[1];
  if (![0, 1, 2].includes(status)) {
    throw new Error(`LOG_STREAM returned unknown frame status ${status}.`);
  }
  if (![0, 1, 2].includes(source)) {
    throw new Error(`LOG_STREAM returned unknown source ${source}.`);
  }
  const index = u16le(bytes, 2, "LOG_STREAM frame index");
  if (status !== 0) {
    if (bytes.length !== 4) {
      throw new Error("A LOG_STREAM hole or done frame must carry only its four-byte header.");
    }
    return {
      status: LOG_STREAM_STATUS_NAMES[status],
      source,
      sourceName: LOG_SOURCE_NAMES[source],
      index,
      record: null,
    };
  }
  const bodyLength = logRecordBodyLength(bytes.length - 4);
  return {
    status: "record",
    source,
    sourceName: LOG_SOURCE_NAMES[source],
    index,
    record: decodeAerialKitLogRecord(bytes.subarray(4, 4 + bodyLength), index),
  };
}

export function parseAerialKitSensorInfo(payload) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit SENSOR_INFO payload is empty.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates SENSOR_INFO and answered with the unknown-command status.",
    );
  }
  if (![0, 1].includes(bytes[0])) {
    throw new Error(`SENSOR_INFO returned status ${bytes[0]}.`);
  }
  if (bytes.length < 3) throw new Error("SENSOR_INFO header is incomplete.");
  const topic = bytes[1];
  const present = bytes[2] !== 0;
  const definition = AERIAL_KIT_SENSOR_TOPICS.find((entry) => entry.id === topic);
  if (bytes[0] === 1) {
    if (bytes.length !== 3) {
      throw new Error("A no-such-sensor SENSOR_INFO reply must contain three bytes.");
    }
    return {
      status: "no-such-topic",
      topic,
      topicName: definition?.name || `Topic ${topic}`,
      present: false,
      driver: null,
    };
  }
  if (!present) {
    if (bytes.length !== 3) {
      throw new Error("An absent sensor must not carry a reading body.");
    }
    return {
      status: "absent",
      topic,
      topicName: definition?.name || `Topic ${topic}`,
      present: false,
      driver: null,
    };
  }
  if (!definition) throw new Error(`SENSOR_INFO returned unknown topic ${topic}.`);
  if (bytes.length !== 3 + definition.bodyLength) {
    throw new Error(
      `${definition.name} must carry a ${definition.bodyLength}-byte body.`,
    );
  }
  const body = decodeAerialKitSensorBody(topic, bytes.subarray(3));
  return {
    status: "present",
    topic,
    topicName: definition.name,
    present: true,
    driver: typeof body.driver === "string" && body.driver
      ? body.driver
      : null,
    body,
  };
}

function sensorCursor(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const require = (count) => {
    if (offset + count > bytes.length) {
      throw new Error("SENSOR_INFO body ended before its declared fields.");
    }
  };
  return {
    u8() {
      require(1);
      return bytes[offset++];
    },
    u16() {
      require(2);
      const value = view.getUint16(offset, true);
      offset += 2;
      return value;
    },
    i16() {
      require(2);
      const value = view.getInt16(offset, true);
      offset += 2;
      return value;
    },
    u32() {
      require(4);
      const value = view.getUint32(offset, true);
      offset += 4;
      return value;
    },
    i32() {
      require(4);
      const value = view.getInt32(offset, true);
      offset += 4;
      return value;
    },
    fixedName() {
      require(12);
      const value = decodeAscii(bytes.subarray(offset, offset + 12))
        .replace(/\0+$/, "");
      offset += 12;
      return value;
    },
    vector16() {
      return [this.i16(), this.i16(), this.i16()];
    },
    done() {
      return offset === bytes.length;
    },
  };
}

function decodeAerialKitSensorBody(topic, body) {
  const cursor = sensorCursor(body);
  let value;
  if (topic === 0) {
    const driver = cursor.fixedName();
    const absent = cursor.u8();
    value = {
      driver,
      absent,
      absentReason: IMU_ABSENT_REASONS[absent] || null,
      whoami: cursor.u8(),
      accelMg: cursor.vector16(),
      gyroMradS: cursor.vector16(),
      alignDeg: cursor.vector16(),
      gyroBiasMdps: cursor.vector16(),
      samples: cursor.u32(),
      errors: cursor.u32(),
    };
  } else if (topic === 1) {
    value = {
      driver: cursor.fixedName(),
      pressurePa: cursor.i32(),
      temperatureC: cursor.i16() / 100,
      haveReference: cursor.u8() !== 0,
      referencePa: cursor.i32(),
      heightCm: cursor.i32(),
      haveGpsReference: cursor.u8() !== 0,
      fusedCm: cursor.i32(),
      samples: cursor.u32(),
      errors: cursor.u32(),
      fails: cursor.u32(),
      baroSamples: cursor.u32(),
      gpsSamples: cursor.u32(),
    };
  } else if (topic === 2) {
    value = {
      driver: cursor.fixedName(),
      address: cursor.u8(),
      maxMm: cursor.u16(),
      distanceMm: cursor.i32(),
      ageMs: cursor.u32(),
      samples: cursor.u32(),
      outOfRange: cursor.u32(),
      rejected: cursor.u32(),
      faults: cursor.u32(),
      fails: cursor.u32(),
      landMm: cursor.u32(),
      agreeCm: cursor.u16(),
    };
  } else if (topic === 3) {
    const ready = cursor.u8() !== 0;
    const haveReading = cursor.u8() !== 0;
    const state = cursor.u8();
    value = {
      ready,
      haveReading,
      state,
      stateName: BATTERY_STATE_NAMES[state] || null,
      cells: cursor.u8(),
      volts: cursor.u16() / 100,
      voltsPerCell: cursor.u16() / 100,
      pinMv: cursor.i16(),
      ratio: cursor.u16() / 1000,
      rth: cursor.u8() !== 0,
      warnCellV: cursor.u16() / 1000,
      criticalCellV: cursor.u16() / 1000,
      samples: cursor.u32(),
      rejected: cursor.u32(),
      returns: cursor.u32(),
    };
  } else if (topic === 4) {
    const haveFix = cursor.u8() !== 0;
    const fixType = cursor.u8();
    value = {
      haveFix,
      fixType,
      fixName: GPS_FIX_NAMES[fixType] || null,
      fixOk: cursor.u8() !== 0,
      satellites: cursor.u8(),
      validNow: cursor.u8() !== 0,
      lat: cursor.i32() / 1e7,
      lon: cursor.i32() / 1e7,
      altMslMm: cursor.i32(),
      speedMmS: cursor.i32(),
      courseDeg: cursor.i32() / 1e5,
      haveHome: cursor.u8() !== 0,
      homeLat: cursor.i32() / 1e7,
      homeLon: cursor.i32() / 1e7,
      homeDistanceM: cursor.i32(),
      homeBearingDeg: cursor.i32() / 100,
      returning: cursor.u8() !== 0,
      rthEnabled: cursor.u8() !== 0,
      fixes: cursor.u32(),
      dropped: cursor.u32(),
      configSends: cursor.u32(),
    };
  } else {
    throw new Error(`SENSOR_INFO topic ${topic} has no body decoder.`);
  }
  if (!cursor.done()) throw new Error("SENSOR_INFO body has unexpected trailing bytes.");
  return value;
}

export function parseAerialKitOutputInfo(payload) {
  const bytes = asBytes(payload);
  if (bytes.length < 5) throw new Error("Aerial Kit OUTPUT_INFO payload is incomplete.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates OUTPUT_INFO and answered with the unknown-command status.",
    );
  }
  if (![0, 1, 2].includes(bytes[0])) {
    throw new Error(`OUTPUT_INFO returned status ${bytes[0]}.`);
  }
  const count = bytes[1];
  const motors = bytes[2];
  const servos = bytes[3];
  const capPercent = bytes[4];
  if (bytes[0] !== 0) {
    if (bytes.length !== 5 || count || motors || servos) {
      throw new Error("An unavailable OUTPUT_INFO reply must carry no descriptors.");
    }
    return {
      status: bytes[0] === 1 ? "none" : "too-many",
      count: 0,
      motors: 0,
      servos: 0,
      capPercent,
      outputs: [],
    };
  }
  if (motors + servos !== count) {
    throw new Error("OUTPUT_INFO motor and servo counts do not match the descriptor count.");
  }
  if (bytes.length !== 5 + count * 7) {
    throw new Error(`OUTPUT_INFO with ${count} descriptors is the wrong length.`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const outputs = Array.from({ length: count }, (_, entryIndex) => {
    const offset = 5 + entryIndex * 7;
    const kind = bytes[offset];
    return {
      kind,
      kindName: OUTPUT_KIND_NAMES[kind] || null,
      index: bytes[offset + 1],
      reversed: bytes[offset + 2] !== 0,
      trimUs: kind === 1 ? view.getInt16(offset + 3, true) : null,
      travelUs: kind === 1 ? view.getUint16(offset + 5, true) : null,
    };
  });
  return {
    status: "ok",
    count,
    motors,
    servos,
    capPercent,
    outputs,
  };
}

export function parseAerialKitRcChannels(payload) {
  const bytes = asBytes(payload);
  if (!bytes.length) throw new Error("Aerial Kit RC_CHANNELS payload is empty.");
  if (bytes[0] === AERIAL_KIT_UNKNOWN_COMMAND) {
    throw new Error(
      "This firmware predates RC_CHANNELS and answered with the unknown-command status.",
    );
  }
  if (bytes[0] === 1) {
    if (bytes.length !== 1) {
      throw new Error("A no-receiver RC_CHANNELS reply must contain one byte.");
    }
    return {
      status: "no-receiver",
      flags: 0,
      flagNames: [],
      protocol: null,
      protocolName: null,
      channels: [],
      sticks: [],
      switches: 0,
      switchNames: [],
      counters: null,
    };
  }
  if (bytes[0] !== 0) {
    throw new Error(`Aerial Kit RC_CHANNELS returned status ${bytes[0]}.`);
  }
  if (bytes.length < 4) throw new Error("RC_CHANNELS header is incomplete.");
  const flags = bytes[1];
  const protocol = bytes[2];
  const count = bytes[3];
  if (count > 16) {
    throw new Error(`RC_CHANNELS claims ${count} channels; the protocol allows 16.`);
  }
  const expectedLength = 4 + count * 2 + 8 + 1 + 28;
  if (bytes.length !== expectedLength) {
    throw new Error(
      `RC_CHANNELS with ${count} channels must contain ${expectedLength} bytes.`,
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = Array.from(
    { length: count },
    (_, index) => view.getUint16(4 + index * 2, true),
  );
  const stickOffset = 4 + count * 2;
  const sticks = Array.from(
    { length: 4 },
    (_, index) => view.getInt16(stickOffset + index * 2, true),
  );
  const switches = bytes[stickOffset + 8];
  const counterOffset = stickOffset + 9;
  const counterKeys = [
    "bytes",
    "frames",
    "crcErrors",
    "rejected",
    "lost",
    "failsafeFrames",
    "dropped",
  ];
  const counters = Object.fromEntries(counterKeys.map((key, index) => [
    key,
    view.getUint32(counterOffset + index * 4, true),
  ]));
  return {
    status: "ok",
    flags,
    flagNames: namedBits(flags, RC_FLAG_NAMES),
    protocol,
    protocolName: RC_PROTOCOLS[protocol] || null,
    channels,
    sticks,
    switches,
    switchNames: namedBits(switches, RC_SWITCH_NAMES),
    counters,
  };
}

export function aerialKitArmedState(
  status,
  {
    observedAtMs = null,
    nowMs = Date.now(),
    staleAfterMs = 2000,
    connectionActive = true,
  } = {},
) {
  const ageMs = Number.isFinite(observedAtMs)
    ? Math.max(0, nowMs - observedAtMs)
    : null;
  const fresh = ageMs != null && ageMs <= staleAfterMs;
  const flightStateName = status
    ? AERIAL_KIT_FLIGHT_STATES[status.flightState] || `state ${status.flightState}`
    : null;
  if (!status || !connectionActive || !fresh) {
    return {
      state: "unknown",
      label: "Unknown",
      flightStateName,
      ageMs,
      fresh,
      detail: !status
        ? "No STATUS observation has arrived."
        : !connectionActive
          ? "The session is not monitoring; the last STATUS is historical."
          : `No fresh STATUS for ${(ageMs / 1000).toFixed(1)} s.`,
    };
  }
  if (status.flightState === 0) {
    return {
      state: "disarmed",
      label: "Disarmed",
      flightStateName,
      ageMs,
      fresh,
      detail: "The latest fresh STATUS reports flight state 0.",
    };
  }
  return {
    state: "armed",
    label: "Armed or autonomous",
    flightStateName,
    ageMs,
    fresh,
    detail: `The latest fresh STATUS reports ${flightStateName}.`,
  };
}

export function createAerialKitStatusEvidence({
  hello = null,
  status = null,
  rc = null,
  rcError = null,
  parameters = null,
  parameterMetadata = null,
  sensorMetadata = null,
  outputMetadata = null,
  preflight = null,
  performance = null,
  motorTelemetry = null,
  logInventory = null,
  logSample = null,
  telemetryStream = null,
  statusObservedAtMs = null,
  rcObservedAtMs = null,
  baudRate = null,
  targetName = null,
  protocolStats = null,
  connectionActive = false,
  nowMs = Date.now(),
} = {}) {
  const secretNames = new Set(
    (parameterMetadata || [])
      .filter((parameter) => parameter.secret === true && parameter.name)
      .map((parameter) => parameter.name),
  );
  const safeParameters = parameters
    ? parameters.map((parameter) => (
        secretNames.has(parameter.name)
          ? { ...parameter, value: "[SECRET REDACTED]" }
          : parameter
      ))
    : null;
  return {
    schema: "rotorbench.aerial-kit-live-status.v1",
    observedAt: new Date(nowMs).toISOString(),
    targetName,
    transport: {
      kind: "web-serial",
      logicalBaud: baudRate,
      queries: [
        "HELLO",
        "STATUS",
        "RC_CHANNELS",
        ...(parameters ? ["PARAM_GET"] : []),
        ...(parameterMetadata ? ["PARAM_INFO"] : []),
        ...(parameterMetadata?.some((parameter) => parameter.help != null)
          ? ["PARAM_HELP"]
          : []),
        ...(sensorMetadata ? ["SENSOR_INFO"] : []),
        ...(outputMetadata ? ["OUTPUT_INFO"] : []),
        ...(preflight ? ["PREFLIGHT"] : []),
        ...(performance ? ["PERF"] : []),
        ...(motorTelemetry ? ["MOTOR_TELEMETRY"] : []),
        ...(logInventory ? ["LOG_SOURCE"] : []),
        ...(logSample ? ["LOG_STREAM"] : []),
        ...(telemetryStream ? ["TELEMETRY"] : []),
      ],
    },
    hello,
    status: status
      ? {
          ...status,
          observedAt: Number.isFinite(statusObservedAtMs)
            ? new Date(statusObservedAtMs).toISOString()
            : null,
        }
      : null,
    armedState: aerialKitArmedState(status, {
      observedAtMs: statusObservedAtMs,
      nowMs,
      connectionActive,
    }),
    rc: rc
      ? {
          ...rc,
          observedAt: Number.isFinite(rcObservedAtMs)
            ? new Date(rcObservedAtMs).toISOString()
            : null,
        }
      : null,
    rcError: rcError || null,
    parameters: safeParameters,
    parameterMetadata,
    sensorMetadata,
    outputMetadata,
    preflight: preflight
      ? {
          ...preflight,
          observedAt: Number.isFinite(preflight.observedAtMs)
            ? new Date(preflight.observedAtMs).toISOString()
            : null,
        }
      : null,
    performance: performance
      ? {
          ...performance,
          observedAt: Number.isFinite(performance.observedAtMs)
            ? new Date(performance.observedAtMs).toISOString()
            : null,
        }
      : null,
    motorTelemetry: motorTelemetry
      ? {
          ...motorTelemetry,
          observedAt: Number.isFinite(motorTelemetry.observedAtMs)
            ? new Date(motorTelemetry.observedAtMs).toISOString()
            : null,
        }
      : null,
    logInventory,
    logSample: logSample
      ? {
          ...logSample,
          observedAt: Number.isFinite(logSample.observedAtMs)
            ? new Date(logSample.observedAtMs).toISOString()
            : null,
        }
      : null,
    telemetryStream: telemetryStream
      ? {
          ...telemetryStream,
          startedAt: Number.isFinite(telemetryStream.startedAtMs)
            ? new Date(telemetryStream.startedAtMs).toISOString()
            : null,
          stoppedAt: Number.isFinite(telemetryStream.stoppedAtMs)
            ? new Date(telemetryStream.stoppedAtMs).toISOString()
            : null,
          lastObservedAt: Number.isFinite(telemetryStream.lastObservedAtMs)
            ? new Date(telemetryStream.lastObservedAtMs).toISOString()
            : null,
        }
      : null,
    parser: protocolStats,
    boundaries: {
      readOnlyQueriesOnly: true,
      hardwareVerifiedByRotorBench: false,
      rfPathVerified: false,
      flightReady: false,
      writesApplied: false,
      persisted: false,
    },
  };
}

export class AerialKitReadOnlySession {
  constructor({
    reader,
    writer,
    timeoutMs = 2000,
    onIssue = null,
    onClose = null,
    onLogFrame = null,
    onTelemetry = null,
  }) {
    this.reader = reader;
    this.writer = writer;
    this.timeoutMs = timeoutMs;
    this.onIssue = onIssue;
    this.onClose = onClose;
    this.onLogFrame = onLogFrame;
    this.onTelemetry = onTelemetry;
    this.decoder = new AerialKitFrameDecoder();
    this.pending = null;
    this.active = true;
    this.reading = null;
  }

  get stats() {
    return this.decoder.stats;
  }

  startReading() {
    if (this.reading) return this.reading;
    this.reading = (async () => {
      while (this.active) {
        const { value, done } = await this.reader.read();
        if (done) {
          if (this.active) {
            this.active = false;
            const error = new Error("The Aerial Kit read stream closed.");
            this.failPending(error);
            this.onClose?.(error.message);
          }
          break;
        }
        if (!value?.length) continue;
        const frames = this.decoder.feed(value);
        this.decoder.takeIssues().forEach((issue) => this.onIssue?.(issue.detail));
        frames.forEach((frame) => this.handleFrame(frame));
      }
    })().catch((error) => {
      if (!this.active) return;
      this.active = false;
      this.failPending(error);
      this.onIssue?.(error.message || "The AKP read stream stopped.");
      this.onClose?.(error.message || "The AKP read stream stopped.");
    });
    return this.reading;
  }

  handleFrame(frame) {
    if (!frame.response) {
      if (frame.command === AERIAL_KIT_COMMANDS.logStream) {
        try {
          this.onLogFrame?.(parseAerialKitLogStreamFrame(frame.payload));
        } catch (error) {
          this.onIssue?.(error.message);
        }
        return;
      }
      if (frame.command === AERIAL_KIT_COMMANDS.telemetry) {
        try {
          this.onTelemetry?.(parseAerialKitTelemetry(frame.payload));
        } catch (error) {
          this.onIssue?.(error.message);
        }
        return;
      }
      this.onIssue?.(
        `Unexpected unsolicited AKP frame 0x${frame.command.toString(16)}.`,
      );
      return;
    }
    if (!this.pending) {
      this.onIssue?.(
        `AKP reply 0x${frame.command.toString(16)} arrived with no pending request.`,
      );
      return;
    }
    if (frame.command !== this.pending.command) {
      this.failPending(new Error(
        `AKP replied with 0x${frame.command.toString(16)} while awaiting 0x${this.pending.command.toString(16)}.`,
      ));
      return;
    }
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.resolve(frame.payload);
  }

  failPending(error) {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.reject(error);
  }

  async request(command, payload = new Uint8Array()) {
    if (!this.active) throw new Error("The Aerial Kit session is closed.");
    if (this.pending) {
      throw new Error("An Aerial Kit request is already awaiting a reply.");
    }
    const frame = buildAerialKitFrame(command, payload);
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(
          `Aerial Kit did not answer command 0x${command.toString(16)} within ${this.timeoutMs} ms.`,
        );
        this.failPending(error);
      }, this.timeoutMs);
      this.pending = {
        command,
        resolve,
        reject,
        timer,
      };
    });
    try {
      await this.writer.write(frame);
    } catch (error) {
      this.failPending(error);
    }
    return response;
  }

  async close() {
    if (!this.active) return;
    this.active = false;
    this.failPending(new Error("The Aerial Kit session was stopped."));
    try {
      await this.reader.cancel?.();
    } catch {
      // Closing the port below also resolves pending reads.
    }
    try {
      await this.reading;
    } catch {
      // The read loop reports transport failures through onIssue.
    }
  }
}
