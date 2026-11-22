import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  CircleStop,
  Cpu,
  Download,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  AERIAL_KIT_COMMANDS,
  AERIAL_KIT_FEATURE_RC_CHANNELS,
  AerialKitReadOnlySession,
  aerialKitArmedState,
  createAerialKitStatusEvidence,
  parseAerialKitHello,
  parseAerialKitRcChannels,
  parseAerialKitStatus,
} from "../utils/aerialKitProtocol";
import {
  SERIAL_CAPTURE_BAUD_RATES,
  hasWebSerial,
  serialCaptureErrorMessage,
} from "../utils/webSerialCapture";

const STATUS_LABELS = {
  idle: "Not connected",
  selecting: "Selecting port",
  connecting: "Identifying board",
  monitoring: "Monitoring",
  stopping: "Stopping",
  stopped: "Stopped",
  error: "Session error",
  unsupported: "Unsupported",
};

const ROLE_LABELS = {
  roll: "Roll",
  pitch: "Pitch",
  throttle: "Throttle",
  yaw: "Yaw",
  flightMode: "Flight mode",
  arm: "Arm",
  velocity: "Velocity",
  mission: "Mission",
  launch: "Launch",
  manual: "Manual",
  control: "Control mode",
  systemId: "System ID",
  beeper: "Beeper",
};

function hexWord(value) {
  return value == null
    ? "Absent"
    : `0x${value.toString(16).padStart(8, "0")}`;
}

function ageLabel(observedAtMs, nowMs) {
  return observedAtMs == null
    ? "Not observed"
    : `${Math.max(0, nowMs - observedAtMs) / 1000 < 0.1
      ? "<0.1"
      : (Math.max(0, nowMs - observedAtMs) / 1000).toFixed(1)} s ago`;
}

