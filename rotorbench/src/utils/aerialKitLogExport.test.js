import {
  createAerialKitLogExport,
  parseAerialKitLogExport,
} from "./aerialKitLogExport";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function recordFrame(index, version, bytes) {
  return {
    status: "record",
    source: 0,
    sourceName: "fast",
    index,
    record: {
      index,
      version,
      bytes,
      timeMs: index * 100,
      gyro: [1, 2, 3],
      accel: [4, 5, 6],
      rollDeg: 1,
      pitchDeg: 2,
      yawDeg: 3,
      altMm: 1000,
      stick: [10, 20, 30, 40],
      torque: [1, 2, 3],
      motors: [11, 12, 13, 14],
      state: 0,
      flags: 0,
      lat: 0,
      lon: 0,
      gyroFiltered: null,
      notchHz: null,
      notchEngaged: null,
      timeUs: null,
      rateSetpoint: null,
      pidP: null,
      pidI: null,
      pidD: null,
      vbatMv: null,
    },
  };
}

test("exports a bounded sample with a source, range, holes, completion, and versions manifest", () => {
  const exported = createAerialKitLogExport({
    nowMs: 2000,
    targetName: "Aerial Kit F405",
    inventory: [{
      requestedSource: 0,
      sourceName: "fast",
      status: "available",
      count: 3,
    }],
    sample: {
      source: 0,
      sourceName: "fast",
      first: 0,
      count: 3,
      hz: 20,
      frames: [
        recordFrame(0, 2, 51),
        {
          status: "hole",
          source: 0,
          sourceName: "fast",
          index: 1,
          record: null,
        },
        recordFrame(2, 4, 87),
        {
          status: "done",
          source: 0,
          sourceName: "fast",
          index: 3,
          record: null,
        },
      ],
    },
  });

  expect(exported).toMatchObject({
    schema: "rotorbench.aerial-kit-log-sample.v1",
    observedAt: "1970-01-01T00:00:02.000Z",
    targetName: "Aerial Kit F405",
    scope: "bounded-live-log-sample",
    manifest: {
      source: { id: 0, name: "fast" },
      requestedRange: {
        first: 0,
        count: 3,
        maximumRecords: 8,
        rateHz: 20,
      },
      delivery: {
        status: "complete-with-holes",
        frames: 4,
        records: 2,
        holes: 1,
        complete: true,
      },
      recordVersions: { 2: 1, 3: 0, 4: 1 },
      holeIndexes: [1],
    },
    boundaries: {
      aircraftLogMutated: false,
      entireAircraftLogIncluded: false,
      flightReady: false,
    },
  });
  expect(exported).not.toHaveProperty("serialPort");
  expect(exported).not.toHaveProperty("serialNumber");
  expect(JSON.stringify(exported)).not.toMatch(/binding phrase/i);

  expect(parseAerialKitLogExport(exported)).toMatchObject({
    kind: "fc-log-sample",
    observedAtMs: 2000,
    targetName: "Aerial Kit F405",
    manifest: {
      source: { id: 0, name: "fast" },
      delivery: {
        status: "complete-with-holes",
        records: 2,
        holes: 1,
        complete: true,
      },
      recordVersions: { 2: 1, 3: 0, 4: 1 },
      holeIndexes: [1],
    },
  });

  const hiddenHole = clone(exported);
  hiddenHole.manifest.delivery.holes = 0;
  expect(() => parseAerialKitLogExport(hiddenHole))
    .toThrow(/manifest does not agree/i);

  const inflatedRecords = clone(exported);
  inflatedRecords.manifest.delivery.records = 3;
  expect(() => parseAerialKitLogExport(inflatedRecords))
    .toThrow(/manifest does not agree/i);

  const changedVersionCount = clone(exported);
  changedVersionCount.manifest.recordVersions["2"] = 2;
  expect(() => parseAerialKitLogExport(changedVersionCount))
    .toThrow(/manifest does not agree/i);

  const missingCompletion = clone(exported);
  missingCompletion.frames.pop();
  expect(() => parseAerialKitLogExport(missingCompletion))
    .toThrow(/manifest does not agree|incomplete/i);
});

test("marks a no-stream answer complete without inventing records", () => {
  const exported = createAerialKitLogExport({
    sample: {
      source: 2,
      sourceName: "flash",
      first: 0,
      count: 0,
      hz: 0,
      noStream: true,
      frames: [],
    },
  });
  expect(exported.manifest.delivery).toEqual({
    status: "no-stream",
    frames: 0,
    records: 0,
    holes: 0,
    completion: {
      complete: true,
      index: null,
    },
    complete: true,
  });
  expect(exported.frames).toEqual([]);
  expect(parseAerialKitLogExport(exported)).toMatchObject({
    kind: "fc-log-sample",
    manifest: {
      delivery: {
        status: "no-stream",
        frames: 0,
        complete: true,
      },
    },
  });
});
