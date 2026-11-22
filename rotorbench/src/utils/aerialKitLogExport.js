const LOG_EXPORT_SCHEMA = "rotorbench.aerial-kit-log-sample.v1";
const LOG_SAMPLE_LIMIT = 8;

function sampleSourceName(sample, inventory) {
  if (typeof sample?.sourceName === "string" && sample.sourceName) {
    return sample.sourceName;
  }
  return inventory?.find((entry) => entry.source === sample?.source)?.sourceName
    || `source ${sample?.source ?? "unknown"}`;
}

function requireNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} is not a finite number.`);
  return number;
}

function requireInteger(value, label, minimum, maximum) {
  const number = requireNumber(value, label);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} is outside ${minimum}–${maximum}.`);
  }
  return number;
}

function requireVector(value, length, label) {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error(`${label} must contain ${length} values.`);
  }
  return value.map((entry, index) => requireNumber(entry, `${label}[${index}]`));
}

function normalizeImportedRecord(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Log record ${index} has no record object.`);
  }
  const version = requireInteger(value.version, `Log record ${index} version`, 2, 4);
  const expectedBytes = { 2: 51, 3: 66, 4: 87 }[version];
  const bytes = requireNumber(value.bytes, `Log record ${index} bytes`);
  if (bytes !== expectedBytes) {
    throw new Error(`Log record ${index} version ${version} requires ${expectedBytes} bytes.`);
  }
  return {
    ...value,
    index,
    version,
    bytes,
    timeMs: requireNumber(value.timeMs, `Log record ${index} time`),
    gyro: requireVector(value.gyro, 3, `Log record ${index} gyro`),
    accel: requireVector(value.accel, 3, `Log record ${index} accel`),
    rollDeg: requireNumber(value.rollDeg, `Log record ${index} roll`),
    pitchDeg: requireNumber(value.pitchDeg, `Log record ${index} pitch`),
    yawDeg: requireNumber(value.yawDeg, `Log record ${index} yaw`),
    altMm: requireNumber(value.altMm, `Log record ${index} altitude`),
    stick: requireVector(value.stick, 4, `Log record ${index} sticks`),
    torque: requireVector(value.torque, 3, `Log record ${index} torque`),
    motors: requireVector(value.motors, 4, `Log record ${index} motors`),
    state: requireNumber(value.state, `Log record ${index} state`),
    flags: requireNumber(value.flags, `Log record ${index} flags`),
    lat: requireNumber(value.lat, `Log record ${index} latitude`),
    lon: requireNumber(value.lon, `Log record ${index} longitude`),
    vbatMv: value.vbatMv == null
      ? null
      : requireNumber(value.vbatMv, `Log record ${index} battery`),
  };
}

function normalizedImportedFrames(value) {
  if (!Array.isArray(value) || value.length > 32) {
    throw new Error("The log export must contain at most 32 frames.");
  }
  return value.map((frame, frameIndex) => {
    if (!["record", "hole", "done"].includes(frame?.status)) {
      throw new Error(`Log frame ${frameIndex} has an invalid status.`);
    }
    const source = requireInteger(frame.source, `Log frame ${frameIndex} source`, 0, 2);
    const index = requireInteger(
      frame.index,
      `Log frame ${frameIndex} index`,
      0,
      0xffff,
    );
    return {
      status: frame.status,
      source,
      sourceName: typeof frame.sourceName === "string" ? frame.sourceName : null,
      index,
      record: frame.status === "record"
        ? normalizeImportedRecord(frame.record, index)
        : null,
    };
  });
}

export function parseAerialKitLogExport(payload) {
  if (
    !payload
    || typeof payload !== "object"
    || Array.isArray(payload)
    || payload.schema !== LOG_EXPORT_SCHEMA
    || payload.scope !== "bounded-live-log-sample"
  ) {
    throw new Error("The selected JSON is not a bounded Aerial Kit log export.");
  }
  const observedAtMs = Date.parse(payload.observedAt);
  if (!Number.isFinite(observedAtMs)) {
    throw new Error("The log export has no valid observation time.");
  }
  const boundaries = payload.boundaries;
  if (
    !boundaries
    || boundaries.readOnlyObservation !== true
    || boundaries.aircraftLogMutated !== false
    || boundaries.entireAircraftLogIncluded !== false
    || boundaries.flightReady !== false
    || boundaries.hardwareVerifiedByRotorBench !== false
  ) {
    throw new Error("The log export has invalid read-only or scope boundaries.");
  }
  const manifest = payload.manifest;
  if (!manifest || typeof manifest !== "object" || !manifest.source) {
    throw new Error("The log export manifest is incomplete.");
  }
  const source = requireInteger(manifest.source.id, "Manifest source", 0, 2);
  const frames = normalizedImportedFrames(payload.frames);
  if (frames.some((frame) => frame.source !== source)) {
    throw new Error("A log frame source does not match the manifest source.");
  }
  const records = frames.filter((frame) => frame.status === "record");
  const holes = frames
    .filter((frame) => frame.status === "hole")
    .map((frame) => frame.index);
  const completion = frames.find((frame) => frame.status === "done") || null;
  const recordVersions = { 2: 0, 3: 0, 4: 0 };
  records.forEach((frame) => {
    recordVersions[frame.record.version] += 1;
  });
  const noStream = manifest.delivery?.status === "no-stream";
  const expectedStatus = noStream
    ? "no-stream"
    : completion
      ? holes.length ? "complete-with-holes" : "complete"
      : "incomplete";
  const delivery = manifest.delivery;
  if (!delivery) {
    throw new Error("The log export manifest has no delivery record.");
  }
  const deliveryMismatches = [];
  if (delivery.status !== expectedStatus) deliveryMismatches.push("status");
  if (delivery.frames !== frames.length) deliveryMismatches.push("frame count");
  if (delivery.records !== records.length) deliveryMismatches.push("record count");
  if (delivery.holes !== holes.length) deliveryMismatches.push("hole count");
  if (delivery.complete !== (Boolean(completion) || noStream)) {
    deliveryMismatches.push("completion state");
  }
  if (delivery.completion?.complete !== (Boolean(completion) || noStream)) {
    deliveryMismatches.push("completion marker");
  }
  if (delivery.completion?.index !== (completion?.index ?? null)) {
    deliveryMismatches.push("completion index");
  }
  if (JSON.stringify(manifest.recordVersions) !== JSON.stringify(recordVersions)) {
    deliveryMismatches.push("record versions");
  }
  if (JSON.stringify(manifest.holeIndexes) !== JSON.stringify(holes)) {
    deliveryMismatches.push("hole indexes");
  }
  if (deliveryMismatches.length) {
    throw new Error(
      `The log export manifest does not agree with its frames: ${deliveryMismatches.join(", ")}.`,
    );
  }
  if (expectedStatus === "incomplete") {
    throw new Error("The log export is incomplete and has no terminal completion.");
  }
  const first = requireInteger(
    manifest.requestedRange?.first,
    "Requested first index",
    0,
    0xffff,
  );
  const count = requireInteger(
    manifest.requestedRange?.count,
    "Requested record count",
    0,
    32,
  );
  const rateHz = requireInteger(
    manifest.requestedRange?.rateHz,
    "Requested rate",
    0,
    50,
  );
  if (!noStream) {
    const end = first + count;
    if (frames.some((frame) => (
      frame.index < first
      || frame.index > end
      || (frame.status !== "done" && frame.index >= end)
    ))) {
      throw new Error("A log frame index falls outside the requested range.");
    }
    if (completion && completion.index !== end) {
      throw new Error("The terminal DONE index does not match the requested range.");
    }
    if (rateHz === 0) {
      throw new Error("A streamed log sample must have a positive agreed rate.");
    }
  } else if (frames.length !== 0 || count !== 0 || rateHz !== 0) {
    throw new Error("A no-stream export must not contain frames or a range.");
  }
  return {
    kind: "fc-log-sample",
    schema: LOG_EXPORT_SCHEMA,
    observedAtMs,
    targetName: typeof payload.targetName === "string" ? payload.targetName : null,
    scope: payload.scope,
    manifest: {
      source: {
        id: source,
        name: typeof manifest.source.name === "string" ? manifest.source.name : null,
      },
      requestedRange: {
        first,
        count,
        maximumRecords: requireInteger(
          manifest.requestedRange?.maximumRecords,
          "Maximum records",
          1,
          32,
        ),
        rateHz,
      },
      delivery: {
        status: expectedStatus,
        frames: frames.length,
        records: records.length,
        holes: holes.length,
        completion: {
          complete: Boolean(completion) || noStream,
          index: completion?.index ?? null,
        },
        complete: true,
      },
      recordVersions,
      holeIndexes: holes,
    },
    source,
    sourceName: typeof manifest.source.name === "string" ? manifest.source.name : null,
    first,
    count,
    requestedCount: count,
    hz: rateHz,
    records: records.length,
    holes: holes.length,
    done: Boolean(completion) || noStream,
    noStream,
    inventory: Array.isArray(payload.inventory)
      ? payload.inventory.map((entry) => {
          const inventorySource = requireInteger(
            entry.source,
            "Inventory source",
            0,
            2,
          );
          return {
            requestedSource: inventorySource,
            source: inventorySource,
            sourceName: typeof entry.name === "string" ? entry.name : null,
            name: typeof entry.name === "string" ? entry.name : null,
            status: entry.status === "available" ? "available" : "unavailable",
            count: entry.count == null
              ? null
              : requireNumber(entry.count, "Inventory record count"),
          };
        })
      : null,
    frames,
    boundaries,
  };
}

export function createAerialKitLogExport({
  inventory = null,
  sample = null,
  targetName = null,
  nowMs = Date.now(),
} = {}) {
  if (!sample || !Array.isArray(sample.frames)) {
    throw new Error("Read a bounded log sample before exporting it.");
  }
  if (sample.frames.length > 32) {
    throw new Error("The bounded log sample exceeds the 32-frame review limit.");
  }

  const records = sample.frames.filter((frame) => frame.status === "record");
  const holes = sample.frames
    .filter((frame) => frame.status === "hole")
    .map((frame) => frame.index);
  const completionFrame = sample.frames.find((frame) => frame.status === "done");
  const recordVersions = { 2: 0, 3: 0, 4: 0 };
  records.forEach((frame) => {
    const version = frame.record?.version;
    if (!Object.hasOwn(recordVersions, version)) {
      throw new Error(`The log sample contains unsupported record version ${version}.`);
    }
    recordVersions[version] += 1;
  });
  const status = sample.noStream
    ? "no-stream"
    : completionFrame
      ? holes.length ? "complete-with-holes" : "complete"
      : "incomplete";

  return {
    schema: LOG_EXPORT_SCHEMA,
    observedAt: new Date(nowMs).toISOString(),
    targetName,
    scope: "bounded-live-log-sample",
    manifest: {
      source: {
        id: sample.source ?? null,
        name: sampleSourceName(sample, inventory),
      },
      requestedRange: {
        first: sample.first ?? null,
        count: sample.count ?? null,
        maximumRecords: LOG_SAMPLE_LIMIT,
        rateHz: sample.hz ?? null,
      },
      delivery: {
        status,
        frames: sample.frames.length,
        records: records.length,
        holes: holes.length,
        completion: completionFrame
          ? {
              complete: true,
              index: completionFrame.index,
            }
          : sample.noStream
            ? {
                complete: true,
                index: null,
              }
          : {
              complete: false,
              index: null,
            },
        complete: Boolean(completionFrame || sample.noStream),
      },
      recordVersions,
      holeIndexes: holes,
    },
    inventory: Array.isArray(inventory)
      ? inventory.map((entry) => ({
          source: entry.requestedSource,
          name: entry.sourceName,
          status: entry.status,
          count: entry.count,
        }))
      : null,
    frames: sample.frames,
    boundaries: {
      readOnlyObservation: true,
      aircraftLogMutated: false,
      entireAircraftLogIncluded: false,
      flightReady: false,
      hardwareVerifiedByRotorBench: false,
    },
  };
}
