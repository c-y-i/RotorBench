import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/home.css";
import "../styles/analysis.css";     // reuse typography/sections/palette
import "../styles/profile.css";      // small profile-only tweaks
import logo from "../assets/logo.png";
import API_BASE from "../config/api";

export default function UserProfilePage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [edit, setEdit] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Pass userId via route state or default
    const userId = localStorage.getItem("userId") || null;
    const ghAvatar = (u) => (u ? `https://github.com/${u}.png` : "");
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        (async () => {
            const storedId = localStorage.getItem("userId");
            if (!storedId) {
                // Not logged in => Register as a new user
                setUser({
                    displayName: "",
                    email: "",
                    githubUsername: "",
                    preferences: { theme: "system", notifications: "enabled", language: "en-US" },
                });
                setEdit(true);
                setLoading(false);
                return;
            }

            // Logged in => Retrieve backend user information
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/users/${storedId}`);
                if (!res.ok) throw new Error("User not found, please re-register.");
                const data = await res.json();
                setUser(data);
            } catch (e) {
                localStorage.removeItem("userId");
                setError(e.message);
                setUser({
                    displayName: "",
                    email: "",
                    githubUsername: "",
                    preferences: { theme: "system", notifications: "enabled", language: "en-US" },
                });
                setEdit(true);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const onChange = (path, value) => {
        setUser(prev => {
            const next = { ...prev };
            if (path.startsWith("preferences.")) {
                const key = path.split(".")[1];
                next.preferences = { ...(next.preferences || {}), [key]: value };
            } else {
                next[path] = value;
            }
            return next;
        });
    };

    const saveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setError(null);
        setMessage({ type: "", text: "" });

        // Step 1: Basic Verification
        if (!user.email || user.email.trim() === "") {
            setSaving(false);
            setMessage({
                type: "error",
                text: "Please enter your email address to register.",
            });
            return;
        }

        try {
            const isNew = !user.id;
            const url = isNew
                ? `${API_BASE}/api/users` // New registration
                : `${API_BASE}/api/users/${user.id}`; // Update
            const method = isNew ? "POST" : "PUT";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Save failed");
            }

            const result = await response.json();
            const saved = result.user || result;
            setUser(saved);
            localStorage.setItem("userId", saved.id);

            // Step 2: Synchronise offline builds (offlineBuilds → user accounts)
            const offline = JSON.parse(localStorage.getItem("offlineBuilds") || "[]");
            if (offline.length > 0) {
                setMessage({
                    type: "info",
                    text: `☁️ Syncing ${offline.length} offline builds to your account...`,
                });

                for (const b of offline) {
                    try {
                        b.userId = saved.id; // Bound to the current user
                        await fetch(`${API_BASE}/api/builds`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(b),
                        });
                    } catch (e) {
                        console.error("Failed to sync build:", e);
                    }
                }

                // Clear local cache
                localStorage.removeItem("offlineBuilds");
                setMessage({
                    type: "success",
                    text: "✅ Offline builds successfully synced to your account!",
                });
            }

            // Step 3: Display the corresponding prompt based on the status
            if (result.isNew === false) {
                setMessage({
                    type: "success",
                    text: `👋 Welcome back, ${saved.displayName || "User"}!`,
                });
            } else if (result.isNew === true) {
                setMessage({
                    type: "success",
                    text: "🎉 Registration successful! Let's get started.",
                });
            } else {
                setMessage({
                    type: "success",
                    text: "💾 Profile updated successfully!",
                });
            }

            setEdit(false);
        } catch (e) {
            setError(e.message);
            setMessage({ type: "error", text: e.message });
        } finally {
            setSaving(false);
            // Please allow a slightly longer retention period (if recently synchronised).
            setTimeout(
                () => setMessage({ type: "", text: "" }),
                5000
            );
        }
    };

    return (
        <div className={`app-container ${menuOpen ? "menu-open" : ""}`}>
            {/* Top Bar */}
            <div className="top-bar">
                <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
                <div className="logo-area">
                    <img src={logo} alt="logo" className="logo-icon" />
                    <span className="logo-text">RotorBench</span>
                </div>
                <button className="icon-btn home-btn" onClick={() => navigate("/")}>🏠</button>
            </div>

            {/* Page Title */}
            <div className="page-header">
                <h2 className="page-title">{user?.id ? "Profile" : "Create Your Profile"}</h2>
            </div>
            {message.text && (
                <div className={`message-bar ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading profile…</p>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="error-message">
                    <p>⚠️ {error}</p>
                    <button className="action-btn analysis" onClick={() => navigate(0)}>Retry</button>
                </div>
            )}

            {/* Content */}
            {user && !loading && (
                <div className="analysis-content">
                    {/* Identity Card (uses your highlight gradient style) */}
                    <div className="metric-card highlight profile-identity">
                        <div className="metric-icon" aria-hidden>👤</div>
                        <div className="metric-content">
                            <div className="metric-label">Display Name</div>
                            {!edit ? (
                                <div className="metric-value-large">{user.displayName}</div>
                            ) : (
                                <input
                                    className="input-field"
                                    value={user.displayName || ""}
                                    onChange={(e) => onChange("displayName", e.target.value)}
                                    placeholder="Your name"
                                />
                            )}
                            <div className="metric-badge">User ID: {user.id}</div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="metric-card">
                        <div className="metric-icon">✉️</div>
                        <div className="metric-content">
                            <div className="metric-label">Email</div>

                            {/* Added conditional rendering logic */}
                            {user.id ? (
                                <>
                                    <div className="metric-value">{user.email || "—"}</div>
                                    <div className="metric-subtitle">
                                        Email is your unique account identifier.
                                        <br />
                                        To change it, please <b>log out</b> and re-register.
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input
                                        className="input-field"
                                        value={user.email || ""}
                                        onChange={(e) => onChange("email", e.target.value)}
                                        placeholder="name@example.com"
                                    />
                                    <div className="metric-subtitle">
                                        Please enter your email to register.
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">🐙</div>
                        <div className="metric-content">
                            <div className="metric-label">GitHub Username</div>
                            {!edit ? (
                                <div className="metric-value">{user.githubUsername || "—"}</div>
                            ) : (
                                <input
                                    className="input-field"
                                    value={user.githubUsername || ""}
                                    onChange={(e) => onChange("githubUsername", e.target.value)}
                                    placeholder="octocat"
                                />
                            )}

                            {/* Preview */}
                            {user.githubUsername && (
                                <div className="avatar-preview" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <img
                                        src={ghAvatar(user.githubUsername)}
                                        alt="GitHub avatar"
                                        width={72}
                                        height={72}
                                        style={{ borderRadius: 12, objectFit: "cover", border: "2px solid rgba(0,0,0,0.1)" }}
                                    />
                                    <a
                                        href={`https://github.com/${user.githubUsername}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="link"
                                    >
                                        github.com/{user.githubUsername}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preferences (cards use your soft greys/blue) */}
                    <h3 className="section-header">⚙️ Preferences</h3>
                    <div className="pref-grid">
                        <div className="pref-card">
                            <div className="pref-icon">🎨</div>
                            <div className="pref-label">Theme</div>
                            {!edit ? (
                                <div className="pref-value">{user.preferences?.theme || "system"}</div>
                            ) : (
                                <select
                                    className="component-select-dropdown"
                                    value={user.preferences?.theme || "system"}
                                    onChange={(e) => onChange("preferences.theme", e.target.value)}
                                >
                                    <option value="dark">dark</option>
                                    <option value="light">light</option>
                                    <option value="system">system</option>
                                </select>
                            )}
                        </div>

                        <div className="pref-card">
                            <div className="pref-icon">🔔</div>
                            <div className="pref-label">Notifications</div>
                            {!edit ? (
                                <div className="pref-value">{user.preferences?.notifications || "disabled"}</div>
                            ) : (
                                <select
                                    className="component-select-dropdown"
                                    value={user.preferences?.notifications || "disabled"}
                                    onChange={(e) => onChange("preferences.notifications", e.target.value)}
                                >
                                    <option value="enabled">enabled</option>
                                    <option value="disabled">disabled</option>
                                </select>
                            )}
                        </div>

                        <div className="pref-card">
                            <div className="pref-icon">🌐</div>
                            <div className="pref-label">Language</div>
                            {!edit ? (
                                <div className="pref-value">{user.preferences?.language || "en-US"}</div>
                            ) : (
                                <input
                                    className="input-field"
                                    value={user.preferences?.language || "en-US"}
                                    onChange={(e) => onChange("preferences.language", e.target.value)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="flight-card highlight" style={{ margin: "14px" }}>
                        <div className="flight-icon">⏱️</div>
                        <div className="flight-label">Last Updated</div>
                        <div className="flight-value-large">
                            {new Date(user.updatedAt || user.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Buttons */}
            <div className="bottom-buttons">
                {!edit ? (
                    <>
                        <button className="action-btn save" onClick={() => setEdit(true)}>✏️ Edit</button>
                        <button className="action-btn order" onClick={() => navigate(-1)}>🔙 Back</button>
                    </>
                ) : (
                    <>
                        <button className="action-btn save" onClick={saveProfile} disabled={saving}>
                            {saving ? "Saving…" : user?.id ? "💾 Save" : "🆕 Register"}
                        </button>
                        <button className="action-btn order" onClick={() => setEdit(false)}>Cancel</button>
                    </>
                )}
                {!edit && (
                    <button
                        className="action-btn order"
                        style={{ background: "#999" }}
                        onClick={() => {
                            localStorage.removeItem("userId"); // Clear login status
                            navigate(0); // Refresh the page to re-enter registration mode.
                        }}
                    >
                        🚪 Logout
                    </button>
                )}
            </div>

            {/* Menu Drawer */}
            {menuOpen && (
                <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-top-right">
                            <button className="icon-btn menu-btn" onClick={() => setMenuOpen(false)}>☰</button>
                        </div>
                        <button className="menu-item" onClick={() => navigate("/build")}>Build Configuration</button>
                        <button className="menu-item" onClick={() => navigate("/analysis", { state: { build: null } })}>Analysis</button>
                        <button className="menu-item" onClick={() => navigate("/saved", { state: { userId } })}>
                            Saved Configurations
                        </button>
                        <button className="menu-item" onClick={() => navigate("/legal")}>
                            Legal & Disclaimer
                        </button>
                    </div>
                    <div className="menu-backdrop" />
                </div>
            )}
        </div>
    );
}
