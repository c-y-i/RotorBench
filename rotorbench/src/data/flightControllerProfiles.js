export const FIRMWARE_FAMILIES = [
  {
    id: "aerialkit",
    label: "Aerial Kit Firmware",
    transport: "Native configuration protocol",
    hardwarePlan: true,
  },
  {
    id: "betaflight",
    label: "Betaflight",
    transport: "MSP",
    hardwarePlan: false,
  },
  {
    id: "inav",
    label: "INAV",
    transport: "MSP and MAVLink telemetry",
    hardwarePlan: false,
  },
  {
    id: "ardupilot",
    label: "ArduPilot",
    transport: "MAVLink",
    hardwarePlan: false,
  },
  {
    id: "px4",
    label: "PX4",
    transport: "MAVLink",
    hardwarePlan: false,
  },
];

export const FC_BOARD_PROFILES = [
  {
    id: "feather-f405",
    family: "aerialkit",
    availability: "public",
    buildScope: "public",
    label: "Adafruit Feather F405",
    board: "FEATHER_F405",
    processor: "STM32F405RGT6",
    imu: "LSM6DSO or BNO055",
    imuBus: "I2C1, 400 kHz",
    receiverUart: "USART3",
    receiverPins: "PB10 / PB11",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: null,
    outputs: { motors: 2, servos: 2 },
    defaultAirframe: "elevonwingsingle",
    receiverUartLocked: true,
    flightLog: {
      available: true,
      label: "Internal flash log + retained RAM",
      retention: "The flash log survives power loss.",
    },
    featureSupport: {
      telemetry: true,
      osd: false,
      blackbox: false,
      gps: false,
      barometer: false,
      rangefinder: false,
    },
    sourceRefs: [
      "aerial-kit/firmware/src/boards/FEATHER_F405/board.h",
      "aerial-kit/docs/flight-controller-firmware.md",
    ],
    notes: [
      "Only two motor pads reach the header.",
      "CRSF telemetry shares the receiver UART; SBUS has no return path.",
      "SBUS requires an external inverter on PB11.",
      "No GPS UART remains on this breakout.",
      "No barometer or rangefinder is fitted by the documented board build.",
    ],
  },
  {
    id: "esp32dev",
    family: "aerialkit",
    availability: "public",
    buildScope: "public",
    label: "ESP32 Devkit",
    board: "ESP32DEV",
    processor: "ESP32",
    imu: "Optional SPI IMU",
    imuBus: "SPI2",
    receiverUart: "UART2",
    receiverPins: "GPIO17 TX / GPIO16 RX",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: false,
    gpsUart: "UART1",
    gpsPins: "GPIO13 TX / GPIO4 RX",
    outputs: { motors: 4, servos: 2 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    flightLog: {
      available: true,
      label: "ESP32 aerialkit partition + retained RAM",
      retention: "The partition log survives power loss.",
    },
    featureSupport: {
      telemetry: true,
      osd: false,
      blackbox: false,
      gps: true,
      barometer: false,
      rangefinder: false,
    },
    sourceRefs: [
      "aerial-kit/firmware/src/boards/ESP32DEV/board.h",
      "aerial-kit/docs/flight-controller-firmware.md",
    ],
    notes: [
      "A bare devkit has no fitted IMU, receiver, or GPS.",
      "SBUS inversion is handled by the ESP32 GPIO matrix.",
      "Motor and servo pins are documented defaults, not a commercial flight-controller pinout.",
      "No barometer or rangefinder is fitted by the documented devkit build.",
    ],
  },
  {
    id: "weact-f405",
    family: "aerialkit",
    availability: "workspace",
    buildScope: "workspace",
    label: "WeAct STM32F405RGT6",
    board: "AERIALKIT_F405",
    processor: "STM32F405RGT6",
    imu: "SPI port ready; no IMU fitted on the documented bench unit",
    imuBus: "SPI2 / PB13-PB15, CS PB12",
    receiverUart: "USART1",
    receiverPins: "PA9 TX / PA10 RX",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "USART3",
    gpsPins: "PB10 TX / PB11 RX",
    outputs: { motors: 4, servos: 2 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    flightLog: {
      available: true,
      label: "Internal flash log + retained RAM",
      retention: "The flash log survives power loss.",
    },
    featureSupport: {
      telemetry: true,
      osd: false,
      blackbox: false,
      gps: true,
      barometer: false,
      rangefinder: false,
    },
    sourceRefs: ["fc-firmware-workspace/aerialkit/src/boards/AERIALKIT_F405/board.h"],
    notes: [
      "The documented bench unit has no IMU fitted. The firmware remains disarmed and refuses to arm.",
      "SBUS requires an external inverter on the receiver input.",
      "USART2 is reserved for the firmware console.",
    ],
  },
  {
    id: "ghf435-aio-v2",
    family: "aerialkit",
    availability: "workspace",
    buildScope: "workspace",
    label: "JHEMCU GHF435 AIO V2",
    board: "AERIALKIT_GHF435",
    processor: "AT32F435RG",
    imu: "ICM-42688P",
    imuBus: "SPI1 / PA4-PA7",
    receiverUart: "USART2",
    receiverPins: "PA8 TX / PB0 RX, onboard ELRS",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "USART3",
    gpsPins: "PB11 TX / PB10 RX with peripheral swap",
    outputs: { motors: 2, servos: 2 },
    defaultAirframe: "elevonwing",
    receiverUartLocked: true,
    flightLog: {
      available: true,
      label: "Internal flash log + retained RAM",
      retention: "The flash log survives power loss.",
    },
    featureSupport: {
      telemetry: true,
      osd: false,
      blackbox: false,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: ["fc-firmware-workspace/aerialkit/src/boards/AERIALKIT_GHF435/board.h"],
    notes: [
      "The receiver UART was verified live; GPS pin direction is documented, with continuity still to confirm.",
      "IMU orientation still needs to be measured on the aircraft.",
      "The documented board exposes two motor and two servo outputs and defaults to the twin-motor elevon wing.",
      "The reference target has no rangefinder fitted.",
      "This profile comes from the workspace tree, not the supported public Aerial Kit build.",
    ],
  },
];

export const CUSTOM_BOARD_PROFILE = {
  id: "custom-board",
  family: null,
  availability: "custom",
  buildScope: "planning",
  label: "Custom board",
  board: "Custom",
  processor: "Unknown",
  imu: "Unknown",
  imuBus: "Not mapped",
  receiverUart: "UART1",
  receiverPins: "Not mapped",
  receiverBaud: 420000,
  sbusBaud: 100000,
  sbusNeedsInverter: true,
  gpsUart: null,
  outputs: { motors: 4, servos: 2 },
  defaultAirframe: "quadx",
  receiverUartLocked: false,
  flightLog: null,
  featureSupport: {
    telemetry: true,
    osd: true,
    blackbox: true,
    gps: true,
    barometer: true,
    rangefinder: true,
  },
  sourceRefs: [],
  notes: [
    "Pin and peripheral assignments must be verified against the selected flight-controller board.",
    "This page creates a configuration plan. It does not program the board.",
  ],
};

export const AIRFRAMES = [
  { value: "quadx", label: "Quad X", motors: 4, servos: 0 },
  { value: "quadx1234", label: "Quad X, motors 1-4 front-left first", motors: 4, servos: 0 },
  { value: "quadp", label: "Quad Plus", motors: 4, servos: 0 },
  { value: "y4", label: "Y4", motors: 4, servos: 1 },
  { value: "vtail4", label: "V-tail quad", motors: 4, servos: 0 },
  { value: "tri", label: "Tri-copter", motors: 3, servos: 1 },
  { value: "elevonwing", label: "Twin-motor elevon wing", motors: 2, servos: 2 },
  { value: "elevonwingsingle", label: "Single-motor elevon wing", motors: 1, servos: 2 },
];

const AIRFRAME_LAYOUT_SOURCES = Object.freeze([
  "aerial-kit/firmware/src/core/flight/ak_mixer.c",
  "aerial-kit/apps/configurator/src/ui/views/airframes.ts",
]);

export const AIRFRAME_MOTOR_LAYOUTS = Object.freeze({
  quadx: Object.freeze({
    shape: "rotor",
    servos: 0,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "RR", x: 0.75, z: 0.75, spin: "CW" },
      { output: 2, label: "FR", x: 0.75, z: -0.75, spin: "CCW" },
      { output: 3, label: "RL", x: -0.75, z: 0.75, spin: "CCW" },
      { output: 4, label: "FL", x: -0.75, z: -0.75, spin: "CW" },
    ]),
  }),
  quadx1234: Object.freeze({
    shape: "rotor",
    servos: 0,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "FL", x: -0.75, z: -0.75, spin: "CCW" },
      { output: 2, label: "FR", x: 0.75, z: -0.75, spin: "CW" },
      { output: 3, label: "RR", x: 0.75, z: 0.75, spin: "CCW" },
      { output: 4, label: "RL", x: -0.75, z: 0.75, spin: "CW" },
    ]),
  }),
  quadp: Object.freeze({
    shape: "rotor",
    servos: 0,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "Rear", x: 0, z: 0.9, spin: "CW" },
      { output: 2, label: "Right", x: 0.9, z: 0, spin: "CCW" },
      { output: 3, label: "Left", x: -0.9, z: 0, spin: "CCW" },
      { output: 4, label: "Front", x: 0, z: -0.9, spin: "CW" },
    ]),
  }),
  y4: Object.freeze({
    shape: "rotor",
    servos: 1,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "Rear top", x: 0, z: 0.95, spin: "CW" },
      { output: 2, label: "Front right", x: 0.75, z: -0.52, spin: "CCW" },
      { output: 3, label: "Rear bottom", x: 0, z: 0.95, spin: "CCW" },
      { output: 4, label: "Front left", x: -0.75, z: -0.52, spin: "CW" },
    ]),
  }),
  vtail4: Object.freeze({
    shape: "rotor",
    servos: 0,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "RR", x: 0.75, z: 0.75, spin: "CW" },
      { output: 2, label: "FR", x: 0.75, z: -0.75, spin: "CCW" },
      { output: 3, label: "RL", x: -0.75, z: 0.75, spin: "CCW" },
      { output: 4, label: "FL", x: -0.75, z: -0.75, spin: "CW" },
    ]),
  }),
  tri: Object.freeze({
    shape: "rotor",
    servos: 1,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "Rear", x: 0, z: 0.95, spin: "CCW" },
      { output: 2, label: "Right", x: 0.75, z: -0.52, spin: "CW" },
      { output: 3, label: "Left", x: -0.75, z: -0.52, spin: "CCW" },
    ]),
  }),
  elevonwing: Object.freeze({
    shape: "wing",
    servos: 2,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "Left pusher", x: -0.55, z: 0.5, spin: "CCW" },
      { output: 2, label: "Right pusher", x: 0.55, z: 0.5, spin: "CW" },
    ]),
  }),
  elevonwingsingle: Object.freeze({
    shape: "wing",
    servos: 2,
    sourceRefs: AIRFRAME_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "Centre pusher", x: 0, z: 0.5, spin: "CCW" },
    ]),
  }),
});