export default function AerialKitStatusSession({
  firmwareFamily = null,
  channelMap = null,
  targetName = null,
  onObservation = null,
}) {
  const supportedBrowser = useMemo(() => hasWebSerial(), []);
  const firmwareSupported = firmwareFamily === "aerialkit";
  const [baudRate, setBaudRate] = useState(115200);
  const [sessionState, setSessionState] = useState(
    !supportedBrowser ? "unsupported" : firmwareSupported ? "idle" : "unsupported",
  );
  const [hello, setHello] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [rc, setRc] = useState(null);
  const [rcError, setRcError] = useState("");
  const [lastStatusAt, setLastStatusAt] = useState(null);
  const [lastRcAt, setLastRcAt] = useState(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [protocolStats, setProtocolStats] = useState(null);
  const mountedRef = useRef(true);
  const activeRef = useRef(false);
  const pollBusyRef = useRef(false);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const sessionRef = useRef(null);
  const pollTimerRef = useRef(null);
  const observationRef = useRef(null);

  useEffect(() => {
    if (!["monitoring", "connecting"].includes(sessionState)) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [sessionState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      sessionRef.current?.close?.()?.catch?.(() => {});
      readerRef.current?.cancel?.()?.catch?.(() => {});
      portRef.current?.close?.()?.catch?.(() => {});
    };
  }, []);

  const addIssue = (detail) => {
    if (!mountedRef.current || !detail) return;
    setIssues((current) => [...current.slice(-5), detail]);
  };

  const resetObservation = () => {
    setHello(null);
    setLiveStatus(null);
    setRc(null);
    setRcError("");
    setLastStatusAt(null);
    setLastRcAt(null);
    setIssues([]);
    setError("");
    setMessage("");
    setProtocolStats(null);
    observationRef.current = null;
    onObservation?.(null);
  };

  const closeSession = useCallback(async (nextState = "stopped") => {
    activeRef.current = false;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
    if (sessionRef.current) setProtocolStats({ ...sessionRef.current.stats });
    if (observationRef.current) {
      onObservation?.({
        ...observationRef.current,
        active: false,
      });
    }
    await sessionRef.current?.close?.();
    sessionRef.current = null;
    try {
      readerRef.current?.releaseLock?.();
    } catch {
      // A cancelled read stream may already have released its lock.
    }
    try {
      writerRef.current?.releaseLock?.();
    } catch {
      // A disconnected port may already have released its lock.
    }
    try {
      await portRef.current?.close?.();
    } catch {
      // A disconnected port is already closed.
    }
    readerRef.current = null;
    writerRef.current = null;
    portRef.current = null;
    if (mountedRef.current) setSessionState(nextState);
  }, [onObservation]);

  useEffect(() => {
    if (firmwareSupported && supportedBrowser) {
      setSessionState((current) => current === "unsupported" ? "idle" : current);
      return;
    }
    if (activeRef.current) {
      void closeSession("unsupported");
      return;
    }
    setSessionState("unsupported");
  }, [closeSession, firmwareSupported, supportedBrowser]);

  const readSnapshot = async (session, helloValue) => {
    const statusPayload = await session.request(AERIAL_KIT_COMMANDS.status);
    const parsedStatus = parseAerialKitStatus(statusPayload);
    const observedAt = Date.now();
    if (!mountedRef.current) return;
    setLiveStatus(parsedStatus);
    setLastStatusAt(observedAt);
    setProtocolStats({ ...session.stats });
    if (!observationRef.current) {
      const observed = {
        hello: helloValue,
        status: parsedStatus,
        observedAt,
        active: true,
      };
      observationRef.current = observed;
      onObservation?.(observed);
    }

    const rcCapabilityUnknown = helloValue?.features == null;
    const rcCapabilityClaimed = rcCapabilityUnknown
      || (helloValue.features & AERIAL_KIT_FEATURE_RC_CHANNELS) !== 0;
    if (!rcCapabilityClaimed) {
      setRc(null);
      setRcError(
        "The HELLO capability word does not claim RC_CHANNELS, so this session did not ask for RC readback.",
      );
      return;
    }
    try {
      const rcPayload = await session.request(AERIAL_KIT_COMMANDS.rcChannels);
      if (!mountedRef.current) return;
      setRc(parseAerialKitRcChannels(rcPayload));
      setLastRcAt(Date.now());
      setRcError("");
    } catch (rcReadError) {
      if (!mountedRef.current) return;
      setRc(null);
      setLastRcAt(null);
      setRcError(rcReadError.message);
    }
    setProtocolStats({ ...session.stats });
  };

  const schedulePoll = (session, helloValue) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(async () => {
      if (!activeRef.current || pollBusyRef.current) return;
      pollBusyRef.current = true;
      try {
        await readSnapshot(session, helloValue);
      } catch (pollError) {
        if (!mountedRef.current) return;
        setError(pollError.message);
        setSessionState("error");
        await closeSession("error");
        return;
      } finally {
        pollBusyRef.current = false;
      }
      schedulePoll(session, helloValue);
    }, 500);
  };

  const connect = async () => {
    if (!supportedBrowser || !firmwareSupported || activeRef.current) return;
    resetObservation();
    setSessionState("selecting");
    let port = null;
    try {
      port = await navigator.serial.requestPort();
      portRef.current = port;
      setSessionState("connecting");
      await port.open({ baudRate });
      const reader = port.readable?.getReader();
      const writer = port.writable?.getWriter();
      if (!reader) throw new Error("The selected port did not provide a readable stream.");
      if (!writer) throw new Error("The selected port did not provide a writable stream.");
      readerRef.current = reader;
      writerRef.current = writer;
      activeRef.current = true;
      const session = new AerialKitReadOnlySession({
        reader,
        writer,
        onIssue: addIssue,
        onClose: (reason) => {
          if (!mountedRef.current || !activeRef.current) return;
          activeRef.current = false;
          setError(reason);
          setSessionState("error");
          void closeSession("error");
        },
      });
      sessionRef.current = session;

      const helloRequest = session.request(AERIAL_KIT_COMMANDS.hello);
      session.startReading();
      const helloPayload = await helloRequest;
      const parsedHello = parseAerialKitHello(helloPayload);
      if (!mountedRef.current) return;
      setHello(parsedHello);
      await readSnapshot(session, parsedHello);
      if (!mountedRef.current) return;
      setSessionState("monitoring");
      setMessage("Read-only AKP queries are active. No settings were changed.");
      schedulePoll(session, parsedHello);
    } catch (connectError) {
      activeRef.current = false;
      sessionRef.current?.close?.()?.catch?.(() => {});
      sessionRef.current = null;
      try {
        readerRef.current?.releaseLock?.();
        writerRef.current?.releaseLock?.();
      } catch {
        // Locks may already be released after an open failure.
      }
      try {
        await port?.close?.();
      } catch {
        // Ignore cleanup failure after an unsuccessful open.
      }
      portRef.current = null;
      readerRef.current = null;
      writerRef.current = null;
      if (mountedRef.current) {
        setError(serialCaptureErrorMessage(connectError));
        setSessionState("error");
      }
    }
  };

  const stop = async () => {
    if (!activeRef.current) return;
    setSessionState("stopping");
    await closeSession("stopped");
    if (mountedRef.current) {
      setMessage("Session stopped. The last observation remains visible until cleared.");
    }
  };

  const downloadSnapshot = () => {
    const evidence = createAerialKitStatusEvidence({
      hello,
      status: liveStatus,
      rc,
      rcError,
      statusObservedAtMs: lastStatusAt,
      rcObservedAtMs: lastRcAt,
      baudRate,
      targetName,
      protocolStats,
      connectionActive: sessionState === "monitoring",
      nowMs: Date.now(),
    });
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rotorbench-aerial-kit-status-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("Read-only status snapshot downloaded without a serial port identity.");
  };

  const channelLabels = useMemo(() => {
    const labels = {};
    Object.entries(channelMap || {}).forEach(([role, channel]) => {
      if (!Number.isInteger(channel) || !ROLE_LABELS[role]) return;
      labels[channel] = ROLE_LABELS[role];
    });
    return labels;
  }, [channelMap]);
  const armed = aerialKitArmedState(liveStatus, {
    observedAtMs: lastStatusAt,
    nowMs: clockNow,
    connectionActive: sessionState === "monitoring",
  });
  const rcAgeMs = lastRcAt == null ? null : Math.max(0, clockNow - lastRcAt);
  const canDownload = Boolean(hello || liveStatus || rc);
  const busy = ["selecting", "connecting", "stopping"].includes(sessionState);
  const active = ["connecting", "monitoring"].includes(sessionState);

  return (
    <details
      id="aerial-kit-status-session"
      className="serial-capture aerial-kit-session"
    >
      <summary>
        <Cpu size={19} aria-hidden="true" />
        <span>
          <strong>Aerial Kit flight status</strong>
          <small>
            Experimental · explicit port selection · HELLO / STATUS / RC queries
          </small>
        </span>
        <em>Queries only</em>
      </summary>

      <div className="serial-capture-body aerial-kit-session-body">
        <div className="serial-capture-boundary">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Read-only AKP observation</strong>
            <p>
              This session identifies the board, polls live status and RC
              readback, and never writes parameters, saves settings, arms,
              calibrates, tests outputs, or flashes firmware. Opening a
              native-USB port may reset the board.
            </p>
          </div>
        </div>

        {!supportedBrowser ? (
          <div className="serial-capture-unsupported">
            <RadioTower size={20} aria-hidden="true" />
            <div>
              <strong>Web Serial is unavailable</strong>
              <p>Use a Chromium desktop browser over HTTPS or localhost.</p>
            </div>
          </div>
        ) : !firmwareSupported ? (
          <div className="aerial-kit-session-unavailable" role="note">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>
              <strong>AKP live status is not available for this plan</strong>
              <small>
                The selected firmware family is {firmwareFamily || "not set"}.
                This session speaks only Aerial Kit's read-only AKP queries.
              </small>
            </span>
          </div>
        ) : (
          <>
            <div className="serial-capture-controls">
              <label>
                Logical baud
                <select
                  value={baudRate}
                  disabled={active || busy}
                  onChange={(event) => setBaudRate(Number(event.target.value))}
                >
                  {SERIAL_CAPTURE_BAUD_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="serial-capture-start"
                disabled={active || busy}
                onClick={connect}
              >
                <Cpu size={15} aria-hidden="true" />
                Connect and monitor
              </button>
              <button type="button" disabled={!active || busy} onClick={stop}>
                <CircleStop size={15} aria-hidden="true" />
                Stop session
              </button>
              <button
                type="button"
                disabled={!canDownload}
                onClick={downloadSnapshot}
              >
                <Download size={15} aria-hidden="true" />
                Download snapshot
              </button>
              <button
                type="button"
                disabled={active || (!hello && !liveStatus && !rc)}
                onClick={resetObservation}
              >
                Clear observation
              </button>
            </div>

            <div className="serial-capture-state" aria-live="polite">
              <span className={`is-${sessionState}`}>
                <Activity size={14} aria-hidden="true" />
                {STATUS_LABELS[sessionState] || sessionState}
              </span>
              <span>
                {protocolStats
                  ? `${protocolStats.framesDecoded} AKP frames`
                  : "No AKP frames"}
              </span>
            </div>
            {message && <p className="aerial-kit-session-message">{message}</p>}
            {error && <p className="serial-capture-error" role="alert">{error}</p>}

            <ol className="aerial-kit-session-ladder" aria-label="AKP observation stages">
              <li className={active ? "is-complete" : "is-pending"}>
                <span aria-hidden="true" />
                Port and query link
              </li>
              <li className={hello ? "is-complete" : "is-pending"}>
                <span aria-hidden="true" />
                Board identity
              </li>
              <li className={armed.fresh ? "is-complete" : "is-pending"}>
                <span aria-hidden="true" />
                Fresh STATUS
              </li>
              <li className={rc ? "is-complete" : "is-pending"}>
                <span aria-hidden="true" />
                RC readback
              </li>
              <li className="is-unverified">
                <span aria-hidden="true" />
                RF path not verified
              </li>
            </ol>

            {hello && (
              <section
                className="aerial-kit-identity"
                aria-label="Observed Aerial Kit identity"
              >
                <div className="aerial-kit-section-heading">
                  <strong>{hello.product}</strong>
                  <span>
                    {hello.capabilityState === "absent"
                      ? "Capability word absent"
                      : "Capability word reported"}
                  </span>
                </div>
                <dl>
                  <div><dt>Protocol</dt><dd>{hello.protocolVersion}</dd></div>
                  <div><dt>Parameters</dt><dd>{hello.parameterCount}</dd></div>
                  <div><dt>Changed since save</dt><dd>{hello.changed || "—"}</dd></div>
                  <div><dt>Capabilities</dt><dd>{hexWord(hello.features)}</dd></div>
                </dl>
                {hello.featureDetails.length > 0 ? (
                  <ul aria-label="Reported firmware capabilities">
                    {hello.featureDetails.map((feature) => (
                      <li key={feature.name}>
                        <span>{feature.label}</span>
                        <code>{feature.name}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {hello.capabilityState === "absent"
                      ? "HELLO predates the capability word, so support is unknown rather than empty."
                      : "The capability word reports no known optional commands."}
                  </p>
                )}
              </section>
            )}

            <section
              className={`aerial-kit-armed is-${armed.state}`}
              aria-label="Observed arming state"
            >
              {armed.state === "armed"
                ? <ShieldAlert size={18} aria-hidden="true" />
                : armed.state === "disarmed"
                  ? <ShieldCheck size={18} aria-hidden="true" />
                  : <Activity size={18} aria-hidden="true" />}
              <span>
                <strong>{armed.label}</strong>
                <small>{armed.detail}</small>
              </span>
              <em>{ageLabel(lastStatusAt, clockNow)}</em>
            </section>

            {liveStatus && (
              <section
                className="aerial-kit-live"
                aria-label="Observed flight-controller status"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Live STATUS</strong>
                  <span>{ageLabel(lastStatusAt, clockNow)}</span>
                </div>
                <dl>
                  <div><dt>Flight state</dt><dd>{armed.flightStateName}</dd></div>
                  <div>
                    <dt>Receiver link</dt>
                    <dd>{liveStatus.linkLive === 1 ? "Live" : "Not live"}</dd>
                  </div>
                  <div>
                    <dt>Attitude</dt>
                    <dd>
                      {liveStatus.rollDeg.toFixed(1)} /{" "}
                      {liveStatus.pitchDeg.toFixed(1)} /{" "}
                      {liveStatus.yawDeg.toFixed(1)}°
                    </dd>
                  </div>
                  <div>
                    <dt>GPS</dt>
                    <dd>
                      fix {liveStatus.gpsFixType} · {liveStatus.gpsSatellites} satellites
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {rcError && (
              <div className="aerial-kit-rc-unavailable" role="note">
                <ShieldAlert size={16} aria-hidden="true" />
                <span>
                  <strong>RC readback unavailable</strong>
                  <small>{rcError}</small>
                </span>
              </div>
            )}

            {rc && (
              <section
                className={`aerial-kit-rc is-${rc.status}`}
                aria-label="Observed receiver channels"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Receiver RC readback</strong>
                  <span>
                    {rcAgeMs == null ? "Not observed" : `${(rcAgeMs / 1000).toFixed(1)} s ago`}
                  </span>
                </div>
                {rc.status === "no-receiver" ? (
                  <p>
                    This board answered that it has no receiver input. That is a
                    fact about the hardware path, not a receiver with zeroed channels.
                  </p>
                ) : (
                  <>
                    <dl>
                      <div><dt>Protocol</dt><dd>{rc.protocolName || `Unknown (${rc.protocol})`}</dd></div>
                      <div><dt>Flags</dt><dd>{rc.flagNames.join(" · ") || "None"}</dd></div>
                      <div><dt>Switches</dt><dd>{rc.switchNames.join(" · ") || "None high"}</dd></div>
                      <div>
                        <dt>Failsafe</dt>
                        <dd>{rc.flagNames.includes("failsafe") ? "Reported" : "Not asserted"}</dd>
                      </div>
                    </dl>
                    <ol aria-label="Observed receiver channel values">
                      {rc.channels.map((value, index) => {
                        const channel = index + 1;
                        return (
                          <li key={channel}>
                            <span>
                              CH {channel}
                              {channelLabels[channel] ? ` · ${channelLabels[channel]}` : ""}
                            </span>
                            <strong>{value}</strong>
                          </li>
                        );
                      })}
                    </ol>
                    <p>
                      Raw decoded receiver values. This does not prove RF range,
                      stick calibration, or flight readiness.
                    </p>
                  </>
                )}
              </section>
            )}

            {issues.length > 0 && (
              <div className="aerial-kit-session-issues" role="status">
                <strong>Protocol observations</strong>
                <ul>
                  {issues.map((issue, index) => (
                    <li key={`${index}-${issue}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="aerial-kit-session-boundary">
              A fresh STATUS can establish the state the board reported while it
              answered. It cannot establish continuity, RF authenticity, sensor
              health, flight readiness, or that a configuration was applied.
            </p>
          </>
        )}
      </div>
    </details>
  );
}
