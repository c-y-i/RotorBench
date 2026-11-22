import { getBindingIdentity } from "../utils/elrsBinding";

export const RADIO_STORAGE_KEY = "rotorbench:radio-plan:v1";

export const RADIO_TARGETS = [
  {
    id: "aerialkit-elrs-rev-a3",
    name: "Aerial Kit ELRS USB TX Rev A3",
    description: "ESP32-S3, SX1280 and RFX2401C board with separate TX and RX images.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "native-usb",
    defaultHostBay: "native-usb",
    supportedHostBays: ["native-usb"],
    firmwareVersion: "ExpressLRS 4.1.0",
    benchArtifact: "9b48f01f522783d872b72f36c69c7171bcc851e2fcbfe5f60cb717efcb0331b4",
    benchScope: "Props-off, close-range Rev A3 link validation. Flight and range remain untested.",
    roles: ["tx", "rx"],
    packetRateModes: [
      "50",
      "100-full",
      "150",
      "250",
      "333-full",
      "500",
      "d250",
      "d500",
      "f500",
      "f1000",
    ],
    serial: {
      txBaud: 400000,
      rxBaud: 420000,
      frame: "8N1, non-inverted, full duplex",
      note: "Native USB CDC ignores the selected baud rate.",
    },
    hostLink: {
      nativeUsb: true,
      uart: {
        baud: 400000,
        frame: "8N1, non-inverted, full duplex",
        pins: "J3.4/GPIO44 host TX · J3.3/GPIO43 host RX",
      },
    },
    source: "aerial-kit/firmware/elrs-usb-tx-rev-a3/docs/HOST-LINK.md",
  },
  {
    id: "radiomaster-ranger-nano-elrs-24-tx",
    name: "RadioMaster Ranger Nano 2.4 GHz ELRS",
    description: "Nano-bay ExpressLRS transmitter with a 100 mW default output and F-1000 Hz capability.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "nano-8",
    supportedHostBays: ["nano-8"],
    roles: ["tx"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF on Nano 8-pin module bay; confirm handset pinout and rate",
      note: "The official manual labels CRSF, GND, and 5-12 V on the Nano bay. It does not publish a host UART baud or USB CDC contract.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "nano-8",
        pins: "Nano 8-pin: CRSF, GND, 5-12 V, five NC",
        voltage: "5-12 V",
        note: "Use a compatible handset Nano bay. Confirm ground, supply, CRSF direction, and the fitted RF-region variant before power.",
      },
    },
    power: {
      defaultDbm: 20,
      defaultMw: 100,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
        { region: "CE", dbm: 20, mw: 100 },
      ],
      menuVerified: false,
      note: "Official listing says output is adjustable by Lua and defaults to 100 mW. RotorBench does not bundle a verified menu table.",
    },
    source: "RadioMaster Ranger Nano product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/ranger-nano-2-4ghz-elrs-module",
  },
  {
    id: "radiomaster-ranger-micro-elrs-24-tx",
    name: "RadioMaster Ranger Micro 2.4 GHz ELRS",
    description: "JR-style micro-bay ExpressLRS transmitter with a 100 mW default output and F-1000 Hz capability.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "jr-micro-5",
    supportedHostBays: ["jr-micro-5"],
    roles: ["tx"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF on JR-style micro module bay; confirm handset pinout and rate",
      note: "The official manual labels the five-pin JR micro bay NC, NC, 5-12 V, GND, and CRSF. It does not publish a host UART baud or USB CDC contract.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "jr-micro-5",
        pins: "JR-style micro 5-pin: NC, NC, 5-12 V, GND, CRSF",
        voltage: "5-12 V",
        note: "Use a compatible JR-style micro bay. Confirm the handset pinout, CRSF direction, and fitted RF-region variant before power.",
      },
    },
    power: {
      defaultDbm: 20,
      defaultMw: 100,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
        { region: "CE", dbm: 20, mw: 100 },
      ],
      menuVerified: false,
      note: "Official listing says output is adjustable by Lua and defaults to 100 mW. RotorBench does not bundle a verified menu table.",
    },
    source: "RadioMaster Ranger Micro product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/ranger-micro-2-4ghz-elrs-module",
  },
  {
    id: "radiomaster-ranger-elrs-24-tx",
    name: "RadioMaster Ranger 2.4 GHz ELRS",
    description: "Full-size ExpressLRS transmitter with JR and Nano adapters, OLED controls, and a 100 mW default output.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "jr-standard-5",
    supportedHostBays: ["jr-standard-5", "nano-8"],
    roles: ["tx"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF through JR or Nano module-bay adapter; confirm handset pinout and rate",
      note: "The official manual includes JR 5-pin and Nano 8-pin adapters and a Futaba CRSF cable. It does not publish a host UART baud or USB CDC contract.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "jr-standard-5",
        pins: "Included JR 5-pin and Nano 8-pin adapters; confirm CRSF, ground, and supply against the handset",
        voltage: "DC 6-16.8 V",
        note: "Choose the adapter that fits the handset. Confirm pin direction, ground, supply, and the fitted RF-region variant before power.",
      },
    },
    power: {
      defaultDbm: 20,
      defaultMw: 100,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
        { region: "CE", dbm: 20, mw: 100 },
      ],
      menuVerified: false,
      note: "Official listing says output is adjustable by Lua and defaults to 100 mW. RotorBench does not bundle a verified menu table.",
    },
    source: "RadioMaster Ranger product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/ranger-2-4ghz-elrs-module",
  },
  {
    id: "radiomaster-bandit-nano-915-tx",
    name: "RadioMaster Bandit Nano Sub-G 900 MHz ELRS",
    description: "Nano-bay ESP32/SX1276 ExpressLRS transmitter with a 25–200 Hz refresh range and receiver-capable UART pads.",
    frequency: "915/868 MHz (Sub-G)",
    frequencyBands: ["Sub-G 900 MHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "nano-8",
    supportedHostBays: ["nano-8"],
    roles: ["tx", "rx"],
    packetRateModes: ["25", "50", "100-full", "150", "200"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF on the Nano 8-pin module connector; confirm host pinout and rate",
      note: "The module also exposes UART solder pads for receiver use. The manufacturer does not publish a host UART baud contract.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "nano-8",
        pins: "Nano 8-pin: CRSF, GND, 5-12 V, and not-connected pins",
        voltage: "5-12 V from the bay; XT30 accepts DC 6-16.8 V",
        note: "Use a compatible Nano bay. Confirm ground, supply, CRSF direction, and whether external XT30 power is required.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
      ],
      menuVerified: false,
      note: "RadioMaster documents a 1 W telemetry-receiver use case. The default drive level and menu table are not bundled.",
    },
    source: "RadioMaster Bandit Nano product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/bandit-nano-expresslrs-rf-module",
  },
  {
    id: "radiomaster-bandit-micro-915-tx",
    name: "RadioMaster Bandit Micro Sub-G 900 MHz ELRS",
    description: "JR-style micro-bay ESP32/SX1276 ExpressLRS transmitter with a 25–200 Hz refresh range.",
    frequency: "915/868 MHz (Sub-G)",
    frequencyBands: ["Sub-G 900 MHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "jr-micro-5",
    supportedHostBays: ["jr-micro-5"],
    roles: ["tx", "rx"],
    packetRateModes: ["25", "50", "100-full", "150", "200"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF on the JR-style micro 5-pin module connector; confirm host pinout and rate",
      note: "The module exposes UART solder pads for receiver use. The manufacturer does not publish a host UART baud contract.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "jr-micro-5",
        pins: "JR-style micro 5-pin: NC, NC, 5-12 V, GND, CRSF",
        voltage: "5-12 V from the bay; XT30 accepts DC 6-16.8 V",
        note: "Use a compatible JR-style micro bay. Confirm ground, supply, CRSF direction, and external XT30 power before operating.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
      ],
      menuVerified: false,
      note: "RadioMaster documents up to 1 W output. The default drive level and menu table are not bundled.",
    },
    source: "RadioMaster Bandit Micro product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/bandit-micro-expresslrs-rf-module",
  },
  {
    id: "radiomaster-bandit-915-tx",
    name: "RadioMaster Bandit Sub-G 900 MHz ELRS",
    description: "Full-size ESP32/SX1276 ExpressLRS transmitter with JR and Nano adapters and up to 1 W output.",
    frequency: "915/868 MHz (Sub-G)",
    frequencyBands: ["Sub-G 900 MHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "jr-standard-5",
    supportedHostBays: ["jr-standard-5", "nano-8"],
    roles: ["tx"],
    packetRateModes: ["25", "50", "100-full", "150", "200"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF through the JR or Nano module-bay adapter; confirm host pinout and rate",
      note: "The official manual includes JR and Nano adapters plus a Futaba CRSF cable. It does not publish a host UART baud contract.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "jr-standard-5",
        pins: "Included JR standard 5-pin and Nano 8-pin adapters; confirm CRSF, ground, and supply against the handset",
        voltage: "XT30 accepts DC 6-16.8 V",
        note: "Choose the adapter that fits the handset. Confirm pin direction, ground, supply, and the fitted RF-region variant before power.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [
        { region: "FCC", dbm: 30, mw: 1000 },
      ],
      menuVerified: false,
      note: "RadioMaster documents up to 1 W output. The default drive level and menu table are not bundled.",
    },
    source: "RadioMaster Bandit product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/bandit-expresslrs-rf-module",
  },
  {
    id: "radiomaster-pocket-elrs-24-tx",
    name: "RadioMaster Pocket ELRS 2.4 GHz",
    description: "EdgeTX micro handset with internal ExpressLRS 2.4 GHz RF, a 288 g body, and a Nano-compatible external module bay for other targets.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "internal-rf",
    defaultHostBay: "verify",
    supportedHostBays: [],
    firmwareVersion: "EdgeTX with internal ExpressLRS",
    roles: ["tx"],
    packetRateModes: ["25", "50", "100-full", "150", "250", "500"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "Internal 2.4 GHz ExpressLRS RF; no external module-bay or host CRSF transport",
      note: "USB is used for EdgeTX and firmware configuration. It is not the RF link and does not prove transmission.",
    },
    hostLink: {
      internalRf: {
        note: "Configure the handset's built-in RF module in EdgeTX. No target-local host baud or external module is part of this radio endpoint.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [
        { region: "LBT", dbm: 20, mw: 100 },
      ],
      menuVerified: false,
      note: "RadioMaster states that maximum power is hardware dependent and that the LBT/CE edition is limited to 100 mW. The FCC maximum and default drive value are not stated here.",
    },
    source: "RadioMaster Pocket product page and official user manual",
    sourceUrl: "https://radiomasterrc.com/products/pocket-radio-controller-m2",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/Pocket_A1.8.pdf?v=1770617495",
  },
  {
    id: "radiomaster-tx16s-mkii-elrs-24-tx",
    name: "RadioMaster TX16S Mark II Internal ELRS 2.4 GHz",
    description: "EdgeTX full-size handset with internal ExpressLRS 2.4 GHz RF using an SX1280 transmitter module.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "internal-rf",
    defaultHostBay: "verify",
    supportedHostBays: [],
    firmwareVersion: "EdgeTX with internal ExpressLRS",
    roles: ["tx"],
    packetRateModes: ["25", "50", "100-full", "150", "250", "500"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "Internal 2.4 GHz ExpressLRS SX1280 RF; no external module-bay or host CRSF transport",
      note: "USB and SD card are used for EdgeTX and firmware configuration. They are not the RF link and do not prove transmission.",
    },
    hostLink: {
      internalRf: {
        note: "Configure the fitted TX16S Mark II internal ELRS module in EdgeTX. The handset's 6.6-8.4 V radio supply and 450-530 mA ELRS working current do not define the aircraft power path.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [
        { region: "LBT", dbm: 20, mw: 100 },
      ],
      menuVerified: false,
      note: "RadioMaster states that FCC maximum power depends on the installed hardware and that the LBT/CE edition is limited to 100 mW. The default drive value is not published here.",
    },
    source: "RadioMaster TX16S Mark II product page, comparison chart, and official manual",
    sourceUrl: "https://radiomasterrc.com/products/tx16s-mark-ii-radio-controller",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/TX16SMKII_2.0.pdf?v=1770617496",
  },
  {
    id: "radiomaster-tx12-mkii-elrs-24-tx",
    name: "RadioMaster TX12 Mark II Internal ELRS 2.4 GHz",
    description: "Compact EdgeTX handset with internal ExpressLRS 2.4 GHz RF using an SX1280 transmitter module.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    defaultHostTransport: "internal-rf",
    defaultHostBay: "verify",
    supportedHostBays: [],
    firmwareVersion: "EdgeTX with internal ExpressLRS",
    roles: ["tx"],
    packetRateModes: ["25", "50", "100-full", "150", "250", "500"],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "Internal 2.4 GHz ExpressLRS SX1280 RF; no external module-bay or host CRSF transport",
      note: "USB and SD card are used for EdgeTX and firmware configuration. They are not the RF link and do not prove transmission.",
    },
    hostLink: {
      internalRf: {
        note: "Configure the fitted TX12 Mark II internal ELRS module in EdgeTX. The radio's 6.6-8.4 V supply and 310-350 mA ELRS working current are handset electrical values, not an aircraft power-path specification.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [
        { region: "LBT", dbm: 20, mw: 100 },
      ],
      menuVerified: false,
      note: "RadioMaster states that FCC maximum power depends on the installed hardware and that the LBT/CE edition is limited to 100 mW. The default drive value is not published here.",
    },
    source: "RadioMaster TX12 Mark II product page, comparison chart, and official manual",
    sourceUrl: "https://radiomasterrc.com/products/tx12-mark-ii-radio-controller",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/TX12MKII_A2.0.pdf?v=1770617495",
  },
  {
    id: "radiomaster-nomad-gemini-xrossband-tx",
    name: "RadioMaster Nomad Gemini Xrossband",
    description: "Dual LR1121 module for simultaneous 2.4 GHz and 868/900 MHz Gemini Xrossband transmission, with JR micro and Nano bay adapters.",
    frequency: "2.4 GHz / Sub-G 900 MHz (Gemini Xrossband)",
    frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
    defaultHostTransport: "module-bay",
    defaultHostBay: "jr-micro-5",
    supportedHostBays: ["jr-micro-5", "nano-8"],
    firmwareVersion: "ExpressLRS with Gemini Xrossband",
    roles: ["tx"],
    packetRateModes: [
      "50",
      "100-full",
      "sub200-full",
      "sub250",
      "500",
      "x100-full",
      "x150",
    ],
    serial: {
      txBaud: null,
      rxBaud: null,
      frame: "CRSF through the included Micro or Nano module-bay adapter; confirm handset pinout and rate",
      note: "RadioMaster documents the bay adapters and XT30 supply but does not publish a host UART baud or default RF drive value.",
    },
    hostLink: {
      nativeUsb: false,
      uart: null,
      moduleBay: {
        bayType: "jr-micro-5",
        pins: "Micro standard 5-pin socket plus included Nano 8-pin adapter; confirm CRSF direction",
        voltage: "DC 6-16.8 V through XT30",
        note: "Use the adapter appropriate to the handset. Verify CRSF direction, ground, supply, antenna fit, and fitted RF-domain variant before power.",
      },
    },
    power: {
      defaultDbm: null,
      defaultMw: null,
      regulatoryMaxima: [],
      menuVerified: false,
      note: "RadioMaster describes the module as high power but does not publish a default drive or maximum RF-power table on the product page. Use only the value documented for the fitted regulatory variant.",
    },
    source: "RadioMaster Nomad Gemini Xrossband product page",
    sourceUrl: "https://radiomasterrc.com/products/nomad-gemini-xrossband-expresslrs-module",
  },
  {
    id: "generic-elrs-24-tx",
    name: "Generic ExpressLRS 2.4 GHz TX",
    description: "Planning profile for a handset or USB ExpressLRS transmitter.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    allowUnverifiedHostTransports: true,
    allowUnverifiedHostBays: true,
    defaultHostBay: "verify",
    roles: ["tx"],
    serial: {
      txBaud: 400000,
      rxBaud: null,
      frame: "Confirm against the module and handset firmware",
      note: "Baud rate and USB behaviour are target-specific.",
    },
    source: "Aerial Kit CRSF handset defaults; confirm against the actual target",
  },
  {
    id: "generic-elrs-24-rx",
    name: "Generic ExpressLRS 2.4 GHz RX",
    description: "Planning profile for a receiver connected to the flight controller.",
    frequency: "2.4 GHz",
    frequencyBands: ["2.4 GHz"],
    allowUnverifiedHostTransports: true,
    allowUnverifiedHostBays: true,
    defaultHostBay: "verify",
    roles: ["rx"],
    serial: {
      txBaud: null,
      rxBaud: 420000,
      frame: "Confirm against the receiver and flight controller",
      note: "The receiver-to-FC UART rate is normally 420000 baud.",
    },
    source: "Aerial Kit CRSF receiver defaults; confirm against the actual target",
  },
];

