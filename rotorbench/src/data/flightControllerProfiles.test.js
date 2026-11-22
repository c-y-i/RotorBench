import {
  buildArmingGatePreview,
  buildFlightControllerSummary,
  buildSerialAllocationSummary,
  createDefaultFlightControllerConfig,
  FC_BOARD_PROFILES,
  getAirframeMotorLayout,
  getBoardProfile,
  getCatalogBoardProfile,
  getChannelPreset,
  getMotorOutputByCorner,
  getPropellerDirectionForOutputMap,
  supportsAerialKitLaunch,
  validateFlightControllerConfig,
} from "./flightControllerProfiles";
import componentsData from "./components.json";

test("every catalog flight controller resolves to one documented board map", () => {
  const missing = componentsData.flight_controllers
    .filter((controller) => !getCatalogBoardProfile(controller))
    .map((controller) => controller.id);
  const mappedIds = FC_BOARD_PROFILES
    .flatMap((profile) => profile.catalogFlightControllerIds || []);

  expect(missing).toEqual([]);
  expect(componentsData.flight_controllers).toHaveLength(11);
  expect(new Set(mappedIds).size).toBe(mappedIds.length);
});

test("the Feather product resolves to the public Aerial Kit wing map", () => {
  const feather = componentsData.flight_controllers.find(
    (controller) => controller.id === "fc-adafruit-feather-f405",
  );
  const profile = getCatalogBoardProfile(feather);

  expect(profile).toMatchObject({
    id: "feather-f405",
    family: "aerialkit",
    availability: "public",
    receiverUart: "USART3",
    defaultAirframe: "elevonwingsingle",
    outputs: { motors: 2, servos: 2 },
  });
  expect(createDefaultFlightControllerConfig(feather)).toMatchObject({
    firmwareFamily: "aerialkit",
    profileId: "feather-f405",
    airframe: "elevonwingsingle",
  });
});

test("Kakute F722 maps its documented receiver and ESC telemetry UARTs", () => {
  const f722 = getBoardProfile("kakute-f722");
  expect(f722).toMatchObject({
    family: "betaflight",
    board: "KAKUTEF7MINIV3",
    processor: "STM32F722",
    imu: "ICM42688P",
    receiverUart: "UART2",
    receiverBaud: 420000,
    gpsUart: null,
    outputs: { motors: 6, servos: 0 },
  });
  expect(f722.serialPorts).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: "UART2",
      role: "Receiver",
      detail: expect.stringMatching(/pin 3 RX.*pin 4 TX/i),
    }),
    expect.objectContaining({
      id: "UART4",
      role: "ESC telemetry",
    }),
  ]));
  expect(f722.sourceRefs.some((source) => source.includes("KakuteF722_Manual")))
    .toBe(true);
});

