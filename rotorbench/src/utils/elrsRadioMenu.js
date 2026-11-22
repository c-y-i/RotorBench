import { CrsfStreamParser, crc8DvbS2 } from "./crsfCapture";

// Read-only subset of ExpressLRS's CRSF device parameter menu. Source:
// aerial-kit/apps/configurator/src/protocol/crsf.ts, which follows ExpressLRS
// 4.1.0 CRSFEndpoint.cpp. This module can identify a device and read its menu;
// it cannot encode PARAMETER_WRITE or COMMAND frames.
export const ELRS_CRSF_ADDRESS = 0xc8;
export const ELRS_ADDRESS = Object.freeze({
  broadcast: 0x00,
  usb: 0x10,
  handset: 0xc8,
  radioTransmitter: 0xea,
  receiver: 0xec,
  transmitter: 0xee,
  lua: 0xef,
});

export const ELRS_FRAME_TYPE = Object.freeze({
  devicePing: 0x28,
  deviceInfo: 0x29,
  parameterEntry: 0x2b,
  parameterRead: 0x2c,
});

export const ELRS_PARAMETER_TYPE = Object.freeze({
  uint8: 0,
  int8: 1,
  uint16: 2,
  int16: 3,
  uint32: 4,
  int32: 5,
  float: 8,
  selection: 9,
  string: 10,
  folder: 11,
  info: 12,
  command: 13,
  unsupported: 127,
});

export const ELRS_PARAMETER_LIMIT = 255;
export const ELRS_PARAMETER_CHUNK_LIMIT = 32;

function asBytes(value) {
  return value instanceof Uint8Array ? value : Uint8Array.from(value || []);
}

function decodeAscii(bytes) {
  return Array.from(bytes)
    .map((byte) => byte < 0x80 ? String.fromCharCode(byte) : "\ufffd")
    .join("");
}

function readCString(bytes, offset, label) {
  if (offset < 0 || offset >= bytes.length) throw new Error(`${label} is missing.`);
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) end += 1;
  if (end >= bytes.length) throw new Error(`${label} has no terminator.`);
  return {
    value: decodeAscii(bytes.subarray(offset, end)),
    next: end + 1,
  };
}

function integerByte(value) {
  return value > 127 ? value - 256 : value;
}

export function encodeElrsCrsfFrame(
  type,
  payload = new Uint8Array(),
  address = ELRS_CRSF_ADDRESS,
) {
  const body = asBytes(payload);
  if (body.length > 60) throw new RangeError("CRSF payload exceeds 60 bytes.");
  const frame = new Uint8Array(body.length + 4);
  frame[0] = address;
  frame[1] = body.length + 2;
  frame[2] = type;
  frame.set(body, 3);
  frame[frame.length - 1] = crc8DvbS2(frame.subarray(2, frame.length - 1));
  return frame;
}

export function encodeElrsExtendedFrame(type, destination, origin, body) {
  return encodeElrsCrsfFrame(type, Uint8Array.from([destination, origin, ...body]));
}

export function encodeElrsDevicePing(origin = ELRS_ADDRESS.lua) {
  return encodeElrsExtendedFrame(
    ELRS_FRAME_TYPE.devicePing,
    ELRS_ADDRESS.broadcast,
    origin,
    [],
  );
}

export function encodeElrsParameterRead(destination, field, chunk, origin = ELRS_ADDRESS.lua) {
  if (!Number.isInteger(field) || field < 0 || field > 255) {
    throw new RangeError("ExpressLRS parameter field must fit in one byte.");
  }
  if (!Number.isInteger(chunk) || chunk < 0 || chunk > 255) {
    throw new RangeError("ExpressLRS parameter chunk must fit in one byte.");
  }
  return encodeElrsExtendedFrame(
    ELRS_FRAME_TYPE.parameterRead,
    destination,
    origin,
    [field, chunk],
  );
}

