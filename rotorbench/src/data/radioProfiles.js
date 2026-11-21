import { getBindingIdentity } from "../utils/elrsBinding";

export const RADIO_STORAGE_KEY = "rotorbench:radio-plan:v1";

export const RADIO_TARGETS = [
  {
    id: "aerialkit-elrs-rev-a3",
    name: "Aerial Kit ELRS USB TX Rev A3",
    description: "ESP32-S3, SX1280 and RFX2401C board with separate TX and RX images.",
    frequency: "2.4 GHz",
    defaultHostTransport: "native-usb",
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
    defaultHostTransport: "module-bay",
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
    id: "generic-elrs-24-tx",
    name: "Generic ExpressLRS 2.4 GHz TX",
    description: "Planning profile for a handset or USB ExpressLRS transmitter.",
    frequency: "2.4 GHz",
    allowUnverifiedHostTransports: true,
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
    allowUnverifiedHostTransports: true,
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

export const RADIO_PACKET_RATES = [
  { value: "50", hz: 50, label: "50 Hz", note: "More robust link, lower control rate" },
  { value: "100-full", hz: 100, label: "100 Hz Full", note: "Longer range mode" },
  { value: "150", hz: 150, label: "150 Hz", note: "Balanced control rate" },
  { value: "250", hz: 250, label: "250 Hz", note: "Bench-tested with 25 mW" },
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
  { value: "wide", label: "Dynamic: Wide", note: "Recommended for 250 Hz" },
  { value: "hybrid", label: "Dynamic: Hybrid", note: "Firmware-dependent preset" },
  { value: "8ch-rate2", label: "8ch Rate/2", note: "Fixed switch mode" },
  { value: "12ch-mixed", label: "12ch Mixed", note: "Fixed switch mode" },
  { value: "16ch-rate2", label: "16ch Rate/2", note: "Fixed switch mode" },
];

const FULL_RESOLUTION_PACKET_RATES = new Set(["100-full", "333-full"]);
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
    value: "unspecified",
    label: "Verify target transport",
    note: "No host-signal map is bundled for this planning target.",
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

export function getRadioHostTransports(targetId) {
  const target = getRadioTarget(targetId);
  if (target.allowUnverifiedHostTransports) return [...RADIO_HOST_TRANSPORTS];
  return RADIO_HOST_TRANSPORTS.filter((transport) => {
    if (transport.value === "unspecified") return true;
    if (transport.value === target.defaultHostTransport) return true;
    if (transport.value === "native-usb") return Boolean(target.hostLink?.nativeUsb);
    if (transport.value === "uart") return Boolean(target.hostLink?.uart);
    if (transport.value === "module-bay") return Boolean(target.hostLink?.moduleBay);
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
  { channelLimit = 16, controlRoles = null } = {},
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
        warnings.push(
          `Verify whether the fitted module is FCC or CE, and its local limit. Published maxima: ${maxima}.`,
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
      manual: assign("manual", flightControllerConfig.manualChannel ?? null),
      control: assign("control", flightControllerConfig.ctrlChannel ?? null),
      systemId: assign("systemId", flightControllerConfig.sysidChannel ?? null),
    }, { channelLimit, controlRoles }),
  };
}
