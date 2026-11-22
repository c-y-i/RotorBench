import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CircleStop,
  Download,
  RadioTower,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  ELRS_ADDRESS,
  ElrsMenuReadOnlySession,
  createElrsDeviceMenuEvidence,
} from "../utils/elrsRadioMenu";
import {
  SERIAL_CAPTURE_BAUD_RATES,
  hasWebSerial,
  serialCaptureErrorMessage,
} from "../utils/webSerialCapture";

const STATUS_LABELS = {
  idle: "Not connected",
  selecting: "Selecting port",
  reading: "Reading menu",
  ready: "Menu loaded",
  stopping: "Stopping",
  stopped: "Stopped",
  error: "Menu read error",
  unsupported: "Unsupported",
};

const KIND_LABELS = {
  selection: "Selection",
  number: "Number",
  folder: "Folder",
  info: "Info",
  string: "Text",
  command: "Command",
  unsupported: "Unsupported",
};

function versionLabel(value) {
  return `${value} · 0x${value.toString(16).padStart(8, "0")}`;
}

function parameterValueLabel(parameter) {
  if (parameter.kind === "selection") {
    const option = parameter.options[parameter.value];
    return option == null
      ? `Index ${parameter.value} · ${parameter.min}..${parameter.max}`
      : `${option} · index ${parameter.value}`;
  }
  if (parameter.kind === "number") {
    return `${parameter.value}${parameter.units ? ` ${parameter.units}` : ""} · ${parameter.min}..${parameter.max}`;
  }
  if (parameter.kind === "folder") {
    return `${parameter.children.length} child field${parameter.children.length === 1 ? "" : "s"}`;
  }
  if (parameter.kind === "command") {
    return `${parameter.info || "No command status text"} · not executed`;
  }
  if (["info", "string"].includes(parameter.kind)) return parameter.value || "Empty";
  return `Type ${parameter.type} · value not decoded`;
}