const RADIO_TARGET_GROUP_DEFINITIONS = {
  internal: { id: "internal", label: "Internal RF handset", order: 1 },
  usb: { id: "usb", label: "USB serial device", order: 2 },
  rf24: { id: "rf24", label: "2.4 GHz module bay", order: 3 },
  xrossband: { id: "xrossband", label: "Dual-band module bay", order: 4 },
  subghz: { id: "subghz", label: "Sub-G 900 MHz module bay", order: 5 },
  generic: { id: "generic", label: "Generic / verify", order: 6 },
};

export function getRadioTargetGroup(target) {
  if (target?.allowUnverifiedHostTransports || target?.allowUnverifiedHostBays) {
    return RADIO_TARGET_GROUP_DEFINITIONS.generic;
  }
  if (target?.defaultHostTransport === "internal-rf") {
    return RADIO_TARGET_GROUP_DEFINITIONS.internal;
  }
  if (target?.defaultHostTransport === "native-usb") {
    return RADIO_TARGET_GROUP_DEFINITIONS.usb;
  }
  if (
    target?.frequencyBands?.includes("2.4 GHz")
    && target.frequencyBands.includes("Sub-G 900 MHz")
  ) {
    return RADIO_TARGET_GROUP_DEFINITIONS.xrossband;
  }
  if (target?.frequencyBands?.includes("Sub-G 900 MHz")) {
    return RADIO_TARGET_GROUP_DEFINITIONS.subghz;
  }
  if (target?.roles?.includes("tx")) {
    return RADIO_TARGET_GROUP_DEFINITIONS.rf24;
  }
  return RADIO_TARGET_GROUP_DEFINITIONS.generic;
}

