import {
  AERIALKIT_SERVO_OUTPUTS,
  AIRFRAMES,
  FIRMWARE_FAMILIES,
  MOTOR_DIRECTIONS,
  RECEIVER_PROTOCOLS,
  createDefaultFlightControllerConfig,
  getAirframeMotorLayout,
  getBoardProfile,
  getMotorOutputByCorner,
  getOrderedMotorOutputs,
  getPropellerDirectionForOutputMap,
  getPropellerDirectionForWingLayout,
  supportsAerialKitLaunch,
  validateFlightControllerConfig,
} from "../data/flightControllerProfiles";
import {
  DEFAULT_RADIO_CONFIG,
  buildChannelMappingWarnings,
  buildRadioWarnings,
  getRadioHandset,
  getRadioHandsetBayCompatibility,
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
  buildMotorCount = null,
  buildServoCount = null,
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
      mission: fcPlan.missionChannel ?? null,
      launch: fcPlan.launchChannel ?? null,
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
  const fcIssues = validateFlightControllerConfig(fcPlan, profile, {
    buildMotorCount,
    buildServoCount,
  });
  const fcPlanConfigured = Boolean(storedFc);
  const radioPlanConfigured = Boolean(storedRadio);
  const radioWarnings = radioPlanConfigured
    ? buildRadioWarnings(radioPlan, {
        channelLimit: fcPlan.firmwareFamily === "aerialkit" ? 8 : 16,
        receiver,
      })
    : [];
  const mappingWarnings = fcPlanConfigured && radioPlanConfigured
    ? buildChannelMappingWarnings(fcPlan, radioPlan)
    : [];
  const receiverWiringWarnings = wiring.outputMode === "pwm-only"
    ? [
        "The selected receiver publishes PWM outputs but no serial flight-controller route. Use a direct PWM topology or choose a receiver with documented CRSF/SBUS output.",
      ]
    : [];
  const blockerCount = fcIssues.filter((issue) => issue.severity === "error").length;
  const issueCount = fcIssues.length
    + radioWarnings.length
    + mappingWarnings.length
    + receiverWiringWarnings.length;
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
  const radioHandset = getRadioHandset(radioPlan.handsetId);
  const radioHandsetBayCompatibility = getRadioHandsetBayCompatibility(
    radioPlan.handsetId,
    radioPlan.hostBay,
  );
  const radioHostBayCompatible = isRadioHostBayCompatible(
    radioTarget.id,
    radioPlan.hostBay,
  );
  const radioRegulatoryOptions = getRadioRegulatoryOptions(radioTarget.id);
  const radioReceiverBands = getRadioReceiverBandCompatibility(
    radioTarget.id,
    receiver,
  );
  const effectiveRadioReceiverBands = radioPlanConfigured
    ? radioReceiverBands
    : {
        ...radioReceiverBands,
        status: "unconfigured",
        sharedBands: [],
        sharedBandLabels: [],
      };
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
  const motorOutputs = getOrderedMotorOutputs(motorLayout);
  const fcPropellerDirection = getPropellerDirectionForOutputMap(
    motorOutputByCorner,
  ) || getPropellerDirectionForWingLayout(motorLayout);
  const fcAirframeSpec = AIRFRAMES.find(
    (airframe) => airframe.value === fcPlan.airframe,
  );
  const fcServoOutputs = fcPlan.firmwareFamily === "aerialkit"
    ? AERIALKIT_SERVO_OUTPUTS
        .slice(0, fcAirframeSpec?.servos || 0)
        .map((servo) => ({
          output: servo.output,
          reversed: Boolean(fcPlan[servo.reverseKey]),
          trimUs: fcPlan[servo.trimKey] ?? null,
          travelUs: fcPlan[servo.travelKey] ?? null,
        }))
    : [];
  const fcServoOutputCount = fcServoOutputs.length;
  const servoOutputCoverageStatus = !Number.isFinite(Number(buildServoCount))
    || Number(buildServoCount) <= 0
    ? "not-applicable"
    : !fcPlanConfigured
      ? "unconfigured"
      : fcAirframeSpec?.servos > 0 && fcServoOutputCount === 0
        ? "no-map"
        : fcServoOutputCount < Number(buildServoCount)
          ? "under-mapped"
          : fcServoOutputCount > Number(buildServoCount)
            ? "extra"
            : "complete";
  const servoOutputCoverageLabel = servoOutputCoverageStatus === "complete"
    ? `${fcServoOutputCount}/${buildServoCount} outputs mapped`
    : servoOutputCoverageStatus === "under-mapped"
      ? `${fcServoOutputCount}/${buildServoCount} outputs mapped`
      : servoOutputCoverageStatus === "extra"
        ? `${fcServoOutputCount}/${buildServoCount} outputs mapped`
        : servoOutputCoverageStatus === "no-map"
          ? "Servo map unavailable"
          : servoOutputCoverageStatus === "unconfigured"
            ? "Servo map not saved"
            : null;
  const servoOutputCoverageDetail = servoOutputCoverageStatus === "complete"
    ? "The saved firmware map covers every catalogued control-surface servo."
    : servoOutputCoverageStatus === "under-mapped"
      ? `${Number(buildServoCount) - fcServoOutputCount} catalogued servo output${
        Number(buildServoCount) - fcServoOutputCount === 1 ? " remains" : "s remain"
      } unassigned by the saved firmware mixer.`
      : servoOutputCoverageStatus === "extra"
        ? "The saved firmware map exposes more servo outputs than the catalogued hardware set."
        : servoOutputCoverageStatus === "no-map"
          ? "The selected firmware profile does not bundle a servo-output map."
          : servoOutputCoverageStatus === "unconfigured"
            ? "Save a flight-controller plan in Setup to map the catalogued servo hardware."
            : null;

  return {
    status,
    label,
    configured,
    fcPlanConfigured,
    radioPlanConfigured,
    complete,
    issueCount,
    blockerCount,
    buildMotorCount,
    buildServoCount,
    fcPlan,
    radioPlan,
    profile,
    fcIssues,
    radioWarnings,
    mappingWarnings,
    receiverWiringWarnings,
    firmwareLabel: firmware?.label || fcPlan.firmwareFamily,
    fcBoardProfile: profile.id || null,
    fcBoardName: profile.board || null,
    fcBoardDocumented: profile.availability !== "custom",
    protocolLabel: protocol?.label || fcPlan.receiverProtocol,
    receiverUart: fcPlan.receiverUart,
    receiverBaud: fcPlan.receiverBaud,
    receiverPins: wiring.pins,
    wiringStatus: wiring.outputMode === "pwm-only"
      ? "pwm-only"
      : wiring.documented ? "documented" : "unverified",
    wiringScope: wiring.scope,
    radioTargetName: radioTarget.name,
    radioHostTransport: radioEndpoint.hostTransport,
    radioHostTransportLabel: radioEndpoint.hostTransportLabel,
    radioHostDocumented: radioEndpoint.documented,
    radioHostScope: radioEndpoint.scope,
    radioHostBay: radioPlan.hostBay,
    radioHostBayLabel: radioHostBay.label,
    radioHostBayCompatible,
    radioHandsetId: radioHandset.id,
    radioHandsetName: radioHandset.name,
    radioHandsetBayStatus: radioHandsetBayCompatibility.status,
    radioHandsetBayCompatible:
      radioHandsetBayCompatibility.status !== "conflict",
    radioHandsetSourceUrl: radioHandset.sourceUrl || null,
    radioHandsetManualUrl: radioHandset.manualUrl || null,
    radioPowerDbm,
    radioRegulatoryRegion: radioPlan.regulatoryRegion || null,
    radioRegulatoryRegionLabel,
    radioRegulatoryMaxDbm: radioRegulatoryLimit?.dbm ?? null,
    radioRegulatoryMaxMw: radioRegulatoryLimit?.mw ?? null,
    radioPowerCapStatus,
    radioReceiverBandStatus: effectiveRadioReceiverBands.status,
    radioReceiverBands: effectiveRadioReceiverBands.receiverBandLabels,
    radioSharedBands: effectiveRadioReceiverBands.sharedBandLabels,
    fcAirframe: fcPlan.airframe,
    fcAirframeLabel: fcAirframeSpec?.label
      || fcPlan.airframe,
    fcMotorDirection: fcPlan.motorDirection || null,
    fcMotorDirectionLabel: motorDirectionLabel,
    fcMotorOrder: motorOrder,
    fcMotorOutputByCorner: motorOutputByCorner,
    fcMotorOutputs: motorOutputs,
    fcPropellerDirection,
    fcMotorLayoutSource: motorLayout
      ? fcPlan.firmwareFamily === "betaflight" ? "Betaflight" : "Aerial Kit"
      : null,
    fcBatteryDividerRatio: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.vbatRatio
      : null,
    fcBatteryCellOverride: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.vbatCells
      : null,
    fcBatteryWarnCellV: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.vbatWarnCell
      : null,
    fcBatteryMinCellV: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.vbatMinCell
      : null,
    fcBatteryRthEnabled: fcPlan.firmwareFamily === "aerialkit"
      ? Boolean(fcPlan.batteryRthEnabled)
      : null,
    fcMissionChannel: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.missionChannel ?? null
      : null,
    fcLaunchChannel: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.launchChannel ?? null
      : null,
    fcLaunchThrottle: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.launchThrottle ?? null
      : null,
    fcLaunchClimbDeg: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.launchClimbDeg ?? null
      : null,
    fcLaunchTimeoutS: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.launchTimeoutS ?? null
      : null,
    fcFenceEnabled: fcPlan.firmwareFamily === "aerialkit"
      ? Boolean(fcPlan.fenceEnabled)
      : null,
    fcFenceRadiusM: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.fenceRadiusM
      : null,
    fcFenceCeilingM: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.fenceCeilingM
      : null,
    fcRthMinAltM: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.rthMinAltM
      : null,
    fcGpsMinSats: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.gpsMinSats
      : null,
    fcAlignmentRollDeg: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.alignRollDeg
      : null,
    fcAlignmentPitchDeg: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.alignPitchDeg
      : null,
    fcAlignmentYawDeg: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.alignYawDeg
      : null,
    fcGyroRateHz: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.gyroRateHz
      : null,
    fcPidDenom: fcPlan.firmwareFamily === "aerialkit"
      ? fcPlan.pidDenom
      : null,
    fcServoOutputs,
    fcServoOutputCount,
    servoOutputCoverageStatus,
    servoOutputCoverageLabel,
    servoOutputCoverageDetail,
    hardwareVerified: false,
  };
}

