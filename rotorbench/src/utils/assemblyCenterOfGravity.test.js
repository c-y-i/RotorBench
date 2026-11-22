import {
  buildCenterOfGravityReport,
  estimateAssemblyCenterOfGravity,
} from "./assemblyCenterOfGravity";

function symmetricParts(overrides = {}) {
  return {
    frame: {
      id: "frame",
      name: "Frame",
      weight: 100,
      dimensionsMm: [100, 10, 100],
      motorPositionsMm: [
        [-30, 5, -30],
        [30, 5, -30],
        [30, 5, 30],
        [-30, 5, 30],
      ],
    },
    motor: {
      id: "motor",
      name: "Motor",
      weight: 10,
      dimensionsMm: [20, 20, 20],
    },
    propeller: {
      id: "prop",
      name: "Prop",
      weight: 2,
      dimensionsMm: [50, 5, 50],
    },
    battery: {
      id: "battery",
      name: "Battery",
      weight: 100,
      dimensionsMm: [60, 20, 30],
      mounting_point: [0, 0, -20],
    },
    ...overrides,
  };
}

test("estimates CG from catalog mass and resolved assembly stations", () => {
  const estimate = estimateAssemblyCenterOfGravity(symmetricParts());
  expect(estimate.status).toBe("available");
  expect(estimate.massG).toBe(248);
  expect(estimate.planarOffsetMm.lateral).toBe(0);
  expect(estimate.planarOffsetMm.longitudinal).toBeLessThan(0);
  expect(estimate.contributions.map((item) => item.id)).toEqual(
    expect.arrayContaining(["frame", "motors", "propellers", "battery"]),
  );
  expect(estimate.contributions.reduce(
    (sum, item) => sum + item.sharePct,
    0,
  )).toBeCloseTo(100, 0);
});

test("missing mass keeps the CG partial instead of inventing weight", () => {
  const parts = symmetricParts();
  parts.battery = { ...parts.battery, weight: null };
  const estimate = estimateAssemblyCenterOfGravity(parts);

  expect(estimate.status).toBe("partial");
  expect(estimate.missingWeights).toContain("Battery");
  expect(estimate.massG).toBe(148);
  expect(estimate.contributions.some((item) => item.id === "battery")).toBe(false);
});

test("asymmetric placement changes lateral and longitudinal balance", () => {
  const estimate = estimateAssemblyCenterOfGravity(symmetricParts({
    battery: {
      id: "battery",
      name: "Side battery",
      weight: 100,
      dimensionsMm: [60, 20, 30],
      mounting_point: [25, 0, -20],
    },
  }));

  expect(estimate.planarOffsetMm.lateral).toBeGreaterThan(5);
  expect(estimate.planarOffsetMm.longitudinal).toBeLessThan(0);
});

test("unavailable and partial reports retain explicit boundaries", () => {
  const unavailable = estimateAssemblyCenterOfGravity({});
  expect(unavailable).toMatchObject({
    status: "unavailable",
    massG: 0,
  });
  expect(buildCenterOfGravityReport(unavailable)).toContain("Unavailable:");

  const partial = estimateAssemblyCenterOfGravity(symmetricParts({
    battery: { id: "battery", name: "Battery" },
  }));
  const report = buildCenterOfGravityReport(partial, "CG bench");
  expect(report).toContain("Missing masses: Battery");
  expect(report).toContain("not a measured aircraft CG");
  expect(report).toContain("50 g build allowance is excluded");
});
