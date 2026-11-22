import {
  createModelConversionUrl,
  hasCatalogModel,
  resolveModelAsset,
  resolveModelForComponent,
  resolvePropellerModelPair,
  summarizeModelSources,
} from "./modelAssets";

test("resolves explicit single-file catalog models without directory scans", () => {
  const catalog = {
    modelManifest: {
      assets: {
        frames: {
          "frame-test": {
            glb: "frame-test.glb",
            contractStatus: "legacy-unverified",
          },
        },
      },
    },
    frames: [],
  };
  const asset = resolveModelAsset("frames", {
    id: "frame-test",
  }, "https://api.example", catalog);

  expect(asset).toMatchObject({
    kind: "catalog-glb",
    catalogModel: true,
    modelUrl: "https://api.example/api/models/convert/frames/frame-test.glb?format=glb",
    provenance: "Catalog GLB · legacy normalization unverified",
  });
});

test("requires both propeller variants before offering a catalog model", () => {
  const catalog = {
    modelManifest: {
      assets: {
        propellers: {
          "prop-test": {
            cw: "prop-test_CW.glb",
            ccw: "prop-test_CCW.glb",
            contractStatus: "verified",
          },
        },
      },
    },
    propellers: [],
  };
  const complete = {
    id: "prop-test",
  };
  expect(hasCatalogModel(complete, "propellers", catalog)).toBe(true);
  expect(resolveModelAsset("propellers", complete, "api", catalog)).toMatchObject({
    kind: "catalog-glb",
    cwUrl: "api/api/models/convert/propellers/prop-test_CW.glb?format=glb",
    ccwUrl: "api/api/models/convert/propellers/prop-test_CCW.glb?format=glb",
  });

  const incomplete = {
    ...catalog,
    modelManifest: {
      assets: {
        propellers: {
          "prop-test": {
            cw: "prop-test_CW.glb",
            contractStatus: "verified",
          },
        },
      },
    },
  };
  expect(hasCatalogModel(complete, "propellers", incomplete)).toBe(false);
  expect(resolvePropellerModelPair("missing", {
    apiBase: "api",
    catalog: { propellers: [complete] },
  })).toMatchObject({
    cw: null,
    ccw: null,
    provenance: "Not selected",
  });
});

test("returns fallback assets and encodes explicit filenames", () => {
  expect(createModelConversionUrl("motors", "motor with space.glb", "api"))
    .toBe("api/api/models/convert/motors/motor%20with%20space.glb?format=glb");
  expect(resolveModelForComponent("motors", "missing", {
    catalog: { motors: [] },
  })).toMatchObject({
    kind: "missing-selection",
    modelUrl: null,
  });
});

test("summarizes catalog and fallback model sources once for portable reports", () => {
  const summary = summarizeModelSources({
    frame: { id: "frame-aos-35-v51", name: "AOS 3.5 V5.1" },
    flightController: {
      id: "fc-holybro-kakute-f7",
      name: "Kakute F7 AIO",
    },
  });

  expect(summary).toMatchObject({
    selectedCount: 2,
    catalogModelCount: 1,
    generatedFallbackCount: 1,
    legacyNormalizationCount: 1,
  });
  expect(summary.sources).toEqual([
    expect.objectContaining({
      key: "frame",
      name: "AOS 3.5 V5.1",
      catalogModel: false,
      kind: "generated-fallback",
    }),
    expect.objectContaining({
      key: "flightController",
      name: "Kakute F7 AIO",
      catalogModel: true,
      kind: "catalog-glb",
      legacyNormalizationUnverified: true,
    }),
  ]);
});