export function groupRadioTargets(targets) {
  const groups = new Map();
  for (const target of targets || []) {
    const definition = getRadioTargetGroup(target);
    if (!groups.has(definition.id)) {
      groups.set(definition.id, { ...definition, targets: [] });
    }
    groups.get(definition.id).targets.push(target);
  }
  return Array.from(groups.values()).sort(
    (left, right) => left.order - right.order,
  );
}

export const RADIO_PACKET_RATES = [
  { value: "25", hz: 25, label: "25 Hz", note: "Lowest refresh option" },
  { value: "50", hz: 50, label: "50 Hz", note: "More robust link, lower control rate" },
  { value: "100-full", hz: 100, label: "100 Hz Full", note: "Longer range mode" },
  { value: "x100-full", hz: 100, label: "X100 Full", note: "Simultaneous dual-band Gemini mode with full channel resolution" },
  { value: "150", hz: 150, label: "150 Hz", note: "Balanced control rate" },
  { value: "x150", hz: 150, label: "X150", note: "Simultaneous dual-band Gemini mode" },
  { value: "200", hz: 200, label: "200 Hz", note: "Bandit maximum refresh" },
  { value: "sub200-full", hz: 200, label: "Sub-G 200 Full", note: "Full-resolution Sub-G 900 MHz mode" },
  { value: "250", hz: 250, label: "250 Hz", note: "Bench-tested with 25 mW" },
  { value: "sub250", hz: 250, label: "Sub-G 250", note: "High-rate Sub-G 900 MHz mode" },
  { value: "333-full", hz: 333, label: "333 Hz Full", note: "High-rate full-resolution mode" },
  { value: "500", hz: 500, label: "500 Hz", note: "Race-oriented rate" },
  { value: "d250", hz: 250, label: "D250", note: "ExpressLRS mode name; confirm target support" },
  { value: "d500", hz: 500, label: "D500", note: "ExpressLRS mode name; confirm target support" },
  { value: "f500", hz: 500, label: "F500", note: "ExpressLRS mode name; confirm target support" },
  { value: "f1000", hz: 1000, label: "F1000", note: "Maximum-rate mode; confirm target support" },
];

export const RADIO_POWER_LEVELS = [
  { value: -18, menuMw: 10, label: "-18 dBm / 10 mW menu", note: "Lowest SX1280 drive setting" },
  { value: -14, menuMw: 25, label: "-14 dBm / 25 mW menu", note: "Bench-tested link setting" },
  { value: -10, menuMw: 50, label: "-10 dBm / 50 mW menu", note: "Medium drive setting" },
  { value: -6, menuMw: 100, label: "-6 dBm / 100 mW menu", note: "High drive setting" },
  { value: 5, menuMw: 250, label: "+5 dBm / 250 mW menu", note: "Maximum RFX2401C input setting" },
];

export const RADIO_TELEMETRY_RATIOS = [
  { value: "std", label: "Standard" },
  { value: "off", label: "Off" },
  { value: "1:128", label: "1:128" },
  { value: "1:64", label: "1:64" },
  { value: "1:32", label: "1:32" },
  { value: "1:16", label: "1:16" },
  { value: "1:8", label: "1:8" },
  { value: "1:4", label: "1:4" },
  { value: "1:2", label: "1:2" },
  { value: "race", label: "Race" },
];

