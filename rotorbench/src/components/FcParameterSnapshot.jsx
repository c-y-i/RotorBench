import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

const GROUPS = [
  {
    id: "arming",
    label: "Arming and receiver",
    matches: (name) => (
      name === "brd_alt_config"
      || name === "rssi_type"
      || name === "rc_protocols"
      || /^serial[1-8]_(?:protocol|baud)$/.test(name)
    ),
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
      const group = GROUPS.find((candidate) => (
        candidate.names.has(name) || candidate.matches?.(name)
      ))
        || grouped.get("other");
      grouped.get(group.id).entries.push({ name, value: String(value) });
    });

  return [...grouped.values()].filter((group) => group.entries.length > 0);
}

const STATUS_LABELS = {
  pass: "Matches plan",
  fail: "Differs",
  unverified: "Unverified",
};

const FORMAT_LABELS = {
  "aerial-kit": "Aerial Kit",
  "mission-planner": "Mission Planner",
  qgroundcontrol: "QGroundControl",
};

const parameterCheckId = (name) => `fc-param-${name.replaceAll("_", "-")}`;

export default function FcParameterSnapshot({
  values = {},
  checks = [],
  format = null,
}) {
  const [query, setQuery] = useState("");
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const groups = useMemo(() => {
    const statusByCheckId = new Map(checks.map((check) => [check.id, check.status]));
    return groupFcParameters(values).map((group) => ({
      ...group,
      entries: group.entries.map((entry) => {
        const status = statusByCheckId.get(parameterCheckId(entry.name)) || "observed";
        return {
          ...entry,
          status,
          statusLabel: STATUS_LABELS[status] || "Observed",
        };
      }),
    }));
  }, [checks, values]);
  const matches = groups.flatMap((group) => group.entries)
    .filter((entry) => entry.status === "pass").length;
  const differences = groups.flatMap((group) => group.entries)
    .filter((entry) => entry.status === "fail").length;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = groups.map((group) => ({
    ...group,
    entries: group.entries.filter(({ name, value, status, statusLabel }) => {
      const matchesQuery = !normalizedQuery
        || name.includes(normalizedQuery)
        || value.toLowerCase().includes(normalizedQuery)
        || statusLabel.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (!differencesOnly || status === "fail");
    }),
  })).filter((group) => group.entries.length > 0);
  const parameterCount = Object.keys(values).length;
  const formatLabel = FORMAT_LABELS[format] || null;

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
            {formatLabel ? ` · ${formatLabel}` : ""}
            {checks.length
              ? ` · ${matches} match${matches === 1 ? "" : "es"} · ${differences} differ${differences === 1 ? "s" : ""}`
              : ""}
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
        {differences > 0 && (
          <button
            type="button"
            className="fc-parameter-difference-filter"
            aria-pressed={differencesOnly}
            onClick={() => setDifferencesOnly((current) => !current)}
          >
            Differences only · {differences}
          </button>
        )}
        {visibleGroups.length ? (
          <div className="fc-parameter-groups">
            {visibleGroups.map((group) => (
              <section key={group.id} aria-label={`${group.label} parameters`}>
                <h5>{group.label}</h5>
                <dl>
                  {group.entries.map(({ name, value, status, statusLabel }) => (
                    <div key={name}>
                      <dt>
                        <span>{name}</span>
                        <em className={`is-${status}`}>{statusLabel}</em>
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <div className="fc-parameter-empty">
            <span>
              {differencesOnly
                ? "No imported parameters differ from the staged plan."
                : `No observed parameters match “${query}”.`}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDifferencesOnly(false);
              }}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