export function decodeElrsDeviceInfo(frame) {
  if (frame?.frameType !== ELRS_FRAME_TYPE.deviceInfo) return null;
  const payload = asBytes(frame.payload);
  if (payload.length < 3) return null;
  const name = readCString(payload, 2, "Device name");
  if (payload.length < name.next + 14) return null;
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  return {
    destination: payload[0],
    origin: payload[1],
    name: name.value,
    serial: view.getUint32(name.next),
    hardwareVersion: view.getUint32(name.next + 4),
    softwareVersion: view.getUint32(name.next + 8),
    parameterCount: payload[name.next + 12],
    parameterVersion: payload[name.next + 13],
  };
}

export function decodeElrsParameterChunk(frame) {
  if (frame?.frameType !== ELRS_FRAME_TYPE.parameterEntry) return null;
  const payload = asBytes(frame.payload);
  if (payload.length < 4) return null;
  return {
    origin: payload[1],
    field: payload[2],
    chunksRemaining: payload[3],
    data: payload.slice(4),
  };
}

export function decodeElrsParameter(field, body) {
  const bytes = asBytes(body);
  if (bytes.length < 3) throw new Error(`Field ${field} is incomplete.`);
  const parent = bytes[0];
  const hidden = (bytes[1] & 0x80) !== 0;
  const type = bytes[1] & 0x7f;
  const name = readCString(bytes, 2, `Field ${field} name`);
  const base = {
    id: field,
    parent,
    name: name.value,
    hidden,
    type,
  };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === ELRS_PARAMETER_TYPE.selection) {
    const options = readCString(bytes, name.next, `Field ${field} options`);
    if (options.next + 5 > bytes.length) throw new Error(`Field ${field} selection is incomplete.`);
    return {
      ...base,
      kind: "selection",
      options: options.value.split(";"),
      value: bytes[options.next],
      min: bytes[options.next + 1],
      max: bytes[options.next + 2],
      units: readCString(bytes, options.next + 4, `Field ${field} units`).value,
    };
  }
  if ([ELRS_PARAMETER_TYPE.uint8, ELRS_PARAMETER_TYPE.int8].includes(type)) {
    if (name.next + 5 > bytes.length) throw new Error(`Field ${field} number is incomplete.`);
    const convert = type === ELRS_PARAMETER_TYPE.int8 ? integerByte : (value) => value;
    return {
      ...base,
      kind: "number",
      value: convert(bytes[name.next]),
      min: convert(bytes[name.next + 1]),
      max: convert(bytes[name.next + 2]),
      units: readCString(bytes, name.next + 4, `Field ${field} units`).value,
    };
  }
  if ([ELRS_PARAMETER_TYPE.uint16, ELRS_PARAMETER_TYPE.int16].includes(type)) {
    if (name.next + 9 > bytes.length) throw new Error(`Field ${field} number is incomplete.`);
    const convert = type === ELRS_PARAMETER_TYPE.int16
      ? (offset) => view.getInt16(offset, true)
      : (offset) => view.getUint16(offset, true);
    return {
      ...base,
      kind: "number",
      value: convert(name.next),
      min: convert(name.next + 2),
      max: convert(name.next + 4),
      units: readCString(bytes, name.next + 8, `Field ${field} units`).value,
    };
  }
  if (type === ELRS_PARAMETER_TYPE.folder) {
    const children = [];
    for (let offset = name.next; offset < bytes.length && bytes[offset] !== 0xff; offset += 1) {
      children.push(bytes[offset]);
    }
    return {
      ...base,
      kind: "folder",
      children,
    };
  }
  if ([ELRS_PARAMETER_TYPE.info, ELRS_PARAMETER_TYPE.string].includes(type)) {
    return {
      ...base,
      kind: type === ELRS_PARAMETER_TYPE.info ? "info" : "string",
      value: readCString(bytes, name.next, `Field ${field} value`).value,
    };
  }
  if (type === ELRS_PARAMETER_TYPE.command) {
    if (name.next + 2 > bytes.length) throw new Error(`Field ${field} command is incomplete.`);
    return {
      ...base,
      kind: "command",
      step: bytes[name.next],
      timeoutMs: bytes[name.next + 1] * 10,
      info: readCString(bytes, name.next + 2, `Field ${field} command info`).value,
    };
  }
  return {
    ...base,
    kind: "unsupported",
  };
}

