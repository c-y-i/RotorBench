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
export const AERIAL_KIT_PARAMETER_READ_LIMIT = 255;
export const AERIAL_KIT_COMMANDS = Object.freeze({
  hello: 0x01,
  paramGet: 0x02,
  status: 0x05,
  paramInfo: 0x0a,
  rcChannels: 0x0d,
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
  }) {
    this.reader = reader;
    this.writer = writer;
    this.timeoutMs = timeoutMs;
    this.onIssue = onIssue;
    this.onClose = onClose;
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