export function getAirframeMotorLayout(airframe) {
  return AIRFRAME_MOTOR_LAYOUTS[airframe] || null;
}

export const RECEIVER_PROTOCOLS = [
  {
    value: "crsf",
    label: "CRSF / ExpressLRS",
    baud: 420000,
    frame: "8N1",
    telemetry: true,
  },
  {
    value: "sbus",
    label: "SBUS",
    baud: 100000,
    frame: "8E2",
    telemetry: false,
  },
];

export const FAILSAFE_ACTIONS = [
  { value: "firmware-derived", label: "Firmware-derived", description: "Stop a quad, descend a fixed wing, or return only when the firmware and GPS path support it." },
  { value: "return", label: "Return home when supported", description: "Use return behaviour only with a valid position estimate and RTH enabled." },
];

export const CHANNEL_PRESETS = [
  {
    id: "aerialkit-firmware",
    label: "Aerial Kit firmware default",
    modeChannel: 5,
    armChannel: 6,
    beeperChannel: null,
  },
  {
    id: "aerialkit-elrs",
    label: "Aerial Kit + ExpressLRS recommended",
    modeChannel: 6,
    armChannel: 5,
    beeperChannel: null,
  },
  {
    id: "betaflight-bench",
    label: "Betaflight bench mapping",
    modeChannel: null,
    armChannel: 5,
    beeperChannel: 9,
  },
];

