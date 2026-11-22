import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

const GROUPS = [
  {
    id: "arming",
    label: "Arming and receiver",
    names: new Set([
      "arm_channel",
      "arm_hold_ms",
      "arm_max_tilt_deg",
      "throttle_low",
      "rc_timeout_ms",
      "rc_protocol",
      "rc_min",
      "rc_mid",
      "rc_max",
      "rc_deadband",
    ]),
  },
  {
    id: "channels",
    label: "Modes and channels",
    names: new Set([
      "mode_channel",
      "velocity_channel",
      "mission_channel",
      "launch_channel",
      "manual_channel",
      "ctrl_channel",
      "sysid_channel",
    ]),
  },
  {
    id: "outputs",
    label: "Airframe and control loop",
    names: new Set([
      "airframe",
      "dshot_khz",
      "servo1_reverse",
      "servo1_trim_us",
      "servo1_travel_us",
      "servo2_reverse",
      "servo2_trim_us",
      "servo2_travel_us",
      "gyro_rate_hz",
      "pid_denom",
    ]),
  },
  {
    id: "launch",
    label: "Hand launch",
    names: new Set(["launch_throttle", "launch_climb_deg", "launch_timeout_s"]),
  },
  {
    id: "power",
    label: "Power and battery",
    names: new Set([
      "vbat_ratio",
      "vbat_cells",
      "vbat_warn_cell",
      "vbat_min_cell",
      "battery_rth",
    ]),
  },
  {
    id: "navigation",
    label: "Navigation and return",
    names: new Set([
      "fence_enable",
      "fence_radius_m",
      "fence_ceiling_m",
      "rth_min_alt_m",
      "gps_min_sats",
      "rth_enable",
      "align_roll_deg",
      "align_pitch_deg",
      "align_yaw_deg",
    ]),
  },
];

export function groupFcParameters(values = {}) {
  const grouped = new Map(
    GROUPS.map((group) => [group.id, { ...group, entries: [] }]),
  );
  grouped.set("other", {
    id: "other",
    label: "Other observed",
    entries: [],
  });

  Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([name, value]) => {
      const group = GROUPS.find((candidate) => candidate.names.has(name))
        || grouped.get("other");
      grouped.get(group.id).entries.push({ name, value: String(value) });
    });

  return [...grouped.values()].filter((group) => group.entries.length > 0);
}

export default function FcParameterSnapshot({ values = {} }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupFcParameters(values), [values]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = normalizedQuery
    ? groups.map((group) => ({
        ...group,
        entries: group.entries.filter(({ name, value }) => (
          name.includes(normalizedQuery)
          || value.toLowerCase().includes(normalizedQuery)
        )),
      })).filter((group) => group.entries.length > 0)
    : groups;
  const parameterCount = Object.keys(values).length;

  if (!parameterCount) return null;

  return (
    <details className="fc-parameter-snapshot">
      <summary>
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>
          <strong>Observed parameter snapshot</strong>
          <small>
            {parameterCount} read-only value{parameterCount === 1 ? "" : "s"} from
            the imported file
          </small>
        </span>
        <em>Not written</em>
      </summary>
      <div className="fc-parameter-snapshot-body">
        <label>
          <Search size={15} aria-hidden="true" />
          <span className="visually-hidden">Filter observed parameters</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter parameter names or values"
          />
        </label>
        <p>
          Values below are shown exactly as the imported snapshot reported them.
          RotorBench did not write, save, or re-read them from the controller.
        </p>
        {visibleGroups.length ? (
          <div className="fc-parameter-groups">
            {visibleGroups.map((group) => (
              <section key={group.id} aria-label={`${group.label} parameters`}>
                <h5>{group.label}</h5>
                <dl>
                  {group.entries.map(({ name, value }) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <div className="fc-parameter-empty">
            <span>No observed parameters match “{query}”.</span>
            <button type="button" onClick={() => setQuery("")}>Clear filter</button>
          </div>
        )}
      </div>
    </details>
  );
}