test("Aerial Kit motor layouts preserve the firmware output order", () => {
  const quadx = getAirframeMotorLayout("quadx");
  expect(quadx.motors.map(({ output, label, spin }) => ({ output, label, spin })))
    .toEqual([
      { output: 1, label: "RR", spin: "CW" },
      { output: 2, label: "FR", spin: "CCW" },
      { output: 3, label: "RL", spin: "CCW" },
      { output: 4, label: "FL", spin: "CW" },
    ]);
  expect(getAirframeMotorLayout("quadx1234").motors.map((motor) => motor.label))
    .toEqual(["FL", "FR", "RR", "RL"]);
  expect(getAirframeMotorLayout("quadp").motors.map((motor) => motor.label))
    .toEqual(["Rear", "Right", "Left", "Front"]);
  expect(getAirframeMotorLayout("y4").motors
    .filter((motor) => motor.label.startsWith("Rear"))
    .map((motor) => motor.spin)).toEqual(["CW", "CCW"]);
  expect(getAirframeMotorLayout("tri")).toMatchObject({
    servos: 1,
    motors: [
      { output: 1, label: "Rear", spin: "CCW" },
      { output: 2, label: "Right", spin: "CW" },
      { output: 3, label: "Left", spin: "CCW" },
    ],
  });
  expect(getAirframeMotorLayout("elevonwing")).toMatchObject({
    shape: "wing",
    servos: 2,
    motors: [
      { output: 1, label: "Left pusher", spin: "CCW" },
      { output: 2, label: "Right pusher", spin: "CW" },
    ],
  });
  expect(getAirframeMotorLayout("quadx", "betaflight")).toMatchObject({
    directionProfile: "props-in",
    motors: [
      { output: 1, label: "RR", spin: "CW" },
      { output: 2, label: "FR", spin: "CCW" },
      { output: 3, label: "RL", spin: "CCW" },
      { output: 4, label: "FL", spin: "CW" },
    ],
  });
  expect(getAirframeMotorLayout("quadx", "betaflight", "props-out")).toMatchObject({
    directionProfile: "props-out",
    motors: [
      { output: 1, label: "RR", spin: "CCW" },
      { output: 2, label: "FR", spin: "CW" },
      { output: 3, label: "RL", spin: "CW" },
      { output: 4, label: "FL", spin: "CCW" },
    ],
  });
  expect(getMotorOutputByCorner(getAirframeMotorLayout("quadx", "betaflight")))
    .toEqual({
      upperLeft: { output: 4, label: "FL", spin: "CW" },
      upperRight: { output: 2, label: "FR", spin: "CCW" },
      lowerRight: { output: 1, label: "RR", spin: "CW" },
      lowerLeft: { output: 3, label: "RL", spin: "CCW" },
    });
  expect(getMotorOutputByCorner(getAirframeMotorLayout("quadp", "aerialkit")))
    .toBeNull();
  expect(getPropellerDirectionForOutputMap(
    getMotorOutputByCorner(getAirframeMotorLayout("quadx", "aerialkit")),
  )).toBe("props-in");
  expect(getPropellerDirectionForOutputMap(
    getMotorOutputByCorner(getAirframeMotorLayout("quadx1234", "aerialkit")),
  )).toBe("props-out");
  expect(getPropellerDirectionForOutputMap(
    getMotorOutputByCorner(getAirframeMotorLayout("quadx", "betaflight", "props-out")),
  )).toBe("props-out");
  expect(getAirframeMotorLayout("quadp", "betaflight")).toBeNull();
  expect(getAirframeMotorLayout("quadx", "inav")).toBeNull();
  expect(getAirframeMotorLayout("unknown")).toBeNull();
});

test("Feather profile rejects a four-motor airframe", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "feather-f405",
    airframe: "quadx",
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile("feather-f405"));
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "output-count", severity: "error" }),
  ]));
});

test("documented Aerial Kit boards do not enable unfitted sensors", () => {
  expect(getBoardProfile("feather-f405").featureSupport).toMatchObject({
    barometer: false,
    rangefinder: false,
  });
  expect(getBoardProfile("esp32dev").featureSupport).toMatchObject({
    barometer: false,
    rangefinder: false,
  });
  expect(getBoardProfile("ghf435-aio-v2").featureSupport).toMatchObject({
    barometer: true,
    rangefinder: false,
  });
});

test("documented Aerial Kit boards expose the internal flight log separately", () => {
  expect(getBoardProfile("feather-f405").flightLog).toMatchObject({
    available: true,
    label: "Internal flash log + retained RAM",
  });
  expect(getBoardProfile("esp32dev").flightLog).toMatchObject({
    available: true,
    label: "ESP32 aerialkit partition + retained RAM",
  });
  expect(getBoardProfile("custom-board").flightLog).toBeNull();
});

test("SBUS reports the missing return path and inverter requirement", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "feather-f405",
    airframe: "elevonwingsingle",
    receiverProtocol: "sbus",
    receiverBaud: 100000,
    features: { ...createDefaultFlightControllerConfig().features, telemetry: true },
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile("feather-f405"));
  expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "sbus-inverter",
    "sbus-no-telemetry",
  ]));
});

test("ESP32 profile detects a receiver and GPS UART conflict", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "esp32dev",
    receiverUart: "UART1",
    features: { ...createDefaultFlightControllerConfig().features, gps: true },
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile("esp32dev"));
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "uart-conflict", severity: "error" }),
  ]));
});

