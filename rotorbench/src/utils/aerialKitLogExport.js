const LOG_EXPORT_SCHEMA = "rotorbench.aerial-kit-log-sample.v1";
const LOG_SAMPLE_LIMIT = 8;

function sampleSourceName(sample, inventory) {
  if (typeof sample?.sourceName === "string" && sample.sourceName) {
    return sample.sourceName;
  }
  return inventory?.find((entry) => entry.source === sample?.source)?.sourceName
    || `source ${sample?.source ?? "unknown"}`;
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
