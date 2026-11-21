import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Cable,
  Check,
  CircleAlert,
  Clipboard,
  Compass,
  Crosshair,
  Cpu,
  Database,
  Download,
  Gauge,
  RadioTower,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import {
  AIRFRAMES,
  CHANNEL_PRESETS,
  DEFAULT_CHANNELS,
  FAILSAFE_ACTIONS,
  FC_BOARD_PROFILES,
  FC_FEATURES,
  FIRMWARE_FAMILIES,
  MOTOR_DIRECTIONS,
  RECEIVER_PROTOCOLS,
  buildArmingGatePreview,
  buildFlightControllerSummary,
  createDefaultFlightControllerConfig,
  getAerialKitControlRoles,
  getAirframeMotorLayout,
  getBoardProfile,
  getChannelPreset,
  validateFlightControllerConfig,
} from "../data/flightControllerProfiles";
import { buildFlightControllerCommands } from "../utils/flightControllerCommands";
import { buildReceiverWiringPlan } from "../utils/receiverWiring";
import SetupSectionNav from "./SetupSectionNav";
import "../styles/fc-setup.css";

const FLIGHT_CONTROLLER_ISSUE_TARGETS = Object.freeze({
  "custom-board-unverified": { id: "fc-profile", label: "board profile" },
  "workspace-profile": { id: "fc-profile", label: "board profile" },
  "output-count": { id: "fc-airframe", label: "airframe" },
  "servo-count": { id: "fc-airframe", label: "airframe" },
  "build-airframe-mismatch": { id: "fc-airframe", label: "airframe" },
  "sbus-inverter": { id: "fc-protocol", label: "receiver protocol" },
  "sbus-no-telemetry": { id: "fc-protocol", label: "receiver protocol" },
  "receiver-baud": { id: "fc-baud", label: "line rate" },
  "dshot-rate": { id: "fc-dshot", label: "DShot rate" },
  "arm-hold-range": { id: "fc-arm-hold", label: "arm hold" },
  "arm-tilt-range": { id: "fc-arm-tilt", label: "maximum arm tilt" },
  "uart-conflict": { id: "fc-uart", label: "receiver UART" },
  "no-gps-uart": { id: "fc-feature-gps", label: "GPS feature" },
  "throttle-low-range": { id: "fc-throttle-low", label: "low-throttle gate" },
  "rc-timeout-range": { id: "fc-rc-timeout", label: "receiver timeout" },
  "rth-without-gps": { id: "fc-rth-enabled", label: "return-to-home" },
  "receiver-protocol": { id: "fc-protocol", label: "receiver protocol" },
  "rc-min-range": { id: "fc-rc-min", label: "receiver calibration" },
  "rc-mid-range": { id: "fc-rc-mid", label: "receiver calibration" },
  "rc-max-range": { id: "fc-rc-max", label: "receiver calibration" },
  "rc-deadband-range": { id: "fc-rc-deadband", label: "receiver calibration" },
  "rc-calibration-order": { id: "fc-rc-min", label: "receiver calibration" },
  "vbat-ratio-range": { id: "fc-vbat-ratio", label: "battery divider" },
  "vbat-cells-range": { id: "fc-vbat-cells", label: "battery cells" },
  "vbat-warn-range": { id: "fc-vbat-warn", label: "battery warning" },
  "vbat-min-range": { id: "fc-vbat-min", label: "battery minimum" },
  "vbat-threshold-order": { id: "fc-vbat-min", label: "battery thresholds" },
  "battery-rth-without-gps": { id: "fc-battery-rth", label: "battery return-to-home" },
  "fence-without-gps": { id: "fc-fence-enabled", label: "geofence" },
  "fence-radius-range": { id: "fc-fence-radius", label: "geofence radius" },
  "fence-radius-required": { id: "fc-fence-radius", label: "geofence radius" },
  "fence-ceiling-range": { id: "fc-fence-ceiling", label: "geofence ceiling" },
  "align-roll-range": { id: "fc-align-roll", label: "board alignment" },
  "align-pitch-range": { id: "fc-align-pitch", label: "board alignment" },
  "align-yaw-range": { id: "fc-align-yaw", label: "board alignment" },
  "gyro-rate-range": { id: "fc-gyro-rate", label: "requested gyro rate" },
  "pid-denom-range": { id: "fc-pid-denom", label: "control-loop divisor" },
  "channel-range": { id: "fc-arm-channel", label: "control channels" },
  "unsupported-control-role": { id: "fc-arm-channel", label: "control channels" },
  "mode-channel-unset": { id: "fc-mode-channel", label: "flight-mode channel" },
  "arm-channel-unset": { id: "fc-arm-channel", label: "arm channel" },
  "channel-conflict": { id: "fc-arm-channel", label: "control channels" },
});

function useFlightControllerConfig(
  value,
  onChange,
  selectedFlightController,
  selectedReceiver,
  storageKey,
) {
  const [internal, setInternal] = useState(() => {
    const defaults = createDefaultFlightControllerConfig(
      selectedFlightController,
      selectedReceiver,
    );
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (
        stored &&
        typeof stored === "object" &&
        stored.planVersion === defaults.planVersion
      ) {
        return {
          ...defaults,
          ...stored,
          features: { ...defaults.features, ...(stored.features || {}) },
        };
      }
    } catch {
      // A malformed local plan should not block the configuration surface.
    }
    return defaults;
  });
  const config = value || internal;
  const update = (next) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  return [
    config,
    update,
    () => setInternal(createDefaultFlightControllerConfig(
      selectedFlightController,
      selectedReceiver,
    )),
  ];
}

function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="fc-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function featuresForBoard(profile, receiverProtocol, firmwareFamily) {
  const supported = profile.featureSupport || {};
  return Object.fromEntries(
    FC_FEATURES.map((feature) => [
      feature.id,
      Boolean(supported[feature.id]) &&
        (firmwareFamily !== "aerialkit" || !["osd", "blackbox"].includes(feature.id)) &&
        (feature.id !== "gps" || Boolean(profile.gpsUart)) &&
        (feature.id !== "telemetry" || receiverProtocol !== "sbus"),
    ]),
  );
}

