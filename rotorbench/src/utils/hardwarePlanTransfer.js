import {
  DEFAULT_RADIO_CONFIG,
  RADIO_DYNAMIC_POWER,
  RADIO_LINK_MODES,
  RADIO_TARGETS,
  RADIO_TELEMETRY_RATIOS,
  buildRadioSummary,
  getAvailableSwitchModes,
  getPacketRatesForTarget,
  getRadioHostTransports,
  getRadioPowerLevels,
  getRadioPowerSpec,
  normalizeRadioConfig,
} from "../data/radioProfiles";
import {
  buildFlightControllerSummary,
  createDefaultFlightControllerConfig,
  getBoardProfile,
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
    radio: buildRadioSummary(radio, { channelLimit, controlRoles }),
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
  const fcDefaults = createDefaultFlightControllerConfig();
  const fcPlan = {
    ...fcDefaults,
    ...importedFcPlan,
    features: {
      ...fcDefaults.features,
      ...(importedFcPlan.features || {}),
    },
  };
  if (!getBoardProfile(fcPlan.profileId) && !fcPlan.profileId) {
    throw new Error("The flight-controller profile ID is missing.");
  }
  const radioPlan = normalizeRadioConfig({
    ...DEFAULT_RADIO_CONFIG,
    targetId: radioSection.target.id,
    role,
    hostTransport,
    packetRateMode: packetRate,
    powerDbm: Number(configuration.powerDbm),
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
    fcPlan,
    radioPlan,
  };
}
