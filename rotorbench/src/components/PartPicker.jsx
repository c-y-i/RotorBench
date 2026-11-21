import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BatteryCharging,
  Box,
  Check,
  ChevronDown,
  Cog,
  Cpu,
  ExternalLink,
  Fan,
  Info,
  Radio,
  Search,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { readJsonStorage, writeJsonStorage } from "../utils/storage";
import { hasCatalogModel } from "../utils/modelAssets";
import { humanizeProvenanceFields } from "../utils/provenanceLabels";
import { getCatalogBoardProfile } from "../data/flightControllerProfiles";

const categoryDetails = {
  frames: { label: "Frame", Icon: Box },
  motors: { label: "Motor", Icon: Cog },
  propellers: { label: "Propeller", Icon: Fan },
  batteries: { label: "Battery", Icon: BatteryCharging },
  escs: { label: "ESC", Icon: Zap },
  flight_controllers: { label: "Flight controller", Icon: Cpu },
  receivers: { label: "Receiver", Icon: Radio },
};

function getMeta(category, part) {
  switch (category) {
    case "frames":
      return [`${part.size} mm wheelbase`, `${part.weight} g`, `up to ${part.maxPropSize}" props`];
    case "motors":
      return [
        `${part.kv} KV`,
        part.size,
        `${part.voltage.min}-${part.voltage.max} V`,
        `${part.weight} g`,
        part.performanceDataStatus === "published_prop_specific_tables_not_normalized"
          ? "Published prop tests not normalized"
          : null,
      ].filter(Boolean);
    case "propellers":
      return [
        `${part.size}"`,
        `${part.pitch}" pitch`,
        `${part.bladeCount} blades`,
        `${part.weight} g`,
        part.performanceDataStatus === "not_published"
          ? "Thrust data unavailable"
          : null,
      ].filter(Boolean);
    case "batteries":
      return [
        `${part.cells}S`,
        `${part.capacity} mAh`,
        `${part.cRating}C`,
        `${part.weight} g`,
        part.dischargeConnector ? `${part.dischargeConnector} connector` : null,
      ].filter(Boolean);
    case "escs":
      return [
        `${part.currentRating}A continuous`,
        `${part.burstCurrent}A burst`,
        `${part.weight} g`,
        part.includedPowerConnector
          ? `${part.includedPowerConnector} power lead`
          : part.powerConnection === "solder-pads"
            ? "Solder pads"
            : part.powerConnection === "supplied-cable"
              ? "Cable, connector unspecified"
              : null,
      ].filter(Boolean);
    case "flight_controllers":
      return [
        part.processor,
        part.imu,
        `${part.weight} g`,
        getCatalogBoardProfile(part)
          ? "Documented setup map"
          : "Custom mapping required",
      ];
    case "receivers":
      return [
        part.protocol,
        part.frequencyBands?.join(" / "),
        part.telemetryPowerMw
          ? `${part.telemetryPowerMw} mW telemetry`
          : null,
        `${part.channels} channels`,
        `${part.weight} g`,
      ].filter(Boolean);
    default:
      return [];
  }
}

