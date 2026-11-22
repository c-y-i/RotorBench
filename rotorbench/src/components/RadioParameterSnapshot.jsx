import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

const GROUPS = [
  {
    id: "link",
    label: "RF link",
    names: new Set(["Packet Rate", "Telem Ratio", "Switch Mode", "Link Mode"]),
  },
  {
    id: "power",
    label: "Power",
    names: new Set(["Max Power", "Dynamic"]),
  },
  {
    id: "endpoint",
    label: "Endpoint identity",
    names: new Set(["Model Match", "Bind Storage", "UID"]),
  },
];

const STATUS_LABELS = {
  pass: "Matches plan",
  fail: "Differs",
  unverified: "Unverified",
};

const CHECK_IDS = {
  "Packet Rate": "settings-packet-rate",
  "Telem Ratio": "settings-telemetry",
  "Switch Mode": "settings-switch-mode",
  "Link Mode": "settings-link-mode",
  "Max Power": "settings-power",
  Dynamic: "settings-dynamic-power",
  "Model Match": "settings-model-match",
};

export function groupRadioParameters(entries = []) {
  const grouped = new Map(
    GROUPS.map((group) => [group.id, { ...group, entries: [] }]),
  );
  grouped.set("other", {
    id: "other",
    label: "Other observed",
    entries: [],
  });

  entries.forEach((entry) => {
    const group = GROUPS.find((candidate) => candidate.names.has(entry.name))
      || grouped.get("other");
    grouped.get(group.id).entries.push(entry);
  });
  return [...grouped.values()].filter((group) => group.entries.length > 0);
}

export default function RadioParameterSnapshot({ entries = [], checks = [] }) {
  const [query, setQuery] = useState("");
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const groups = useMemo(() => {
    const statusByCheckId = new Map(checks.map((check) => [check.id, check.status]));
    return groupRadioParameters(entries).map((group) => ({
      ...group,
      entries: group.entries.map((entry) => {
        const status = statusByCheckId.get(CHECK_IDS[entry.name]) || "observed";
        return {
          ...entry,
          status,
          statusLabel: STATUS_LABELS[status] || "Observed",
        };
      }),
    }));
  }, [checks, entries]);
  const matches = groups.flatMap((group) => group.entries)
    .filter((entry) => entry.status === "pass").length;
  const differences = groups.flatMap((group) => group.entries)
    .filter((entry) => entry.status === "fail").length;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = groups.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => {
      const matchesQuery = !normalizedQuery
        || entry.name.toLowerCase().includes(normalizedQuery)
        || String(entry.value).toLowerCase().includes(normalizedQuery)
        || String(entry.type || "").toLowerCase().includes(normalizedQuery)
        || entry.statusLabel.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (!differencesOnly || entry.status === "fail");
    }),
  })).filter((group) => group.entries.length > 0);

  if (!entries.length) return null;

  return (
    <details className="fc-parameter-snapshot radio-parameter-snapshot">
      <summary>
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>
          <strong>Observed TX parameter snapshot</strong>
          <small>
            {entries.length} read-only module value{entries.length === 1 ? "" : "s"}
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
          <span className="visually-hidden">Filter observed radio parameters</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter radio names or values"
          />
        </label>
        <p>
          Values below are shown exactly as the imported ExpressLRS snapshot
          reported them. RotorBench did not write or save module parameters.
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
              <section
                key={group.id}
                aria-label={`${group.label} radio parameters`}
              >
                <h5>{group.label}</h5>
                <dl>
                  {group.entries.map((entry) => (
                    <div key={`${entry.id}-${entry.name}`}>
                      <dt>
                        <span>{entry.name}</span>
                        <em className={`is-${entry.status}`}>{entry.statusLabel}</em>
                      </dt>
                      <dd>{entry.value || "Empty"}</dd>
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
                ? "No imported radio parameters differ from the staged plan."
                : `No observed radio parameters match “${query}”.`}
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
