import {
  ArrowRight,
  Check,
  CircleAlert,
  Link2,
  Ruler,
} from "lucide-react";
import {
  checkBoardStack,
  checkMotorMount,
  checkPowerConnector,
  checkPropellerFit,
} from "../utils/physicalCompatibility";

function formatPattern(patterns) {
  const values = Array.isArray(patterns) ? patterns : [];
  return values
    .filter((pattern) => (
      Array.isArray(pattern)
      && pattern.length === 2
      && pattern.every((value) => Number.isFinite(Number(value)))
    ))
    .map((pattern) => `${Number(pattern[0])} × ${Number(pattern[1])} mm`)
    .join(" / ");
}

function interfaceRow({
  id,
  title,
  from,
  fromValue,
  to,
  toValue,
  check,
}) {
  return {
    id,
    title,
    from,
    fromValue: fromValue || "Not catalogued",
    to,
    toValue: toValue || "Not catalogued",
    status: check.status,
    message: check.message,
    label: check.label,
  };
}

export function getAssemblyInterfaces({
  frame = null,
  motor = null,
  propeller = null,
  esc = null,
  flightController = null,
  battery = null,
} = {}) {
  const rows = [];
  if (frame?.id && motor?.id) {
    rows.push(interfaceRow({
      id: "frame-motor",
      title: "Frame to motor",
      from: frame.name,
      fromValue: formatPattern(frame.motorMountPatternsMm),
      to: motor.name,
      toValue: formatPattern(motor.mountingPatternMm && [motor.mountingPatternMm]),
      check: checkMotorMount(motor, frame),
    }));
  }
  if (motor?.id && propeller?.id) {
    rows.push(interfaceRow({
      id: "motor-propeller",
      title: "Shaft to propeller",
      from: motor.name,
      fromValue: Number.isFinite(Number(motor.propShaftMm))
        ? `${Number(motor.propShaftMm)} mm shaft`
        : "",
      to: propeller.name,
      toValue: Number.isFinite(Number(propeller.shaftMm))
        ? `${Number(propeller.shaftMm)} mm bore`
        : "",
      check: checkPropellerFit(propeller, motor),
    }));
  }
  for (const [id, title, board] of [
    ["frame-fc", "Frame to flight controller", flightController],
    ["frame-esc", "Frame to ESC", esc],
  ]) {
    if (!frame?.id || !board?.id) continue;
    rows.push(interfaceRow({
      id,
      title,
      from: frame.name,
      fromValue: formatPattern(frame.stackMountPatternsMm),
      to: board.name,
      toValue: formatPattern(board.mountingPatternMm && [board.mountingPatternMm]),
      check: checkBoardStack(board, frame),
    }));
  }
  if (battery?.id && esc?.id) {
    rows.push(interfaceRow({
      id: "battery-esc",
      title: "Battery to ESC",
      from: battery.name,
      fromValue: battery.dischargeConnector || "",
      to: esc.name,
      toValue: esc.includedPowerConnector
        || (esc.powerConnection === "solder-pads"
          ? "Solder pads"
          : esc.powerConnection === "supplied-cable"
            ? "Termination unspecified"
            : ""),
      check: checkPowerConnector(battery, esc),
    }));
  }
  return rows;
}

function statusLabel(status) {
  if (status === "compatible") return "Matched";
  if (status === "measured") return "Measured";
  if (status === "conflict") return "Conflict";
  return "Needs data";
}

function StatusIcon({ status }) {
  if (status === "compatible") return <Check size={14} aria-hidden="true" />;
  if (status === "measured") return <Ruler size={14} aria-hidden="true" />;
  if (status === "conflict") return <CircleAlert size={14} aria-hidden="true" />;
  return <Link2 size={14} aria-hidden="true" />;
}

export default function AssemblyInterfaceMap(props) {
  const rows = getAssemblyInterfaces(props);
  if (rows.length === 0) return null;

  const conflictCount = rows.filter((row) => row.status === "conflict").length;
  const unknownCount = rows.filter((row) => row.status === "unknown").length;
  const matchedCount = rows.length - conflictCount - unknownCount;

  return (
    <details className="assembly-interface-map">
      <summary>
        <Link2 size={16} aria-hidden="true" />
        <span>
          <strong>Mounting interfaces</strong>
          <small>Catalogued frame, shaft, stack, and power connections</small>
        </span>
        <em className={
          conflictCount
            ? "is-conflict"
            : unknownCount ? "is-review" : "is-complete"
        }>
          {conflictCount
            ? `${conflictCount} conflict${conflictCount === 1 ? "" : "s"}`
            : unknownCount
              ? `${matchedCount} matched · ${unknownCount} to verify`
              : `${matchedCount} matched`}
        </em>
      </summary>
      <div className="assembly-interface-map-body">
        <p>
          These are catalog interface values, not a physical inspection.
          Confirm each joint after assembly and before power.
        </p>
        <ol aria-label="Assembly mounting interfaces">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`is-${row.status}`}
              aria-label={row.title}
            >
              <div className="assembly-interface-endpoints">
                <span>
                  <small>{row.title.split(" to ")[0]}</small>
                  <strong>{row.from}</strong>
                  <em>{row.fromValue}</em>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
                <span>
                  <small>{row.title.split(" to ")[1]}</small>
                  <strong>{row.to}</strong>
                  <em>{row.toValue}</em>
                </span>
              </div>
              <div className="assembly-interface-result">
                <StatusIcon status={row.status} />
                <span>
                  <strong>{statusLabel(row.status)}</strong>
                  <small>{row.message}</small>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
