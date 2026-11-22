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
  AERIAL_KIT_FEATURE_SENSOR_INFO,
  AERIAL_KIT_FEATURE_OUTPUT_INFO,
  AERIAL_KIT_FEATURE_PREFLIGHT,
  AERIAL_KIT_FEATURE_CALIBRATE,
  AERIAL_KIT_FEATURE_MISSION,
  AERIAL_KIT_FEATURE_PERF,
  AERIAL_KIT_FEATURE_MOTOR_TELEMETRY,
  AERIAL_KIT_FEATURE_LOG_STREAM,
  AERIAL_KIT_LOG_STREAM_MAX_HZ,
  AERIAL_KIT_FLIGHT_STATES,
  AERIAL_KIT_TELEMETRY_MAX_HZ,
  AERIAL_KIT_PARAMETER_READ_LIMIT,
  AERIAL_KIT_SENSOR_TOPICS,
  AerialKitReadOnlySession,
  aerialKitArmedState,
  createAerialKitStatusEvidence,
  decodeAerialKitText,
  parseAerialKitHello,
  parseAerialKitParamHelpSlice,
  parseAerialKitParamGet,
  parseAerialKitParamInfoPage,
  parseAerialKitLogSource,
  parseAerialKitLogStreamReply,
  parseAerialKitMotorTelemetry,
  parseAerialKitCalibrationStatus,
  parseAerialKitMissionStatus,
  parseAerialKitPerf,
  parseAerialKitPreflightPage,
  parseAerialKitSensorInfo,
  parseAerialKitTelemetryRate,
  parseAerialKitOutputInfo,
  parseAerialKitRcChannels,
  parseAerialKitStatus,
} from "../utils/aerialKitProtocol";
import {
  SERIAL_CAPTURE_BAUD_RATES,
  hasWebSerial,
  serialCaptureErrorMessage,
} from "../utils/webSerialCapture";
import {
  createAerialKitLogExport,
  serializeAerialKitLogCsv,
} from "../utils/aerialKitLogExport";
import {
  buildAerialKitRouteSummary,
  buildAerialKitMissionProximity,
  buildAerialKitWaypointInventory,
} from "../utils/aerialKitWaypoints";
import AerialKitSensorReadings from "./AerialKitSensorReadings";
import AerialKitPerformanceReadings from "./AerialKitPerformanceReadings";
import AerialKitMotorTelemetryReadings from "./AerialKitMotorTelemetryReadings";
import AerialKitLogReadings from "./AerialKitLogReadings";
import AerialKitWaypointRouteSummary from "./AerialKitWaypointRouteSummary";
import AerialKitRouteSketch from "./AerialKitRouteSketch";
import AerialKitMissionProximity from "./AerialKitMissionProximity";

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

const LOG_SOURCE_LABELS = [
  "Fast ring",
  "Long ring",
  "Flash log",
];

const LOG_SAMPLE_LIMIT = 8;

function hexWord(value) {
  return value == null
    ? "Absent"
    : `0x${value.toString(16).padStart(8, "0")}`;
}

function pageStatusName(verdict) {
  return ["fail", "pass", "fact"][verdict] || "unknown";
}

