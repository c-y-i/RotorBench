import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  Cable,
  CircleStop,
  Download,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  SERIAL_CAPTURE_BAUD_RATES,
  formatSerialChunk,
  hasWebSerial,
  serialCaptureErrorMessage,
} from "../utils/webSerialCapture";
import {
  CrsfStreamParser,
  channelCalibrationStatus,
  channelPercent,
  createCrsfObservationEvidence,
  crsfObservationFilename,
  decodeCrsfFrame,
  getCrsfParserDiagnostics,
  summarizeChannelRanges,
  updateChannelRanges,
} from "../utils/crsfCapture";
import SerialAttitudeIndicator from "./SerialAttitudeIndicator";

const statusLabels = {
  idle: "Not connected",
  selecting: "Selecting port",
  "port-selected": "Port selected",
  starting: "Starting capture",
  capturing: "Capturing",
  stopping: "Stopping",
  stopped: "Stopped",
  error: "Capture error",
};

const channelRoleLabels = {
  roll: "Roll",
  pitch: "Pitch",
  throttle: "Throttle",
  yaw: "Yaw",
  flightMode: "Flight mode",
  arm: "Arm",
  velocity: "Velocity",
  beeper: "Beeper",
  manual: "Manual",
  control: "Control mode",
  systemId: "System ID",
};

const frameKindLabels = {
  rc: "RC",
  link: "Link stats",
  attitude: "Attitude",
  battery: "Battery",
  barometer: "Barometer",
  gps: "GPS",
  flightMode: "Flight mode",
  other: "Other valid frames",
};

const calibrationStatusLabels = {
  unobserved: "No samples",
  sampled: "Observed",
  narrow: "Within deadband",
  partial: "Partial range",
  full: "Full planned range",
  outside: "Outside plan",
};

