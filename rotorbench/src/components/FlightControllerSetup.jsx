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
  FileSearch,
  Gauge,
  Network,
  RadioTower,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import {
  AERIALKIT_SERVO_LIMITS,
  AERIALKIT_SERVO_OUTPUTS,
  AIRFRAMES,
  BETAFLIGHT_FAILSAFE_THROTTLE,
  CHANNEL_PRESETS,
  DEFAULT_CHANNELS,
  FAILSAFE_ACTIONS,
  FC_BOARD_PROFILES,
  FC_FEATURES,
  FIRMWARE_FAMILIES,
  MOTOR_DIRECTIONS,
  RECEIVER_PROTOCOLS,
  buildArdupilotParameterPlanText,
  buildArmingGatePreview,
  buildFlightControllerSummary,
  createDefaultFlightControllerConfig,
  getAerialKitControlRoles,
  getAirframeMotorLayout,
  getArdupilotParameterRequirements,
  getBoardProfile,
  getChannelPreset,
  buildSerialAllocationText,
  getSerialPortAssignments,
  supportsAerialKitLaunch,
  supportsAerialKitWingFailsafe,
  validateFlightControllerConfig,
} from "../data/flightControllerProfiles";
import { buildFlightControllerCommands } from "../utils/flightControllerCommands";
import { buildReceiverWiringPlan } from "../utils/receiverWiring";
import {
  buildAerialKitRateCurve,
  summarizeAerialKitRateFeel,
} from "../utils/aerialKitRateCurve";
import { buildAerialKitFilterPlan } from "../utils/aerialKitFilters";
import { buildAerialKitNotchPlan } from "../utils/aerialKitNotch";
import SetupSectionNav from "./SetupSectionNav";
import "../styles/fc-setup.css";

const FLIGHT_CONTROLLER_ISSUE_TARGETS = Object.freeze({
  "custom-board-unverified": { id: "fc-profile", label: "board profile" },
  "workspace-profile": { id: "fc-profile", label: "board profile" },
  "output-count": { id: "fc-airframe", label: "airframe" },
  "servo-count": { id: "fc-airframe", label: "airframe" },
  "pwm-output-count": { id: "fc-airframe", label: "airframe" },
  "build-airframe-mismatch": { id: "fc-airframe", label: "airframe" },
  "build-servo-coverage": { id: "fc-servo-title", label: "servo outputs" },
  "sbus-inverter": { id: "fc-protocol", label: "receiver protocol" },
  "sbus-no-telemetry": { id: "fc-protocol", label: "receiver protocol" },
  "receiver-baud": { id: "fc-baud", label: "line rate" },
  "dshot-rate": { id: "fc-dshot", label: "DShot rate" },
  "arm-hold-range": { id: "fc-arm-hold", label: "arm hold" },
  "arm-tilt-range": { id: "fc-arm-tilt", label: "maximum arm tilt" },
  "failsafe-throttle-range": {
    id: "fc-failsafe-throttle",
    label: "Stage 2 landing throttle",
  },
  "launch-throttle-range": { id: "fc-launch-throttle", label: "launch throttle" },
  "launch-climb-range": { id: "fc-launch-climb", label: "launch climb attitude" },
  "launch-timeout-range": { id: "fc-launch-timeout", label: "launch timeout" },
  "launch-airframe-mismatch": { id: "fc-airframe", label: "airframe" },
  "uart-conflict": { id: "fc-uart", label: "receiver UART" },
  "receiver-uart-unmapped": { id: "fc-uart", label: "receiver UART" },
  "receiver-uart-role": { id: "fc-uart", label: "receiver UART" },
  "receiver-uart-pins-unmapped": { id: "fc-uart", label: "receiver UART" },
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
  "rth-min-alt-range": { id: "fc-rth-min-alt", label: "return floor" },
  "gps-min-sats-range": { id: "fc-gps-min-sats", label: "GPS navigation minimum" },
  "align-roll-range": { id: "fc-align-roll", label: "board alignment" },
  "align-pitch-range": { id: "fc-align-pitch", label: "board alignment" },
  "align-yaw-range": { id: "fc-align-yaw", label: "board alignment" },
  "gyro-rate-range": { id: "fc-gyro-rate", label: "requested gyro rate" },
  "pid-denom-range": { id: "fc-pid-denom", label: "control-loop divisor" },
  "max-rate-range": { id: "fc-max-rate", label: "maximum angular rate" },
  "rate-center-range": { id: "fc-rate-center", label: "rate-curve centre slope" },
  "rate-center-linear": { id: "fc-rate-center", label: "rate-curve centre slope" },
  "rate-expo-range": { id: "fc-rate-expo", label: "rate-curve expo" },
  "tpa-rate-range": { id: "fc-tpa-rate", label: "throttle-gain scaling" },
  "tpa-breakpoint-range": { id: "fc-tpa-breakpoint", label: "throttle-gain breakpoint" },
  "gyroLpf1StaticHz-range": { id: "fc-gyro-lpf1-static", label: "gyro LPF1 static cutoff" },
  "gyroLpf1DynMinHz-range": { id: "fc-gyro-lpf1-dyn-min", label: "gyro LPF1 dynamic low" },
  "gyroLpf1DynMaxHz-range": { id: "fc-gyro-lpf1-dyn-max", label: "gyro LPF1 dynamic high" },
  "gyroLpf2StaticHz-range": { id: "fc-gyro-lpf2-static", label: "gyro LPF2 static cutoff" },
  "dtermLpf1StaticHz-range": { id: "fc-dterm-lpf1-static", label: "D-term LPF1 static cutoff" },
  "dtermLpf1DynMinHz-range": { id: "fc-dterm-lpf1-dyn-min", label: "D-term LPF1 dynamic low" },
  "dtermLpf1DynMaxHz-range": { id: "fc-dterm-lpf1-dyn-max", label: "D-term LPF1 dynamic high" },
  "dtermLpf2StaticHz-range": { id: "fc-dterm-lpf2-static", label: "D-term LPF2 static cutoff" },
  "gyro-filter-dynamic-order": { id: "fc-gyro-lpf1-dyn-min", label: "gyro filter bounds" },
  "dterm-filter-dynamic-order": { id: "fc-dterm-lpf1-dyn-min", label: "D-term filter bounds" },
  "dyn-notch-count-range": { id: "fc-dyn-notch-count", label: "dynamic notch count" },
  "dyn-notch-q-range": { id: "fc-dyn-notch-q", label: "dynamic notch Q" },
  "dyn-notch-min-range": { id: "fc-dyn-notch-min", label: "dynamic notch low" },
  "dyn-notch-max-range": { id: "fc-dyn-notch-max", label: "dynamic notch high" },
  "dyn-notch-band-order": { id: "fc-dyn-notch-min", label: "dynamic notch band" },
  "max-tilt-range": { id: "fc-max-tilt", label: "maximum angle-mode tilt" },
  "yaw-rate-range": { id: "fc-yaw-rate", label: "full-stick yaw rate" },
  "max-dt-range": { id: "fc-max-dt", label: "integration-step cap" },
  "sysid-axis-range": { id: "fc-sysid-axis", label: "system-ID axis" },
  "sysid-pattern-range": { id: "fc-sysid-pattern", label: "system-ID pattern" },
  "sysid-amplitude-range": { id: "fc-sysid-amplitude", label: "system-ID amplitude" },
  "sysid-duration-range": { id: "fc-sysid-duration", label: "system-ID duration" },
  "wing-bank-range": { id: "fc-wing-bank", label: "fixed-wing lost-link bank" },
  "wing-pitch-range": { id: "fc-wing-pitch", label: "fixed-wing lost-link pitch" },
  "wing-throttle-range": { id: "fc-wing-throttle", label: "fixed-wing lost-link throttle" },
  "wing-zero-throttle": { id: "fc-wing-throttle", label: "fixed-wing lost-link throttle" },
  "wing-bank-clamp": { id: "fc-wing-bank", label: "fixed-wing lost-link bank" },
  "wing-pitch-clamp": { id: "fc-wing-pitch", label: "fixed-wing lost-link pitch" },
  "fs-recover-range": { id: "fc-fs-recover", label: "lost-link recovery delay" },
  "fs-stick-threshold-range": {
    id: "fc-fs-stick-threshold",
    label: "lost-link stick threshold",
  },
  "servo-reverse": { id: "fc-servo1-reverse", label: "servo reversal" },
  "servo-trim-range": { id: "fc-servo1-trim", label: "servo centre trim" },
  "servo-travel-range": { id: "fc-servo1-travel", label: "servo travel" },
  "channel-range": { id: "fc-arm-channel", label: "control channels" },
  "unsupported-control-role": { id: "fc-arm-channel", label: "control channels" },
  "mode-channel-unset": { id: "fc-mode-channel", label: "flight-mode channel" },
  "arm-channel-unset": { id: "fc-arm-channel", label: "arm channel" },
  "channel-conflict": { id: "fc-arm-channel", label: "control channels" },
});