function pageStatusLabel(verdict) {
  return ["Fail", "Pass", "Reading"][verdict] || "Unknown";
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
  const [sensors, setSensors] = useState(null);
  const [sensorState, setSensorState] = useState("idle");
  const [sensorProgress, setSensorProgress] = useState({ done: 0, total: 5 });
  const [sensorError, setSensorError] = useState("");
  const [outputInfo, setOutputInfo] = useState(null);
  const [outputState, setOutputState] = useState("idle");
  const [outputError, setOutputError] = useState("");
  const [preflight, setPreflight] = useState(null);
  const [preflightState, setPreflightState] = useState("idle");
  const [preflightError, setPreflightError] = useState("");
  const [performance, setPerformance] = useState(null);
  const [perfState, setPerfState] = useState("idle");
  const [perfError, setPerfError] = useState("");
  const [motorTelemetry, setMotorTelemetry] = useState(null);
  const [motorState, setMotorState] = useState("idle");
  const [motorError, setMotorError] = useState("");
  const [logInventory, setLogInventory] = useState(null);
  const [logSource, setLogSource] = useState(0);
  const [logState, setLogState] = useState("idle");
  const [logError, setLogError] = useState("");
  const [logSample, setLogSample] = useState(null);
  const [telemetryRequestedHz, setTelemetryRequestedHz] = useState(20);
  const [telemetryState, setTelemetryState] = useState("idle");
  const [telemetryError, setTelemetryError] = useState("");
  const [telemetryStream, setTelemetryStream] = useState(null);
  const [mission, setMission] = useState(null);
  const [missionState, setMissionState] = useState("idle");
  const [missionError, setMissionError] = useState("");
  const [calibration, setCalibration] = useState(null);
  const [calibrationState, setCalibrationState] = useState("idle");
  const [calibrationError, setCalibrationError] = useState("");
  const [waypointInventory, setWaypointInventory] = useState(null);
  const [waypointState, setWaypointState] = useState("idle");
  const [waypointError, setWaypointError] = useState("");
  const [waypointProgress, setWaypointProgress] = useState({
    read: 0,
    total: 0,
  });
  const mountedRef = useRef(true);
  const activeRef = useRef(false);
  const pollBusyRef = useRef(false);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const sessionRef = useRef(null);
  const pollTimerRef = useRef(null);
  const observationRef = useRef(null);
  const logCollectorRef = useRef(null);
  const telemetryStreamingRef = useRef(false);

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
    setSensors(null);
    setSensorState("idle");
    setSensorProgress({ done: 0, total: AERIAL_KIT_SENSOR_TOPICS.length });
    setSensorError("");
    setOutputInfo(null);
    setOutputState("idle");
    setOutputError("");
    setPreflight(null);
    setPreflightState("idle");
    setPreflightError("");
    setPerformance(null);
    setPerfState("idle");
    setPerfError("");
    setMotorTelemetry(null);
    setMotorState("idle");
    setMotorError("");
    setLogInventory(null);
    setLogSource(0);
    setLogState("idle");
    setLogError("");
    setLogSample(null);
    logCollectorRef.current = null;
    setTelemetryRequestedHz(20);
    setTelemetryState("idle");
    setTelemetryError("");
    setTelemetryStream(null);
    telemetryStreamingRef.current = false;
    setMission(null);
    setMissionState("idle");
    setMissionError("");
    setCalibration(null);
    setCalibrationState("idle");
    setCalibrationError("");
    setWaypointInventory(null);
    setWaypointState("idle");
    setWaypointError("");
    setWaypointProgress({ read: 0, total: 0 });
    observationRef.current = null;
    onObservation?.(null);
  };

  const closeSession = useCallback(async (nextState = "stopped") => {
    activeRef.current = false;
    logCollectorRef.current = null;
    if (telemetryStreamingRef.current && sessionRef.current?.active) {
      try {
        await sessionRef.current.request(
          AERIAL_KIT_COMMANDS.telemetry,
          Uint8Array.of(0),
        );
      } catch {
        // Closing the port still ends the transport even if the stop reply is lost.
      }
    }
    telemetryStreamingRef.current = false;
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

  const handleTelemetryFrame = (frame) => {
    if (!telemetryStreamingRef.current || !mountedRef.current) return;
    const observedAtMs = Date.now();
    setTelemetryStream((current) => {
      if (!current) return current;
      let uptimeWraps = current.uptimeWraps || 0;
      let uptimeRegressions = current.uptimeRegressions || 0;
      if (current.lastUptimeMs != null && frame.uptimeMs < current.lastUptimeMs) {
        if (current.lastUptimeMs - frame.uptimeMs > 0x80000000) uptimeWraps += 1;
        else uptimeRegressions += 1;
      }
      const firstUptimeMs = current.firstUptimeMs ?? frame.uptimeMs;
      return {
        ...current,
        frameCount: current.frameCount + 1,
        firstUptimeMs,
        lastUptimeMs: frame.uptimeMs,
        uptimeElapsedMs: frame.uptimeMs
          + uptimeWraps * 0x100000000
          - firstUptimeMs,
        uptimeWraps,
        uptimeRegressions,
        lastObservedAtMs: observedAtMs,
        latest: frame,
      };
    });
  };

  const startTelemetry = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session || telemetryStreamingRef.current) return;
    if (pollBusyRef.current) {
      setTelemetryError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setTelemetryError("");
    setTelemetryState("subscribing");
    telemetryStreamingRef.current = true;
    setTelemetryStream({
      requestedHz: telemetryRequestedHz,
      agreedHz: null,
      frameCount: 0,
      firstUptimeMs: null,
      lastUptimeMs: null,
      uptimeElapsedMs: null,
      uptimeWraps: 0,
      uptimeRegressions: 0,
      startedAtMs: Date.now(),
      stoppedAtMs: null,
      lastObservedAtMs: null,
      latest: null,
    });
    let agreedHz = 0;
    try {
      agreedHz = parseAerialKitTelemetryRate(
        await session.request(
          AERIAL_KIT_COMMANDS.telemetry,
          Uint8Array.of(telemetryRequestedHz),
        ),
      );
      if (!mountedRef.current) return;
      if (agreedHz === 0) {
        telemetryStreamingRef.current = false;
        setTelemetryStream({
          requestedHz: telemetryRequestedHz,
          agreedHz: 0,
          frameCount: 0,
          firstUptimeMs: null,
          lastUptimeMs: null,
          uptimeElapsedMs: null,
          uptimeWraps: 0,
          uptimeRegressions: 0,
          startedAtMs: null,
          stoppedAtMs: null,
          lastObservedAtMs: null,
          latest: null,
        });
        setTelemetryState("unavailable");
        setMessage(
          "The board declined the telemetry stream with 0 Hz; no pushed frames are expected.",
        );
        return;
      }
      setTelemetryStream((current) => current && ({
        ...current,
        requestedHz: telemetryRequestedHz,
        agreedHz,
        startedAtMs: current.startedAtMs ?? Date.now(),
      }));
      setTelemetryState("streaming");
      setMessage(
        `The board agreed to ${agreedHz} Hz pushed telemetry; STATUS/RC polling is paused while the stream runs.`,
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      telemetryStreamingRef.current = false;
      setTelemetryState("error");
      setTelemetryError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (!telemetryStreamingRef.current && activeRef.current) {
        schedulePoll(session, hello);
      }
    }
  };

  const stopTelemetry = async () => {
    const session = sessionRef.current;
    if (!session || !telemetryStreamingRef.current) return;
    if (pollBusyRef.current) {
      setTelemetryError("Wait for the current request to finish before stopping telemetry.");
      return;
    }
    pollBusyRef.current = true;
    setTelemetryState("stopping");
    setTelemetryError("");
    try {
      const agreedHz = parseAerialKitTelemetryRate(
        await session.request(
          AERIAL_KIT_COMMANDS.telemetry,
          Uint8Array.of(0),
        ),
      );
      if (agreedHz !== 0) {
        throw new Error(`The board answered ${agreedHz} Hz to a stop request.`);
      }
      setTelemetryState("stopped");
      setMessage("Telemetry stream stopped and STATUS/RC polling resumed.");
    } catch (readError) {
      if (!mountedRef.current) return;
      setTelemetryState("error");
      setTelemetryError(readError.message);
    } finally {
      telemetryStreamingRef.current = false;
      setTelemetryStream((current) => current && ({
        ...current,
        stoppedAtMs: Date.now(),
      }));
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readMissionStatus = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_MISSION) === 0
    ) {
      setMissionError(
        "The HELLO capability word does not claim MISSION, so RotorBench did not ask for mission status.",
      );
      setMissionState("error");
      return;
    }
    if (pollBusyRef.current) {
      setMissionError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setMissionError("");
    setMissionState("reading");
    try {
      const status = parseAerialKitMissionStatus(
        await session.request(
          AERIAL_KIT_COMMANDS.mission,
          Uint8Array.of(0),
        ),
      );
      if (!mountedRef.current) return;
      setMission({
        ...status,
        observedAtMs: Date.now(),
      });
      setMissionState("ready");
      setMessage(
        "Read mission status only. RotorBench did not request start, stop, home set, home clear, or a waypoint upload.",
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setMissionState("error");
      setMissionError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readCalibrationStatus = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_CALIBRATE) === 0
    ) {
      setCalibrationError(
        "The HELLO capability word does not claim CALIBRATE, so RotorBench did not ask for calibration status.",
      );
      setCalibrationState("error");
      return;
    }
    if (pollBusyRef.current) {
      setCalibrationError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setCalibrationError("");
    setCalibrationState("reading");
    try {
      const status = parseAerialKitCalibrationStatus(
        await session.request(
          AERIAL_KIT_COMMANDS.calibrate,
          Uint8Array.of(0),
        ),
      );
      if (!mountedRef.current) return;
      setCalibration({
        ...status,
        observedAtMs: Date.now(),
      });
      setCalibrationState("ready");
      setMessage(
        "Read calibration-session status only. No calibration or abort verb was sent.",
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setCalibrationState("error");
      setCalibrationError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readWaypointInventory = async () => {
    const session = sessionRef.current;
    const count = hello?.parameterCount;
    if (!activeRef.current || !session) return;
    if (
      !Number.isInteger(count)
      || count < 0
      || count > AERIAL_KIT_PARAMETER_READ_LIMIT
    ) {
      setWaypointError(
        `HELLO reports ${count ?? "an invalid"} parameters; this reader is bounded to ${AERIAL_KIT_PARAMETER_READ_LIMIT}.`,
      );
      setWaypointState("error");
      return;
    }
    if (pollBusyRef.current) {
      setWaypointError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setWaypointError("");
    setWaypointState("reading");
    setWaypointProgress({ read: 0, total: count });
    const read = [];
    try {
      for (let index = 0; index < count; index += 1) {
        if (!activeRef.current) break;
        read.push(parseAerialKitParamGet(
          await session.request(
            AERIAL_KIT_COMMANDS.paramGet,
            Uint8Array.of(index),
          ),
          index,
        ));
        setWaypointProgress({ read: index + 1, total: count });
      }
      if (!mountedRef.current) return;
      const inventory = buildAerialKitWaypointInventory(read);
      setParameters(read);
      setParameterState("ready");
      setParameterProgress({ read: read.length, total: count });
      setWaypointInventory({
        ...inventory,
        observedAtMs: Date.now(),
      });
      setWaypointState("ready");
      setMessage(
        inventory.status === "ok"
          ? `Read ${inventory.count} configured waypoint${inventory.count === 1 ? "" : "s"} from the board parameter table without uploading or changing a point.`
          : "Read the waypoint parameters, but the inventory is incomplete or unavailable. RotorBench did not repair it.",
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setParameters(read);
      setWaypointState("error");
      setWaypointError(
        `${readError.message} ${read.length} parameter${read.length === 1 ? "" : "s"} were read before the stop.`,
      );
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
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

  const readSensorMetadata = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_SENSOR_INFO) === 0
    ) {
      setSensorError(
        "The HELLO capability word does not claim SENSOR_INFO, so RotorBench did not ask for sensor presence.",
      );
      setSensorState("error");
      return;
    }
    if (pollBusyRef.current) {
      setSensorError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setSensorError("");
    setSensorState("reading");
    const answers = [];
    try {
      for (let index = 0; index < AERIAL_KIT_SENSOR_TOPICS.length; index += 1) {
        const topic = AERIAL_KIT_SENSOR_TOPICS[index];
        const payload = await session.request(
          AERIAL_KIT_COMMANDS.sensorInfo,
          Uint8Array.of(topic.id),
        );
        answers.push(parseAerialKitSensorInfo(payload));
        setSensorProgress({
          done: index + 1,
          total: AERIAL_KIT_SENSOR_TOPICS.length,
        });
      }
      if (!mountedRef.current) return;
      setSensors(answers);
      setSensorState("ready");
      setMessage("Read sensor presence metadata without changing calibration or readings.");
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setSensors(answers);
      setSensorState("error");
      setSensorError(
        `${readError.message} ${answers.length} sensor topic${answers.length === 1 ? "" : "s"} were read before the stop.`,
      );
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readOutputMetadata = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_OUTPUT_INFO) === 0
    ) {
      setOutputError(
        "The HELLO capability word does not claim OUTPUT_INFO, so RotorBench did not ask for the output map.",
      );
      setOutputState("error");
      return;
    }
    if (pollBusyRef.current) {
      setOutputError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setOutputError("");
    setOutputState("reading");
    try {
      const payload = await session.request(AERIAL_KIT_COMMANDS.outputInfo);
      if (!mountedRef.current) return;
      setOutputInfo(parseAerialKitOutputInfo(payload));
      setOutputState("ready");
      setMessage("Read output descriptors without driving or testing any output.");
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setOutputState("error");
      setOutputError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readPreflight = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_PREFLIGHT) === 0
    ) {
      setPreflightError(
        "The HELLO capability word does not claim PREFLIGHT, so RotorBench did not ask for the board checklist.",
      );
      setPreflightState("error");
      return;
    }
    if (pollBusyRef.current) {
      setPreflightError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setPreflightError("");
    setPreflightState("reading");
    try {
      const first = parseAerialKitPreflightPage(
        await session.request(
          AERIAL_KIT_COMMANDS.preflight,
          Uint8Array.of(0, 0, 0),
        ),
        0,
        0,
      );
      if (first.status === "none") {
        setPreflight({
          protocol: "akp",
          status: "none",
          count: 0,
          lines: [],
          passCount: 0,
          failCount: 0,
          factCount: 0,
          observedAtMs: Date.now(),
        });
        setPreflightState("ready");
        setMessage("The board reports no preflight checklist. That is not a passing checklist.");
        setProtocolStats({ ...session.stats });
        return;
      }
      if (first.status !== "ok") {
        throw new Error("The board refused line 0 of its checklist.");
      }
      const lines = [];
      for (let index = 0; index < first.count; index += 1) {
        let offset = 0;
        let expectedTotal = null;
        let verdict = null;
        let name = null;
        let detail = "";
        while (true) {
          const page = parseAerialKitPreflightPage(
            await session.request(
              AERIAL_KIT_COMMANDS.preflight,
              Uint8Array.of(
                index,
                offset & 0xff,
                (offset >> 8) & 0xff,
              ),
            ),
            index,
            offset,
          );
          if (page.status !== "ok") {
            throw new Error(
              `The board stopped serving preflight line ${index + 1} of ${first.count}.`,
            );
          }
          if (page.count !== first.count) {
            throw new Error("The board changed its preflight line count during the walk.");
          }
          if (expectedTotal == null) {
            expectedTotal = page.sentenceLength;
            verdict = page.verdict;
            name = page.name;
          }
          if (
            page.sentenceLength !== expectedTotal
            || page.verdict !== verdict
            || page.name !== name
          ) {
            throw new Error(
              `Preflight line ${index + 1} changed while its sentence was being read.`,
            );
          }
          detail += page.detail;
          offset += page.detail.length;
          if (offset >= expectedTotal) break;
          if (page.detail.length === 0) {
            throw new Error(
              `Preflight line ${index + 1} stopped before its declared end.`,
            );
          }
        }
        lines.push({
          name,
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          verdict,
          status: pageStatusName(verdict),
          label: pageStatusLabel(verdict),
          detail,
        });
        if (!mountedRef.current) return;
      }
      const report = {
        protocol: "akp",
        status: "ok",
        count: lines.length,
        lines,
        passCount: lines.filter((line) => line.status === "pass").length,
        failCount: lines.filter((line) => line.status === "fail").length,
        factCount: lines.filter((line) => line.status === "fact").length,
        observedAtMs: Date.now(),
      };
      setPreflight(report);
      setPreflightState("ready");
      setMessage(
        `Read ${lines.length} board preflight line${lines.length === 1 ? "" : "s"} without changing aircraft state.`,
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setPreflightState("error");
      setPreflightError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readPerformance = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_PERF) === 0
    ) {
      setPerfError(
        "The HELLO capability word does not claim PERF, so RotorBench did not ask for a profiler window.",
      );
      setPerfState("error");
      return;
    }
    if (pollBusyRef.current) {
      setPerfError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setPerfError("");
    setPerfState("reading");
    try {
      const window = parseAerialKitPerf(
        await session.request(AERIAL_KIT_COMMANDS.perf),
      );
      if (!mountedRef.current) return;
      setPerformance({
        ...window,
        observedAtMs: Date.now(),
      });
      setPerfState("ready");
      setMessage(
        window.status === "ok"
          ? "Read the board's loop performance window without changing flight state."
          : "The board reports that this build has no loop profiler.",
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setPerfState("error");
      setPerfError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readMotorTelemetry = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_MOTOR_TELEMETRY) === 0
    ) {
      setMotorError(
        "The HELLO capability word does not claim MOTOR_TELEMETRY, so RotorBench did not ask for ESC telemetry.",
      );
      setMotorState("error");
      return;
    }
    if (pollBusyRef.current) {
      setMotorError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setMotorError("");
    setMotorState("reading");
    try {
      const telemetry = parseAerialKitMotorTelemetry(
        await session.request(AERIAL_KIT_COMMANDS.motorTelemetry),
      );
      if (!mountedRef.current) return;
      setMotorTelemetry({
        ...telemetry,
        observedAtMs: Date.now(),
      });
      setMotorState("ready");
      setMessage(
        telemetry.status === "none"
          ? "The board reports no ESC telemetry path."
          : "Read ESC telemetry without arming, spinning, or testing a motor.",
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setMotorState("error");
      setMotorError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readLogInventory = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    if (
      hello.features != null
      && (hello.features & AERIAL_KIT_FEATURE_LOG_STREAM) === 0
    ) {
      setLogError(
        "The HELLO capability word does not claim LOG_STREAM, so RotorBench did not ask about the logs.",
      );
      setLogState("error");
      return;
    }
    if (pollBusyRef.current) {
      setLogError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setLogError("");
    setLogState("reading");
    setLogSample(null);
    const inventory = [];
    try {
      for (const source of [0, 1, 2]) {
        inventory.push(parseAerialKitLogSource(
          await session.request(
            AERIAL_KIT_COMMANDS.logSource,
            Uint8Array.of(source),
          ),
          source,
        ));
      }
      if (!mountedRef.current) return;
      setLogInventory(inventory);
      const selected = inventory.find(
        (entry) => entry.source === logSource && entry.status === "available",
      ) || inventory.find((entry) => entry.status === "available");
      if (selected) setLogSource(selected.source);
      setLogState("ready");
      setMessage(
        "Read the three log sources without erasing, rewriting, or streaming a log.",
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setLogInventory(inventory);
      setLogState("error");
      setLogError(readError.message);
    } finally {
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const readLogSample = async () => {
    const session = sessionRef.current;
    if (!activeRef.current || !session) return;
    const selected = logInventory?.find(
      (entry) => entry.source === logSource,
    );
    if (!selected || selected.status !== "available") {
      setLogError("Choose a log source that the board reports as available.");
      setLogState("error");
      return;
    }
    if (!selected.count) {
      setLogError("The selected log is available and empty; there is no sample to read.");
      setLogState("error");
      return;
    }
    if (pollBusyRef.current) {
      setLogError("Wait for the current STATUS/RC poll to finish.");
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollBusyRef.current = true;
    setLogError("");
    setLogState("reading");
    setLogSample({
      source: logSource,
      sourceName: selected.sourceName,
      requestedCount: Math.min(LOG_SAMPLE_LIMIT, selected.count),
      frames: [],
      records: 0,
      holes: 0,
      done: false,
      observedAtMs: Date.now(),
    });
    let resolveDone;
    let rejectDone;
    const donePromise = new Promise((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });
    let completionTimer = null;
    logCollectorRef.current = (frame) => {
      if (frame.source !== logSource) {
        rejectDone(new Error(
          `The board streamed source ${frame.source} while ${selected.sourceName} was selected.`,
        ));
        return;
      }
      setLogSample((current) => {
        if (!current) return current;
        const frames = [...current.frames, frame];
        return {
          ...current,
          frames,
          records: frames.filter((entry) => entry.status === "record").length,
          holes: frames.filter((entry) => entry.status === "hole").length,
          done: frame.status === "done",
        };
      });
      if (frame.status === "done") resolveDone(frame);
    };
    try {
      const count = Math.min(LOG_SAMPLE_LIMIT, selected.count);
      const first = selected.count - count;
      const payload = new Uint8Array(6);
      payload[0] = logSource;
      payload[1] = first & 0xff;
      payload[2] = (first >> 8) & 0xff;
      payload[3] = count & 0xff;
      payload[4] = (count >> 8) & 0xff;
      payload[5] = Math.min(20, AERIAL_KIT_LOG_STREAM_MAX_HZ);
      const reply = parseAerialKitLogStreamReply(
        await session.request(AERIAL_KIT_COMMANDS.logStream, payload),
      );
      if (reply.status === "refused") {
        throw new Error("The board refused the selected log stream.");
      }
      if (reply.count === 0 || reply.hz === 0) {
        logCollectorRef.current = null;
        setLogSample((current) => current && ({
          ...current,
          first: reply.first,
          count: reply.count,
          hz: reply.hz,
          done: true,
          noStream: true,
          observedAtMs: Date.now(),
        }));
        setLogState("ready");
        setMessage("The board accepted the request but reports that no log frames will be sent.");
        return;
      }
      setLogSample((current) => current && ({
        ...current,
        first: reply.first,
        count: reply.count,
        hz: reply.hz,
        observedAtMs: Date.now(),
      }));
      completionTimer = setTimeout(() => {
        logCollectorRef.current = null;
        rejectDone(new Error(
          `The board did not finish the ${reply.count}-record log stream within 6 seconds.`,
        ));
      }, 6000);
      await donePromise;
      if (!mountedRef.current) return;
      setLogState("ready");
      setMessage(
        `Read a bounded ${reply.count}-record sample from ${reply.sourceName}; holes and completion are preserved.`,
      );
      setProtocolStats({ ...session.stats });
    } catch (readError) {
      if (!mountedRef.current) return;
      setLogState("error");
      setLogError(readError.message);
    } finally {
      if (completionTimer) clearTimeout(completionTimer);
      logCollectorRef.current = null;
      pollBusyRef.current = false;
      if (activeRef.current) schedulePoll(session, hello);
    }
  };

  const downloadLogSample = () => {
    try {
      const exported = createAerialKitLogExport({
        inventory: logInventory,
        sample: logSample,
        targetName: targetName || hello?.product || null,
        nowMs: Date.now(),
      });
      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `rotorbench-log-sample-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setMessage(
        "Bounded log sample exported with its source, range, holes, completion, and record-version manifest.",
      );
    } catch (exportError) {
      setLogError(exportError.message);
      setLogState("error");
    }
  };

  const downloadLogCsv = () => {
    try {
      const exported = createAerialKitLogExport({
        inventory: logInventory,
        sample: logSample,
        targetName: targetName || hello?.product || null,
        nowMs: Date.now(),
      });
      const csv = serializeAerialKitLogCsv(exported);
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `rotorbench-log-sample-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setMessage(
        "CSV record rows exported. The validated JSON manifest remains authoritative for source, range, holes, and completion.",
      );
    } catch (exportError) {
      setLogError(exportError.message);
      setLogState("error");
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
        onLogFrame: (frame) => logCollectorRef.current?.(frame),
        onTelemetry: handleTelemetryFrame,
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
      sensorMetadata: sensors,
      outputMetadata: outputInfo,
      preflight,
      performance,
      motorTelemetry,
      logInventory,
      logSample,
      telemetryStream,
      mission,
      calibration,
      waypointInventory,
      missionProximity,
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
  const telemetryAgeMs = telemetryStream?.lastObservedAtMs == null
    ? null
    : Math.max(0, clockNow - telemetryStream.lastObservedAtMs);
  const telemetryFreshAfterMs = Math.max(
    1000,
    3000 / Math.max(1, telemetryStream?.agreedHz || telemetryRequestedHz),
  );
  const telemetryFresh = telemetryStream?.latest != null
    && telemetryAgeMs != null
    && telemetryAgeMs <= telemetryFreshAfterMs;
  const telemetryStale = telemetryState === "streaming"
    && !telemetryFresh
    && (
      telemetryStream?.lastObservedAtMs != null
      || (
        telemetryStream?.startedAtMs != null
        && clockNow - telemetryStream.startedAtMs > telemetryFreshAfterMs
      )
    );
  const routeSummary = useMemo(
    () => waypointInventory
      ? buildAerialKitRouteSummary(waypointInventory)
      : null,
    [waypointInventory],
  );
  const positionCandidate = telemetryFresh && telemetryStream?.latest
    ? {
        position: {
          lat: telemetryStream.latest.latitude,
          lon: telemetryStream.latest.longitude,
          gpsFixType: telemetryStream.latest.gpsFixType,
        },
        observedAtMs: telemetryStream.lastObservedAtMs,
        source: "telemetry",
      }
    : armed.fresh && liveStatus
      ? {
          position: {
            lat: liveStatus.latitude,
            lon: liveStatus.longitude,
            gpsFixType: liveStatus.gpsFixType,
          },
          observedAtMs: lastStatusAt,
          source: "status",
        }
      : null;
  const missionProximity = mission?.status === "ok" && waypointInventory
    ? buildAerialKitMissionProximity({
        position: positionCandidate?.position || null,
        positionObservedAtMs: positionCandidate?.observedAtMs || null,
        positionSource: positionCandidate?.source || null,
        mission,
        inventory: waypointInventory,
        nowMs: clockNow,
      })
    : null;
  const canDownload = Boolean(
    hello
      || liveStatus
      || rc
      || preflight
      || performance
      || motorTelemetry
      || logInventory
      || telemetryStream,
  );
  const metadataClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_PARAM_INFO) !== 0;
  const sensorClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_SENSOR_INFO) !== 0;
  const outputClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_OUTPUT_INFO) !== 0;
  const preflightClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_PREFLIGHT) !== 0;
  const perfClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_PERF) !== 0;
  const motorTelemetryClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_MOTOR_TELEMETRY) !== 0;
  const logClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_LOG_STREAM) !== 0;
  const missionClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_MISSION) !== 0;
  const calibrationClaimed = hello?.features == null
    || (hello.features & AERIAL_KIT_FEATURE_CALIBRATE) !== 0;
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
            Read-only AKP status, parameters, preflight, and telemetry
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
              <li className={preflight ? "is-complete" : "is-pending"}>
                <span aria-hidden="true" />
                Board preflight
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

            {hello && (
              <section
                className="aerial-kit-telemetry-stream"
                aria-label="Aerial Kit live telemetry stream"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Live telemetry stream</strong>
                  <span>
                    {telemetryState === "subscribing"
                      ? "Negotiating"
                      : telemetryState === "stopping"
                        ? "Stopping"
                        : telemetryState === "streaming"
                          ? telemetryStale
                            ? "Stream stale"
                            : `${telemetryStream?.agreedHz || 0} Hz`
                          : telemetryState === "unavailable"
                            ? "No stream"
                            : telemetryState === "stopped"
                              ? "Stopped"
                              : telemetryState === "error"
                                ? "Stream error"
                                : "Not streaming"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <label className="aerial-kit-log-source">
                    <span>Requested rate</span>
                    <select
                      value={telemetryRequestedHz}
                      disabled={telemetryState === "streaming"
                        || telemetryState === "subscribing"
                        || telemetryState === "stopping"}
                      onChange={(event) => {
                        setTelemetryRequestedHz(Number(event.target.value));
                      }}
                    >
                      {[5, 10, 20, AERIAL_KIT_TELEMETRY_MAX_HZ].map((rate) => (
                        <option key={rate} value={rate}>{rate} Hz</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || telemetryState === "streaming"
                      || telemetryState === "subscribing"
                      || telemetryState === "stopping"
                    }
                    onClick={startTelemetry}
                  >
                    <Activity size={15} aria-hidden="true" />
                    Start telemetry
                  </button>
                  <button
                    type="button"
                    disabled={
                      telemetryState !== "streaming"
                      || telemetryState === "stopping"
                    }
                    onClick={stopTelemetry}
                  >
                    <CircleStop size={15} aria-hidden="true" />
                    Stop telemetry
                  </button>
                </div>
                <p>
                  The board answers with the rate it will actually send. A zero
                  means no stream will arrive; silence while streaming is shown as
                  stale, not as live data.
                </p>
                {telemetryError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Telemetry stream unavailable</strong>
                      <small>{telemetryError}</small>
                    </span>
                  </div>
                )}
                {telemetryState === "unavailable" && (
                  <div className="aerial-kit-preflight-empty" role="note">
                    <Activity size={16} aria-hidden="true" />
                    <span>
                      <strong>Board declined the stream</strong>
                      <small>
                        Requested {telemetryStream?.requestedHz} Hz and received
                        0 Hz. No pushed frames are expected.
                      </small>
                    </span>
                  </div>
                )}
                {telemetryStream && telemetryState !== "unavailable" && (
                  <>
                    <dl className="aerial-kit-telemetry-health">
                      <div>
                        <dt>Requested / agreed</dt>
                        <dd>
                          {telemetryStream.requestedHz} / {telemetryStream.agreedHz} Hz
                        </dd>
                      </div>
                      <div>
                        <dt>Frames</dt>
                        <dd>{telemetryStream.frameCount}</dd>
                      </div>
                      <div>
                        <dt>Latest frame</dt>
                        <dd>
                          {telemetryAgeMs == null
                            ? "None yet"
                            : `${(telemetryAgeMs / 1000).toFixed(2)} s ago`}
                        </dd>
                      </div>
                      <div>
                        <dt>Uptime progression</dt>
                        <dd>
                          {telemetryStream.uptimeRegressions
                            ? `${telemetryStream.uptimeRegressions} regression${telemetryStream.uptimeRegressions === 1 ? "" : "s"}`
                            : `${telemetryStream.uptimeWraps || 0} wrap${telemetryStream.uptimeWraps === 1 ? "" : "s"}`}
                        </dd>
                      </div>
                    </dl>
                    {telemetryStream.latest && (
                      <dl className="aerial-kit-telemetry-latest">
                        <div>
                          <dt>Uptime</dt>
                          <dd>
                            {(telemetryStream.latest.uptimeMs / 1000).toFixed(3)} s
                          </dd>
                        </div>
                        <div>
                          <dt>Flight state</dt>
                          <dd>
                            {AERIAL_KIT_FLIGHT_STATES[
                              telemetryStream.latest.flightState
                            ] || `state ${telemetryStream.latest.flightState}`}
                          </dd>
                        </div>
                        <div>
                          <dt>Link</dt>
                          <dd>
                            {telemetryStream.latest.linkLive === 1 ? "Live" : "Not live"}
                          </dd>
                        </div>
                        <div>
                          <dt>Attitude</dt>
                          <dd>
                            {telemetryStream.latest.rollDeg.toFixed(1)} /{" "}
                            {telemetryStream.latest.pitchDeg.toFixed(1)} /{" "}
                            {telemetryStream.latest.yawDeg.toFixed(1)}°
                          </dd>
                        </div>
                        <div>
                          <dt>GPS</dt>
                          <dd>
                            fix {telemetryStream.latest.gpsFixType} ·{" "}
                            {telemetryStream.latest.gpsSatellites} satellites
                          </dd>
                        </div>
                        <div>
                          <dt>Motors</dt>
                          <dd>{telemetryStream.latest.motors.join(" / ")}</dd>
                        </div>
                      </dl>
                    )}
                  </>
                )}
                {telemetryStale && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Telemetry stream is stale</strong>
                      <small>
                        No frame arrived within the freshness window. The last
                        observation remains historical; stop and restart if needed.
                      </small>
                    </span>
                  </div>
                )}
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-mission"
                aria-label="Aerial Kit mission status"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Mission status</strong>
                  <span>
                    {missionState === "reading"
                      ? "Reading"
                      : missionState === "ready"
                        ? mission.status
                        : missionState === "error"
                          ? "Read stopped"
                          : !missionClaimed
                            ? "Not claimed"
                            : "Not read"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || missionState === "reading"
                      || !missionClaimed
                    }
                    onClick={readMissionStatus}
                  >
                    <Search size={15} aria-hidden="true" />
                    Read mission status
                  </button>
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || waypointState === "reading"
                    }
                    onClick={readWaypointInventory}
                  >
                    <Search size={15} aria-hidden="true" />
                    Read waypoint inventory
                  </button>
                  <span>
                    {waypointState === "reading"
                      ? `Waypoints ${waypointProgress.read}/${waypointProgress.total}`
                      : mission?.observedAtMs
                      ? `Observed ${ageLabel(mission.observedAtMs, clockNow)}`
                      : "Status verb only"}
                  </span>
                </div>
                <p>
                  This panel reads the board&apos;s mission state. It has no start,
                  stop, home set, home clear, or waypoint upload controls.
                </p>
                {missionError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Mission status unavailable</strong>
                      <small>{missionError}</small>
                    </span>
                  </div>
                )}
                {mission?.status !== "ok" && mission && (
                  <div className="aerial-kit-preflight-empty" role="note">
                    <Activity size={16} aria-hidden="true" />
                    <span>
                      <strong>Mission state not available</strong>
                      <small>
                        The board answered {mission.status}. RotorBench does not
                        reinterpret that refusal as an empty mission.
                      </small>
                    </span>
                  </div>
                )}
                {mission?.status === "ok" && (
                  <dl className="aerial-kit-mission-state">
                    <div>
                      <dt>Navigator</dt>
                      <dd>{mission.active ? "Mission active" : "No mission active"}</dd>
                    </div>
                    <div>
                      <dt>Mission requested</dt>
                      <dd>{mission.requested ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt>Waypoint list</dt>
                      <dd>
                        {mission.count}
                        {mission.countCapped ? "+" : ""} waypoint
                        {mission.count === 1 ? "" : "s"}
                      </dd>
                    </div>
                    <div>
                      <dt>Current waypoint</dt>
                      <dd>{mission.index ?? "None"}</dd>
                    </div>
                    <div>
                      <dt>Mission switch</dt>
                      <dd>
                        {mission.channel == null ? "Not configured" : `CH ${mission.channel}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Hold altitude</dt>
                      <dd>
                        {mission.active ? `${mission.holdAltMm} mm` : "No mission running"}
                      </dd>
                    </div>
                    <div>
                      <dt>Reached / started / cancelled</dt>
                      <dd>
                        {mission.reached} / {mission.started} / {mission.cancelled}
                      </dd>
                    </div>
                  </dl>
                )}
                {waypointError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Waypoint inventory unavailable</strong>
                      <small>{waypointError}</small>
                    </span>
                  </div>
                )}
                {waypointInventory && (
                  <div className="aerial-kit-waypoints">
                    <div>
                      <span>Waypoint parameters</span>
                      <strong>
                        {waypointInventory.count ?? "Unknown"} configured ·{" "}
                        {waypointInventory.availableSlots} available slot
                        {waypointInventory.availableSlots === 1 ? "" : "s"}
                      </strong>
                    </div>
                    {mission?.status === "ok"
                      && waypointInventory.count != null
                      && mission.count !== waypointInventory.count
                      && !mission.countCapped && (
                      <div className="aerial-kit-rc-unavailable" role="note">
                        <ShieldAlert size={16} aria-hidden="true" />
                        <span>
                          <strong>Mission counts differ</strong>
                          <small>
                            Mission status reports {mission.count}; the parameter
                            table reports {waypointInventory.count}. RotorBench
                            does not choose one.
                          </small>
                        </span>
                      </div>
                    )}
                    {waypointInventory.status === "unavailable" && (
                      <p>
                        The advertised parameter table has no <code>wp_count</code>
                        value, so RotorBench cannot identify a waypoint list.
                      </p>
                    )}
                    {waypointInventory.status === "incomplete" && (
                      <p>
                        The waypoint list is incomplete: {waypointInventory.reason}.
                        No coordinate is repaired or defaulted.
                      </p>
                    )}
                    {waypointInventory.status === "ok"
                      && waypointInventory.count === 0 && (
                      <p>No waypoints are configured. This is an empty list, not missing hardware.</p>
                    )}
                    <AerialKitMissionProximity proximity={missionProximity} />
                    {waypointInventory.slots.length > 0 && (
                      <ol aria-label="Board-reported waypoint coordinates">
                        {waypointInventory.slots.map((slot) => (
                          <li key={slot.index} className={slot.complete ? "is-complete" : "is-incomplete"}>
                            <strong>WP {slot.index}</strong>
                            <span>
                              {slot.complete
                                ? `${slot.lat.toFixed(7)}, ${slot.lon.toFixed(7)}`
                                : slot.errors.join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                    <AerialKitRouteSketch inventory={waypointInventory} />
                    <AerialKitWaypointRouteSummary route={routeSummary} />
                  </div>
                )}
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-calibration"
                aria-label="Aerial Kit calibration status"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Calibration session</strong>
                  <span>
                    {calibrationState === "reading"
                      ? "Reading"
                      : calibrationState === "ready"
                        ? calibration.status
                        : calibrationState === "error"
                          ? "Read stopped"
                          : !calibrationClaimed
                            ? "Not claimed"
                            : "Not read"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || calibrationState === "reading"
                      || !calibrationClaimed
                    }
                    onClick={readCalibrationStatus}
                  >
                    <Activity size={15} aria-hidden="true" />
                    Read calibration status
                  </button>
                  <span>
                    {calibration?.observedAtMs
                      ? `Observed ${ageLabel(calibration.observedAtMs, clockNow)}`
                      : "Status verb only"}
                  </span>
                </div>
                <p>
                  This panel reads the current calibration session. It has no
                  gyro, RC, accelerometer, battery, or abort controls.
                </p>
                {calibrationError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Calibration status unavailable</strong>
                      <small>{calibrationError}</small>
                    </span>
                  </div>
                )}
                {calibration && calibration.status !== "done" && (
                  <div className="aerial-kit-preflight-empty" role="note">
                    <Activity size={16} aria-hidden="true" />
                    <span>
                      <strong>Calibration response</strong>
                      <small>
                        The board answered {calibration.status}. No result value is
                        presented as a completed calibration.
                      </small>
                    </span>
                  </div>
                )}
                {calibration?.status === "done" && (
                  <>
                    <dl className="aerial-kit-calibration-state">
                      <div>
                        <dt>Session</dt>
                        <dd>{calibration.verb || "No session named"}</dd>
                      </div>
                      <div>
                        <dt>State</dt>
                        <dd>{calibration.active ? "Sampling" : "Idle"}</dd>
                      </div>
                      <div>
                        <dt>Face</dt>
                        <dd>{calibration.step == null ? "Not sampling" : calibration.step}</dd>
                      </div>
                      <div>
                        <dt>Faces complete</dt>
                        <dd>
                          {calibration.verb === "accel"
                            ? `${calibration.facesDone} / 6`
                            : "Not applicable"}
                        </dd>
                      </div>
                      <div>
                        <dt>Samples / rejected</dt>
                        <dd>{calibration.samples} / {calibration.rejected}</dd>
                      </div>
                    </dl>
                    {calibration.resultValues.length > 0 && (
                      <dl
                        className="aerial-kit-calibration-results"
                        aria-label="Board-reported calibration results"
                      >
                        {calibration.resultValues.map((result) => (
                          <div key={result.name}>
                            <dt>{result.name}</dt>
                            <dd>{result.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {calibration.verb == null && (
                      <div className="aerial-kit-preflight-empty" role="note">
                        <Activity size={16} aria-hidden="true" />
                        <span>
                          <strong>No session named</strong>
                          <small>
                            The board returned no calibration verb, so its zeroed
                            result slots are not measurements.
                          </small>
                        </span>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-preflight"
                aria-label="Board-reported preflight checklist"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Board preflight checklist</strong>
                  <span>
                    {preflightState === "reading"
                      ? "Reading"
                      : preflightState === "ready"
                        ? preflight.status === "none"
                          ? "No checklist"
                          : `${preflight.failCount} fail · ${preflight.passCount} pass · ${preflight.factCount} reading`
                        : preflightState === "error"
                          ? "Read stopped"
                          : !preflightClaimed
                            ? "Not claimed"
                            : "Not read"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || preflightState === "reading"
                      || !preflightClaimed
                    }
                    onClick={readPreflight}
                  >
                    <ShieldCheck size={15} aria-hidden="true" />
                    Read preflight checklist
                  </button>
                  <span>
                    {preflight?.observedAtMs
                      ? `Observed ${ageLabel(preflight.observedAtMs, clockNow)}`
                      : "User-triggered read"}
                  </span>
                </div>
                <p>
                  The board supplies its own checks and readings. A clear checklist
                  remains a time-bounded observation; it does not arm, fly, prove RF,
                  or authorize the aircraft.
                </p>
                {preflightError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Preflight unavailable</strong>
                      <small>{preflightError}</small>
                    </span>
                  </div>
                )}
                {preflight?.status === "none" && (
                  <div className="aerial-kit-preflight-empty" role="note">
                    <Activity size={16} aria-hidden="true" />
                    <span>
                      <strong>No checklist to read</strong>
                      <small>
                        The board answered that this build serves no preflight
                        checklist. RotorBench does not convert that into a pass.
                      </small>
                    </span>
                  </div>
                )}
                {preflight?.status === "ok" && (
                  <ol aria-label="Board-reported preflight lines">
                    {preflight.lines.map((line, index) => (
                      <li key={`${line.id}-${index}`} className={`is-${line.status}`}>
                        <span>
                          <strong>{line.name}</strong>
                          <small>{line.detail || "No additional detail."}</small>
                        </span>
                        <em>{line.label}</em>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-perf"
                aria-label="Aerial Kit loop performance window"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Loop performance window</strong>
                  <span>
                    {perfState === "reading"
                      ? "Reading"
                      : perfState === "ready"
                        ? performance.status === "none"
                          ? "No profiler"
                          : `${performance.loops} loops · ${performance.late} late`
                        : perfState === "error"
                          ? "Read stopped"
                          : !perfClaimed
                            ? "Not claimed"
                            : "Not read"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || perfState === "reading"
                      || !perfClaimed
                    }
                    onClick={readPerformance}
                  >
                    <Activity size={15} aria-hidden="true" />
                    Read performance window
                  </button>
                  <span>
                    {performance?.observedAtMs
                      ? `Observed ${ageLabel(performance.observedAtMs, clockNow)}`
                      : "User-triggered read"}
                  </span>
                </div>
                <p>
                  Period, jitter, section time, and load come from the board&apos;s
                  profiler. Load is a lower bound because not every task is
                  instrumented.
                </p>
                {perfError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Performance unavailable</strong>
                      <small>{perfError}</small>
                    </span>
                  </div>
                )}
                {performance?.status === "none" && (
                  <div className="aerial-kit-preflight-empty" role="note">
                    <Activity size={16} aria-hidden="true" />
                    <span>
                      <strong>No profiler in this build</strong>
                      <small>
                        The zeroed window is not a performance reading. RotorBench
                        does not present it as a loop that costs nothing.
                      </small>
                    </span>
                  </div>
                )}
                {performance?.status === "ok" && (
                  <AerialKitPerformanceReadings performance={performance} />
                )}
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-motors"
                aria-label="Aerial Kit ESC telemetry"
              >
                <div className="aerial-kit-section-heading">
                  <strong>ESC telemetry</strong>
                  <span>
                    {motorState === "reading"
                      ? "Reading"
                      : motorState === "ready"
                        ? motorTelemetry.status === "none"
                          ? "No telemetry path"
                          : `${motorTelemetry.motors.filter((motor) => motor.measured).length}/${motorTelemetry.count} answering`
                        : motorState === "error"
                          ? "Read stopped"
                          : !motorTelemetryClaimed
                            ? "Not claimed"
                            : "Not read"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || motorState === "reading"
                      || !motorTelemetryClaimed
                    }
                    onClick={readMotorTelemetry}
                  >
                    <Activity size={15} aria-hidden="true" />
                    Read ESC telemetry
                  </button>
                  <span>
                    {motorTelemetry?.observedAtMs
                      ? `Observed ${ageLabel(motorTelemetry.observedAtMs, clockNow)}`
                      : "User-triggered read"}
                  </span>
                </div>
                <p>
                  Flags decide which fields are readings. An unmeasured motor is
                  not shown as stopped, and missing RPM, temperature, voltage, or
                  current remains not reported.
                </p>
                {motorError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>ESC telemetry unavailable</strong>
                      <small>{motorError}</small>
                    </span>
                  </div>
                )}
                {motorTelemetry?.status === "none" && (
                  <div className="aerial-kit-preflight-empty" role="note">
                    <Activity size={16} aria-hidden="true" />
                    <span>
                      <strong>No ESC telemetry path</strong>
                      <small>
                        This build cannot hear its ESCs. RotorBench does not replace
                        that answer with a list of stopped motors.
                      </small>
                    </span>
                  </div>
                )}
                {motorTelemetry?.status === "ok" && (
                  <>
                    <p className="aerial-kit-motor-poles">
                      Pole count reported by the board:{" "}
                      {motorTelemetry.poles || "unknown"}.{" "}
                      {motorTelemetry.poles
                        ? "Mechanical RPM is only shown where its flag is set."
                        : "Mechanical RPM is not derived without a pole count."}
                    </p>
                    <AerialKitMotorTelemetryReadings
                      telemetry={motorTelemetry}
                    />
                  </>
                )}
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-logs"
                aria-label="Aerial Kit log inventory and sample"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Flight log sample</strong>
                  <span>
                    {logState === "reading"
                      ? "Reading"
                      : logState === "ready"
                        ? logSample
                          ? `${logSample.records} records · ${logSample.holes} holes`
                          : `${logInventory?.filter((entry) => entry.status === "available").length || 0} sources`
                        : logState === "error"
                          ? "Read stopped"
                          : !logClaimed
                            ? "Not claimed"
                            : "Not read"}
                  </span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || logState === "reading"
                      || !logClaimed
                    }
                    onClick={readLogInventory}
                  >
                    <Search size={15} aria-hidden="true" />
                    Read log inventory
                  </button>
                  <label className="aerial-kit-log-source">
                    <span>Source</span>
                    <select
                      value={logSource}
                      disabled={
                        !active
                        || sessionState !== "monitoring"
                        || logState === "reading"
                      }
                      onChange={(event) => {
                        setLogSource(Number(event.target.value));
                        setLogSample(null);
                      }}
                    >
                      {LOG_SOURCE_LABELS.map((label, source) => (
                        <option key={label} value={source}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || logState === "reading"
                      || !logInventory
                      || !logInventory.find(
                        (entry) => (
                          entry.source === logSource
                          && entry.status === "available"
                          && entry.count > 0
                        ),
                      )
                    }
                    onClick={readLogSample}
                  >
                    <Download size={15} aria-hidden="true" />
                    Read latest sample
                  </button>
                  <button
                    type="button"
                    disabled={!logSample?.done && !logSample?.noStream}
                    onClick={downloadLogSample}
                  >
                    <Download size={15} aria-hidden="true" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    disabled={!logSample?.done && !logSample?.noStream}
                    onClick={downloadLogCsv}
                  >
                    <Download size={15} aria-hidden="true" />
                    Export CSV
                  </button>
                </div>
                <p>
                  Reads the newest {LOG_SAMPLE_LIMIT} records or fewer at 20 Hz.
                  Source selection is protocol state only; RotorBench does not erase,
                  rewrite, or download the whole log. JSON carries the authoritative
                  manifest; CSV contains record rows only. Both exclude serial-port
                  identity.
                </p>
                {logError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Log read unavailable</strong>
                      <small>{logError}</small>
                    </span>
                  </div>
                )}
                <AerialKitLogReadings
                  inventory={logInventory}
                  sample={logSample}
                  sourceLabels={LOG_SOURCE_LABELS}
                />
              </section>
            )}

            {hello && (
              <section
                className="aerial-kit-hardware"
                aria-label="Board-reported hardware capabilities"
              >
                <div className="aerial-kit-section-heading">
                  <strong>Sensor and output metadata</strong>
                  <span>Read-only descriptors</span>
                </div>
                <div className="aerial-kit-parameter-actions">
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || sensorState === "reading"
                      || !sensorClaimed
                    }
                    onClick={readSensorMetadata}
                  >
                    <Activity size={15} aria-hidden="true" />
                    Read sensor presence
                  </button>
                  <button
                    type="button"
                    disabled={
                      !active
                      || sessionState !== "monitoring"
                      || outputState === "reading"
                      || !outputClaimed
                    }
                    onClick={readOutputMetadata}
                  >
                    <SlidersHorizontal size={15} aria-hidden="true" />
                    Read output map
                  </button>
                  <span>
                    Sensors:{" "}
                    {sensorState === "reading"
                      ? `${sensorProgress.done}/${sensorProgress.total}`
                      : sensorState === "ready"
                        ? `${sensors?.filter((sensor) => sensor.present).length || 0} present`
                        : sensorState === "error"
                          ? "read stopped"
                          : !sensorClaimed
                            ? "not claimed"
                            : "not read"}
                    {" · "}
                    Outputs:{" "}
                    {outputState === "reading"
                      ? "reading"
                      : outputState === "ready"
                        ? `${outputInfo?.count || 0} listed`
                        : outputState === "error"
                          ? "read stopped"
                          : !outputClaimed
                            ? "not claimed"
                            : "not read"}
                  </span>
                </div>
                <p>
                  Sensor rows preserve the board&apos;s fitted-or-absent answer and
                  the readings carried with a present topic. Output rows report the
                  board&apos;s descriptor list and servo linkage. These observations
                  do not establish calibration, an output test, or a safe state.
                </p>
                {sensorError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Sensor metadata incomplete</strong>
                      <small>{sensorError}</small>
                    </span>
                  </div>
                )}
                {sensors && (
                  <dl className="aerial-kit-hardware-list" aria-label="Reported sensor topics">
                    {sensors.map((sensor) => (
                      <div key={sensor.topic} className={`is-${sensor.status}`}>
                        <dt>
                          <span>{sensor.topicName}</span>
                          <em>{sensor.status === "present"
                            ? "Present"
                            : sensor.status === "absent"
                              ? "Absent"
                              : "No such topic"}</em>
                        </dt>
                        <dd>
                          <span>{sensor.driver || "No driver reported"}</span>
                          <AerialKitSensorReadings sensor={sensor} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {outputError && (
                  <div className="aerial-kit-rc-unavailable" role="note">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>
                      <strong>Output metadata unavailable</strong>
                      <small>{outputError}</small>
                    </span>
                  </div>
                )}
                {outputInfo && (
                  <div className="aerial-kit-outputs">
                    <div>
                      <span>{outputInfo.status === "ok" ? "Output list" : outputInfo.status === "none" ? "No output list" : "Output list too large"}</span>
                      <strong>
                        {outputInfo.motors} motor{outputInfo.motors === 1 ? "" : "s"} ·{" "}
                        {outputInfo.servos} servo{outputInfo.servos === 1 ? "" : "s"} ·{" "}
                        {outputInfo.capPercent}% test cap
                      </strong>
                    </div>
                    {outputInfo.outputs.length > 0 && (
                      <ol aria-label="Reported output descriptors">
                        {outputInfo.outputs.map((output) => (
                          <li key={`${output.kind}-${output.index}`}>
                            <strong>{output.kindName || `Type ${output.kind}`} {output.index}</strong>
                            <span>
                              {output.kindName === "servo"
                                ? `${output.reversed ? "reversed" : "normal"} · trim ${output.trimUs} µs · travel ${output.travelUs} µs`
                                : "motor output"}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
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