export const RADIO_SWITCH_MODES = [
  { value: "wide", label: "Dynamic: Wide", note: "Recommended for standard-width packet rates" },
  { value: "hybrid", label: "Dynamic: Hybrid", note: "Firmware-dependent preset" },
  { value: "8ch-rate2", label: "8ch Rate/2", note: "Fixed switch mode" },
  { value: "12ch-mixed", label: "12ch Mixed", note: "Fixed switch mode" },
  { value: "16ch-rate2", label: "16ch Rate/2", note: "Fixed switch mode" },
];

const FULL_RESOLUTION_PACKET_RATES = new Set([
  "100-full",
  "x100-full",
  "sub200-full",
  "333-full",
]);
const NORMAL_SWITCH_MODES = new Set(["wide", "hybrid"]);
const FULL_RESOLUTION_SWITCH_MODES = new Set([
  "8ch-rate2",
  "12ch-mixed",
  "16ch-rate2",
]);

const STANDARD_TELEMETRY_RATIOS = Object.freeze({
  "50": "1:16",
  "100-full": "1:32",
  "150": "1:32",
  "250": "1:64",
  "333-full": "1:128",
  "500": "1:128",
  d250: "1:128",
  d500: "1:128",
  f500: "1:128",
  f1000: "1:128",
});

export const RADIO_LINK_MODES = [
  { value: "normal", label: "Normal CRSF" },
  { value: "mavlink", label: "MAVLink" },
];

export const RADIO_DYNAMIC_POWER = [
  { value: "off", label: "Off" },
  { value: "dynamic", label: "Dynamic" },
  { value: "aux9", label: "AUX 9" },
  { value: "aux10", label: "AUX 10" },
  { value: "aux11", label: "AUX 11" },
  { value: "aux12", label: "AUX 12" },
];

export const RADIO_HOST_TRANSPORTS = [
  {
    value: "native-usb",
    label: "Native USB CDC",
    note: "Use the target's USB data port; USB CDC ignores the logical UART rate.",
  },
  {
    value: "uart",
    label: "Host UART",
    note: "Use the target-specific host UART and confirm its electrical level and pinout.",
  },
  {
    value: "module-bay",
    label: "Handset module bay",
    note: "Seat the module in a compatible bay and verify its supply, ground, and CRSF pin direction against both devices.",
  },
  {
    value: "internal-rf",
    label: "Internal RF module",
    note: "Configure the handset's built-in RF system; no external module or host CRSF wiring is part of the endpoint.",
  },
  {
    value: "unspecified",
    label: "Verify target transport",
    note: "No host-signal map is bundled for this planning target.",
  },
];

export const RADIO_HOST_BAYS = [
  {
    value: "native-usb",
    label: "Native USB",
    note: "Connect directly through the documented native USB endpoint.",
  },
  {
    value: "nano-8",
    label: "Nano 8-pin bay",
    note: "Nano-style module bay with the documented CRSF, ground, and supply pins.",
  },
  {
    value: "jr-micro-5",
    label: "JR-style micro 5-pin bay",
    note: "Micro-sized JR-style module bay with the documented five-pin interface.",
  },
  {
    value: "jr-standard-5",
    label: "JR standard 5-pin bay",
    note: "Full JR-style module bay; verify the adapter and handset pinout.",
  },
  {
    value: "verify",
    label: "Verify handset bay",
    note: "No physical handset-bay fit is selected.",
  },
];

export const RADIO_HANDSETS = [
  {
    id: "verify",
    name: "Verify handset",
    supportedHostBays: [],
    note: "No handset model is selected. Verify the physical module bay before powering.",
  },
  {
    id: "radiomaster-boxer",
    name: "RadioMaster Boxer",
    firmware: "EdgeTX",
    supportedHostBays: ["jr-standard-5"],
    note: "The official manual identifies the external module bay as JR compatible.",
    sourceUrl: "https://radiomasterrc.com/products/boxer-radio-controller-m2",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/BOXER_A1.9.pdf?v=1770617495",
  },
  {
    id: "radiomaster-tx16s-mkii",
    name: "RadioMaster TX16S MKII",
    firmware: "EdgeTX",
    supportedHostBays: ["jr-standard-5"],
    note: "The official manual identifies the external module bay as JR compatible.",
    sourceUrl: "https://radiomasterrc.com/products/tx16s-mark-ii-radio-controller",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/TX16SMKII_2.0.pdf?v=1770617496",
  },
  {
    id: "radiomaster-tx12-mkii",
    name: "RadioMaster TX12 MKII",
    firmware: "EdgeTX",
    supportedHostBays: ["jr-standard-5"],
    note: "The official manual identifies the external module bay as JR compatible.",
    sourceUrl: "https://radiomasterrc.com/products/tx12-mark-ii-radio-controller",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/TX12MKII_A2.0.pdf?v=1770617495",
  },
  {
    id: "radiomaster-pocket",
    name: "RadioMaster Pocket",
    firmware: "EdgeTX",
    supportedHostBays: ["nano-8"],
    note: "The official manual identifies the external module bay as Nano compatible.",
    sourceUrl: "https://radiomasterrc.com/products/pocket-radio-controller-m2",
    manualUrl: "https://cdn.shopify.com/s/files/1/0701/8066/7584/files/Pocket_A1.8.pdf?v=1770617495",
  },
];

export const RADIO_CHANNEL_ROLES = [
  { key: "roll", fcRole: null, label: "Roll", channel: 1, aerialKitSupported: true },
  { key: "pitch", fcRole: null, label: "Pitch", channel: 2, aerialKitSupported: true },
  { key: "throttle", fcRole: null, label: "Throttle", channel: 3, aerialKitSupported: true },
  { key: "yaw", fcRole: null, label: "Yaw", channel: 4, aerialKitSupported: true },
  { key: "flightMode", fcRole: "flightMode", label: "Flight mode", channel: 5, aerialKitSupported: true },
  { key: "arm", fcRole: "arm", label: "Arm", channel: 6, aerialKitSupported: true },
  { key: "velocity", fcRole: "velocity", label: "Velocity mode", channel: null, optional: true, aerialKitSupported: true },
  { key: "mission", fcRole: "mission", label: "Mission switch", channel: null, optional: true, aerialKitSupported: true },
  { key: "launch", fcRole: "launch", label: "Hand launch", channel: null, optional: true, aerialKitSupported: true },
  { key: "beeper", fcRole: "beeper", label: "Beeper / AUX5", channel: 9, optional: true, aerialKitSupported: false },
  { key: "manual", fcRole: "manual", label: "Manual override", channel: null, optional: true, aerialKitSupported: false },
  { key: "control", fcRole: "control", label: "Control mode", channel: null, optional: true, aerialKitSupported: false },
  { key: "systemId", fcRole: "systemId", label: "System ID", channel: null, optional: true, aerialKitSupported: false },
];

export const DEFAULT_RADIO_CONFIG = {
  planVersion: 3,
  targetId: "aerialkit-elrs-rev-a3",
  selectedReceiverId: null,
  role: "tx",
  hostTransport: "native-usb",
  hostBay: "native-usb",
  handsetId: "verify",
  packetRateMode: "250",
  powerDbm: -18,
  regulatoryRegion: null,
  telemetryRatio: "std",
  switchMode: "wide",
  linkMode: "normal",
  dynamicPower: "off",
  modelMatch: false,
  bindingPhrase: "",
  uid: "",
  antennaConfirmed: false,
  roleSwitchConfirmed: false,
  channelMap: Object.fromEntries(
    RADIO_CHANNEL_ROLES.map((channel) => [channel.key, channel.channel]),
  ),
};

