import componentsData from "../data/components.json";
import {
  BUILD_GEOMETRY_SCHEMA,
  applyMeasuredGeometry,
  applyMeasuredGeometryToAssemblySpec,
  clearMeasuredGeometry,
  geometryProvenance,
  measuredGeometryForPart,
  normalizeGeometryOverrides,
  setMeasuredGeometryValue,
  summarizeMeasuredGeometry,
} from "./buildGeometry";

const motor = componentsData.motors.find(
  (part) => part.id === "motor-tmotor-f60-pro-v-1750kv",
);

test("adds validated measured geometry without mutating the catalog", () => {
  let overrides = normalizeGeometryOverrides(null);
  overrides = setMeasuredGeometryValue(
    overrides,
    "motors",
    motor.id,
    "propShaftMm",
    5,
  );
  overrides = setMeasuredGeometryValue(
    overrides,
    "motors",
    motor.id,
    "dimensionsMm",
    [26.8, 31.7, 26.8],
  );
  const effective = applyMeasuredGeometry("motors", motor, overrides);

  expect(overrides.schema).toBe(BUILD_GEOMETRY_SCHEMA);
  expect(measuredGeometryForPart(overrides, "motors", motor.id)).toEqual({
    propShaftMm: 5,
    dimensionsMm: [26.8, 31.7, 26.8],
  });
  expect(effective).toMatchObject({
    propShaftMm: 5,
    geometrySource: "user-measured",
    measuredFields: ["dimensionsMm", "propShaftMm"],
  });
  expect(motor.propShaftMm).toBeUndefined();
});

test("rejects malformed measurements and resets a whole part", () => {
  let overrides = setMeasuredGeometryValue(
    normalizeGeometryOverrides(null),
    "motors",
    motor.id,
    "propShaftMm",
    -1,
  );
  expect(measuredGeometryForPart(overrides, "motors", motor.id)).toEqual({});

  overrides = setMeasuredGeometryValue(
    overrides,
    "motors",
    motor.id,
    "propShaftMm",
    5,
  );
  expect(clearMeasuredGeometry(overrides, "motors", motor.id).categories)
    .toEqual({});
});

test("normalizes persisted overrides and builds an effective assembly", () => {
  const stored = normalizeGeometryOverrides({
    schema: BUILD_GEOMETRY_SCHEMA,
    categories: {
      motors: {
        [motor.id]: {
          propShaftMm: "5",
          dimensionsMm: [26.8, 31.7, 26.8],
          bad: -4,
        },
      },
    },
  });
  const assemblySpec = applyMeasuredGeometryToAssemblySpec(
    { frame: null, motor, propeller: null },
    stored,
  );

  expect(assemblySpec.motor.propShaftMm).toBe(5);
  expect(assemblySpec.motor.dimensionsMm).toEqual([26.8, 31.7, 26.8]);
  expect(geometryProvenance(stored, "motors", motor).find(
    (field) => field.key === "propShaftMm",
  )).toMatchObject({
    catalogValue: null,
    effectiveValue: 5,
    source: "user-measured",
  });
});

test("summarizes named measured fields with catalog provenance for export", () => {
  const overrides = setMeasuredGeometryValue(
    normalizeGeometryOverrides(null),
    "motors",
    motor.id,
    "propShaftMm",
    5,
  );
  const summary = summarizeMeasuredGeometry(
    { motor, frame: null, propeller: null },
    overrides,
  );

  expect(summary).toEqual({
    schema: "rotorbench.measured-geometry-summary.v1",
    scope: "build-local measurement; not hardware verification",
    partCount: 1,
    fieldCount: 1,
    parts: [{
      key: "motor",
      id: motor.id,
      name: motor.name,
      fields: [{
        key: "propShaftMm",
        label: "Prop shaft diameter",
        value: 5,
        catalogValue: null,
        source: "user-measured",
      }],
    }],
  });
});
