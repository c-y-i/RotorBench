import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cable,
  Check,
  CheckCircle2,
  Clipboard,
  KeyRound,
  Radio,
  RadioTower,
  RotateCcw,
  Save,
  ShieldAlert,
  Signal,
  TriangleAlert,
  Usb,
} from "lucide-react";
import {
  DEFAULT_RADIO_CONFIG,
  RADIO_DYNAMIC_POWER,
  RADIO_HANDSETS,
  RADIO_HOST_BAYS,
  RADIO_LINK_MODES,
  RADIO_STORAGE_KEY,
  RADIO_SWITCH_MODES,
  RADIO_TELEMETRY_RATIOS,
  buildRadioSummary,
  buildRadioWarnings,
  bindingPhraseByteLength,
  getAvailableSwitchModes,
  getDefaultHostTransport,
  getDefaultHostBay,
  getDefaultPowerDbm,
  getDefaultRegulatoryRegion,
  getPacketRatesForTarget,
  getRadioChannelRoles,
  getRadioHostTransports,
  getRadioHostBay,
  getRadioHandset,
  getRadioHandsetBayCompatibility,
  getRadioPowerLevels,
  getRadioPowerSpec,
  getRadioReceiverBandCompatibility,
  getRadioRegulatoryLimit,
  getRadioRegulatoryOptions,
  getRadioTarget,
  getRadioTargetForRole,
  getRadioTargetsForRole,
  getSuggestedTelemetryRatio,
  hasStagedBinding,
  isUnboundUid,
  isValidUidFormat,
  isRadioHostBayCompatible,
  normalizeRadioConfig,
  sanitizeRadioChannelMap,
} from "../data/radioProfiles";
import { getBindingIdentity } from "../utils/elrsBinding";
import { buildRadioEndpointPlan } from "../utils/radioEndpointPlan";
import SetupSectionNav from "./SetupSectionNav";
import "../styles/radio-setup.css";

function readSavedPlan(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_RADIO_CONFIG;
    const stored = JSON.parse(raw);
    if (stored?.planVersion !== DEFAULT_RADIO_CONFIG.planVersion) {
      return DEFAULT_RADIO_CONFIG;
    }
    const normalized = normalizeRadioConfig(stored);
    return {
      ...normalized,
      targetId: getRadioTargetForRole(normalized.role, normalized.targetId).id,
    };
  } catch {
    return DEFAULT_RADIO_CONFIG;
  }
}

