import {
  DEFAULT_RADIO_CONFIG,
  RADIO_DYNAMIC_POWER,
  RADIO_HANDSETS,
  RADIO_HOST_BAYS,
  RADIO_LINK_MODES,
  RADIO_TARGETS,
  RADIO_TELEMETRY_RATIOS,
  buildRadioSummary,
  getAvailableSwitchModes,
  getDefaultHostBay,
  getRadioHandset,
  getRadioHandsetBayCompatibility,
  getPacketRatesForTarget,
  getRadioHostTransports,
  getRadioHostBay,
  getRadioPowerLevels,
  getRadioPowerSpec,
  getRadioRegulatoryLimit,
  getRadioRegulatoryOptions,
  isRadioHostBayCompatible,
  normalizeRadioConfig,
} from "../data/radioProfiles";
import {
  BETAFLIGHT_FAILSAFE_THROTTLE,
  buildFlightControllerSummary,
  createDefaultFlightControllerConfig,
  getBoardProfile,
  MOTOR_DIRECTIONS,
} from "../data/flightControllerProfiles";
import { buildReceiverWiringPlan } from "./receiverWiring";

export function createCombinedHardwarePlan({
  build,
  flightController,
  radio,
  receiver = null,
  channelLimit = 16,
  controlRoles = null,
  generatedAt = new Date().toISOString(),
}) {
  const receiverRecord = receiver
    ? {
        id: receiver.id || null,
        name: receiver.name || null,
        protocol: receiver.protocol || null,
        frequencyBands: Array.isArray(receiver.frequencyBands)
          ? [...receiver.frequencyBands]
          : [],
      }
    : null;
  return {
    schema: "rotorbench.hardware-plan.v1",
    generatedAt,
    status: "draft",
    hardwareVerified: false,
    build: build
      ? {
          id: build.id,
          name: build.name,
          componentIds: build.componentIds,
        }
      : null,
    receiver: receiverRecord,
    flightController: {
      config: flightController.config,
      profile: flightController.profile,
      issues: flightController.issues,
      wiring: buildReceiverWiringPlan(
        flightController.config,
        flightController.profile,
        receiver,
      ),
      summary: buildFlightControllerSummary(
        flightController.config,
        flightController.profile,
      ),
    },
    radio: buildRadioSummary(radio, {
      channelLimit,
      controlRoles,
      receiver,
    }),
  };
}

