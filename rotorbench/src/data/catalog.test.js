import componentsData from "./components.json";
import { summarizeBuild } from "../utils/buildComparison";

test("the catalog has unique IDs and expanded coverage", () => {
  const components = Object.values(componentsData).flat();
  const ids = components.map((component) => component.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(components.length).toBeGreaterThanOrEqual(53);

  expect(componentsData.frames.length).toBeGreaterThanOrEqual(6);
  expect(componentsData.motors.length).toBeGreaterThanOrEqual(9);
  expect(componentsData.propellers.length).toBeGreaterThanOrEqual(6);
  expect(componentsData.batteries.length).toBeGreaterThanOrEqual(7);
  expect(componentsData.escs.length).toBeGreaterThanOrEqual(7);
  expect(componentsData.flight_controllers.length).toBeGreaterThanOrEqual(8);
  expect(componentsData.receivers.length).toBeGreaterThanOrEqual(6);
});

test("expanded receivers keep source and estimated fields explicit", () => {
  const expected = [
    ["rx-betafpv-elrs-nano-24", "betafpv.com", 0.7],
    ["rx-betafpv-superd-24", "betafpv.com", 1.1],
    ["rx-radiomaster-rp2-v2", "radiomasterrc.com", 0.55],
    ["rx-radiomaster-rp3-v2", "radiomasterrc.com", 4.6],
    ["rx-radiomaster-rp4td", "radiomasterrc.com", 1.4],
  ];
  for (const [id, sourceHost, weight] of expected) {
    const receiver = componentsData.receivers.find((item) => item.id === id);
    expect(receiver).toMatchObject({
      protocol: "CRSF",
      weight,
      currentDraw: expect.any(Number),
      channels: 16,
      sourceUrl: expect.stringContaining(sourceHost),
      modelStatus: "not_available",
      estimatedFields: expect.arrayContaining(["currentDraw", "mounting_point"]),
    });
  }
});

test("iFlight XING2 2207 keeps published mechanics and estimates explicit", () => {
  const motor = componentsData.motors.find(
    (item) => item.id === "motor-iflight-xing2-2207-2755kv",
  );

  expect(motor).toMatchObject({
    name: "iFlight XING2 2207 2755KV",
    kv: 2755,
    weight: 31.6,
    maxCurrent: 40.35,
    voltage: { min: 14.8, max: 16.8 },
    mountingPatternMm: [16, 16],
    dimensionsMm: [29.08, 32.6, 29.08],
    propShaftMm: 5,
    price: 20.99,
    modelStatus: "not_available",
    sourceUrl: expect.stringContaining("shop.iflight.com"),
  });
  expect(motor.estimatedFields).toEqual(["mounting_point"]);
  expect(componentsData.motors.find(
    (item) => item.id === "motor-iflight-xing2-2207-1855kv",
  )).toMatchObject({
    kv: 1855,
    maxCurrent: 35.08,
    voltage: { min: 14.8, max: 24 },
    mountingPatternMm: [16, 16],
    propShaftMm: 5,
    price: 20.99,
  });
});

test("Tattu R-Line 6S pack keeps pack dimensions and estimated curves explicit", () => {
  const battery = componentsData.batteries.find(
    (item) => item.id === "battery-tattu-rline-v3-6s-1050-120c",
  );

  expect(battery).toMatchObject({
    name: "Tattu R-Line V3 6S 1050mAh 120C",
    capacity: 1050,
    voltage: 22.2,
    cells: 6,
    cRating: 120,
    weight: 200,
    dimensionsMm: [76, 40, 37],
    dischargeConnector: "XT60",
    price: 32.99,
    modelStatus: "not_available",
    sourceUrl: expect.stringContaining("genstattu.com"),
  });
  expect(battery.estimatedFields).toEqual([
    "mounting_point",
    "dischargeProfile",
  ]);
  expect(battery.estimatedFields).not.toContain("dimensionsMm");
  expect(battery.estimatedFields).not.toContain("weight");
});

test("RP2 V2 keeps the manufacturer's physical dimensions distinct from estimates", () => {
  const receiver = componentsData.receivers.find(
    (item) => item.id === "rx-radiomaster-rp2-v2",
  );
  expect(receiver).toMatchObject({
    weight: 0.55,
    dimensionsMm: [13, 11, 7],
    protocol: "CRSF",
    price: 18.99,
    sourceUrl: "https://radiomasterrc.com/products/rp2-expresslrs-2-4ghz-nano-receiver",
    modelStatus: "not_available",
  });
  expect(receiver.estimatedFields).toContain("currentDraw");
  expect(receiver.estimatedFields).toContain("channels");
  expect(receiver.estimatedFields).not.toContain("dimensionsMm");
  expect(receiver.estimatedFields).not.toContain("weight");
});

test("RP3 V2 adds published dual-antenna dimensions without hidden estimates", () => {
  const receiver = componentsData.receivers.find(
    (item) => item.id === "rx-radiomaster-rp3-v2",
  );
  expect(receiver).toMatchObject({
    weight: 4.6,
    dimensionsMm: [22, 13, 4],
    protocol: "CRSF",
    price: 19.99,
    sourceUrl: "https://radiomasterrc.com/products/rp3-expresslrs-2-4ghz-nano-receiver",
    modelStatus: "not_available",
  });
  expect(receiver.estimatedFields).toContain("currentDraw");
  expect(receiver.estimatedFields).toContain("channels");
  expect(receiver.estimatedFields).not.toContain("dimensionsMm");
  expect(receiver.estimatedFields).not.toContain("weight");
});

test("expanded ESCs and flight controller preserve published limits", () => {
  const tekko = componentsData.escs.find(
    (item) => item.id === "esc-holybro-tekko32-f4-65a",
  );
  const blitz = componentsData.escs.find(
    (item) => item.id === "esc-iflight-blitz-e55",
  );
  const kakute = componentsData.flight_controllers.find(
    (item) => item.id === "fc-holybro-kakute-h7-v2",
  );

  expect(tekko).toMatchObject({
    currentRating: 65,
    burstCurrent: 75,
    weight: 15.8,
    mountingPatternMm: [30.5, 30.5],
    voltage: { min: 14.8, max: 25.2 },
    powerConnection: "solder-pads",
    sourceUrl: expect.stringContaining("holybro.com"),
    connectorSourceUrl: expect.stringContaining("holybro.com"),
  });
  expect(blitz).toMatchObject({
    currentRating: 55,
    burstCurrent: 65,
    weight: 15.3,
    mountingPatternMm: [30.5, 30.5],
    voltage: { min: 7.4, max: 25.2 },
    powerConnection: "supplied-cable",
    sourceUrl: expect.stringContaining("iflight.com"),
    connectorSourceUrl: expect.stringContaining("shop.iflight.com"),
  });
  expect(kakute).toMatchObject({
    processor: "STM32H743",
    imu: "BMI270",
    weight: 8,
    maxVoltage: 33.6,
    mountingPatternMm: [30.5, 30.5],
    sourceUrl: expect.stringContaining("holybro.com"),
    estimatedFields: ["mounting_point"],
  });
});

test("AOS 7 and XING 2806.5 add source-backed long-range mechanics", () => {
  const frame = componentsData.frames.find(
    (item) => item.id === "frame-aos-7-evo-v12",
  );
  const motor = componentsData.motors.find(
    (item) => item.id === "motor-iflight-xing-2806-5-1300kv",
  );
  const propeller = componentsData.propellers.find(
    (item) => item.id === "prop-gemfan-flash-7040-3",
  );

  expect(frame).toMatchObject({
    size: 293,
    weight: 290,
    maxPropSize: 7,
    dimensionsMm: [284, 34.5, 228],
    motorMountPatternsMm: [[19, 19]],
    modelStatus: "not_available",
    sourceUrl: expect.stringContaining("iflight.com"),
  });
  expect(frame.estimatedFields).toEqual(expect.arrayContaining([
    "stackHeight",
    "stackMountPatternsMm",
    "motor positions",
  ]));

  expect(motor).toMatchObject({
    kv: 1300,
    weight: 53.3,
    maxCurrent: 48.33,
    dimensionsMm: [35.06, 36.8, 35.06],
    mountingPatternMm: [19, 19],
    propShaftMm: 5,
    bellDiameterMm: 35.06,
    modelStatus: "not_available",
    sourceUrl: expect.stringContaining("iflight.com"),
  });
  expect(motor.estimatedFields).toEqual(expect.arrayContaining([
    "mounting_point",
    "voltage",
  ]));
  expect(propeller).toMatchObject({
    size: 7,
    pitch: 4,
    weight: 7.9,
    dimensionsMm: [178.43, 7.5, 178.43],
    shaftMm: 5,
    hubThicknessMm: 7.5,
    performanceDataStatus: "not_published",
    thrustData: [],
    sourceUrl: expect.stringContaining("gemfanhobby.com"),
  });
});

test("AOS Cine25 and Gemfan 2520 add a source-backed compact platform", () => {
  const frame = componentsData.frames.find(
    (item) => item.id === "frame-aos-cine25-v5",
  );
  const propeller = componentsData.propellers.find(
    (item) => item.id === "prop-gemfan-hurricane-2520-3",
  );

  expect(frame).toMatchObject({
    size: 120,
    weight: 58,
    maxPropSize: 2.5,
    stackMountPatternsMm: [[20, 20], [25.5, 25.5]],
    motorMountPatternsMm: [[9, 9]],
    dimensionsMm: [171, 34, 147],
    sourceUrl: expect.stringContaining("aos-rc.com"),
  });
  expect(frame.estimatedFields).toEqual(
    expect.arrayContaining(["stackHeight", "motor positions"]),
  );
  expect(propeller).toMatchObject({
    size: 2.5,
    pitch: 2,
    weight: 1,
    hubThicknessMm: 5.5,
    shaftMm: 1.5,
    dimensionsMm: [64, 5.5, 64],
    performanceDataStatus: "not_published",
    thrustData: [],
    sourceUrl: expect.stringContaining("gemfanhobby.com"),
  });
});

test("source-backed fit metadata is not mislabeled as estimated", () => {
  const emax = componentsData.motors.find(
    (motor) => motor.id === "motor-emax-eco-ii-2207-1900kv",
  );
  expect(emax).toMatchObject({
    weight: 33.6,
    maxCurrent: 45,
    propShaftMm: 5,
    bellDiameterMm: 27.5,
    dimensionsMm: [27.5, 33.2, 27.5],
  });
  expect(emax.estimatedFields).not.toContain("dimensionsMm");

  const tattu = componentsData.batteries.find(
    (battery) => battery.id === "battery-tattu-rline-6s-1300-120c",
  );
  const speedyBeeEsc = componentsData.escs.find(
    (esc) => esc.id === "esc-speedybee-bl32-50a",
  );
  const mambaEsc = componentsData.escs.find(
    (esc) => esc.id === "esc-mamba-f55a",
  );
  expect(tattu).toMatchObject({
    dischargeConnector: "XT60",
    connectorSourceUrl: expect.stringContaining("genstattu.com"),
  });
  expect(speedyBeeEsc).toMatchObject({
    includedPowerConnector: "XT60",
    powerConnection: "connector",
    connectorSourceUrl: expect.stringContaining("robu.in"),
  });
  expect(mambaEsc).toMatchObject({
    includedPowerConnector: "XT60",
    powerConnection: "connector",
    connectorSourceUrl: expect.stringContaining("racedayquads.com"),
  });
});

test("F1404 KV variants preserve their source-backed shaft and voltage families", () => {
  const highKv = componentsData.motors.find(
    (motor) => motor.id === "motor-tmotor-f1404-4600kv",
  );
  const lowKv = componentsData.motors.find(
    (motor) => motor.id === "motor-tmotor-f1404-2900kv",
  );
  expect(highKv).toMatchObject({
    kv: 4600,
    weight: 9.34,
    maxCurrent: 20,
    voltage: { min: 11.1, max: 16.8 },
    propShaftMm: 1.5,
    mountingPatternMm: [9, 9],
    modelStatus: "not_available",
  });
  expect(lowKv).toMatchObject({
    kv: 2900,
    weight: 9.34,
    maxCurrent: 10.45,
    voltage: { min: 14.8, max: 25.2 },
    propShaftMm: 1.5,
    mountingPatternMm: [9, 9],
    modelStatus: "not_available",
  });
  for (const motor of [highKv, lowKv]) {
    expect(motor.sourceUrl).toContain("tmotorhobby.com");
    expect(motor.estimatedFields).toContain("mounting_point");
    expect(motor.estimatedFields).not.toContain("mountingPatternMm");
    expect(motor.estimatedFields).not.toContain("propShaftMm");
  }
});

test("both new F1404 KV variants fit the validated 3.5-inch platform", () => {
  for (const motorId of [
    "motor-tmotor-f1404-4600kv",
    "motor-tmotor-f1404-2900kv",
  ]) {
    const summary = summarizeBuild({
      id: `aos-35-${motorId}`,
      componentIds: {
        frameId: "frame-aos-35-v51",
        motorId,
        propellerId: "prop-gemfan-hurricane-3520-3",
        batteryId: "battery-tattu-rline-4s-850-95c",
        escId: "esc-speedybee-bls-35a-mini-v2",
        flightControllerId: "fc-speedybee-f405-mini",
        receiverId: "rx-radiomaster-rp2-v2",
      },
    });
    expect(summary).toMatchObject({
      selectedCount: 7,
      physicalFitStatus: "verified",
      electricalFitStatus: "verified",
    });
  }
});

test("the 3.5-inch platform is complete and physically compatible", () => {
  const build = {
    id: "aos-35-platform",
    name: "AOS 3.5 platform",
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
  const summary = summarizeBuild(build);
  expect(summary).toMatchObject({
    selectedCount: 7,
    sourceBackedCount: 7,
    physicalFitStatus: "verified",
    motorCount: 4,
  });
  expect(summary.totalWeight).toBeLessThan(450);
  expect(summary.totalPrice).toBeGreaterThan(200);
});

test("the expanded 5.5-inch electronics stack evaluates without hidden conflicts", () => {
  const summary = summarizeBuild({
    id: "expanded-55-stack",
    name: "Expanded 5.5 stack",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-emax-eco-ii-2207-1900kv",
      propellerId: "prop-hq-r42-51x42x3",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      escId: "esc-holybro-tekko32-f4-65a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      receiverId: "rx-radiomaster-rp4td",
    },
  });

  expect(summary).toMatchObject({
    selectedCount: 7,
    electricalFitStatus: "verified",
    physicalFitStatus: "unverified",
  });
});