function searchText(part, category) {
  return [
    part.name,
    part.manufacturer,
    part.size,
    part.kv,
    ...getMeta(category, part),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function PartPicker({
  category,
  parts,
  value,
  onChange,
  compatibility,
  placeholder,
}) {
  const dialogRef = useRef(null);
  const optionRefs = useRef([]);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [sortMode, setSortMode] = useState("best");
  const [showSources, setShowSources] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const recentStorageKey = `rotorbench:part-picker:recent:${category}`;
  const [recentIds, setRecentIds] = useState(() => {
    const stored = readJsonStorage(recentStorageKey, []);
    return Array.isArray(stored) ? stored : [];
  });
  const selected = parts.find((part) => part.id === value) || null;
  const { label, Icon } = categoryDetails[category];

  const rankedParts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return parts
      .map((part) => {
        const result = compatibility?.(part) || {
          ok: true,
          verified: false,
          reason: "No physical-fit checks apply to this selection.",
        };
        return { part, ...result, recent: recentIds.includes(part.id) };
      })
      .filter(({ part }) => !term || searchText(part, category).includes(term))
      .filter(({ ok, part, verified }) => {
        if (resultFilter === "compatible") return ok;
        if (resultFilter === "verified") return ok && verified;
        if (resultFilter === "conflict") return !ok;
        if (resultFilter === "source") return Boolean(part.sourceUrl);
        if (resultFilter === "model") return hasCatalogModel(part, category);
        if (resultFilter === "recent") return recentIds.includes(part.id);
        return true;
      })
      .sort((a, b) => {
        const comparable = (value) => (
          Number.isFinite(Number(value)) ? Number(value) : Number.POSITIVE_INFINITY
        );
        if (sortMode === "evidence") {
          const evidenceRank = (result) => (
            result.part.sourceUrl ? 0 : 1
          );
          const estimatedRank = (result) => (
            Array.isArray(result.part.estimatedFields)
              ? result.part.estimatedFields.length
              : 0
          );
          return evidenceRank(a) - evidenceRank(b)
            || estimatedRank(a) - estimatedRank(b)
            || a.part.name.localeCompare(b.part.name);
        }
        if (sortMode === "price") {
          return comparable(a.part.price) - comparable(b.part.price)
            || a.part.name.localeCompare(b.part.name);
        }
        if (sortMode === "weight") {
          return comparable(a.part.weight) - comparable(b.part.weight)
            || a.part.name.localeCompare(b.part.name);
        }
        if (sortMode !== "name") {
          const rank = (result) => (
            !result.ok ? 2 : result.verified ? 0 : 1
          );
          if (rank(a) !== rank(b)) return rank(a) - rank(b);
        }
        return a.part.name.localeCompare(b.part.name);
      });
  }, [category, compatibility, parts, query, recentIds, resultFilter, sortMode]);
  const sourceCount = rankedParts.filter(({ part }) => (
    part.sourceUrl || part.priceSourceUrl || part.connectorSourceUrl
  )).length;

  const openPicker = () => {
    setQuery("");
    setResultFilter("all");
    setSortMode("best");
    setShowSources(false);
    setActiveIndex(0);
    dialogRef.current?.showModal();
  };

  const resetSearchAndFilters = () => {
    setQuery("");
    setResultFilter("all");
    setSortMode("best");
    setActiveIndex(0);
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [query, resultFilter, sortMode]);

  const closePicker = () => {
    setShowSources(false);
    dialogRef.current?.close();
  };

  const choose = (partId) => {
    const nextRecentIds = [
      partId,
      ...recentIds.filter((id) => id !== partId),
    ].slice(0, 5);
    setRecentIds(nextRecentIds);
    writeJsonStorage(recentStorageKey, nextRecentIds);
    onChange(partId);
    closePicker();
  };

  const clear = () => {
    onChange("");
    closePicker();
  };

  const focusResult = (index) => {
    if (rankedParts.length === 0) return;
    const nextIndex = Math.max(0, Math.min(index, rankedParts.length - 1));
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  const handleResultsKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusResult(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusResult(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusResult(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusResult(rankedParts.length - 1);
    }
  };

  const triggerTitle = selected?.name || placeholder;
  const triggerMetaParts = selected ? getMeta(category, selected) : ["Open part catalog"];
  const triggerMeta = triggerMetaParts.join(" · ");

  return (
    <div className="part-picker">
      <button
        type="button"
        className={`part-picker-trigger ${selected ? "has-selection" : ""}`}
        aria-haspopup="dialog"
        onClick={openPicker}
      >
        <span className="part-picker-trigger-icon"><Icon size={17} aria-hidden="true" /></span>
        <span className="part-picker-trigger-copy">
          <strong>{triggerTitle}</strong>
          <small>{triggerMeta}</small>
        </span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        className="part-picker-dialog"
        aria-labelledby={`part-picker-title-${category}`}
        onClose={() => {
          setQuery("");
          setShowSources(false);
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePicker();
        }}
      >
        <div className="part-picker-sheet">
          <header className="part-picker-heading">
            <div>
              <span>{parts.length} catalog options</span>
              <h2 id={`part-picker-title-${category}`}>Select {label.toLowerCase()}</h2>
            </div>
            <button type="button" className="part-picker-close" aria-label="Close part picker" onClick={closePicker}>
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="part-picker-toolbar">
            <label className="part-picker-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && rankedParts.length > 0) {
                    event.preventDefault();
                    focusResult(0);
                  }
                }}
                placeholder={`Search ${label.toLowerCase()}s by name or spec`}
                aria-label={`Search ${label.toLowerCase()}s`}
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
            <button
              type="button"
              className={`part-picker-source-toggle ${showSources ? "is-active" : ""}`}
              aria-pressed={showSources}
              aria-label={
                showSources
                  ? "Show catalog parts"
                  : `Review catalog sources: ${sourceCount}`
              }
              disabled={!showSources && sourceCount === 0}
              onClick={() => setShowSources((current) => !current)}
            >
              <ExternalLink size={15} aria-hidden="true" />
              <span>{showSources ? "Parts" : "Sources"}</span>
              <small>{sourceCount}</small>
            </button>
          </div>

          <div className="part-picker-filters" role="group" aria-label="Filter catalog results">
            {[
              ["all", "All"],
              ["compatible", "No known conflict"],
              ["verified", "Verified fit"],
              ["conflict", "Review conflicts"],
              ["source", "Source-backed"],
              ["model", "3D ready"],
              ["recent", "Recent"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={resultFilter === value ? "is-active" : ""}
                aria-pressed={resultFilter === value}
                onClick={() => setResultFilter(value)}
              >
                {label}
              </button>
            ))}
            <label className="part-picker-sort">
              <span>Sort</span>
              <select
                aria-label="Sort catalog results"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
              >
                <option value="best">Best fit</option>
                <option value="evidence">Evidence: strongest</option>
                <option value="price">Price: low</option>
                <option value="weight">Weight: low</option>
                <option value="name">Name</option>
              </select>
            </label>
            <span>{rankedParts.length} options</span>
          </div>

          {showSources ? (
            <div
              className="part-source-index"
              id={`part-picker-source-index-${category}`}
              role="region"
              aria-label={`${label} sources`}
            >
              <header>
                <strong>Manufacturer and catalog references</strong>
                <span>{sourceCount} items with references in this filtered view</span>
              </header>
              {sourceCount === 0 ? (
                <div className="part-source-empty">
                  <ExternalLink size={22} aria-hidden="true" />
                  <strong>No references in this view</strong>
                  <span>Change the search or filters, or return to catalog parts.</span>
                  <button
                    type="button"
                    className="part-picker-reset"
                    onClick={resetSearchAndFilters}
                  >
                    Reset search and filters
                  </button>
                </div>
              ) : (
                rankedParts.filter(({ part }) => (
                  part.sourceUrl || part.priceSourceUrl || part.connectorSourceUrl
                )).map(({ part }) => (
                  <article key={part.id} className="part-source-row">
                    <span className="part-source-copy">
                      <small>{label}</small>
                      <strong>{part.name}</strong>
                      <em>{getMeta(category, part).join(" · ")}</em>
                    </span>
                    <span className="part-source-links">
                      {part.sourceUrl && (
                        <a
                          href={part.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open product source for ${part.name}`}
                        >
                          Product source <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                      {part.priceSourceUrl && (
                        <a
                          href={part.priceSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open price source for ${part.name}`}
                        >
                          Price source <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                      {part.connectorSourceUrl && (
                        <a
                          href={part.connectorSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open connector source for ${part.name}`}
                        >
                          Connector source <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </span>
                  </article>
                ))
              )}
            </div>
          ) : rankedParts.length === 0 ? (
            <div className="part-picker-empty" role="status">
              <Search size={22} aria-hidden="true" />
              <strong>No matching {label.toLowerCase()}s</strong>
              <span>Try a manufacturer, size, KV, voltage, or capacity.</span>
              <button
                type="button"
                className="part-picker-reset"
                onClick={resetSearchAndFilters}
              >
                Reset search and filters
              </button>
            </div>
          ) : (
            <div
              className="part-picker-results"
              role="listbox"
              aria-label={`${label} options`}
              onKeyDown={handleResultsKeyDown}
            >
              {rankedParts.map(({ part, ok, reason, verified, recent }, index) => {
                  const isSelected = part.id === value;
                  const estimatedFields = humanizeProvenanceFields(part.estimatedFields);
                  const statusClass = !ok
                    ? "is-check"
                    : verified
                      ? "is-compatible"
                      : "is-unverified";
                  return (
                    <button
                      type="button"
                      key={part.id}
                      ref={(node) => { optionRefs.current[index] = node; }}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={activeIndex === index ? 0 : -1}
                      className={`part-option ${isSelected ? "is-selected" : ""} ${ok ? "" : "is-warning"}`}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => choose(part.id)}
                    >
                      <span className="part-option-icon"><Icon size={18} aria-hidden="true" /></span>
                      <span className="part-option-copy">
                        <span className="part-option-name">
                          <strong>{part.name}</strong>
                          {isSelected && <Check size={15} aria-label="Selected" />}
                        </span>
                        <span className="part-option-meta">{getMeta(category, part).join(" · ")}</span>
                        <span className={`part-option-status ${statusClass}`}>
                          {!ok || verified
                            ? ok
                              ? <Check size={12} aria-hidden="true" />
                              : <TriangleAlert size={12} aria-hidden="true" />
                            : <Info size={12} aria-hidden="true" />}
                          {!ok
                            ? reason
                            : verified
                              ? "Compatible and physically checked"
                              : reason || "No known conflict; fit data is incomplete"}
                        </span>
                        <span className="part-option-provenance">
                          {recent ? "Recent · " : ""}
                          {part.sourceUrl ? "Source-backed" : "Legacy catalog"}
                        </span>
                        {estimatedFields.length > 0 && (
                          <span className="part-option-estimates">
                            Estimated: {estimatedFields.join(" · ")}
                          </span>
                        )}
                      </span>
                      <span className="part-option-price">
                        <strong>${Number(part.price).toFixed(2)}</strong>
                        <small>
                          {hasCatalogModel(part, category) ? "Catalog GLB" : "Geometry fallback"}
                        </small>
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          <footer className="part-picker-footer">
            {selected && (
              <button type="button" className="part-picker-clear" onClick={clear}>
                Clear {label.toLowerCase()}
              </button>
            )}
            <button type="button" className="part-picker-cancel" onClick={closePicker}>
              Close
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
