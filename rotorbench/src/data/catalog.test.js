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
    ["rx-radiomaster-rp4td-m", "radiomasterrc.com", 1.0],
    ["rx-radiomaster-xr4-gemini", "radiomasterrc.com", 1.7],
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

test("RP4TD-M keeps published RF specs separate from inferred board fields", () => {
  const receiver = componentsData.receivers.find(
    (item) => item.id === "rx-radiomaster-rp4td-m",
  );

  expect(receiver).toMatchObject({
    name: "RadioMaster RP4TD-M ExpressLRS Mini Diversity",
    protocol: "CRSF",
    frequencyBands: ["2.4 GHz"],
    weight: 1.0,
    dimensionsMm: [18.1, 4, 16],
    rfChips: "SX1281 ×2",
    telemetryPowerMw: 10,
    receiverRefreshRate: "500 Hz / F1000 Hz maximum",
    workingVoltage: "5 V",
    firmwareVersion: "ExpressLRS 3.4.3 pre-installed",
    antenna: "2 × 65 mm 2.4 GHz T antenna",
    wifiUpdates: true,
    price: 19.99,
    modelStatus: "not_available",
    sourceUrl: "https://radiomasterrc.com/products/rp4td-m-expresslrs-2-4ghz-mini-true-diversity-receiver",
  });
  expect(receiver.estimatedFields).toEqual([
    "dimensionsMm",
    "currentDraw",
    "channels",
    "mounting_point",
  ]);
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

test("AOS Supernova retains published motor data and prop-specific test status", () => {
  const motor = componentsData.motors.find(
    (item) => item.id === "motor-aos-supernova-2207-1980kv",
  );

  expect(motor).toMatchObject({
    name: "AOS Supernova 2207 1980KV",
    kv: 1980,
    weight: 31,
    maxCurrent: 61,
    voltage: { min: 18.5, max: 25.2 },
    mountingPatternMm: [16, 16],
    dimensionsMm: [27.6, 19.5, 27.6],
    bellDiameterMm: 27.6,
    propShaftMm: 5,
    configuration: "12N14P",
    statorDiameterMm: 22,
    statorHeightMm: 7,
    internalResistanceOhm: 0.045,
    idleCurrentA: 1.1,
    maxContinuousPowerW: 1456,
    price: 34.99,
    modelStatus: "not_available",
    performanceDataStatus: "published_prop_specific_tables_not_normalized",
    sourceUrl: "https://www.aos-rc.com/designs/aos-supernova-2207-1980kv",
  });
  expect(motor.estimatedFields).toEqual(["mounting_point"]);
  expect(motor.thrustData).toEqual([]);
  expect(motor.propMountSourceUrl).toContain("fioparts.com");
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

test("Tattu R-Line V6 keeps published pack specs and estimates only the model curve", () => {
  const battery = componentsData.batteries.find(
    (item) => item.id === "battery-tattu-rline-v6-6s-1480-160c",
  );

  expect(battery).toMatchObject({
    name: "Tattu R-Line V6 6S 1480mAh 160C",
    capacity: 1480,
    voltage: 22.2,
    cells: 6,
    cRating: 160,
    weight: 220,
    dimensionsMm: [69.5, 36.5, 42],
    dischargeConnector: "XT60",
    price: 39.99,
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

test("CNHL Black V2 battery separates published pack data from derived fields", () => {
  const battery = componentsData.batteries.find(
    (item) => item.id === "battery-cnhl-black-v2-6s-1300-130c",
  );

  expect(battery).toMatchObject({
    name: "CNHL Black Series V2.0 6S 1300mAh 130C",
    capacity: 1300,
    voltage: 22.2,
    cells: 6,
    cRating: 130,
    weight: 209,
    dimensionsMm: [82, 39, 35.5],
    dischargeConnector: "XT60",
    price: 18.99,
    modelStatus: "not_available",
    sourceUrl: expect.stringContaining("chinahobbyline.com"),
  });
  expect(battery.estimatedFields).toEqual([
    "mounting_point",
    "dischargeProfile",
    "price allocation",
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

test("XR4 keeps dual-band RF specifications separate from estimated fields", () => {
  const receiver = componentsData.receivers.find(
    (item) => item.id === "rx-radiomaster-xr4-gemini",
  );
  expect(receiver).toMatchObject({
    name: "RadioMaster XR4 Gemini Xrossband",
    protocol: "CRSF",
    weight: 1.7,
    dimensionsMm: [22, 4, 18],
    frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
    rfChips: "Semtech LR1121 ×2",
    telemetryPowerMw: 100,
    workingVoltage: "4.5-8.4 V",
    firmwareVersion: "ExpressLRS 3.5.1 pre-installed",
    price: 34.99,
    modelStatus: "not_available",
    sourceUrl: "https://radiomasterrc.com/products/xr4-gemini-xrossband-dual-band-expresslrs-receiver",
  });
  expect(receiver.estimatedFields).toEqual([
    "currentDraw",
    "channels",
    "mounting_point",
  ]);
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

test("AOS 5 V5 adds a current 5-inch frame with published interfaces", () => {
  const frame = componentsData.frames.find(
    (item) => item.id === "frame-aos-5-v5",
  );

  expect(frame).toMatchObject({
    name: "AOS 5 V5",
    size: 228,
    weight: 129,
    motorCount: 4,
    maxPropSize: 5.3,
    dimensionsMm: [180, 34, 140],
    stackMountPatternsMm: [[30.5, 30.5], [25.5, 25.5], [20, 20]],
    motorMountPatternsMm: [[16, 16], [19, 19]],
    price: 79,
    modelStatus: "not_available",
    sourceUrl: "https://www.aos-rc.com/designs/aos-5-v5",
    priceSourceUrl: "https://shop.iflight.com/AOS5-V5-Frame-Kit-Pro2127",
  });
  expect(frame.estimatedFields).toEqual([
    "motor positions",
    "stackHeight",
  ]);
  expect(frame.estimatedFields).not.toContain("dimensionsMm");
  expect(frame.estimatedFields).not.toContain("weight");
});

test("Volador II VX5 keeps published interfaces separate from estimated geometry", () => {
  const frame = componentsData.frames.find(
    (item) => item.id === "frame-volador-ii-vx5-o4",
  );

  expect(frame).toMatchObject({
    name: "FlyFishRC Volador II VX5 O4",
    size: 225,
    weight: 177.4,
    motorCount: 4,
    maxPropSize: 5.1,
    stackMountPatternsMm: [[20, 20], [30.5, 30.5]],
    motorMountPatternsMm: [[16, 16]],
    price: 69.9,
    modelStatus: "not_available",
    sourceUrl: expect.stringContaining("flyfishrc.com"),
  });
  expect(frame.estimatedFields).toEqual([
    "motor positions",
    "stackHeight",
    "dimensionsMm",
  ]);
});

test("HQProp PizzaCutters 5037 adds a source-backed five-inch propeller", () => {
  const propeller = componentsData.propellers.find(
    (item) => item.id === "prop-hqprop-pizzacutters-5037-3",
  );

  expect(propeller).toMatchObject({
    size: 5,
    pitch: 3.7,
    weight: 4,
    hubDiameterMm: 13.3,
    hubThicknessMm: 7,
    shaftMm: 5,
    dimensionsMm: [127, 7, 127],
    performanceDataStatus: "not_published",
    thrustData: [],
    sourceUrl: expect.stringContaining("hqprop.com"),
  });
});

test("Gemfan 51499 preserves published mechanics without inventing thrust", () => {
  const propeller = componentsData.propellers.find(
    (item) => item.id === "prop-gemfan-hurricane-51499-3",
  );

  expect(propeller).toMatchObject({
    name: "Gemfan Hurricane 51499 3-Blade",
    size: 5.1,
    pitch: 4.99,
    bladeCount: 3,
    weight: 4.96,
    hubThicknessMm: 7,
    shaftMm: 5,
    dimensionsMm: [128.8, 7, 128.8],
    performanceDataStatus: "not_published",
    thrustData: [],
    price: 1.25,
    sourceUrl: expect.stringContaining("gemfanhobby.com"),
  });
  expect(propeller.estimatedFields).toEqual([
    "mounting_point",
    "price allocation",
  ]);
});

test("the model manifest binds legacy catalog IDs without prefix guessing", () => {
  const manifest = componentsData.modelManifest;
  const bound = Object.values(manifest.assets).flatMap((entries) => (
    Object.entries(entries)
  ));

  expect(manifest.schema).toBe("rotorbench.model-manifest.v1");
  expect(bound).toHaveLength(23);
  bound.forEach(([id, entry]) => {
    expect(entry.contractStatus).toBe("legacy-unverified");
    expect(componentsData.motors
      .concat(
        componentsData.propellers,
        componentsData.escs,
        componentsData.flight_controllers,
        componentsData.frames,
        componentsData.batteries,
        componentsData.receivers,
      )
      .some((part) => part.id === id)).toBe(true);
  });
  expect(manifest.assets.propellers["prop-2030-tri"]).toMatchObject({
    cw: "prop-2030-tri_CW.glb",
    ccw: "prop-2030-tri_CCW.glb",
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