const WebSerialCapture = forwardRef(function WebSerialCapture({
  expectedBaud = 420000,
  role = null,
  targetName = null,
  channelMap = null,
  receiverCalibration = null,
  endpointLabel = null,
  captureSessionId = null,
  syncMode = false,
  onCaptureStateChange = null,
}, ref) {
  const supported = useMemo(() => hasWebSerial(), []);
  const [baudRate, setBaudRate] = useState(expectedBaud);
  const [status, setStatus] = useState(supported ? "idle" : "unsupported");
  const [error, setError] = useState("");
  const [portOpened, setPortOpened] = useState(false);
  const [portSelected, setPortSelected] = useState(false);
  const [capturedBytes, setCapturedBytes] = useState(0);
  const [captureRows, setCaptureRows] = useState([]);
  const [latestChannels, setLatestChannels] = useState(null);
  const [latestLink, setLatestLink] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [crsfDiagnostics, setCrsfDiagnostics] = useState({
    validFrames: 0,
    crcErrors: 0,
    resyncs: 0,
    framingErrors: 0,
    bytesReceived: 0,
    pendingBytes: 0,
    frameTypeCounts: {},
  });
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [lastFrameAt, setLastFrameAt] = useState(null);
  const [lastSeenByType, setLastSeenByType] = useState({});
  const [rcCadenceMs, setRcCadenceMs] = useState(null);
  const [channelRanges, setChannelRanges] = useState([]);
  const [captureStartedAt, setCaptureStartedAt] = useState(null);
  const [captureEndedAt, setCaptureEndedAt] = useState(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const readerRef = useRef(null);
  const portRef = useRef(null);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);
  const parserRef = useRef(null);
  const lastRcAtRef = useRef(null);
  if (!parserRef.current) parserRef.current = new CrsfStreamParser();

  useEffect(() => {
    if (["idle", "stopped", "error", "unsupported"].includes(status)) {
      setBaudRate(expectedBaud);
    }
  }, [expectedBaud, status]);

  useEffect(() => {
    onCaptureStateChange?.(status);
  }, [onCaptureStateChange, status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      readerRef.current?.cancel?.()?.catch?.(() => {});
      portRef.current?.close?.()?.catch?.(() => {});
    };
  }, []);

  useEffect(() => {
    if (status !== "capturing") return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [status]);

  const resetObservationState = () => {
    setError("");
    setEvidenceMessage("");
    setPortOpened(false);
    setPortSelected(false);
    setLastFrameAt(null);
    setLastSeenByType({});
    setRcCadenceMs(null);
    setChannelRanges([]);
    setCaptureStartedAt(null);
    setCaptureEndedAt(null);
    parserRef.current.reset();
    lastRcAtRef.current = null;
    setLatestChannels(null);
    setLatestLink(null);
    setLatestTelemetry(null);
    setCrsfDiagnostics({
      validFrames: 0,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      bytesReceived: 0,
      pendingBytes: 0,
      frameTypeCounts: {},
    });
  };

  const preparePort = async () => {
    if (
      !supported
      || activeRef.current
      || ["selecting", "starting", "capturing", "stopping"].includes(status)
    ) {
      return false;
    }
    resetObservationState();
    setStatus("selecting");
    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      setPortSelected(true);
      setStatus("port-selected");
      return true;
    } catch (selectionError) {
      if (mountedRef.current) {
        setError(serialCaptureErrorMessage(selectionError));
        setStatus("error");
      }
      return false;
    }
  };

  const startPreparedCapture = async () => {
    const port = portRef.current;
    if (!port || activeRef.current) return false;
    setError("");
    setStatus("starting");
    try {
      await port.open({ baudRate });
      setCaptureStartedAt(new Date().toISOString());
      setPortOpened(true);
      const reader = port.readable?.getReader();
      if (!reader) throw new Error("The selected port did not provide a readable stream.");
      portRef.current = port;
      readerRef.current = reader;
      activeRef.current = true;
      setStatus("capturing");

      void (async () => {
        try {
          while (activeRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value?.length || !mountedRef.current) continue;
            const formatted = formatSerialChunk(value);
            const frames = parserRef.current.feed(value);
            let channels = null;
            const channelsInRead = [];
            let link = null;
            let rcFramesInRead = 0;
            const frameSeenAt = Date.now();
            const nextSeenByType = {};
            const telemetryUpdates = {};
            frames.forEach((frame) => {
              const decoded = decodeCrsfFrame(frame);
              if (decoded?.kind === "rc") {
                channels = decoded.channels;
                channelsInRead.push(decoded.channels);
                rcFramesInRead += 1;
              }
              if (decoded?.kind === "link") link = decoded.link;
              if (
                decoded
                && !["rc", "link"].includes(decoded.kind)
              ) {
                telemetryUpdates[decoded.kind] = decoded.telemetry;
              }
              nextSeenByType[decoded?.kind || "other"] = frameSeenAt;
            });
            setCapturedBytes((current) => current + formatted.length);
            setCaptureRows((current) => [
              ...current.slice(-5),
              `${formatted.length} bytes · ${formatted.preview}${formatted.suffix}`,
            ]);
            if (channels) {
              setLatestChannels(channels);
              setChannelRanges((current) => channelsInRead.reduce(
                (ranges, channelValues) => updateChannelRanges(ranges, channelValues),
                current,
              ));
            }
            if (rcFramesInRead === 1) {
              if (lastRcAtRef.current != null) {
                const interval = frameSeenAt - lastRcAtRef.current;
                setRcCadenceMs(interval > 0 ? interval : null);
              }
              lastRcAtRef.current = frameSeenAt;
            } else if (rcFramesInRead > 1) {
              // Multiple frames in one read do not carry per-frame arrival time.
              setRcCadenceMs(null);
              lastRcAtRef.current = frameSeenAt;
            }
            if (link) setLatestLink(link);
            if (frames.length) {
              setLastFrameAt(frameSeenAt);
              setLastSeenByType((current) => ({
                ...current,
                ...nextSeenByType,
              }));
            }
            if (Object.keys(telemetryUpdates).length) {
              setLatestTelemetry((current) => ({
                ...(current || {}),
                ...telemetryUpdates,
              }));
            }
            setCrsfDiagnostics(getCrsfParserDiagnostics(parserRef.current));
          }
        } catch (readError) {
          if (activeRef.current && mountedRef.current) {
            setError(serialCaptureErrorMessage(readError));
            setStatus("error");
          }
        } finally {
          activeRef.current = false;
          try {
            reader.releaseLock();
          } catch {
            // The stream may already have released the lock after disconnect.
          }
          try {
            await port.close();
          } catch {
            // A disconnected port is already closed.
          }
          if (readerRef.current === reader) readerRef.current = null;
          if (portRef.current === port) portRef.current = null;
          if (mountedRef.current) {
            setCaptureEndedAt(new Date().toISOString());
            setPortSelected(false);
            setStatus((current) => current === "error" ? current : "stopped");
          }
        }
      })();
      return true;
    } catch (openError) {
      activeRef.current = false;
      try {
        await port.close?.();
      } catch {
        // Ignore cleanup failure after an open failure.
      }
      if (mountedRef.current) {
        setCaptureEndedAt(new Date().toISOString());
        setPortSelected(false);
        setError(serialCaptureErrorMessage(openError));
        setStatus("error");
      }
      if (portRef.current === port) portRef.current = null;
      return false;
    }
  };

  const openPort = async () => {
    const prepared = await preparePort();
    return prepared ? startPreparedCapture() : false;
  };

  const stopPort = async () => {
    if (!activeRef.current) return false;
    setStatus("stopping");
    activeRef.current = false;
    try {
      await readerRef.current?.cancel?.();
    } catch {
      // The read loop will close the port in its cleanup path.
    }
    return true;
  };

  useImperativeHandle(ref, () => ({
    preparePort,
    startCapture: startPreparedCapture,
    stopCapture: stopPort,
  }));

  const clearCapture = () => {
    parserRef.current.reset();
    setCapturedBytes(0);
    setCaptureRows([]);
    setLatestChannels(null);
    setLatestLink(null);
    setLatestTelemetry(null);
    setLastFrameAt(null);
    setLastSeenByType({});
    setRcCadenceMs(null);
    setChannelRanges([]);
    setCaptureStartedAt(null);
    setCaptureEndedAt(null);
    lastRcAtRef.current = null;
    setCrsfDiagnostics({
      validFrames: 0,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      bytesReceived: 0,
      pendingBytes: 0,
      frameTypeCounts: {},
    });
    setError("");
    setEvidenceMessage("");
  };

  const downloadEvidence = () => {
    const frameAgeMs = lastFrameAt
      ? Math.max(0, Date.now() - lastFrameAt)
      : null;
    const evidence = createCrsfObservationEvidence({
      baudRate,
      expectedBaud,
      diagnostics: crsfDiagnostics,
      channels: latestChannels,
      link: latestLink,
      telemetry: latestTelemetry,
      lastFrameAgeMs: frameAgeMs,
      lastFrameObservedAt: lastFrameAt
        ? new Date(lastFrameAt).toISOString()
        : null,
      rcCadenceMs,
      captureStatus: status,
      capturedBytes,
      captureStartedAt,
      captureEndedAt,
      role,
      targetName,
      channelMap,
      channelRanges,
      receiverCalibration,
      captureSessionId,
    });
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = crsfObservationFilename();
    link.click();
    URL.revokeObjectURL(url);
    setEvidenceMessage(
      "Evidence exported without raw bytes, port identity, binding material, or an RF claim.",
    );
  };

  const frameAgeMs = lastFrameAt
    ? Math.max(0, clockNow - lastFrameAt)
    : null;
  const frameAgeStale = frameAgeMs != null && frameAgeMs > 2000;
  const evidenceStages = [
    {
      id: "port",
      label: portOpened
        ? "Port opened"
        : portSelected ? "Port selected" : "Port not selected",
      state: portOpened ? "complete" : "pending",
    },
    {
      id: "frames",
      label: crsfDiagnostics.validFrames ? "Valid CRSF frames" : "Awaiting valid frames",
      state: crsfDiagnostics.validFrames ? "complete" : "pending",
    },
    {
      id: "rc",
      label: latestChannels ? "RC observed" : "RC not observed",
      state: latestChannels ? "complete" : "pending",
    },
    {
      id: "link",
      label: latestLink ? "Link stats observed" : "Link stats not observed",
      state: latestLink ? "complete" : "pending",
    },
    {
      id: "telemetry",
      label: latestTelemetry ? "Telemetry observed" : "Telemetry not observed",
      state: latestTelemetry ? "complete" : "pending",
    },
    {
      id: "rf",
      label: "RF path not verified",
      state: "unverified",
    },
  ];
  const channelLabelsByNumber = useMemo(() => {
    const labels = {};
    Object.entries(channelMap || {}).forEach(([roleKey, channel]) => {
      if (!Number.isInteger(channel)) return;
      const label = channelRoleLabels[roleKey];
      if (!label) return;
      labels[channel] = labels[channel] ? `${labels[channel]} + ${label}` : label;
    });
    return labels;
  }, [channelMap]);
  const lastSeenEntries = Object.entries(lastSeenByType)
    .map(([kind, timestamp]) => ({
      kind,
      ageMs: Math.max(0, clockNow - timestamp),
      count: crsfDiagnostics.frameTypeCounts?.[kind] || 0,
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
  const canDownloadEvidence = capturedBytes > 0
    || ["stopped", "error"].includes(status);
  const expectedBaudMismatch = expectedBaud && expectedBaud !== baudRate;
  const calibrationSummary = useMemo(
    () => summarizeChannelRanges(channelRanges, receiverCalibration),
    [channelRanges, receiverCalibration],
  );
  const calibrationMin = Number(receiverCalibration?.min) || 172;
  const calibrationMid = Number(receiverCalibration?.mid) || 992;
  const calibrationMax = Number(receiverCalibration?.max) || 1811;
  const calibrationDeadband = Number(receiverCalibration?.deadband);
  const deadbandSpan = Number.isFinite(calibrationDeadband)
    ? (calibrationMax - calibrationMin) * calibrationDeadband
    : 0;

  return (
    <details className="serial-capture">
      <summary>
        <Cable size={19} aria-hidden="true" />
        <span>
          <strong>Live serial capture</strong>
          <small>
            {endpointLabel ? `${endpointLabel} · ` : ""}
            Experimental · explicit port selection · no writes
          </small>
        </span>
        <em>Read-only</em>
      </summary>

      <div className="serial-capture-body">
        <div className="serial-capture-boundary">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Receive-only CRSF observation</strong>
            <p>
              This view never writes commands, flashes, arms, or changes a device.
              It decodes observed RC and link-statistics frames locally, but cannot
              prove that those bytes crossed RF. Opening a native-USB port may reset
              the board.
            </p>
          </div>
        </div>

        {!supported ? (
          <div className="serial-capture-unsupported">
            <RadioTower size={20} aria-hidden="true" />
            <div>
              <strong>Web Serial is unavailable</strong>
              <p>Use a Chromium desktop browser over HTTPS or localhost.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="serial-capture-controls">
              <label>
                Logical baud
                <select
                  value={baudRate}
                  disabled={["starting", "capturing", "stopping"].includes(status)}
                  onChange={(event) => setBaudRate(Number(event.target.value))}
                >
                  {SERIAL_CAPTURE_BAUD_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>{rate.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="serial-capture-start"
                disabled={
                  portSelected
                  || ["selecting", "starting", "capturing", "stopping"]
                    .includes(status)
                }
                onClick={openPort}
              >
                <RadioTower size={15} aria-hidden="true" />
                {syncMode
                  ? portSelected ? "Port selected" : "Select port"
                  : "Open port"}
              </button>
              {!syncMode && (
                <button
                  type="button"
                  disabled={status !== "capturing"}
                  onClick={stopPort}
                >
                  <CircleStop size={15} aria-hidden="true" />
                  Stop capture
                </button>
              )}
              <button
                type="button"
                disabled={captureRows.length === 0}
                onClick={clearCapture}
              >
                Clear bytes
              </button>
              <button
                type="button"
                disabled={!canDownloadEvidence}
                onClick={downloadEvidence}
              >
                <Download size={15} aria-hidden="true" />
                Download evidence
              </button>
            </div>
            {expectedBaudMismatch && (
              <p className="serial-crsf-empty">
                Plan expects {expectedBaud} baud; this capture will open at {baudRate}.
                Change the selector if that is not the path being observed.
              </p>
            )}

            <div className="serial-capture-state" aria-live="polite">
              <span className={`is-${status}`}>
                <Activity size={14} aria-hidden="true" />
                {statusLabels[status] || status}
              </span>
              <span>{capturedBytes} bytes received</span>
            </div>
            <p className="serial-crsf-age">
              Plan context: {role ? role.toUpperCase() : "role not supplied"}
              {targetName ? ` · ${targetName}` : ""}
              {" · "}plan expects {expectedBaud} baud
            </p>
            {frameAgeMs != null && (
              <p
                className={`serial-crsf-age ${frameAgeStale ? "is-stale" : ""}`}
                aria-live="off"
              >
                {frameAgeStale ? "No new valid frame for " : "Last valid frame "}
                {(frameAgeMs / 1000).toFixed(1)} s ago
              </p>
            )}

            <pre
              tabIndex={0}
              role="region"
              aria-label="Captured raw serial bytes"
            >
              {captureRows.length
                ? captureRows.join("\n")
                : "No bytes captured. Port selection is always explicit."}
            </pre>

            <section className="serial-crsf-observation" aria-label="Decoded CRSF observation">
              <div className="serial-crsf-heading">
                <div>
                  <strong>CRSF observation</strong>
                  <span>Decoded locally from the bytes above</span>
                </div>
                <span>
                  {crsfDiagnostics.validFrames} valid
                  {crsfDiagnostics.crcErrors ? ` · ${crsfDiagnostics.crcErrors} CRC errors` : " · 0 CRC errors"}
                </span>
              </div>

              <div className="serial-armed-state">
                <ShieldAlert size={17} aria-hidden="true" />
                <span>
                  <strong>Armed state unknown</strong>
                  <small>
                    Read-only CRSF capture cannot prove the aircraft is disarmed.
                    Keep props off and treat arming state as unknown.
                  </small>
                </span>
              </div>

              <ul
                className="serial-crsf-evidence-ladder"
                aria-label="CRSF observation evidence stages"
              >
                {evidenceStages.map((stage) => (
                  <li key={stage.id} className={`is-${stage.state}`}>
                    <span aria-hidden="true" />
                    {stage.label}
                  </li>
                ))}
              </ul>

              <div
                className="serial-crsf-telemetry"
                role="region"
                aria-label="CRSF parser health"
              >
                <h4>Parser health</h4>
                <dl>
                  <div><dt>Bytes received</dt><dd>{crsfDiagnostics.bytesReceived}</dd></div>
                  <div><dt>Valid frames</dt><dd>{crsfDiagnostics.validFrames}</dd></div>
                  <div><dt>CRC errors</dt><dd>{crsfDiagnostics.crcErrors}</dd></div>
                  <div><dt>Resyncs</dt><dd>{crsfDiagnostics.resyncs}</dd></div>
                  <div><dt>Framing errors</dt><dd>{crsfDiagnostics.framingErrors}</dd></div>
                  <div><dt>Pending bytes</dt><dd>{crsfDiagnostics.pendingBytes}</dd></div>
                  <div>
                    <dt>RC read cadence</dt>
                    <dd>
                      {rcCadenceMs == null
                        ? "Not resolved"
                        : `${Math.round(rcCadenceMs)} ms / ${(1000 / rcCadenceMs).toFixed(1)} Hz`}
                    </dd>
                  </div>
                </dl>
              </div>

              {lastSeenEntries.length > 0 && (
                <div
                  className="serial-crsf-link"
                  role="region"
                  aria-label="Observed CRSF frame types"
                >
                  <h4>Frame types observed</h4>
                  <dl>
                    {lastSeenEntries.map(({ kind, ageMs, count }) => (
                      <div key={kind}>
                        <dt>{frameKindLabels[kind] || kind}</dt>
                        <dd>{count} · {(ageMs / 1000).toFixed(1)} s ago</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {!latestChannels && !latestLink && (
                <p className="serial-crsf-empty">
                  No valid RC or link-statistics frame has been observed on this port.
                </p>
              )}

              {latestChannels && (
                <div className="serial-crsf-channels">
                  <div className="serial-crsf-channel-heading">
                    <h4>RC channels and observed range</h4>
                    {receiverCalibration && (
                      <span>
                        Planned {calibrationMin} / {calibrationMid} / {calibrationMax}
                        {Number.isFinite(calibrationDeadband)
                          ? ` · ${(calibrationDeadband * 100).toFixed(1)}% deadband`
                          : ""}
                      </span>
                    )}
                  </div>
                  <div
                    className="serial-crsf-calibration-summary"
                    role="region"
                    aria-label="Receiver calibration observation"
                  >
                    <dl>
                      <div><dt>Sampled</dt><dd>{calibrationSummary.sampled}/16</dd></div>
                      <div><dt>Full range</dt><dd>{calibrationSummary.full}</dd></div>
                      <div><dt>Partial</dt><dd>{calibrationSummary.partial}</dd></div>
                      <div><dt>Narrow</dt><dd>{calibrationSummary.narrow}</dd></div>
                      <div><dt>Outside</dt><dd>{calibrationSummary.outside}</dd></div>
                    </dl>
                    <p>
                      Extrema are read-only observations. RotorBench does not apply
                      calibration values or write them to the controller.
                    </p>
                  </div>
                  <ol>
                    {latestChannels.map((value, index) => {
                      const stats = channelRanges[index];
                      const rangeStatus = channelCalibrationStatus(
                        stats,
                        receiverCalibration,
                      );
                      const rangeText = stats
                        ? `${stats.min}–${stats.max}`
                        : "No range";
                      return (
                        <li
                          key={`channel-${index + 1}`}
                          className={`is-${rangeStatus}`}
                          aria-label={`${channelLabelsByNumber[index + 1]
                            ? `${channelLabelsByNumber[index + 1]} channel ${index + 1}`
                            : `Channel ${index + 1}`} raw ${value}, observed ${rangeText}, ${calibrationStatusLabels[rangeStatus]}`}
                        >
                          <span>
                            {channelLabelsByNumber[index + 1]
                              ? `${channelLabelsByNumber[index + 1]} · CH ${index + 1}`
                              : `CH ${index + 1}`}
                          </span>
                          <strong>{value}</strong>
                          <em className={`is-${rangeStatus}`}>
                            {calibrationStatusLabels[rangeStatus]} · {rangeText}
                          </em>
                          <meter
                            min={calibrationMin}
                            max={calibrationMax}
                            low={calibrationMid - deadbandSpan}
                            high={calibrationMid + deadbandSpan}
                            optimum={calibrationMid}
                            value={value}
                            aria-label={`Channel ${index + 1} protocol position ${channelPercent(value).toFixed(0)} percent`}
                          />
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {latestTelemetry && (
                <div className="serial-crsf-telemetry">
                  <h4>Telemetry observed</h4>
                  {latestTelemetry.attitude && (
                    <SerialAttitudeIndicator
                      rollRad={latestTelemetry.attitude.rollRad}
                      pitchRad={latestTelemetry.attitude.pitchRad}
                      yawRad={latestTelemetry.attitude.yawRad}
                    />
                  )}
                  <dl>
                    {latestTelemetry.flightMode && (
                      <div><dt>Flight mode</dt><dd>{latestTelemetry.flightMode.mode}</dd></div>
                    )}
                    {latestTelemetry.battery && (
                      <>
                        <div><dt>Battery</dt><dd>{latestTelemetry.battery.voltageV.toFixed(1)} V · {latestTelemetry.battery.currentA.toFixed(1)} A</dd></div>
                        <div><dt>Battery remaining</dt><dd>{latestTelemetry.battery.remainingPercent}% · {latestTelemetry.battery.capacityMah} mAh</dd></div>
                      </>
                    )}
                    {latestTelemetry.barometer && (
                      <div><dt>Barometer</dt><dd>{latestTelemetry.barometer.altitudeM.toFixed(1)} m · {latestTelemetry.barometer.verticalSpeedMps.toFixed(1)} m/s</dd></div>
                    )}
                    {latestTelemetry.gps && (
                      <div>
                        <dt>GPS</dt>
                        <dd>
                          {latestTelemetry.gps.satellites} sats · {latestTelemetry.gps.groundspeedMps.toFixed(1)} m/s
                          {" · "}{latestTelemetry.gps.latitudeDeg.toFixed(5)}, {latestTelemetry.gps.longitudeDeg.toFixed(5)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {latestLink && (
                <div className="serial-crsf-link">
                  <h4>Link statistics observed</h4>
                  <dl>
                    <div><dt>Uplink LQ</dt><dd>{latestLink.uplinkLinkQuality}%</dd></div>
                    <div><dt>Uplink RSSI 1</dt><dd>{latestLink.uplinkRssi1Dbm} dBm</dd></div>
                    <div><dt>Uplink RSSI 2</dt><dd>{latestLink.uplinkRssi2Dbm} dBm</dd></div>
                    <div><dt>Uplink SNR</dt><dd>{latestLink.uplinkSnrDb} dB</dd></div>
                    <div><dt>Downlink LQ</dt><dd>{latestLink.downlinkLinkQuality}%</dd></div>
                    <div><dt>Downlink RSSI</dt><dd>{latestLink.downlinkRssiDbm} dBm</dd></div>
                    <div><dt>Downlink SNR</dt><dd>{latestLink.downlinkSnrDb} dB</dd></div>
                    <div><dt>Raw RF fields</dt><dd>Ant {latestLink.activeAntenna} · mode {latestLink.rfMode} · power {latestLink.uplinkTxPowerRaw}</dd></div>
                  </dl>
                </div>
              )}

              <p className="serial-crsf-boundary">
                Observation only. Serial traffic, valid CRSF frames, and link statistics
                do not by themselves prove the intended TX-to-RX RF path.
              </p>
            </section>
            {evidenceMessage && (
              <p className="serial-capture-evidence-message" role="status">
                {evidenceMessage}
              </p>
            )}
            {error && <p className="serial-capture-error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </details>
  );
});

export default WebSerialCapture;