test("summary keeps the receiver and safety mapping visible", () => {
  const config = createDefaultFlightControllerConfig();
  const summary = buildFlightControllerSummary(config, getBoardProfile(config.profileId)).join("\n");
  expect(summary).toContain("Receiver: CRSF / ExpressLRS");
  expect(summary).toContain("arm 6");
  expect(summary).toContain("velocity mode off");
  expect(summary).toContain("mission off");
  expect(summary).toContain("launch off");
  expect(summary).toContain("arm, flight mode, velocity mode, mission, launch only");
  expect(summary).toContain("Motor order: 1 RR CW, 2 FR CCW, 3 RL CCW, 4 FL CW");
  expect(summary).toContain("Failsafe: Firmware-derived");
  expect(summary).toContain(
    "Battery telemetry: divider 11:1, cells auto, warning 3.5 V/cell, minimum 3.3 V/cell, critical-pack return disabled",
  );
  expect(summary).toContain(
    "Geofence: disabled; radius 0 m, ceiling none, GPS gate 6 satellites",
  );
  expect(summary).toContain("Return floor: none");
  expect(summary).toContain(
    "Board alignment: roll 0°, pitch 0°, yaw 0° (applied roll, then pitch, then yaw; verify sensor signs)",
  );
  expect(summary).toContain(
    "Control loop request: gyro driver default, one pass every 1 gyro sample",
  );
});

test("Aerial Kit servo outputs carry firmware trim and travel limits", () => {
  const defaults = createDefaultFlightControllerConfig();
  const config = {
    ...defaults,
    airframe: "elevonwing",
    servo1Reverse: true,
    servo1TrimUs: 18,
    servo1TravelUs: 460,
    servo2Reverse: false,
    servo2TrimUs: -12,
    servo2TravelUs: 520,
  };
  const profile = getBoardProfile(config.profileId);

  expect(buildFlightControllerSummary(config, profile).join("\n"))
    .toContain(
      "Servo outputs: 1 reversed, trim 18 us, travel 460 us; 2 normal, trim -12 us, travel 520 us",
    );
  expect(validateFlightControllerConfig({
    ...config,
    servo1Reverse: null,
    servo1TrimUs: 201,
    servo1TravelUs: 901,
    servo2TrimUs: -201,
    servo2TravelUs: 99,
  }, profile)).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "servo-reverse",
      targetId: "fc-servo1-reverse",
    }),
    expect.objectContaining({
      code: "servo-trim-range",
      targetId: "fc-servo1-trim",
    }),
    expect.objectContaining({
      code: "servo-travel-range",
      targetId: "fc-servo1-travel",
    }),
    expect.objectContaining({
      code: "servo-trim-range",
      targetId: "fc-servo2-trim",
    }),
    expect.objectContaining({
      code: "servo-travel-range",
      targetId: "fc-servo2-travel",
    }),
  ]));
});

test("Aerial Kit battery telemetry stays inside firmware ranges", () => {
  const defaults = createDefaultFlightControllerConfig();
  const issues = validateFlightControllerConfig({
    ...defaults,
    vbatRatio: 0,
    vbatCells: 9,
    vbatWarnCell: 3.2,
    vbatMinCell: 3.4,
    batteryRthEnabled: true,
    fenceEnabled: true,
    fenceRadiusM: 0,
    fenceCeilingM: 5001,
    rthMinAltM: 501,
    gpsMinSats: 11,
    features: { ...defaults.features, gps: false },
    alignRollDeg: -181,
    alignPitchDeg: 181,
    alignYawDeg: null,
    gyroRateHz: 8001,
    pidDenom: 33,
  });

  expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "vbat-ratio-range",
    "vbat-cells-range",
    "vbat-threshold-order",
    "align-roll-range",
    "align-pitch-range",
    "align-yaw-range",
    "gyro-rate-range",
    "pid-denom-range",
    "battery-rth-without-gps",
    "fence-without-gps",
    "fence-radius-required",
    "fence-ceiling-range",
    "rth-min-alt-range",
    "gps-min-sats-range",
  ]));
});

test("Betaflight summary fingerprints its own normal QUAD X motor order", () => {
  const profile = getBoardProfile("custom-board");
  const config = {
    ...createDefaultFlightControllerConfig(),
    firmwareFamily: "betaflight",
  };
  const summary = buildFlightControllerSummary(config, profile).join("\n");
  expect(summary).toContain(
    "Betaflight normal props-in QUAD X motor order: 1 RR CW, 2 FR CCW, 3 RL CCW, 4 FL CW",
  );
  expect(buildFlightControllerSummary({
    ...config,
    motorDirection: "props-out",
  }, profile).join("\n")).toContain(
    "Betaflight reversed props-out QUAD X motor order: 1 RR CCW, 2 FR CW, 3 RL CW, 4 FL CCW",
  );
  const inav = buildFlightControllerSummary({
    ...config,
    firmwareFamily: "inav",
  }, profile).join("\n");
  expect(inav).not.toContain("motor order");
});

