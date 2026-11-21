import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css"; 
import "../styles/saved.css";
import "../styles/modernization.css";
import API_BASE from "../config/api";
import componentsData from "../data/components.json";
import {
  BatteryCharging,
  Box,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Cog,
  Columns3,
  Copy,
  Cpu,
  Fan,
  FolderOpen,
  Pencil,
  Plus,
  Radio,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  cloneBuild,
  copyHardwarePlans,
  renameBuild,
} from "../utils/savedBuilds";
import { copyBenchEvidenceAttachment } from "../utils/benchEvidenceAttachment";
import { summarizeBuild } from "../utils/buildComparison";
import { parseBuildSheetJson } from "../utils/buildSheet";
import { readJsonStorage, writeJsonStorage } from "../utils/storage";

const componentDefinitions = [
    { key: "frameId", category: "frames", label: "Frame", Icon: Box },
    { key: "motorId", category: "motors", label: "Motor", Icon: Cog },
    { key: "propellerId", category: "propellers", label: "Propeller", Icon: Fan },
    { key: "batteryId", category: "batteries", label: "Battery", Icon: BatteryCharging },
    { key: "escId", category: "escs", label: "ESC", Icon: Zap },
    { key: "flightControllerId", category: "flight_controllers", label: "Flight controller", Icon: Cpu },
    { key: "receiverId", category: "receivers", label: "Receiver", Icon: Radio },
];

const getBuildComponents = (build) => {
    const ids = build?.componentIds || {};
    return componentDefinitions.map((definition) => ({
        ...definition,
        part: componentsData[definition.category]?.find((part) => part.id === ids[definition.key]) || null,
    }));
};

const formatSavedDate = (value) => {
    if (!value) return "Update time unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Update time unavailable" : date.toLocaleString();
};

const fitLabels = {
    verified: "Fit verified",
    measured: "Fit measured locally",
    unverified: "Fit review",
    conflict: "Fit conflict",
    pending: "Fit unchecked",
};