export function getRadioTarget(targetId) {
  return RADIO_TARGETS.find((target) => target.id === targetId) || RADIO_TARGETS[0];
}

export function getRadioTargetsForRole(role) {
  return RADIO_TARGETS.filter((target) => target.roles.includes(role));
}

function normalizedFrequencyBand(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getRadioReceiverBandCompatibility(targetId, receiver = null) {
  const target = getRadioTarget(targetId);
  const targetBandLabels = Array.isArray(target.frequencyBands)
    ? target.frequencyBands.filter(Boolean)
    : [];
  const receiverBandLabels = Array.isArray(receiver?.frequencyBands)
    ? receiver.frequencyBands.filter(Boolean)
    : [];
  const targetBands = targetBandLabels.map(normalizedFrequencyBand);
  const receiverBands = receiverBandLabels.map(normalizedFrequencyBand);
  if (!receiver?.id || targetBands.length === 0 || receiverBands.length === 0) {
    return {
      status: "unverified",
      targetBands,
      receiverBands,
      sharedBands: [],
      targetBandLabels,
      receiverBandLabels,
      sharedBandLabels: [],
    };
  }
  const sharedBands = targetBands.filter((band) => receiverBands.includes(band));
  const sharedBandLabels = targetBandLabels.filter(
    (label) => sharedBands.includes(normalizedFrequencyBand(label)),
  );
  const receiverBandCoverageComplete = receiverBands.length > 0
    && receiverBands.every((band) => targetBands.includes(band));
  return {
    status: sharedBands.length ? "compatible" : "conflict",
    targetBands,
    receiverBands,
    sharedBands,
    targetBandLabels,
    receiverBandLabels,
    sharedBandLabels,
    receiverBandCoverageComplete,
  };
}

export function getSuggestedRadioTargetForReceiver(targetId, receiver = null) {
  const current = getRadioTarget(targetId);
  const currentBands = getRadioReceiverBandCompatibility(current.id, receiver);
  if (
    current.roles.includes("tx")
    && currentBands.status === "compatible"
    && currentBands.receiverBandCoverageComplete
  ) {
    return current;
  }
  const completeCoverageTarget = RADIO_TARGETS
    .filter((target) => {
    if (!target.roles.includes("tx") || target.allowUnverifiedHostTransports) {
      return false;
    }
    const compatibility = getRadioReceiverBandCompatibility(target.id, receiver);
    return compatibility.status === "compatible"
      && compatibility.receiverBandCoverageComplete;
    })
    .sort((left, right) => (
      (left.frequencyBands?.length || 0) - (right.frequencyBands?.length || 0)
    ))[0];
  if (completeCoverageTarget) return completeCoverageTarget;
  return current.roles.includes("tx") && currentBands.status === "compatible"
    ? current
    : null;
}

export function getRadioHostTransports(targetId) {
  const target = getRadioTarget(targetId);
  if (target.allowUnverifiedHostTransports) return [...RADIO_HOST_TRANSPORTS];
  return RADIO_HOST_TRANSPORTS.filter((transport) => {
    if (transport.value === "unspecified") return true;
    if (transport.value === target.defaultHostTransport) return true;
    if (transport.value === "native-usb") return Boolean(target.hostLink?.nativeUsb);
    if (transport.value === "uart") return Boolean(target.hostLink?.uart);
    if (transport.value === "module-bay") return Boolean(target.hostLink?.moduleBay);
    if (transport.value === "internal-rf") return Boolean(target.hostLink?.internalRf);
    return false;
  });
}

export function getDefaultHostTransport(targetId) {
  const target = getRadioTarget(targetId);
  const transports = getRadioHostTransports(target.id);
  return transports.some((transport) => transport.value === target.defaultHostTransport)
    ? target.defaultHostTransport
    : transports[transports.length - 1]?.value || "unspecified";
}

export function getRadioHostBay(hostBay) {
  return RADIO_HOST_BAYS.find((option) => option.value === hostBay)
    || RADIO_HOST_BAYS.find((option) => option.value === "verify");
}

export function getRadioHandset(handsetId) {
  return RADIO_HANDSETS.find((handset) => handset.id === handsetId)
    || RADIO_HANDSETS[0];
}

export function getRadioHandsetBayCompatibility(handsetId, hostBay) {
  const handset = getRadioHandset(handsetId);
  if (handset.id === "verify" || hostBay === "verify") {
    return { status: "unverified", handset };
  }
  return {
    status: handset.supportedHostBays.includes(hostBay)
      ? "compatible"
      : "conflict",
    handset,
  };
}

export function getDefaultHostBay(targetId) {
  const target = getRadioTarget(targetId);
  return getRadioHostBay(target.defaultHostBay).value;
}

export function isRadioHostBayCompatible(targetId, hostBay) {
  const target = getRadioTarget(targetId);
  if (target.allowUnverifiedHostBays) return true;
  if (!Array.isArray(target.supportedHostBays)) return true;
  return target.supportedHostBays.includes(hostBay);
}

export function getRadioTargetForRole(role, preferredTargetId = null) {
  const preferred = RADIO_TARGETS.find(
    (target) => target.id === preferredTargetId && target.roles.includes(role),
  );
  return preferred || getRadioTargetsForRole(role)[0] || RADIO_TARGETS[0];
}

export function getSuggestedTelemetryRatio(packetRateMode) {
  return STANDARD_TELEMETRY_RATIOS[packetRateMode] || null;
}

export function getAvailableSwitchModes(packetRateMode, linkMode) {
  if (
    linkMode === "mavlink" &&
    FULL_RESOLUTION_PACKET_RATES.has(packetRateMode)
  ) {
    return ["16ch-rate2"];
  }
  if (linkMode === "mavlink") return ["hybrid"];
  return FULL_RESOLUTION_PACKET_RATES.has(packetRateMode)
    ? [...FULL_RESOLUTION_SWITCH_MODES]
    : [...NORMAL_SWITCH_MODES];
}

export function getRadioPowerLevels(targetId) {
  return targetId === "aerialkit-elrs-rev-a3" ? RADIO_POWER_LEVELS : null;
}

export function getRadioPowerSpec(targetId) {
  return getRadioTarget(targetId).power || null;
}

export function getDefaultPowerDbm(targetId) {
  const defaultPower = getRadioPowerSpec(targetId)?.defaultDbm;
  if (Number.isFinite(defaultPower)) return defaultPower;
  return getRadioPowerLevels(targetId)?.[0]?.value ?? null;
}

export function getRadioRegulatoryOptions(targetId) {
  return (getRadioPowerSpec(targetId)?.regulatoryMaxima || []).map((limit) => ({
    value: String(limit.region).toLowerCase(),
    label: limit.region,
    dbm: Number(limit.dbm),
    mw: Number(limit.mw),
  }));
}

export function getRadioRegulatoryLimit(targetId, regulatoryRegion) {
  const region = String(regulatoryRegion || "").toLowerCase();
  if (!region || region === "verify") return null;
  return getRadioRegulatoryOptions(targetId)
    .find((option) => option.value === region) || null;
}

export function getDefaultRegulatoryRegion(targetId) {
  return getRadioRegulatoryOptions(targetId).length ? "verify" : null;
}

export function getRadioChannelRoles(channelLimit = 16, controlRoles = null) {
  const allowedFcRoles = Array.isArray(controlRoles) ? new Set(controlRoles) : null;
  return RADIO_CHANNEL_ROLES.filter((role) => {
    if (allowedFcRoles && role.fcRole) return allowedFcRoles.has(role.fcRole);
    if (channelLimit <= 8 && !role.aerialKitSupported) return false;
    return true;
  });
}

export function sanitizeRadioChannelMap(
  channelMap,
  { channelLimit = 16, controlRoles = null } = {},
) {
  const visibleKeys = new Set(
    getRadioChannelRoles(channelLimit, controlRoles).map((role) => role.key),
  );
  return Object.fromEntries(
    RADIO_CHANNEL_ROLES.map((role) => [
      role.key,
      visibleKeys.has(role.key) ? normalizeChannel(channelMap?.[role.key]) : null,
    ]),
  );
}

export function getPacketRatesForTarget(targetId) {
  const target = getRadioTarget(targetId);
  return target.packetRateModes
    ? RADIO_PACKET_RATES.filter((rate) => target.packetRateModes.includes(rate.value))
    : RADIO_PACKET_RATES;
}

export function getRadioPacketIntervalMs(packetRateMode) {
  const rate = RADIO_PACKET_RATES.find(
    (candidate) => candidate.value === packetRateMode,
  );
  return rate?.hz > 0 ? 1000 / rate.hz : null;
}

export function buildFcRadioTimingWarning(fcPlan, radioPlan) {
  if (
    !fcPlan
    || !radioPlan
    || fcPlan.receiverProtocol !== "crsf"
  ) {
    return null;
  }
  const intervalMs = getRadioPacketIntervalMs(radioPlan.packetRateMode);
  const timeoutMs = Number(fcPlan.rcTimeoutMs);
  if (
    intervalMs == null
    || !Number.isFinite(timeoutMs)
    || timeoutMs <= 0
    || timeoutMs >= intervalMs * 2
  ) {
    return null;
  }
  const rate = RADIO_PACKET_RATES.find(
    (candidate) => candidate.value === radioPlan.packetRateMode,
  );
  return {
    code: "fc-radio-timeout",
    message:
      `The ${rate?.label || radioPlan.packetRateMode} profile sends nominal control frames about ${intervalMs.toFixed(1)} ms apart. `
      + `The planned receiver timeout is ${timeoutMs} ms, spanning ${(timeoutMs / intervalMs).toFixed(2)} intervals. `
      + "Review the intended loss handling before deployment; RF behavior remains untested.",
    intervalMs,
    timeoutMs,
    intervalCount: timeoutMs / intervalMs,
  };
}

function normalizeChannel(channel) {
  if (channel === "" || channel == null) return null;
  const numeric = Number(channel);
  return Number.isInteger(numeric) ? numeric : channel;
}

export function normalizeRadioConfig(config = {}) {
  const channelMap = {
    ...DEFAULT_RADIO_CONFIG.channelMap,
    ...(config.channelMap || {}),
  };
  const targetId = config.targetId || DEFAULT_RADIO_CONFIG.targetId;
  const regulatoryOptions = getRadioRegulatoryOptions(targetId);
  const regulatoryRegion = String(config.regulatoryRegion || "").toLowerCase();
  const hostBay = getRadioHostBay(
    config.hostBay || getDefaultHostBay(targetId),
  ).value;
  const handsetId = getRadioHandset(config.handsetId).id;
  return {
    ...DEFAULT_RADIO_CONFIG,
    ...config,
    regulatoryRegion: regulatoryOptions.length > 0
      ? regulatoryRegion === "verify" || regulatoryOptions.some(
        (option) => option.value === regulatoryRegion,
      )
        ? regulatoryRegion
        : "verify"
      : null,
    hostBay,
    handsetId,
    hostTransport: RADIO_HOST_TRANSPORTS.some(
      (transport) => transport.value === config.hostTransport,
    )
      ? config.hostTransport
      : DEFAULT_RADIO_CONFIG.hostTransport,
    channelMap: Object.fromEntries(
      Object.entries(channelMap).map(([role, channel]) => [
        role,
        normalizeChannel(channel),
      ]),
    ),
  };
}

export function normalizedUid(value) {
  return String(value || "").replace(/[^0-9a-f]/gi, "").toLowerCase();
}

export function bindingPhraseByteLength(value) {
  let bytes = 0;
  for (const character of String(value || "")) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

export function isValidUidFormat(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  return /^[0-9a-f]{12}$/i.test(raw.replace(/[:\s-]/g, ""));
}

export function getRadioBindingValidationMessage(config = {}) {
  const phrase = String(config.bindingPhrase || "").trim();
  const uid = String(config.uid || "").trim();
  if (phrase && uid) {
    return "Choose either a binding phrase or a direct UID before saving.";
  }
  if (bindingPhraseByteLength(phrase) > 48) {
    return "Shorten the binding phrase to 48 UTF-8 bytes or less before saving.";
  }
  if (uid && !isValidUidFormat(uid)) {
    return "Correct the UID format before saving.";
  }
  return "";
}

export function isUnboundUid(value) {
  const uid = normalizedUid(value);
  return uid.length === 12 && /^0{12}$/.test(uid);
}

export function hasStagedBinding(config) {
  const normalized = normalizeRadioConfig(config);
  const phrase = String(normalized.bindingPhrase || "").trim();
  const uid = normalizedUid(normalized.uid);
  return Boolean(phrase || (isValidUidFormat(normalized.uid) && uid && !isUnboundUid(uid)));
}

export function buildRadioWarnings(
  config,
  { channelLimit = 16, controlRoles = null, receiver = null } = {},
) {
  const base = normalizeRadioConfig(config);
  const normalized = {
    ...base,
    channelMap: sanitizeRadioChannelMap(base.channelMap, {
      channelLimit,
      controlRoles,
    }),
  };
  const target = getRadioTarget(normalized.targetId);
  const handset = getRadioHandset(normalized.handsetId);
  const handsetBayCompatibility = getRadioHandsetBayCompatibility(
    normalized.handsetId,
    normalized.hostBay,
  );
  const visibleChannelRoles = getRadioChannelRoles(channelLimit, controlRoles);
  const packetRates = getPacketRatesForTarget(target.id);
  const powerLevels = getRadioPowerLevels(target.id);
  const regulatoryOptions = getRadioRegulatoryOptions(target.id);
  const warnings = [];

  if (!target.roles.includes(normalized.role)) {
    warnings.push(
      `${target.name} is a ${target.roles.join("/").toUpperCase()} endpoint profile and cannot represent the selected ${normalized.role.toUpperCase()} role.`,
    );
  }
  if (
    normalized.hostTransport === "module-bay" &&
    !isRadioHostBayCompatible(target.id, normalized.hostBay)
  ) {
    const supported = (target.supportedHostBays || [])
      .map((bay) => getRadioHostBay(bay).label)
      .join(" or ");
    warnings.push(
      `${target.name} does not fit the selected ${getRadioHostBay(normalized.hostBay).label}.${supported ? ` Use ${supported}.` : ""}`,
    );
  }
  if (
    normalized.hostTransport === "module-bay" &&
    handsetBayCompatibility.status === "conflict"
  ) {
    warnings.push(
      `${handset.name} is documented with ${handset.supportedHostBays
        .map((bay) => getRadioHostBay(bay).label)
        .join(" or ")}, not the selected ${getRadioHostBay(normalized.hostBay).label}. Verify any adapter before fitting the module.`,
    );
  }
  const bandCompatibility = getRadioReceiverBandCompatibility(
    target.id,
    receiver,
  );
  if (bandCompatibility.status === "conflict") {
    warnings.push(
      `${receiver.name || "The selected receiver"} does not share a documented RF band with ${target.name}.`,
    );
  } else if (
    bandCompatibility.status === "compatible"
    && !bandCompatibility.receiverBandCoverageComplete
  ) {
    const uncoveredBands = bandCompatibility.receiverBandLabels.filter(
      (label) => !bandCompatibility.sharedBandLabels.includes(label),
    );
    warnings.push(
      `${target.name} covers ${bandCompatibility.sharedBandLabels.join(" / ")} but does not configure the receiver's ${uncoveredBands.join(" / ")} band${uncoveredBands.length === 1 ? "" : "s"}.`,
    );
  }
  if (!packetRates.some((rate) => rate.value === normalized.packetRateMode)) {
    warnings.push(
      `${target.name} does not support ${normalized.packetRateMode} as a selected packet-rate mode.`,
    );
  }
  if (!normalized.antennaConfirmed) {
    warnings.push("Fit and verify the antenna or RF load before powering either radio role.");
  }
  if (powerLevels && !powerLevels.some(
    (level) => level.value === Number(normalized.powerDbm),
  )) {
    warnings.push(
      `${target.name} power must be one of ${powerLevels.map((level) => level.value).join(", ")} dBm.`,
    );
  } else if (
    normalized.powerDbm == null ||
    !Number.isFinite(Number(normalized.powerDbm))
  ) {
    warnings.push("Set a finite TX power value for this target.");
  }
  if (target.id === "aerialkit-elrs-rev-a3" && !normalized.roleSwitchConfirmed) {
    warnings.push("SW2 selects the Rev A3 role at boot. Verify it by continuity before power-up.");
  }
  if (!hasStagedBinding(normalized)) {
    warnings.push("No binding phrase or UID is staged. This plan is not a paired-link configuration yet.");
  }
  const bindingIdentity = getBindingIdentity(normalized);
  if (bindingIdentity.phraseBytes > 48) {
    warnings.push("ExpressLRS binding phrases must fit in 48 UTF-8 bytes.");
  }
  if (normalized.uid && !isValidUidFormat(normalized.uid)) {
    warnings.push("An ExpressLRS UID must contain six bytes, or 12 hexadecimal digits.");
  }
  if (String(normalized.bindingPhrase || "").trim() && normalized.uid) {
    warnings.push("Use either a binding phrase or a direct UID, not both. The intended identity is ambiguous.");
  }
  if (isUnboundUid(normalized.uid)) {
    warnings.push("An all-zero UID is unbound. Enter a shared phrase or a non-zero six-byte UID.");
  }
  const fullResolutionMode = FULL_RESOLUTION_PACKET_RATES.has(
    normalized.packetRateMode,
  );
  const normalSwitchMode = NORMAL_SWITCH_MODES.has(normalized.switchMode);
  const fixedSwitchMode = FULL_RESOLUTION_SWITCH_MODES.has(normalized.switchMode);
  if (
    normalized.linkMode !== "mavlink" &&
    fullResolutionMode &&
    !fixedSwitchMode
  ) {
    warnings.push(
      "100 Full and 333 Full packet rates require an 8ch, 12ch Mixed, or 16ch Rate/2 switch mode.",
    );
  }
  if (
    normalized.linkMode !== "mavlink" &&
    !fullResolutionMode &&
    !normalSwitchMode
  ) {
    warnings.push(
      "Normal, D, and F packet rates require the Wide or Hybrid switch mode.",
    );
  }
  if (normalized.linkMode === "mavlink") {
    if (normalized.telemetryRatio !== "1:2") {
      warnings.push("MAVLink forces the telemetry ratio to 1:2.");
    }
    if (fullResolutionMode && normalized.switchMode !== "16ch-rate2") {
      warnings.push(
        "MAVLink with 100 Full or 333 Full requires the 16ch Rate/2 switch mode.",
      );
    }
    if (!fullResolutionMode && normalized.switchMode !== "hybrid") {
      warnings.push(
        "MAVLink with normal-width packet rates uses the Hybrid switch behavior.",
      );
    }
  }
  if (normalized.modelMatch && !hasStagedBinding(normalized)) {
    warnings.push("Model Match is enabled without a staged binding identity.");
  }
  if (target.id !== "aerialkit-elrs-rev-a3") {
    const powerSpec = getRadioPowerSpec(target.id);
    if (powerSpec?.regulatoryMaxima?.length) {
      const maxima = powerSpec.regulatoryMaxima
        .map((limit) => `${limit.region} ${limit.dbm} dBm / ${limit.mw} mW`)
        .join(", ");
      const absoluteMax = Math.max(
        ...powerSpec.regulatoryMaxima.map((limit) => Number(limit.dbm)),
      );
      const regulatoryLimit = getRadioRegulatoryLimit(
        target.id,
        normalized.regulatoryRegion,
      );
      if (!normalized.regulatoryRegion || normalized.regulatoryRegion === "verify") {
        const fittedHardware = target.hostLink?.internalRf
          ? "handset RF edition"
          : "module";
        warnings.push(
          `Verify whether the fitted ${fittedHardware} is FCC or CE, and its local limit. Published maxima: ${maxima}.`,
        );
      } else if (!regulatoryOptions.some(
        (option) => option.value === String(normalized.regulatoryRegion).toLowerCase(),
      )) {
        warnings.push(
          `The selected RF region is not documented for ${target.name}.`,
        );
      } else if (
        Number.isFinite(Number(normalized.powerDbm)) &&
        Number(normalized.powerDbm) > regulatoryLimit.dbm
      ) {
        warnings.push(
          `${target.name} power exceeds the selected ${regulatoryLimit.label} maximum of ${regulatoryLimit.dbm} dBm / ${regulatoryLimit.mw} mW.`,
        );
      }
      if (
        Number.isFinite(Number(normalized.powerDbm)) &&
        Number(normalized.powerDbm) > absoluteMax
      ) {
        warnings.push(
          `${target.name} power exceeds every published maximum of ${absoluteMax} dBm.`,
        );
      }
    } else {
      warnings.push(
        "No verified target-specific RF power menu is bundled for this device. Confirm its power table against the module firmware.",
      );
    }
  }

  const requiredRoles = visibleChannelRoles.filter((role) => !role.optional);
  const unmapped = requiredRoles.filter(
    (role) => !Number.isInteger(normalized.channelMap[role.key]),
  );
  if (unmapped.length > 0) {
    warnings.push(
      `Required control roles are unmapped or invalid: ${unmapped.map((role) => role.label).join(", ")}.`,
    );
  }
  const visibleKeys = new Set(visibleChannelRoles.map((role) => role.key));
  const outOfRange = Object.entries(normalized.channelMap).filter(
    ([key, channel]) => visibleKeys.has(key) && channel != null && (
      !Number.isInteger(channel) ||
      channel < 1 ||
      channel > channelLimit
    ),
  );
  if (outOfRange.length > 0) {
    warnings.push(
      `Every mapped control role must use an integer channel from 1 to ${channelLimit}.`,
    );
  }

  const usedChannels = visibleChannelRoles
    .map((role) => normalized.channelMap[role.key])
    .filter(Number.isInteger);
  if (new Set(usedChannels).size !== usedChannels.length) {
    warnings.push("Two control roles share the same channel.");
  }

  return warnings;
}

export function buildRadioSummary(config, options = {}) {
  const normalized = normalizeRadioConfig(config);
  const channelLimit = options.channelLimit || 16;
  const channelMap = sanitizeRadioChannelMap(normalized.channelMap, {
    channelLimit,
    controlRoles: options.controlRoles || null,
  });
  const bindingIdentity = getBindingIdentity(normalized);
  const target = getRadioTarget(normalized.targetId);
  const warnings = buildRadioWarnings(normalized, {
    ...options,
    channelLimit,
  });
  const receiverBandCompatibility = getRadioReceiverBandCompatibility(
    target.id,
    options.receiver || null,
  );
  const uid = normalizedUid(normalized.uid);
  const powerLevels = getRadioPowerLevels(target.id);
  const power = powerLevels?.find((level) => level.value === normalized.powerDbm)
    || null;
  const packetRates = getPacketRatesForTarget(target.id);
  const packetRate = packetRates.find(
    (rate) => rate.value === normalized.packetRateMode,
  ) || null;
  const regulatoryLimit = getRadioRegulatoryLimit(
    target.id,
    normalized.regulatoryRegion,
  );
  const hostBay = getRadioHostBay(normalized.hostBay);
  const hostBayCompatible = isRadioHostBayCompatible(
    target.id,
    normalized.hostBay,
  );
  const handset = getRadioHandset(normalized.handsetId);
  const handsetBayCompatibility = getRadioHandsetBayCompatibility(
    normalized.handsetId,
    normalized.hostBay,
  );
  return {
    schema: "rotorbench.radio-plan.v1",
    status: "draft",
    hardwareVerified: false,
    target: {
      id: target.id,
      name: target.name,
      frequency: target.frequency,
      firmwareVersion: target.firmwareVersion || null,
      benchArtifact: target.benchArtifact || null,
      serial: target.serial,
      hostLink: target.hostLink || null,
      power: target.power || null,
      sourceUrl: target.sourceUrl || null,
    },
    configuration: {
      role: normalized.role,
      hostTransport: normalized.hostTransport,
      hostBay: normalized.hostBay,
      hostBayLabel: hostBay.label,
      hostBayCompatible,
      handsetId: handset.id,
      handsetName: handset.name,
      handsetSourceUrl: handset.sourceUrl || null,
      handsetManualUrl: handset.manualUrl || null,
      handsetBayCompatible: handsetBayCompatibility.status !== "conflict",
      handsetBayStatus: handsetBayCompatibility.status,
      packetRateMode: normalized.packetRateMode,
      packetRateHz: packetRate?.hz ?? null,
      powerDbm: normalized.powerDbm,
      powerMenuMw: power?.menuMw ?? null,
      regulatoryRegion: normalized.regulatoryRegion || null,
      regulatoryMaxDbm: regulatoryLimit?.dbm ?? null,
      regulatoryMaxMw: regulatoryLimit?.mw ?? null,
      telemetryRatio: normalized.telemetryRatio,
      switchMode: normalized.switchMode,
      linkMode: normalized.linkMode,
      dynamicPower: normalized.dynamicPower,
      modelMatch: normalized.modelMatch,
      channelMap,
      selectedReceiverId: normalized.selectedReceiverId || null,
      receiverBandCompatibility,
      bindingPhraseStaged: Boolean(String(normalized.bindingPhrase || "").trim()),
      uidStaged: Boolean(isValidUidFormat(normalized.uid) && uid && !isUnboundUid(uid)),
      antennaConfirmed: normalized.antennaConfirmed,
      roleSwitchConfirmed: normalized.roleSwitchConfirmed,
      channelLimit,
    },
    warnings,
    matchesBenchSettings:
      normalized.targetId === "aerialkit-elrs-rev-a3" &&
      normalized.role === "tx" &&
      normalized.packetRateMode === "250" &&
      normalized.powerDbm === -14 &&
      normalized.antennaConfirmed &&
      normalized.roleSwitchConfirmed &&
      !bindingIdentity.unbound &&
      channelMap.arm === 5 &&
      channelMap.flightMode === 6 &&
      channelMap.velocity == null &&
      channelMap.mission == null &&
      channelMap.launch == null &&
      channelMap.beeper == null &&
      channelMap.manual == null &&
      channelMap.control == null &&
      channelMap.systemId == null,
  };
}

export function buildChannelMappingWarnings(
  flightControllerConfig,
  radioConfig,
  { channelLimit = 16, controlRoles = null } = {},
) {
  const radio = normalizeRadioConfig(radioConfig);
  const visibleKeys = new Set(
    getRadioChannelRoles(channelLimit, controlRoles).map((role) => role.key),
  );
  const warnings = [];
  const mappings = [
    ["arm", "Arm", flightControllerConfig.armChannel],
    ["flightMode", "Flight mode", flightControllerConfig.modeChannel],
    ["velocity", "Velocity mode", flightControllerConfig.velocityChannel],
    ["mission", "Mission switch", flightControllerConfig.missionChannel],
    ["launch", "Hand launch", flightControllerConfig.launchChannel],
    ["beeper", "Beeper", flightControllerConfig.beeperChannel],
    ["manual", "Manual override", flightControllerConfig.manualChannel],
    ["control", "Control mode", flightControllerConfig.ctrlChannel],
    ["systemId", "System ID", flightControllerConfig.sysidChannel],
  ];
  for (const [key, label, flightControllerChannel] of mappings) {
    if (
      visibleKeys.has(key) &&
      Number.isInteger(flightControllerChannel) &&
      radio.channelMap[key] !== flightControllerChannel
    ) {
      warnings.push(
        `Radio ${label.toLowerCase()} is CH ${radio.channelMap[key] ?? "not mapped"}; flight controller uses CH ${flightControllerChannel}.`,
      );
    }
  }
  return warnings;
}

export function applyFlightControllerChannelMap(
  radioConfig,
  flightControllerConfig,
  { channelLimit = 16, controlRoles = null } = {},
) {
  const radio = normalizeRadioConfig(radioConfig);
  const visibleKeys = new Set(
    getRadioChannelRoles(channelLimit, controlRoles).map((role) => role.key),
  );
  const assign = (key, fallback) => (
    visibleKeys.has(key) ? fallback : null
  );
  return {
    ...radio,
    channelMap: sanitizeRadioChannelMap({
      ...radio.channelMap,
      flightMode: assign("flightMode", flightControllerConfig.modeChannel ?? null),
      arm: assign("arm", flightControllerConfig.armChannel ?? null),
      beeper: assign("beeper", flightControllerConfig.beeperChannel ?? null),
      velocity: assign("velocity", flightControllerConfig.velocityChannel ?? null),
      mission: assign("mission", flightControllerConfig.missionChannel ?? null),
      launch: assign("launch", flightControllerConfig.launchChannel ?? null),
      manual: assign("manual", flightControllerConfig.manualChannel ?? null),
      control: assign("control", flightControllerConfig.ctrlChannel ?? null),
      systemId: assign("systemId", flightControllerConfig.sysidChannel ?? null),
    }, { channelLimit, controlRoles }),
  };
}