function RateCurveFigure({ config, summary: rateFeel, fixedWing }) {
  const points = buildAerialKitRateCurve(config);
  const width = 640;
  const height = 250;
  const padX = 46;
  const padY = 28;
  const maxRate = Math.max(1, Math.abs(Number(config.maxRateDps) || 0));
  const xForStick = (stick) => padX + ((stick + 1) / 2) * (width - padX * 2);
  const yForRate = (rate) => (
    height - padY - ((rate + maxRate) / (maxRate * 2)) * (height - padY * 2)
  );
  const linePath = points
    .map((point, index) => (
      `${index === 0 ? "M" : "L"}${xForStick(point.stick).toFixed(2)} ${yForRate(point.rateDps).toFixed(2)}`
    ))
    .join(" ");
  const linearPath = [
    `M${xForStick(-1)} ${yForRate(-maxRate)}`,
    `L${xForStick(1)} ${yForRate(maxRate)}`,
  ].join(" ");
  const halfStickX = xForStick(0.5);
  const halfStickY = yForRate(rateFeel.halfStickRateDps);
  const gainLabel = fixedWing
    ? "Full-throttle P/I/D/FF scale"
    : "Full-throttle P/D scale";

  return (
    <figure className="fc-rate-curve">
      <div className="fc-rate-curve-heading">
        <span>
          <small>Actual-rate preview</small>
          <strong>
            {rateFeel.usesLinearCurve
              ? "Linear stick response"
              : "Firmware rate curve"}
          </strong>
        </span>
        <em>
          {rateFeel.usesLinearCurve
            ? "Expo inactive at centre 0"
            : `${Math.round(rateFeel.expo * 100)}% expo`}
        </em>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="fc-rate-curve-title fc-rate-curve-desc"
      >
        <title id="fc-rate-curve-title">Commanded angular rate by stick position</title>
        <desc id="fc-rate-curve-desc">
          {rateFeel.usesLinearCurve
            ? `Linear response from minus ${maxRate} to plus ${maxRate} degrees per second.`
            : `A shaped response with a ${rateFeel.centerRateDps} degree per second centre slope and ${Math.round(rateFeel.expo * 100)} percent expo, reaching plus or minus ${maxRate} degrees per second at full stick.`}
          {" "}Half stick commands {Math.round(rateFeel.halfStickRateDps)} degrees per second.
          {" "}A dashed line shows the linear reference.
        </desc>
        {[-1, -0.5, 0, 0.5, 1].map((stick) => (
          <line
            key={`x-${stick}`}
            className="fc-rate-curve-grid"
            x1={xForStick(stick)}
            y1={padY}
            x2={xForStick(stick)}
            y2={height - padY}
          />
        ))}
        {[-1, -0.5, 0, 0.5, 1].map((fraction) => (
          <line
            key={`y-${fraction}`}
            className="fc-rate-curve-grid"
            x1={padX}
            y1={yForRate(fraction * maxRate)}
            x2={width - padX}
            y2={yForRate(fraction * maxRate)}
          />
        ))}
        <line
          className="fc-rate-curve-axis"
          x1={padX}
          y1={yForRate(0)}
          x2={width - padX}
          y2={yForRate(0)}
        />
        <line
          className="fc-rate-curve-axis"
          x1={xForStick(0)}
          y1={padY}
          x2={xForStick(0)}
          y2={height - padY}
        />
        <path className="fc-rate-curve-reference" d={linearPath} />
        {linePath && <path className="fc-rate-curve-line" d={linePath} />}
        <circle
          className="fc-rate-curve-point"
          cx={halfStickX}
          cy={halfStickY}
          r="5"
        />
        <text className="fc-rate-curve-value" x={halfStickX + 10} y={halfStickY - 9}>
          {Math.round(rateFeel.halfStickRateDps)}°/s
        </text>
        <text className="fc-rate-curve-label" x={padX} y={height - 8}>
          −100%
        </text>
        <text className="fc-rate-curve-label" x={width / 2} y={height - 8} textAnchor="middle">
          Stick centre
        </text>
        <text className="fc-rate-curve-label" x={width - padX} y={height - 8} textAnchor="end">
          +100%
        </text>
        <text className="fc-rate-curve-label" x={padX - 8} y={yForRate(maxRate) + 4} textAnchor="end">
          {maxRate}°/s
        </text>
        <text className="fc-rate-curve-label" x={padX - 8} y={yForRate(-maxRate) + 4} textAnchor="end">
          −{maxRate}°/s
        </text>
      </svg>
      <figcaption>
        Planning geometry only. The aircraft's measured rate response, gyro
        noise, and final feel require a disarmed output check followed by
        qualified flight evidence.
      </figcaption>
      <dl className="fc-rate-curve-facts">
        <div>
          <dt>Centre slope</dt>
          <dd>{rateFeel.usesLinearCurve ? "Linear" : `${rateFeel.centerRateDps}°/s`}</dd>
        </div>
        <div>
          <dt>Half stick</dt>
          <dd>{Math.round(rateFeel.halfStickRateDps)}°/s</dd>
        </div>
        <div>
          <dt>{gainLabel}</dt>
          <dd>×{rateFeel.fullThrottleTpaFactor.toFixed(2)}</dd>
        </div>
      </dl>
    </figure>
  );
}

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

function Field({ label, hint, hintId, children, htmlFor }) {
  return (
    <div className="fc-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}

function formatFilterHz(value) {
  if (value == null || !Number.isFinite(Number(value))) return "Unverified";
  const rounded = Math.round(Number(value) * 10) / 10;
  return `${rounded} Hz`;
}

function formatFilterRange(stage, applied = false) {
  if (stage.mode === "off") return "Off";
  const low = applied ? stage.appliedLowHz : stage.requestedLowHz;
  const high = applied ? stage.appliedHighHz : stage.requestedHighHz;
  if (low == null || high == null) return "Needs loop rate";
  return low === high
    ? formatFilterHz(low)
    : `${formatFilterHz(low)} – ${formatFilterHz(high)}`;
}

function filterInputValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  ) ? Number(value) : "";
}

function filterInputInvalid(value) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  );
}

function filterInputNumber(value) {
  return value === "" ? null : Number(value);
}

function FilterStageRow({
  stage,
  label,
  maxFilterHz,
}) {
  const modeLabel = stage.mode === "off"
    ? "Off"
    : stage.mode === "dynamic"
      ? stage.noDynamicMovement ? "Dynamic · fixed" : "Dynamic"
      : "Static";
  const scaleLow = stage.appliedLowHz ?? stage.requestedLowHz;
  const scaleHigh = stage.appliedHighHz ?? stage.requestedHighHz;
  const left = Math.max(0, Math.min(100, (scaleLow / 1000) * 100));
  const right = Math.max(0, Math.min(100, (scaleHigh / 1000) * 100));
  const clampLeft = maxFilterHz == null
    ? null
    : Math.max(0, Math.min(100, (maxFilterHz / 1000) * 100));

  return (
    <div className={`fc-filter-stage is-${stage.mode}`}>
      <div className="fc-filter-stage-heading">
        <span>
          <small>{label}</small>
          <strong>{modeLabel}</strong>
        </span>
        <em>
          {stage.mode === "off"
            ? "No filtering"
            : !stage.clampKnown
              ? "Clamp unverified"
              : stage.clamped
                ? "Clamped"
                : "As requested"}
        </em>
      </div>
      <div
        className="fc-filter-scale"
        aria-hidden="true"
        style={{
          "--filter-left": `${left}%`,
          "--filter-width": `${Math.max(0.8, right - left)}%`,
          "--filter-clamp": clampLeft == null ? null : `${clampLeft}%`,
        }}
      >
        <span className="fc-filter-scale-fill" />
        {clampLeft != null && <span className="fc-filter-scale-clamp" />}
        <span className="fc-filter-scale-min">0</span>
        <span className="fc-filter-scale-max">1000 Hz</span>
      </div>
      <dl>
        <div>
          <dt>Requested</dt>
          <dd>{formatFilterRange(stage)}</dd>
        </div>
        <div>
          <dt>Applied</dt>
          <dd>{formatFilterRange(stage, true)}</dd>
        </div>
      </dl>
      {(stage.ignoredStaticHz || stage.dynamicMaxBelowFloor) && (
        <p className={stage.dynamicMaxBelowFloor ? "is-warning" : "is-info"}>
          {stage.dynamicMaxBelowFloor
            ? "Dynamic high is below the low bound; the firmware holds the low cutoff."
            : "Dynamic low is active, so the static LPF1 cutoff is ignored."}
        </p>
      )}
    </div>
  );
}