export default function SavedConfigsPage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [q, setQ] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [comparisonIds, setComparisonIds] = useState([]);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    const navigate = useNavigate();
    const userId = localStorage.getItem("userId");

    const setTransientMessage = (type, text, delay = 3000) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: "", text: "" }), delay);
    };

    const createBuildId = () => (
        window.crypto?.randomUUID?.()
        || `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    const handleDelete = async (id, name) => {
        if (userId === "leo" || !userId) {
            const stored = readJsonStorage("offlineBuilds", []);
            const offlineBuilds = Array.isArray(stored) ? stored : [];
            const updated = offlineBuilds.filter((b) => b.id !== id);
            if (!writeJsonStorage("offlineBuilds", updated)) {
                setTransientMessage("error", "The browser could not update saved builds.", 4000);
                return;
            }
            setItems(updated);

            setMessage({ type: "success", text: `Deleted offline build "${name}".` });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(await res.text());

            setItems((prev) => prev.filter((it) => it.id !== id));

            setMessage({ type: "success", text: `Deleted build "${name}".` });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (e) {
            setMessage({ type: "error", text: `Could not delete build: ${e.message}` });
            setTimeout(() => setMessage({ type: "", text: "" }), 4000);
        }
    };

    const handleDuplicate = async (item) => {
        const title = displayName(item);
        const newId = createBuildId();
        const duplicate = cloneBuild(item, newId, `${title} copy`);
        if (userId) duplicate.userId = userId;

        if (userId === "leo" || !userId) {
            try {
                const updated = [duplicate, ...items];
                if (!writeJsonStorage("offlineBuilds", updated)) {
                    throw new Error("storage unavailable");
                }
                setItems(updated);
                const copiedPlans = copyHardwarePlans(item.id, newId);
                const copiedEvidence = copyBenchEvidenceAttachment(item.id, newId);
                setTransientMessage(
                    "success",
                    `Duplicated "${title}"${copiedPlans
                        ? ` with ${copiedPlans} hardware plan${copiedPlans === 1 ? "" : "s"}`
                        : ""}${copiedEvidence
                        ? `${copiedPlans ? " and" : " with"} the imported evidence review`
                        : ""}.`,
                );
            } catch {
                setTransientMessage("error", "The browser could not store the duplicate.", 4000);
            }
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/builds`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(duplicate),
            });
            if (!res.ok) throw new Error(await res.text());
            const saved = await res.json();
            setItems((current) => [saved, ...current]);
            const copiedPlans = copyHardwarePlans(item.id, saved.id);
            const copiedEvidence = copyBenchEvidenceAttachment(item.id, saved.id);
            setTransientMessage(
                "success",
                `Duplicated "${title}"${copiedPlans
                    ? ` with ${copiedPlans} hardware plan${copiedPlans === 1 ? "" : "s"}`
                    : ""}${copiedEvidence
                    ? `${copiedPlans ? " and" : " with"} the imported evidence review`
                    : ""}.`,
            );
        } catch (e) {
            setTransientMessage("error", `Could not duplicate build: ${e.message}`, 4000);
        }
    };

    const startRename = (item) => {
        setRenamingId(item.id);
        setRenameValue(displayName(item));
    };

    const cancelRename = () => {
        setRenamingId(null);
        setRenameValue("");
    };

    const handleRename = async (event, item) => {
        event.preventDefault();
        const name = renameValue.trim();
        if (!name) {
            setTransientMessage("error", "Build name cannot be empty.", 3000);
            return;
        }
        const renamed = renameBuild(item, name);

        if (userId === "leo" || !userId) {
            try {
                const updated = items.map((build) => build.id === item.id ? renamed : build);
                if (!writeJsonStorage("offlineBuilds", updated)) {
                    throw new Error("storage unavailable");
                }
                setItems(updated);
                cancelRename();
                setTransientMessage("success", `Renamed build to "${name}".`);
            } catch {
                setTransientMessage("error", "The browser could not save the new name.", 4000);
            }
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE}/api/builds/${encodeURIComponent(item.id)}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(renamed),
                },
            );
            if (!res.ok) throw new Error(await res.text());
            const saved = await res.json();
            setItems((current) =>
                current.map((build) => build.id === item.id ? saved : build),
            );
            cancelRename();
            setTransientMessage("success", `Renamed build to "${name}".`);
        } catch (e) {
            setTransientMessage("error", `Could not rename build: ${e.message}`, 4000);
        }
    };

    const handleImportSheet = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const parsed = parseBuildSheetJson(await file.text());
            const imported = {
                ...parsed,
                id: createBuildId(),
                name: `${parsed.name} (imported)`,
            };
            if (userId) imported.userId = userId;

            if (userId === "leo" || !userId) {
                const updated = [imported, ...items];
                if (!writeJsonStorage("offlineBuilds", updated)) {
                    throw new Error("the browser could not store the imported build");
                }
                setItems(updated);
            } else {
                const res = await fetch(`${API_BASE}/api/builds`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(imported),
                });
                if (!res.ok) throw new Error(await res.text());
                const saved = await res.json();
                setItems((current) => [saved, ...current]);
            }
            setTransientMessage("success", `Imported build sheet "${parsed.name}".`);
        } catch (e) {
            setTransientMessage("error", `Could not import build sheet: ${e.message}`, 5000);
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                // Case 1: User is logged in
                if (userId && userId !== "leo") {
                    const res = await fetch(`${API_BASE}/api/builds?userId=${encodeURIComponent(userId)}`);
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
                        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
                        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
                        return tb - ta;
                    });
                    setItems(sorted);
                }
                // Case 2: Not logged in -> Read localStorage
                else {
                    const localBuilds = readJsonStorage("offlineBuilds", []);
                    setItems(Array.isArray(localBuilds) ? localBuilds : []);
                }
            } catch (e) {
                setError(e.message || "Failed to load saved builds");
            } finally {
                setLoading(false);
            }
        })();
    }, [userId]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return items;
        return items.filter((it) => {
            const idx = items.indexOf(it);
            const fallbackName = `Saved Config #${idx + 1}`;
            const name = (it.name || fallbackName || it.id || "").toLowerCase();
            const note = (it.note || "").toLowerCase();
            const componentNames = getBuildComponents(it)
                .map(({ part }) => part?.name || "")
                .join(" ")
                .toLowerCase();
            return name.includes(term) || note.includes(term) || componentNames.includes(term);
        });
    }, [items, q]);

    const displayName = (it) => {
        const idx = items.indexOf(it);
        return it.name && it.name.trim()
            ? it.name
            : `Saved Config #${idx + 1}`;
    };

    const openWithAnalysis = (build) => {
        // Pass the build directly to /analysis, with subsequent analysis handled uniformly by AnalysisPage.
        navigate("/analysis", { state: { build, userId } });
    };

    const openWithSetup = (build) => {
        navigate("/setup", { state: { build, userId } });
    };

    const openWithBuild = (build) => {
        navigate("/build", { state: { build, userId } });
    };

    const toggleComparison = (id) => {
        setComparisonIds((current) => {
            if (current.includes(id)) return current.filter((value) => value !== id);
            if (current.length < 2) return [...current, id];
            return [current[1], id];
        });
    };

    const openComparison = () => {
        const builds = comparisonIds
            .map((id) => items.find((item) => item.id === id))
            .filter(Boolean)
            .slice(0, 2);
        if (builds.length === 2) {
            navigate("/compare", { state: { builds } });
        }
    };

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    return (
        <div className="app-container saved-page">
            {message.text && (
                <div className={`message-bar ${message.type}`}>
                    {message.text}
                </div>
            )}
            {/* Header + search */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Saved builds</h1>
                    <p className="page-subtitle">Return to a configuration, compare components, or run it through analysis again.</p>
                </div>
                <div className="saved-toolbar">
                    <label className="saved-search-field">
                        <Search size={16} aria-hidden="true" />
                        <input
                            className="input-field"
                            aria-label="Search saved builds"
                            placeholder="Search saved builds"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </label>
                    <button className="action-btn analysis" onClick={() => navigate("/build?new=1")}>
                        <Plus size={17} aria-hidden="true" />
                        New build
                    </button>
                    <label className="action-btn secondary saved-import-action">
                        <Upload size={17} aria-hidden="true" />
                        Import sheet
                        <input
                            className="saved-import-input"
                            type="file"
                            accept="application/json,.json"
                            aria-label="Import RotorBench build sheet"
                            onChange={handleImportSheet}
                        />
                    </label>
                    <button
                        className="action-btn secondary"
                        onClick={openComparison}
                        disabled={comparisonIds.length !== 2}
                    >
                        <Columns3 size={17} aria-hidden="true" />
                        Compare {comparisonIds.length ? `${comparisonIds.length}/2` : ""}
                    </button>
                </div>
            </div>

            {/* Loading / Error */}
            {loading && (
                <div className="loading-container">
                    <div className="spinner" />
                    <p>Loading saved builds…</p>
                </div>
            )}
            {!loading && error && (
                <div className="error-message">
                    <p><CircleAlert size={17} aria-hidden="true" />{error}</p>
                    <button className="action-btn analysis" onClick={() => navigate(0)}>Retry</button>
                </div>
            )}

            {/* List with dropdown per item */}
            {/* List of Saved Builds */}
            {!loading && !error && (
                <div className="analysis-content" style={{ padding: "0 14px 14px" }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <FolderOpen size={28} strokeWidth={1.5} aria-hidden="true" />
                            <h3>{items.length ? "No matching builds" : "No saved builds yet"}</h3>
                            <p>{items.length ? "Try a different search term." : "Configure your first airframe and save it here."}</p>
                            <button className="action-btn analysis" onClick={() => navigate("/build?new=1")}>
                                <Plus size={17} aria-hidden="true" />
                                Create a build
                            </button>
                        </div>
                    ) : (
                        <ul className="saved-list">
                            {filtered.map((it) => {
                                const title = displayName(it);
                                const isOpen = expandedId === it.id;
                                const componentRows = getBuildComponents(it);
                                const selectedRows = componentRows.filter(({ part }) => part);
                                const previewRows = selectedRows.slice(0, 4);
                                const buildSummary = summarizeBuild(it);
                                const hasPowerPath = Boolean(
                                    componentRows.find(({ category }) => category === "batteries")?.part
                                    && componentRows.find(({ category }) => category === "escs")?.part,
                                );
                                const hardwarePlanStatus = buildSummary.hardwarePlanStatus;
                                const hardwareReadinessStatus = buildSummary.hardwareReadinessStatus;
                                const showHardwareState =
                                  hardwarePlanStatus !== "not-configured" ||
                                  buildSummary.hasHardwareParts;
                                const hardwareLabel =
                                  hardwarePlanStatus === "saved"
                                    ? `FC + radio · ${buildSummary.hardwareReadinessLabel}`
                                    : hardwarePlanStatus === "partial"
                                      ? "Hardware partial"
                                      : buildSummary.hasHardwareParts
                                        ? "Hardware plan missing"
                                        : buildSummary.hardwareReadinessLabel;

                                return (
                                    <li key={it.id} className="saved-card">
                                        {/* Header */}
                                        <div className="saved-header">
                                            <div className="saved-card-copy">
                                                <div className="saved-title-row">
                                                    {renamingId === it.id ? (
                                                        <form
                                                            className="saved-rename-form"
                                                            onSubmit={(event) => handleRename(event, it)}
                                                        >
                                                            <input
                                                                className="input-field"
                                                                aria-label={`Rename ${title}`}
                                                                value={renameValue}
                                                                autoFocus
                                                                onChange={(event) => setRenameValue(event.target.value)}
                                                            />
                                                            <button
                                                                type="submit"
                                                                aria-label="Save build name"
                                                            >
                                                                <Check size={15} aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label="Cancel rename"
                                                                onClick={cancelRename}
                                                            >
                                                                <X size={15} aria-hidden="true" />
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        <h2 className="saved-title">{title}</h2>
                                                    )}
                                                    <div className="saved-title-actions">
                                                        {showHardwareState && (
                                                            <span className={`saved-hardware-state is-${hardwareReadinessStatus}`}>
                                                                {hardwareLabel}
                                                            </span>
                                                        )}
                                                        <span className="saved-part-count">{selectedRows.length}/7 parts</span>
                                                        <label className="saved-compare-toggle">
                                                            <input
                                                                type="checkbox"
                                                                checked={comparisonIds.includes(it.id)}
                                                                onChange={() => toggleComparison(it.id)}
                                                            />
                                                            <span>Compare</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <p className="saved-subtitle">
                                                    Updated {formatSavedDate(it.updatedAt || it.createdAt)}
                                                </p>
                                                {it.note && <p className="saved-note">{it.note}</p>}
                                            </div>
                                        </div>

                                        <div className="saved-build-state" aria-label="Build readiness">
                                            <span className={`is-fit-${buildSummary.physicalFitStatus}`}>
                                                {fitLabels[buildSummary.physicalFitStatus]}
                                            </span>
                                            <span>
                                                {buildSummary.sourceBackedCount}/{buildSummary.selectedCount} sourced
                                            </span>
                                            {buildSummary.estimatedFieldCount > 0 && (
                                                <span>{buildSummary.estimatedFieldCount} estimated fields</span>
                                            )}
                                            {buildSummary.geometryFallbackCount > 0 && (
                                                <span>{buildSummary.geometryFallbackCount} geometry fallbacks</span>
                                            )}
                                            {buildSummary.hasHardwareParts && (
                                                <span className={`is-wiring-${buildSummary.receiverWiringStatus}`}>
                                                    {buildSummary.receiverWiringStatus === "documented"
                                                        ? "Pins documented"
                                                        : "Verify pins"}
                                                </span>
                                            )}
                                            {buildSummary.hasHardwareParts && (
                                                <span className={`is-host-${buildSummary.radioHostDocumented ? "documented" : "unverified"}`}>
                                                    {buildSummary.radioHostTransportLabel}
                                                </span>
                                            )}
                                            {hasPowerPath && (
                                                <span className={`is-power-${buildSummary.powerPathStatus}`}>
                                                    {buildSummary.powerPathLabel}
                                                </span>
                                            )}
                                            {buildSummary.benchEvidenceConfigured && (
                                                <span className={`saved-evidence-state is-${buildSummary.benchEvidenceStatus}`}>
                                                    {buildSummary.benchEvidenceLabel}
                                                </span>
                                            )}
                                        </div>

                                        <div className="saved-part-preview" aria-label="Selected components">
                                            {previewRows.length > 0 ? (
                                                <>
                                                    {previewRows.map(({ key, part, Icon }) => (
                                                        <span key={key}><Icon size={13} aria-hidden="true" />{part.name}</span>
                                                    ))}
                                                    {selectedRows.length > previewRows.length && (
                                                        <span>+{selectedRows.length - previewRows.length} more</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span>No components selected</span>
                                            )}
                                        </div>

                                        <div className="saved-actions">
                                            <div className="saved-actions-primary">
                                                <button
                                                    className="action-btn analysis"
                                                    onClick={() => openWithAnalysis(it)}
                                                >
                                                    <ChartNoAxesCombined size={16} aria-hidden="true" />
                                                    Analyze
                                                </button>
                                                <button
                                                    className="action-btn secondary"
                                                    onClick={() => openWithBuild(it)}
                                                >
                                                    <SlidersHorizontal size={16} aria-hidden="true" />
                                                    Edit
                                                </button>
                                            </div>
                                            <div className="saved-actions-secondary">
                                                <button
                                                    className="action-btn secondary"
                                                    onClick={() => toggleExpand(it.id)}
                                                >
                                                    {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                                                    {isOpen ? "Hide" : "Components"}
                                                </button>
                                                <button
                                                    className="action-btn secondary"
                                                    onClick={() => openWithSetup(it)}
                                                >
                                                    <Settings2 size={16} aria-hidden="true" />
                                                    Hardware
                                                </button>
                                                <button
                                                    className="action-btn secondary"
                                                    onClick={() => startRename(it)}
                                                >
                                                    <Pencil size={16} aria-hidden="true" />
                                                    Rename
                                                </button>
                                                <button
                                                    className="action-btn secondary"
                                                    onClick={() => handleDuplicate(it)}
                                                >
                                                    <Copy size={16} aria-hidden="true" />
                                                    Duplicate
                                                </button>
                                            </div>
                                            <div className="saved-actions-danger">
                                                <button
                                                    className="action-btn danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(it.id, title);
                                                    }}
                                                >
                                                    <Trash2 size={16} aria-hidden="true" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable Section */}
                                        {isOpen && (
                                            <div className="component-grid">
                                                {componentRows.map(({ key, label, part, Icon }) => (
                                                    <div className={`component-card ${part ? "" : "is-missing"}`} key={key}>
                                                        <div className="component-icon"><Icon size={18} aria-hidden="true" /></div>
                                                        <div className="component-info">
                                                            <div className="component-label">{label}</div>
                                                            <div className="component-value">{part?.name || "Not selected"}</div>
                                                            <div className="component-meta">{part ? part.modelStatus === "not_available" ? "Geometry fallback" : "3D model available" : "Empty slot"}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

        </div>
    );
}
