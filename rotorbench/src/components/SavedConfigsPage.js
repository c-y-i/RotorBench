import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/home.css"; 
import "../styles/saved.css";
import API_BASE from "../config/api";

export default function SavedConfigsPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [message, setMessage] = useState({ type: "", text: "" });

    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem("userId");
    const handleDelete = async (id, name) => {
        if (userId === "leo" || !userId) {
            const offlineBuilds = JSON.parse(localStorage.getItem("offlineBuilds") || "[]");
            const updated = offlineBuilds.filter((b) => b.id !== id);
            localStorage.setItem("offlineBuilds", JSON.stringify(updated));
            setItems(updated);

            setMessage({ type: "success", text: `🗑 Deleted offline build "${name}" successfully.` });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/builds/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(await res.text());

            setItems((prev) => prev.filter((it) => it.id !== id));

            setMessage({ type: "success", text: `🗑 Deleted build "${name}" successfully.` });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (e) {
            setMessage({ type: "error", text: `❌ Failed to delete build: ${e.message}` });
            setTimeout(() => setMessage({ type: "", text: "" }), 4000);
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
                    const localBuilds = JSON.parse(localStorage.getItem("offlineBuilds") || "[]");
                    setItems(localBuilds);
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
            return name.includes(term) || note.includes(term);
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

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const CompRow = ({ label, value }) => (
        <div className="saved-row">
            <span className="saved-tag">{label}</span>
            <span className="saved-val">{value || "—"}</span>
        </div>
    );

    return (
        <div className={`app-container saved-page ${menuOpen ? "menu-open" : ""}`}>
            {message.text && (
                <div className={`message-bar ${message.type}`}>
                    {message.text}
                </div>
            )}
            {/* Top Bar */}
            <div className="top-bar">
                <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
                <div className="logo-area">
                    <img src={logo} alt="logo" className="logo-icon" />
                    <span className="logo-text">RotorBench</span>
                </div>
                <button className="icon-btn home-btn" onClick={() => navigate("/")}>🏠</button>
            </div>

            {/* Header + search */}
            <div className="page-header">
                <h2 className="page-title">Saved Configurations</h2>
                <div className="saved-toolbar">
                    <input
                        className="input-field"
                        placeholder="Search saved configs…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button className="action-btn analysis" onClick={() => navigate("/build", { state: { userId } })}>
                        + New Build
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
                    <p>⚠️ {error}</p>
                    <button className="action-btn analysis" onClick={() => navigate(0)}>Retry</button>
                </div>
            )}

            {/* List with dropdown per item */}
            {/* List of Saved Builds */}
            {!loading && !error && (
                <div className="analysis-content" style={{ padding: "0 14px 14px" }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="metric-card highlight">
                                <div className="metric-content">
                                    <div className="metric-label">No saved builds yet</div>
                                    <div className="metric-value">Create a build to see it here.</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ul className="saved-list">
                            {filtered.map((it) => {
                                const ids = it.componentIds || {};
                                const title = displayName(it);
                                const isOpen = expandedId === it.id;

                                return (
                                    <li key={it.id} className="saved-card">
                                        {/* Header */}
                                        <div className="saved-header">
                                            <div>
                                                <h3 className="saved-title">{title}</h3>
                                                <p className="saved-subtitle">
                                                    Updated {new Date(it.updatedAt || it.createdAt).toLocaleString()}
                                                </p>
                                                {it.note && <p className="saved-note">{it.note}</p>}
                                            </div>
                                        </div>

                                        <div className="saved-actions">
                                            <button
                                                className="action-btn"
                                                onClick={() => openWithAnalysis(it)}
                                                disabled={busyId === it.id}
                                            >
                                                📊 Analyze
                                            </button>
                                            <button
                                                className="action-btn secondary"
                                                onClick={() => toggleExpand(it.id)}
                                            >
                                                {isOpen ? "▾ Hide" : "▸ Components"}
                                            </button>
                                            <button
                                                className="action-btn danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(it.id, it.name);
                                                }}
                                            >
                                                🗑 Delete
                                            </button>
                                        </div>

                                        {/* Expandable Section */}
                                        {isOpen && (
                                            <div className="component-grid">
                                                <div className="component-card">
                                                    <div className="component-icon">🧱</div>
                                                    <div className="component-info">
                                                        <div className="component-label">Frame</div>
                                                        <div className="component-value">{ids.frameId || "—"}</div>
                                                    </div>
                                                </div>

                                                <div className="component-card">
                                                    <div className="component-icon">⚙️</div>
                                                    <div className="component-info">
                                                        <div className="component-label">Motor</div>
                                                        <div className="component-value">{ids.motorId || "—"}</div>
                                                    </div>
                                                </div>

                                                <div className="component-card">
                                                    <div className="component-icon">🌀</div>
                                                    <div className="component-info">
                                                        <div className="component-label">Propeller</div>
                                                        <div className="component-value">{ids.propellerId || "—"}</div>
                                                    </div>
                                                </div>

                                                <div className="component-card">
                                                    <div className="component-icon">🔋</div>
                                                    <div className="component-info">
                                                        <div className="component-label">Battery</div>
                                                        <div className="component-value">{ids.batteryId || "—"}</div>
                                                    </div>
                                                </div>

                                                <div className="component-card">
                                                    <div className="component-icon">🧠</div>
                                                    <div className="component-info">
                                                        <div className="component-label">Flight Controller</div>
                                                        <div className="component-value">{ids.flightControllerId || it.fcId || "—"}</div>
                                                    </div>
                                                </div>

                                                <div className="component-card">
                                                    <div className="component-icon">📡</div>
                                                    <div className="component-info">
                                                        <div className="component-label">Receiver</div>
                                                        <div className="component-value">{ids.receiverId || "—"}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* Drawer */}
            {menuOpen && (
                <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-top-right">
                            <button className="icon-btn menu-btn" onClick={() => setMenuOpen(false)}>☰</button>
                        </div>
                        <button className="menu-item" onClick={() => { setMenuOpen(false); navigate("/build", { state: { userId } }); }}>
                            Build Configuration
                        </button>
                        <button className="menu-item" onClick={() => { setMenuOpen(false); navigate("/saved", { state: { userId } }); }}>
                            Saved Configurations
                        </button>
                        <button className="menu-item" onClick={() => { setMenuOpen(false); navigate("/profile", { state: { userId } }); }}>
                            Profile
                        </button>
                        <button className="menu-item" onClick={() => { setMenuOpen(false); navigate("/legal"); }}>
                            Legal & Disclaimer
                        </button>
                    </div>
                    <div className="menu-backdrop" />
                </div>
            )}
        </div>
    );
}