test("selected SBUS receiver drives the initial serial plan", () => {
  const config = createDefaultFlightControllerConfig(null, {
    id: "rx-sbus",
    name: "SBUS receiver",
    protocol: "SBUS",
  });
  expect(config.receiverProtocol).toBe("sbus");
  expect(config.receiverBaud).toBe(100000);
  expect(config.features.telemetry).toBe(false);
});

test("selected ExpressLRS receiver uses the documented arm and mode preset", () => {
  const config = createDefaultFlightControllerConfig(null, {
    id: "rx-elrs",
    name: "ELRS 2.4G RX",
    protocol: "CRSF",
  });
  expect(config.armChannel).toBe(5);
  expect(config.modeChannel).toBe(6);
  expect(getChannelPreset(config)?.id).toBe("aerialkit-elrs");
});

test("selected commercial controller infers its listed firmware family", () => {
  const config = createDefaultFlightControllerConfig({
    id: "fc-test",
    name: "Betaflight board",
    processor: "STM32F722",
    imu: "MPU6000",
    firmware: ["Betaflight"],
  });
  expect(config.firmwareFamily).toBe("betaflight");
  expect(config.profileId).toBe("custom-board");
  expect(config.armChannel).toBe(5);
  expect(config.beeperChannel).toBe(9);
  expect(config.failsafeThrottle).toBe(1000);
  expect(getChannelPreset(config)?.id).toBe("betaflight-bench");
});

test("SpeedyBee F405 V5 selects its documented Betaflight board profile", () => {
  const selected = {
    id: "fc-speedybee-f405-v5",
    name: "SpeedyBee F405 V5",
    processor: "STM32F405",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config.profileId).toBe("speedybee-f405-v5");
  expect(getCatalogBoardProfile(selected)?.id).toBe("speedybee-f405-v5");
  expect(profile).toMatchObject({
    label: "SpeedyBee F405 V5",
    board: "SPEEDYBEEF405V5",
    receiverUart: "UART2",
    receiverBaud: 420000,
    gpsUart: "UART4",
    outputs: { motors: 4, servos: 2 },
    receiverUartLocked: false,
    flightLog: { label: "16 MB onboard blackbox" },
  });
});

test("Matek F405-WMN selects its documented INAV wing profile", () => {
  const selected = {
    id: "fc-matek-f405-wmn",
    name: "Matek F405-WMN",
    processor: "STM32F405RGT6",
    imu: "ICM42688-P",
    firmware: ["INAV", "ArduPilot"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "inav",
    profileId: "matek-f405-wmn",
    airframe: "elevonwing",
  });
  expect(profile).toMatchObject({
    label: "Matek F405-WMN",
    board: "MATEKF405TE",
    receiverUart: "UART2",
    receiverBaud: 420000,
    sbusNeedsInverter: false,
    gpsUart: "UART4",
    sharedPwmOutputs: 12,
    outputs: { motors: 12, servos: 12 },
  });
  expect(profile.serialPorts.map((port) => port.id)).toEqual([
    "UART1",
    "UART2",
    "UART3",
    "UART4",
    "UART5",
  ]);
  expect(profile.notes.join(" ")).toMatch(/shared between motors and servos/i);

  const arduPilotProfile = getBoardProfile("matek-f405-wmn-ardupilot");
  expect(arduPilotProfile).toMatchObject({
    family: "ardupilot",
    board: "MATEKF405TE",
    receiverUart: "UART2",
    gpsUart: "UART5",
    sharedPwmOutputs: 12,
  });
  expect(arduPilotProfile.notes.join(" ")).toMatch(/SERIAL3\/UART5 GPS1/i);
});

test("Kakute H7 V2 selects its documented Betaflight mapping", () => {
  const selected = {
    id: "fc-holybro-kakute-h7-v2",
    name: "Holybro Kakute H7 V2",
    processor: "STM32H743",
    imu: "BMI270",
    firmware: ["Betaflight", "INAV"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "kakute-h7-v2",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "Holybro Kakute H7 V2",
    board: "KAKUTEH7V2",
    receiverUart: "UART6",
    receiverBaud: 420000,
    sbusNeedsInverter: false,
    gpsUart: "UART4",
    outputs: { motors: 8, servos: 0 },
    flightLog: { label: "128 MB onboard blackbox" },
  });
  expect(profile.serialPorts.map((port) => port.id)).toEqual([
    "UART1",
    "UART2",
    "UART3",
    "UART4",
    "UART6",
    "UART7",
  ]);
  expect(profile.notes.join(" ")).toMatch(/no internal current sensor/i);
});

