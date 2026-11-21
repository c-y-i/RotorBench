import {
  buildBomFilename,
  createBuildBomCsv,
  createBuildBomRows,
} from "./buildBom";

const build = {
  name: "AOS Bench / 3.5",
  componentIds: {
    frameId: "frame-aos-35-v51",
    motorId: "motor-tmotor-f1404-3800kv",
    propellerId: "prop-gemfan-hurricane-3520-3",
    batteryId: "battery-tattu-rline-4s-850-95c",
    escId: "esc-speedybee-bls-35a-mini-v2",
    flightControllerId: "fc-speedybee-f405-mini",
    receiverId: "rx-radiomaster-rp1-v2",
  },
};

test("build BOM rows use frame motor count for motors and propellers", () => {
  const rows = createBuildBomRows(build);
  expect(rows).toHaveLength(7);
  expect(rows.find((row) => row.category === "Motor")).toMatchObject({
    quantity: 4,
    product: "T-Motor F1404 3800KV",
  });
  expect(rows.find((row) => row.category === "Propeller").quantity).toBe(4);
  expect(rows.find((row) => row.category === "Frame").quantity).toBe(1);
});

test("BOM CSV includes pricing, source links, and estimate counts", () => {
  const csv = createBuildBomCsv(build);
  expect(csv).toContain("Category,Quantity,Product");
  expect(csv).toContain("Motor,4,T-Motor F1404 3800KV");
  expect(csv).toContain("source-backed");
  expect(csv).toContain(",catalog estimate,");
  expect(csv.split("\r\n")).toHaveLength(9);
  expect(buildBomFilename(build.name)).toBe("aos-bench-3-5-bom.csv");
});

test("partial builds keep missing BOM categories explicit", () => {
  const rows = createBuildBomRows({
    componentIds: { frameId: "frame-aos-35-v51" },
  });

  expect(rows).toHaveLength(7);
  expect(rows.find((row) => row.category === "Frame").quantity).toBe(1);
  expect(rows.find((row) => row.category === "Motor")).toMatchObject({
    quantity: 0,
    product: "Not selected",
    dataStatus: "missing selection",
  });
});

test("connector mismatch adds an explicit adapter requirement", () => {
  const rows = createBuildBomRows({
    ...build,
    componentIds: {
      ...build.componentIds,
      batteryId: "battery-tattu-rline-6s-1300-120c",
    },
  });
  const adapter = rows.find((row) => row.category === "Power adapter");

  expect(adapter).toMatchObject({
    quantity: 1,
    product: "XT60-to-XT30 adapter",
    unitPrice: 0,
    extendedPrice: 0,
    sourceUrl: "",
    catalogItem: false,
  });
  expect(adapter.dataStatus).toMatch(/verify current rating and polarity/i);

  const csv = createBuildBomCsv({
    ...build,
    componentIds: {
      ...build.componentIds,
      batteryId: "battery-tattu-rline-6s-1300-120c",
    },
  });
  expect(csv).toContain("Power adapter,1,XT60-to-XT30 adapter");
  expect(csv).toContain("catalog estimate; excludes 1 derived requirement");
});

test("solder-pad ESC adds an explicit battery lead requirement", () => {
  const rows = createBuildBomRows({
    ...build,
    componentIds: {
      ...build.componentIds,
      escId: "esc-holybro-tekko32-f4-65a",
    },
  });

  expect(rows.find((row) => row.category === "Power lead")).toMatchObject({
    quantity: 1,
    product: "XT30-to-bare-wire power lead",
    unitPrice: 0,
    catalogItem: false,
  });
});