export function parseCombinedHardwarePlanJson(text) {
  let plan;
  try {
    plan = JSON.parse(text);
  } catch {
    throw new Error("The selected hardware plan is not valid JSON.");
  }
  if (plan?.schema !== "rotorbench.hardware-plan.v1") {
    throw new Error("This is not a RotorBench hardware plan v1 file.");
  }
  const importedFcPlan = plan.flightController?.config;
  if (!importedFcPlan || importedFcPlan.planVersion !== 3) {
    throw new Error("The flight-controller section is missing or has an unsupported plan version.");
  }
  const radioSection = plan.radio;
  if (!radioSection?.target?.id || !radioSection?.configuration) {
    throw new Error("The radio section is missing target or configuration data.");
  }
  if (
    plan.receiver?.id &&
    radioSection.configuration.selectedReceiverId &&
    plan.receiver.id !== radioSection.configuration.selectedReceiverId
  ) {
    throw new Error("The hardware plan receiver identity is inconsistent.");
  }
  const target = RADIO_TARGETS.find(
    (candidate) => candidate.id === radioSection.target.id,
  );
  if (!target) {
    throw new Error(`Unknown radio target: ${radioSection.target.id}`);
  }
  const configuration = radioSection.configuration;
  if (
    typeof configuration.powerDbm !== "number" ||
    !Number.isFinite(configuration.powerDbm)
  ) {
    throw new Error("The radio section does not contain a valid power setting.");
  }
  const role = configuration.role || DEFAULT_RADIO_CONFIG.role;
  if (!["tx", "rx"].includes(role) || !target.roles.includes(role)) {
    throw new Error("The radio section contains an unsupported role.");
  }
  const powerLevels = getRadioPowerLevels(target.id);
  if (
    powerLevels &&
    !powerLevels.some((level) => level.value === configuration.powerDbm)
  ) {
    throw new Error("The radio power setting is not valid for this target.");
  }
  const powerSpec = getRadioPowerSpec(target.id);
  if (powerSpec?.regulatoryMaxima?.length) {
    const absoluteMax = Math.max(
      ...powerSpec.regulatoryMaxima.map((limit) => Number(limit.dbm)),
    );
    if (configuration.powerDbm > absoluteMax) {
      throw new Error("The radio power setting exceeds the target's published maximum.");
    }
  }
  const regulatoryOptions = getRadioRegulatoryOptions(target.id);
  const regulatoryRegion = regulatoryOptions.length
    ? String(configuration.regulatoryRegion || "verify").toLowerCase()
    : null;
  if (
    regulatoryOptions.length > 0 &&
    regulatoryRegion !== "verify" &&
    !regulatoryOptions.some((option) => option.value === regulatoryRegion)
  ) {
    throw new Error("The radio RF region is unsupported for this target.");
  }
  const regulatoryLimit = regulatoryRegion === "verify"
    ? null
    : getRadioRegulatoryLimit(target.id, regulatoryRegion);
  if (regulatoryLimit && configuration.powerDbm > regulatoryLimit.dbm) {
    throw new Error(
      `The radio power setting exceeds the selected ${regulatoryLimit.label} maximum.`,
    );
  }
  const packetRate = configuration.packetRateMode || DEFAULT_RADIO_CONFIG.packetRateMode;
  if (!getPacketRatesForTarget(target.id).some((rate) => rate.value === packetRate)) {
    throw new Error("The radio packet rate is not valid for this target.");
  }
  const linkMode = configuration.linkMode || DEFAULT_RADIO_CONFIG.linkMode;
  if (!RADIO_LINK_MODES.some((option) => option.value === linkMode)) {
    throw new Error("The radio link mode is unsupported.");
  }
  const telemetryRatio = configuration.telemetryRatio || DEFAULT_RADIO_CONFIG.telemetryRatio;
  if (!RADIO_TELEMETRY_RATIOS.some((option) => option.value === telemetryRatio)) {
    throw new Error("The radio telemetry ratio is unsupported.");
  }
  const switchMode = configuration.switchMode || DEFAULT_RADIO_CONFIG.switchMode;
  if (!getAvailableSwitchModes(packetRate, linkMode).includes(switchMode)) {
    throw new Error("The radio switch mode is not valid for this packet rate and link mode.");
  }
  const dynamicPower = configuration.dynamicPower || DEFAULT_RADIO_CONFIG.dynamicPower;
  if (!RADIO_DYNAMIC_POWER.some((option) => option.value === dynamicPower)) {
    throw new Error("The radio dynamic-power mode is unsupported.");
  }
  if (
    configuration.channelMap != null &&
    (typeof configuration.channelMap !== "object" ||
      Array.isArray(configuration.channelMap))
  ) {
    throw new Error("The radio channel map is invalid.");
  }
  const hostTransport = configuration.hostTransport || DEFAULT_RADIO_CONFIG.hostTransport;
  if (!getRadioHostTransports(target.id).some((option) => option.value === hostTransport)) {
    throw new Error("The radio host transport is unsupported.");
  }
  const hostBay = getRadioHostBay(
    configuration.hostBay || getDefaultHostBay(target.id),
  ).value;
  if (!RADIO_HOST_BAYS.some((option) => option.value === hostBay)) {
    throw new Error("The radio handset bay is unsupported.");
  }
  if (
    hostTransport === "module-bay" &&
    !isRadioHostBayCompatible(target.id, hostBay)
  ) {
    throw new Error("The radio handset bay is incompatible with the target.");
  }
  const requestedHandsetId = configuration.handsetId || "verify";
  if (!RADIO_HANDSETS.some((handset) => handset.id === requestedHandsetId)) {
    throw new Error("The radio handset profile is unsupported.");
  }
  const handsetId = getRadioHandset(requestedHandsetId).id;
  if (
    hostTransport === "module-bay" &&
    getRadioHandsetBayCompatibility(handsetId, hostBay).status === "conflict"
  ) {
    throw new Error("The radio handset profile does not match the selected bay.");
  }
  const fcDefaults = createDefaultFlightControllerConfig();
  const fcPlan = {
    ...fcDefaults,
    ...importedFcPlan,
    features: {
      ...fcDefaults.features,
      ...(importedFcPlan.features || {}),
    },
  };
  if (fcPlan.firmwareFamily === "betaflight") {
    if (fcPlan.failsafeThrottle == null) {
      fcPlan.failsafeThrottle = BETAFLIGHT_FAILSAFE_THROTTLE.defaultPwm;
    }
    if (
      !Number.isInteger(Number(fcPlan.failsafeThrottle))
      || Number(fcPlan.failsafeThrottle) < BETAFLIGHT_FAILSAFE_THROTTLE.minPwm
      || Number(fcPlan.failsafeThrottle) > BETAFLIGHT_FAILSAFE_THROTTLE.maxPwm
    ) {
      throw new Error(
        "Betaflight failsafe throttle must be a whole PWM value from 1000 to 2000.",
      );
    }
  }
  if (!MOTOR_DIRECTIONS.some(
    (option) => option.value === fcPlan.motorDirection,
  )) {
    throw new Error("The flight-controller motor direction is unsupported.");
  }
  if (!getBoardProfile(fcPlan.profileId) && !fcPlan.profileId) {
    throw new Error("The flight-controller profile ID is missing.");
  }
  const radioPlan = normalizeRadioConfig({
    ...DEFAULT_RADIO_CONFIG,
    targetId: radioSection.target.id,
    role,
    hostTransport,
    hostBay,
    handsetId,
    packetRateMode: packetRate,
    powerDbm: Number(configuration.powerDbm),
    regulatoryRegion,
    telemetryRatio,
    switchMode,
    linkMode,
    dynamicPower,
    modelMatch: Boolean(configuration.modelMatch),
    channelMap: configuration.channelMap,
    selectedReceiverId: configuration.selectedReceiverId || null,
    antennaConfirmed: Boolean(configuration.antennaConfirmed),
    roleSwitchConfirmed: Boolean(configuration.roleSwitchConfirmed),
    bindingPhrase: "",
    uid: "",
  });
  return {
    buildId: plan.build?.id || null,
    receiver: plan.receiver || null,
    fcPlan,
    radioPlan,
  };
}