test("Kakute F7 AIO selects its documented Betaflight mapping", () => {
  const selected = {
    id: "fc-holybro-kakute-f7",
    name: "Kakute F7 AIO",
    processor: "STM32F745",
    imu: "ICM20689 or MPU6000",
    firmware: ["Betaflight", "ArduPilot"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "kakute-f7-aio",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "Holybro Kakute F7 AIO",
    board: "KAKUTEF7",
    receiverUart: "UART6",
    gpsUart: "UART3",
    sbusNeedsInverter: false,
    outputs: { motors: 6, servos: 6 },
    sharedPwmOutputs: 6,
  });
  expect(profile.notes.join(" ")).toMatch(/BRD_ALT_CONFIG=1/i);
});

test("MAMBA F722 MK2 exposes its target map without invented defaults", () => {
  const selected = {
    id: "fc-mamba-f722",
    name: "MAMBA F722 MK2",
    processor: "STM32F722",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "mamba-f722-mk2",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "MAMBA F722 MK2",
    board: "MAMBAF722_I2C",
    receiverUart: "UART5",
    receiverUartLocked: false,
    gpsUart: "UART6",
    outputs: { motors: 4, servos: 0 },
    flightLog: { label: "16 MB onboard blackbox" },
  });
  expect(profile.notes.join(" ")).toMatch(/does not compile a default serial receiver/i);
  expect(validateFlightControllerConfig(config, profile))
    .not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "receiver-uart-role" }),
      expect.objectContaining({ code: "receiver-uart-pins-unmapped" }),
    ]));
});

test("Borg 5S RX exposes its built-in receiver and spare serial map", () => {
  const selected = {
    id: "fc-iflight-borg-5s-rx",
    name: "iFlight Borg 5S RX",
    processor: "AT32F435RGT7",
    imu: "ICM42688",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "iflight-borg-5s-rx",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "iFlight Borg 5S RX",
    board: "IFLIGHT_BLITZ_ATF435",
    receiverUart: "UART4",
    receiverUartLocked: false,
    gpsUart: "UART5",
    outputs: { motors: 4, servos: 0 },
    featureSupport: { barometer: false, gps: true },
    flightLog: { label: "16 MB onboard blackbox" },
  });
  expect(profile.notes.join(" ")).toMatch(/external receiver/i);
});

test("SpeedyBee F405 Mini selects its documented Betaflight target", () => {
  const selected = {
    id: "fc-speedybee-f405-mini",
    name: "SpeedyBee F405 Mini",
    processor: "STM32F405",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "speedybee-f405-mini",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "SpeedyBee F405 Mini",
    board: "SPEEDYBEEF405MINI",
    receiverUart: "UART2",
    gpsUart: "UART6",
    sbusNeedsInverter: true,
    outputs: { motors: 4, servos: 0 },
    flightLog: { label: "8 MB onboard blackbox" },
  });
  expect(profile.notes.join(" ")).toMatch(/SERIALRX_UART to USART2/i);
});

test("SpeedyBee F405 V3 selects its documented Betaflight target", () => {
  const selected = {
    id: "fc-speedybee-f405-v3",
    name: "SpeedyBee F405 V3",
    processor: "STM32F405",
    imu: "BMI270",
    firmware: ["Betaflight", "INAV"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "speedybee-f405-v3",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "SpeedyBee F405 V3",
    board: "SPEEDYBEEF405V3",
    receiverUart: "UART2",
    gpsUart: "UART6",
    sbusNeedsInverter: true,
    outputs: { motors: 8, servos: 1 },
    flightLog: { label: "MicroSD blackbox · 4 GB recognized" },
  });
  expect(profile.notes.join(" ")).toMatch(/4 GB on this board/i);
});

