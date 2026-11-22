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

export default function RadioParameterSnapshot({ entries = [] }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupRadioParameters(entries), [entries]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = normalizedQuery
    ? groups.map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => (
          entry.name.toLowerCase().includes(normalizedQuery)
          || String(entry.value).toLowerCase().includes(normalizedQuery)
          || String(entry.type || "").toLowerCase().includes(normalizedQuery)
        )),
      })).filter((group) => group.entries.length > 0)
    : groups;

  if (!entries.length) return null;

  return (
    <details className="fc-parameter-snapshot radio-parameter-snapshot">
      <summary>
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>
          <strong>Observed TX parameter snapshot</strong>
          <small>
            {entries.length} read-only module value{entries.length === 1 ? "" : "s"}
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
                      <dt>{entry.name}</dt>
                      <dd>{entry.value || "Empty"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <div className="fc-parameter-empty">
            <span>No observed radio parameters match “{query}”.</span>
            <button type="button" onClick={() => setQuery("")}>Clear filter</button>
          </div>
        )}
      </div>
    </details>
  );
}