export function elrsParameterValueLabel(parameter) {
  if (parameter.kind === "selection") {
    const option = parameter.options?.[parameter.value];
    return option == null
      ? `Index ${parameter.value} · ${parameter.min}..${parameter.max}`
      : `${option} · index ${parameter.value}`;
  }
  if (parameter.kind === "number") {
    return `${parameter.value}${parameter.units ? ` ${parameter.units}` : ""} · ${parameter.min}..${parameter.max}`;
  }
  if (parameter.kind === "folder") {
    return `${parameter.children?.length || 0} child field${parameter.children?.length === 1 ? "" : "s"}`;
  }
  if (parameter.kind === "command") {
    return `${parameter.info || "No command status text"} · not executed`;
  }
  if (["info", "string"].includes(parameter.kind)) {
    return parameter.value || "Empty";
  }
  return `Type ${parameter.type} · value not decoded`;
}

export function createElrsDeviceMenuEvidence({
  device,
  parameters,
  role,
  targetName,
  logicalBaud,
  diagnostics,
  generatedAt = new Date().toISOString(),
}) {
  return {
    schema: "rotorbench.elrs-device-menu.v1",
    generatedAt,
    source: "read-only CRSF device menu",
    targetName,
    role,
    logicalBaud,
    device: device
      ? {
          name: device.name,
          hardwareVersion: device.hardwareVersion,
          softwareVersion: device.softwareVersion,
          parameterCount: device.parameterCount,
          parameterVersion: device.parameterVersion,
          origin: device.origin,
        }
      : null,
    parameters: (parameters || []).map((parameter) => ({
      ...parameter,
    })),
    diagnostics: diagnostics || null,
    boundaries: {
      readOnlyMenuQueriesOnly: true,
      writesAllowed: false,
      commandsExecuted: false,
      rfPathVerified: false,
      hardwareVerifiedByRotorBench: false,
    },
  };
}

