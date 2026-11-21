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
    serialPorts: [
      {
        id: "USART3",
        role: "Receiver",
        detail: "PB10 / PB11",
        pins: "PB10 / PB11",
      },
    ],
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
    serialPorts: [
      {
        id: "UART1",
        role: "GPS",
        detail: "GPIO13 TX / GPIO4 RX",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "GPIO17 TX / GPIO16 RX",
        pins: "GPIO17 TX / GPIO16 RX",
      },
    ],
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
    serialPorts: [
      {
        id: "USART1",
        role: "Receiver",
        detail: "PA9 TX / PA10 RX",
        pins: "PA9 TX / PA10 RX",
      },
      {
        id: "USART2",
        role: "Console",
        detail: "Reserved by the documented board build",
      },
      {
        id: "USART3",
        role: "GPS",
        detail: "PB10 TX / PB11 RX",
      },
    ],
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
    serialPorts: [
      {
        id: "USART2",
        role: "Receiver",
        detail: "PA8 TX / PB0 RX, onboard ELRS",
        pins: "PA8 TX / PB0 RX, onboard ELRS",
      },
      {
        id: "USART3",
        role: "GPS",
        detail: "PB11 TX / PB10 RX with peripheral swap",
      },
    ],
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
  {
    id: "matek-f405-wmn",
    family: "inav",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-matek-f405-wmn"],
    label: "Matek F405-WMN",
    board: "MATEKF405TE",
    processor: "STM32F405RGT6",
    imu: "ICM42688-P",
    imuBus: "Not published",
    receiverUart: "UART2",
    receiverPins: "TX2 / RX2; SBUS pad = RX2 + inverter",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: false,
    gpsUart: "UART4",
    gpsPins: "TX4 / RX4 documented user UART",
    outputs: { motors: 12, servos: 12 },
    sharedPwmOutputs: 12,
    defaultAirframe: "elevonwing",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "User serial",
        detail: "TX1 / RX1",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "TX2 / RX2; SBUS pad = RX2 + inverter",
        pins: "TX2 / RX2; SBUS pad = RX2 + inverter",
      },
      {
        id: "UART3",
        role: "User serial",
        detail: "TX3 / RX3",
      },
      {
        id: "UART4",
        role: "GPS-capable user serial",
        detail: "TX4 / RX4",
      },
      {
        id: "UART5",
        role: "GPS-capable user serial",
        detail: "TX5 / RX5",
      },
    ],
    flightLog: {
      available: true,
      label: "16 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://www.mateksys.com/?portfolio=f405-wmn",
    ],
    notes: [
      "Official mapping: UART2 receiver/RC input, UART1/UART3/UART4/UART5 user serial, and a built-in inverter on UART2 RX.",
      "Twelve PWM pads are shared between motors and servos; this is a capability ceiling, not twelve simultaneous motors plus twelve servos.",
      "The documented ArduPilot mapping uses UART5 as GPS1 and UART4 as GPS2, while INAV labels them user serial. Confirm the selected firmware's port assignment before wiring.",
      "Six to thirty volts input covers 2S-6S, with a separate 5 V/6 V servo BEC.",
      "The board ships unsoldered; verify pad continuity and the final harness before power.",
    ],
  },
  {
    id: "matek-f405-wmn-ardupilot",
    family: "ardupilot",
    availability: "public",
    buildScope: "planning",
    label: "Matek F405-WMN · ArduPilot",
    board: "MATEKF405TE",
    processor: "STM32F405RGT6",
    imu: "ICM42688-P",
    imuBus: "Not published",
    receiverUart: "UART2",
    receiverPins: "TX2 / RX2; SBUS pad = RX2 + inverter",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: false,
    gpsUart: "UART5",
    gpsPins: "TX5 / RX5 · ArduPilot GPS1",
    outputs: { motors: 12, servos: 12 },
    sharedPwmOutputs: 12,
    defaultAirframe: "elevonwing",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "ArduPilot Telem1",
        detail: "TX1 / RX1 · SERIAL1",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "TX2 / RX2; SBUS pad = RX2 + inverter",
        pins: "TX2 / RX2; SBUS pad = RX2 + inverter",
      },
      {
        id: "UART3",
        role: "ArduPilot Telem2",
        detail: "TX3 / RX3 · SERIAL2",
      },
      {
        id: "UART4",
        role: "ArduPilot GPS2",
        detail: "TX4 / RX4 · SERIAL4",
      },
      {
        id: "UART5",
        role: "ArduPilot GPS1",
        detail: "TX5 / RX5 · SERIAL3",
      },
    ],
    flightLog: {
      available: true,
      label: "16 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://www.mateksys.com/?portfolio=f405-wmn",
    ],
    notes: [
      "ArduPilot mapping: SERIAL6/UART2 receiver, SERIAL1/UART1 telemetry, SERIAL2/UART3 telemetry, SERIAL3/UART5 GPS1, and SERIAL4/UART4 GPS2.",
      "If using only UART4 for GPS, disable the UART5 GPS protocol so the controller does not search the first GPS port during boot.",
      "Twelve PWM pads are shared between motors and servos; the output limit is not additive.",
      "High-speed serial should use USART1 or USART2, which are documented with DMA.",
      "The board ships unsoldered; verify pad continuity and the final harness before power.",
    ],
  },
  {
    id: "kakute-f722",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-holybro-kakute-f722"],
    label: "Holybro Kakute F722",
    board: "KAKUTEF7MINIV3",
    processor: "STM32F722",
    imu: "ICM42688P",
    imuBus: "SPI",
    receiverUart: "UART2",
    receiverPins: "UART2 connector pin 3 RX / pin 4 TX; pads R2 / T2",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: null,
    gpsPins: null,
    outputs: { motors: 6, servos: 0 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "Available serial",
        detail: "R1 / T1",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "R2 / T2; connector pin 3 RX / pin 4 TX",
        pins: "R2 / T2; connector pin 3 RX / pin 4 TX",
      },
      {
        id: "UART3",
        role: "Available serial",
        detail: "R3 / T3",
      },
      {
        id: "UART4",
        role: "ESC telemetry",
        detail: "R4 on the ESC connector",
      },
      {
        id: "UART6",
        role: "Available serial",
        detail: "R6 / T6",
      },
    ],
    flightLog: {
      available: true,
      label: "16 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://holybro.com/products/kakute-f722",
      "https://cdn.shopify.com/s/files/1/0604/5905/7341/files/Holybro_KakuteF722_Manual_v1.0.pdf?v=1731549645",
    ],
    notes: [
      "The documented receiver connector routes UART2 RX on pin 3 and TX on pin 4, with pads R2/T2 on the board.",
      "UART4 R4 is the documented ESC telemetry route on the ESC connector.",
      "UART1, UART3, and UART6 are exposed serial pads; the manufacturer does not assign them to a specific peripheral in this manual.",
      "The manual does not claim built-in SBUS inversion, so an external inverter remains required.",
      "The board provides six motor outputs and a separate LED output.",
    ],
  },
  {
    id: "kakute-h7-v2",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-holybro-kakute-h7-v2"],
    label: "Holybro Kakute H7 V2",
    board: "KAKUTEH7V2",
    processor: "STM32H743",
    imu: "BMI270",
    imuBus: "Not published",
    receiverUart: "UART6",
    receiverPins: "R6 / T6; R6 also on the 6-pin GH plug",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: false,
    gpsUart: "UART4",
    gpsPins: "R4 / T4",
    outputs: { motors: 8, servos: 0 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "VTX / user serial",
        detail: "T1 / R1",
      },
      {
        id: "UART2",
        role: "Bluetooth tuning",
        detail: "Internal ESP32-C3 telemetry",
      },
      {
        id: "UART3",
        role: "SmartAudio VTX",
        detail: "R3 / T3 · ArduPilot SERIAL3 default",
      },
      {
        id: "UART4",
        role: "GPS",
        detail: "R4 / T4 · DMA-enabled",
        pins: "R4 / T4",
      },
      {
        id: "UART6",
        role: "Receiver",
        detail: "R6 / T6; R6 also on the 6-pin GH plug",
        pins: "R6 / T6; R6 also on the 6-pin GH plug",
      },
      {
        id: "UART7",
        role: "ESC telemetry",
        detail: "R7 only, available on both ESC connectors",
      },
    ],
    flightLog: {
      available: true,
      label: "128 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://holybro.com/products/kakute-h7-v2",
      "https://docs.holybro.com/autopilot/kakute-h7-v1-v2-mini/kakute-h7-v2/pinout.md",
      "https://ardupilot.org/plane/docs/common-holybro-kakuteh7-v2.html",
    ],
    notes: [
      "Documented mapping: UART6 RC input, UART4 GPS, UART7 ESC telemetry, UART1 VTX/user serial, UART2 internal Bluetooth, and UART3 SmartAudio VTX.",
      "All UARTs support hardware inversion, so SBUS and other inverted protocols do not need an external inverter.",
      "The Bluetooth module turns off while armed and back on when disarmed.",
      "The board has no internal current sensor; connect the external current-sense input before relying on current telemetry.",
      "Avoid enabling the VTX pit switch when using a DJI FPV remote controller.",
      "Eight motor outputs are available across two 4-in-1 ESC connectors; the LED pad is a separate ninth PWM output.",
    ],
  },
  {
    id: "kakute-f7-aio",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-holybro-kakute-f7"],
    label: "Holybro Kakute F7 AIO",
    board: "KAKUTEF7",
    processor: "STM32F745",
    imu: "ICM20689 or MPU6000",
    imuBus: "SPI4 · CW270_DEG",
    receiverUart: "UART6",
    receiverPins: "R6 / T6; CRSF needs the R6 UART RX route",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: false,
    gpsUart: "UART3",
    gpsPins: "T3 / R3",
    outputs: { motors: 6, servos: 6 },
    sharedPwmOutputs: 6,
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "Telemetry 1",
        detail: "T1 / R1",
      },
      {
        id: "UART2",
        role: "Telemetry 2",
        detail: "T2 / R2",
      },
      {
        id: "UART3",
        role: "GPS",
        detail: "T3 / R3",
        pins: "T3 / R3",
      },
      {
        id: "UART4",
        role: "User serial",
        detail: "T4 / R4",
      },
      {
        id: "UART6",
        role: "Receiver",
        detail: "R6 / T6; R6 UART RX requires BRD_ALT_CONFIG=1 in ArduPilot",
        pins: "R6 / T6",
      },
      {
        id: "UART7",
        role: "ESC telemetry",
        detail: "R7 on each AIO corner",
      },
    ],
    flightLog: {
      available: true,
      label: "MicroSD blackbox · card required",
      retention: "Logs are stored on the microSD card; verify card format and capacity before a bench run.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://ardupilot.org/plane/docs/common-holybro-kakutef7aio.html",
      "https://raw.githubusercontent.com/betaflight/config/master/configs/HBRO/KAKUTEF7/config.h",
    ],
    notes: [
      "Documented UART map: UART1/UART2 telemetry, UART3 GPS, UART4 user serial, UART6 receiver, and UART7 ESC telemetry.",
      "In ArduPilot, CRSF/ELRS requires R6 configured as a true UART RX with BRD_ALT_CONFIG=1 and SERIAL6_PROTOCOL=23.",
      "All UARTs support hardware inversion; SBUS can use an inverted signal without an external inverter.",
      "Six shared PWM pads map to motor/servo outputs; the AIO includes current sensing and power distribution.",
      "The Betaflight target supports ICM20689 or MPU6000 boards and logs to microSD.",
    ],
  },
  {
    id: "mamba-f722-mk2",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-mamba-f722"],
    label: "MAMBA F722 MK2",
    board: "MAMBAF722_I2C",
    processor: "STM32F722",
    imu: "MPU6000 or MPU6500",
    imuBus: "SPI1 · CW180_DEG",
    receiverUart: "UART5",
    receiverPins: "Dedicated FPort/receiver pad · verify TX5/RX5",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "UART6",
    gpsPins: "UART6 TX/RX · user-selectable GPS route",
    outputs: { motors: 4, servos: 0 },
    defaultAirframe: "quadx",
    receiverUartLocked: false,
    serialPorts: [
      {
        id: "UART1",
        role: "User serial",
        detail: "PB6 TX / PB7 RX",
      },
      {
        id: "UART2",
        role: "User serial",
        detail: "PA2 TX / PA3 RX",
      },
      {
        id: "UART3",
        role: "User serial",
        detail: "PB10 TX / PB11 RX",
      },
      {
        id: "UART4",
        role: "User serial",
        detail: "PA0 TX / PA1 RX",
      },
      {
        id: "UART5",
        role: "Receiver",
        detail: "PC12 TX / PD2 RX · dedicated FPort/receiver pad",
        pins: "PC12 TX / PD2 RX",
      },
      {
        id: "UART6",
        role: "GPS-capable user serial",
        detail: "PC6 TX / PC7 RX",
      },
    ],
    flightLog: {
      available: true,
      label: "16 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://raw.githubusercontent.com/betaflight/config/master/configs/DIAT/MAMBAF722_I2C/config.h",
      "https://oscarliang.com/mamba-dji-f722-mk2/",
    ],
    notes: [
      "The Betaflight target defines six UARTs, four motor outputs, I2C, OSD, barometer support, and 16 MB flash.",
      "The target does not compile a default serial receiver or GPS UART. UART5 is the documented FPort/receiver choice; UART6 is a proposed GPS route.",
      "The target board name is MAMBAF722_I2C and the gyro is configured on SPI1 at CW180_DEG.",
      "The gyro target supports MPU6000 or MPU6500 variants.",
      "No hardware-inverter macro is bundled for external SBUS; verify the signal path before wiring.",
    ],
  },
  {
    id: "iflight-borg-5s-rx",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-iflight-borg-5s-rx"],
    label: "iFlight Borg 5S RX",
    board: "IFLIGHT_BLITZ_ATF435",
    processor: "AT32F435RGT7",
    imu: "ICM42688",
    imuBus: "Not published",
    receiverUart: "UART4",
    receiverPins: "Built-in ELRS receiver / SBUS input",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: false,
    gpsUart: "UART5",
    gpsPins: "UART5 GPS or other serial sensor",
    outputs: { motors: 4, servos: 0 },
    defaultAirframe: "quadx",
    receiverUartLocked: false,
    serialPorts: [
      {
        id: "UART1",
        role: "VTX",
        detail: "DJI MSP / SmartAudio / IRC Tramp / HDZero",
      },
      {
        id: "UART2",
        role: "ESC telemetry",
        detail: "Dedicated ESC telemetry route",
      },
      {
        id: "UART4",
        role: "Receiver",
        detail: "Built-in ELRS receiver / SBUS input",
        pins: "Built-in ELRS receiver / SBUS input",
      },
      {
        id: "UART5",
        role: "GPS-capable user serial",
        detail: "GPS / external receiver / other serial sensor",
      },
    ],
    flightLog: {
      available: true,
      label: "16 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: false,
      rangefinder: false,
    },
    sourceRefs: [
      "https://shop.iflight.com/drone-frame-cat346/quad-parts-cat20/cinewhoop-cat370/electronics-cat27/Borg-5S-RX-Flight-Controller-Pro2267",
    ],
    notes: [
      "Documented mapping: UART1 VTX, UART2 ESC telemetry, UART4 built-in ELRS/SBUS receiver, and UART5 GPS or another serial peripheral.",
      "The integrated 2.4 GHz ELRS receiver is part of the controller, while UART5 can host an external receiver when it is not used for GPS.",
      "The board has four motor outputs, a 12 V switched VTX BEC, 4S-8S input, and 16 MB blackbox flash.",
      "No barometer or exposed I2C bus is documented, so RotorBench keeps those capabilities unavailable.",
      "Receiver routing remains editable because an external receiver can use the spare serial port.",
    ],
  },
  {
    id: "speedybee-f405-mini",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-speedybee-f405-mini"],
    label: "SpeedyBee F405 Mini",
    board: "SPEEDYBEEF405MINI",
    processor: "STM32F405",
    imu: "ICM42688P",
    imuBus: "SPI1 · CW270_DEG",
    receiverUart: "UART2",
    receiverPins: "PA3 RX / PA2 TX",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "UART6",
    gpsPins: "PC7 RX / PC6 TX",
    outputs: { motors: 4, servos: 0 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "DJI / VTX",
        detail: "PA10 RX / PA9 TX",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "PA3 RX / PA2 TX · Betaflight SERIALRX_UART",
        pins: "PA3 RX / PA2 TX",
      },
      {
        id: "UART3",
        role: "User serial",
        detail: "PC11 RX / PC10 TX",
      },
      {
        id: "UART4",
        role: "Bluetooth tuning",
        detail: "PA1 RX / PA0 TX · MSP at 115200",
      },
      {
        id: "UART5",
        role: "ESC telemetry",
        detail: "PD2 RX / PC12 TX",
      },
      {
        id: "UART6",
        role: "GPS",
        detail: "PC7 RX / PC6 TX",
        pins: "PC7 RX / PC6 TX",
      },
    ],
    flightLog: {
      available: true,
      label: "8 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://www.speedybee.com/speedybee-f405-mini-bls-35a-20x20-stack/",
      "https://raw.githubusercontent.com/betaflight/config/master/configs/SPBE/SPEEDYBEEF405MINI/config.h",
    ],
    notes: [
      "Product mapping: UART1 DJI/VTX, UART2 receiver, UART4 Bluetooth MSP, UART5 ESC telemetry, and UART6 GPS; UART3 remains a user port.",
      "The official Betaflight target fixes SERIALRX_UART to USART2 and MSP_UART to UART4.",
      "The published product table does not claim a built-in external SBUS inverter; verify the selected receiver signal or fit an inverter before use.",
      "Bluetooth requires the MSP switch on UART4 at 115200 baud.",
      "The stack includes 5V 2A and 9V 3A BEC outputs and an 8 MB blackbox.",
      "Motor outputs M1-M4 and the ICM42688P gyro are fixed by the official Betaflight target.",
    ],
  },
  {
    id: "speedybee-f405-v3",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-speedybee-f405-v3"],
    label: "SpeedyBee F405 V3",
    board: "SPEEDYBEEF405V3",
    processor: "STM32F405",
    imu: "BMI270",
    imuBus: "SPI1",
    receiverUart: "UART2",
    receiverPins: "PA3 RX / PA2 TX; SBUS pad also routes UART2 RX",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "UART6",
    gpsPins: "PC7 RX / PC6 TX",
    outputs: { motors: 8, servos: 1 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "DJI / VTX",
        detail: "PA10 RX / PA9 TX · MSP displayport",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "PA3 RX / PA2 TX · Betaflight SERIALRX_UART",
        pins: "PA3 RX / PA2 TX",
      },
      {
        id: "UART3",
        role: "User serial",
        detail: "PC11 RX / PC10 TX",
      },
      {
        id: "UART4",
        role: "Bluetooth tuning",
        detail: "PA1 RX / PA0 TX · MSP at 115200",
      },
      {
        id: "UART5",
        role: "ESC telemetry",
        detail: "PD2 RX / PC12 TX",
      },
      {
        id: "UART6",
        role: "GPS",
        detail: "PC7 RX / PC6 TX · DMA-enabled",
        pins: "PC7 RX / PC6 TX",
      },
    ],
    flightLog: {
      available: true,
      label: "MicroSD blackbox · 4 GB recognized",
      retention: "Use an SDSC/SDHC FAT16 or FAT32 card; Betaflight recognizes up to 4 GB on this board.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://www.speedybee.com/speedybee-f405-v3-30x30-flight-controller/",
      "https://raw.githubusercontent.com/betaflight/config/master/configs/SPBE/SPEEDYBEEF405V3/config.h",
      "https://ardupilot.org/plane/docs/common-speedybeef4-v3.html",
    ],
    notes: [
      "Official target mapping: UART2 receiver/SBUS, UART4 Bluetooth MSP, UART5 ESC telemetry, and UART6 GPS; UART1 is the DJI/VTX displayport.",
      "The Betaflight target fixes SERIALRX_UART to USART2, MSP_UART to UART4, and ESC_SENSOR_UART to UART5.",
      "The product documentation does not claim an external SBUS inverter; verify the receiver signal path before wiring.",
      "Eight motor outputs are available, plus S9 for a servo or extra PWM output.",
      "The microSD blackbox accepts SDSC/SDHC FAT16/FAT32 cards, with Betaflight recognizing up to 4 GB on this board.",
      "The board ships with BMI270 and a barometer; attach an external compass through I2C when required.",
    ],
  },
  {
    id: "speedybee-f405-v4",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-speedybee-f405-v4"],
    label: "SpeedyBee F405 V4",
    board: "SPEEDYBEEF405V4",
    processor: "STM32F405",
    imu: "ICM42688P",
    imuBus: "SPI1",
    receiverUart: "UART2",
    receiverPins: "T2 / R2; SBUS pad also routes UART2 RX",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "UART6",
    gpsPins: "T6 / R6 · grouped with 4V5, SDA, and SCL",
    outputs: { motors: 8, servos: 1 },
    defaultAirframe: "quadx",
    receiverUartLocked: true,
    serialPorts: [
      {
        id: "UART1",
        role: "DJI / VTX",
        detail: "T1 / R1 · OSD and air-unit MSP",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "T2 / R2; SBUS pad also routes UART2 RX",
        pins: "T2 / R2; SBUS pad also routes UART2 RX",
      },
      {
        id: "UART3",
        role: "User serial",
        detail: "T3 / R3",
      },
      {
        id: "UART4",
        role: "Bluetooth tuning",
        detail: "No external pads · MSP at 115200",
      },
      {
        id: "UART5",
        role: "ESC telemetry",
        detail: "R5 / TEL only",
      },
      {
        id: "UART6",
        role: "GPS",
        detail: "T6 / R6 · grouped with 4V5, SDA, and SCL",
        pins: "T6 / R6",
      },
    ],
    flightLog: {
      available: true,
      label: "MicroSD blackbox · card required",
      retention: "Use a FAT16/FAT32 SDSC or SDHC card up to 32 GB; SDXC is not supported.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://betaflight.com/docs/wiki/boards/current/SPEEDYBEEF405V4",
    ],
    notes: [
      "Official target mapping: UART2 default receiver/SBUS, UART4 Bluetooth MSP, UART5 ESC telemetry, UART6 GPS, and UART1 DJI/VTX.",
      "The board has no hardware inverter; external SBUS wiring still needs a verified inverted signal path.",
      "When a DJI air unit uses the 6-pin cable, remove or insulate its SBUS wire if an external SBUS receiver is fitted.",
      "Eight motor outputs are available, plus S9 for a servo or extra PWM output.",
      "The blackbox is microSD only: SDSC/SDHC up to 32 GB, FAT16/FAT32; SDXC is not supported.",
      "UART4 is not broken out to pads and is dedicated to the onboard Bluetooth chip.",
    ],
  },
  {
    id: "speedybee-f405-v5",
    family: "betaflight",
    availability: "public",
    buildScope: "planning",
    catalogFlightControllerIds: ["fc-speedybee-f405-v5"],
    label: "SpeedyBee F405 V5",
    board: "SPEEDYBEEF405V5",
    processor: "STM32F405",
    imu: "ICM42688P",
    imuBus: "SPI",
    receiverUart: "UART2",
    receiverPins: "Front receiver pads",
    receiverBaud: 420000,
    sbusBaud: 100000,
    sbusNeedsInverter: true,
    gpsUart: "UART4",
    gpsPins: "GPS pads / front SH1.0-6-pin",
    outputs: { motors: 4, servos: 2 },
    defaultAirframe: "quadx",
    receiverUartLocked: false,
    serialPorts: [
      {
        id: "UART1",
        role: "Bluetooth tuning",
        detail: "Shared with the onboard tuning chip",
      },
      {
        id: "UART2",
        role: "Receiver",
        detail: "Front receiver pads",
        pins: "Front receiver pads",
      },
      {
        id: "UART3",
        role: "DJI VTX",
        detail: "Documented video-link port",
      },
      {
        id: "UART4",
        role: "GPS",
        detail: "GPS pads / front SH1.0-6-pin",
      },
      {
        id: "UART5",
        role: "ESC telemetry",
        detail: "Documented one-wire telemetry port",
      },
      {
        id: "UART6",
        role: "Receiver",
        detail: "Alternate receiver port",
      },
    ],
    flightLog: {
      available: true,
      label: "16 MB onboard blackbox",
      retention: "The onboard flash stores blackbox data.",
    },
    featureSupport: {
      telemetry: true,
      osd: true,
      blackbox: true,
      gps: true,
      barometer: true,
      rangefinder: false,
    },
    sourceRefs: [
      "https://www.speedybee.com/speedybee-f405-v5-55a-stack/",
    ],
    notes: [
      "Official mapping: UART2 receiver, UART3 DJI VTX, UART4 GPS, UART5 ESC telemetry, UART6 receiver.",
      "UART1 is shared with the Bluetooth tuning chip.",
      "M1-M4 and the 10-pin connector expose motor outputs; S5-S6 expose servo outputs.",
      "Confirm the selected Betaflight port and pad mapping before power or receiver calibration.",
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

export function normalizeSerialPortName(value) {
  return typeof value === "string"
    ? value.toUpperCase().replace(/[\s_-]/g, "")
    : "";
}

export function getSerialPortAssignments(config = {}, profile = {}) {
  return (profile.serialPorts || []).map((port) => {
    const assignments = [];
    if (
      normalizeSerialPortName(config.receiverUart)
        === normalizeSerialPortName(port.id)
    ) {
      assignments.push("Receiver");
    }
    if (
      config.features?.gps &&
      normalizeSerialPortName(profile.gpsUart)
        === normalizeSerialPortName(port.id)
    ) {
      assignments.push("GPS");
    }
    return { ...port, assignments };
  });
}

export function buildSerialAllocationSummary(config = {}, profile = {}) {
  const ports = getSerialPortAssignments(config, profile);
  if (ports.length === 0) return null;
  return `Serial allocation: ${ports
    .map((port) => (
      `${port.id} ${port.role}${port.assignments.length
        ? ` (${port.assignments.join(" + ")})`
        : ""}`
    ))
    .join("; ")}`;
}

export function buildSerialAllocationText(config = {}, profile = {}) {
  const ports = getSerialPortAssignments(config, profile);
  if (ports.length === 0) return "";
  return [
    "# RotorBench serial allocation - planning only",
    `# Board: ${profile.label || "Not set"} (${profile.board || "not mapped"})`,
    `# Receiver route: ${config.receiverUart || "not assigned"}`,
    `# GPS route: ${config.features?.gps
      ? normalizeSerialPortName(config.receiverUart)
        === normalizeSerialPortName(profile.gpsUart)
        ? "receiver conflict"
        : profile.gpsUart || "not available"
      : "disabled"}`,
    ...ports.map((port) => (
      `${port.id}: ${port.role} - ${port.detail}${
        port.assignments.length ? ` [${port.assignments.join(" + ")}]` : ""
      }`
    )),
    "",
    "# Verify UART ownership, pad direction, signal levels, and continuity on the physical board.",
    "# RotorBench did not test this serial allocation or hardware state.",
  ].join("\n");
}

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

export const MOTOR_DIRECTIONS = [
  {
    value: "props-in",
    label: "Normal · props in",
    note: "Front propellers spin inward. This is the Betaflight normal default.",
  },
  {
    value: "props-out",
    label: "Reversed · props out",
    note: "Front propellers spin outward. Betaflight must also know that yaw is reversed.",
  },
];

const AIRFRAME_LAYOUT_SOURCES = Object.freeze([
  "aerial-kit/firmware/src/core/flight/ak_mixer.c",
  "aerial-kit/apps/configurator/src/ui/views/airframes.ts",
]);

const BETAFLIGHT_LAYOUT_SOURCES = Object.freeze([
  "betaflight.com/docs/wiki/app/motors-tab",
  "betaflight.com/docs/wiki/guides/current/Reversed-motor-direction",
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

export const BETAFLIGHT_AIRFRAME_MOTOR_LAYOUTS = Object.freeze({
  quadx: Object.freeze({
    shape: "rotor",
    servos: 0,
    directionProfile: "props-in",
    sourceRefs: BETAFLIGHT_LAYOUT_SOURCES,
    motors: Object.freeze([
      { output: 1, label: "RR", x: 0.75, z: 0.75, spin: "CW" },
      { output: 2, label: "FR", x: 0.75, z: -0.75, spin: "CCW" },
      { output: 3, label: "RL", x: -0.75, z: 0.75, spin: "CCW" },
      { output: 4, label: "FL", x: -0.75, z: -0.75, spin: "CW" },
    ]),
  }),
});

export function getAirframeMotorLayout(
  airframe,
  firmwareFamily = "aerialkit",
  motorDirection = "props-in",
) {
  if (firmwareFamily === "betaflight") {
    const layout = BETAFLIGHT_AIRFRAME_MOTOR_LAYOUTS[airframe];
    if (!layout) return null;
    if (motorDirection !== "props-out") return layout;
    return {
      ...layout,
      directionProfile: "props-out",
      motors: layout.motors.map((motor) => ({
        ...motor,
        spin: motor.spin === "CW" ? "CCW" : "CW",
      })),
    };
  }
  if (firmwareFamily !== "aerialkit") return null;
  return AIRFRAME_MOTOR_LAYOUTS[airframe] || null;
}

const CORNER_BY_MOTOR_LABEL = Object.freeze({
  FL: "upperLeft",
  FR: "upperRight",
  RR: "lowerRight",
  RL: "lowerLeft",
});

export function getMotorOutputByCorner(layout) {
  if (!layout?.motors?.length) return null;
  const outputByCorner = {};
  for (const motor of layout.motors) {
    const corner = CORNER_BY_MOTOR_LABEL[motor.label];
    if (!corner) return null;
    outputByCorner[corner] = {
      output: motor.output,
      label: motor.label,
      spin: motor.spin,
    };
  }
  return Object.keys(outputByCorner).length === 4 ? outputByCorner : null;
}

export function getPropellerDirectionForOutputMap(outputByCorner) {
  const frontLeft = outputByCorner?.upperLeft;
  if (!frontLeft || !["CW", "CCW"].includes(frontLeft.spin)) return null;
  return frontLeft.spin === "CCW" ? "props-out" : "props-in";
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

export const BETAFLIGHT_FAILSAFE_THROTTLE = Object.freeze({
  defaultPwm: 1000,
  minPwm: 1000,
  maxPwm: 2000,
});

export const AERIALKIT_SERVO_LIMITS = Object.freeze({
  minTrimUs: -200,
  maxTrimUs: 200,
  minTravelUs: 100,
  maxTravelUs: 900,
  defaultTravelUs: 500,
});

export const AERIALKIT_SERVO_OUTPUTS = Object.freeze([
  Object.freeze({
    output: 1,
    reverseKey: "servo1Reverse",
    trimKey: "servo1TrimUs",
    travelKey: "servo1TravelUs",
  }),
  Object.freeze({
    output: 2,
    reverseKey: "servo2Reverse",
    trimKey: "servo2TrimUs",
    travelKey: "servo2TravelUs",
  }),
]);

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
  { key: "mission", label: "mission" },
  { key: "launch", label: "launch" },
]);

export const AERIALKIT_WORKSPACE_CONTROL_ROLES = Object.freeze([
  { key: "arm", label: "arm" },
  { key: "flightMode", label: "flight mode" },
  { key: "mission", label: "mission" },
  { key: "launch", label: "launch" },
  { key: "manual", label: "manual" },
  { key: "control", label: "control" },
  { key: "systemId", label: "system ID" },
]);

const AERIALKIT_LAUNCH_AIRFRAMES = Object.freeze([
  "elevonwing",
  "elevonwingsingle",
]);

export function supportsAerialKitLaunch(airframe) {
  return AERIALKIT_LAUNCH_AIRFRAMES.includes(airframe);
}

export function getAerialKitControlRoles(profile = CUSTOM_BOARD_PROFILE) {
  return profile?.buildScope === "workspace"
    ? AERIALKIT_WORKSPACE_CONTROL_ROLES
    : AERIALKIT_PUBLIC_CONTROL_ROLES;
}

export function getCatalogBoardProfile(selectedFlightController = null) {
  if (!selectedFlightController?.id) return null;
  return FC_BOARD_PROFILES.find((profile) => (
    profile.catalogFlightControllerIds?.includes(selectedFlightController.id)
  )) || null;
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
  const catalogProfile = getCatalogBoardProfile(selectedFlightController) || (selectedFlightController
    ? {
        ...CUSTOM_BOARD_PROFILE,
        label: selectedFlightController.name || CUSTOM_BOARD_PROFILE.label,
        board: selectedFlightController.name || CUSTOM_BOARD_PROFILE.board,
        processor: selectedFlightController.processor || CUSTOM_BOARD_PROFILE.processor,
        imu: selectedFlightController.imu || CUSTOM_BOARD_PROFILE.imu,
      }
    : CUSTOM_BOARD_PROFILE);

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
    motorDirection: "props-in",
    receiverProtocol,
    receiverUart: catalogProfile.receiverUart,
    receiverBaud: receiverProtocol === "sbus"
      ? catalogProfile.sbusBaud
      : catalogProfile.receiverBaud,
    rcMin: 172,
    rcMid: 992,
    rcMax: 1811,
    rcDeadband: 0.02,
    vbatRatio: 11,
    vbatCells: 0,
    vbatWarnCell: 3.5,
    vbatMinCell: 3.3,
    batteryRthEnabled: false,
    fenceEnabled: false,
    fenceRadiusM: 0,
    fenceCeilingM: 0,
    rthMinAltM: 0,
    gpsMinSats: 6,
    alignRollDeg: 0,
    alignPitchDeg: 0,
    alignYawDeg: 0,
    gyroRateHz: 0,
    pidDenom: 1,
    servo1Reverse: false,
    servo1TrimUs: 0,
    servo1TravelUs: AERIALKIT_SERVO_LIMITS.defaultTravelUs,
    servo2Reverse: false,
    servo2TrimUs: 0,
    servo2TravelUs: AERIALKIT_SERVO_LIMITS.defaultTravelUs,
    dshotKhz: 300,
    failsafeAction: "firmware-derived",
    failsafeThrottle: betaflightLike
      ? BETAFLIGHT_FAILSAFE_THROTTLE.defaultPwm
      : null,
    armChannel: channelPreset?.armChannel ?? null,
    modeChannel: channelPreset?.modeChannel ?? null,
    beeperChannel: channelPreset?.beeperChannel ?? null,
    velocityChannel: null,
    missionChannel: null,
    launchChannel: null,
    launchThrottle: 0.7,
    launchClimbDeg: 18,
    launchTimeoutS: 5,
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
    Number.isInteger(profile.sharedPwmOutputs) &&
    airframe.motors + airframe.servos > profile.sharedPwmOutputs
  ) {
    issues.push({
      severity: "error",
      code: "pwm-output-count",
      message: `${airframe.label} needs ${airframe.motors + airframe.servos} PWM outputs; ${profile.label} exposes ${profile.sharedPwmOutputs} shared PWM pads.`,
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
    if (!finite(config.vbatRatio) || Number(config.vbatRatio) < 1 || Number(config.vbatRatio) > 50) {
      issues.push({
        severity: "error",
        code: "vbat-ratio-range",
        message: "Battery divider ratio must be between 1 and 50 pack volts per ADC-pin volt.",
      });
    }
    if (!integer(config.vbatCells) || Number(config.vbatCells) < 0 || Number(config.vbatCells) > 8) {
      issues.push({
        severity: "error",
        code: "vbat-cells-range",
        message: "Battery cell override must be a whole number from 0 to 8; 0 uses firmware auto-detection.",
      });
    }
    if (!finite(config.vbatWarnCell) || Number(config.vbatWarnCell) < 1 || Number(config.vbatWarnCell) > 5) {
      issues.push({
        severity: "error",
        code: "vbat-warn-range",
        message: "Battery warning threshold must be between 1.0 and 5.0 volts per cell.",
      });
    }
    if (!finite(config.vbatMinCell) || Number(config.vbatMinCell) < 1 || Number(config.vbatMinCell) > 5) {
      issues.push({
        severity: "error",
        code: "vbat-min-range",
        message: "Battery minimum threshold must be between 1.0 and 5.0 volts per cell.",
      });
    }
    if (
      finite(config.vbatWarnCell) &&
      finite(config.vbatMinCell) &&
      Number(config.vbatMinCell) >= Number(config.vbatWarnCell)
    ) {
      issues.push({
        severity: "error",
        code: "vbat-threshold-order",
        message: "Battery minimum threshold must be below the warning threshold.",
      });
    }
    if (
      config.batteryRthEnabled &&
      (!config.features?.gps || !profile.gpsUart)
    ) {
      issues.push({
        severity: "error",
        code: "battery-rth-without-gps",
        message: "Battery return-to-home requires the GPS feature and a documented GPS UART.",
      });
    }
    if (
      config.fenceEnabled &&
      (!config.features?.gps || !profile.gpsUart)
    ) {
      issues.push({
        severity: "error",
        code: "fence-without-gps",
        message: "Aerial Kit geofence requires the GPS feature and a documented GPS UART.",
      });
    }
    if (!finite(config.fenceRadiusM) || Number(config.fenceRadiusM) < 0 || Number(config.fenceRadiusM) > 5000) {
      issues.push({
        severity: "error",
        code: "fence-radius-range",
        message: "Geofence radius must be between 0 and 5000 metres.",
      });
    } else if (config.fenceEnabled && Number(config.fenceRadiusM) <= 0) {
      issues.push({
        severity: "error",
        code: "fence-radius-required",
        message: "An enabled geofence requires a radius above 0 metres.",
      });
    }
    if (!finite(config.fenceCeilingM) || Number(config.fenceCeilingM) < 0 || Number(config.fenceCeilingM) > 5000) {
      issues.push({
        severity: "error",
        code: "fence-ceiling-range",
        message: "Geofence ceiling must be between 0 and 5000 metres; 0 disables the ceiling.",
      });
    }
    if (!finite(config.rthMinAltM) || Number(config.rthMinAltM) < 0 || Number(config.rthMinAltM) > 500) {
      issues.push({
        severity: "error",
        code: "rth-min-alt-range",
        message: "Return floor must be between 0 and 500 metres; 0 disables the floor.",
      });
    }
    if (!integer(config.gpsMinSats) || Number(config.gpsMinSats) < 5 || Number(config.gpsMinSats) > 10) {
      issues.push({
        severity: "error",
        code: "gps-min-sats-range",
        message: "GPS navigation minimum must be a whole number from 5 to 10 satellites.",
      });
    }
    for (const [key, code, label] of [
      ["alignRollDeg", "align-roll-range", "roll"],
      ["alignPitchDeg", "align-pitch-range", "pitch"],
      ["alignYawDeg", "align-yaw-range", "yaw"],
    ]) {
      if (!finite(config[key]) || Number(config[key]) < -180 || Number(config[key]) > 180) {
        issues.push({
          severity: "error",
          code,
          message: `Board alignment ${label} must be between -180 and 180 degrees.`,
        });
      }
    }
    if (!integer(config.gyroRateHz) || Number(config.gyroRateHz) < 0 || Number(config.gyroRateHz) > 8000) {
      issues.push({
        severity: "error",
        code: "gyro-rate-range",
        message: "Requested gyro rate must be a whole number from 0 to 8000 Hz; 0 keeps the board driver default.",
      });
    }
    if (!integer(config.pidDenom) || Number(config.pidDenom) < 1 || Number(config.pidDenom) > 32) {
      issues.push({
        severity: "error",
        code: "pid-denom-range",
        message: "Control-loop divisor must be a whole number from 1 to 32 gyro samples.",
      });
    }
    for (const servo of AERIALKIT_SERVO_OUTPUTS.slice(0, airframe?.servos || 0)) {
      if (typeof config[servo.reverseKey] !== "boolean") {
        issues.push({
          severity: "error",
          code: "servo-reverse",
          targetId: `fc-servo${servo.output}-reverse`,
          message: `Servo ${servo.output} reversal must be explicitly enabled or disabled.`,
        });
      }
      if (
        !finite(config[servo.trimKey]) ||
        Number(config[servo.trimKey]) < AERIALKIT_SERVO_LIMITS.minTrimUs ||
        Number(config[servo.trimKey]) > AERIALKIT_SERVO_LIMITS.maxTrimUs
      ) {
        issues.push({
          severity: "error",
          code: "servo-trim-range",
          targetId: `fc-servo${servo.output}-trim`,
          message: `Servo ${servo.output} centre trim must be between ${AERIALKIT_SERVO_LIMITS.minTrimUs} and ${AERIALKIT_SERVO_LIMITS.maxTrimUs} microseconds.`,
        });
      }
      if (
        !integer(config[servo.travelKey]) ||
        Number(config[servo.travelKey]) < AERIALKIT_SERVO_LIMITS.minTravelUs ||
        Number(config[servo.travelKey]) > AERIALKIT_SERVO_LIMITS.maxTravelUs
      ) {
        issues.push({
          severity: "error",
          code: "servo-travel-range",
          targetId: `fc-servo${servo.output}-travel`,
          message: `Servo ${servo.output} travel must be a whole number from ${AERIALKIT_SERVO_LIMITS.minTravelUs} to ${AERIALKIT_SERVO_LIMITS.maxTravelUs} microseconds.`,
        });
      }
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
    config.firmwareFamily === "aerialkit" &&
    (
      !finite(config.launchThrottle) ||
      Number(config.launchThrottle) < 0 ||
      Number(config.launchThrottle) > 1
    )
  ) {
    issues.push({
      severity: "error",
      code: "launch-throttle-range",
      message: "Launch throttle must be between 0 and 1, where 0.70 is 70 per cent.",
    });
  }
  if (
    config.firmwareFamily === "aerialkit" &&
    (
      !finite(config.launchClimbDeg) ||
      Number(config.launchClimbDeg) < 0 ||
      Number(config.launchClimbDeg) > 45
    )
  ) {
    issues.push({
      severity: "error",
      code: "launch-climb-range",
      message: "Launch climb attitude must be between 0 and 45 degrees.",
    });
  }
  if (
    config.firmwareFamily === "aerialkit" &&
    (
      !integer(config.launchTimeoutS) ||
      Number(config.launchTimeoutS) < 0 ||
      Number(config.launchTimeoutS) > 60
    )
  ) {
    issues.push({
      severity: "error",
      code: "launch-timeout-range",
      message: "Launch timeout must be a whole number of seconds from 0 to 60.",
    });
  }
  if (
    config.firmwareFamily === "aerialkit" &&
    config.launchChannel != null &&
    !supportsAerialKitLaunch(config.airframe)
  ) {
    issues.push({
      severity: "error",
      code: "launch-airframe-mismatch",
      message: "The hand-launch switch is only available for Aerial Kit elevon-wing airframes.",
    });
  }

  if (
    config.firmwareFamily === "betaflight" &&
    (
      !integer(config.failsafeThrottle) ||
      Number(config.failsafeThrottle) < BETAFLIGHT_FAILSAFE_THROTTLE.minPwm ||
      Number(config.failsafeThrottle) > BETAFLIGHT_FAILSAFE_THROTTLE.maxPwm
    )
  ) {
    issues.push({
      severity: "error",
      code: "failsafe-throttle-range",
      message: "Betaflight Stage 2 landing throttle must be a whole PWM value from 1000 to 2000.",
    });
  }

  if (
    config.features?.gps &&
    profile.gpsUart &&
    normalizeSerialPortName(config.receiverUart)
      === normalizeSerialPortName(profile.gpsUart)
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

  if (profile.serialPorts?.length && config.receiverUart) {
    const receiverPort = profile.serialPorts.find(
      (port) => normalizeSerialPortName(port.id)
        === normalizeSerialPortName(config.receiverUart),
    );
    const sharesEnabledGpsRoute = Boolean(
      config.features?.gps &&
      profile.gpsUart &&
      normalizeSerialPortName(config.receiverUart)
        === normalizeSerialPortName(profile.gpsUart),
    );

    if (!receiverPort) {
      issues.push({
        severity: "warning",
        code: "receiver-uart-unmapped",
        message: `${config.receiverUart} is not in this board's documented serial map. Verify the Betaflight resource and port mapping before wiring.`,
      });
    } else if (receiverPort.role !== "Receiver" && !sharesEnabledGpsRoute) {
      issues.push({
        severity: "warning",
        code: "receiver-uart-role",
        message: `${receiverPort.id} is documented for ${receiverPort.role} on ${profile.label}. Reassigning it to the receiver requires a deliberate port remap.`,
      });
    } else if (!receiverPort.pins) {
      issues.push({
        severity: "warning",
        code: "receiver-uart-pins-unmapped",
        message: `${receiverPort.id} is an alternate receiver port on ${profile.label}, but its pad mapping is not bundled. Verify the Betaflight resource and solder pads before wiring.`,
      });
    }
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
    config.missionChannel,
    config.launchChannel,
    config.beeperChannel,
    config.manualChannel,
    config.ctrlChannel,
    config.sysidChannel,
  ].filter((channel) => Number.isInteger(channel));

  const switchChannels = [
    ["arm", config.armChannel],
    ["flight mode", config.modeChannel],
    ["velocity mode", config.velocityChannel],
    ["mission", config.missionChannel],
    ["launch", config.launchChannel],
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
      codes: [
        "output-count",
        "servo-count",
        "build-airframe-mismatch",
        "servo-reverse",
        "servo-trim-range",
        "servo-travel-range",
      ],
      detail: issueDetail([
        "output-count",
        "servo-count",
        "build-airframe-mismatch",
        "servo-reverse",
        "servo-trim-range",
        "servo-travel-range",
      ]) || "The selected build and airframe fit the documented motor and servo outputs, and the planned servo plumbing is valid.",
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
    mission: config.missionChannel,
    launch: config.launchChannel,
    manual: config.manualChannel,
    control: config.ctrlChannel,
    systemId: config.sysidChannel,
  };
  const aerialKitSwitches = aerialKitRoles
    .map((role) => `${role.label} ${aerialKitChannelValues[role.key] ?? "off"}`)
    .join(", ");
  const airframe = AIRFRAMES.find((item) => item.value === config.airframe);
  const serialAllocation = buildSerialAllocationSummary(config, profile);
  const motorLayout = getAirframeMotorLayout(
    config.airframe,
    config.firmwareFamily,
    config.motorDirection,
  );
  const motorOrderLabel = config.firmwareFamily === "betaflight"
    ? `Betaflight ${config.motorDirection === "props-out"
      ? "reversed props-out"
      : "normal props-in"} QUAD X motor order`
    : "Motor order";

  return [
    `Firmware: ${family?.label || config.firmwareFamily}`,
    `Board: ${profile.label} (${profile.processor})`,
    `Airframe: ${airframe?.label || config.airframe}`,
    `Receiver: ${protocol?.label || config.receiverProtocol} on ${config.receiverUart} at ${config.receiverBaud} baud`,
    ...(serialAllocation ? [serialAllocation] : []),
    ...(config.firmwareFamily === "aerialkit"
      ? [
          `Receiver calibration: min ${config.rcMin}, mid ${config.rcMid}, max ${config.rcMax}, deadband ${config.rcDeadband}`,
          `Board alignment: roll ${config.alignRollDeg}°, pitch ${config.alignPitchDeg}°, yaw ${config.alignYawDeg}° (applied roll, then pitch, then yaw; verify sensor signs)`,
          `Control loop request: gyro ${Number(config.gyroRateHz) === 0 ? "driver default" : `${config.gyroRateHz} Hz`}, one pass every ${config.pidDenom} gyro sample${Number(config.pidDenom) === 1 ? "" : "s"}`,
          `Battery telemetry: divider ${config.vbatRatio}:1, cells ${Number(config.vbatCells) === 0 ? "auto" : config.vbatCells}, warning ${config.vbatWarnCell} V/cell, minimum ${config.vbatMinCell} V/cell, critical-pack return ${config.batteryRthEnabled ? "enabled" : "disabled"}`,
          `Geofence: ${config.fenceEnabled ? "enabled" : "disabled"}; radius ${config.fenceRadiusM} m, ceiling ${Number(config.fenceCeilingM) === 0 ? "none" : `${config.fenceCeilingM} m`}, GPS gate ${config.gpsMinSats} satellites`,
          `Return floor: ${Number(config.rthMinAltM) === 0 ? "none" : `${config.rthMinAltM} m`}`,
          `Launch: ${supportsAerialKitLaunch(config.airframe)
            ? config.launchChannel == null
              ? "off"
              : `switch CH${config.launchChannel}, throttle ${Math.round(Number(config.launchThrottle) * 100)}%, climb ${config.launchClimbDeg}°, timeout ${config.launchTimeoutS} s`
            : config.launchChannel == null
              ? "not applicable to the selected airframe"
              : `configured on CH${config.launchChannel} but blocked for the selected airframe`}`,
        ]
      : []),
    `Outputs: DShot ${config.dshotKhz} kHz`,
    ...(motorLayout
      ? [
          `${motorOrderLabel}: ${motorLayout.motors
            .map((motor) => `${motor.output} ${motor.label} ${motor.spin}`)
            .join(", ")}`,
        ]
      : []),
    ...(config.firmwareFamily === "aerialkit" && airframe?.servos > 0
      ? [
          `Servo outputs: ${AERIALKIT_SERVO_OUTPUTS
            .slice(0, airframe.servos)
            .map((servo) => (
              `${servo.output} ${config[servo.reverseKey] ? "reversed" : "normal"}, `
              + `trim ${config[servo.trimKey]} us, travel ${config[servo.travelKey]} us`
            ))
            .join("; ")}`,
        ]
      : []),
    config.firmwareFamily === "aerialkit"
      ? `Switches: ${aerialKitSwitches}`
      : `Channels: mode ${config.modeChannel ?? "not mapped"}, arm ${config.armChannel ?? "not mapped"}, beeper ${config.beeperChannel ?? "not mapped"}`,
    config.firmwareFamily === "aerialkit"
      ? `Aerial Kit control roles: ${aerialKitRoles.map((role) => role.label).join(", ")} only`
      : `Optional channels: manual ${config.manualChannel ?? "off"}, control ${config.ctrlChannel ?? "off"}, system ID ${config.sysidChannel ?? "off"}`,
    `Arm gate: ${config.armHoldMs} ms hold, ${config.armMaxTiltDeg} degree maximum tilt`,
    `Failsafe: ${FAILSAFE_ACTIONS.find((item) => item.value === config.failsafeAction)?.label || config.failsafeAction}`,
    ...(config.firmwareFamily === "betaflight"
      ? [
          `Betaflight Stage 2 landing throttle: ${config.failsafeThrottle} PWM (used only in Landing Mode; confirm the board's Stage 2 procedure)`,
        ]
      : []),
    `Receiver timeout: ${config.rcTimeoutMs} ms; low throttle ${config.throttleLow}; RTH ${config.rthEnabled ? "enabled" : "disabled"}`,
    `Features: ${enabledFeatures.join(", ") || "none"}`,
  ];
}