export const FC_FEATURES = [
  { id: "telemetry", label: "Receiver telemetry" },
  { id: "osd", label: "On-screen display" },
  { id: "blackbox", label: "Blackbox logging" },
  { id: "gps", label: "GPS navigation" },
  { id: "barometer", label: "Barometer altitude" },
  { id: "rangefinder", label: "Rangefinder" },
];

export const DEFAULT_CHANNELS = [
  { id: "throttle", label: "Throttle", channel: 3, mode: "AETR" },
  { id: "roll", label: "Roll", channel: 1, mode: "AETR" },
  { id: "pitch", label: "Pitch", channel: 2, mode: "AETR" },
  { id: "yaw", label: "Yaw", channel: 4, mode: "AETR" },
  { id: "mode", label: "Flight mode", channel: 5, mode: "Angle when high" },
  { id: "arm", label: "Arm", channel: 6, mode: "Hold to arm" },
  { id: "velocity", label: "Velocity mode", channel: null, mode: "Optional; 0 disables" },
  { id: "beeper", label: "Beeper", channel: 9, mode: "Verified bench mapping" },
];

export const AERIALKIT_PUBLIC_CONTROL_ROLES = Object.freeze([
  { key: "arm", label: "arm" },
  { key: "flightMode", label: "flight mode" },
  { key: "velocity", label: "velocity mode" },
]);