export function parseElrsDeviceMenuEvidence(
  payload,
  { targetName = null, expectedRole = null } = {},
) {
  if (
    !payload
    || payload.schema !== "rotorbench.elrs-device-menu.v1"
    || !payload.device
    || !Array.isArray(payload.parameters)
  ) {
    throw new Error("The selected JSON is not an ExpressLRS menu inventory.");
  }
  const device = payload.device;
  const parameters = payload.parameters
    .filter((parameter) => (
      parameter
      && Number.isInteger(parameter.id)
      && typeof parameter.name === "string"
      && typeof parameter.kind === "string"
    ))
    .map((parameter) => ({ ...parameter }));
  const boundaries = payload.boundaries || {};
  const targetMatch = !targetName || !payload.targetName
    ? null
    : String(payload.targetName).trim().toLowerCase()
      === String(targetName).trim().toLowerCase();
  const roleMatch = !expectedRole || !payload.role
    ? null
    : payload.role === expectedRole;
  const boundarySafe = boundaries.readOnlyMenuQueriesOnly === true
    && boundaries.writesAllowed === false
    && boundaries.commandsExecuted === false;
  const fieldCountMatch = Number.isInteger(device.parameterCount)
    ? parameters.length === device.parameterCount
    : null;
  const checks = [
    {
      id: "elrs-menu-schema",
      label: "ExpressLRS menu schema",
      status: "pass",
      detail: "The file is a versioned read-only ExpressLRS menu inventory.",
    },
    {
      id: "elrs-menu-target",
      label: "Radio target",
      status: targetMatch === null ? "unverified" : targetMatch ? "pass" : "fail",
      detail: targetMatch === null
        ? "The staged radio target or imported target name is unavailable."
        : targetMatch
          ? `The imported menu target matches ${targetName}.`
          : `The imported menu target ${payload.targetName} does not match ${targetName}.`,
    },
    {
      id: "elrs-menu-role",
      label: "Radio endpoint role",
      status: roleMatch === null ? "unverified" : roleMatch ? "pass" : "fail",
      detail: roleMatch === null
        ? "The staged role or imported role is unavailable."
        : roleMatch
          ? `The imported ${payload.role.toUpperCase()} role matches the staged plan.`
          : `The imported ${payload.role} role does not match the staged ${expectedRole} role.`,
    },
    {
      id: "elrs-menu-read-only",
      label: "Menu inventory boundary",
      status: boundarySafe ? "pass" : payload.boundaries ? "fail" : "unverified",
      detail: boundarySafe
        ? "The inventory declares read-only queries, no writes, and no executed commands."
        : payload.boundaries
          ? "The inventory boundary claims a write or command; reject it as evidence."
          : "The inventory carries no read-only boundary metadata.",
    },
    {
      id: "elrs-menu-field-count",
      label: "Menu field count",
      status: fieldCountMatch === null ? "unverified" : fieldCountMatch ? "pass" : "fail",
      detail: fieldCountMatch === null
        ? "The device identity has no usable field count."
        : fieldCountMatch
          ? `The inventory contains all ${device.parameterCount} advertised fields.`
          : `The device advertises ${device.parameterCount} fields and the inventory carries ${parameters.length}.`,
    },
  ];
  const entries = parameters.map((parameter) => ({
    id: `menu-${parameter.id}`,
    name: parameter.name,
    type: parameter.kind,
    value: elrsParameterValueLabel(parameter),
  }));
  return {
    kind: "radio-menu-inventory",
    targetName: payload.targetName || null,
    role: payload.role || null,
    logicalBaud: payload.logicalBaud ?? null,
    device: {
      name: device.name || "Unknown module",
      hardwareVersion: device.hardwareVersion ?? null,
      softwareVersion: device.softwareVersion ?? null,
      parameterCount: device.parameterCount ?? null,
      parameterVersion: device.parameterVersion ?? null,
      origin: device.origin ?? null,
    },
    parameters,
    entries,
    diagnostics: payload.diagnostics || null,
    boundaries,
    checks,
    hardwareVerifiedByRotorBench: false,
    rfPathVerified: false,
  };
}

export class ElrsMenuReadOnlySession {
  constructor({
    reader,
    writer,
    timeoutMs = 1800,
  }) {
    this.reader = reader;
    this.writer = writer;
    this.timeoutMs = timeoutMs;
    this.parser = new CrsfStreamParser();
    this.active = true;
    this.reading = null;
    this.pending = null;
    this.device = null;
    this.targetAddress = null;
    this.role = null;
    this.parameters = new Map();
  }

  get diagnostics() {
    return {
      bytesReceived: this.parser.bytesReceived,
      validFrames: this.parser.validFrames,
      crcErrors: this.parser.crcErrors,
      resyncs: this.parser.resyncs,
      framingErrors: this.parser.framingErrors,
      pendingBytes: this.parser.pendingBytes,
    };
  }

  startReading() {
    if (this.reading) return this.reading;
    this.reading = (async () => {
      while (this.active) {
        const { value, done } = await this.reader.read();
        if (done) {
          if (this.active) {
            this.active = false;
            this.failPending(new Error("The ExpressLRS read stream closed."));
          }
          break;
        }
        if (!value?.length) continue;
        this.parser.feed(value).forEach((frame) => this.handleFrame(frame));
      }
    })().catch((error) => {
      if (!this.active) return;
      this.active = false;
      this.failPending(error);
    });
    return this.reading;
  }

  handleFrame(frame) {
    const pending = this.pending;
    if (!pending || !pending.match(frame)) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.resolve(frame);
  }

  failPending(error) {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.reject(error);
  }

