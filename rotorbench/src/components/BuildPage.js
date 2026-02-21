import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import "../styles/home.css";
import logo from "../assets/logo.png";
import componentsData from "../data/components.json";
import BabylonViewer from "./BabylonViewer.jsx";
import API_BASE from "../config/api";

const BUILDS_ENDPOINT = `${API_BASE}/api/builds`;

export default function BuildPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { currentBuild, updateBuild } = useBuild();

  const location = useLocation();
  const userId = localStorage.getItem("userId");
  const [message, setMessage] = useState({ type: "", text: "" });

  const totalWeight = 0;

  // Component selections - initialize from context if available
  const [selectedFrame, setSelectedFrame] = useState("");
  const [selectedMotor, setSelectedMotor] = useState("");
  const [selectedPropeller, setSelectedPropeller] = useState("");
  const [selectedESC, setSelectedESC] = useState("");
  const [selectedFC, setSelectedFC] = useState("");
  const [selectedBattery, setSelectedBattery] = useState("");
  const [selectedReceiver, setSelectedReceiver] = useState("");

  // Load from context on mount
  useEffect(() => {
    // If a new build page is created, clear the old currentBuild.
    if (!location.state?.build) {
      updateBuild(null); // Clear context
    }
    if (currentBuild?.componentIds) {
      setSelectedFrame(currentBuild.componentIds.frameId || "");
      setSelectedMotor(currentBuild.componentIds.motorId || "");
      setSelectedPropeller(currentBuild.componentIds.propellerId || "");
      setSelectedESC(currentBuild.componentIds.escId || "");
      setSelectedFC(currentBuild.componentIds.flightControllerId || "");
      setSelectedBattery(currentBuild.componentIds.batteryId || "");
      setSelectedReceiver(currentBuild.componentIds.receiverId || "");
    }
  }, []);

  const handleSave = async () => {
    const now = new Date().toISOString();
    const newBuild = {
      id: crypto.randomUUID(), // Forever New ID
      userId,
      name: currentBuild?.name || "Custom Build",
      note: currentBuild?.note || "",
      componentIds: {
        frameId: selectedFrame,
        motorId: selectedMotor,
        propellerId: selectedPropeller,
        escId: selectedESC || null,
        flightControllerId: selectedFC || null,
        batteryId: selectedBattery,
        receiverId: selectedReceiver || null,
      },
      totalWeight,
      createdAt: currentBuild?.createdAt || now,
      updatedAt: now,
    };

    // Synchronously write to Context for use by AnalysisPage / HomePage
    updateBuild(newBuild);

    // Storage Logic (offline / online)
    if (!userId || userId === "leo") {
      const localBuilds = JSON.parse(localStorage.getItem("offlineBuilds") || "[]");
      localBuilds.push(newBuild);
      localStorage.setItem("offlineBuilds", JSON.stringify(localBuilds));
      setMessage({ type: "success", text: "✅ Build saved locally." });
      setTimeout(() => { setMessage({ type: "", text: "" }); navigate("/"); }, 2000);
      return;
    }

    const res = await fetch(`${API_BASE}/api/builds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBuild),
    });
    if (!res.ok) throw new Error(await res.text());
    navigate("/");
  };

  const handleAnalyze = () => {
    // Create build config
    const build = {
      id: currentBuild?.id || "build-" + Date.now(),
      name: currentBuild?.name || "Custom Build",
      description: currentBuild?.description || "User created build",
      componentIds: {
        frameId: selectedFrame || null,
        motorId: selectedMotor || null,
        propellerId: selectedPropeller || null,
        escId: selectedESC || null,
        flightControllerId: selectedFC || null,
        batteryId: selectedBattery || null,
        receiverId: selectedReceiver || null,
      },
      createdAt: currentBuild?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to context
    updateBuild(build);

    // Navigate to analysis page
    navigate("/analysis", { state: { build } });
  };

  const canAnalyze = selectedMotor && selectedPropeller && selectedBattery && selectedFrame;
  const canSave = !!canAnalyze;

  // 3D model URLs state
  const [modelUrls, setModelUrls] = useState([]); // legacy aggregated urls (non-motor components)
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const [motorModelUrl, setMotorModelUrl] = useState(null);
  const [batteryModelUrl, setBatteryModelUrl] = useState(null);
  const [propellerModelUrl, setPropellerModelUrl] = useState(null);
  const [escModelUrl, setEscModelUrl] = useState(null);
  const [fcModelUrl, setFcModelUrl] = useState(null);
  const [receiverModelUrl, setReceiverModelUrl] = useState(null);
  const [frameCornerPositions, setFrameCornerPositions] = useState([]);
  const [motorMountingPoint, setMotorMountingPoint] = useState([0, 0, 0]);
  const [batteryMountingPoint, setBatteryMountingPoint] = useState([0, 0, 0]);
  const [propellerMountingPoint, setPropellerMountingPoint] = useState([0, 0, 0]);
  const [escMountingPoint, setEscMountingPoint] = useState([0, 0, 0]);
  const [fcMountingPoint, setFcMountingPoint] = useState([0, 0, 0]);
  const [receiverMountingPoint, setReceiverMountingPoint] = useState([0, 0, 0]);
  const [resetKey, setResetKey] = useState(0);
  const [clearedComponents, setClearedComponents] = useState([]);
  const [showDebugStatus, setShowDebugStatus] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#2d2d44");

  // Ensure the viewer starts clean (no fallback sample) every time BuildPage mounts
  useEffect(() => {
    setResetKey(k => k + 1);
  }, []);

  // Whenever a component is selected again, ensure it is removed from the cleared list
  useEffect(() => {
    const selectionToType = [
      { value: selectedFrame, type: "frame" },
      { value: selectedMotor, type: "motor" },
      { value: selectedPropeller, type: "propeller" },
      { value: selectedESC, type: "esc" },
      { value: selectedFC, type: "flight_controller" },
      { value: selectedBattery, type: "battery" },
      { value: selectedReceiver, type: "receiver" },
    ];

    setClearedComponents(prev => {
      let changed = false;
      const next = prev.filter(type => {
        const hasSelection = selectionToType.some(entry => entry.type === type && entry.value);
        if (hasSelection) changed = true;
        return !hasSelection;
      });
      return changed ? next : prev;
    });
  }, [selectedFrame, selectedMotor, selectedPropeller, selectedESC, selectedFC, selectedBattery, selectedReceiver]);

  // Helper: fetch list for category and match filename starting with component id
  const fetchModelForComponent = async (category, componentId) => {
    if (!componentId) return null;
    try {
      const res = await fetch(`${API_BASE}/api/models/list/${category}`);
      if (!res.ok) return null;
      const data = await res.json();
      console.log(`[fetchModelForComponent] ${category}/${componentId}:`, data.models.map(m => m.filename));
      const match = data.models.find(m => m.filename.toLowerCase().startsWith(componentId.toLowerCase()));
      console.log(`[fetchModelForComponent] Match for ${componentId}:`, match?.filename || 'NONE');
      return match ? `${API_BASE}/api/models/convert/${category}/${match.filename}?format=glb` : null;
    } catch (_) {
      return null;
    }
  };

  // Build model URLs when key selections change
  useEffect(() => {
    const nonFrameSelected = selectedMotor || selectedPropeller || selectedESC || selectedFC || selectedBattery || selectedReceiver;

    // Block rendering entirely until a frame is chosen.
    if (!selectedFrame) {
      setModelUrls([]);
      setMotorModelUrl(null);
      setBatteryModelUrl(null);
      setPropellerModelUrl(null);
      setEscModelUrl(null);
      setFcModelUrl(null);
      setReceiverModelUrl(null);
      setFrameCornerPositions([]);
      setMotorMountingPoint([0, 0, 0]);
      setBatteryMountingPoint([0, 0, 0]);
      setEscMountingPoint([0, 0, 0]);
      setFcMountingPoint([0, 0, 0]);
      setReceiverMountingPoint([0, 0, 0]);
      setPropellerMountingPoint([0, 0, 0]);
      setLoadingModels(false);
      setModelError(nonFrameSelected ? "Please select a frame first." : "");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingModels(true);
      setModelError("");
      const urls = [];
      // Attempt frame, motor, battery (propellers often lack 3D model in assets)
        const frameUrl = await fetchModelForComponent("frames", selectedFrame);
        const motorUrl = await fetchModelForComponent("motors", selectedMotor);
        const batteryUrl = await fetchModelForComponent("batteries", selectedBattery);
        const escUrl = await fetchModelForComponent("escs", selectedESC);
        const fcUrl = await fetchModelForComponent("flight_controllers", selectedFC);
        const receiverUrl = await fetchModelForComponent("receivers", selectedReceiver);
        // Propeller: use direct id prefix matching like other components
        const propUrl = await fetchModelForComponent("propellers", selectedPropeller);
        console.log('[BuildPage] Propeller URL:', propUrl, 'for ID:', selectedPropeller);
        
        // Only update URLs if they actually changed to prevent unnecessary re-renders
        if (frameUrl) urls.push(frameUrl);
        
        // If selected motor has no model, try a visual fallback of same size
        let effectiveMotorUrl = motorUrl;
        let effectiveMotorId = selectedMotor;
        if (!motorUrl && selectedMotor) {
          const selectedMotorObj = componentsData.motors.find(m => m.id === selectedMotor);
          if (selectedMotorObj?.size) {
            const alt = componentsData.motors.find(m => m.size === selectedMotorObj.size && m.id !== selectedMotor);
            if (alt) {
              const altUrl = await fetchModelForComponent("motors", alt.id);
              if (altUrl) {
                console.warn(`[BuildPage] No 3D model for ${selectedMotor}; using ${alt.id} (${alt.size}) for rendering only.`);
                effectiveMotorUrl = altUrl;
                effectiveMotorId = alt.id;
              }
            }
          }
        }
        setMotorModelUrl(prev => effectiveMotorUrl === prev ? prev : effectiveMotorUrl);
        setBatteryModelUrl(prev => batteryUrl === prev ? prev : batteryUrl);
        setPropellerModelUrl(prev => propUrl === prev ? prev : propUrl);
        setEscModelUrl(prev => escUrl === prev ? prev : escUrl);
        setFcModelUrl(prev => fcUrl === prev ? prev : fcUrl);
        setReceiverModelUrl(prev => receiverUrl === prev ? prev : receiverUrl);
        
        // Extract frame corner positions
        const frameObj = componentsData.frames.find(f => f.id === selectedFrame);
        if (frameObj) {
          const corners = [
            frameObj.upper_left_motor_position,
            frameObj.upper_right_motor_position,
            frameObj.lower_right_motor_position,
            frameObj.lower_left_motor_position
          ];
          setFrameCornerPositions(corners);
        } else {
          setFrameCornerPositions([]);
        }
        
        // Extract motor mounting point
        const motorObj = componentsData.motors.find(m => m.id === selectedMotor);
        if (motorObj && motorObj.mounting_point) {
          setMotorMountingPoint(motorObj.mounting_point);
        } else if (motorObj && motorObj.size) {
          // Fallback: borrow mounting_point from another motor of the same size (e.g., 2207)
          const altMount = componentsData.motors.find(m => m.size === motorObj.size && m.mounting_point);
          if (altMount) {
            console.warn(`[BuildPage] Missing mounting_point for ${motorObj.id}; using ${altMount.id} mounting_point as fallback.`);
            setMotorMountingPoint(altMount.mounting_point);
          } else {
            setMotorMountingPoint([0, 0, 0]);
          }
        } else {
          setMotorMountingPoint([0, 0, 0]);
        }

        const propObj = componentsData.propellers.find(p => p.id === selectedPropeller);
        if (propObj && Array.isArray(propObj.mounting_point)) {
          setPropellerMountingPoint(propObj.mounting_point);
        } else {
          setPropellerMountingPoint([0, 0, 0]);
        }

        const batteryObj = componentsData.batteries.find(b => b.id === selectedBattery);
        if (batteryObj && Array.isArray(batteryObj.mounting_point)) {
          setBatteryMountingPoint(batteryObj.mounting_point);
        } else {
          setBatteryMountingPoint([0, 0, 0]);
        }

        const escObj = componentsData.escs.find(e => e.id === selectedESC);
        if (escObj && Array.isArray(escObj.mounting_point)) {
          setEscMountingPoint(escObj.mounting_point);
        } else {
          setEscMountingPoint([0, 0, 0]);
        }

        const fcObj = componentsData.flight_controllers.find(f => f.id === selectedFC);
        if (fcObj && Array.isArray(fcObj.mounting_point)) {
          setFcMountingPoint(fcObj.mounting_point);
        } else {
          setFcMountingPoint([0, 0, 0]);
        }

        const rxObj = componentsData.receivers.find(r => r.id === selectedReceiver);
        if (rxObj && Array.isArray(rxObj.mounting_point)) {
          setReceiverMountingPoint(rxObj.mounting_point);
        } else {
          setReceiverMountingPoint([0, 0, 0]);
        }
      if (!cancelled) {
        // Only update modelUrls if the content actually changed
        setModelUrls(prev => {
          const urlsStr = JSON.stringify(urls);
          const prevStr = JSON.stringify(prev);
          return urlsStr === prevStr ? prev : urls;
        });

        const hasAnyRenderable = Boolean(
          urls.length ||
          effectiveMotorUrl ||
          batteryUrl ||
          escUrl ||
          fcUrl ||
          receiverUrl ||
          propUrl
        );

        if (!hasAnyRenderable && (selectedFrame || selectedMotor || selectedPropeller || selectedESC || selectedFC || selectedBattery || selectedReceiver)) {
          setModelError("No 3D models found for selected components.");
        } else {
          setModelError("");
        }

        setLoadingModels(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedFrame, selectedMotor, selectedBattery, selectedPropeller, selectedESC, selectedFC, selectedReceiver]);

  return (
    <div className={`app-container ${menuOpen ? "menu-open" : ""}`}>
      {message.text && (
        <div className={`message-bar ${message.type}`}>
          {message.text}
        </div>
      )}
      {/* Top Bar */}
      <div className="top-bar">
        <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)}>
          ☰
        </button>

        <div className="logo-area">
          <img src={logo} alt="logo" className="logo-icon" />
          <span className="logo-text">RotorBench</span>
        </div>

        <button className="icon-btn home-btn" onClick={() => navigate("/")}>
          🏠
        </button>
      </div>

      {/* Page Title & 3D Preview */}
      <div className="section-title" style={{ fontSize: "20px", fontWeight: "600" }}>
        Build Configuration
      </div>
      <div style={{ margin: "10px 0 24px" }}>
        <div style={{ marginBottom: 6, fontSize: 12, color: "#666" }}>
          3D Preview (all components when available)
        </div>
        
        {/* Component Visibility Controls */}
        {(selectedFrame || selectedMotor || selectedBattery) && (
          <div style={{
            padding: "8px",
            background: "#f8f9fa",
            borderRadius: "8px",
            marginBottom: "8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            fontSize: "11px"
          }}>
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "6px" }}>
              <span style={{ color: "#666", fontSize: "10px" }}>
                Hide components:
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <label style={{ fontSize: "10px", color: "#666", display: "flex", alignItems: "center", gap: "4px" }}>
                  Background:
                  <select
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    style={{
                      padding: "4px 6px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "10px",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <option value="#2d2d44">Dark Gray</option>
                    <option value="#111111">Black</option>
                    <option value="#1a1a2e">Dark Blue</option>
                    <option value="#2c3e50">Slate Blue</option>
                    <option value="#34495e">Charcoal</option>
                    <option value="#ffffff">White</option>
                    <option value="#f5f5f5">Light Gray</option>
                    <option value="#e3f2fd">Light Blue</option>
                    <option value="#fff3e0">Light Orange</option>
                    <option value="#f1f8e9">Light Green</option>
                    <option value="#fce4ec">Light Pink</option>
                    <option value="#e8eaf6">Lavender</option>
                    <option value="#fff9c4">Light Yellow</option>
                    <option value="#e0f2f1">Mint</option>
                    <option value="#263238">Dark Teal</option>
                    <option value="#3e2723">Dark Brown</option>
                    <option value="#1b5e20">Dark Green</option>
                  </select>
                </label>
                <button
                  onClick={() => setShowDebugStatus(!showDebugStatus)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    border: `1px solid ${showDebugStatus ? '#2196F3' : '#ccc'}`,
                    background: showDebugStatus ? '#e3f2fd' : '#fff',
                    color: showDebugStatus ? '#1976d2' : '#666',
                    cursor: "pointer",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title={showDebugStatus ? "Hide load status" : "Show load status"}
                >
                  <span>📊</span>
                  <span>{showDebugStatus ? "Hide Status" : "Show Status"}</span>
                </button>
              </div>
            </div>
            {[
              { id: 'frame', label: 'Frame', icon: '🖼️', has: selectedFrame },
              { id: 'motor', label: 'Motors', icon: '⚙️', has: selectedMotor },
              { id: 'propeller', label: 'Props', icon: '🔄', has: selectedPropeller },
              { id: 'battery', label: 'Battery', icon: '🔋', has: selectedBattery },
              { id: 'flight_controller', label: 'FC', icon: '🖥️', has: selectedFC },
              { id: 'esc', label: 'ESC', icon: '⚡', has: selectedESC },
              { id: 'receiver', label: 'RX', icon: '📡', has: selectedReceiver }
            ].filter(comp => comp.has).map(comp => {
              const isHidden = clearedComponents.includes(comp.id);
              return (
                <button
                  key={comp.id}
                  onClick={() => {
                    setClearedComponents(prev => 
                      isHidden 
                        ? prev.filter(c => c !== comp.id)
                        : [...prev, comp.id]
                    );
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    border: `1px solid ${isHidden ? '#ccc' : '#4CAF50'}`,
                    background: isHidden ? '#fff' : '#e8f5e9',
                    color: isHidden ? '#999' : '#2e7d32',
                    cursor: "pointer",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    opacity: isHidden ? 0.6 : 1
                  }}
                >
                  <span>{comp.icon}</span>
                  <span>{comp.label}</span>
                  {isHidden && <span style={{ marginLeft: "2px" }}>👁️‍🗨️</span>}
                </button>
              );
            })}
          </div>
        )}
        
        <BabylonViewer
          modelUrl={null}
          modelUrls={modelUrls}
          motorUrl={motorModelUrl}
          motorMountingPoint={motorMountingPoint}
          frameCornerPositions={frameCornerPositions}
          propellerUrl={propellerModelUrl}
          propellerMountingPoint={propellerMountingPoint}
          batteryUrl={batteryModelUrl}
          batteryMountingPoint={batteryMountingPoint}
          escUrl={escModelUrl}
          escMountingPoint={escMountingPoint}
          fcUrl={fcModelUrl}
          fcMountingPoint={fcMountingPoint}
          receiverUrl={receiverModelUrl}
          receiverMountingPoint={receiverMountingPoint}
          groundClearance={4}
          autoRotate
          onLoaded={() => {}}
          resetKey={resetKey}
          clearedComponents={clearedComponents}
          debug={showDebugStatus}
          backgroundColor={backgroundColor}
        />
        {loadingModels && (
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Loading component models…</div>
        )}
        {modelError && !loadingModels && (
          <div style={{ fontSize: 12, color: "#d9534f", marginTop: 4 }}>{modelError}</div>
        )}
      </div>

      {/* Frame Selection */}
      <div>
        <div className="section-title">🔲 Frame</div>
        <div className="select-row">
          <select
            className="input-field"
            value={selectedFrame}
            onChange={(e) => setSelectedFrame(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Select frame...</option>
            {componentsData.frames.map((frame) => (
              <option key={frame.id} value={frame.id}>
                {frame.name} - ${frame.price}
              </option>
            ))}
          </select>
          {selectedFrame && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedFrame("");
                // remove frame model from aggregated urls
                setModelUrls(prev => prev.filter(u => !/\/frames\//.test(u)));
                setClearedComponents(c => [...new Set([...c, 'frame'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Motor Selection */}
      <div>
        <div className="section-title">⚙️ Motors</div>
        <div className="select-row">
          <select
            className="input-field"
            value={selectedMotor}
            onChange={(e) => setSelectedMotor(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Select motor...</option>
            {componentsData.motors.map((motor) => (
              <option key={motor.id} value={motor.id}>
                {motor.name} - ${motor.price}
              </option>
            ))}
          </select>
          {selectedMotor && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedMotor("");
                setMotorModelUrl(null);
                setClearedComponents(c => [...new Set([...c, 'motor'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Propeller Selection */}
      <div>
        <div className="section-title">🔄 Propellers</div>
        <div className="select-row">
          <select
            className="input-field"
            value={selectedPropeller}
            onChange={(e) => setSelectedPropeller(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Select propeller...</option>
            {componentsData.propellers.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name} - ${prop.price}
              </option>
            ))}
          </select>
          {selectedPropeller && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedPropeller("");
                setPropellerModelUrl(null);
                setClearedComponents(c => [...new Set([...c, 'propeller'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ESC Selection */}
      <div>
        <div className="section-title">⚡ ESC</div>
        <div className="select-row">
          <select className="input-field" value={selectedESC} onChange={(e) => setSelectedESC(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select ESC...</option>
            {componentsData.escs.map((esc) => (
              <option key={esc.id} value={esc.id}>
                {esc.manufacturer} {esc.name} - ${esc.price}
              </option>
            ))}
          </select>
          {selectedESC && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedESC("");
                setEscModelUrl(null);
                setClearedComponents(c => [...new Set([...c, 'esc'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Flight Controller Selection */}
      <div>
        <div className="section-title">🖥️ Flight Controller</div>
        <div className="select-row">
          <select className="input-field" value={selectedFC} onChange={(e) => setSelectedFC(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select flight controller...</option>
            {componentsData.flight_controllers.map((fc) => (
              <option key={fc.id} value={fc.id}>
                {fc.manufacturer} {fc.name} - ${fc.price}
              </option>
            ))}
          </select>
          {selectedFC && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedFC("");
                setFcModelUrl(null);
                setClearedComponents(c => [...new Set([...c, 'flight_controller'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Battery Selection */}
      <div>
        <div className="section-title">🔋 Battery</div>
        <div className="select-row">
          <select
            className="input-field"
            value={selectedBattery}
            onChange={(e) => setSelectedBattery(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Select battery...</option>
            {componentsData.batteries.map((battery) => (
              <option key={battery.id} value={battery.id}>
                {battery.name} - ${battery.price}
              </option>
            ))}
          </select>
          {selectedBattery && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedBattery("");
                setBatteryModelUrl(null);
                setClearedComponents(c => [...new Set([...c, 'battery'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Receiver Selection */}
      <div>
        <div className="section-title">📡 Receiver (Optional)</div>
        <div className="select-row">
          <select
            className="input-field"
            value={selectedReceiver}
            onChange={(e) => setSelectedReceiver(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Select receiver...</option>
            {componentsData.receivers.map((rx) => (
              <option key={rx.id} value={rx.id}>
                {rx.name} - ${rx.price}
              </option>
            ))}
          </select>
          {selectedReceiver && (
            <button
              className="reset-btn"
              onClick={() => {
                setSelectedReceiver("");
                setReceiverModelUrl(null);
                setClearedComponents(c => [...new Set([...c, 'receiver'])]);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Info Message */}
      {!canAnalyze && (
        <div style={{ margin: "20px 14px", padding: "12px", background: "#fff3e0", borderRadius: "8px", fontSize: "13px" }}>
          ⚠️ Please select at least Frame, Motor, Propeller, and Battery to analyze
        </div>
      )}

      <div className="bottom-buttons">
        <button
          className="action-btn analysis"
          onClick={() => {
            // Clear all selections and trigger viewer reset
            setSelectedFrame("");
            setSelectedMotor("");
            setSelectedPropeller("");
            setSelectedESC("");
            setSelectedFC("");
            setSelectedBattery("");
            setSelectedReceiver("");
            // Clear all model URL states immediately so viewer sees empty set
            setModelUrls([]);
            setMotorModelUrl(null);
            setBatteryModelUrl(null);
            setPropellerModelUrl(null);
            setEscModelUrl(null);
            setFcModelUrl(null);
            setReceiverModelUrl(null);
            setClearedComponents([]);
            setResetKey(k => k + 1);
            setMessage({ type: "info", text: "Build reset." });
            setTimeout(() => setMessage({ type: "", text: "" }), 1500);
          }}
          style={{ background: '#555' }}
        >
          ♻️ Reset All
        </button>
        <button
          className="action-btn save"
          onClick={handleSave}
          disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
          title={canSave ? "Save & go Home" : "Select Frame, Motor, Propeller, Battery first"}
        >
          💾 Save & Home
        </button>

        <button
          className="action-btn analysis"
          disabled={!canAnalyze}
          onClick={handleAnalyze}
          style={{ opacity: canAnalyze ? 1 : 0.5 }}
        >
          📊 Analyze
        </button>
      </div>

      {/* Drawer (contained in phone) */}
      {menuOpen && (
        <div className="menu-overlay">
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top-right">
              <button className="icon-btn menu-btn" onClick={() => setMenuOpen(false)}>
                ☰
              </button>
            </div>
            <button className="menu-item" onClick={() => navigate("/")}>
              Home
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                navigate("/saved");
              }}
            >
              Saved Builds
            </button>
            <button
              className="menu-item"
              onClick={() => { setMenuOpen(false); navigate("/profile", { state: { userId: "leo" } }); }}
            >
              Profile
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                navigate("/legal");
              }}
            >
              Legal & Disclaimer
            </button>
          </div>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}
