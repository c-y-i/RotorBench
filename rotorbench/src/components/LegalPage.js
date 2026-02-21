import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";
import "../styles/analysis.css";
import logo from "../assets/logo.png";

export default function LegalPage() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <div className="top-bar">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="logo-area">
          <img src={logo} alt="logo" className="logo-icon" />
          <span className="logo-text">RotorBench</span>
        </div>
        <button className="icon-btn home-btn" onClick={() => navigate("/")}>
          🏠
        </button>
      </div>

      <div className="page-header">
        <h2 className="page-title">Legal & Disclaimer</h2>
      </div>

      <div className="analysis-content" style={{ paddingBottom: "70px" }}>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-label">3D Model Ownership</div>
            <p className="metric-subtitle" style={{ marginTop: "8px" }}>
              Most 3D models used in RotorBench are sourced from third-party creators and public
              repositories. RotorBench maintainers do not claim ownership of those third-party
              models. All rights remain with the original creators and rights holders.
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-label">No Warranty</div>
            <p className="metric-subtitle" style={{ marginTop: "8px" }}>
              RotorBench is provided \"as is\" for educational and planning purposes without
              warranties of any kind, express or implied, including fitness, accuracy, or
              completeness.
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-label">Limitation of Liability</div>
            <p className="metric-subtitle" style={{ marginTop: "8px" }}>
              RotorBench maintainers are not responsible for build outcomes, property damage,
              personal injury, regulatory non-compliance, or other direct or indirect losses
              arising from use of this application or any referenced models/data.
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-label">User Responsibility</div>
            <p className="metric-subtitle" style={{ marginTop: "8px" }}>
              You are solely responsible for validating component compatibility, safety limits,
              firmware settings, airworthiness, and applicable local laws before building or
              operating any aircraft.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
