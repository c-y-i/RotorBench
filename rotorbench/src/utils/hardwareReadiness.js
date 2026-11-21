import {
  AIRFRAMES,
  FIRMWARE_FAMILIES,
  MOTOR_DIRECTIONS,
  RECEIVER_PROTOCOLS,
  createDefaultFlightControllerConfig,
  getAirframeMotorLayout,
  getBoardProfile,
  getMotorOutputByCorner,
  getPropellerDirectionForOutputMap,
  validateFlightControllerConfig,
} from "../data/flightControllerProfiles";
import {
  DEFAULT_RADIO_CONFIG,
  buildChannelMappingWarnings,
  buildRadioWarnings,
  getRadioHostBay,
  getRadioRegulatoryLimit,
  getRadioRegulatoryOptions,
  getRadioReceiverBandCompatibility,
  getRadioTarget,
  isRadioHostBayCompatible,
  normalizeRadioConfig,
} from "../data/radioProfiles";
import { buildReceiverWiringPlan } from "./receiverWiring";
import { buildRadioEndpointPlan } from "./radioEndpointPlan";

function readPlan(storage, key) {
  if (!storage) return null;
  try {
    const plan = JSON.parse(storage.getItem(key) || "null");
    return plan?.planVersion === 3 ? plan : null;
  } catch {
    return null;
  }
}

function matchingFcPlan(plan, selectedFlightController, selectedReceiver) {
  if (!plan) return null;
  return (
    plan.selectedFlightControllerId === (selectedFlightController?.id || null) &&
    plan.selectedReceiverId === (selectedReceiver?.id || null)
  ) ? plan : null;
}

function matchingRadioPlan(plan, selectedReceiver) {
  if (!plan) return null;
  return plan.selectedReceiverId === (selectedReceiver?.id || null) ? plan : null;
}