export const AERIALKIT_WORKSPACE_CONTROL_ROLES = Object.freeze([
  { key: "arm", label: "arm" },
  { key: "flightMode", label: "flight mode" },
  { key: "manual", label: "manual" },
  { key: "control", label: "control" },
  { key: "systemId", label: "system ID" },
]);

export function getAerialKitControlRoles(profile = CUSTOM_BOARD_PROFILE) {
  return profile?.buildScope === "workspace"
    ? AERIALKIT_WORKSPACE_CONTROL_ROLES
    : AERIALKIT_PUBLIC_CONTROL_ROLES;
}

export function getBoardProfile(profileId, selectedFlightController = null) {
  const documented = FC_BOARD_PROFILES.find((profile) => profile.id === profileId);
  if (documented) return documented;
  if (!selectedFlightController) return CUSTOM_BOARD_PROFILE;
  return {
    ...CUSTOM_BOARD_PROFILE,
    label: selectedFlightController.name || CUSTOM_BOARD_PROFILE.label,
    board: selectedFlightController.name || CUSTOM_BOARD_PROFILE.board,
    processor: selectedFlightController.processor || CUSTOM_BOARD_PROFILE.processor,
    imu: selectedFlightController.imu || CUSTOM_BOARD_PROFILE.imu,
  };
}

export function createDefaultFlightControllerConfig(
  selectedFlightController = null,
  selectedReceiver = null,
) {
  const firmwareNames = (selectedFlightController?.firmware || []).map((name) => name.toLowerCase());
  const familyForName = (name) => {
    if (name.includes("betaflight")) return "betaflight";
    if (name.includes("inav")) return "inav";
    if (name.includes("ardupilot")) return "ardupilot";
    if (name.includes("px4")) return "px4";
    return null;
  };
  const inferredFamily = firmwareNames.map(familyForName).find(Boolean) || "aerialkit";
  const catalogProfile = selectedFlightController
    ? {
        ...CUSTOM_BOARD_PROFILE,
        label: selectedFlightController.name || CUSTOM_BOARD_PROFILE.label,
        board: selectedFlightController.name || CUSTOM_BOARD_PROFILE.board,
        processor: selectedFlightController.processor || CUSTOM_BOARD_PROFILE.processor,
        imu: selectedFlightController.imu || CUSTOM_BOARD_PROFILE.imu,
      }
    : CUSTOM_BOARD_PROFILE;

  const receiverProtocol = selectedReceiver?.protocol?.toLowerCase().includes("sbus")
    ? "sbus"
    : "crsf";
  const betaflightLike = inferredFamily === "betaflight";
  const expressLrsReceiver = [
    selectedReceiver?.name,
    selectedReceiver?.protocol,
  ].some((value) => /elrs|expresslrs|crsf/i.test(String(value || "")));
  const channelPreset = CHANNEL_PRESETS.find(
    (preset) =>
      preset.id === (
        betaflightLike
          ? "betaflight-bench"
          : inferredFamily === "aerialkit" && expressLrsReceiver
            ? "aerialkit-elrs"
            : inferredFamily === "aerialkit"
              ? "aerialkit-firmware"
              : null
      ),
  );

  return {
    planVersion: 3,
    firmwareFamily: inferredFamily,
    profileId: catalogProfile.id,
    selectedFlightControllerId: selectedFlightController?.id || null,
    selectedReceiverId: selectedReceiver?.id || null,
    airframe: catalogProfile.defaultAirframe,
    receiverProtocol,
    receiverUart: catalogProfile.receiverUart,
    receiverBaud: receiverProtocol === "sbus"
      ? catalogProfile.sbusBaud
      : catalogProfile.receiverBaud,
    rcMin: 172,
    rcMid: 992,
    rcMax: 1811,
    rcDeadband: 0.02,
    dshotKhz: 300,
    failsafeAction: "firmware-derived",
    armChannel: channelPreset?.armChannel ?? null,
    modeChannel: channelPreset?.modeChannel ?? null,
    beeperChannel: channelPreset?.beeperChannel ?? null,
    velocityChannel: null,
    manualChannel: null,
    ctrlChannel: null,
    sysidChannel: null,
    armHoldMs: 500,
    armMaxTiltDeg: 25,
    throttleLow: 0.05,
    rcTimeoutMs: 250,
    rthEnabled: false,
    features: {
      telemetry: receiverProtocol !== "sbus",
      osd: inferredFamily !== "aerialkit" && Boolean(catalogProfile.featureSupport?.osd),
      blackbox: inferredFamily !== "aerialkit" && Boolean(catalogProfile.featureSupport?.blackbox),
      gps: Boolean(catalogProfile.featureSupport?.gps) && Boolean(catalogProfile.gpsUart),
      barometer: Boolean(catalogProfile.featureSupport?.barometer),
      rangefinder: Boolean(catalogProfile.featureSupport?.rangefinder),
    },
  };
}