test("SpeedyBee F405 V4 selects its documented Betaflight target", () => {
  const selected = {
    id: "fc-speedybee-f405-v4",
    name: "SpeedyBee F405 V4",
    processor: "STM32F405",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(config).toMatchObject({
    firmwareFamily: "betaflight",
    profileId: "speedybee-f405-v4",
    airframe: "quadx",
  });
  expect(profile).toMatchObject({
    label: "SpeedyBee F405 V4",
    board: "SPEEDYBEEF405V4",
    receiverUart: "UART2",
    gpsUart: "UART6",
    sbusNeedsInverter: true,
    outputs: { motors: 8, servos: 1 },
    flightLog: { label: "MicroSD blackbox · card required" },
  });
  expect(profile.notes.join(" ")).toMatch(/SDXC is not supported/i);
});

test("serial allocation summaries mark receiver and GPS routes", () => {
  const selected = {
    id: "fc-speedybee-f405-v4",
    name: "SpeedyBee F405 V4",
    processor: "STM32F405",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);
  const summary = buildSerialAllocationSummary(config, profile);

  expect(summary).toContain("UART4 Bluetooth tuning");
  expect(summary).toContain("UART2 Receiver (Receiver)");
  expect(summary).toContain("UART5 ESC telemetry");
  expect(summary).toContain("UART6 GPS (GPS)");
  expect(buildFlightControllerSummary(config, profile).join("\n"))
    .toContain(summary);
});

test.each(FC_BOARD_PROFILES)(
  "$label serial map includes its documented receiver and GPS routes",
  (profile) => {
    const mappedPorts = profile.serialPorts.map((port) => port.id);

    expect(mappedPorts).toContain(profile.receiverUart);
    if (profile.gpsUart) {
      expect(mappedPorts).toContain(profile.gpsUart);
    }
  },
);

test("warns before a receiver reassigns a documented peripheral UART", () => {
  const selected = {
    id: "fc-speedybee-f405-v5",
    name: "SpeedyBee F405 V5",
    processor: "STM32F405",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  };
  const config = createDefaultFlightControllerConfig(selected);
  const profile = getBoardProfile(config.profileId, selected);

  expect(validateFlightControllerConfig({
    ...config,
    receiverUart: "UART3",
  }, profile)).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "receiver-uart-role",
      severity: "warning",
      message: expect.stringMatching(/UART3.*DJI VTX/i),
    }),
  ]));

  expect(validateFlightControllerConfig({
    ...config,
    receiverUart: "UART7",
  }, profile)).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "receiver-uart-unmapped",
      severity: "warning",
    }),
  ]));

  expect(validateFlightControllerConfig({
    ...config,
    receiverUart: "UART6",
  }, profile)).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "receiver-uart-pins-unmapped",
      severity: "warning",
      message: expect.stringMatching(/UART6.*pad mapping is not bundled/i),
    }),
  ]));
});

test("Betaflight Stage 2 landing throttle is validated and summarized honestly", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    firmwareFamily: "betaflight",
    failsafeThrottle: 1200,
  };
  const profile = getBoardProfile(config.profileId);
  const summary = buildFlightControllerSummary(config, profile).join("\n");

  expect(summary).toContain(
    "Betaflight Stage 2 landing throttle: 1200 PWM (used only in Landing Mode; confirm the board's Stage 2 procedure)",
  );
  expect(validateFlightControllerConfig(config, profile))
    .not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "failsafe-throttle-range" }),
    ]));
  expect(validateFlightControllerConfig({
    ...config,
    failsafeThrottle: 999,
  }, profile)).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "failsafe-throttle-range",
      severity: "error",
    }),
  ]));
});

test("Aerial Kit hand-launch planning is wing-only and range-checked", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    airframe: "elevonwing",
    launchChannel: 8,
    launchThrottle: 0.7,
    launchClimbDeg: 18,
    launchTimeoutS: 5,
  };
  const profile = getBoardProfile(config.profileId);
  const summary = buildFlightControllerSummary(config, profile).join("\n");

  expect(supportsAerialKitLaunch("elevonwing")).toBe(true);
  expect(supportsAerialKitLaunch("quadx")).toBe(false);
  expect(summary).toContain(
    "Launch: switch CH8, throttle 70%, climb 18°, timeout 5 s",
  );
  expect(validateFlightControllerConfig(config, profile))
    .not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "launch-airframe-mismatch" }),
    ]));
  expect(validateFlightControllerConfig({
    ...config,
    airframe: "quadx",
    launchThrottle: 1.1,
    launchClimbDeg: 46,
    launchTimeoutS: 61,
  }, profile)).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "launch-airframe-mismatch", severity: "error" }),
    expect.objectContaining({ code: "launch-throttle-range", severity: "error" }),
    expect.objectContaining({ code: "launch-climb-range", severity: "error" }),
    expect.objectContaining({ code: "launch-timeout-range", severity: "error" }),
  ]));
});