export function summarizeHardwareReadiness({
  buildId,
  flightController = null,
  receiver = null,
  storage = typeof window !== "undefined" ? window.localStorage : null,
}) {
  const fallbackFc = createDefaultFlightControllerConfig(flightController, receiver);
  const baseKey = buildId ? `rotorbench:hardware-plan:${buildId}` : null;
  const storedFc = baseKey
    ? matchingFcPlan(readPlan(storage, `${baseKey}:fc`), flightController, receiver)
    : null;
  const storedRadio = baseKey
    ? matchingRadioPlan(readPlan(storage, `${baseKey}:radio`), receiver)
    : null;
  const fcPlan = {
    ...fallbackFc,
    ...(storedFc || {}),
    features: {
      ...fallbackFc.features,
      ...(storedFc?.features || {}),
    },
  };
  const fallbackRadio = {
    ...DEFAULT_RADIO_CONFIG,
    selectedReceiverId: receiver?.id || null,
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      flightMode: fcPlan.modeChannel ?? null,
      arm: fcPlan.armChannel ?? null,
      velocity: fcPlan.velocityChannel ?? null,
      beeper: fcPlan.beeperChannel ?? null,
    },
  };
  const radioPlan = normalizeRadioConfig({
    ...fallbackRadio,
    ...(storedRadio || {}),
    channelMap: {
      ...fallbackRadio.channelMap,
      ...(storedRadio?.channelMap || {}),
    },
  });
  const profile = getBoardProfile(fcPlan.profileId, flightController);
  const wiring = buildReceiverWiringPlan(fcPlan, profile, receiver);
  const fcIssues = validateFlightControllerConfig(fcPlan, profile);
  const radioWarnings = buildRadioWarnings(radioPlan, {
    channelLimit: fcPlan.firmwareFamily === "aerialkit" ? 8 : 16,
    receiver,
  });
  const mappingWarnings = buildChannelMappingWarnings(fcPlan, radioPlan);
  const blockerCount = fcIssues.filter((issue) => issue.severity === "error").length;
  const issueCount = fcIssues.length + radioWarnings.length + mappingWarnings.length;
  const configured = Boolean(storedFc || storedRadio);
  const complete = Boolean(storedFc && storedRadio);
  const status = !configured
    ? "empty"
    : blockerCount
      ? "blocked"
      : issueCount
        ? "review"
        : complete
          ? "ready"
          : "partial";
  const label = !configured
    ? "Plan not saved"
    : blockerCount
      ? `${blockerCount} blocker${blockerCount === 1 ? "" : "s"}`
      : issueCount
        ? `${issueCount} check${issueCount === 1 ? "" : "s"} open`
        : complete
          ? "Plan checks clear"
          : "Partial local plan";
  const firmware = FIRMWARE_FAMILIES.find(
    (item) => item.id === fcPlan.firmwareFamily,
  );
  const protocol = RECEIVER_PROTOCOLS.find(
    (item) => item.value === fcPlan.receiverProtocol,
  );
  const radioTarget = getRadioTarget(radioPlan.targetId);
  const radioEndpoint = buildRadioEndpointPlan(radioPlan, radioTarget);
  const radioHostBay = getRadioHostBay(radioPlan.hostBay);
  const radioHostBayCompatible = isRadioHostBayCompatible(
    radioTarget.id,
    radioPlan.hostBay,
  );
  const radioRegulatoryOptions = getRadioRegulatoryOptions(radioTarget.id);
  const radioReceiverBands = getRadioReceiverBandCompatibility(
    radioTarget.id,
    receiver,
  );
  const radioRegulatoryLimit = getRadioRegulatoryLimit(
    radioTarget.id,
    radioPlan.regulatoryRegion,
  );
  const radioPowerDbm = Number.isFinite(Number(radioPlan.powerDbm))
    ? Number(radioPlan.powerDbm)
    : null;
  const radioRegulatoryRegionLabel = radioRegulatoryLimit?.label
    || (radioRegulatoryOptions.length ? "Verify fitted module" : null);
  const radioPowerCapStatus = !radioRegulatoryOptions.length
    ? null
    : !radioRegulatoryLimit
      ? "verify"
      : radioPowerDbm != null && radioPowerDbm > radioRegulatoryLimit.dbm
        ? "over"
        : "within";
  const motorLayout = getAirframeMotorLayout(
    fcPlan.airframe,
    fcPlan.firmwareFamily,
    fcPlan.motorDirection,
  );
  const motorDirection = MOTOR_DIRECTIONS.find(
    (option) => option.value === fcPlan.motorDirection,
  ) || MOTOR_DIRECTIONS[0];
  const motorDirectionLabel = motorLayout
    ? fcPlan.firmwareFamily === "betaflight"
      ? motorDirection.label
      : "Aerial Kit mixer order"
    : "No verified motor map";
  const motorOrder = motorLayout
    ? motorLayout.motors
      .map((motor) => `${motor.output} ${motor.label} ${motor.spin}`)
      .join(" · ")
    : null;
  const motorOutputByCorner = getMotorOutputByCorner(motorLayout);
  const fcPropellerDirection = getPropellerDirectionForOutputMap(
    motorOutputByCorner,
  );

  return {
    status,
    label,
    configured,
    complete,
    issueCount,
    blockerCount,
    fcPlan,
    radioPlan,
    profile,
    fcIssues,
    radioWarnings,
    mappingWarnings,
    firmwareLabel: firmware?.label || fcPlan.firmwareFamily,
    protocolLabel: protocol?.label || fcPlan.receiverProtocol,
    receiverUart: fcPlan.receiverUart,
    receiverBaud: fcPlan.receiverBaud,
    receiverPins: wiring.pins,
    wiringStatus: wiring.documented ? "documented" : "unverified",
    wiringScope: wiring.scope,
    radioTargetName: radioTarget.name,
    radioHostTransport: radioEndpoint.hostTransport,
    radioHostTransportLabel: radioEndpoint.hostTransportLabel,
    radioHostDocumented: radioEndpoint.documented,
    radioHostScope: radioEndpoint.scope,
    radioHostBay: radioPlan.hostBay,
    radioHostBayLabel: radioHostBay.label,
    radioHostBayCompatible,
    radioPowerDbm,
    radioRegulatoryRegion: radioPlan.regulatoryRegion || null,
    radioRegulatoryRegionLabel,
    radioRegulatoryMaxDbm: radioRegulatoryLimit?.dbm ?? null,
    radioRegulatoryMaxMw: radioRegulatoryLimit?.mw ?? null,
    radioPowerCapStatus,
    radioReceiverBandStatus: radioReceiverBands.status,
    radioReceiverBands: radioReceiverBands.receiverBandLabels,
    radioSharedBands: radioReceiverBands.sharedBandLabels,
    fcAirframe: fcPlan.airframe,
    fcAirframeLabel: AIRFRAMES.find((airframe) => airframe.value === fcPlan.airframe)?.label
      || fcPlan.airframe,
    fcMotorDirection: fcPlan.motorDirection || null,
    fcMotorDirectionLabel: motorDirectionLabel,
    fcMotorOrder: motorOrder,
    fcMotorOutputByCorner: motorOutputByCorner,
    fcPropellerDirection,
    fcMotorLayoutSource: motorLayout
      ? fcPlan.firmwareFamily === "betaflight" ? "Betaflight" : "Aerial Kit"
      : null,
    hardwareVerified: false,
  };
}