export function sanitizeHardwareReadiness(readiness) {
  if (!readiness) return null;
  return {
    status: readiness.status,
    label: readiness.label,
    configured: Boolean(readiness.configured),
    fcPlanConfigured: Boolean(readiness.fcPlanConfigured),
    radioPlanConfigured: Boolean(readiness.radioPlanConfigured),
    complete: Boolean(readiness.complete),
    issueCount: Number(readiness.issueCount) || 0,
    blockerCount: Number(readiness.blockerCount) || 0,
    firmware: readiness.firmwareLabel || null,
    fcBoardProfile: readiness.fcBoardProfile || null,
    fcBoardName: readiness.fcBoardName || null,
    fcBoardDocumented: Boolean(readiness.fcBoardDocumented),
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
    radioHandsetId: readiness.radioHandsetId || null,
    radioHandsetName: readiness.radioHandsetName || null,
    radioHandsetBayStatus: readiness.radioHandsetBayStatus || null,
    radioHandsetBayCompatible: Boolean(readiness.radioHandsetBayCompatible),
    radioHandsetSourceUrl: readiness.radioHandsetSourceUrl || null,
    radioHandsetManualUrl: readiness.radioHandsetManualUrl || null,
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
    fcMotorOutputs: Array.isArray(readiness.fcMotorOutputs)
      ? readiness.fcMotorOutputs
      : [],
    buildServoCount: readiness.buildServoCount ?? null,
    fcServoOutputCount: readiness.fcServoOutputCount ?? 0,
    servoOutputCoverageStatus: readiness.servoOutputCoverageStatus || null,
    servoOutputCoverageLabel: readiness.servoOutputCoverageLabel || null,
    servoOutputCoverageDetail: readiness.servoOutputCoverageDetail || null,
    fcPropellerDirection: readiness.fcPropellerDirection || null,
    fcMotorLayoutSource: readiness.fcMotorLayoutSource || null,
    fcBatteryDividerRatio: readiness.fcBatteryDividerRatio ?? null,
    fcBatteryCellOverride: readiness.fcBatteryCellOverride ?? null,
    fcBatteryWarnCellV: readiness.fcBatteryWarnCellV ?? null,
    fcBatteryMinCellV: readiness.fcBatteryMinCellV ?? null,
    fcBatteryRthEnabled: readiness.fcBatteryRthEnabled ?? null,
    fcMissionChannel: readiness.fcMissionChannel ?? null,
    fcLaunchChannel: readiness.fcLaunchChannel ?? null,
    fcLaunchThrottle: readiness.fcLaunchThrottle ?? null,
    fcLaunchClimbDeg: readiness.fcLaunchClimbDeg ?? null,
    fcLaunchTimeoutS: readiness.fcLaunchTimeoutS ?? null,
    fcFenceEnabled: readiness.fcFenceEnabled ?? null,
    fcFenceRadiusM: readiness.fcFenceRadiusM ?? null,
    fcFenceCeilingM: readiness.fcFenceCeilingM ?? null,
    fcRthMinAltM: readiness.fcRthMinAltM ?? null,
    fcGpsMinSats: readiness.fcGpsMinSats ?? null,
    fcAlignmentRollDeg: readiness.fcAlignmentRollDeg ?? null,
    fcAlignmentPitchDeg: readiness.fcAlignmentPitchDeg ?? null,
    fcAlignmentYawDeg: readiness.fcAlignmentYawDeg ?? null,
    fcGyroRateHz: readiness.fcGyroRateHz ?? null,
    fcPidDenom: readiness.fcPidDenom ?? null,
    fcServoOutputs: Array.isArray(readiness.fcServoOutputs)
      ? readiness.fcServoOutputs.map((servo) => ({
          output: Number(servo.output),
          reversed: Boolean(servo.reversed),
          trimUs: servo.trimUs ?? null,
          travelUs: servo.travelUs ?? null,
        }))
      : [],
    hardwareVerified: false,
  };
}