test("INAV does not inherit Betaflight channel presets", () => {
  const config = createDefaultFlightControllerConfig({
    id: "fc-inav",
    name: "INAV board",
    firmware: ["INAV"],
  });
  expect(config.firmwareFamily).toBe("inav");
  expect(config.armChannel).toBeNull();
  expect(config.modeChannel).toBeNull();
  expect(getChannelPreset(config)).toBeNull();
  expect(validateFlightControllerConfig(config, getBoardProfile(config.profileId)))
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "arm-channel-unset", severity: "error" }),
    ]));
});

test("the first listed firmware is used for multi-firmware boards", () => {
  const config = createDefaultFlightControllerConfig({
    id: "fc-multi",
    name: "Multi-firmware board",
    firmware: ["Betaflight", "ArduPilot"],
  });
  expect(config.firmwareFamily).toBe("betaflight");
});

test("custom profile uses selected controller hardware fields", () => {
  const profile = getBoardProfile("custom-board", {
    name: "Kakute F7 AIO",
    processor: "STM32F722",
    imu: "MPU6000",
  });
  expect(profile.processor).toBe("STM32F722");
  expect(profile.imu).toBe("MPU6000");
});

test("duplicate arm, mode, and beeper channels are rejected", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    armChannel: 5,
    modeChannel: 5,
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile(config.profileId));
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "channel-conflict", severity: "error" }),
  ]));
});

test("receiver calibration enforces Aerial Kit ranges and ordering", () => {
  const base = createDefaultFlightControllerConfig();
  const profile = getBoardProfile(base.profileId);
  const outOfOrder = {
    ...base,
    rcMin: 1100,
    rcMid: 900,
    rcMax: 1811,
  };
  expect(validateFlightControllerConfig(outOfOrder, profile)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "rc-min-range", severity: "error" }),
      expect.objectContaining({ code: "rc-calibration-order", severity: "error" }),
    ]),
  );

  const invalidDeadband = {
    ...base,
    rcDeadband: 0.3,
  };
  expect(validateFlightControllerConfig(invalidDeadband, profile)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "rc-deadband-range", severity: "error" }),
    ]),
  );
});

test("arm is required and Aerial Kit control roles stay in channels 5 through 8", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    armChannel: null,
    manualChannel: 9,
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile(config.profileId));
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "arm-channel-unset", severity: "error" }),
    expect.objectContaining({ code: "channel-range", severity: "error" }),
  ]));
});

test("Aerial Kit rejects roles its firmware does not register", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    beeperChannel: 7,
    manualChannel: 8,
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile(config.profileId));
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "unsupported-control-role",
      severity: "error",
      message: expect.stringMatching(/only arm, flight mode, velocity mode/i),
    }),
  ]));
});

test("numeric safety limits reject missing and non-numeric imported values", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    armHoldMs: "not-a-number",
    armMaxTiltDeg: null,
    throttleLow: "",
    rcTimeoutMs: undefined,
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile(config.profileId));
  expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "arm-hold-range",
    "arm-tilt-range",
    "throttle-low-range",
    "rc-timeout-range",
  ]));
});

test("workspace-only profiles are disclosed and GHF435 defaults to its two-motor wing", () => {
  const profile = getBoardProfile("ghf435-aio-v2");
  expect(profile.defaultAirframe).toBe("elevonwing");
  const config = createDefaultFlightControllerConfig();
  const issues = validateFlightControllerConfig(
    {
      ...config,
      profileId: "ghf435-aio-v2",
      airframe: profile.defaultAirframe,
    },
    profile,
  );
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "workspace-profile", severity: "warning" }),
  ]));
  expect(issues).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "output-count" }),
    expect.objectContaining({ code: "servo-count" }),
  ]));
});

test("return-to-home requires GPS support", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    rthEnabled: true,
    features: {
      ...createDefaultFlightControllerConfig().features,
      gps: false,
    },
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile(config.profileId));
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "rth-without-gps", severity: "error" }),
  ]));
});