export default function FlightControllerSetup({
  value,
  onChange,
  onSave,
  selectedFlightController = null,
  selectedReceiver = null,
  buildMotorCount = null,
  storageKey = "rotorbench:flightControllerPlan",
}) {
  const [config, updateConfig, resetInternal] = useFlightControllerConfig(
    value,
    onChange,
    selectedFlightController,
    selectedReceiver,
    storageKey,
  );
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    if (value || !selectedReceiver?.protocol) return;
    const nextProtocol = selectedReceiver.protocol.toLowerCase().includes("sbus") ? "sbus" : "crsf";
    if (nextProtocol !== config.receiverProtocol) {
      const protocolSpec = RECEIVER_PROTOCOLS.find((item) => item.value === nextProtocol);
      updateConfig({
        ...config,
        receiverProtocol: nextProtocol,
        receiverBaud: protocolSpec?.baud || config.receiverBaud,
        features: {
          ...config.features,
          telemetry: nextProtocol === "sbus" ? false : config.features.telemetry,
        },
      });
    }
    // Only synchronise when the selected receiver changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReceiver?.id]);

  const documentedProfiles = FC_BOARD_PROFILES.filter(
    (profile) => profile.family === config.firmwareFamily,
  );
  const profile = useMemo(() => {
    const profileBase = getBoardProfile(config.profileId, selectedFlightController);
    return config.firmwareFamily === "aerialkit" && profileBase.id === "custom-board"
      ? {
          ...profileBase,
          featureSupport: {
            ...profileBase.featureSupport,
            osd: false,
            blackbox: false,
          },
        }
      : profileBase;
  }, [config.firmwareFamily, config.profileId, selectedFlightController]);
  const channelPreset = getChannelPreset(config);
  const availableChannelPresets = CHANNEL_PRESETS.filter((preset) => (
    config.firmwareFamily === "aerialkit"
      ? preset.id.startsWith("aerialkit-")
      : config.firmwareFamily === "betaflight"
        ? preset.id === "betaflight-bench"
        : false
  ));
  const visibleChannelPreset = availableChannelPresets.find(
    (preset) => preset.id === channelPreset?.id,
  );
  const aerialKitControlRoles = getAerialKitControlRoles(profile);
  const aerialKitRoleKeys = new Set(
    aerialKitControlRoles.map((role) => role.key),
  );
  const aerialKitRoleRows = {
    velocity: {
      id: "velocity",
      label: "Velocity mode",
      mode: "Optional; 0 disables",
    },
    manual: {
      id: "manual",
      label: "Manual override",
      mode: "Workspace switch; 0 disables",
    },
    control: {
      id: "control",
      label: "Control mode",
      mode: "Workspace switch; 0 disables",
    },
    systemId: {
      id: "systemId",
      label: "System ID",
      mode: "Workspace excitation switch; 0 disables",
    },
  };
  const aerialKitChannelRows = [
    ...DEFAULT_CHANNELS.filter((channel) => (
      ["throttle", "roll", "pitch", "yaw", "mode", "arm"].includes(channel.id)
    )),
    ...aerialKitControlRoles
      .filter((role) => !["arm", "flightMode"].includes(role.key))
      .map((role) => aerialKitRoleRows[role.key])
      .filter(Boolean),
  ];
  const visibleChannelRows = config.firmwareFamily === "aerialkit"
    ? aerialKitChannelRows
    : DEFAULT_CHANNELS;
  const channelMinimum = config.firmwareFamily === "aerialkit" ? 5 : 1;
  const channelMaximum = config.firmwareFamily === "aerialkit" ? 8 : 16;
  const protocol = RECEIVER_PROTOCOLS.find((item) => item.value === config.receiverProtocol);
  const motorLayout = getAirframeMotorLayout(
    config.airframe,
    config.firmwareFamily,
    config.motorDirection,
  );
  const requestedGyroRateHz = Number(config.gyroRateHz);
  const loopDivisor = Number(config.pidDenom);
  const requestedLoopHz = requestedGyroRateHz > 0 && loopDivisor > 0
    ? requestedGyroRateHz / loopDivisor
    : null;
  const requestedLoopPeriodUs = requestedLoopHz
    ? Math.round(1000000 / requestedLoopHz)
    : null;
  const requestedLoopFrequencyLabel = requestedLoopHz
    ? `${Math.round(requestedLoopHz * 10) / 10} Hz`
    : "Driver default";
  const motorDirection = MOTOR_DIRECTIONS.find(
    (option) => option.value === config.motorDirection,
  ) || MOTOR_DIRECTIONS[0];
  const motorLayoutSource = config.firmwareFamily === "betaflight"
    ? `Betaflight ${motorDirection.label} QUAD X`
    : "Aerial Kit mixer order";
  const motorLayoutBoundary = config.firmwareFamily === "betaflight"
    ? config.motorDirection === "props-out"
      ? "Reversed Betaflight QUAD X uses props-out at the front. Motor wiring/direction and the yaw-reversed setting must both match; verify every output in Motor Test with props removed."
      : "Normal Betaflight QUAD X assumes props-in at the front. Verify every output in Motor Test with props removed."
    : "Confirm the physical motor positions and prop directions before power.";
  const motorLayoutNodes = motorLayout
    ? motorLayout.motors.map((motor, index) => {
        const duplicateIndex = motorLayout.motors
          .slice(0, index)
          .filter((candidate) => (
            candidate.x === motor.x && candidate.z === motor.z
          ))
          .length;
        return {
          ...motor,
          displayX: motor.x + duplicateIndex * 0.16,
          displayZ: motor.z + duplicateIndex * 0.1,
        };
      })
    : [];
  const issues = useMemo(
    () => validateFlightControllerConfig(config, profile, { buildMotorCount }),
    [buildMotorCount, config, profile],
  );
  const summary = useMemo(
    () => buildFlightControllerSummary(config, profile),
    [config, profile],
  );
  const armingPreview = useMemo(
    () => buildArmingGatePreview(config, profile, issues),
    [config, issues, profile],
  );
  const commandPreview = useMemo(
    () => buildFlightControllerCommands(config, { issues, profile }),
    [config, issues, profile],
  );

  const update = (path, nextValue) => {
    if (path.includes(".")) {
      const [group, key] = path.split(".");
      updateConfig({ ...config, [group]: { ...config[group], [key]: nextValue } });
      return;
    }
    updateConfig({ ...config, [path]: nextValue });
  };
  const optionalChannel = (value) => value === "" ? null : Number(value);
  const numericInput = (value) => value === "" ? null : Number(value);
  const numericValue = (value) => (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  ) ? Number(value) : "";
  const numericInvalid = (value) => (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  );
  const integerInvalid = (value) => (
    numericInvalid(value) || !Number.isInteger(Number(value))
  );

  const changeFamily = (familyId) => {
    const profileForFamily = FC_BOARD_PROFILES.find((item) => item.family === familyId);
    const nextProfile =
      profileForFamily || getBoardProfile("custom-board", selectedFlightController);
    const expressLrsReceiver = [
      selectedReceiver?.name,
      selectedReceiver?.protocol,
    ].some((value) => /elrs|expresslrs|crsf/i.test(String(value || "")));
    const preset = CHANNEL_PRESETS.find(
      (item) =>
        item.id === (
          familyId === "aerialkit"
            ? expressLrsReceiver
              ? "aerialkit-elrs"
              : "aerialkit-firmware"
            : familyId === "betaflight"
              ? "betaflight-bench"
              : ""
        ),
    ) || null;
    const aerialKit = familyId === "aerialkit";
    const roleKeys = new Set(
      getAerialKitControlRoles(nextProfile).map((role) => role.key),
    );
    updateConfig({
      ...config,
      firmwareFamily: familyId,
      profileId: nextProfile.id,
      airframe: nextProfile.defaultAirframe,
      motorDirection: "props-in",
      receiverUart: nextProfile.receiverUart,
      receiverBaud: config.receiverProtocol === "sbus"
        ? nextProfile.sbusBaud
        : nextProfile.receiverBaud,
      features: featuresForBoard(nextProfile, config.receiverProtocol, familyId),
      modeChannel: preset?.modeChannel ?? null,
      armChannel: preset?.armChannel ?? null,
      beeperChannel: preset?.beeperChannel ?? null,
      velocityChannel: aerialKit && roleKeys.has("velocity")
        ? config.velocityChannel ?? null
        : null,
      manualChannel: !aerialKit || roleKeys.has("manual")
        ? config.manualChannel ?? null
        : null,
      ctrlChannel: !aerialKit || roleKeys.has("control")
        ? config.ctrlChannel ?? null
        : null,
      sysidChannel: !aerialKit || roleKeys.has("systemId")
        ? config.sysidChannel ?? null
        : null,
    });
  };

  const changeProfile = (profileId) => {
    const nextProfile = getBoardProfile(profileId, selectedFlightController);
    const roleKeys = new Set(
      getAerialKitControlRoles(nextProfile).map((role) => role.key),
    );
    updateConfig({
      ...config,
      profileId,
      airframe: nextProfile.defaultAirframe,
      receiverUart: nextProfile.receiverUart,
      receiverBaud: config.receiverProtocol === "sbus"
        ? nextProfile.sbusBaud
        : nextProfile.receiverBaud,
      features: featuresForBoard(
        nextProfile,
        config.receiverProtocol,
        config.firmwareFamily,
      ),
      velocityChannel: roleKeys.has("velocity")
        ? config.velocityChannel
        : null,
      manualChannel: roleKeys.has("manual")
        ? config.manualChannel
        : null,
      ctrlChannel: roleKeys.has("control")
        ? config.ctrlChannel
        : null,
      sysidChannel: roleKeys.has("systemId")
        ? config.sysidChannel
        : null,
    });
  };

  const changeProtocol = (protocolId) => {
    const nextProtocol = RECEIVER_PROTOCOLS.find((item) => item.value === protocolId);
    updateConfig({
      ...config,
      receiverProtocol: protocolId,
      receiverBaud: nextProtocol?.baud || config.receiverBaud,
      features: {
        ...config.features,
        telemetry: protocolId === "sbus" ? false : config.features.telemetry,
      },
    });
  };

  const reset = () => {
    const next = createDefaultFlightControllerConfig(
      selectedFlightController,
      selectedReceiver,
    );
    if (value === undefined) resetInternal();
    onChange?.(next);
    setSaveState("Recommended defaults restored.");
  };

  const savePlan = () => {
    if (onSave) {
      onSave(config);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(config));
    }
    const blockerCount = issues.filter((issue) => issue.severity === "error").length;
    setSaveState(
      blockerCount
        ? `Draft saved locally with ${blockerCount} unresolved blocker${blockerCount === 1 ? "" : "s"}. No hardware was changed.`
        : "Configuration plan saved locally. No hardware was changed.",
    );
  };

  const exportPlan = () => {
    const payload = {
      format: "rotorbench-flight-controller-plan/1",
      generatedAt: new Date().toISOString(),
      config,
      profile,
      issues,
      wiring: wiringPlan,
      summary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rotorbench-fc-plan-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setSaveState("Configuration plan exported.");
  };

  const copyCommands = async () => {
    if (!commandPreview.supported) {
      setSaveState(commandPreview.reason);
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setSaveState("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(commandPreview.text);
      setSaveState("Command preview copied. No command was sent to hardware.");
    } catch {
      setSaveState("The browser refused clipboard access.");
    }
  };

  const copyWiring = async () => {
    if (!navigator.clipboard?.writeText) {
      setSaveState("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(wiringPlan.copyText);
      setSaveState("Wiring checklist copied. No continuity or hardware state was verified.");
    } catch {
      setSaveState("The browser refused clipboard access.");
    }
  };

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;
  const readinessClass = errorCount
    ? "has-error"
    : warningCount
      ? "has-warning"
      : "is-clear";
  const readinessLabel = errorCount
    ? `${errorCount} blocker${errorCount === 1 ? "" : "s"}`
    : warningCount
      ? `FC · ${warningCount} review item${warningCount === 1 ? "" : "s"}`
      : "Checks clear";
  const channelIsInvalid = (channel) =>
    channel != null && (
      !Number.isInteger(channel) ||
      channel < channelMinimum ||
      channel > channelMaximum
    );
  const airframeSpec = AIRFRAMES.find((item) => item.value === config.airframe);
  const receiverPathResolved = Boolean(
    selectedReceiver?.id &&
    profile.receiverPins &&
    !/not mapped/i.test(profile.receiverPins),
  );
  const wiringPlan = useMemo(
    () => buildReceiverWiringPlan(config, profile, selectedReceiver),
    [config, profile, selectedReceiver],
  );
  const focusIssueTarget = (issueCode) => {
    const target = FLIGHT_CONTROLLER_ISSUE_TARGETS[issueCode]
      || { id: "fc-family", label: "flight-controller setup" };
    const element = document.getElementById(target.id);
    if (!element) return;
    element.scrollIntoView?.({
      block: "center",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    element.focus();
  };

  return (
    <div className="fc-setup">
      <header className="fc-setup-heading">
        <div>
          <h2>Flight controller</h2>
          <p>Plan the firmware, receiver wiring, outputs, and arming rules for the selected aircraft.</p>
        </div>
        <div className="fc-plan-state">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Local configuration plan</span>
        </div>
      </header>

      <div className="fc-context-strip">
        <div>
          <small>Build controller</small>
          <strong>{selectedFlightController?.name || "None selected"}</strong>
        </div>
        <div>
          <small>Build receiver</small>
          <strong>{selectedReceiver?.name || "None selected"}</strong>
        </div>
        <div>
          <small>Transport</small>
          <strong>{FIRMWARE_FAMILIES.find((item) => item.id === config.firmwareFamily)?.transport}</strong>
        </div>
      </div>

      <section className="fc-signal-path" aria-labelledby="fc-signal-path-title">
        <div className="fc-signal-path-heading">
          <div>
            <h3 id="fc-signal-path-title">Control path</h3>
            <p>
              The selected radio endpoint reaches the planned airframe through
              this serial and output chain.
            </p>
          </div>
          <span className={receiverPathResolved ? "is-resolved" : "is-unresolved"}>
            {receiverPathResolved ? "Pins documented" : "Mapping incomplete"}
          </span>
        </div>
        <ol>
          <li>
            <RadioTower size={16} aria-hidden="true" />
            <span>
              <small>Radio endpoint</small>
              <strong>{selectedReceiver?.name || "Receiver not selected"}</strong>
              <b>{protocol?.label || "Protocol not selected"}</b>
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Cable size={16} aria-hidden="true" />
            <span>
              <small>Serial route</small>
              <strong>{config.receiverUart || "UART not assigned"}</strong>
              <b>{profile.receiverPins || "Pins not mapped"} · {config.receiverBaud || "rate not set"} baud</b>
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Cpu size={16} aria-hidden="true" />
            <span>
              <small>Airframe</small>
              <strong>{airframeSpec?.label || "Airframe not selected"}</strong>
              <b>{airframeSpec?.motors ?? 0} motors · {airframeSpec?.servos ?? 0} servos</b>
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Zap size={16} aria-hidden="true" />
            <span>
              <small>Motor protocol</small>
              <strong>DShot {config.dshotKhz} kHz</strong>
              <b>{profile.outputs.motors} documented motor outputs</b>
            </span>
          </li>
        </ol>
      </section>

      <div className="fc-setup-layout">
        <div className="fc-setup-form">
          <SetupSectionNav
            label="Flight controller sections"
            items={[
              { id: "fc-profile-title", label: "Board" },
              { id: "fc-receiver-title", label: "Receiver" },
              ...(config.firmwareFamily === "aerialkit"
                ? [{ id: "fc-aircraft-integration-title", label: "Sensor" }]
                : []),
              { id: "fc-safety-title", label: "Arming" },
              { id: "fc-channels-title", label: "Channels" },
            ]}
          />
          <section className="fc-section" aria-labelledby="fc-profile-title">
            <div className="fc-section-heading">
              <Cpu size={18} aria-hidden="true" />
              <div>
                <h3 id="fc-profile-title">Board and firmware</h3>
                <p>Known board maps use documented pins. A custom board keeps those fields unresolved until verified.</p>
              </div>
            </div>

            <div className="fc-field-grid">
              <Field label="Firmware family" htmlFor="fc-family">
                <select id="fc-family" value={config.firmwareFamily} onChange={(event) => changeFamily(event.target.value)}>
                  {FIRMWARE_FAMILIES.map((family) => (
                    <option key={family.id} value={family.id}>{family.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Board profile"
                htmlFor="fc-profile"
                hint={documentedProfiles.length === 0 ? "No documented board map is bundled for this firmware family." : profile.board}
              >
                <select id="fc-profile" value={config.profileId} onChange={(event) => changeProfile(event.target.value)}>
                  {documentedProfiles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {item.availability === "workspace"
                        ? " · workspace source, not public build"
                        : ""}
                    </option>
                  ))}
                  <option value="custom-board">
                    {selectedFlightController?.name ? `Custom: ${selectedFlightController.name}` : "Custom board"}
                  </option>
                </select>
              </Field>

              <Field label="Airframe" htmlFor="fc-airframe">
                <select id="fc-airframe" value={config.airframe} onChange={(event) => update("airframe", event.target.value)}>
                  {AIRFRAMES.map((airframe) => (
                    <option key={airframe.value} value={airframe.value}>
                      {airframe.label} · {airframe.motors} motor{airframe.motors === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="DShot rate"
                htmlFor="fc-dshot"
                hint={config.firmwareFamily === "aerialkit"
                  ? "Aerial Kit accepts 150, 300, or 600 kHz."
                  : "Confirm the supported rate for the selected firmware."}
              >
                <select id="fc-dshot" value={config.dshotKhz} onChange={(event) => update("dshotKhz", Number(event.target.value))}>
                  {[150, 300, 600].map((rate) => <option key={rate} value={rate}>{rate} kHz</option>)}
                </select>
              </Field>

              {config.firmwareFamily === "aerialkit" && (
                <>
                  <Field
                    label="Requested gyro rate"
                    htmlFor="fc-gyro-rate"
                    hint="0 = board driver default; otherwise 0 to 8000 Hz"
                  >
                    <input
                      id="fc-gyro-rate"
                      type="number"
                      min="0"
                      max="8000"
                      step="1"
                      aria-invalid={integerInvalid(config.gyroRateHz)}
                      value={numericValue(config.gyroRateHz)}
                      onChange={(event) => update("gyroRateHz", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field
                    label="Loop divisor"
                    htmlFor="fc-pid-denom"
                    hint="One control pass every N gyro samples, 1 to 32"
                  >
                    <input
                      id="fc-pid-denom"
                      type="number"
                      min="1"
                      max="32"
                      step="1"
                      aria-invalid={integerInvalid(config.pidDenom)}
                      value={numericValue(config.pidDenom)}
                      onChange={(event) => update("pidDenom", numericInput(event.target.value))}
                    />
                  </Field>
                </>
              )}

              {config.firmwareFamily === "betaflight" && (
                <Field
                  label="Motor direction"
                  htmlFor="fc-motor-direction"
                  hint={motorDirection.note}
                >
                  <select
                    id="fc-motor-direction"
                    value={config.motorDirection || "props-in"}
                    onChange={(event) => update(
                      "motorDirection",
                      event.target.value,
                    )}
                  >
                    {MOTOR_DIRECTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {config.firmwareFamily === "aerialkit" && (
              <div className="fc-loop-plan" role="status">
                <Gauge size={16} aria-hidden="true" />
                <span>
                  <small>Requested control loop</small>
                  <strong>{requestedLoopFrequencyLabel}</strong>
                  <b>
                    {requestedLoopPeriodUs
                      ? `${requestedLoopPeriodUs} µs period · gyro request ÷ ${loopDivisor}`
                      : `Gyro rate follows the board driver · divisor ${loopDivisor}`}
                  </b>
                </span>
                <em>Request only</em>
              </div>
            )}
            {config.firmwareFamily === "aerialkit" && (
              <p className="fc-loop-note">
                The IMU may choose a lower supported sample rate. Actual loop
                timing and scheduler drops require live flight-controller evidence.
              </p>
            )}

            <div className="fc-board-facts">
              <div><span>Processor</span><strong>{profile.processor}</strong></div>
              <div><span>IMU</span><strong>{profile.imu}</strong></div>
              <div><span>IMU bus</span><strong>{profile.imuBus}</strong></div>
              <div><span>Outputs</span><strong>{profile.outputs.motors} motors / {profile.outputs.servos} servos</strong></div>
            </div>

            {profile.flightLog?.available && (
              <div
                className="fc-board-log"
                role="group"
                aria-label="Internal flight log"
              >
                <Database size={16} aria-hidden="true" />
                <span>
                  <small>Internal flight log</small>
                  <strong>{profile.flightLog.label}</strong>
                  <b>{profile.flightLog.retention}</b>
                </span>
                <em>Read-only capability</em>
              </div>
            )}

            {motorLayout && (
              <figure className="fc-motor-layout-panel">
                <figcaption>
                  <div>
                    <Crosshair size={16} aria-hidden="true" />
                    <span>
                      <small>{motorLayoutSource}</small>
                      <strong>Motor output map</strong>
                    </span>
                  </div>
                  <em>{motorLayout.motors.length} motor outputs</em>
                </figcaption>
                <div className={`fc-motor-layout is-${motorLayout.shape}`}>
                  <span className="fc-motor-layout-front">Front</span>
                  <ol aria-label={`${AIRFRAMES.find((item) => item.value === config.airframe)?.label || "Selected airframe"} motor outputs`}>
                    {motorLayoutNodes.map((motor) => (
                      <li
                        key={motor.output}
                        style={{
                          left: `${50 + motor.displayX * 32}%`,
                          top: `${50 + motor.displayZ * 32}%`,
                        }}
                      >
                        <strong>{motor.output}</strong>
                        <span>{motor.label}</span>
                        <small>{motor.spin}</small>
                      </li>
                    ))}
                  </ol>
                </div>
                <p>
                  Output order comes from the selected firmware's published mixer layout.
                  {motorLayout.servos > 0
                    ? ` ${motorLayout.servos} servo output${motorLayout.servos === 1 ? "" : "s"} still require direction checks.`
                    : ""}
                  {" "}{motorLayoutBoundary}
                </p>
              </figure>
            )}
            {!motorLayout && config.firmwareFamily !== "aerialkit" && (
              <div className="fc-motor-layout-missing" role="note">
                <Crosshair size={16} aria-hidden="true" />
                <span>
                  <strong>Motor output map unavailable</strong>
                  <small>
                    {config.firmwareFamily === "betaflight"
                      ? "RotorBench currently bundles Betaflight's normal QUAD X order only. Select Quad X or verify this mixer order directly in Betaflight."
                      : `No verified ${
                        FIRMWARE_FAMILIES.find((family) => family.id === config.firmwareFamily)?.label
                          || config.firmwareFamily
                      } motor map is bundled. Verify the mixer in its configurator.`}
                  </small>
                </span>
              </div>
            )}
          </section>

          <section className="fc-section" aria-labelledby="fc-receiver-title">
            <div className="fc-section-heading">
              <Cable size={18} aria-hidden="true" />
              <div>
                <h3 id="fc-receiver-title">Receiver and serial</h3>
                <p>CRSF carries control and telemetry. SBUS is input-only and may require an inverter.</p>
              </div>
            </div>

            <div className="fc-field-grid">
              <Field label="Protocol" htmlFor="fc-protocol">
                <select id="fc-protocol" value={config.receiverProtocol} onChange={(event) => changeProtocol(event.target.value)}>
                  {RECEIVER_PROTOCOLS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Receiver UART"
                htmlFor="fc-uart"
                hint={profile.receiverUartLocked
                  ? `Compiled board mapping${profile.receiverPins ? `: ${profile.receiverPins}` : ""}.`
                  : profile.receiverPins
                    ? `Documented pins: ${profile.receiverPins}`
                    : "Verify the selected board before wiring."}
              >
                <input
                  id="fc-uart"
                  disabled={profile.receiverUartLocked}
                  value={config.receiverUart}
                  onChange={(event) => update("receiverUart", event.target.value.toUpperCase())}
                />
              </Field>

              <Field label="Line rate" htmlFor="fc-baud" hint={protocol ? `${protocol.frame}${protocol.telemetry ? " with telemetry" : ", no return path"}` : ""}>
                <input
                  id="fc-baud"
                  type="number"
                  min="9600"
                  step="1"
                  disabled={profile.receiverUartLocked}
                  aria-invalid={integerInvalid(config.receiverBaud)}
                  value={numericValue(config.receiverBaud)}
                  onChange={(event) => update("receiverBaud", numericInput(event.target.value))}
                />
              </Field>
            </div>

            <details className="fc-wiring-plan">
              <summary>
                <Cable size={15} aria-hidden="true" />
                <span>
                  <strong>Receiver wiring</strong>
                  <small>
                    {wiringPlan.uart} · {wiringPlan.pins} · {wiringPlan.baud || "rate not set"} baud
                  </small>
                </span>
                <em className={wiringPlan.documented ? "is-documented" : "is-unverified"}>
                  {wiringPlan.documented ? "Pins documented" : "Verify pins"}
                </em>
              </summary>
              <div>
                <p>
                  Planning checklist for {wiringPlan.receiverName}. No continuity,
                  polarity, receiver supply, or hardware state has been verified.
                </p>
                <ol aria-label="Receiver wiring checklist">
                  {wiringPlan.steps.map((step) => (
                    <li key={step.id}>
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={copyWiring}>
                  <Clipboard size={14} aria-hidden="true" />
                  Copy wiring checklist
                </button>
              </div>
            </details>

            {config.firmwareFamily === "aerialkit" && (
              <div className="fc-calibration">
                <div className="fc-calibration-heading">
                  <strong>Receiver calibration plan</strong>
                  <span>
                    Firmware decodes sticks with these saved counts and deadband.
                    Verify them against live RC channels before relying on the plan.
                  </span>
                </div>
                <div className="fc-field-grid fc-calibration-grid">
                  <Field label="Full low" htmlFor="fc-rc-min" hint="0 to 500">
                    <input
                      id="fc-rc-min"
                      type="number"
                      min="0"
                      max="500"
                      step="1"
                      aria-invalid={numericInvalid(config.rcMin)}
                      value={numericValue(config.rcMin)}
                      onChange={(event) => update("rcMin", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Centre" htmlFor="fc-rc-mid" hint="500 to 1500">
                    <input
                      id="fc-rc-mid"
                      type="number"
                      min="500"
                      max="1500"
                      step="1"
                      aria-invalid={numericInvalid(config.rcMid)}
                      value={numericValue(config.rcMid)}
                      onChange={(event) => update("rcMid", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Full high" htmlFor="fc-rc-max" hint="1200 to 2500">
                    <input
                      id="fc-rc-max"
                      type="number"
                      min="1200"
                      max="2500"
                      step="1"
                      aria-invalid={numericInvalid(config.rcMax)}
                      value={numericValue(config.rcMax)}
                      onChange={(event) => update("rcMax", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Deadband" htmlFor="fc-rc-deadband" hint="Fraction of travel, 0 to 0.2">
                    <input
                      id="fc-rc-deadband"
                      type="number"
                      min="0"
                      max="0.2"
                      step="0.001"
                      aria-invalid={numericInvalid(config.rcDeadband)}
                      value={numericValue(config.rcDeadband)}
                      onChange={(event) => update("rcDeadband", numericInput(event.target.value))}
                    />
                  </Field>
                </div>
              </div>
            )}

            <fieldset className="fc-feature-list">
              <legend>Enabled features</legend>
              {FC_FEATURES.map((feature) => (
                <label
                  key={feature.id}
                  className={profile.featureSupport?.[feature.id] === false ? "is-unavailable" : ""}
                    title={profile.featureSupport?.[feature.id] === false
                      ? feature.id === "blackbox" && config.firmwareFamily === "aerialkit"
                        ? "Aerial Kit logs internally; this external blackbox field is not applicable"
                        : "Not exposed by this documented board profile"
                      : undefined}
                >
                  <input
                    id={`fc-feature-${feature.id}`}
                    type="checkbox"
                    disabled={profile.featureSupport?.[feature.id] === false}
                    checked={Boolean(config.features[feature.id])}
                    onChange={(event) => update(`features.${feature.id}`, event.target.checked)}
                  />
                  <span>{feature.label}</span>
                </label>
              ))}
            </fieldset>
          </section>

          {config.firmwareFamily === "aerialkit" && (
            <section className="fc-section" aria-labelledby="fc-aircraft-integration-title">
              <div className="fc-section-heading">
                <Compass size={18} aria-hidden="true" />
                <div>
                  <h3 id="fc-aircraft-integration-title">Sensor and power</h3>
                  <p>
                    Aerial Kit board-to-airframe rotation and pack-voltage telemetry.
                    These are planned firmware values, not completed calibration.
                  </p>
                </div>
              </div>

              <div className="fc-calibration fc-alignment-plan">
                <div className="fc-calibration-heading">
                  <strong>Board alignment plan</strong>
                  <span>
                    Set the mounting rotation before sensor calibration. Zero means
                    the board axes align with the airframe.
                  </span>
                </div>
                <div
                  className="fc-alignment-order"
                  role="note"
                  aria-label="Aerial Kit applies alignment roll, then pitch, then yaw"
                >
                  <span><small>1 · Roll</small><strong>X axis</strong></span>
                  <ArrowRight size={14} aria-hidden="true" />
                  <span><small>2 · Pitch</small><strong>Y axis</strong></span>
                  <ArrowRight size={14} aria-hidden="true" />
                  <span><small>3 · Yaw</small><strong>Z axis</strong></span>
                </div>
                <div className="fc-field-grid fc-field-grid-three">
                  <Field label="Alignment roll" htmlFor="fc-align-roll" hint="-180 to 180 degrees">
                    <input
                      id="fc-align-roll"
                      type="number"
                      min="-180"
                      max="180"
                      step="0.1"
                      aria-invalid={numericInvalid(config.alignRollDeg)}
                      value={numericValue(config.alignRollDeg)}
                      onChange={(event) => update("alignRollDeg", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Alignment pitch" htmlFor="fc-align-pitch" hint="-180 to 180 degrees">
                    <input
                      id="fc-align-pitch"
                      type="number"
                      min="-180"
                      max="180"
                      step="0.1"
                      aria-invalid={numericInvalid(config.alignPitchDeg)}
                      value={numericValue(config.alignPitchDeg)}
                      onChange={(event) => update("alignPitchDeg", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Alignment yaw" htmlFor="fc-align-yaw" hint="-180 to 180 degrees">
                    <input
                      id="fc-align-yaw"
                      type="number"
                      min="-180"
                      max="180"
                      step="0.1"
                      aria-invalid={numericInvalid(config.alignYawDeg)}
                      value={numericValue(config.alignYawDeg)}
                      onChange={(event) => update("alignYawDeg", numericInput(event.target.value))}
                    />
                  </Field>
                </div>
                <p className="fc-alignment-note">
                  Verify the sign by tilting the aircraft and watching the live
                  attitude report. This plan does not calibrate or observe the IMU.
                </p>
              </div>

              <div className="fc-calibration fc-battery-plan">
                <div className="fc-calibration-heading">
                  <strong>Battery telemetry plan</strong>
                  <span>
                    Firmware parameters for pack-voltage scaling and cell thresholds.
                    Verify the divider against a measured pack before flight.
                  </span>
                </div>
                <div className="fc-field-grid fc-calibration-grid">
                  <Field label="ADC divider ratio" htmlFor="fc-vbat-ratio" hint="Pack volts per pin volt, 1 to 50">
                    <input
                      id="fc-vbat-ratio"
                      type="number"
                      min="1"
                      max="50"
                      step="0.001"
                      aria-invalid={numericInvalid(config.vbatRatio)}
                      value={numericValue(config.vbatRatio)}
                      onChange={(event) => update("vbatRatio", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Cell override" htmlFor="fc-vbat-cells" hint="0 = auto-detect; 1 to 8">
                    <input
                      id="fc-vbat-cells"
                      type="number"
                      min="0"
                      max="8"
                      step="1"
                      aria-invalid={integerInvalid(config.vbatCells)}
                      value={numericValue(config.vbatCells)}
                      onChange={(event) => update("vbatCells", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Warning threshold" htmlFor="fc-vbat-warn" hint="Volts per cell, 1 to 5">
                    <input
                      id="fc-vbat-warn"
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      aria-invalid={numericInvalid(config.vbatWarnCell)}
                      value={numericValue(config.vbatWarnCell)}
                      onChange={(event) => update("vbatWarnCell", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Minimum threshold" htmlFor="fc-vbat-min" hint="Volts per cell, 1 to 5">
                    <input
                      id="fc-vbat-min"
                      type="number"
                      min="1"
                      max="5"
                      step="0.01"
                      aria-invalid={numericInvalid(config.vbatMinCell)}
                      value={numericValue(config.vbatMinCell)}
                      onChange={(event) => update("vbatMinCell", numericInput(event.target.value))}
                    />
                  </Field>
                </div>
                <label className="fc-plan-toggle" htmlFor="fc-battery-rth">
                  <input
                    id="fc-battery-rth"
                    type="checkbox"
                    checked={Boolean(config.batteryRthEnabled)}
                    onChange={(event) => update("batteryRthEnabled", event.target.checked)}
                  />
                  <span>
                    <strong>Return home on critical pack</strong>
                    <small>
                      Sets <code>battery_rth</code>. Requires a GPS fix; the return latches
                      until landing or disarm, and stick movement does not cancel it.
                    </small>
                  </span>
                  <em>{config.batteryRthEnabled ? "Enabled" : "Off"}</em>
                </label>
              </div>
            </section>
          )}

          <section className="fc-section" aria-labelledby="fc-safety-title">
            <div className="fc-section-heading">
              <Gauge size={18} aria-hidden="true" />
              <div>
                <h3 id="fc-safety-title">Arming and failsafe</h3>
                <p>These values describe the intended setup. They do not arm, calibrate, flash, or test a physical aircraft.</p>
              </div>
            </div>

            <div className="fc-field-grid fc-field-grid-three">
              <Field label="Arm channel" htmlFor="fc-arm-channel">
                <input
                  id="fc-arm-channel"
                  type="number"
                  min={channelMinimum}
                  max={channelMaximum}
                  aria-invalid={config.armChannel == null || channelIsInvalid(config.armChannel)}
                  value={config.armChannel ?? ""}
                  onChange={(event) => update("armChannel", optionalChannel(event.target.value))}
                />
              </Field>
              <Field label="Flight-mode channel" htmlFor="fc-mode-channel">
                <input
                  id="fc-mode-channel"
                  type="number"
                  min={channelMinimum}
                  max={channelMaximum}
                  aria-invalid={channelIsInvalid(config.modeChannel)}
                  value={config.modeChannel ?? ""}
                  onChange={(event) => update("modeChannel", optionalChannel(event.target.value))}
                />
              </Field>
              {config.firmwareFamily === "aerialkit" && aerialKitRoleKeys.has("velocity") ? (
                <Field
                  label="Velocity channel"
                  htmlFor="fc-velocity-channel"
                  hint="Optional CH5–8; leave blank to disable"
                >
                  <input
                    id="fc-velocity-channel"
                    type="number"
                    min={channelMinimum}
                    max={channelMaximum}
                    aria-invalid={channelIsInvalid(config.velocityChannel)}
                    value={config.velocityChannel ?? ""}
                    onChange={(event) => update(
                      "velocityChannel",
                      optionalChannel(event.target.value),
                    )}
                  />
                </Field>
              ) : config.firmwareFamily === "aerialkit" ? (
                <>
                  <Field label="Manual channel" htmlFor="fc-manual-channel" hint="Workspace switch; optional">
                    <input
                      id="fc-manual-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.manualChannel)}
                      value={config.manualChannel ?? ""}
                      onChange={(event) => update(
                        "manualChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                  <Field label="Control channel" htmlFor="fc-ctrl-channel" hint="Workspace switch; optional">
                    <input
                      id="fc-ctrl-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.ctrlChannel)}
                      value={config.ctrlChannel ?? ""}
                      onChange={(event) => update(
                        "ctrlChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                  <Field label="System-ID channel" htmlFor="fc-sysid-channel" hint="Workspace excitation switch; optional">
                    <input
                      id="fc-sysid-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.sysidChannel)}
                      value={config.sysidChannel ?? ""}
                      onChange={(event) => update(
                        "sysidChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field
                    label="Beeper channel"
                    htmlFor="fc-beeper-channel"
                    hint="Optional planned AUX mapping"
                  >
                    <input
                      id="fc-beeper-channel"
                      type="number"
                      min="1"
                      max="16"
                      aria-invalid={channelIsInvalid(config.beeperChannel)}
                      value={config.beeperChannel ?? ""}
                      onChange={(event) => update(
                        "beeperChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                  <Field label="Manual channel" htmlFor="fc-manual-channel" hint="Optional planned AUX">
                    <input
                      id="fc-manual-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.manualChannel)}
                      value={config.manualChannel ?? ""}
                      onChange={(event) => update(
                        "manualChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                  <Field label="Control channel" htmlFor="fc-ctrl-channel" hint="Optional planned AUX">
                    <input
                      id="fc-ctrl-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.ctrlChannel)}
                      value={config.ctrlChannel ?? ""}
                      onChange={(event) => update(
                        "ctrlChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                  <Field label="System-ID channel" htmlFor="fc-sysid-channel" hint="Optional planned AUX">
                    <input
                      id="fc-sysid-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.sysidChannel)}
                      value={config.sysidChannel ?? ""}
                      onChange={(event) => update(
                        "sysidChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                </>
              )}
              <Field label="Arm hold" htmlFor="fc-arm-hold" hint="Milliseconds">
                <input
                  id="fc-arm-hold"
                  type="number"
                  min="0"
                  max="5000"
                  step="50"
                  aria-invalid={integerInvalid(config.armHoldMs)}
                  value={numericValue(config.armHoldMs)}
                  onChange={(event) => update("armHoldMs", numericInput(event.target.value))}
                />
              </Field>
              <Field label="Maximum arm tilt" htmlFor="fc-arm-tilt" hint="Degrees">
                <input
                  id="fc-arm-tilt"
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  aria-invalid={numericInvalid(config.armMaxTiltDeg)}
                  value={numericValue(config.armMaxTiltDeg)}
                  onChange={(event) => update("armMaxTiltDeg", numericInput(event.target.value))}
                />
              </Field>
              <Field label="Link-loss action" htmlFor="fc-failsafe">
                <select id="fc-failsafe" value={config.failsafeAction} onChange={(event) => update("failsafeAction", event.target.value)}>
                  {FAILSAFE_ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Low-throttle gate" htmlFor="fc-throttle-low" hint="0 to 0.5">
                <input
                  id="fc-throttle-low"
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.01"
                  aria-invalid={numericInvalid(config.throttleLow)}
                  value={numericValue(config.throttleLow)}
                  onChange={(event) => update("throttleLow", numericInput(event.target.value))}
                />
              </Field>
              <Field label="Receiver timeout" htmlFor="fc-rc-timeout" hint="Milliseconds">
                <input
                  id="fc-rc-timeout"
                  type="number"
                  min="50"
                  max="2000"
                  step="10"
                  aria-invalid={integerInvalid(config.rcTimeoutMs)}
                  value={numericValue(config.rcTimeoutMs)}
                  onChange={(event) => update("rcTimeoutMs", numericInput(event.target.value))}
                />
              </Field>
              <Field label="Return to home" htmlFor="fc-rth-enabled">
                <select
                  id="fc-rth-enabled"
                  value={config.rthEnabled ? "enabled" : "disabled"}
                  onChange={(event) => update("rthEnabled", event.target.value === "enabled")}
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled when GPS is available</option>
                </select>
              </Field>
            </div>

            {config.firmwareFamily === "aerialkit" && (
              <div className="fc-calibration fc-fence-plan">
                <div className="fc-calibration-heading">
                  <strong>Geofence return plan</strong>
                  <span>
                    Leaving the radius or climbing above the ceiling hands control
                    to the return; control comes back once the aircraft is inside.
                  </span>
                </div>
                <label className="fc-plan-toggle" htmlFor="fc-fence-enabled">
                  <input
                    id="fc-fence-enabled"
                    type="checkbox"
                    checked={Boolean(config.fenceEnabled)}
                    onChange={(event) => update("fenceEnabled", event.target.checked)}
                  />
                  <span>
                    <strong>Enable Aerial Kit geofence</strong>
                    <small>
                      Sets <code>fence_enable</code>. This is a trigger that takes
                      control while outside the configured box, not a stick clamp.
                    </small>
                  </span>
                  <em>{config.fenceEnabled ? "Enabled" : "Off"}</em>
                </label>
                <div className="fc-field-grid">
                  <Field
                    label="Fence radius"
                    htmlFor="fc-fence-radius"
                    hint="Metres from home, 0 to 5000; enabled fence requires above 0"
                  >
                    <input
                      id="fc-fence-radius"
                      type="number"
                      min="0"
                      max="5000"
                      step="1"
                      aria-invalid={numericInvalid(config.fenceRadiusM)}
                      value={numericValue(config.fenceRadiusM)}
                      onChange={(event) => update("fenceRadiusM", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field
                    label="Fence ceiling"
                    htmlFor="fc-fence-ceiling"
                    hint="Metres above home, 0 to 5000; 0 means no ceiling"
                  >
                    <input
                      id="fc-fence-ceiling"
                      type="number"
                      min="0"
                      max="5000"
                      step="1"
                      aria-invalid={numericInvalid(config.fenceCeilingM)}
                      value={numericValue(config.fenceCeilingM)}
                      onChange={(event) => update("fenceCeilingM", numericInput(event.target.value))}
                    />
                  </Field>
                </div>
                <p className="fc-alignment-note">
                  Set the radius wider than the aircraft's turn circle. At a
                  configured ceiling, the navigator holds 10 m below the lid.
                </p>
              </div>
            )}
          </section>

          <section className="fc-section" aria-labelledby="fc-channels-title">
            <div className="fc-section-heading">
              <SlidersHorizontal size={18} aria-hidden="true" />
              <div>
                <h3 id="fc-channels-title">Channel roles</h3>
                <p>The default AETR mapping matches the documented Aerial Kit receiver path.</p>
              </div>
            </div>
            <Field
              label="Mapping preset"
              htmlFor="fc-channel-preset"
              hint="Presets only set the firmware's documented control-switch channels."
            >
              <select
                id="fc-channel-preset"
                value={visibleChannelPreset?.id || "custom"}
                onChange={(event) => {
                  const preset = CHANNEL_PRESETS.find((item) => item.id === event.target.value);
                  if (preset) {
                    updateConfig({
                      ...config,
                      modeChannel: preset.modeChannel,
                      armChannel: preset.armChannel,
                      beeperChannel: preset.beeperChannel,
                    });
                  }
                }}
              >
                {availableChannelPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
                <option value="custom">Custom mapping</option>
              </select>
            </Field>
            <div className="fc-channel-map">
              {visibleChannelRows.map((channel) => {
                const configuredChannels = {
                  mode: config.modeChannel,
                  arm: config.armChannel,
                  velocity: config.velocityChannel,
                  beeper: config.beeperChannel,
                  manual: config.manualChannel,
                  control: config.ctrlChannel,
                  systemId: config.sysidChannel,
                };
                const configuredChannel = Object.hasOwn(configuredChannels, channel.id)
                  ? configuredChannels[channel.id]
                  : channel.channel;
                return (
                <div key={channel.id}>
                  <span>{channel.label}</span>
                  <strong>{configuredChannel == null ? "Not mapped" : `CH ${configuredChannel}`}</strong>
                  <small>{channel.mode}</small>
                </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="fc-plan-panel" aria-label="Configuration plan summary">
          <div className="fc-plan-panel-heading">
            <div>
              <h3>Plan summary</h3>
              <p>{profile.label}</p>
            </div>
            <span className={`fc-readiness ${readinessClass}`}>
              {errorCount ? <CircleAlert size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
              {readinessLabel}
            </span>
          </div>

          <div className="fc-issue-list">
            {issues.length === 0 ? (
              <p className="fc-no-issues"><Check size={15} aria-hidden="true" />No conflicts in the documented configuration.</p>
            ) : issues.map((issue) => (
              <div key={`${issue.code}-${issue.message}`} className={`fc-issue is-${issue.severity}`}>
                <AlertTriangle size={15} aria-hidden="true" />
                <span>{issue.message}</span>
                <button
                  type="button"
                  onClick={() => focusIssueTarget(issue.code)}
                  aria-label={`Review ${
                    FLIGHT_CONTROLLER_ISSUE_TARGETS[issue.code]?.label
                    || "flight-controller setup"
                  }`}
                >
                  Review
                </button>
              </div>
            ))}
          </div>

          {armingPreview.available && (
            <section className="fc-arming-preview" aria-labelledby="fc-arming-title">
              <div className="fc-arming-preview-heading">
                <div>
                  <span>Plan audit</span>
                  <h4 id="fc-arming-title">Arm-gate preview</h4>
                </div>
                <strong className={armingPreview.planBlockerCount ? "has-blocker" : "is-mapped"}>
                  {armingPreview.planBlockerCount
                    ? `${armingPreview.planBlockerCount} blocked`
                    : armingPreview.reviewCount
                      ? `${armingPreview.reviewCount} to verify`
                      : "Plan mapped"}
                </strong>
              </div>
              <p>
                RotorBench can resolve three configuration gates here. The remaining
                firmware gates need a live, disarmed aircraft and are not observed.
              </p>
              <ul className="fc-gate-list" aria-label="Aerial Kit plan checks">
                {armingPreview.planChecks.map((check) => (
                  <li key={check.id} className={`is-${check.status}`}>
                    <span className="fc-gate-dot" aria-hidden="true" />
                    <div>
                      <strong>{check.label}</strong>
                      <span>{check.detail}</span>
                      <code>{check.reason}</code>
                    </div>
                  </li>
                ))}
              </ul>
              <details className="fc-live-gates">
                <summary>
                  <span>Live gates</span>
                  <strong>{armingPreview.liveGates.length} not observed</strong>
                </summary>
                <ul className="fc-gate-list fc-gate-list-live" aria-label="Aerial Kit live gates not observed">
                  {armingPreview.liveGates.map((gate) => (
                    <li key={gate.id} className="is-unobserved">
                      <span className="fc-gate-dot" aria-hidden="true" />
                      <div>
                        <strong>{gate.label}</strong>
                        <span>{gate.detail}</span>
                        <code>{gate.reason}</code>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          <pre
            className="fc-plan-output"
            tabIndex={0}
            role="region"
            aria-label="Flight controller plan summary"
          >
            {summary.join("\n")}
          </pre>

          <details className="fc-command-preview">
            <summary>
              <Clipboard size={15} aria-hidden="true" />
              <span>
                <strong>Console command preview</strong>
                <small>Copy-only · no save command · nothing is executed</small>
              </span>
            </summary>
            <div>
              {commandPreview.supported ? (
                <>
                  {commandPreview.reason && <p>{commandPreview.reason}</p>}
                  <pre>{commandPreview.text}</pre>
                  <button type="button" onClick={copyCommands}>
                    <Clipboard size={14} aria-hidden="true" />
                    Copy commands
                  </button>
                </>
              ) : (
                <p>{commandPreview.reason}</p>
              )}
            </div>
          </details>

          <div className="fc-profile-notes">
            <h4>Board notes</h4>
            {profile.notes.map((note) => <p key={note}>{note}</p>)}
          </div>

          {profile.sourceRefs.length > 0 && (
            <div className="fc-source-list">
              <h4>Source references</h4>
              {profile.sourceRefs.map((source) => <code key={source}>{source}</code>)}
            </div>
          )}

          <div className="fc-plan-actions">
            <button type="button" className="fc-secondary-action" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Recommended defaults
            </button>
            <button type="button" className="fc-secondary-action" onClick={exportPlan}>
              <Download size={16} aria-hidden="true" />
              Export plan
            </button>
            <button type="button" className="fc-primary-action" onClick={savePlan}>
              <Save size={16} aria-hidden="true" />
              Save local plan
            </button>
          </div>
          {saveState && <p className="fc-save-state" role="status">{saveState}</p>}
        </aside>
      </div>
    </div>
  );
}