export default function ElrsDeviceMenu({
  role = "tx",
  targetName = null,
  expectedBaud = null,
}) {
  const supportedBrowser = useMemo(() => hasWebSerial(), []);
  const [baudRate, setBaudRate] = useState(
    expectedBaud || (role === "rx" ? 420000 : 400000),
  );
  const [status, setStatus] = useState(supportedBrowser ? "idle" : "unsupported");
  const [device, setDevice] = useState(null);
  const [parameters, setParameters] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [diagnostics, setDiagnostics] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const mountedRef = useRef(true);
  const activeRef = useRef(false);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      sessionRef.current?.close?.()?.catch?.(() => {});
      readerRef.current?.cancel?.()?.catch?.(() => {});
      portRef.current?.close?.()?.catch?.(() => {});
    };
  }, []);

  const reset = () => {
    setDevice(null);
    setParameters(null);
    setProgress({ done: 0, total: 0 });
    setDiagnostics(null);
    setQuery("");
    setError("");
    setMessage("");
  };

  const closeSession = async (nextStatus = "stopped") => {
    activeRef.current = false;
    if (sessionRef.current) setDiagnostics(sessionRef.current.diagnostics);
    await sessionRef.current?.close?.();
    sessionRef.current = null;
    try {
      readerRef.current?.releaseLock?.();
      writerRef.current?.releaseLock?.();
    } catch {
      // A cancelled read may already have released its locks.
    }
    try {
      await portRef.current?.close?.();
    } catch {
      // A disconnected port is already closed.
    }
    readerRef.current = null;
    writerRef.current = null;
    portRef.current = null;
    if (mountedRef.current) setStatus(nextStatus);
  };

  const connect = async () => {
    if (!supportedBrowser || activeRef.current) return;
    reset();
    setStatus("selecting");
    let port = null;
    try {
      port = await navigator.serial.requestPort();
      portRef.current = port;
      await port.open({ baudRate });
      setStatus("reading");
      const reader = port.readable?.getReader();
      const writer = port.writable?.getWriter();
      if (!reader) throw new Error("The selected port did not provide a readable stream.");
      if (!writer) throw new Error("The selected port did not provide a writable stream.");
      readerRef.current = reader;
      writerRef.current = writer;
      activeRef.current = true;
      const session = new ElrsMenuReadOnlySession({ reader, writer });
      sessionRef.current = session;
      const identify = session.identify();
      session.startReading();
      const found = await identify;
      if (!mountedRef.current) return;
      setDevice(found);
      setProgress({ done: 0, total: found.parameterCount });
      const menu = await session.readAll((done, total) => {
        if (mountedRef.current) setProgress({ done, total });
      });
      if (!mountedRef.current) return;
      setParameters(menu);
      setDiagnostics(session.diagnostics);
      setStatus("ready");
      setMessage(
        `Read ${menu.length} device-reported menu field${menu.length === 1 ? "" : "s"}. No values were written and no commands were run.`,
      );
    } catch (readError) {
      activeRef.current = false;
      if (sessionRef.current) {
        setDiagnostics(sessionRef.current.diagnostics);
        setParameters([...sessionRef.current.parameters.values()]);
      }
      await sessionRef.current?.close?.();
      sessionRef.current = null;
      try {
        readerRef.current?.releaseLock?.();
        writerRef.current?.releaseLock?.();
      } catch {
        // Locks may already be released after a failed read.
      }
      try {
        await port?.close?.();
      } catch {
        // Ignore cleanup failure after a failed open or read.
      }
      portRef.current = null;
      readerRef.current = null;
      writerRef.current = null;
      if (mountedRef.current) {
        setError(
          readError?.name === "NotFoundError"
            ? "No serial port was selected."
            : readError?.name === "NotAllowedError"
              ? "Serial access was denied. Select the module port explicitly."
              : serialCaptureErrorMessage(readError),
        );
        setStatus("error");
      }
    }
  };

  const stop = async () => {
    if (!activeRef.current) return;
    setStatus("stopping");
    await closeSession("stopped");
    if (mountedRef.current) {
      setMessage("Menu session stopped. Any fields read before the stop remain visible.");
    }
  };

  const download = () => {
    if (!device) return;
    const evidence = createElrsDeviceMenuEvidence({
      device,
      parameters: parameters || [...(sessionRef.current?.parameters?.values() || [])],
      role,
      targetName,
      logicalBaud: baudRate,
      diagnostics,
    });
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rotorbench-elrs-menu-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("Menu inventory downloaded without serial identity or write state.");
  };

  const folderNames = useMemo(() => new Map(
    (parameters || [])
      .filter((parameter) => parameter.kind === "folder")
      .map((parameter) => [parameter.id, parameter.name]),
  ), [parameters]);
  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const groups = new Map();
    (parameters || []).forEach((parameter) => {
      const group = parameter.parent === 0
        ? "Top level"
        : folderNames.get(parameter.parent) || `Folder ${parameter.parent}`;
      const searchable = [
        parameter.name,
        KIND_LABELS[parameter.kind],
        parameterValueLabel(parameter),
        group,
      ].join(" ").toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(parameter);
    });
    return [...groups.entries()];
  }, [folderNames, parameters, query]);
  const active = ["reading", "ready"].includes(status);
  const canDownload = Boolean(device);

  return (
    <details id="elrs-device-menu" className="serial-capture elrs-device-menu">
      <summary>
        <RadioTower size={19} aria-hidden="true" />
        <span>
          <strong>ExpressLRS device menu</strong>
          <small>
            Device ping + parameter read chunks · current values only
          </small>
        </span>
        <em>Read-only</em>
      </summary>
      <div className="serial-capture-body">
        <div className="serial-capture-boundary">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Read-only CRSF menu inventory</strong>
            <p>
              This session pings the module and reads fields 1 through the
              advertised parameter count. It never sends{" "}
              <code>PARAMETER_WRITE</code>, executes menu commands, changes
              binding, starts Wi-Fi, or claims that the RF link or aircraft is
              ready. Opening the USB port may reset the module.
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
        ) : (
          <>
            <div className="serial-capture-controls">
              <label>
                Logical baud
                <select
                  value={baudRate}
                  disabled={active}
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
                disabled={active}
                onClick={connect}
              >
                <RadioTower size={15} aria-hidden="true" />
                Read device menu
              </button>
              <button type="button" disabled={!active} onClick={stop}>
                <CircleStop size={15} aria-hidden="true" />
                Stop session
              </button>
              <button type="button" disabled={!canDownload} onClick={download}>
                <Download size={15} aria-hidden="true" />
                Download inventory
              </button>
              <button type="button" disabled={active || !canDownload} onClick={reset}>
                Clear inventory
              </button>
            </div>

            <div className="serial-capture-state" aria-live="polite">
              <span className={`is-${status}`}>
                <Activity size={14} aria-hidden="true" />
                {STATUS_LABELS[status] || status}
              </span>
              <span>
                {status === "reading"
                  ? `${progress.done}/${progress.total} fields`
                  : diagnostics
                    ? `${diagnostics.validFrames} valid CRSF frames`
                    : "No CRSF frames"}
              </span>
            </div>
            {message && <p className="aerial-kit-session-message">{message}</p>}
            {error && <p className="serial-capture-error" role="alert">{error}</p>}

            {device && (
              <section className="elrs-menu-identity" aria-label="Observed radio identity">
                <div className="aerial-kit-section-heading">
                  <strong>{device.name}</strong>
                  <span>
                    {role.toUpperCase()} plan · observed {sessionRoleLabel(device)}
                  </span>
                </div>
                <dl>
                  <div><dt>Fields</dt><dd>{device.parameterCount}</dd></div>
                  <div><dt>Menu version</dt><dd>{device.parameterVersion}</dd></div>
                  <div><dt>Hardware</dt><dd>{versionLabel(device.hardwareVersion)}</dd></div>
                  <div><dt>Software</dt><dd>{versionLabel(device.softwareVersion)}</dd></div>
                </dl>
              </section>
            )}

            {parameters && (
              <section className="elrs-menu-inventory" aria-label="Device-reported menu">
                <div className="aerial-kit-section-heading">
                  <strong>Device-reported menu</strong>
                  <span>{parameters.length} fields · not written</span>
                </div>
                <label className="aerial-kit-parameter-search">
                  <Search size={14} aria-hidden="true" />
                  <span className="visually-hidden">Filter radio menu fields</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter fields, folders, values, or kinds"
                  />
                </label>
                {visibleGroups.length > 0 ? visibleGroups.map(([group, fields]) => (
                  <section key={group} aria-label={`${group} menu fields`}>
                    <h4>{group}</h4>
                    <dl>
                      {fields.map((parameter) => (
                        <div key={parameter.id}>
                          <dt>
                            <span>{parameter.name}</span>
                            <em>{KIND_LABELS[parameter.kind]}</em>
                          </dt>
                          <dd>{parameterValueLabel(parameter)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )) : (
                  <p>No device-reported field matches the current filter.</p>
                )}
              </section>
            )}

            {diagnostics && (
              <dl className="elrs-menu-diagnostics" aria-label="CRSF menu parser health">
                <div><dt>Valid frames</dt><dd>{diagnostics.validFrames}</dd></div>
                <div><dt>CRC errors</dt><dd>{diagnostics.crcErrors}</dd></div>
                <div><dt>Resyncs</dt><dd>{diagnostics.resyncs}</dd></div>
                <div><dt>Pending bytes</dt><dd>{diagnostics.pendingBytes}</dd></div>
              </dl>
            )}

            <p className="aerial-kit-session-boundary">
              Current values describe what the module returned during this
              session. They do not prove an RF link, endpoint pairing, command
              success, or that a value survived a restart.
            </p>
          </>
        )}
      </div>
    </details>
  );
}

function sessionRoleLabel(device) {
  if (device.origin === ELRS_ADDRESS.receiver) return "RX";
  if ([ELRS_ADDRESS.radioTransmitter, ELRS_ADDRESS.transmitter].includes(device.origin)) return "TX";
  return "unknown role";
}
