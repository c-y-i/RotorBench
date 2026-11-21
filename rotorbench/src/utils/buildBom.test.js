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