export default function RadioLinkSetup({
  value,
  receiverName = "",
  selectedReceiver = null,
  flightControllerName = "",
  channelLimit = 16,
  controlRoles = null,
  onChange,
  onSave,
  storageKey = RADIO_STORAGE_KEY,
}) {
  const [internalConfig, setInternalConfig] = useState(() => (
    value ?? readSavedPlan(storageKey)
  ));
  const config = value ?? internalConfig;
  const [message, setMessage] = useState("");
  const [showPhrase, setShowPhrase] = useState(false);
  const receiverLabel = selectedReceiver?.name || receiverName;
  const target = getRadioTarget(config.targetId);
  const availableTargets = getRadioTargetsForRole(config.role);
  const availableHostTransports = getRadioHostTransports(target.id);
  const selectedHostBay = getRadioHostBay(config.hostBay);
  const selectedHandset = getRadioHandset(config.handsetId);
  const hostBayCompatible = isRadioHostBayCompatible(
    target.id,
    config.hostBay,
  );
  const handsetBayCompatibility = getRadioHandsetBayCompatibility(
    config.handsetId,
    config.hostBay,
  );
  const handsetBayCompatible = handsetBayCompatibility.status !== "conflict";
  const warnings = useMemo(
    () => buildRadioWarnings(config, {
      channelLimit,
      controlRoles,
      receiver: selectedReceiver,
    }),
    [channelLimit, config, controlRoles, selectedReceiver],
  );
  const summary = useMemo(
    () => buildRadioSummary(config, {
      channelLimit,
      controlRoles,
      receiver: selectedReceiver,
    }),
    [channelLimit, config, controlRoles, selectedReceiver],
  );
  const endpointPlan = useMemo(
    () => buildRadioEndpointPlan(config, target),
    [config, target],
  );
  const bindingStaged = hasStagedBinding(config);
  const bindingIdentity = getBindingIdentity(config);
  const uidInvalid = Boolean(config.uid) && !isValidUidFormat(config.uid);
  const phraseTooLong = bindingPhraseByteLength(config.bindingPhrase) > 48;
  const bindingConflict = Boolean(String(config.bindingPhrase || "").trim() && config.uid);
  const serialBaud = config.role === "tx" ? target.serial.txBaud : target.serial.rxBaud;
  const packetRates = getPacketRatesForTarget(config.targetId);
  const selectedPacketRate = packetRates.find(
    (rate) => rate.value === config.packetRateMode,
  ) || null;
  const suggestedTelemetryRatio = getSuggestedTelemetryRatio(config.packetRateMode);
  const allowedSwitchModes = getAvailableSwitchModes(
    config.packetRateMode,
    config.linkMode,
  );
  const allowedSwitchModeSet = new Set(allowedSwitchModes);
  const visibleChannelRoles = getRadioChannelRoles(channelLimit, controlRoles);
  const powerLevels = getRadioPowerLevels(target.id);
  const powerSpec = getRadioPowerSpec(target.id);
  const regulatoryOptions = getRadioRegulatoryOptions(target.id);
  const receiverBandCompatibility = getRadioReceiverBandCompatibility(
    target.id,
    selectedReceiver,
  );
  const selectedRegulatoryLimit = getRadioRegulatoryLimit(
    target.id,
    config.regulatoryRegion,
  );
  const channelAssignments = Array.from(
    { length: channelLimit },
    (_, index) => {
      const channel = index + 1;
      return {
        channel,
        roles: visibleChannelRoles
          .filter((role) => config.channelMap[role.key] === channel)
          .map((role) => role.label),
      };
    },
  );

  const updateConfig = useCallback((updater) => {
    const next =
      typeof updater === "function" ? updater(config) : updater;
    if (value === undefined) setInternalConfig(next);
    onChange?.(next);
  }, [config, onChange, value]);

  useEffect(() => {
    if (value === undefined) onChange?.(config);
  }, [config, onChange, value]);

  useEffect(() => {
    if (!selectedReceiver?.id) return;
    if (config.selectedReceiverId === selectedReceiver.id) return;
    updateConfig((current) =>
      current.selectedReceiverId === selectedReceiver.id
        ? current
        : { ...current, selectedReceiverId: selectedReceiver.id },
    );
  }, [config.selectedReceiverId, selectedReceiver?.id, updateConfig]);

  const update = (key, value) => {
    setMessage("");
    updateConfig((current) => {
      if (key === "targetId") {
        const nextPowerLevels = getRadioPowerLevels(value);
        const nextDefaultPower = getDefaultPowerDbm(value);
        return {
          ...current,
          targetId: value,
          hostTransport: getDefaultHostTransport(value),
          hostBay: getDefaultHostBay(value),
          regulatoryRegion: getDefaultRegulatoryRegion(value),
          powerDbm: nextPowerLevels
            && !nextPowerLevels.some((level) => level.value === current.powerDbm)
            ? nextPowerLevels[0].value
            : nextDefaultPower ?? current.powerDbm,
        };
      }
      if (key === "linkMode") {
        const nextSwitchModes = getAvailableSwitchModes(
          current.packetRateMode,
          value,
        );
        return {
          ...current,
          linkMode: value,
          telemetryRatio: value === "mavlink" ? "1:2" : current.telemetryRatio,
          switchMode: nextSwitchModes.includes(current.switchMode)
            ? current.switchMode
            : nextSwitchModes[0],
        };
      }
      if (key === "hostTransport") {
        return {
          ...current,
          hostTransport: value,
          hostBay: value === "module-bay"
            ? isRadioHostBayCompatible(current.targetId, current.hostBay)
              ? current.hostBay
              : getDefaultHostBay(current.targetId)
            : value === "native-usb"
              ? "native-usb"
              : current.hostBay,
        };
      }
      if (key === "handsetId") {
        const nextHandset = getRadioHandset(value);
        return {
          ...current,
          handsetId: nextHandset.id,
          hostBay: current.hostBay === "verify"
            && nextHandset.supportedHostBays.length > 0
            ? nextHandset.supportedHostBays[0]
            : current.hostBay,
        };
      }
      if (key === "packetRateMode") {
        const nextSwitchModes = getAvailableSwitchModes(
          value,
          current.linkMode,
        );
        return {
          ...current,
          packetRateMode: value,
          telemetryRatio: current.linkMode === "mavlink"
            ? "1:2"
            : current.telemetryRatio,
          switchMode: nextSwitchModes.includes(current.switchMode)
            ? current.switchMode
            : nextSwitchModes[0],
        };
      }
      return { ...current, [key]: value };
    });
  };

  const updateChannel = (key, channel) => {
    updateConfig((current) => ({
      ...current,
      channelMap: {
        ...current.channelMap,
        [key]: channel === "" ? null : Number(channel),
      },
    }));
  };

  const changeRole = (role) => {
    setMessage("");
    updateConfig((current) => {
      const nextTarget = getRadioTargetForRole(role, current.targetId);
      if (nextTarget.id === current.targetId) {
        return { ...current, role };
      }
      return {
        ...current,
        role,
        targetId: nextTarget.id,
        hostTransport: getDefaultHostTransport(nextTarget.id),
        hostBay: getDefaultHostBay(nextTarget.id),
        regulatoryRegion: getDefaultRegulatoryRegion(nextTarget.id),
        powerDbm: getDefaultPowerDbm(nextTarget.id) ?? current.powerDbm,
      };
    });
  };

  const savePlan = () => {
    if (uidInvalid || bindingConflict || phraseTooLong) {
      setMessage(
        bindingConflict
          ? "Choose either a binding phrase or a direct UID before saving."
          : phraseTooLong
            ? "Shorten the binding phrase to 48 UTF-8 bytes or less before saving."
          : "Correct the UID format before saving.",
      );
      return;
    }
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...config,
          bindingPhrase: "",
          uid: "",
          channelMap: sanitizeRadioChannelMap(config.channelMap, {
            channelLimit,
            controlRoles,
          }),
        }),
      );
    } catch {
      setMessage("The browser could not save this plan locally.");
      return;
    }
    onSave?.(summary);
    setMessage("Radio plan saved locally. Binding material was not persisted. No hardware settings were changed.");
  };

  const copyPlan = async () => {
    const text = JSON.stringify(summary, null, 2);
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Radio plan copied as JSON.");
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  const copyEndpointChecklist = async () => {
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(endpointPlan.copyText);
      setMessage("Radio endpoint checklist copied. RF and hardware state were not verified.");
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  const resetPlan = () => {
    updateConfig(DEFAULT_RADIO_CONFIG);
    setMessage("Radio plan reset to the documented defaults.");
  };

  return (
    <section className="radio-setup" aria-labelledby="radio-setup-title">
      <header className="radio-setup-header">
        <div>
          <h2 id="radio-setup-title">Radio transceiver</h2>
          <p>
            Stage an ExpressLRS link profile for the {flightControllerName || "selected flight controller"}.
            This page does not connect, flash, or verify RF.
          </p>
        </div>
        <span className="radio-plan-state">
          <Radio size={15} aria-hidden="true" />
          Local plan
        </span>
      </header>

      <div className="radio-role-switch" role="group" aria-label="Radio role">
        {[
          { value: "tx", label: "Transmitter", Icon: RadioTower },
          { value: "rx", label: "Receiver", Icon: Signal },
        ].map(({ value, label, Icon: RoleIcon }) => (
          <button
            key={value}
            type="button"
            className={config.role === value ? "is-active" : ""}
            aria-pressed={config.role === value}
            onClick={() => changeRole(value)}
          >
            <RoleIcon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {target.id === "aerialkit-elrs-rev-a3" && (
        <section className="radio-board-legend" aria-labelledby="radio-board-legend-title">
          <div className="radio-board-legend-heading">
            <div>
              <span>Rev A3 boot and link identity</span>
              <h3 id="radio-board-legend-title">GPIO4 selects the RF role</h3>
            </div>
            <Usb size={18} aria-hidden="true" />
          </div>
          <div className="radio-role-legend">
            <div>
              <strong>TX</strong>
              <span>GPIO4 high</span>
              <small>One blue boot pulse; blue link states.</small>
            </div>
            <div>
              <strong>RX</strong>
              <span>GPIO4 low</span>
              <small>Two green boot pulses; green link states.</small>
            </div>
          </div>
          <dl className="radio-state-legend">
            <div><dt>Bind</dt><dd>Role-colour breathing, 3 s cycle</dd></div>
            <div><dt>Searching</dt><dd>Role-colour breathing, 1 s cycle</dd></div>
            <div><dt>Connected</dt><dd>Steady role colour</dd></div>
            <div><dt>Fault</dt><dd>Fast red, 100 ms on/off</dd></div>
            <div><dt>Role mismatch</dt><dd>Three amber pulses, 1 s pause</dd></div>
          </dl>
          <p>
            Verify the physical switch by continuity; the first prototype label did
            not match GPIO4. Source: <code>firmware/elrs-usb-tx-rev-a3/docs/HOST-LINK.md</code>.
          </p>
        </section>
      )}

      <SetupSectionNav
        label="Radio transceiver sections"
        items={[
          { id: "radio-device-heading", label: "Device" },
          { id: "radio-link-heading", label: "Link" },
          { id: "radio-binding-heading", label: "Binding" },
          { id: "radio-channels-heading", label: "Channels" },
          { id: "radio-plan-summary-heading", label: "Summary" },
        ]}
      />

      <div className="radio-layout">
        <div className="radio-main-column">
          <section className="radio-panel" aria-labelledby="radio-device-heading">
            <div className="radio-panel-heading">
              <div>
                <h3 id="radio-device-heading">Device profile</h3>
                <p>Pick the device that will carry this plan.</p>
              </div>
              <Usb size={19} aria-hidden="true" />
            </div>

            <label className="radio-field radio-field-wide">
              <span>Device</span>
              <select value={config.targetId} onChange={(event) => update("targetId", event.target.value)}>
                {availableTargets.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </label>

            <label className="radio-field radio-field-wide">
              <span>Host transport</span>
              <select
                aria-label="Host transport"
                value={config.hostTransport}
                onChange={(event) => update("hostTransport", event.target.value)}
              >
                {availableHostTransports.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>{endpointPlan.hostTransportNote}</small>
            </label>

            {config.hostTransport === "module-bay" && (
              <>
                <label className="radio-field radio-field-wide">
                  <span>Handset</span>
                  <select
                    aria-label="Handset"
                    value={config.handsetId || "verify"}
                    onChange={(event) => update("handsetId", event.target.value)}
                  >
                    {RADIO_HANDSETS.map((handset) => (
                      <option key={handset.id} value={handset.id}>
                        {handset.name}
                      </option>
                    ))}
                  </select>
                  <small>{selectedHandset.note}</small>
                </label>
                {selectedHandset.id !== "verify" && (
                  <p className="radio-source-note radio-handset-source">
                    {selectedHandset.firmware} handset profile.{" "}
                    <a
                      href={selectedHandset.manualUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open manual
                    </a>
                    {" · "}
                    <a
                      href={selectedHandset.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open manufacturer source
                    </a>
                  </p>
                )}
                <label className="radio-field radio-field-wide">
                  <span>Handset bay</span>
                  <select
                    aria-label="Handset bay"
                    aria-invalid={!hostBayCompatible || !handsetBayCompatible}
                    aria-describedby="radio-host-bay-help"
                    value={config.hostBay || "verify"}
                    onChange={(event) => update("hostBay", event.target.value)}
                  >
                    {RADIO_HOST_BAYS
                      .filter((option) => option.value !== "native-usb")
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                  <small
                    id="radio-host-bay-help"
                    className={
                      hostBayCompatible && handsetBayCompatible
                        ? ""
                        : "radio-field-error"
                    }
                  >
                    {!hostBayCompatible
                      ? `${target.name} requires ${
                        (target.supportedHostBays || [])
                          .map((bay) => getRadioHostBay(bay).label)
                          .join(" or ")
                      }.`
                      : !handsetBayCompatible
                        ? `${selectedHandset.name} is documented with ${
                          selectedHandset.supportedHostBays
                            .map((bay) => getRadioHostBay(bay).label)
                            .join(" or ")
                        }. Verify any adapter before fitting the module.`
                        : selectedHostBay.note}
                  </small>
                </label>
              </>
            )}

            <div className="radio-target-summary">
              <span><strong>{target.frequency}</strong> link</span>
              <span>{powerSpec?.regulatoryMaxima?.length
                ? `${powerSpec.defaultDbm} dBm default`
                : "ISM domain compiled into firmware"}</span>
              <span><Cable size={14} aria-hidden="true" />{target.serial.frame}</span>
              <span><Usb size={14} aria-hidden="true" />{serialBaud ? `${serialBaud} baud logical` : "Serial rate not established"}</span>
            </div>
            {selectedReceiver?.id && (
              <div className={`radio-receiver-band is-${receiverBandCompatibility.status}`}>
                <Radio size={15} aria-hidden="true" />
                <span>
                  <small>Receiver RF bands</small>
                  <strong>
                    {receiverBandCompatibility.receiverBandLabels.join(" / ")
                      || "Not catalogued"}
                  </strong>
                </span>
                <em>
                  {receiverBandCompatibility.status === "compatible"
                    ? `Shared ${receiverBandCompatibility.sharedBandLabels.join(" / ")}`
                    : receiverBandCompatibility.status === "conflict"
                      ? "No shared band"
                      : "Verify bands"}
                </em>
              </div>
            )}
            <p className="radio-endpoint-note">
              {config.role === "tx"
                ? "Transmitter endpoint: host-side USB traffic is not proof that the aircraft received it."
                : "Receiver endpoint: a completed FC-facing frame still does not prove RF acquisition."}
              {receiverLabel ? ` RotorBench receiver: ${receiverLabel}.` : ""}
            </p>
            <p className="radio-source-note">
              {target.description} Source: <code>{target.source}</code>.
              {target.sourceUrl && (
                <>
                  {" "}
                  <a href={target.sourceUrl} target="_blank" rel="noreferrer">
                    Open manufacturer source
                  </a>
                </>
              )}
            </p>
            <details className="radio-endpoint-plan">
              <summary>
                <Cable size={15} aria-hidden="true" />
                <span>
                  <strong>Endpoint checklist</strong>
                  <small>{endpointPlan.roleLabel} · {endpointPlan.hostTransportLabel}</small>
                </span>
                <em className={endpointPlan.documented ? "is-documented" : "is-unverified"}>
                  {endpointPlan.documented ? "Transport documented" : "Verify target"}
                </em>
              </summary>
              <div>
                <p>
                  Planning checklist only. RotorBench has not tested this USB/UART
                  path, RF transmission, receiver acquisition, or hardware state.
                </p>
                <ol aria-label="Radio endpoint checklist">
                  {endpointPlan.steps.map((step) => (
                    <li key={step.id}>
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={copyEndpointChecklist}>
                  <Clipboard size={14} aria-hidden="true" />
                  Copy endpoint checklist
                </button>
              </div>
            </details>
          </section>

          <section className="radio-panel" aria-labelledby="radio-link-heading">
            <div className="radio-panel-heading">
              <div>
                <h3 id="radio-link-heading">Link profile</h3>
                <p>
                  Firmware-dependent values remain a plan until the radio confirms them.
                  Disconnect RF before applying packet-rate, switch, or link-mode changes.
                </p>
              </div>
              <Activity size={19} aria-hidden="true" />
            </div>

            <div className="radio-field-grid">
              <label className="radio-field">
                <span>Packet rate</span>
                <select
                  value={config.packetRateMode}
                  onChange={(event) => update("packetRateMode", event.target.value)}
                >
                  {packetRates.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.note}
                    </option>
                  ))}
                </select>
              </label>

              {regulatoryOptions.length > 0 && (
                <label className="radio-field">
                  <span>RF region</span>
                  <select
                    value={config.regulatoryRegion || "verify"}
                    aria-label="RF region"
                    aria-describedby="radio-region-help"
                    onChange={(event) => update(
                      "regulatoryRegion",
                      event.target.value,
                    )}
                  >
                    <option value="verify">Verify fitted module</option>
                    {regulatoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} · {option.dbm} dBm / {option.mw} mW max
                      </option>
                    ))}
                  </select>
                  <small id="radio-region-help">
                    Match the printed module variant and local rules.
                    {selectedRegulatoryLimit
                      ? ` Selected ceiling: ${selectedRegulatoryLimit.dbm} dBm.`
                      : " RotorBench does not infer this from locale."}
                  </small>
                </label>
              )}

              {powerLevels ? (
                <label className="radio-field">
                  <span>TX power</span>
                  <select
                    value={config.powerDbm}
                    onChange={(event) => update("powerDbm", Number(event.target.value))}
                  >
                    {powerLevels.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.note}
                      </option>
                    ))}
                  </select>
                  <small>dBm is the SX1280 drive setting, not calibrated delivered RF power.</small>
                </label>
              ) : (
                <label className="radio-field">
                  <span>TX power (dBm)</span>
                  <input
                    type="number"
                    step="1"
                    value={config.powerDbm ?? ""}
                    aria-invalid={
                      config.powerDbm == null ||
                      !Number.isFinite(Number(config.powerDbm))
                    }
                    aria-describedby="radio-power-target-help"
                    onChange={(event) => update(
                      "powerDbm",
                      event.target.value === "" ? null : Number(event.target.value),
                    )}
                  />
                  <small id="radio-power-target-help">
                    {powerSpec?.regulatoryMaxima?.length
                      ? `Official default: ${powerSpec.defaultDbm} dBm / ${powerSpec.defaultMw} mW. Published maxima: ${powerSpec.regulatoryMaxima
                        .map((limit) => `${limit.region} ${limit.dbm} dBm`)
                        .join(", ")}.${
                        selectedRegulatoryLimit
                          ? ` The selected ${selectedRegulatoryLimit.label} ceiling is ${selectedRegulatoryLimit.dbm} dBm / ${selectedRegulatoryLimit.mw} mW.`
                          : " Confirm the fitted RF-region variant and firmware menu."
                      }`
                      : "No verified power menu is bundled for this target. Enter the value required by its own firmware documentation."}
                  </small>
                </label>
              )}

              <label className="radio-field">
                <span>Telemetry ratio</span>
                <select
                  value={config.telemetryRatio}
                  aria-label="Telemetry ratio"
                  aria-describedby={suggestedTelemetryRatio ? "radio-telemetry-ratio-help" : undefined}
                  onChange={(event) => update("telemetryRatio", event.target.value)}
                >
                  {RADIO_TELEMETRY_RATIOS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {suggestedTelemetryRatio && (
                  <small id="radio-telemetry-ratio-help">
                    Standard resolves to {suggestedTelemetryRatio} at{" "}
                    {selectedPacketRate?.label || config.packetRateMode}.
                  </small>
                )}
              </label>

              <label className="radio-field">
                <span>Switch mode</span>
                <select
                  value={config.switchMode}
                  aria-label="Switch mode"
                  aria-describedby="radio-switch-mode-help"
                  onChange={(event) => update("switchMode", event.target.value)}
                >
                  {RADIO_SWITCH_MODES.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={!allowedSwitchModeSet.has(option.value)}
                    >
                      {option.label} - {allowedSwitchModeSet.has(option.value)
                        ? option.note
                        : "not available for this packet rate"}
                    </option>
                  ))}
                </select>
                <small id="radio-switch-mode-help">
                  {config.linkMode === "mavlink"
                    ? allowedSwitchModes.includes("hybrid")
                      ? "MAVLink uses the Hybrid switch behavior for normal-width rates."
                      : "MAVLink with 100 Full or 333 Full uses 16ch Rate/2."
                    : allowedSwitchModes.includes("wide")
                      ? "Normal, D, and F packet rates use Wide or Hybrid."
                      : "100 Full and 333 Full use a fixed switch mode."}
                </small>
              </label>
              <label className="radio-field">
                <span>Link mode</span>
                <select
                  value={config.linkMode}
                  onChange={(event) => update("linkMode", event.target.value)}
                >
                  {RADIO_LINK_MODES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {target.id === "aerialkit-elrs-rev-a3" ? (
                <label className="radio-field">
                  <span>Dynamic power</span>
                  <select
                    value={config.dynamicPower}
                    onChange={(event) => update("dynamicPower", event.target.value)}
                  >
                    {RADIO_DYNAMIC_POWER.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="radio-field radio-target-specific">
                  <span>Dynamic power</span>
                  <strong>Target-specific</strong>
                  <small>Not asserted by this generic planning profile.</small>
                </div>
              )}
              <label className="radio-field">
                <span>Model match</span>
                <select
                  value={config.modelMatch ? "on" : "off"}
                  onChange={(event) => update("modelMatch", event.target.value === "on")}
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </label>
            </div>

            <div className="radio-confirmations">
              <label>
                <input
                  type="checkbox"
                  checked={config.antennaConfirmed}
                  onChange={(event) => update("antennaConfirmed", event.target.checked)}
                />
                <span>
                  <strong>Antenna fitted</strong>
                  Required before powering a transmitter image.
                </span>
              </label>
              {target.id === "aerialkit-elrs-rev-a3" && (
                <label>
                  <input
                    type="checkbox"
                    checked={config.roleSwitchConfirmed}
                    onChange={(event) => update("roleSwitchConfirmed", event.target.checked)}
                  />
                  <span>
                    <strong>GPIO4 role checked</strong>
                    TX is high, RX is low. Verify continuity before power-up.
                  </span>
                </label>
              )}
            </div>
          </section>

          <section className="radio-panel" aria-labelledby="radio-binding-heading">
            <div className="radio-panel-heading">
              <div>
                <h3 id="radio-binding-heading">Binding</h3>
                <p>Stage a phrase or UID. Pairing remains unverified without both endpoints.</p>
              </div>
              <KeyRound size={19} aria-hidden="true" />
            </div>

            <div className="radio-field-grid">
              <label className="radio-field radio-field-wide">
                <span>Binding phrase</span>
                <div className="radio-secret-field">
                  <input
                    type={showPhrase ? "text" : "password"}
                    value={config.bindingPhrase}
                    aria-label="Binding phrase"
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="Same phrase on TX and RX"
                    aria-invalid={bindingConflict || phraseTooLong}
                    aria-describedby="radio-binding-identity-help"
                    onChange={(event) => update("bindingPhrase", event.target.value)}
                  />
                  <button type="button" onClick={() => setShowPhrase((shown) => !shown)}>
                    {showPhrase ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <label className="radio-field radio-field-wide">
                <span>Direct UID</span>
                <input
                  type="text"
                  value={config.uid}
                  aria-label="Direct UID"
                  spellCheck="false"
                  placeholder="12 hexadecimal digits, optional"
                  aria-invalid={uidInvalid}
                  aria-describedby="radio-binding-identity-help"
                  onChange={(event) => update("uid", event.target.value)}
                />
                <small
                  id="radio-binding-identity-help"
                  className={uidInvalid || bindingConflict || phraseTooLong ? "radio-field-error" : ""}
                  role={bindingConflict || phraseTooLong ? "alert" : undefined}
                >
                  Set one identity source: a phrase or six bytes as 12 hexadecimal digits.
                  {bindingConflict ? " Clear one of the current identity values." : " Separators are optional."}
                  {phraseTooLong ? " The phrase exceeds the 48-byte ExpressLRS limit." : ""}
                </small>
              </label>
            </div>

            <div className={`radio-binding-state ${bindingStaged ? "is-staged" : ""}`}>
              {bindingStaged ? <Check size={15} aria-hidden="true" /> : <TriangleAlert size={15} aria-hidden="true" />}
              <span>
                {bindingStaged
                  ? "Binding material is staged locally but not verified."
                  : isUnboundUid(config.uid)
                    ? "An all-zero UID is unbound. It cannot establish a paired link."
                  : "No binding material is staged. An all-zero UID is not a bound link."}
              </span>
            </div>

            <div className="radio-binding-preview" aria-live="polite">
              <span>
                {bindingIdentity.source === "phrase" ? "Phrase-derived UID" : "Effective UID"}
              </span>
              <code>{bindingConflict ? "conflicting identities" : bindingIdentity.uid}</code>
              <small>
                {bindingIdentity.source === "phrase"
                  ? `${bindingIdentity.phraseBytes}/48 UTF-8 bytes`
                  : bindingIdentity.unbound
                    ? "Unbound"
                    : "Direct six-byte UID"}
              </small>
            </div>

            <ol className="radio-pairing-steps">
              <li>Power off both endpoints and verify their transmitter or receiver role.</li>
              <li>Write the same phrase or UID to both endpoints.</li>
              <li>Reconnect and require an exact non-zero UID readback from each endpoint.</li>
              <li>Only after pairing, capture receiver control frames and link statistics in both directions.</li>
            </ol>
          </section>

          <section className="radio-panel" aria-labelledby="radio-channels-heading">
            <div className="radio-panel-heading">
              <div>
                <h3 id="radio-channels-heading">Channel map</h3>
                <p>
                  Defaults follow Aerial Kit's AETR layout.{" "}
                  {channelLimit < 16
                    ? `This flight-controller route decodes CH1–${channelLimit}.`
                    : "Confirm the FC's decoded channel count before assigning AUX roles."}
                </p>
              </div>
              <Signal size={19} aria-hidden="true" />
            </div>

            <div
              className="radio-channel-strip"
              role="list"
              aria-label="Channel assignment overview"
            >
              {channelAssignments.map(({ channel, roles }) => (
                <div
                  key={channel}
                  role="listitem"
                  className={roles.length ? "is-mapped" : "is-open"}
                  aria-label={`Channel ${channel}: ${roles.join(" and ") || "open"}`}
                >
                  <span>CH {channel}</span>
                  <strong>{roles.join(" + ") || "Open"}</strong>
                </div>
              ))}
            </div>

            <div className="radio-channel-grid">
              {visibleChannelRoles.map((role) => (
                <label key={role.key} className="radio-channel">
                  <span>{role.label}</span>
                  <select
                    aria-label={`${role.label} channel`}
                    value={config.channelMap[role.key] ?? ""}
                    onChange={(event) => updateChannel(role.key, event.target.value)}
                  >
                    <option value="" disabled={!role.optional}>
                      {role.optional ? "Not mapped" : "Select channel"}
                    </option>
                    {Array.from({ length: 16 }, (_, index) => index + 1).map((channel) => (
                      <option key={channel} value={channel} disabled={channel > channelLimit}>
                        Channel {channel}{channel > channelLimit ? " · outside FC range" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="radio-plan-panel" aria-label="Radio plan summary">
          <div className="radio-plan-panel-heading">
            <div>
              <span>Plan status</span>
              <h3 id="radio-plan-summary-heading">Not hardware-verified</h3>
            </div>
            <Radio size={20} aria-hidden="true" />
          </div>

          <dl className="radio-plan-facts">
            <div><dt>Role</dt><dd>{config.role === "tx" ? "Transmitter" : "Receiver"}</dd></div>
            <div><dt>Target</dt><dd>{target.name}</dd></div>
            <div>
              <dt>Rate</dt>
              <dd>{selectedPacketRate?.label || "Unsupported rate"}</dd>
            </div>
            <div>
              <dt>Power</dt>
              <dd>
                {config.powerDbm == null
                  ? "Not set"
                  : `${config.powerDbm} dBm${summary.configuration.powerMenuMw != null
                    ? ` (${summary.configuration.powerMenuMw} mW menu)`
                    : " (target-local setting)"}`}
              </dd>
            </div>
            {config.hostTransport === "module-bay" && (
              <div>
                <dt>Handset bay</dt>
                <dd>
                  {selectedHandset.id === "verify"
                    ? selectedHostBay.label
                    : `${selectedHandset.name} · ${selectedHostBay.label}`}
                  {" · "}
                  {hostBayCompatible && handsetBayCompatible
                    ? "supported"
                    : "mismatch"}
                </dd>
              </div>
            )}
            {powerSpec?.regulatoryMaxima?.length ? (
              <div>
                <dt>Published max</dt>
                <dd>
                  {powerSpec.regulatoryMaxima
                    .map((limit) => `${limit.region} ${limit.dbm} dBm / ${limit.mw} mW`)
                    .join(" · ")}
                </dd>
              </div>
            ) : null}
            {regulatoryOptions.length > 0 && (
              <div>
                <dt>RF region</dt>
                <dd>
                  {selectedRegulatoryLimit
                    ? `${selectedRegulatoryLimit.label} · ${selectedRegulatoryLimit.dbm} dBm`
                    : "Verify fitted module"}
                </dd>
              </div>
            )}
            <div>
              <dt>Telemetry</dt>
              <dd>
                {config.telemetryRatio === "std" && suggestedTelemetryRatio
                  ? `Std (${suggestedTelemetryRatio})`
                  : config.telemetryRatio}
              </dd>
            </div>
            <div><dt>Link mode</dt><dd>{config.linkMode === "mavlink" ? "MAVLink" : "Normal CRSF"}</dd></div>
            <div><dt>Model match</dt><dd>{config.modelMatch ? "On" : "Off"}</dd></div>
            <div><dt>Receiver in build</dt><dd>{receiverLabel || "Not selected"}</dd></div>
            <div>
              <dt>Bench setting</dt>
              <dd>{summary.matchesBenchSettings
                ? "Matches the documented 250 Hz / 25 mW profile"
                : "Not a bench-qualified setting combination"}</dd>
            </div>
          </dl>

          <div className={`radio-evidence-boundary ${summary.matchesBenchSettings ? "is-matching" : ""}`}>
            <strong>
              {summary.matchesBenchSettings
                ? "Settings match; RF is still unverified"
                : "Profile is not a hardware pass"}
            </strong>
            <span>
              {summary.matchesBenchSettings
                ? "A documented setting match can guide a bench run. It is not a live link result."
                : "Review the checks below before treating these values as a valid deployment profile."}
            </span>
          </div>

          <div className={`radio-readiness ${warnings.length ? "has-warnings" : "is-clear"}`}>
            {warnings.length ? <ShieldAlert size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            <div>
              <strong>
                {warnings.length
                  ? `Radio · ${warnings.length} check${warnings.length === 1 ? "" : "s"} before deployment`
                  : "Radio · no plan-level warnings"}
              </strong>
              {warnings.length > 0 && (
                <ul>
                  {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div className="radio-plan-actions">
            <button type="button" className="radio-primary-action" onClick={savePlan}>
              <Save size={16} aria-hidden="true" />
              Save plan
            </button>
            <button type="button" onClick={copyPlan}>
              <Clipboard size={16} aria-hidden="true" />
              Copy JSON
            </button>
            <button type="button" onClick={resetPlan}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          </div>

          {message && <p className="radio-plan-message" role="status">{message}</p>}
        </aside>
      </div>
    </section>
  );
}