function FilterChainsPanel({
  config,
  plan,
  notchPlan,
  onFilterChange,
}) {
  const notchStatusLabel = {
    off: "Off",
    unverified: "Gate unverified",
    "loop-gate": "Below 2 kHz",
    "band-invalid": "Band invalid",
    eligible: "Eligible",
  }[notchPlan.status];

  return (
    <section className="fc-section" aria-labelledby="fc-filters-title">
      <div className="fc-section-heading">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <div>
          <h3 id="fc-filters-title">Filter chains</h3>
          <p>
            Stage the gyro and D-term low-pass cutoffs Aerial Kit will accept.
            Applied values account for the firmware&apos;s quarter-loop clamp.
          </p>
        </div>
      </div>

      <div className={`fc-filter-clamp ${plan.clampKnown ? "is-known" : "is-unverified"}`} role="note">
        <span>
          <small>Quarter-loop ceiling</small>
          <strong>
            {plan.clampKnown
              ? formatFilterHz(plan.maxFilterHz)
              : "Unverified at runtime"}
          </strong>
        </span>
        <p>
          {plan.clampKnown
            ? `Requested ${formatFilterHz(plan.loopHz)} loop ÷ 4. ${plan.clampedCount} cutoff${plan.clampedCount === 1 ? "" : "s"} exceed the ceiling.`
            : "Gyro rate 0 leaves the sample rate to the board driver. Requested cutoffs are shown without inventing an applied value."}
        </p>
        <em>{plan.clampKnown ? "Plan clamp" : "Needs live rate"}</em>
      </div>

      <div className="fc-filter-chains">
        {plan.chains.map((chain) => (
          <fieldset className="fc-filter-chain" key={chain.id}>
            <legend>
              <span>{chain.signal}</span>
              <small>
                {chain.primary.mode === "dynamic"
                  ? "Throttle-linked LPF1"
                  : "Static LPF1 fallback"}
              </small>
            </legend>
            <div className="fc-filter-stages">
              <FilterStageRow
                stage={chain.primary}
                label="LPF 1"
                maxFilterHz={plan.maxFilterHz}
              />
              <FilterStageRow
                stage={chain.secondary}
                label="LPF 2"
                maxFilterHz={plan.maxFilterHz}
              />
            </div>
            <div className="fc-filter-input-grid">
              <Field
                label={`${chain.signal} LPF1 static`}
                htmlFor={`fc-${chain.id}-lpf1-static`}
                hint="Fallback when dynamic low is 0; 0 disables it"
                hintId={`fc-${chain.id}-lpf1-static-hint`}
              >
                <input
                  id={`fc-${chain.id}-lpf1-static`}
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  aria-invalid={filterInputInvalid(config[chain.staticKey])}
                  aria-describedby={`fc-${chain.id}-lpf1-static-hint`}
                  value={filterInputValue(config[chain.staticKey])}
                  onChange={(event) => onFilterChange(
                    chain.staticKey,
                    filterInputNumber(event.target.value),
                  )}
                />
              </Field>
              <Field
                label={`${chain.signal} LPF1 dynamic low`}
                htmlFor={`fc-${chain.id}-lpf1-dyn-min`}
                hint="0 selects the static cutoff; otherwise cutoff at zero throttle"
                hintId={`fc-${chain.id}-lpf1-dyn-min-hint`}
              >
                <input
                  id={`fc-${chain.id}-lpf1-dyn-min`}
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  aria-invalid={filterInputInvalid(config[chain.dynMinKey])}
                  aria-describedby={`fc-${chain.id}-lpf1-dyn-min-hint`}
                  value={filterInputValue(config[chain.dynMinKey])}
                  onChange={(event) => onFilterChange(
                    chain.dynMinKey,
                    filterInputNumber(event.target.value),
                  )}
                />
              </Field>
              <Field
                label={`${chain.signal} LPF1 dynamic high`}
                htmlFor={`fc-${chain.id}-lpf1-dyn-max`}
                hint="Cutoff at full throttle; equal to low means no movement"
                hintId={`fc-${chain.id}-lpf1-dyn-max-hint`}
              >
                <input
                  id={`fc-${chain.id}-lpf1-dyn-max`}
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  aria-invalid={filterInputInvalid(config[chain.dynMaxKey])}
                  aria-describedby={`fc-${chain.id}-lpf1-dyn-max-hint`}
                  value={filterInputValue(config[chain.dynMaxKey])}
                  onChange={(event) => onFilterChange(
                    chain.dynMaxKey,
                    filterInputNumber(event.target.value),
                  )}
                />
              </Field>
              <Field
                label={`${chain.signal} LPF2 static`}
                htmlFor={`fc-${chain.id}-lpf2-static`}
                hint="Second fixed pole; 0 disables it"
                hintId={`fc-${chain.id}-lpf2-static-hint`}
              >
                <input
                  id={`fc-${chain.id}-lpf2-static`}
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  aria-invalid={filterInputInvalid(config[chain.secondaryKey])}
                  aria-describedby={`fc-${chain.id}-lpf2-static-hint`}
                  value={filterInputValue(config[chain.secondaryKey])}
                  onChange={(event) => onFilterChange(
                    chain.secondaryKey,
                    filterInputNumber(event.target.value),
                  )}
                />
              </Field>
            </div>
          </fieldset>
        ))}
      </div>
      <details className="fc-notch-plan">
        <summary>
          <span>
            <strong>Dynamic notch bank</strong>
            <small>
              {notchPlan.count === 0
                ? "Disabled"
                : `${notchPlan.count} per axis · ${notchPlan.requestedMinHz}–${notchPlan.requestedMaxHz} Hz · Q ${notchPlan.q}`}
            </small>
          </span>
          <em className={`is-${notchPlan.status}`}>{notchStatusLabel}</em>
        </summary>
        <div className="fc-notch-plan-body">
          <div className="fc-notch-status" role="note">
            <span>
              <small>Runtime gate</small>
              <strong>{notchStatusLabel}</strong>
            </span>
            <p>{notchPlan.detail}</p>
          </div>
          <dl className="fc-notch-analysis">
            <div>
              <dt>Requested loop</dt>
              <dd>{formatFilterHz(notchPlan.loopHz)}</dd>
            </div>
            <div>
              <dt>Analysis rate</dt>
              <dd>{formatFilterHz(notchPlan.analysisRateHz)}</dd>
            </div>
            <div>
              <dt>Bin width</dt>
              <dd>{formatFilterHz(notchPlan.binHz)}</dd>
            </div>
            <div>
              <dt>Search bins</dt>
              <dd>
                {notchPlan.effectiveMinHz == null
                  ? "Unverified"
                  : `${formatFilterHz(notchPlan.effectiveMinHz)} – ${formatFilterHz(notchPlan.effectiveMaxHz)}`}
              </dd>
            </div>
          </dl>
          <div className="fc-field-grid fc-notch-fields">
            <Field
              label="Notches per axis"
              htmlFor="fc-dyn-notch-count"
              hint="0 disables; 1 to 5 tracked peaks"
              hintId="fc-dyn-notch-count-hint"
            >
              <input
                id="fc-dyn-notch-count"
                type="number"
                min="0"
                max="5"
                step="1"
                aria-invalid={
                  filterInputInvalid(config.dynNotchCount)
                  || !Number.isInteger(Number(config.dynNotchCount))
                }
                aria-describedby="fc-dyn-notch-count-hint"
                value={filterInputValue(config.dynNotchCount)}
                onChange={(event) => onFilterChange(
                  "dynNotchCount",
                  filterInputNumber(event.target.value),
                )}
              />
            </Field>
            <Field
              label="Notch Q · hundredths"
              htmlFor="fc-dyn-notch-q"
              hint="1 to 1000; 300 means Q 3"
              hintId="fc-dyn-notch-q-hint"
            >
              <input
                id="fc-dyn-notch-q"
                type="number"
                min="1"
                max="1000"
                step="1"
                aria-invalid={filterInputInvalid(config.dynNotchQ)}
                aria-describedby="fc-dyn-notch-q-hint"
                value={filterInputValue(config.dynNotchQ)}
                onChange={(event) => onFilterChange(
                  "dynNotchQ",
                  filterInputNumber(event.target.value),
                )}
              />
            </Field>
            <Field
              label="Search low"
              htmlFor="fc-dyn-notch-min"
              hint="20 to 250 Hz"
              hintId="fc-dyn-notch-min-hint"
            >
              <input
                id="fc-dyn-notch-min"
                type="number"
                min="20"
                max="250"
                step="1"
                aria-invalid={filterInputInvalid(config.dynNotchMinHz)}
                aria-describedby="fc-dyn-notch-min-hint"
                value={filterInputValue(config.dynNotchMinHz)}
                onChange={(event) => onFilterChange(
                  "dynNotchMinHz",
                  filterInputNumber(event.target.value),
                )}
              />
            </Field>
            <Field
              label="Search high"
              htmlFor="fc-dyn-notch-max"
              hint="200 to 1000 Hz; must exceed the low edge"
              hintId="fc-dyn-notch-max-hint"
            >
              <input
                id="fc-dyn-notch-max"
                type="number"
                min="200"
                max="1000"
                step="1"
                aria-invalid={filterInputInvalid(config.dynNotchMaxHz)}
                aria-describedby="fc-dyn-notch-max-hint"
                value={filterInputValue(config.dynNotchMaxHz)}
                onChange={(event) => onFilterChange(
                  "dynNotchMaxHz",
                  filterInputNumber(event.target.value),
                )}
              />
            </Field>
          </div>
          <p>
            Eligible is a local gate result, not proof of a notch. The bank
            engages only when live gyro spectra contain a peak above the
            firmware noise floor.
          </p>
        </div>
      </details>
      <p className="fc-filter-boundary">
        These are staged firmware values. RotorBench has not measured the
        spectrum, loop timing, or filter response on the selected aircraft.
      </p>
    </section>
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

function featureUnavailableReason(feature, firmwareFamily) {
  return feature.id === "blackbox" && firmwareFamily === "aerialkit"
    ? "Aerial Kit logs internally; this external blackbox field does not apply."
    : "Not exposed by this documented board profile.";
}

export default function FlightControllerSetup({
  value,
  onChange,
  onSave,
  selectedFlightController = null,
  selectedReceiver = null,
  buildMotorCount = null,
  buildServoCount = null,
  storageKey = "rotorbench:flightControllerPlan",
  onOpenEvidenceReview = null,
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
  const ardupilotParameterRequirements = getArdupilotParameterRequirements(
    config,
    profile,
  );
  const ardupilotSourceLinks = (profile.sourceRefs || []).flatMap((url) => {
    try {
      return [{ url, label: new URL(url).hostname }];
    } catch {
      return [];
    }
  });
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
  const aerialKitLaunchAvailable = supportsAerialKitLaunch(config.airframe);
  const aerialKitFixedWing = supportsAerialKitWingFailsafe(config.airframe);
  const rateFeelSummary = summarizeAerialKitRateFeel(config, {
    fixedWing: aerialKitFixedWing,
  });
  const filterPlan = useMemo(
    () => buildAerialKitFilterPlan(config),
    [config],
  );
  const notchPlan = useMemo(
    () => buildAerialKitNotchPlan(config),
    [config],
  );
  const aerialKitRoleKeys = new Set(
    aerialKitControlRoles.map((role) => role.key),
  );
  const aerialKitRoleRows = {
    velocity: {
      id: "velocity",
      label: "Velocity mode",
      mode: "Optional; 0 disables",
    },
    mission: {
      id: "mission",
      label: "Mission switch",
      mode: "High starts, low ends; 0 disables",
    },
    launch: {
      id: "launch",
      label: "Hand launch",
      mode: "Elevon wings only; 0 disables",
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
    () => validateFlightControllerConfig(config, profile, {
      buildMotorCount,
      buildServoCount,
    }),
    [buildMotorCount, buildServoCount, config, profile],
  );
  const buildServoCoverageIssue = issues.find(
    (issue) => issue.code === "build-servo-coverage",
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
    const profileForBoard = FC_BOARD_PROFILES.find((item) => (
      item.family === familyId
      && item.catalogFlightControllerIds?.includes(selectedFlightController?.id)
    ));
    const profileForFamily = FC_BOARD_PROFILES.find((item) => item.family === familyId);
    const nextProfile = profileForBoard || (
      selectedFlightController
        ? {
            ...getBoardProfile("custom-board", selectedFlightController),
            family: familyId,
          }
        : profileForFamily || getBoardProfile("custom-board", selectedFlightController)
    );
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
      failsafeThrottle: familyId === "betaflight"
        ? config.failsafeThrottle ?? BETAFLIGHT_FAILSAFE_THROTTLE.defaultPwm
        : null,
      modeChannel: preset?.modeChannel ?? null,
      armChannel: preset?.armChannel ?? null,
      beeperChannel: preset?.beeperChannel ?? null,
      velocityChannel: aerialKit && roleKeys.has("velocity")
        ? config.velocityChannel ?? null
        : null,
      missionChannel: aerialKit ? config.missionChannel ?? null : null,
      launchChannel: aerialKit ? config.launchChannel ?? null : null,
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

  const copySerialAllocation = async () => {
    if (!navigator.clipboard?.writeText) {
      setSaveState("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildSerialAllocationText(config, profile),
      );
      setSaveState(
        "Serial allocation copied. No UART, peripheral, continuity, or hardware state was verified.",
      );
    } catch {
      setSaveState("The browser refused clipboard access.");
    }
  };

  const copyArdupilotParameters = async () => {
    if (!navigator.clipboard?.writeText) {
      setSaveState("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildArdupilotParameterPlanText(config, profile),
      );
      setSaveState(
        "ArduPilot parameter plan copied. No controller parameter was written or saved.",
      );
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
  const wiringPlan = useMemo(
    () => buildReceiverWiringPlan(config, profile, selectedReceiver),
    [config, profile, selectedReceiver],
  );
  const receiverPathResolved = Boolean(
    selectedReceiver?.id && wiringPlan.documented,
  );
  const pwmOnlyReceiver = wiringPlan.outputMode === "pwm-only";
  const receiverPwmOutputs = Number(selectedReceiver?.pwmOutputs) || 0;
  const receiverSerialProtocols = Array.isArray(selectedReceiver?.serialProtocols)
    ? selectedReceiver.serialProtocols
    : [];
  const dualOutputReceiver = Boolean(
    selectedReceiver?.id
    && receiverPwmOutputs > 0
    && receiverSerialProtocols.length > 0,
  );
  const serialPorts = useMemo(
    () => getSerialPortAssignments(config, profile),
    [config, profile],
  );
  const plannedSerialRouteCount = serialPorts.filter(
    (port) => port.assignments.length > 0,
  ).length;
  const focusIssueTarget = (issueCode, targetId = null) => {
    const configuredTarget = FLIGHT_CONTROLLER_ISSUE_TARGETS[issueCode];
    const target = targetId
      ? {
          ...(configuredTarget || {}),
          id: targetId,
        }
      : configuredTarget
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
              {pwmOnlyReceiver
                ? "The selected receiver publishes PWM outputs but no serial flight-controller route. Review the direct-output topology before planning a UART."
                : "The selected radio endpoint reaches the planned airframe through this serial and output chain."}
            </p>
          </div>
          <span className={receiverPathResolved ? "is-resolved" : "is-unresolved"}>
            {pwmOnlyReceiver
              ? "PWM outputs only"
              : receiverPathResolved ? "Pins documented" : "Mapping incomplete"}
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
              <small>{pwmOnlyReceiver ? "PWM outputs" : "Serial route"}</small>
              <strong>
                {pwmOnlyReceiver
                  ? `${selectedReceiver?.pwmOutputs || 0} channels`
                  : config.receiverUart || "UART not assigned"}
              </strong>
              <b>
                {pwmOnlyReceiver
                  ? wiringPlan.pins
                  : `${wiringPlan.pins} · ${config.receiverBaud || "rate not set"} baud${
                    dualOutputReceiver
                      ? ` · +${receiverPwmOutputs} PWM outputs`
                      : ""
                  }`}
              </b>
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Cpu size={16} aria-hidden="true" />
            <span>
              <small>Airframe</small>
              <strong>{airframeSpec?.label || "Airframe not selected"}</strong>
              <b>
                {airframeSpec?.motors ?? 0} motor
                {airframeSpec?.motors === 1 ? "" : "s"} ·{" "}
                {airframeSpec?.servos ?? 0} servo
                {airframeSpec?.servos === 1 ? "" : "s"}
              </b>
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Zap size={16} aria-hidden="true" />
            <span>
              <small>Motor protocol</small>
              <strong>DShot {config.dshotKhz} kHz</strong>
              <b>
                {profile.sharedPwmOutputs
                  ? `${profile.sharedPwmOutputs} shared PWM outputs`
                  : `${profile.outputs.motors} documented motor outputs`}
              </b>
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
              ...(config.firmwareFamily === "aerialkit"
                ? [
                    { id: "fc-rate-feel-title", label: "Rate feel" },
                    { id: "fc-filters-title", label: "Filters" },
                  ]
                : []),
              { id: "fc-receiver-title", label: "Receiver" },
              ...(config.firmwareFamily === "aerialkit"
                ? [
                    ...(airframeSpec?.servos > 0
                      ? [{ id: "fc-servo-title", label: "Servos" }]
                      : []),
                    { id: "fc-aircraft-integration-title", label: "Sensor" },
                  ]
                : []),
              { id: "fc-safety-title", label: "Arming" },
              { id: "fc-channels-title", label: "Channels" },
              { id: "fc-plan-summary-title", label: "Summary" },
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
                <select
                  id="fc-airframe"
                  value={config.airframe}
                  onChange={(event) => {
                    const airframe = event.target.value;
                    updateConfig({
                      ...config,
                      airframe,
                      launchChannel: supportsAerialKitLaunch(airframe)
                        ? config.launchChannel ?? null
                        : null,
                    });
                  }}
                >
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
                  <Field
                    label="Integration-step cap"
                    htmlFor="fc-max-dt"
                    hint="Longest step, 5 to 200 ms"
                  >
                    <input
                      id="fc-max-dt"
                      type="number"
                      min="5"
                      max="200"
                      step="1"
                      aria-invalid={integerInvalid(config.maxDtMs)}
                      value={numericValue(config.maxDtMs)}
                      onChange={(event) => update("maxDtMs", numericInput(event.target.value))}
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
              <div>
                <span>Outputs</span>
                <strong>
                  {profile.sharedPwmOutputs
                    ? `${profile.sharedPwmOutputs} shared PWM pads`
                    : `${profile.outputs.motors} motors / ${profile.outputs.servos} servo${profile.outputs.servos === 1 ? "" : "s"}`}
                </strong>
              </div>
            </div>

            {serialPorts.length > 0 && (
              <details className="fc-port-map">
                <summary>
                  <Network size={15} aria-hidden="true" />
                  <span>
                    <strong>Serial allocation</strong>
                    <small>
                      {serialPorts.length} documented ports · {plannedSerialRouteCount} planned route{plannedSerialRouteCount === 1 ? "" : "s"}
                    </small>
                  </span>
                  <em>{plannedSerialRouteCount > 0 ? "Routes marked" : "Board map"}</em>
                </summary>
                <div>
                  <p>
                    Board documentation assigns the serial ports below. Marked
                    routes reflect this local plan; no UART, peripheral, or
                    continuity path has been tested.
                  </p>
                  <ol aria-label="Documented serial port allocation">
                    {serialPorts.map((port) => (
                      <li
                        key={port.id}
                        className={port.assignments.length ? "is-planned" : ""}
                        aria-label={`${port.id}: ${port.role}. ${port.detail}. ${port.assignments.join(" + ") || "Documented"}`}
                      >
                        <strong>{port.id}</strong>
                        <span>
                          <b>{port.role}</b>
                          <small>{port.detail}</small>
                        </span>
                        <em>{port.assignments.join(" + ") || "Documented"}</em>
                      </li>
                    ))}
                  </ol>
                  <button type="button" onClick={copySerialAllocation}>
                    <Clipboard size={14} aria-hidden="true" />
                    Copy serial allocation
                  </button>
                </div>
              </details>
            )}

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

          {config.firmwareFamily === "aerialkit" && (
            <section className="fc-section" aria-labelledby="fc-rate-feel-title">
              <div className="fc-section-heading">
                <Gauge size={18} aria-hidden="true" />
                <div>
                  <h3 id="fc-rate-feel-title">Rate feel</h3>
                  <p>
                    Shape the firmware's Actual-rate response and throttle gain
                    scaling. These are planning values, not measured aircraft rates.
                  </p>
                </div>
              </div>

              <div className="fc-rate-feel-layout">
                <RateCurveFigure
                  config={config}
                  summary={rateFeelSummary}
                  fixedWing={aerialKitFixedWing}
                />
                <div className="fc-rate-feel-fields">
                  <div className="fc-field-grid">
                    <Field
                      label="Maximum angular rate"
                      htmlFor="fc-max-rate"
                      hint="Rate mode at full stick, 10 to 1800 °/s"
                    >
                      <input
                        id="fc-max-rate"
                        type="number"
                        min="10"
                        max="1800"
                        step="1"
                        aria-invalid={numericInvalid(config.maxRateDps)}
                        value={numericValue(config.maxRateDps)}
                        onChange={(event) => update("maxRateDps", numericInput(event.target.value))}
                      />
                    </Field>
                    <Field
                      label="Centre slope"
                      htmlFor="fc-rate-center"
                      hint="0 selects the linear curve; otherwise 0 to 1800 °/s per full stick"
                    >
                      <input
                        id="fc-rate-center"
                        type="number"
                        min="0"
                        max="1800"
                        step="1"
                        aria-invalid={numericInvalid(config.rateCenterDps)}
                        value={numericValue(config.rateCenterDps)}
                        onChange={(event) => update("rateCenterDps", numericInput(event.target.value))}
                      />
                    </Field>
                    <Field
                      label="Rate expo"
                      htmlFor="fc-rate-expo"
                      hint="0 to 1; bends the curve toward the maximum rate"
                    >
                      <input
                        id="fc-rate-expo"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        aria-invalid={numericInvalid(config.rateExpo)}
                        value={numericValue(config.rateExpo)}
                        onChange={(event) => update("rateExpo", numericInput(event.target.value))}
                      />
                    </Field>
                    <Field
                      label="TPA amount"
                      htmlFor="fc-tpa-rate"
                      hint="0 disables; 0 to 100 percent of gain scaling"
                    >
                      <input
                        id="fc-tpa-rate"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        aria-invalid={numericInvalid(config.tpaRate)}
                        value={numericValue(config.tpaRate)}
                        onChange={(event) => update("tpaRate", numericInput(event.target.value))}
                      />
                    </Field>
                    <Field
                      label="TPA breakpoint"
                      htmlFor="fc-tpa-breakpoint"
                      hint="Throttle pivot, 0 to 1; 0.5 is half throttle"
                    >
                      <input
                        id="fc-tpa-breakpoint"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        aria-invalid={numericInvalid(config.tpaBreakpoint)}
                        value={numericValue(config.tpaBreakpoint)}
                        onChange={(event) => update("tpaBreakpoint", numericInput(event.target.value))}
                      />
                    </Field>
                  </div>
                  <div className="fc-rate-feel-note" role="note">
                    <strong>
                      {aerialKitFixedWing
                        ? "Fixed-wing TPA scales P, I, D, and feed-forward."
                        : "Multirotor TPA scales P and D; yaw and I remain unchanged."}
                    </strong>
                    <span>
                      Centre slope 0 or at least the maximum rate selects the
                      linear curve. Expo has no effect while the curve is linear.
                    </span>
                  </div>
                </div>
              </div>
              {profile.buildScope === "workspace" && (
                <fieldset className="fc-sysid-plan">
                  <legend>System identification</legend>
                  <p>
                    The existing System-ID switch starts a bounded armed
                    excitation in rate mode. Stick input aborts the run; angle
                    and manual modes refuse it.
                  </p>
                  <div className="fc-field-grid">
                    <Field label="Excitation axis" htmlFor="fc-sysid-axis">
                      <select
                        id="fc-sysid-axis"
                        value={config.sysidAxis}
                        onChange={(event) => update("sysidAxis", Number(event.target.value))}
                      >
                        <option value="0">Roll</option>
                        <option value="1">Pitch</option>
                        <option value="2">Yaw</option>
                      </select>
                    </Field>
                    <Field label="Pattern" htmlFor="fc-sysid-pattern">
                      <select
                        id="fc-sysid-pattern"
                        value={config.sysidPattern}
                        onChange={(event) => update("sysidPattern", Number(event.target.value))}
                      >
                        <option value="0">Chirp</option>
                        <option value="1">PRBS</option>
                      </select>
                    </Field>
                    <Field
                      label="Torque amplitude"
                      htmlFor="fc-sysid-amplitude"
                      hint="0 to 0.25 of full torque"
                    >
                      <input
                        id="fc-sysid-amplitude"
                        type="number"
                        min="0"
                        max="0.25"
                        step="0.01"
                        aria-invalid={numericInvalid(config.sysidAmplitude)}
                        value={numericValue(config.sysidAmplitude)}
                        onChange={(event) => update("sysidAmplitude", numericInput(event.target.value))}
                      />
                    </Field>
                    <Field
                      label="Duration"
                      htmlFor="fc-sysid-duration"
                      hint="100 to 30000 ms"
                    >
                      <input
                        id="fc-sysid-duration"
                        type="number"
                        min="100"
                        max="30000"
                        step="100"
                        aria-invalid={integerInvalid(config.sysidDurationMs)}
                        value={numericValue(config.sysidDurationMs)}
                        onChange={(event) => update("sysidDurationMs", numericInput(event.target.value))}
                      />
                    </Field>
                  </div>
                  <span className="fc-sysid-channel">
                    {config.sysidChannel == null
                      ? "System-ID channel is not mapped. These values remain staged firmware parameters."
                      : `Tuning switch: CH ${config.sysidChannel}. Confirm the switch low at arm, then cycle it high only for the bounded run.`}
                  </span>
                </fieldset>
              )}
            </section>
          )}

          {config.firmwareFamily === "aerialkit" && (
            <FilterChainsPanel
              config={config}
              plan={filterPlan}
              notchPlan={notchPlan}
              onFilterChange={(key, nextValue) => update(key, nextValue)}
            />
          )}

          {config.firmwareFamily === "aerialkit" && airframeSpec?.servos > 0 && (
            <section className="fc-section" aria-labelledby="fc-servo-title">
              <div className="fc-section-heading">
                <SlidersHorizontal size={18} aria-hidden="true" />
                <div>
                  <h3 id="fc-servo-title" tabIndex="-1">Servo outputs</h3>
                  <p>
                    Set the firmware's linkage plumbing for the selected
                    airframe. These are plan values, not a surface-direction or
                    servo-limit test.
                  </p>
                </div>
              </div>

              {buildServoCoverageIssue && (
                <div className="fc-servo-build-coverage" role="status">
                  <CircleAlert size={16} aria-hidden="true" />
                  <span>
                    <strong>Catalogued servo hardware exceeds this mixer</strong>
                    <small>{buildServoCoverageIssue.message}</small>
                  </span>
                  <em>Review</em>
                </div>
              )}

              <div className="fc-servo-output-grid">
                {AERIALKIT_SERVO_OUTPUTS
                  .slice(0, airframeSpec.servos)
                  .map((servo) => (
                    <fieldset className="fc-servo-output" key={servo.output}>
                      <legend>
                        <strong>Servo {servo.output}</strong>
                        <span>Firmware output {servo.output}</span>
                      </legend>
                      <label className="fc-servo-reverse">
                        <input
                          id={`fc-servo${servo.output}-reverse`}
                          type="checkbox"
                          checked={Boolean(config[servo.reverseKey])}
                          onChange={(event) => update(
                            servo.reverseKey,
                            event.target.checked,
                          )}
                        />
                        <span>
                          <strong>Reverse linkage</strong>
                          <small>Invert the mixer command before pulse output.</small>
                        </span>
                        <em>{config[servo.reverseKey] ? "Reversed" : "Normal"}</em>
                      </label>
                      <div className="fc-servo-fields">
                        <Field
                          label="Centre trim"
                          htmlFor={`fc-servo${servo.output}-trim`}
                          hint={`${AERIALKIT_SERVO_LIMITS.minTrimUs} to ${AERIALKIT_SERVO_LIMITS.maxTrimUs} µs from neutral`}
                        >
                          <input
                            id={`fc-servo${servo.output}-trim`}
                            type="number"
                            min={AERIALKIT_SERVO_LIMITS.minTrimUs}
                            max={AERIALKIT_SERVO_LIMITS.maxTrimUs}
                            step="1"
                            aria-invalid={numericInvalid(config[servo.trimKey])}
                            value={numericValue(config[servo.trimKey])}
                            onChange={(event) => update(
                              servo.trimKey,
                              numericInput(event.target.value),
                            )}
                          />
                        </Field>
                        <Field
                          label="Travel"
                          htmlFor={`fc-servo${servo.output}-travel`}
                          hint={`${AERIALKIT_SERVO_LIMITS.minTravelUs} to ${AERIALKIT_SERVO_LIMITS.maxTravelUs} µs at full stick`}
                        >
                          <input
                            id={`fc-servo${servo.output}-travel`}
                            type="number"
                            min={AERIALKIT_SERVO_LIMITS.minTravelUs}
                            max={AERIALKIT_SERVO_LIMITS.maxTravelUs}
                            step="1"
                            aria-invalid={integerInvalid(config[servo.travelKey])}
                            value={numericValue(config[servo.travelKey])}
                            onChange={(event) => update(
                              servo.travelKey,
                              numericInput(event.target.value),
                            )}
                          />
                        </Field>
                      </div>
                    </fieldset>
                  ))}
              </div>
              <p className="fc-servo-note">
                Verify horn centring, surface direction, mechanical endpoints,
                and linkage clearance on the disarmed aircraft. RotorBench does
                not move an output or claim the control surface is calibrated.
              </p>
            </section>
          )}

          <section className="fc-section" aria-labelledby="fc-receiver-title">
            <div className="fc-section-heading">
              <Cable size={18} aria-hidden="true" />
              <div>
                <h3 id="fc-receiver-title">Receiver and serial</h3>
                <p>
                  {pwmOnlyReceiver
                    ? "The product data exposes PWM outputs, not a serial route. Do not infer a CRSF UART or baud from the ELRS link."
                    : "CRSF carries control and telemetry. SBUS is input-only and may require an inverter."}
                </p>
              </div>
            </div>

            {pwmOnlyReceiver ? (
              <div className="fc-pwm-output-note" role="note">
                <Cable size={17} aria-hidden="true" />
                <div>
                  <strong>
                    {selectedReceiver?.pwmOutputs || 0} PWM outputs · no serial route published
                  </strong>
                  <p>
                    Use the receiver outputs directly for their documented devices,
                    or select a receiver with published CRSF or SBUS serial output.
                    A flight-controller UART, pins, and baud are intentionally not
                    inferred here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {dualOutputReceiver && (
                  <div
                    className="fc-receiver-dual-output"
                    role="group"
                    aria-label="Receiver output topology"
                  >
                    <div className="fc-receiver-dual-output-heading">
                      <RadioTower size={16} aria-hidden="true" />
                      <span>
                        <small>Catalogued receiver outputs</small>
                        <strong>Dual-output receiver</strong>
                      </span>
                      <em>Choose one control path</em>
                    </div>
                    <div className="fc-receiver-output-paths">
                      <div>
                        <span>Flight-controller serial</span>
                        <strong>{receiverSerialProtocols.join(" / ")}</strong>
                        <small>
                          Plan route: {config.receiverUart || "UART not assigned"} ·{" "}
                          {config.receiverBaud || "rate not set"} baud
                        </small>
                      </div>
                      <div>
                        <span>Receiver PWM</span>
                        <strong>{receiverPwmOutputs} outputs</strong>
                        <small>
                          Separate direct-device path; no PWM allocation is inferred here.
                        </small>
                      </div>
                    </div>
                    <p>
                      Both paths are documented by the receiver source. RotorBench
                      plans the serial path for flight control and leaves PWM
                      channel assignment to receiver-side configuration and
                      continuity checks.
                    </p>
                  </div>
                )}
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
                    ? `Compiled board mapping: ${wiringPlan.pins}.`
                    : wiringPlan.documented
                      ? `Documented pins: ${wiringPlan.pins}`
                      : wiringPlan.portDetail
                        ? `${wiringPlan.uart}: ${wiringPlan.portDetail}. Pad mapping must be verified.`
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
              </>
            )}

            <details className="fc-wiring-plan">
              <summary>
                <Cable size={15} aria-hidden="true" />
                <span>
                  <strong>Receiver wiring</strong>
                  <small>
                    {pwmOnlyReceiver
                      ? wiringPlan.pins
                      : `${wiringPlan.uart} · ${wiringPlan.pins} · ${wiringPlan.baud || "rate not set"} baud`}
                  </small>
                </span>
                <em className={wiringPlan.documented ? "is-documented" : "is-unverified"}>
                  {pwmOnlyReceiver
                    ? "PWM only"
                    : wiringPlan.documented ? "Pins documented" : "Verify pins"}
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

            {config.firmwareFamily === "ardupilot"
              && ardupilotParameterRequirements.length > 0 && (
                <div
                  className="fc-ardupilot-parameter-plan"
                  role="region"
                  aria-label="ArduPilot parameter plan"
                >
                  <div className="fc-calibration-heading">
                    <strong>ArduPilot parameter plan</strong>
                    <span>
                      These receiver-side values come from the documented board
                      map. Import a parameter snapshot to compare observed values;
                      RotorBench does not write them here.
                    </span>
                  </div>
                  <ul aria-label="Documented ArduPilot parameter requirements">
                    {ardupilotParameterRequirements.map((requirement) => (
                      <li key={requirement.name}>
                        <code>{requirement.name}={requirement.value}</code>
                        <span>{requirement.description}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="fc-ardupilot-parameter-actions">
                    <button type="button" onClick={copyArdupilotParameters}>
                      <Clipboard size={14} aria-hidden="true" />
                      Copy ArduPilot parameter plan
                    </button>
                    {onOpenEvidenceReview && (
                      <button type="button" onClick={onOpenEvidenceReview}>
                        <FileSearch size={14} aria-hidden="true" />
                        Review imported parameters
                      </button>
                    )}
                  </div>
                  {ardupilotSourceLinks.length > 0 && (
                    <div
                      className="fc-ardupilot-parameter-sources"
                      role="group"
                      aria-label="ArduPilot parameter sources"
                    >
                      <span>Sources</span>
                      {ardupilotSourceLinks.map(({ url, label }) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${label} source in a new tab`}
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
              <p className="fc-feature-note">
                Requested features from the selected board profile. This is not
                a live firmware capability readback.
              </p>
              {FC_FEATURES.map((feature) => {
                const unavailable = profile.featureSupport?.[feature.id] === false;
                const availabilityId = `fc-feature-${feature.id}-availability`;
                return (
                  <label
                    key={feature.id}
                    className={unavailable ? "is-unavailable" : ""}
                  >
                    <input
                      id={`fc-feature-${feature.id}`}
                      type="checkbox"
                      disabled={unavailable}
                      checked={Boolean(config.features[feature.id])}
                      aria-label={feature.label}
                      aria-describedby={unavailable ? availabilityId : undefined}
                      onChange={(event) => update(`features.${feature.id}`, event.target.checked)}
                    />
                    <span className="fc-feature-copy">
                      <span>{feature.label}</span>
                      {unavailable && (
                        <em aria-hidden="true">Unavailable</em>
                      )}
                    </span>
                  </label>
                );
              })}
              {FC_FEATURES.some(
                (feature) => profile.featureSupport?.[feature.id] === false,
              ) && (
                <div className="fc-feature-unavailable">
                  <strong>Unavailable on this board profile</strong>
                  <ul aria-label="Unavailable board-profile features">
                    {FC_FEATURES
                      .filter((feature) => profile.featureSupport?.[feature.id] === false)
                      .map((feature) => (
                        <li
                          key={feature.id}
                          id={`fc-feature-${feature.id}-availability`}
                        >
                          <span>{feature.label}</span>
                          <small>
                            {featureUnavailableReason(feature, config.firmwareFamily)}
                          </small>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
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
                <h3 id="fc-safety-title">Arming, limits, and failsafe</h3>
                <p>These values bound the intended setup. They do not arm, calibrate, flash, or test a physical aircraft.</p>
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
              {config.firmwareFamily === "aerialkit" && (
                <>
                  <Field
                    label="Maximum angle-mode tilt"
                    htmlFor="fc-max-tilt"
                    hint="Angle mode, 5 to 80 degrees"
                  >
                    <input
                      id="fc-max-tilt"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                      aria-invalid={numericInvalid(config.maxTiltDeg)}
                      value={numericValue(config.maxTiltDeg)}
                      onChange={(event) => update("maxTiltDeg", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field
                    label="Full-stick yaw rate"
                    htmlFor="fc-yaw-rate"
                    hint="10 to 1000 °/s"
                  >
                    <input
                      id="fc-yaw-rate"
                      type="number"
                      min="10"
                      max="1000"
                      step="1"
                      aria-invalid={numericInvalid(config.yawRateDps)}
                      value={numericValue(config.yawRateDps)}
                      onChange={(event) => update("yawRateDps", numericInput(event.target.value))}
                    />
                  </Field>
                  {supportsAerialKitWingFailsafe(config.airframe) && (
                    <>
                      <Field
                        label="Lost-link bank"
                        htmlFor="fc-wing-bank"
                        hint="Circling bank, 0 to 60 degrees"
                      >
                        <input
                          id="fc-wing-bank"
                          type="number"
                          min="0"
                          max="60"
                          step="1"
                          aria-invalid={numericInvalid(config.wingDescendBankDeg)}
                          value={numericValue(config.wingDescendBankDeg)}
                          onChange={(event) => update(
                            "wingDescendBankDeg",
                            numericInput(event.target.value),
                          )}
                        />
                      </Field>
                      <Field
                        label="Lost-link nose-down"
                        htmlFor="fc-wing-pitch"
                        hint="Held descent pitch, 0 to 30 degrees"
                      >
                        <input
                          id="fc-wing-pitch"
                          type="number"
                          min="0"
                          max="30"
                          step="1"
                          aria-invalid={numericInvalid(config.wingDescendPitchDeg)}
                          value={numericValue(config.wingDescendPitchDeg)}
                          onChange={(event) => update(
                            "wingDescendPitchDeg",
                            numericInput(event.target.value),
                          )}
                        />
                      </Field>
                      <Field
                        label="Lost-link throttle"
                        htmlFor="fc-wing-throttle"
                        hint="0 to 0.60; keep air over the elevons"
                      >
                        <input
                          id="fc-wing-throttle"
                          type="number"
                          min="0"
                          max="0.6"
                          step="0.01"
                          aria-invalid={numericInvalid(config.wingDescendThrottle)}
                          value={numericValue(config.wingDescendThrottle)}
                          onChange={(event) => update(
                            "wingDescendThrottle",
                            numericInput(event.target.value),
                          )}
                        />
                      </Field>
                      <Field
                        label="Recovery delay"
                        htmlFor="fc-fs-recover"
                        hint="Link-good time before stick input can recover; 0 keeps the descent latched"
                      >
                        <input
                          id="fc-fs-recover"
                          type="number"
                          min="0"
                          max="20000"
                          step="10"
                          aria-invalid={integerInvalid(config.fsRecoverMs)}
                          value={numericValue(config.fsRecoverMs)}
                          onChange={(event) => update(
                            "fsRecoverMs",
                            numericInput(event.target.value),
                          )}
                        />
                      </Field>
                      <Field
                        label="Stick threshold"
                        htmlFor="fc-fs-stick-threshold"
                        hint="Sum of absolute roll, pitch, and yaw after link recovery; 0 to 3"
                      >
                        <input
                          id="fc-fs-stick-threshold"
                          type="number"
                          min="0"
                          max="3"
                          step="0.01"
                          aria-invalid={numericInvalid(config.fsStickThreshold)}
                          value={numericValue(config.fsStickThreshold)}
                          onChange={(event) => update(
                            "fsStickThreshold",
                            numericInput(event.target.value),
                          )}
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              <Field label="Link-loss action" htmlFor="fc-failsafe">
                <select id="fc-failsafe" value={config.failsafeAction} onChange={(event) => update("failsafeAction", event.target.value)}>
                  {FAILSAFE_ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </Field>
              {config.firmwareFamily === "betaflight" && (
                <Field
                  label="Stage 2 landing throttle"
                  htmlFor="fc-failsafe-throttle"
                  hintId="fc-failsafe-throttle-help"
                  hint={(
                    <>
                      {BETAFLIGHT_FAILSAFE_THROTTLE.minPwm}–{BETAFLIGHT_FAILSAFE_THROTTLE.maxPwm} PWM
                      {" · 1000 is throttle off · "}
                      Sets <code>failsafe_throttle</code>. Betaflight uses it only in
                      Stage 2 Landing Mode; confirm the board&apos;s selected procedure first.
                    </>
                  )}
                >
                  <input
                    id="fc-failsafe-throttle"
                    aria-describedby="fc-failsafe-throttle-help"
                    type="number"
                    min={BETAFLIGHT_FAILSAFE_THROTTLE.minPwm}
                    max={BETAFLIGHT_FAILSAFE_THROTTLE.maxPwm}
                    step="1"
                    aria-invalid={
                      integerInvalid(config.failsafeThrottle)
                      || Number(config.failsafeThrottle) < BETAFLIGHT_FAILSAFE_THROTTLE.minPwm
                      || Number(config.failsafeThrottle) > BETAFLIGHT_FAILSAFE_THROTTLE.maxPwm
                    }
                    value={numericValue(config.failsafeThrottle)}
                    onChange={(event) => update(
                      "failsafeThrottle",
                      numericInput(event.target.value),
                    )}
                  />
                </Field>
              )}
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
                  <strong>Navigation safety plan</strong>
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
                <div className="fc-field-grid fc-calibration-grid">
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
                  <Field
                    label="Return floor"
                    htmlFor="fc-rth-min-alt"
                    hint="Metres above home, 0 to 500; 0 means no floor"
                  >
                    <input
                      id="fc-rth-min-alt"
                      type="number"
                      min="0"
                      max="500"
                      step="1"
                      aria-invalid={numericInvalid(config.rthMinAltM)}
                      value={numericValue(config.rthMinAltM)}
                      onChange={(event) => update("rthMinAltM", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field
                    label="GPS minimum"
                    htmlFor="fc-gps-min-sats"
                    hint="Satellites required for navigation, 5 to 10"
                  >
                    <input
                      id="fc-gps-min-sats"
                      type="number"
                      min="5"
                      max="10"
                      step="1"
                      aria-invalid={integerInvalid(config.gpsMinSats)}
                      value={numericValue(config.gpsMinSats)}
                      onChange={(event) => update("gpsMinSats", numericInput(event.target.value))}
                    />
                  </Field>
                  <Field
                    label="Mission channel"
                    htmlFor="fc-mission-channel"
                    hint="Optional AUX 5–8; leave 0 or blank to disable"
                  >
                    <input
                      id="fc-mission-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.missionChannel)}
                      value={config.missionChannel ?? ""}
                      onChange={(event) => update(
                        "missionChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                </div>
                <p className="fc-alignment-note">
                  Set the radius wider than the aircraft's turn circle. At a
                  configured ceiling, the navigator holds 10 m below the lid.
                  The return floor uses the fused altitude estimate, not GPS alone.
                  A mission switch starts only on its high transition and ends
                  when switched low.
                </p>
              </div>
            )}
            {config.firmwareFamily === "aerialkit" && aerialKitFixedWing && (
              <div className="fc-alignment-note" role="note">
                Lost-link recovery hands a descending wing back only when the
                arm switch remains high, the link has been good for the recovery
                delay without another dropout, and the combined roll, pitch, and
                yaw stick motion reaches the threshold. Centred sticks never
                recover. These controls plan firmware behavior and do not test
                a real receiver dropout.
              </div>
            )}
            {config.firmwareFamily === "aerialkit" && aerialKitLaunchAvailable && (
              <div className="fc-calibration fc-launch-plan">
                <div className="fc-calibration-heading">
                  <strong>Hand-launch plan</strong>
                  <span>
                    The firmware holds a climb attitude and throttle after the
                    pilot arms and raises the launch switch.
                  </span>
                </div>
                <div className="fc-field-grid fc-calibration-grid">
                  <Field
                    label="Launch channel"
                    htmlFor="fc-launch-channel"
                    hint="Optional AUX 5–8; leave 0 or blank to disable"
                  >
                    <input
                      id="fc-launch-channel"
                      type="number"
                      min={channelMinimum}
                      max={channelMaximum}
                      aria-invalid={channelIsInvalid(config.launchChannel)}
                      value={config.launchChannel ?? ""}
                      onChange={(event) => update(
                        "launchChannel",
                        optionalChannel(event.target.value),
                      )}
                    />
                  </Field>
                  <Field
                    label="Launch throttle"
                    htmlFor="fc-launch-throttle"
                    hint="0 to 1; 0.70 is 70 per cent"
                  >
                    <input
                      id="fc-launch-throttle"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      aria-invalid={numericInvalid(config.launchThrottle)}
                      value={numericValue(config.launchThrottle)}
                      onChange={(event) => update(
                        "launchThrottle",
                        numericInput(event.target.value),
                      )}
                    />
                  </Field>
                  <Field
                    label="Launch climb"
                    htmlFor="fc-launch-climb"
                    hint="Degrees; 0 to 45"
                  >
                    <input
                      id="fc-launch-climb"
                      type="number"
                      min="0"
                      max="45"
                      step="1"
                      aria-invalid={numericInvalid(config.launchClimbDeg)}
                      value={numericValue(config.launchClimbDeg)}
                      onChange={(event) => update(
                        "launchClimbDeg",
                        numericInput(event.target.value),
                      )}
                    />
                  </Field>
                  <Field
                    label="Launch timeout"
                    htmlFor="fc-launch-timeout"
                    hint="Seconds; 0 to 60"
                  >
                    <input
                      id="fc-launch-timeout"
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      aria-invalid={integerInvalid(config.launchTimeoutS)}
                      value={numericValue(config.launchTimeoutS)}
                      onChange={(event) => update(
                        "launchTimeoutS",
                        numericInput(event.target.value),
                      )}
                    />
                  </Field>
                </div>
                <p className="fc-alignment-note">
                  A roll, pitch, or yaw stick past one-fifteenth of travel ends
                  the launch; the throttle stick does not. Switching launch low,
                  timeout, disarm, fence return, or failsafe also ends it. Test
                  the switch and output directions with the propeller removed.
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
                  mission: config.missionChannel,
                  launch: config.launchChannel,
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
              <h3 id="fc-plan-summary-title" tabIndex={-1}>Plan summary</h3>
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
                  onClick={() => focusIssueTarget(issue.code, issue.targetId)}
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
                  <pre
                    tabIndex={0}
                    role="region"
                    aria-label="Flight controller command preview"
                  >
                    {commandPreview.text}
                  </pre>
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