export function sanitizeHardwareReadiness(readiness) {
  if (!readiness) return null;
  return {
    status: readiness.status,
    label: readiness.label,
    configured: Boolean(readiness.configured),
    complete: Boolean(readiness.complete),
    issueCount: Number(readiness.issueCount) || 0,
    blockerCount: Number(readiness.blockerCount) || 0,
    firmware: readiness.firmwareLabel || null,
    receiverProtocol: readiness.protocolLabel || null,
    receiverUart: readiness.receiverUart || null,
    receiverBaud: readiness.receiverBaud ?? null,
    receiverPins: readiness.receiverPins || null,
    wiringStatus: readiness.wiringStatus || "unverified",
    wiringScope: readiness.wiringScope || "planning continuity checklist; hardware not tested",
    radioTarget: readiness.radioTargetName || null,
    radioHostTransport: readiness.radioHostTransport || null,
    radioHostTransportLabel: readiness.radioHostTransportLabel || null,
    radioHostDocumented: Boolean(readiness.radioHostDocumented),
    radioHostScope: readiness.radioHostScope || "planning endpoint checklist; RF and hardware not tested",
    radioHostBay: readiness.radioHostBay || null,
    radioHostBayLabel: readiness.radioHostBayLabel || null,
    radioHostBayCompatible: Boolean(readiness.radioHostBayCompatible),
    radioPowerDbm: readiness.radioPowerDbm ?? null,
    radioRegulatoryRegion: readiness.radioRegulatoryRegion || null,
    radioRegulatoryRegionLabel: readiness.radioRegulatoryRegionLabel || null,
    radioRegulatoryMaxDbm: readiness.radioRegulatoryMaxDbm ?? null,
    radioRegulatoryMaxMw: readiness.radioRegulatoryMaxMw ?? null,
    radioPowerCapStatus: readiness.radioPowerCapStatus || null,
    radioReceiverBandStatus: readiness.radioReceiverBandStatus || null,
    radioReceiverBands: Array.isArray(readiness.radioReceiverBands)
      ? readiness.radioReceiverBands
      : [],
    radioSharedBands: Array.isArray(readiness.radioSharedBands)
      ? readiness.radioSharedBands
      : [],
    fcAirframe: readiness.fcAirframe || null,
    fcAirframeLabel: readiness.fcAirframeLabel || null,
    fcMotorDirection: readiness.fcMotorDirection || null,
    fcMotorDirectionLabel: readiness.fcMotorDirectionLabel || null,
    fcMotorOrder: readiness.fcMotorOrder || null,
    fcMotorOutputByCorner: readiness.fcMotorOutputByCorner || null,
    fcPropellerDirection: readiness.fcPropellerDirection || null,
    fcMotorLayoutSource: readiness.fcMotorLayoutSource || null,
    hardwareVerified: false,
  };
}
