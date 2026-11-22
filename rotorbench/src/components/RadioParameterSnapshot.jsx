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

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "review", label: "Needs review" },
  { id: "differences", label: "Differences" },
];

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const groups = useMemo(() => {
    const statusByCheckId = new Map(checks.map((check) => [check.id, check.status]));
    const grouped = groupRadioParameters(entries);
    const observedCheckIds = new Set(
      entries.map((entry) => CHECK_IDS[entry.name]).filter(Boolean),
    );
    const groupsById = new Map(grouped.map((group) => [group.id, group]));
    checks
      .filter((check) => (
        Object.values(CHECK_IDS).includes(check.id)
        && check.status === "unverified"
        && !observedCheckIds.has(check.id)
      ))
      .forEach((check) => {
        const name = Object.entries(CHECK_IDS)
          .find(([, checkId]) => checkId === check.id)?.[0];
        if (!name) return;
        const groupDefinition = GROUPS.find((group) => group.names.has(name)) || {
          id: "other",
          label: "Other observed",
        };
        let group = groupsById.get(groupDefinition.id);
        if (!group) {
          group = { ...groupDefinition, entries: [] };
          groupsById.set(groupDefinition.id, group);
        }
        group.entries.push({
          id: `plan-gap-${check.id}`,
          name,
          value: "Not in snapshot",
          type: "plan-check",
        });
      });
    return [...groupsById.values()].map((group) => ({
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
  const unverified = groups.flatMap((group) => group.entries)
    .filter((entry) => entry.status === "unverified").length;
  const reviewCount = differences + unverified;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = groups.map((group) => ({
    ...group,
    entries: group.id !== groupFilter && groupFilter !== "all"
      ? []
      : group.entries.filter((entry) => {
          const matchesQuery = !normalizedQuery
            || entry.name.toLowerCase().includes(normalizedQuery)
            || String(entry.value).toLowerCase().includes(normalizedQuery)
            || String(entry.type || "").toLowerCase().includes(normalizedQuery)
            || entry.statusLabel.toLowerCase().includes(normalizedQuery);
          const matchesStatus = statusFilter === "all"
            || (statusFilter === "review" && ["fail", "unverified"].includes(entry.status))
            || (statusFilter === "differences" && entry.status === "fail");
          return matchesQuery && matchesStatus;
        }),
  })).filter((group) => group.entries.length > 0);
  const visibleCount = groups.flatMap((group) => group.entries).length;
  const selectedGroupLabel = groups.find((group) => group.id === groupFilter)?.label;
  const filterCounts = {
    all: visibleCount,
    review: reviewCount,
    differences,
  };

  if (!entries.length) return null;

  return (
    <details
      className="fc-parameter-snapshot radio-parameter-snapshot"
      aria-label="Observed TX parameter snapshot"
    >
      <summary>
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>
          <strong>Observed TX parameter snapshot</strong>
          <small>
            {entries.length} read-only module value{entries.length === 1 ? "" : "s"}
            {checks.length
              ? ` · ${matches} match${matches === 1 ? "" : "es"} · ${differences} differ${differences === 1 ? "s" : ""} · ${unverified} unverified`
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
        <div className="fc-parameter-filter-controls">
          <label className="fc-parameter-group-filter">
            <span>Group</span>
            <select
              aria-label="Radio parameter group"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
            >
              <option value="all">All groups ({visibleCount})</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label} ({group.entries.length})
                </option>
              ))}
            </select>
          </label>
        {checks.length > 0 && (
          <div
            className="fc-parameter-filter-bar"
            role="group"
            aria-label="Filter observed radio parameters by plan status"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.id}
                aria-label={`${filter.label} · ${filterCounts[filter.id]}`}
                aria-pressed={statusFilter === filter.id}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
                <span>{filterCounts[filter.id]}</span>
              </button>
            ))}
          </div>
        )}
        </div>
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
              {statusFilter === "review"
                ? `No imported radio parameters need review${selectedGroupLabel ? ` in ${selectedGroupLabel}` : ""} against the staged plan.`
                : statusFilter === "differences"
                  ? `No imported radio parameters differ${selectedGroupLabel ? ` in ${selectedGroupLabel}` : ""} from the staged plan.`
                  : `No observed radio parameters match “${query}”${selectedGroupLabel ? ` in ${selectedGroupLabel}` : ""}.`}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setGroupFilter("all");
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
