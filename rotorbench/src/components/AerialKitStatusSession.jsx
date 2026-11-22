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
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  AERIAL_KIT_COMMANDS,
  AERIAL_KIT_FEATURE_RC_CHANNELS,
  AERIAL_KIT_FEATURE_PARAM_INFO,
  AERIAL_KIT_PARAMETER_READ_LIMIT,
  AerialKitReadOnlySession,
  aerialKitArmedState,
  createAerialKitStatusEvidence,
  decodeAerialKitText,
  parseAerialKitHello,
  parseAerialKitParamHelpSlice,
  parseAerialKitParamGet,
  parseAerialKitParamInfoPage,
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
  const [parameters, setParameters] = useState(null);
  const [parameterQuery, setParameterQuery] = useState("");
  const [parameterState, setParameterState] = useState("idle");
  const [parameterProgress, setParameterProgress] = useState({
    read: 0,
    total: 0,
  });
  const [parameterError, setParameterError] = useState("");
  const [parameterMetadata, setParameterMetadata] = useState(null);
  const [metadataState, setMetadataState] = useState("idle");
  const [metadataProgress, setMetadataProgress] = useState({
    read: 0,
    total: 0,
  });
  const [metadataError, setMetadataError] = useState("");
  const [helpState, setHelpState] = useState("idle");
  const [helpProgress, setHelpProgress] = useState({
    done: 0,
    total: 0,
  });
  const [helpError, setHelpError] = useState("");
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
    setParameters(null);
    setParameterQuery("");
    setParameterState("idle");
    setParameterProgress({ read: 0, total: 0 });
    setParameterError("");
    setParameterMetadata(null);
    setMetadataState("idle");
    setMetadataProgress({ read: 0, total: 0 });
    setMetadataError("");
    setHelpState("idle");
    setHelpProgress({ done: 0, total: 0 });
    setHelpError("");
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

  const readParameters = async () => {
    const session = sessionRef.current;
    const count = hello?.parameterCount;
    if (!activeRef.current || !session) return;
    if (
      !Number.isInteger(count)
      || count < 0
      || count > AERIAL_KIT_PARAMETER_READ_LIMIT
    ) {
      setParameterError(
        `HELLO reports ${count ?? "an invalid"} parameters; this reader is bounded to ${AERIAL_KIT_PARAMETER_READ_LIMIT}.`,
      );
      setParameterState("error");
      return;
    }
    if (pollBusyRef.current) {
      setParameterError(
        "Wait for the current STATUS/RC poll to finish before reading parameters.",
      );
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setParameterError("");
    setParameterState("reading");
    setParameterProgress({ read: 0, total: count });
    const read = [];
    try {
      for (let index = 0; index < count; index += 1) {
        if (!activeRef.current) break;
        const payload = await session.request(
          AERIAL_KIT_COMMANDS.paramGet,
          Uint8Array.of(index),
        );
        read.push(parseAerialKitParamGet(payload, index));
        setParameterProgress({ read: index + 1, total: count });
      }
      if (!mountedRef.current) return;
      setParameters(read);
      setParameterState("ready");
      setMessage(
        `Read ${read.length} parameter name/value pair${read.length === 1 ? "" : "s"} without writing or saving settings.`,
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setParameters(read);
      setParameterState("error");
      setParameterError(
        `${readError.message} ${read.length} value${read.length === 1 ? "" : "s"} were read before the stop.`,
      );
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readParameterMetadata = async () => {
    const session = sessionRef.current;
    const count = hello?.parameterCount;
    if (!activeRef.current || !session) return;
    if (
      !Number.isInteger(count)
      || count < 0
      || count > AERIAL_KIT_PARAMETER_READ_LIMIT
    ) {
      setMetadataError(
        `HELLO reports ${count ?? "an invalid"} parameters; this reader is bounded to ${AERIAL_KIT_PARAMETER_READ_LIMIT}.`,
      );
      setMetadataState("error");
      return;
    }
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_PARAM_INFO) === 0
    ) {
      setMetadataError(
        "The HELLO capability word does not claim PARAM_INFO, so RotorBench did not ask the board to describe its parameters.",
      );
      setMetadataState("error");
      return;
    }
    if (pollBusyRef.current) {
      setMetadataError(
        "Wait for the current STATUS/RC poll to finish before reading metadata.",
      );
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setMetadataError("");
    setMetadataState("reading");
    setMetadataProgress({ read: 0, total: count });
    const read = [];
    let index = 0;
    try {
      while (index < count) {
        if (!activeRef.current) break;
        const payload = await session.request(
          AERIAL_KIT_COMMANDS.paramInfo,
          Uint8Array.of(index),
        );
        const page = parseAerialKitParamInfoPage(payload, index);
        if (page.status === "no-index") break;
        if (page.status === "too-big") {
          read.push({
            index,
            name: null,
            unavailable: "The board says this entry does not fit one frame.",
          });
          index += 1;
          setMetadataProgress({ read: index, total: count });
          continue;
        }
        if (page.entries.length === 0) break;
        const pageIndex = index;
        page.entries.forEach((entry, offset) => {
          read.push({
            ...entry,
            index: pageIndex + offset,
          });
        });
        index += page.entries.length;
        setMetadataProgress({ read: index, total: count });
      }
      if (!mountedRef.current) return;
      setParameterMetadata(read);
      setMetadataState("ready");
      setMessage(
        `Read ${read.length} board-reported metadata row${read.length === 1 ? "" : "s"} without writing or saving settings.`,
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setParameterMetadata(read);
      setMetadataState("error");
      setMetadataError(
        `${readError.message} ${read.length} metadata row${read.length === 1 ? "" : "s"} were read before the stop.`,
      );
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readParameterHelp = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session || !parameterMetadata) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_PARAM_INFO) === 0
    ) {
      setHelpError(
        "The HELLO capability word does not claim PARAM_INFO, so descriptions cannot be requested.",
      );
      setHelpState("error");
      return;
    }
    if (pollBusyRef.current) {
      setHelpError(
        "Wait for the current STATUS/RC poll to finish before reading descriptions.",
      );
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setHelpError("");
    setHelpState("reading");
    const rows = parameterMetadata.map((parameter) => ({ ...parameter }));
    const total = rows.filter((parameter) => parameter.name).length;
    setHelpProgress({ done: 0, total });
    let done = 0;
    try {
      for (const parameter of rows) {
        if (!activeRef.current) break;
        if (!parameter.name) continue;
        let offset = 0;
        let expectedTotal = null;
        const chunks = [];
        for (let chunk = 0; ; chunk += 1) {
          if (chunk > 32) {
            throw new Error(
              `Description for ${parameter.name} exceeded 32 chunks.`,
            );
          }
          const payload = await session.request(
            AERIAL_KIT_COMMANDS.paramHelp,
            Uint8Array.of(
              parameter.index,
              offset & 0xff,
              (offset >> 8) & 0xff,
            ),
          );
          const slice = parseAerialKitParamHelpSlice(
            payload,
            parameter.index,
            offset,
          );
          if (expectedTotal == null) expectedTotal = slice.total;
          if (slice.total !== expectedTotal) {
            throw new Error(
              `Description for ${parameter.name} changed total length while walking.`,
            );
          }
          chunks.push(...slice.bytes);
          offset += slice.bytes.length;
          if (offset >= expectedTotal) break;
          if (slice.bytes.length === 0) {
            throw new Error(
              `Description for ${parameter.name} stopped before its declared end.`,
            );
          }
        }
        parameter.help = decodeAerialKitText(Uint8Array.from(chunks));
        done += 1;
        setHelpProgress({ done, total });
        setParameterMetadata([...rows]);
      }
      if (!mountedRef.current) return;
      setHelpState("ready");
      setMessage(
        `Read descriptions for ${done} parameter${done === 1 ? "" : "s"} without writing or saving settings.`,
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setParameterMetadata([...rows]);
      setHelpState("error");
      setHelpError(
        `${readError.message} ${done} description${done === 1 ? "" : "s"} were read before the stop.`,
      );
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
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
      parameters,
      parameterMetadata,
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
  const inventoryRows = useMemo(() => {
    const rows = new Map();
    (parameters || []).forEach((parameter) => {
      rows.set(parameter.index, {
        ...parameter,
        name: parameter.name || `Index ${parameter.index}`,
      });
    });
    (parameterMetadata || []).forEach((metadata) => {
      rows.set(metadata.index, {
        ...rows.get(metadata.index),
        ...metadata,
        name: metadata.name || rows.get(metadata.index)?.name || `Index ${metadata.index}`,
        value: metadata.secret
          ? "Secret / redacted"
          : rows.get(metadata.index)?.value,
      });
    });
    return [...rows.values()].sort((left, right) => left.index - right.index);
  }, [parameterMetadata, parameters]);
  const visibleParameters = useMemo(() => {
    const normalizedQuery = parameterQuery.trim().toLowerCase();
    return inventoryRows.filter((parameter) => (
      !normalizedQuery
      || parameter.name.toLowerCase().includes(normalizedQuery)
      || String(parameter.value || "").toLowerCase().includes(normalizedQuery)
      || String(parameter.groupName || "").toLowerCase().includes(normalizedQuery)
      || String(parameter.typeName || "").toLowerCase().includes(normalizedQuery)
      || String(parameter.default || "").toLowerCase().includes(normalizedQuery)
      || String(parameter.unavailable || "").toLowerCase().includes(normalizedQuery)
    ));
  }, [inventoryRows, parameterQuery]);
  const armed = aerialKitArmedState(liveStatus, {
    observedAtMs: lastStatusAt,
    nowMs: clockNow,
    connectionActive: sessionState === "monitoring",
  });
  const rcAgeMs = lastRcAt == null ? null : Math.max(0, clockNow - lastRcAt);
  const canDownload = Boolean(hello || liveStatus || rc);
  const metadataClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_PARAM_INFO) !== 0;
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
            Experimental · explicit port selection · HELLO / STATUS / RC / PARAM_GET
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
              readback, and can read parameter names and values on request. It
              never writes parameters, saves settings, arms, calibrates, tests
              outputs, or flashes firmware. Opening a native-USB port may reset
              the board.
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

            {hello && (
              <section
                className="aerial-kit-parameters"
                aria-label="Observed parameter values"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Parameter inventory</strong>
                  <span>
                    {hello.parameterCount} advertised
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || parameterState === "reading"
                    }
                    onClick={readParameters}
                  >
                    <SlidersHorizontal size={15} aria-hidden="true" />
                    Read parameter values
                  </button>
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || metadataState === "reading"
                      || !metadataClaimed
                    }
                    title={!metadataClaimed
                      ? "The HELLO capability word does not claim PARAM_INFO."
                      : undefined}
                    onClick={readParameterMetadata}
                  >
                    <SlidersHorizontal size={15} aria-hidden="true" />
                    Read ranges/defaults
                  </button>
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || metadataState !== "ready"
                      || helpState === "reading"
                      || !metadataClaimed
                    }
                    title={metadataState !== "ready"
                      ? "Read parameter metadata before requesting descriptions."
                      : undefined}
                    onClick={readParameterHelp}
                  >
                    <SlidersHorizontal size={15} aria-hidden="true" />
                    Read descriptions
                  </button>
                  <span>
                    {parameterState === "reading"
                      ? `Reading ${parameterProgress.read}/${parameterProgress.total}`
                      : parameterState === "ready"
                        ? `${parameters?.length || 0} values read`
                        : parameterState === "error"
                          ? "Read stopped"
                          : "Not read"}
                    {" · "}
                    {metadataState === "reading"
                      ? `metadata ${metadataProgress.read}/${metadataProgress.total}`
                      : metadataState === "ready"
                        ? `${parameterMetadata?.length || 0} metadata rows`
                        : metadataState === "error"
                          ? "metadata stopped"
                          : !metadataClaimed
                            ? "PARAM_INFO not claimed"
                            : "metadata not read"}
                    {" · "}
                    {helpState === "reading"
                      ? `help ${helpProgress.done}/${helpProgress.total}`
                      : helpState === "ready"
                        ? `${parameterMetadata?.filter((parameter) => parameter.help != null).length || 0} descriptions`
                        : helpState === "error"
                          ? "descriptions stopped"
                          : "descriptions not read"}
                  </span>
                </div>
                <p>
                  Values come from `PARAM_GET`; type, group, range, and default
                  come from capability-gated `PARAM_INFO` pages. Descriptions
                  are walked separately through `PARAM_HELP`; nothing is
                  inferred from a local table.
                </p>
                {parameterError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Parameter read incomplete</strong>
                      <small>{parameterError}</small>
                    </span>
                  </div>
                )}
                {metadataError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Parameter metadata incomplete</strong>
                      <small>{metadataError}</small>
                    </span>
                  </div>
                )}
                {helpError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Parameter descriptions incomplete</strong>
                      <small>{helpError}</small>
                    </span>
                  </div>
                )}
                {inventoryRows.length > 0 && (
                  <>
                    <label className="aerial-kit-parameter-search">
                      <Search size={14} aria-hidden="true" />
                      <span className="visually-hidden">
                        Filter observed parameter names or values
                      </span>
                      <input
                        type="search"
                        value={parameterQuery}
                        onChange={(event) => setParameterQuery(event.target.value)}
                        placeholder="Filter names, values, groups, or types"
                      />
                    </label>
                    {visibleParameters.length > 0 ? (
                      <ol
                        className="aerial-kit-parameter-list"
                        aria-label="Observed parameter name and value list"
                      >
                        {visibleParameters.map((parameter) => (
                          <li key={`${parameter.index}-${parameter.name}`}>
                            <span>{parameter.name}</span>
                            <code>
                              {parameter.value == null
                                ? "Value not read"
                                : parameter.value || "Empty"}
                            </code>
                            {(parameter.groupName
                              || parameter.typeName
                              || parameter.min != null
                              || parameter.max != null
                              || parameter.default != null
                              || parameter.unavailable) && (
                              <small>
                                {parameter.unavailable || [
                                  parameter.groupName || `Group ${parameter.group}`,
                                  parameter.typeName || `Type ${parameter.type}`,
                                  parameter.maxLength != null
                                    ? `max ${parameter.maxLength} chars`
                                    : parameter.min != null
                                      ? `${parameter.min} to ${parameter.max}`
                                      : null,
                                  parameter.default != null
                                    ? `default ${parameter.default}`
                                    : null,
                                ].filter(Boolean).join(" · ")}
                              </small>
                            )}
                            {parameter.help != null && (
                              <small className="aerial-kit-parameter-help">
                                {parameter.help || "The board supplied an empty description."}
                              </small>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>
                        {inventoryRows.length === 0
                          ? "The board advertises no parameters."
                          : "No observed parameter matches the current filter."}
                      </p>
                    )}
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