  request(bytes, match, label) {
    if (!this.active) return Promise.reject(new Error("The ExpressLRS session is closed."));
    if (this.pending) {
      return Promise.reject(new Error("An ExpressLRS menu request is already pending."));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failPending(
          new Error(`The radio did not answer ${label} within ${this.timeoutMs} ms.`),
        );
      }, this.timeoutMs);
      this.pending = {
        match,
        resolve,
        reject,
        timer,
      };
      Promise.resolve(this.writer.write(bytes)).catch((error) => {
        this.failPending(error);
      });
    });
  }

  async retry(attempts, operation) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("The ExpressLRS request failed.");
  }

  async identify(attempts = 3) {
    const frame = await this.retry(attempts, () => this.request(
      encodeElrsDevicePing(),
      (candidate) => {
        const info = decodeElrsDeviceInfo(candidate);
        return Boolean(
          info
          && [
            ELRS_ADDRESS.transmitter,
            ELRS_ADDRESS.receiver,
            ELRS_ADDRESS.radioTransmitter,
          ].includes(info.origin),
        );
      },
      "a device ping",
    ));
    this.device = decodeElrsDeviceInfo(frame);
    if (!this.device) throw new Error("The radio returned malformed device identity.");
    this.targetAddress = this.device.origin === ELRS_ADDRESS.receiver
      ? ELRS_ADDRESS.receiver
      : this.device.origin === ELRS_ADDRESS.transmitter
        || this.device.origin === ELRS_ADDRESS.radioTransmitter
        ? ELRS_ADDRESS.transmitter
        : ELRS_ADDRESS.radioTransmitter;
    this.role = this.targetAddress === ELRS_ADDRESS.receiver ? "rx" : "tx";
    return this.device;
  }

  async readParameter(field) {
    if (!this.device || !this.targetAddress) {
      throw new Error("Identify the radio before reading its menu.");
    }
    const first = await this.retry(3, () => this.request(
      encodeElrsParameterRead(this.targetAddress, field, 0),
      (frame) => decodeElrsParameterChunk(frame)?.field === field,
      `field ${field} chunk 0`,
    ));
    const initial = decodeElrsParameterChunk(first);
    if (!initial) throw new Error(`Field ${field} returned a malformed reply.`);
    const data = [...initial.data];
    let remaining = initial.chunksRemaining;
    for (let chunk = 1; remaining > 0; chunk += 1) {
      if (chunk > ELRS_PARAMETER_CHUNK_LIMIT) {
        throw new Error(`Field ${field} exceeded ${ELRS_PARAMETER_CHUNK_LIMIT} chunks.`);
      }
      const frame = await this.retry(3, () => this.request(
        encodeElrsParameterRead(this.targetAddress, field, chunk),
        (candidate) => decodeElrsParameterChunk(candidate)?.field === field,
        `field ${field} chunk ${chunk}`,
      ));
      const part = decodeElrsParameterChunk(frame);
      if (!part) throw new Error(`Field ${field} chunk ${chunk} is malformed.`);
      data.push(...part.data);
      remaining = part.chunksRemaining;
    }
    const parameter = decodeElrsParameter(field, Uint8Array.from(data));
    this.parameters.set(field, parameter);
    return parameter;
  }

  async readAll(onProgress = null) {
    const device = this.device || await this.identify();
    if (device.parameterCount > ELRS_PARAMETER_LIMIT) {
      throw new Error(
        `The radio advertises ${device.parameterCount} fields; this reader is bounded to ${ELRS_PARAMETER_LIMIT}.`,
      );
    }
    for (let field = 1; field <= device.parameterCount; field += 1) {
      onProgress?.(field - 1, device.parameterCount);
      await this.readParameter(field);
    }
    onProgress?.(device.parameterCount, device.parameterCount);
    return [...this.parameters.values()];
  }

  async close() {
    if (!this.active) return;
    this.active = false;
    this.failPending(new Error("The ExpressLRS menu session was stopped."));
    try {
      await this.reader.cancel?.();
    } catch {
      // Closing the port also resolves a pending read.
    }
    try {
      await this.reading;
    } catch {
      // The request that was pending reports the read failure.
    }
  }
}