test("arming preview separates mapped plan checks from unobserved firmware gates", () => {
  const profile = getBoardProfile("esp32dev");
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "esp32dev",
    airframe: "quadx",
    receiverUart: "UART2",
    receiverBaud: 420000,
    armChannel: 5,
    modeChannel: 6,
  };
  const preview = buildArmingGatePreview(
    config,
    profile,
    validateFlightControllerConfig(config, profile),
  );

  expect(preview.available).toBe(true);
  expect(preview.planChecks).toHaveLength(3);
  expect(preview.planChecks.every((check) => check.status === "pass")).toBe(true);
  expect(preview.liveGates).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "outputs", status: "unobserved" }),
    expect.objectContaining({ id: "imu", reason: "AK_ARM_NO_IMU", status: "unobserved" }),
    expect.objectContaining({ id: "receiver-link", status: "unobserved" }),
    expect.objectContaining({ id: "not-requested", status: "unobserved" }),
    expect.objectContaining({ id: "switch-held", status: "unobserved" }),
    expect.objectContaining({ id: "throttle", status: "unobserved" }),
    expect.objectContaining({ id: "attitude-converged", status: "unobserved" }),
    expect.objectContaining({ id: "level", status: "unobserved" }),
  ]));
  expect(preview.liveGates).toHaveLength(9);
  expect(preview.liveGates).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ reason: "AK_ARM_CONTROLLER" }),
  ]));
  expect(preview.liveGates.every((gate) => gate.status === "unobserved")).toBe(true);
});

test("arming preview reports a real output-mix blocker", () => {
  const profile = getBoardProfile("feather-f405");
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "feather-f405",
    airframe: "quadx",
    receiverUart: "USART3",
    receiverBaud: 420000,
  };
  const preview = buildArmingGatePreview(
    config,
    profile,
    validateFlightControllerConfig(config, profile),
  );

  expect(preview.planChecks).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "outputs", status: "blocked" }),
  ]));
  expect(preview.planBlockerCount).toBe(1);
});

test("arming preview blocks an invalid servo output plan", () => {
  const profile = getBoardProfile("esp32dev");
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "esp32dev",
    airframe: "elevonwing",
    receiverUart: "UART2",
    receiverBaud: 420000,
    armChannel: 5,
    modeChannel: 6,
    servo1TravelUs: 99,
  };
  const preview = buildArmingGatePreview(
    config,
    profile,
    validateFlightControllerConfig(config, profile),
  );

  expect(preview.planChecks).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: "outputs",
      status: "blocked",
      detail: expect.stringMatching(/Servo 1 travel/i),
    }),
  ]));
  expect(preview.planBlockerCount).toBe(1);
});

test("arming preview marks a custom receiver route unverified", () => {
  const profile = getBoardProfile("custom-board");
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: "custom-board",
  };
  const preview = buildArmingGatePreview(
    config,
    profile,
    validateFlightControllerConfig(config, profile),
  );

  expect(preview.planChecks).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "receiver-transport", status: "unverified" }),
  ]));
  expect(preview.reviewCount).toBe(1);
});

test("arming preview is limited to Aerial Kit firmware states", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    firmwareFamily: "betaflight",
  };
  expect(buildArmingGatePreview(config, getBoardProfile("custom-board"), [])).toEqual(
    expect.objectContaining({ available: false, planChecks: [], liveGates: [] }),
  );
});

test("build frame motor count must match the planned airframe", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    airframe: "elevonwingsingle",
  };
  const issues = validateFlightControllerConfig(
    config,
    getBoardProfile(config.profileId),
    { buildMotorCount: 4 },
  );
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "build-airframe-mismatch",
      severity: "error",
      message: expect.stringMatching(/frame has 4 motor mounts.*uses 1/i),
    }),
  ]));
});

test("u32 safety timing and receiver baud require whole numbers", () => {
  const config = {
    ...createDefaultFlightControllerConfig(),
    receiverBaud: 420000.5,
    armHoldMs: 500.5,
    rcTimeoutMs: 250.25,
  };
  const issues = validateFlightControllerConfig(config, getBoardProfile(config.profileId));
  expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "receiver-baud",
    "arm-hold-range",
    "rc-timeout-range",
  ]));
});

test("workspace Aerial Kit profiles expose manual, control, and system-ID roles", () => {
  const profile = getBoardProfile("weact-f405");
  const config = {
    ...createDefaultFlightControllerConfig(),
    profileId: profile.id,
    airframe: profile.defaultAirframe,
  };
  expect(profile.notes.join(" ")).toMatch(/remains disarmed and refuses to arm/i);
  expect(buildFlightControllerSummary(config, profile).join("\n"))
    .toContain("Aerial Kit control roles: arm, flight mode, mission, launch, manual, control, system ID only");
  expect(validateFlightControllerConfig({
    ...config,
    manualChannel: 7,
    ctrlChannel: 8,
    sysidChannel: null,
  }, profile)).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "unsupported-control-role" }),
  ]));
});