export function getChannelPreset(config) {
  return CHANNEL_PRESETS.find(
    (preset) =>
      preset.armChannel === config.armChannel &&
      preset.modeChannel === config.modeChannel &&
      preset.beeperChannel === (config.beeperChannel ?? null),
  ) || null;
}

export function validateFlightControllerConfig(
  config,
  profile = getBoardProfile(config.profileId),
  { buildMotorCount = null } = {},
) {
  const issues = [];
  const airframe = AIRFRAMES.find((item) => item.value === config.airframe);
  const protocol = RECEIVER_PROTOCOLS.find((item) => item.value === config.receiverProtocol);
  const finite = (value) => (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
  const integer = (value) => finite(value) && Number.isInteger(Number(value));

  if (profile.id === "custom-board") {
    issues.push({
      severity: "warning",
      code: "custom-board-unverified",
      message: "Custom-board pin mapping, UART ownership, and output electrical limits remain unverified.",
    });
  }

  if (profile.buildScope === "workspace") {
    issues.push({
      severity: "warning",
      code: "workspace-profile",
      message: `${profile.label} is a workspace-source planning profile, not a supported public Aerial Kit build target. Verify the artifact and pin map before hardware use.`,
    });
  }

  if (airframe && profile.outputs.motors < airframe.motors) {
    issues.push({
      severity: "error",
      code: "output-count",
      message: `${airframe.label} needs ${airframe.motors} motor outputs; ${profile.label} exposes ${profile.outputs.motors}.`,
    });
  }

  if (airframe && profile.outputs.servos < airframe.servos) {
    issues.push({
      severity: "error",
      code: "servo-count",
      message: `${airframe.label} needs ${airframe.servos} servo outputs; ${profile.label} exposes ${profile.outputs.servos}.`,
    });
  }

  if (
    airframe &&
    Number.isInteger(buildMotorCount) &&
    buildMotorCount !== airframe.motors
  ) {
    issues.push({
      severity: "error",
      code: "build-airframe-mismatch",
      message: `The selected frame has ${buildMotorCount} motor mount${buildMotorCount === 1 ? "" : "s"}, but the planned ${airframe.label} airframe uses ${airframe.motors}.`,
    });
  }

  if (config.receiverProtocol === "sbus" && profile.sbusNeedsInverter) {
    issues.push({
      severity: "warning",
      code: "sbus-inverter",
      message: "This board needs an external SBUS inverter on the receiver RX pin.",
    });
  }

  if (config.receiverProtocol === "sbus" && config.features?.telemetry) {
    issues.push({
      severity: "warning",
      code: "sbus-no-telemetry",
      message: "SBUS has no return path. Receiver telemetry is unavailable.",
    });
  }

  if (
    protocol &&
    (
      !integer(config.receiverBaud) ||
      Number(config.receiverBaud) !== protocol.baud
    )
  ) {
    issues.push({
      severity: "error",
      code: "receiver-baud",
      message: `${protocol.label} requires ${protocol.baud} baud as a whole integer.`,
    });
  }

  if (config.firmwareFamily === "aerialkit") {
    const rcMin = Number(config.rcMin);
    const rcMid = Number(config.rcMid);
    const rcMax = Number(config.rcMax);
    if (!integer(config.rcMin) || rcMin < 0 || rcMin > 500) {
      issues.push({
        severity: "error",
        code: "rc-min-range",
        message: "Receiver full-low calibration must be a whole number from 0 to 500.",
      });
    }
    if (!integer(config.rcMid) || rcMid < 500 || rcMid > 1500) {
      issues.push({
        severity: "error",
        code: "rc-mid-range",
        message: "Receiver centre calibration must be a whole number from 500 to 1500.",
      });
    }
    if (!integer(config.rcMax) || rcMax < 1200 || rcMax > 2500) {
      issues.push({
        severity: "error",
        code: "rc-max-range",
        message: "Receiver full-high calibration must be a whole number from 1200 to 2500.",
      });
    }
    if (!finite(config.rcDeadband) || Number(config.rcDeadband) < 0 || Number(config.rcDeadband) > 0.2) {
      issues.push({
        severity: "error",
        code: "rc-deadband-range",
        message: "Receiver stick deadband must be between 0 and 0.2.",
      });
    }
    if (!(rcMin < rcMid && rcMid < rcMax)) {
      issues.push({
        severity: "error",
        code: "rc-calibration-order",
        message: "Receiver calibration must satisfy full-low < centre < full-high.",
      });
    }
  }

  if (![150, 300, 600].includes(Number(config.dshotKhz))) {
    issues.push({
      severity: "error",
      code: "dshot-rate",
      message: "DShot rate must be 150, 300, or 600 kHz.",
    });
  }

  if (!integer(config.armHoldMs) || Number(config.armHoldMs) < 0 || Number(config.armHoldMs) > 5000) {
    issues.push({
      severity: "error",
      code: "arm-hold-range",
      message: "Arm hold time must be a whole number from 0 to 5000 milliseconds.",
    });
  }

  if (!finite(config.armMaxTiltDeg) || Number(config.armMaxTiltDeg) < 0 || Number(config.armMaxTiltDeg) > 180) {
    issues.push({
      severity: "error",
      code: "arm-tilt-range",
      message: "Maximum arm tilt must be between 0 and 180 degrees.",
    });
  }

  if (
    config.features?.gps &&
    profile.gpsUart &&
    config.receiverUart === profile.gpsUart
  ) {
    issues.push({
      severity: "error",
      code: "uart-conflict",
      message: `The receiver and GPS both use ${config.receiverUart}. Assign separate UARTs.`,
    });
  }

  if (config.features?.gps && !profile.gpsUart) {
    issues.push({
      severity: "warning",
      code: "no-gps-uart",
      message: "This documented board profile has no spare GPS UART.",
    });
  }

  if (!finite(config.throttleLow) || Number(config.throttleLow) < 0 || Number(config.throttleLow) > 0.5) {
    issues.push({
      severity: "error",
      code: "throttle-low-range",
      message: "Low-throttle arming threshold must be between 0 and 0.5.",
    });
  }

  if (!integer(config.rcTimeoutMs) || Number(config.rcTimeoutMs) < 50 || Number(config.rcTimeoutMs) > 2000) {
    issues.push({
      severity: "error",
      code: "rc-timeout-range",
      message: "Receiver timeout must be a whole number from 50 to 2000 milliseconds.",
    });
  }

  if (config.rthEnabled && (!config.features?.gps || !profile.gpsUart)) {
    issues.push({
      severity: "error",
      code: "rth-without-gps",
      message: "Return-to-home requires a GPS feature and a documented GPS UART.",
    });
  }

  for (const feature of FC_FEATURES) {
    if (config.features?.[feature.id] && profile.featureSupport?.[feature.id] === false) {
      issues.push({
        severity: "error",
        code: `unsupported-${feature.id}`,
        message: `${feature.label} is not exposed by the ${profile.label} profile.`,
      });
    }
  }

  if (!protocol) {
    issues.push({ severity: "error", code: "receiver-protocol", message: "Choose a receiver protocol." });
  }

  const assignedChannels = [
    config.armChannel,
    config.modeChannel,
    config.velocityChannel,
    config.beeperChannel,
    config.manualChannel,
    config.ctrlChannel,
    config.sysidChannel,
  ].filter((channel) => Number.isInteger(channel));

  const switchChannels = [
    ["arm", config.armChannel],
    ["flight mode", config.modeChannel],
    ["velocity mode", config.velocityChannel],
    ["beeper", config.beeperChannel],
    ["manual", config.manualChannel],
    ["control", config.ctrlChannel],
    ["system ID", config.sysidChannel],
  ].filter(([, channel]) => channel != null);
  const minimumChannel = config.firmwareFamily === "aerialkit" ? 5 : 1;
  const maximumChannel = config.firmwareFamily === "aerialkit" ? 8 : 16;
  const invalidSwitch = switchChannels.find(
    ([, channel]) => !Number.isInteger(channel) || channel < minimumChannel || channel > maximumChannel,
  );
  if (invalidSwitch) {
    issues.push({
      severity: "error",
      code: "channel-range",
      message: `${invalidSwitch[0]} channel must be an integer from ${minimumChannel} to ${maximumChannel}.`,
    });
  }

  if (config.firmwareFamily === "aerialkit") {
    const allowedRoles = getAerialKitControlRoles(profile);
    const allowedRoleLabels = new Set(allowedRoles.map((role) => role.label));
    const unsupportedRoles = switchChannels.filter(
      ([role, channel]) =>
        channel != null && !allowedRoleLabels.has(role),
    );
    if (unsupportedRoles.length > 0) {
      issues.push({
        severity: "error",
        code: "unsupported-control-role",
        message: `Aerial Kit on this profile registers only ${allowedRoles.map((role) => role.label).join(", ")}. Remove ${unsupportedRoles.map(([role]) => role).join(", ")}.`,
      });
    }
  }

  if (config.modeChannel == null) {
    issues.push({
      severity: "warning",
      code: "mode-channel-unset",
      message: "Flight-mode channel is unresolved for this firmware configuration.",
    });
  }
  if (config.armChannel == null) {
    issues.push({
      severity: "error",
      code: "arm-channel-unset",
      message: "Arm channel is required before this control map can be reviewed.",
    });
  }
  const duplicateChannels = assignedChannels.filter(
    (channel, index) => assignedChannels.indexOf(channel) !== index,
  );
  if (duplicateChannels.length > 0) {
    issues.push({
      severity: "error",
      code: "channel-conflict",
      message: "Each configured control role must use a separate radio channel.",
    });
  }

  return issues;
}

const AERIALKIT_LIVE_ARM_GATES = [
  {
    id: "outputs",
    label: "Output mix",
    reason: "AK_ARM_OUTPUTS",
    detail: "The board and airframe must expose the required motor and servo outputs.",
  },
  {
    id: "imu",
    label: "IMU sample is usable",
    reason: "AK_ARM_NO_IMU",
    detail: "A missing or stopped IMU is a hardware blocker, not a stick input.",
  },
  {
    id: "receiver-link",
    label: "Receiver has spoken",
    reason: "AK_ARM_NO_LINK",
    detail: "A live receiver frame is required before the arm request is evaluated.",
  },
  {
    id: "failsafe",
    label: "Failsafe latch",
    reason: "AK_ARM_FAILSAFE",
    detail: "A latched failsafe must be cleared by cycling the arm switch.",
  },
  {
    id: "not-requested",
    label: "Arm request",
    reason: "AK_ARM_NOT_REQUESTED",
    detail: "The live arm channel must request arming.",
  },
  {
    id: "switch-held",
    label: "Arm switch released",
    reason: "AK_ARM_SWITCH_HELD",
    detail: "The arm channel must be seen low since boot or the previous arm.",
  },
  {
    id: "throttle",
    label: "Throttle is low",
    reason: "AK_ARM_THROTTLE",
    detail: "The throttle reading must be at or below the configured low-throttle gate.",
  },
  {
    id: "attitude-converged",
    label: "Attitude estimate converged",
    reason: "AK_ARM_NOT_CONVERGED",
    detail: "The estimator must have received enough accelerometer samples.",
  },
  {
    id: "level",
    label: "Aircraft is level",
    reason: "AK_ARM_NOT_LEVEL",
    detail: "The measured tilt must be within the configured maximum arm tilt.",
  },
];

export function buildArmingGatePreview(
  config,
  profile = getBoardProfile(config?.profileId),
  issues = validateFlightControllerConfig(config, profile),
) {
  if (config?.firmwareFamily !== "aerialkit") {
    return {
      available: false,
      reason: "This gate preview maps Aerial Kit firmware states only.",
      planChecks: [],
      liveGates: [],
      planBlockerCount: 0,
      reviewCount: 0,
    };
  }

  const candidateIssues = issues.filter((issue) => issue.severity === "error");
  const hasAnyCode = (codes) =>
    candidateIssues.some((issue) => codes.includes(issue.code));
  const issueDetail = (codes) =>
    candidateIssues.find((issue) => codes.includes(issue.code))?.message;
  const planChecks = [
    {
      id: "outputs",
      label: "Output mix",
      reason: "AK_ARM_OUTPUTS",
      codes: ["output-count", "servo-count", "build-airframe-mismatch"],
      detail: issueDetail(["output-count", "servo-count", "build-airframe-mismatch"])
        || "The selected build and airframe fit the documented motor and servo outputs.",
    },
    {
      id: "receiver-transport",
      label: "Receiver transport",
      reason: "Plan transport",
      codes: ["receiver-protocol", "receiver-baud", "uart-conflict"],
      detail: issueDetail(["receiver-protocol", "receiver-baud", "uart-conflict"])
        || "The planned receiver protocol, UART, and line rate are consistent.",
    },
    {
      id: "arm-role",
      label: "Control-role mapping",
      reason: "Arm channel mapping",
      codes: [
        "arm-channel-unset",
        "channel-range",
        "channel-conflict",
        "unsupported-control-role",
      ],
      detail: issueDetail([
        "arm-channel-unset",
        "channel-range",
        "channel-conflict",
        "unsupported-control-role",
      ]) || `The ${getAerialKitControlRoles(profile).map((role) => role.label).join(", ")} roles use unique switch channels inside Aerial Kit CH5–8.`,
    },
  ].map((check) => {
    let status = "pass";
    if (hasAnyCode(check.codes)) {
      status = "blocked";
    } else if (
      check.id === "receiver-transport" &&
      (
        profile?.id === "custom-board" ||
        !profile?.receiverUart ||
        !profile?.receiverPins ||
        profile.receiverPins === "Not mapped"
      )
    ) {
      status = "unverified";
    }
    return {
      ...check,
      status,
      detail: status === "unverified"
        ? "The board mapping is incomplete, so RotorBench cannot treat this plan as routed."
        : check.detail,
    };
  });

  return {
    available: true,
    reason: null,
    planChecks,
    liveGates: AERIALKIT_LIVE_ARM_GATES.map((gate) => ({
      ...gate,
      status: "unobserved",
    })),
    planBlockerCount: planChecks.filter((check) => check.status === "blocked").length,
    reviewCount: planChecks.filter((check) => check.status === "unverified").length,
  };
}

export function buildFlightControllerSummary(config, profile = getBoardProfile(config.profileId)) {
  const family = FIRMWARE_FAMILIES.find((item) => item.id === config.firmwareFamily);
  const protocol = RECEIVER_PROTOCOLS.find((item) => item.value === config.receiverProtocol);
  const enabledFeatures = FC_FEATURES
    .filter((feature) => config.features?.[feature.id])
    .map((feature) => feature.label);
  const aerialKitRoles = getAerialKitControlRoles(profile);
  const aerialKitChannelValues = {
    arm: config.armChannel,
    flightMode: config.modeChannel,
    velocity: config.velocityChannel,
    manual: config.manualChannel,
    control: config.ctrlChannel,
    systemId: config.sysidChannel,
  };
  const aerialKitSwitches = aerialKitRoles
    .map((role) => `${role.label} ${aerialKitChannelValues[role.key] ?? "off"}`)
    .join(", ");

  return [
    `Firmware: ${family?.label || config.firmwareFamily}`,
    `Board: ${profile.label} (${profile.processor})`,
    `Airframe: ${AIRFRAMES.find((item) => item.value === config.airframe)?.label || config.airframe}`,
    `Receiver: ${protocol?.label || config.receiverProtocol} on ${config.receiverUart} at ${config.receiverBaud} baud`,
    ...(config.firmwareFamily === "aerialkit"
      ? [
          `Receiver calibration: min ${config.rcMin}, mid ${config.rcMid}, max ${config.rcMax}, deadband ${config.rcDeadband}`,
        ]
      : []),
    `Outputs: DShot ${config.dshotKhz} kHz`,
    config.firmwareFamily === "aerialkit"
      ? `Switches: ${aerialKitSwitches}`
      : `Channels: mode ${config.modeChannel ?? "not mapped"}, arm ${config.armChannel ?? "not mapped"}, beeper ${config.beeperChannel ?? "not mapped"}`,
    config.firmwareFamily === "aerialkit"
      ? `Aerial Kit control roles: ${aerialKitRoles.map((role) => role.label).join(", ")} only`
      : `Optional channels: manual ${config.manualChannel ?? "off"}, control ${config.ctrlChannel ?? "off"}, system ID ${config.sysidChannel ?? "off"}`,
    `Arm gate: ${config.armHoldMs} ms hold, ${config.armMaxTiltDeg} degree maximum tilt`,
    `Failsafe: ${FAILSAFE_ACTIONS.find((item) => item.value === config.failsafeAction)?.label || config.failsafeAction}`,
    `Receiver timeout: ${config.rcTimeoutMs} ms; low throttle ${config.throttleLow}; RTH ${config.rthEnabled ? "enabled" : "disabled"}`,
    `Features: ${enabledFeatures.join(", ") || "none"}`,
  ];
}
