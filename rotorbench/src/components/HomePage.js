import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import "../styles/home.css";
import logo from "../assets/logo.png";
import BabylonViewer from "./BabylonViewer";
import componentsData from "../data/components.json";
import TwoDViewer from "./TwoDViewer";
import API_BASE from "../config/api";
const sampleAssembly = process.env.PUBLIC_URL + "/assets/sample_assembly.glb";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { currentBuild, analysisResults } = useBuild();

  // Model URLs state
  const [modelUrls, setModelUrls] = useState([]);
  const [motorModelUrl, setMotorModelUrl] = useState(null);
  const [propellerModelUrl, setPropellerModelUrl] = useState(null);
  const [batteryModelUrl, setBatteryModelUrl] = useState(null);
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
  const [clearedComponents, setClearedComponents] = useState([]);
  const [backgroundColor, setBackgroundColor] = useState("#2d2d44");

  // Get component details from current build
  const getComponent = (type, id) => {
    if (!id) return null;
    return componentsData[type]?.find((c) => c.id === id) || null;
  };

  const frame = currentBuild ? getComponent("frames", currentBuild.componentIds?.frameId) : null;
  const motor = currentBuild ? getComponent("motors", currentBuild.componentIds?.motorId) : null;
  const propeller = currentBuild ? getComponent("propellers", currentBuild.componentIds?.propellerId) : null;
  const battery = currentBuild ? getComponent("batteries", currentBuild.componentIds?.batteryId) : null;
  const fc = currentBuild ? getComponent("flight_controllers", currentBuild.componentIds?.flightControllerId) : null;
  const esc = currentBuild ? getComponent("escs", currentBuild.componentIds?.escId) : null;
  const receiver = currentBuild ? getComponent("receivers", currentBuild.componentIds?.receiverId) : null;

  const hasBuild = currentBuild && motor && propeller && battery;
  const hasAnalysis = analysisResults && hasBuild;
  const [activeView, setActiveView] = useState("3D");
  const hasAnySelection = Boolean(
    currentBuild &&
    currentBuild.componentIds &&
    Object.values(currentBuild.componentIds).some(Boolean)
  );

  // Fetch model URLs for 3D rendering
  const fetchModelForComponent = async (category, componentId) => {
    if (!componentId) return null;
    try {
      const res = await fetch(`${API_BASE}/api/models/list/${category}`);
      if (!res.ok) return null;
      const data = await res.json();
      const match = data.models.find(m => m.filename.toLowerCase().startsWith(componentId.toLowerCase()));
      return match ? `${API_BASE}/api/models/convert/${category}/${match.filename}?format=glb` : null;
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    if (!hasBuild) {
      setModelUrls([]);
      setMotorModelUrl(null);
      setPropellerModelUrl(null);
      setBatteryModelUrl(null);
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
      return;
    }

    let cancelled = false;
    const load = async () => {
      const urls = [];

      // Fetch frame model
      const frameUrl = await fetchModelForComponent("frames", currentBuild.componentIds?.frameId);
      if (frameUrl) urls.push(frameUrl);

      // Fetch other component models
      const motorUrl = await fetchModelForComponent("motors", currentBuild.componentIds?.motorId);
      const propellerUrl = await fetchModelForComponent("propellers", currentBuild.componentIds?.propellerId);
      const batteryUrl = await fetchModelForComponent("batteries", currentBuild.componentIds?.batteryId);
      const escUrl = await fetchModelForComponent("escs", currentBuild.componentIds?.escId);
      const fcUrl = await fetchModelForComponent("flight_controllers", currentBuild.componentIds?.flightControllerId);
      const receiverUrl = await fetchModelForComponent("receivers", currentBuild.componentIds?.receiverId);

      if (!cancelled) {
        setModelUrls(urls);
        setMotorModelUrl(motorUrl);
        setPropellerModelUrl(propellerUrl);
        setBatteryModelUrl(batteryUrl);
        setEscModelUrl(escUrl);
        setFcModelUrl(fcUrl);
        setReceiverModelUrl(receiverUrl);

        // Extract frame corner positions
        if (frame) {
          const corners = [
            frame.upper_left_motor_position,
            frame.upper_right_motor_position,
            frame.lower_right_motor_position,
            frame.lower_left_motor_position
          ];
          setFrameCornerPositions(corners);
        } else {
          setFrameCornerPositions([]);
        }

        // Extract motor mounting point
        if (motor && motor.mounting_point) {
          setMotorMountingPoint(motor.mounting_point);
        } else if (motor && motor.size) {
          const altMount = componentsData.motors.find(m => m.size === motor.size && m.mounting_point);
          if (altMount) {
            setMotorMountingPoint(altMount.mounting_point);
          } else {
            setMotorMountingPoint([0, 0, 0]);
          }
        } else {
          setMotorMountingPoint([0, 0, 0]);
        }

        if (propeller && Array.isArray(propeller.mounting_point)) {
          setPropellerMountingPoint(propeller.mounting_point);
        } else {
          setPropellerMountingPoint([0, 0, 0]);
        }

        if (battery && Array.isArray(battery.mounting_point)) {
          setBatteryMountingPoint(battery.mounting_point);
        } else {
          setBatteryMountingPoint([0, 0, 0]);
        }

        if (esc && Array.isArray(esc.mounting_point)) {
          setEscMountingPoint(esc.mounting_point);
        } else {
          setEscMountingPoint([0, 0, 0]);
        }

        if (fc && Array.isArray(fc.mounting_point)) {
          setFcMountingPoint(fc.mounting_point);
        } else {
          setFcMountingPoint([0, 0, 0]);
        }

        if (receiver && Array.isArray(receiver.mounting_point)) {
          setReceiverMountingPoint(receiver.mounting_point);
        } else {
          setReceiverMountingPoint([0, 0, 0]);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [currentBuild, hasBuild, frame, motor, propeller]);

  return (
    <div className={`app-container${menuOpen ? " menu-open" : ""}`}>

      <div className="top-bar">
        <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)}>☰</button>

        <div className="logo-area">
          <img src={logo} alt="logo" className="logo-icon" />
          <span className="logo-text">RotorBench</span>
        </div>

        <button className="icon-btn search-btn" onClick={() => navigate("/build")}>🔍</button>
      </div>

      {/* View Switch */}
      <div className="view-switch-container">
        <div className="view-switch-track">
          <div
            className="view-switch-slider"
            style={{
              transform: activeView === "3D" ? "translateX(0%)" : "translateX(100%)",
            }}
          />
          {["3D", "2D"].map((view) => (
            <button
              key={view}
              className={`view-switch-option ${activeView === view ? "active" : ""}`}
              onClick={() => setActiveView(view)}
            >
              {view} View
            </button>
          ))}
        </div>
      </div>

      {/* Component Visibility Controls (3D View Only) */}
      {activeView === "3D" && hasBuild && (
        <div style={{
          padding: "8px 14px",
          background: "#f8f9fa",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "12px"
        }}>
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ color: "#666" }}>Hide components:</span>
            <label style={{ fontSize: "11px", color: "#666", display: "flex", alignItems: "center", gap: "4px" }}>
              Background:
              <select
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{
                  padding: "4px 6px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  fontSize: "11px",
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
          </div>
          {[
            { id: 'frame', label: 'Frame', icon: '🖼️' },
            { id: 'motor', label: 'Motors', icon: '⚙️' },
            { id: 'propeller', label: 'Props', icon: '🔄' },
            { id: 'battery', label: 'Battery', icon: '🔋' },
            { id: 'flight_controller', label: 'FC', icon: '🖥️' },
            { id: 'esc', label: 'ESC', icon: '⚡' },
            { id: 'receiver', label: 'RX', icon: '📡' }
          ].map(comp => {
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
                  fontSize: "11px",
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

      {/* 3D viewer */}
      <div className="viewer-container">
        {activeView === "3D" && (
          <BabylonViewer
            modelUrl={!hasAnySelection ? sampleAssembly : null}
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
            clearedComponents={clearedComponents}
            backgroundColor={backgroundColor}
          />
        )}
        {activeView === "2D" && (
          <TwoDViewer modelUrl={hasAnySelection ? "/models/model.obj" : sampleAssembly} />
        )}
      </div>

      {/* Spec Section - Shows saved build or placeholder */}
      {/* Spec Section - Logically Grouped and Clear */}
      <div className="spec-section-grouped">

        {/* Overall Section */}
        <div className="spec-card-group">
          <div className="spec-header">
            <div className="spec-icon overall-icon">⚖️</div>
            <div>
              <div className="spec-title">Overall</div>
              <div className="spec-value">System Summary</div>
            </div>
          </div>

          <div className="spec-divider"></div>
          <div className="spec-info">
            <span>Total Weight</span>
            <b>{hasAnalysis ? `${analysisResults.performance.totalWeight}g` : "--"}</b>
          </div>
          <div className="spec-info">
            <span>T/W Ratio</span>
            <b>{hasAnalysis ? `${analysisResults.performance.thrustToWeightRatio}:1` : "--"}</b>
          </div>
        </div>

        {/* Motors */}
        <div className="spec-card-group">
          <div className="spec-header">
            <div className="spec-icon motor-icon">⚙️</div>
            <div>
              <div className="spec-title">Motors</div>
              <div className="spec-value">{motor?.name || "Not selected"}</div>
            </div>
          </div>
        </div>

        {/* Propellers */}
        <div className="spec-card-group">
          <div className="spec-header">
            <div className="spec-icon propeller-icon">🔄</div>
            <div>
              <div className="spec-title">Propellers</div>
              <div className="spec-value">{propeller?.name || "Not selected"}</div>
            </div>
          </div>
        </div>

        {/* Battery */}
        <div className="spec-card-group">
          <div className="spec-header">
            <div className="spec-icon battery-icon">🔋</div>
            <div>
              <div className="spec-title">Battery</div>
              <div className="spec-value">{battery?.name || "Not selected"}</div>
            </div>
          </div>

          <div className="spec-divider"></div>

          <div className="spec-info">
            <span>Voltage</span>
            <b>{battery ? `${battery.voltage}V` : "--"}</b>
          </div>
          <div className="spec-info">
            <span>Capacity</span>
            <b>{battery ? `${battery.capacity}mAh` : "--"}</b>
          </div>
          <div className="spec-info">
            <span>Current Draw</span>
            <b>{hasAnalysis ? `${analysisResults.flightSimulation.avgCurrentDraw}A` : "--"}</b>
          </div>
          <div className="spec-info">
            <span>Flight Time</span>
            <b>{hasAnalysis ? `${analysisResults.flightSimulation.estimatedFlightTime}min` : "--"}</b>
          </div>
        </div>

        {/* Flight Controller */}
        <div className="spec-card-group">
          <div className="spec-header">
            <div className="spec-icon fc-icon">🖥️</div>
            <div>
              <div className="spec-title">Flight Controller</div>
              <div className="spec-value">{fc?.name || "Not selected"}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Buttons */}
      <div className="bottom-buttons">
        <button className="action-btn save" onClick={() => navigate("/build")}>
          {hasBuild ? "✏️ Edit Build" : "🔍 New Build"}
        </button>
        <button
          className="action-btn analysis"
          disabled={!hasBuild}
          onClick={() => navigate("/analysis", { state: { build: currentBuild } })}
          style={{ opacity: hasBuild ? 1 : 0.5, cursor: hasBuild ? "pointer" : "not-allowed" }}
        >
          📊 Analysis
        </button>
      </div>

      {menuOpen && (
        <div className="menu-overlay">
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top-right">
              <button className="icon-btn menu-btn" onClick={() => setMenuOpen(false)}>☰</button>
            </div>
            <button className="menu-item" onClick={() => navigate("/build")}>
              Build Configuration
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