export function describeNavigationSafety(readiness) {
  if (!readiness) return null;
  const hasSafetyPlan = (
    readiness.fcFenceEnabled != null
    || readiness.fcRthMinAltM != null
    || readiness.fcBatteryRthEnabled != null
  );
  if (!hasSafetyPlan) return null;

  const fence = readiness.fcFenceEnabled
    ? `Fence ${Number(readiness.fcFenceRadiusM) || 0} m${
      Number(readiness.fcFenceCeilingM) > 0
        ? ` / ${readiness.fcFenceCeilingM} m ceiling`
        : ""
    }`
    : "Fence off";
  const floor = Number(readiness.fcRthMinAltM) > 0
    ? `Floor ${readiness.fcRthMinAltM} m`
    : "No floor";
  const packReturn = readiness.fcBatteryRthEnabled
    ? "Pack RTH on"
    : "Pack RTH off";
  const gpsGate = Number(readiness.fcGpsMinSats) > 0
    ? `GPS ${readiness.fcGpsMinSats} sats`
    : "GPS gate unverified";
  return `${fence} · ${floor} · ${gpsGate} · ${packReturn}`;
}

export function receiverWiringStatusLabel(status) {
  if (status === "documented") return "Pins documented";
  if (status === "pwm-only") return "PWM outputs only";
  return "Verify pins";
}

export function describeMissionControls(readiness) {
  if (!readiness || readiness.fcLaunchTimeoutS == null) return null;
  const mission = Number.isInteger(readiness.fcMissionChannel)
    ? `Mission CH${readiness.fcMissionChannel}`
    : "Mission off";
  const launch = Number.isInteger(readiness.fcLaunchChannel)
    ? supportsAerialKitLaunch(readiness.fcAirframe)
      ? `Launch CH${readiness.fcLaunchChannel} · ${
        Math.round(Number(readiness.fcLaunchThrottle) * 100)
      }% · ${readiness.fcLaunchClimbDeg}° · ${readiness.fcLaunchTimeoutS} s`
      : `Launch CH${readiness.fcLaunchChannel} · airframe mismatch`
    : supportsAerialKitLaunch(readiness.fcAirframe)
      ? "Launch off"
      : "Launch N/A";
  return `${mission} · ${launch}`;
}
