import React, { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import "../styles/home.css";
import componentsData from "../data/components.json";
import PartPicker from "./PartPicker";
import AssemblyStackMap from "./AssemblyStackMap";
import AssemblyInterfaceMap from "./AssemblyInterfaceMap";
import MeasuredGeometryPanel from "./MeasuredGeometryPanel";
import PropRotationMap from "./PropRotationMap";
import API_BASE from "../config/api";
import {
  physicalChecksFor,
  summarizePowerPath,
  summarizePhysicalChecks,
} from "../utils/physicalCompatibility";
import {
  checkEscCurrent,
  checkEscVoltage,
  checkFlightControllerVoltage,
  checkMotorVoltage,
  checkPropellerClearance,
  electricalChecksFor,
  summarizeElectricalChecks,
} from "../utils/electricalCompatibility";
import { CAMERA_VIEWS } from "../assembly/cameraViews";
import { buildViewerPlacementAudit } from "../assembly/assemblyTransforms";
import {
  PLATFORM_PRESETS,
  getPlatformPreset,
  matchesPlatformPreset,
} from "../data/platformPresets";
import { summarizeBuildEvidence } from "../utils/buildEvidence";
import { createBuildBriefing } from "../utils/buildBriefing";
import {
  applyMeasuredGeometryToAssemblySpec,
  clearMeasuredGeometry,
  normalizeGeometryOverrides,
  placementCheckMeasurementTarget,
  setMeasuredGeometryValue,
} from "../utils/buildGeometry";
import {
  describeMissionControls,
  describeNavigationSafety,
  summarizeHardwareReadiness,
} from "../utils/hardwareReadiness";
import { getRadioReceiverBandCompatibility, getRadioTarget } from "../data/radioProfiles";
import {
  readBenchEvidenceAttachment,
  readCurrentBenchEvidenceScope,
  summarizeBenchEvidenceAttachment,
} from "../utils/benchEvidenceAttachment";
import {
  resolveModelForComponent,
  resolvePropellerModelPair,
} from "../utils/modelAssets";
import {
  buildSheetFilename,
  createBuildSheet,
} from "../utils/buildSheet";
import {
  buildBomFilename,
  createBuildBomCsv,
} from "../utils/buildBom";
import {
  buildShareUrl,
  parseBuildShareToken,
} from "../utils/buildLink";
import { readJsonStorage, writeJsonStorage } from "../utils/storage";
import { upsertBuild } from "../utils/savedBuilds";
import { humanizeProvenanceFields } from "../utils/provenanceLabels";
import {
  BatteryCharging,
  Box,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  Cog,
  Cpu,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Fan,
  FileCheck2,
  Layers,
  LoaderCircle,
  Radio,
  RotateCcw,
  Ruler,
  Save,
  Settings2,
  Zap,
} from "lucide-react";

const BabylonViewer = lazy(() => import("./BabylonViewer.jsx"));
const BUILD_DRAFT_KEY = "rotorbench:build-draft:v1";

function describeViewerPlacement(audit) {
  const total = audit.checks.length;
  const labels = [];
  if (audit.conflictCount) {
    labels.push(
      `${audit.conflictCount} conflict${audit.conflictCount === 1 ? "" : "s"}`,
    );
  }
  labels.push(`${audit.verifiedCount}/${total} verified`);
  if (audit.measuredCount) labels.push(`${audit.measuredCount} measured`);
  if (audit.estimatedCount + audit.fallbackCount) {
    labels.push(`${audit.estimatedCount + audit.fallbackCount} estimated`);
  }
  if (audit.awaitingCount) labels.push(`${audit.awaitingCount} awaiting`);
  return labels.join(" · ");
}

function createWorkingBuildId() {
  return window.crypto?.randomUUID?.() || `build-${Date.now()}`;
}

function sanitizeDraftComponentIds(componentIds) {
  if (!componentIds || typeof componentIds !== "object" || Array.isArray(componentIds)) {
    return null;
  }
  const categories = {
    frameId: "frames",
    motorId: "motors",
    propellerId: "propellers",
    escId: "escs",
    flightControllerId: "flight_controllers",
    batteryId: "batteries",
    receiverId: "receivers",
  };
  return Object.fromEntries(
    Object.entries(categories).map(([key, category]) => {
      const id = componentIds[key];
      const valid = typeof id === "string" &&
        componentsData[category]?.some((part) => part.id === id);
      return [key, valid ? id : null];
    }),
  );
}

export default function BuildPage() {
  const navigate = useNavigate();
  const { currentBuild, updateBuild } = useBuild();

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPresetId = searchParams.get("preset") || "";
  const requestedPreset = getPlatformPreset(requestedPresetId);
  const requestedShareToken = searchParams.get("share") || "";
  const sharedBuildResult = useMemo(() => {
    if (!requestedShareToken) return { build: null, error: "" };
    try {
      return {
        build: parseBuildShareToken(requestedShareToken),
        error: "",
      };
    } catch (error) {
      return {
        build: null,
        error: `Could not load shared build: ${error.message}`,
      };
    }
  }, [requestedShareToken]);
  const sharedBuild = sharedBuildResult.build;
  const startNewDraft = searchParams.get("new") === "1";
  const initialBuild = location.state?.build;
  const storedDraftValue = !initialBuild
    && !requestedPreset
    && !requestedShareToken
    && !startNewDraft
    ? readJsonStorage(BUILD_DRAFT_KEY, null)
    : null;
  const sanitizedDraftIds = storedDraftValue?.version === 1
    ? sanitizeDraftComponentIds(storedDraftValue?.componentIds)
    : null;
  const storedDraft = sanitizedDraftIds &&
    Object.values(sanitizedDraftIds).some(Boolean)
    ? { ...storedDraftValue, componentIds: sanitizedDraftIds }
    : null;
  const initialComponentIds =
    initialBuild?.componentIds ||
    sharedBuild?.componentIds ||
    requestedPreset?.componentIds ||
    (!startNewDraft ? currentBuild?.componentIds || storedDraft?.componentIds : null) ||
    {};
  const [workingBuildId, setWorkingBuildId] = useState(
    () => initialBuild?.id || currentBuild?.id || storedDraft?.id
      || createWorkingBuildId(),
  );
  const [workingBuildName, setWorkingBuildName] = useState(
    () => initialBuild?.name || (sharedBuild ? "Shared build" : null)
      || requestedPreset?.name || currentBuild?.name
      || storedDraft?.name || "Custom Build",
  );
  const [buildNote, setBuildNote] = useState(() => (
    initialBuild?.note
    ?? (sharedBuild ? "" : null)
    ?? (requestedPreset ? "" : currentBuild?.note ?? storedDraft?.note ?? "")
  ));
  const [geometryOverrides, setGeometryOverrides] = useState(() => (
    normalizeGeometryOverrides(
      initialBuild?.geometryOverrides
      || sharedBuild?.geometryOverrides
      || currentBuild?.geometryOverrides
      || storedDraft?.geometryOverrides,
    )
  ));
  const userId = localStorage.getItem("userId");
  const [message, setMessage] = useState({ type: "", text: "" });

  const totalWeight = 0;

  // Component selections - initialize from context if available
  const [selectedFrame, setSelectedFrame] = useState(initialComponentIds.frameId || "");
  const [selectedMotor, setSelectedMotor] = useState(initialComponentIds.motorId || "");
  const [selectedPropeller, setSelectedPropeller] = useState(initialComponentIds.propellerId || "");
  const [selectedESC, setSelectedESC] = useState(initialComponentIds.escId || "");
  const [selectedFC, setSelectedFC] = useState(initialComponentIds.flightControllerId || "");
  const [selectedBattery, setSelectedBattery] = useState(initialComponentIds.batteryId || "");
  const [selectedReceiver, setSelectedReceiver] = useState(initialComponentIds.receiverId || "");

  // Load from context on mount
  useEffect(() => {
    const requestedBuild = location.state?.build;
    const sourceBuild = requestedBuild || sharedBuild || (
      requestedPreset || requestedShareToken || startNewDraft
        ? null
        : currentBuild
    );
    // If a new build page is created, clear the old currentBuild.
    if (requestedBuild) {
      updateBuild(requestedBuild);
    } else {
      updateBuild(null); // Clear context
    }
    if (sourceBuild?.componentIds) {
      setSelectedFrame(sourceBuild.componentIds.frameId || "");
      setSelectedMotor(sourceBuild.componentIds.motorId || "");
      setSelectedPropeller(sourceBuild.componentIds.propellerId || "");
      setSelectedESC(sourceBuild.componentIds.escId || "");
      setSelectedFC(sourceBuild.componentIds.flightControllerId || "");
      setSelectedBattery(sourceBuild.componentIds.batteryId || "");
      setSelectedReceiver(sourceBuild.componentIds.receiverId || "");
      setBuildNote(sourceBuild.note || "");
      setGeometryOverrides(normalizeGeometryOverrides(sourceBuild.geometryOverrides));
    }
    if (sharedBuildResult.error) {
      setMessage({ type: "error", text: sharedBuildResult.error });
    } else if (sharedBuild) {
      setMessage({
        type: "info",
        text: "Shared build loaded. The link contains catalog IDs and validated measurements only.",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } else if (requestedPreset) {
      setMessage({
        type: "info",
        text: `${requestedPreset.name} loaded. Review before analysis.`,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } else if (!requestedBuild && !startNewDraft && storedDraft) {
      setMessage({
        type: "info",
        text: `${storedDraft.name || "Unsaved build"} restored from this browser.`,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
    if (requestedPresetId || requestedShareToken || startNewDraft) {
      setSearchParams({}, { replace: true });
    }
    // Mount-only initialization restores the active persisted build once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!startNewDraft) return;
    updateBuild(null);
    setWorkingBuildId(createWorkingBuildId());
    setWorkingBuildName("Custom Build");
    setBuildNote("");
    setSelectedFrame("");
    setSelectedMotor("");
    setSelectedPropeller("");
    setSelectedESC("");
    setSelectedFC("");
    setSelectedBattery("");
    setSelectedReceiver("");
    setSelectedPresetId("");
    setClearedComponents([]);
    setCameraView("orbit");
    setExplodedAssembly(false);
    setShowFitOverlay(false);
    setGeometryOverrides(normalizeGeometryOverrides(null));
    setMessage({ type: "info", text: "New build started." });
    setSearchParams({}, { replace: true });
    setTimeout(() => setMessage({ type: "", text: "" }), 1800);
    // A same-route New Build action must reset component state as well as the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNewDraft]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    const newBuild = {
      id: currentBuild?.id || workingBuildId,
      userId,
      name: workingBuildName,
      note: buildNote,
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
      geometryOverrides,
      createdAt: currentBuild?.createdAt || now,
      updatedAt: now,
    };

    // Synchronously write to Context for use by AnalysisPage / HomePage
    updateBuild(newBuild);

    // Storage Logic (offline / online)
    if (!userId || userId === "leo") {
      const stored = readJsonStorage("offlineBuilds", []);
      const localBuilds = Array.isArray(stored) ? stored : [];
      const updatedBuilds = upsertBuild(localBuilds, newBuild);
      if (!writeJsonStorage("offlineBuilds", updatedBuilds)) {
        setMessage({ type: "error", text: "The browser could not save this build locally." });
        return;
      }
      localStorage.removeItem(BUILD_DRAFT_KEY);
      setMessage({ type: "success", text: "Build saved locally." });
      setTimeout(() => { setMessage({ type: "", text: "" }); navigate("/"); }, 2000);
      return;
    }

    const res = await fetch(`${API_BASE}/api/builds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBuild),
    });
    if (!res.ok) throw new Error(await res.text());
    localStorage.removeItem(BUILD_DRAFT_KEY);
    navigate("/");
  };

  const handleAnalyze = () => {
    // Create build config
    const build = {
      id: currentBuild?.id || workingBuildId,
      name: workingBuildName,
      note: buildNote,
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
      geometryOverrides,
    };

    // Save to context
    updateBuild(build);

    // Navigate to analysis page
    navigate("/analysis", { state: { build } });
  };

  // 3D model URLs state
  const [modelUrls, setModelUrls] = useState([]); // legacy aggregated urls (non-motor components)
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const [motorModelUrl, setMotorModelUrl] = useState(null);
  const [batteryModelUrl, setBatteryModelUrl] = useState(null);
  const [propellerModelUrl, setPropellerModelUrl] = useState(null);
  const [propellerCWModelUrl, setPropellerCWModelUrl] = useState(null);
  const [propellerCCWModelUrl, setPropellerCCWModelUrl] = useState(null);
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
  const [cameraView, setCameraView] = useState("orbit");
  const [explodedAssembly, setExplodedAssembly] = useState(false);
  const [showFitOverlay, setShowFitOverlay] = useState(false);
  const [measurementTarget, setMeasurementTarget] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(requestedPreset?.id || "");

  // Ensure the viewer starts clean (no fallback sample) every time BuildPage mounts
  useEffect(() => {
    setResetKey(k => k + 1);
  }, []);

  useEffect(() => {
    setMeasurementTarget(null);
  }, [
    selectedBattery,
    selectedESC,
    selectedFC,
    selectedFrame,
    selectedMotor,
    selectedPropeller,
    selectedReceiver,
  ]);

  useEffect(() => {
    const preset = getPlatformPreset(selectedPresetId);
    if (!preset) return;
    const currentIds = {
      frameId: selectedFrame,
      motorId: selectedMotor,
      propellerId: selectedPropeller,
      escId: selectedESC,
      flightControllerId: selectedFC,
      batteryId: selectedBattery,
      receiverId: selectedReceiver,
    };
    if (!matchesPlatformPreset(preset, currentIds)) setSelectedPresetId("");
  }, [
    selectedBattery,
    selectedESC,
    selectedFC,
    selectedFrame,
    selectedMotor,
    selectedPresetId,
    selectedPropeller,
    selectedReceiver,
  ]);

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

  useEffect(() => {
    writeJsonStorage(BUILD_DRAFT_KEY, {
      version: 1,
      id: workingBuildId,
      name: workingBuildName,
      note: buildNote,
      componentIds: {
        frameId: selectedFrame || null,
        motorId: selectedMotor || null,
        propellerId: selectedPropeller || null,
        escId: selectedESC || null,
        flightControllerId: selectedFC || null,
        batteryId: selectedBattery || null,
        receiverId: selectedReceiver || null,
      },
      geometryOverrides,
      updatedAt: new Date().toISOString(),
    });
  }, [
    selectedBattery,
    selectedESC,
    selectedFC,
    selectedFrame,
    selectedMotor,
    selectedPropeller,
    selectedReceiver,
    workingBuildId,
    workingBuildName,
    buildNote,
    geometryOverrides,
  ]);

  // Build model URLs when key selections change
  useEffect(() => {
    const nonFrameSelected = selectedMotor || selectedPropeller || selectedESC || selectedFC || selectedBattery || selectedReceiver;

    // Block rendering entirely until a frame is chosen.
    if (!selectedFrame) {
      setModelUrls([]);
      setMotorModelUrl(null);
      setBatteryModelUrl(null);
      setPropellerModelUrl(null);
      setPropellerCWModelUrl(null);
      setPropellerCCWModelUrl(null);
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
    const load = () => {
      setLoadingModels(true);
      setModelError("");
      const [
        frameUrl,
        motorUrl,
        batteryUrl,
        escUrl,
        fcUrl,
        receiverUrl,
        propModels,
      ] = [
        resolveModelForComponent("frames", selectedFrame).modelUrl,
        resolveModelForComponent("motors", selectedMotor).modelUrl,
        resolveModelForComponent("batteries", selectedBattery).modelUrl,
        resolveModelForComponent("escs", selectedESC).modelUrl,
        resolveModelForComponent("flight_controllers", selectedFC).modelUrl,
        resolveModelForComponent("receivers", selectedReceiver).modelUrl,
        resolvePropellerModelPair(selectedPropeller),
      ];
      if (cancelled) return;
      const urls = frameUrl ? [frameUrl] : [];
      const propUrl = propModels.ccw || propModels.cw;
        
        setMotorModelUrl(prev => motorUrl === prev ? prev : motorUrl);
        setBatteryModelUrl(prev => batteryUrl === prev ? prev : batteryUrl);
        setPropellerModelUrl(prev => propUrl === prev ? prev : propUrl);
        setPropellerCWModelUrl(prev => propModels.cw === prev ? prev : propModels.cw);
        setPropellerCCWModelUrl(prev => propModels.ccw === prev ? prev : propModels.ccw);
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
          motorUrl ||
          batteryUrl ||
          escUrl ||
          fcUrl ||
          receiverUrl ||
          propUrl
        );

        setModelError(hasAnyRenderable || selectedFrame ? "" : "Select a frame to begin assembly.");

        setLoadingModels(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedFrame, selectedMotor, selectedBattery, selectedPropeller, selectedESC, selectedFC, selectedReceiver]);

  const selectedFramePart = componentsData.frames.find((part) => part.id === selectedFrame);
  const selectedMotorPart = componentsData.motors.find((part) => part.id === selectedMotor);
  const selectedPropellerPart = componentsData.propellers.find((part) => part.id === selectedPropeller);
  const selectedBatteryPart = componentsData.batteries.find((part) => part.id === selectedBattery);
  const selectedEscPart = componentsData.escs.find((part) => part.id === selectedESC);
  const selectedFlightControllerPart = componentsData.flight_controllers.find((part) => part.id === selectedFC);
  const selectedReceiverPart = componentsData.receivers.find((part) => part.id === selectedReceiver);
  const measuredGeometryParts = useMemo(() => [
    { category: "frames", label: "Frame", part: selectedFramePart },
    { category: "motors", label: "Motor", part: selectedMotorPart },
    { category: "propellers", label: "Propeller", part: selectedPropellerPart },
    { category: "batteries", label: "Battery", part: selectedBatteryPart },
    { category: "escs", label: "ESC", part: selectedEscPart },
    {
      category: "flight_controllers",
      label: "Flight controller",
      part: selectedFlightControllerPart,
    },
    { category: "receivers", label: "Receiver", part: selectedReceiverPart },
  ].filter(({ part }) => part), [
    selectedFramePart,
    selectedMotorPart,
    selectedPropellerPart,
    selectedBatteryPart,
    selectedEscPart,
    selectedFlightControllerPart,
    selectedReceiverPart,
  ]);
  const requiredParts = [
    selectedFramePart,
    selectedMotorPart,
    selectedPropellerPart,
    selectedBatteryPart,
  ];
  const requiredSelections = requiredParts.filter(Boolean).length;
  const requiredCompletion = (requiredSelections / 4) * 100;
  const canAnalyze = requiredSelections === 4;
  const canSave = canAnalyze;

  const catalogAssemblySpec = useMemo(() => ({
    frame: selectedFramePart || null,
    motor: selectedMotorPart || null,
    propeller: selectedPropellerPart || null,
    battery: selectedBatteryPart || null,
    esc: selectedEscPart || null,
    flightController: selectedFlightControllerPart || null,
    receiver: selectedReceiverPart || null,
  }), [
    selectedFramePart,
    selectedMotorPart,
    selectedPropellerPart,
    selectedBatteryPart,
    selectedEscPart,
    selectedFlightControllerPart,
    selectedReceiverPart,
  ]);
  const assemblySpec = useMemo(
    () => applyMeasuredGeometryToAssemblySpec(
      catalogAssemblySpec,
      geometryOverrides,
    ),
    [catalogAssemblySpec, geometryOverrides],
  );
  const hardwareReadiness = useMemo(
    () => summarizeHardwareReadiness({
      buildId: workingBuildId,
      flightController: selectedFlightControllerPart,
      receiver: selectedReceiverPart,
      buildMotorCount: selectedFramePart?.motorCount ?? null,
    }),
    [
      selectedFlightControllerPart,
      selectedFramePart?.motorCount,
      selectedReceiverPart,
      workingBuildId,
    ],
  );
  const navigationSafetyLabel = describeNavigationSafety(hardwareReadiness);
  const missionControlsLabel = describeMissionControls(hardwareReadiness);
  const viewerPlacementAudit = useMemo(
    () => buildViewerPlacementAudit(assemblySpec.frame, assemblySpec),
    [assemblySpec],
  );
  const fitOverlayStatus = useMemo(() => {
    const statusById = Object.fromEntries(
      viewerPlacementAudit.checks.map((check) => [check.id, check.status]),
    );
    const motorStatus = statusById["motor-interface"];
    const propHubStatus = statusById["propeller-hub"];
    const propSweepStatus = statusById["propeller-sweep"];
    return {
      motorKnown: ["verified", "measured", "conflict"].includes(motorStatus),
      motorConflict: motorStatus === "conflict",
      motorMeasured: motorStatus === "measured",
      propellerKnown: ["verified", "measured", "conflict"].includes(propSweepStatus),
      propellerConflict: propHubStatus === "conflict"
        || propSweepStatus === "conflict",
      propellerMeasured: propHubStatus === "measured"
        || propSweepStatus === "measured",
    };
  }, [viewerPlacementAudit]);
  const requestMeasurement = (check) => {
    const target = placementCheckMeasurementTarget(check, assemblySpec);
    if (!target) return;
    setMeasurementTarget((current) => ({
      ...target,
      requestId: (current?.requestId || 0) + 1,
    }));
  };

  const summarizeCandidate = (physicalChecks = [], electricalChecks = []) => {
    const physical = summarizePhysicalChecks(physicalChecks);
    const electrical = summarizeElectricalChecks(electricalChecks);
    if (!physical.ok || !electrical.ok) {
      return {
        ok: false,
        verified: false,
        reason: !physical.ok ? physical.reason : electrical.reason,
      };
    }
    return {
      ok: true,
      verified: physical.verified && electrical.verified,
      reason: [physical.reason, electrical.reason]
        .filter((reason) => reason && !reason.startsWith("No "))
        .join(" "),
    };
  };

  const compatibility = {
    frames: (part) => summarizeCandidate(
      [
        ...(selectedMotorPart
          ? physicalChecksFor("motors", selectedMotorPart, {
              ...assemblySpec,
              frame: part,
            })
          : []),
        ...(selectedEscPart
          ? physicalChecksFor("escs", selectedEscPart, {
              ...assemblySpec,
              frame: part,
            })
          : []),
        ...(selectedFlightControllerPart
          ? physicalChecksFor("flight_controllers", selectedFlightControllerPart, {
              ...assemblySpec,
              frame: part,
            })
          : []),
      ],
      [checkPropellerClearance(selectedPropellerPart, part)],
    ),
    motors: (part) => summarizeCandidate(
      physicalChecksFor("motors", part, assemblySpec),
      [checkMotorVoltage(part, selectedBatteryPart)],
    ),
    propellers: (part) => summarizeCandidate(
      physicalChecksFor("propellers", part, assemblySpec),
      [checkPropellerClearance(part, selectedFramePart)],
    ),
    batteries: (part) => summarizeCandidate(
      physicalChecksFor("batteries", part, assemblySpec),
      [
        checkMotorVoltage(selectedMotorPart, part),
        checkEscVoltage(selectedEscPart, part),
      ],
    ),
    escs: (part) => summarizeCandidate(
      physicalChecksFor("escs", part, assemblySpec),
      [
        checkEscVoltage(part, selectedBatteryPart),
        checkEscCurrent(part, selectedMotorPart),
      ],
    ),
    flight_controllers: (part) => summarizeCandidate(
      physicalChecksFor("flight_controllers", part, assemblySpec),
      [checkFlightControllerVoltage(part, selectedBatteryPart)],
    ),
    receivers: (part) => {
      if (!hardwareReadiness.configured) {
        return {
          ok: true,
          verified: false,
          reason: "Save a radio plan to check receiver RF bands.",
        };
      }
      const target = getRadioTarget(hardwareReadiness.radioPlan.targetId);
      const bands = getRadioReceiverBandCompatibility(target.id, part);
      if (bands.status === "conflict") {
        return {
          ok: false,
          verified: false,
          reason: `No documented RF band is shared with ${target.name}.`,
        };
      }
      if (bands.status === "unverified") {
        return {
          ok: true,
          verified: false,
          reason: "Receiver or transmitter RF band metadata is incomplete.",
        };
      }
      return {
        ok: true,
        verified: false,
        reason: `Shares ${bands.sharedBandLabels.join(" / ")} with ${target.name}; RF setup is still unverified.`,
      };
    },
  };

  const selectedPhysicalChecks = [
    ...(assemblySpec.motor
      ? physicalChecksFor("motors", assemblySpec.motor, assemblySpec)
      : []),
    ...(assemblySpec.esc
      ? physicalChecksFor("escs", assemblySpec.esc, assemblySpec)
      : []),
    ...(assemblySpec.battery
      ? physicalChecksFor("batteries", assemblySpec.battery, assemblySpec)
      : []),
    ...(assemblySpec.flightController
      ? physicalChecksFor(
          "flight_controllers",
          assemblySpec.flightController,
          assemblySpec,
        )
      : []),
  ];
  const physicalFit = summarizePhysicalChecks(selectedPhysicalChecks);
  const powerPath = summarizePowerPath(selectedBatteryPart, selectedEscPart);
  const physicalCheckRows = Array.from(
    new Map(
      selectedPhysicalChecks.map((item) => [
        `${item.status}:${item.label}:${item.message}`,
        item,
      ]),
    ).values(),
  );
  const physicalVerifiedCount = physicalCheckRows.filter(
    (item) => item.status === "compatible",
  ).length;
  const physicalMeasuredCount = physicalCheckRows.filter(
    (item) => item.status === "measured",
  ).length;
  const physicalMissingCount = physicalCheckRows.filter(
    (item) => item.status === "unknown",
  ).length;
  const selectedElectricalChecks = electricalChecksFor(assemblySpec);
  const electricalFit = summarizeElectricalChecks(selectedElectricalChecks);
  const electricalCheckRows = Array.from(
    new Map(
      selectedElectricalChecks.map((item) => [
        `${item.status}:${item.label}:${item.message}`,
        item,
      ]),
    ).values(),
  );
  const electricalVerifiedCount = electricalCheckRows.filter(
    (item) => item.status === "compatible",
  ).length;
  const electricalConflictCount = electricalCheckRows.filter(
    (item) => item.status === "conflict",
  ).length;
  const electricalMissingCount = electricalCheckRows.filter(
    (item) => item.status === "unknown",
  ).length;
  const buildEvidence = useMemo(
    () => summarizeBuildEvidence(assemblySpec),
    [assemblySpec],
  );
  const assemblyPropellerDirection = useMemo(() => (
    hardwareReadiness.configured &&
    hardwareReadiness.fcPropellerDirection
      ? hardwareReadiness.fcPropellerDirection
      : "props-out"
  ), [
    hardwareReadiness.configured,
    hardwareReadiness.fcPropellerDirection,
  ]);
  const physicalFitState = selectedPhysicalChecks.length === 0
    ? "pending"
    : !physicalFit.ok
      ? "conflict"
      : physicalMissingCount > 0
        ? "unverified"
        : physicalFit.measured > 0 ? "measured"
          : physicalFit.verified ? "verified" : "unverified";
  const compatibilityConflict = !physicalFit.ok || !electricalFit.ok;

  const copyBuildBriefing = async () => {
    const briefing = createBuildBriefing({
      build: {
        id: workingBuildId,
        name: workingBuildName,
        note: buildNote,
        geometryOverrides,
      },
      assemblySpec,
      viewerPlacement: viewerPlacementAudit,
      hardwareReadiness,
    });
    if (!navigator.clipboard?.writeText) {
      setMessage({
        type: "error",
        text: "Clipboard access is unavailable in this browser.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(briefing.text);
      setMessage({
        type: "success",
        text: "Build briefing copied. Hardware and flight readiness are not verified.",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch {
      setMessage({
        type: "error",
        text: "The browser refused clipboard access.",
      });
    }
  };

  const exportBuildSheet = () => {
    const exportedBuild = {
      id: workingBuildId,
      name: workingBuildName,
      note: buildNote,
      componentIds: {
        frameId: selectedFrame || null,
        motorId: selectedMotor || null,
        propellerId: selectedPropeller || null,
        escId: selectedESC || null,
        flightControllerId: selectedFC || null,
        batteryId: selectedBattery || null,
        receiverId: selectedReceiver || null,
      },
      geometryOverrides,
    };
    const sheet = createBuildSheet({
      build: exportedBuild,
      assemblySpec,
      hardwareReadiness,
      importedEvidence: summarizeBenchEvidenceAttachment(
        readBenchEvidenceAttachment(exportedBuild.id),
        readCurrentBenchEvidenceScope(exportedBuild),
      ),
      viewerPlacement: viewerPlacementAudit,
    });
    const blob = new Blob([JSON.stringify(sheet, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = buildSheetFilename(exportedBuild.name);
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage({
      type: "success",
      text: "Build sheet exported. Analysis is not included.",
    });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const exportBuildBom = () => {
    const exportedBuild = {
      name: workingBuildName,
      componentIds: {
        frameId: selectedFrame || null,
        motorId: selectedMotor || null,
        propellerId: selectedPropeller || null,
        escId: selectedESC || null,
        flightControllerId: selectedFC || null,
        batteryId: selectedBattery || null,
        receiverId: selectedReceiver || null,
      },
    };
    const blob = new Blob([createBuildBomCsv(exportedBuild)], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = buildBomFilename(exportedBuild.name);
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage({
      type: "success",
      text: "BOM CSV exported with catalog quantities and prices.",
    });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const copyBuildShareLink = async () => {
    try {
      const link = buildShareUrl({
        componentIds: {
          frameId: selectedFrame || null,
          motorId: selectedMotor || null,
          propellerId: selectedPropeller || null,
          escId: selectedESC || null,
          flightControllerId: selectedFC || null,
          batteryId: selectedBattery || null,
          receiverId: selectedReceiver || null,
        },
        geometryOverrides,
      });
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(link);
      setMessage({
        type: "success",
        text: "Share link copied. It contains catalog IDs and validated measurements only.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: `Could not create share link: ${error.message}`,
      });
    }
  };

  const applyPlatformPreset = (presetId) => {
    const preset = getPlatformPreset(presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setSelectedFrame(preset.componentIds.frameId);
    setSelectedMotor(preset.componentIds.motorId);
    setSelectedPropeller(preset.componentIds.propellerId);
    setSelectedESC(preset.componentIds.escId);
    setSelectedFC(preset.componentIds.flightControllerId);
    setSelectedBattery(preset.componentIds.batteryId);
    setSelectedReceiver(preset.componentIds.receiverId);
    setClearedComponents([]);
    setCameraView("orbit");
    setBuildNote("");
    setGeometryOverrides(normalizeGeometryOverrides(null));
    setMessage({ type: "info", text: `${preset.name} loaded. Review before analysis.` });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const openHardwareSetup = () => {
    navigate("/setup", {
      state: {
        build: {
          id: workingBuildId,
          name: workingBuildName,
          note: buildNote,
          componentIds: {
            frameId: selectedFrame || null,
            motorId: selectedMotor || null,
            propellerId: selectedPropeller || null,
            escId: selectedESC || null,
            flightControllerId: selectedFC || null,
            batteryId: selectedBattery || null,
            receiverId: selectedReceiver || null,
          },
          geometryOverrides,
        },
      },
    });
  };

  const toggleComponentVisibility = (componentType) => {
    setClearedComponents((current) => (
      current.includes(componentType)
        ? current.filter((type) => type !== componentType)
        : [...current, componentType]
    ));
  };

  return (
    <div className="app-container">
      {message.text && (
        <div
          className={`message-bar ${message.type}`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}
      {/* Page Title & 3D Preview */}
      <section className="build-page-header">
        <div>
          <h1><span>Build</span><span>configuration</span></h1>
          <p>Choose compatible components and preview the assembly before analysis.</p>
        </div>
        <div
          className="build-completion"
          role="status"
          aria-label={`${requiredSelections} of 4 required components selected`}
        >
          <div>
            <strong>{requiredSelections}/4</strong>
            <span>required parts</span>
          </div>
          <div className="completion-track" aria-hidden="true">
            <span style={{ width: `${requiredCompletion}%` }} />
          </div>
          <div className="completion-parts" aria-hidden="true">
            {[
              ["Frame", selectedFrame],
              ["Motors", selectedMotor],
              ["Props", selectedPropeller],
              ["Battery", selectedBattery],
            ].map(([label, selected]) => (
              <span key={label} className={selected ? "is-selected" : ""}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="build-workspace">
        <section className="build-preview-panel" aria-label="3D build preview">
          <div className="build-preview-header">
            <div>
              <h2>Assembly preview</h2>
              <p>Models appear as you add compatible parts.</p>
            </div>
            <span className="preview-live-label">
              <span aria-hidden="true" />
              Live
            </span>
          </div>

          {(selectedFrame || selectedMotor || selectedBattery) && (
            <div className="preview-controls">
              <div className="preview-controls-heading">
                <span>Visible components</span>
                <div className="preview-tools">
                  <label>
                    Background
                    <select
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                    >
                      <option value="#2d2d44">Dark gray</option>
                      <option value="#111111">Black</option>
                      <option value="#1a1a2e">Dark blue</option>
                      <option value="#2c3e50">Slate blue</option>
                      <option value="#34495e">Charcoal</option>
                      <option value="#ffffff">White</option>
                      <option value="#f5f5f5">Light gray</option>
                      <option value="#e3f2fd">Light blue</option>
                      <option value="#fff3e0">Light orange</option>
                      <option value="#f1f8e9">Light green</option>
                      <option value="#fce4ec">Light pink</option>
                      <option value="#e8eaf6">Lavender</option>
                      <option value="#fff9c4">Light yellow</option>
                      <option value="#e0f2f1">Mint</option>
                      <option value="#263238">Dark teal</option>
                      <option value="#3e2723">Dark brown</option>
                      <option value="#1b5e20">Dark green</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="preview-debug-toggle"
                    onClick={() => setShowDebugStatus(!showDebugStatus)}
                    aria-pressed={showDebugStatus}
                  >
                    {showDebugStatus ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    {showDebugStatus ? "Hide status" : "Show status"}
                  </button>
                </div>
              </div>
              <div
                className="camera-preset-row"
                role="group"
                aria-label="3D inspection view"
              >
                {Object.values(CAMERA_VIEWS).map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    className={`camera-preset-button ${cameraView === view.id ? "is-active" : ""}`}
                    aria-pressed={cameraView === view.id}
                    onClick={() => setCameraView(view.id)}
                  >
                    {view.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`camera-preset-button ${explodedAssembly ? "is-active" : ""}`}
                  aria-pressed={explodedAssembly}
                  onClick={() => setExplodedAssembly((current) => !current)}
                >
                  <Layers size={13} aria-hidden="true" />
                  {explodedAssembly ? "Assembled" : "Exploded"}
                </button>
              </div>
              <div className="visibility-chip-row">
                <button
                  type="button"
                  className={`visibility-chip viewer-fit-toggle ${
                    showFitOverlay ? "is-active" : ""
                  }`}
                  aria-pressed={showFitOverlay}
                  onClick={() => setShowFitOverlay((current) => !current)}
                >
                  <Fan size={14} aria-hidden="true" />
                  <span>Fit overlay</span>
                </button>
                {[
                  { id: "frame", label: "Frame", Icon: Box, has: selectedFrame },
                  { id: "motor", label: "Motors", Icon: Cog, has: selectedMotor },
                  { id: "propeller", label: "Props", Icon: Fan, has: selectedPropeller },
                  { id: "battery", label: "Battery", Icon: BatteryCharging, has: selectedBattery },
                  { id: "flight_controller", label: "FC", Icon: Cpu, has: selectedFC },
                  { id: "esc", label: "ESC", Icon: Zap, has: selectedESC },
                  { id: "receiver", label: "RX", Icon: Radio, has: selectedReceiver },
                ].filter((comp) => comp.has).map(({ id, label, Icon }) => {
                  const isHidden = clearedComponents.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`visibility-chip ${isHidden ? "is-hidden" : ""}`}
                      aria-pressed={!isHidden}
                      onClick={() => toggleComponentVisibility(id)}
                    >
                      <Icon size={14} aria-hidden="true" />
                      <span>{label}</span>
                      {isHidden ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="build-viewer-frame">
            {!selectedFrame && !loadingModels && !modelError && (
              <div className="viewer-empty-state">
                <Box size={30} strokeWidth={1.5} aria-hidden="true" />
                <h3>Start with a frame</h3>
                <p>Choose the airframe first. The remaining parts will build around it.</p>
              </div>
            )}
            {selectedFrame && (
              <Suspense
                fallback={(
                  <div className="viewer-loading-state" role="status">
                    Loading 3D assembly view
                  </div>
                )}
              >
                <BabylonViewer
                  modelUrl={null}
                  modelUrls={modelUrls}
                  motorUrl={motorModelUrl}
                  motorMountingPoint={motorMountingPoint}
                  frameCornerPositions={frameCornerPositions}
                  propellerUrl={propellerModelUrl}
                  propellerCWUrl={propellerCWModelUrl}
                  propellerCCWUrl={propellerCCWModelUrl}
                  propellerDirection={assemblyPropellerDirection}
                  propellerMountingPoint={propellerMountingPoint}
                  batteryUrl={batteryModelUrl}
                  batteryMountingPoint={batteryMountingPoint}
                  escUrl={escModelUrl}
                  escMountingPoint={escMountingPoint}
                  fcUrl={fcModelUrl}
                  fcMountingPoint={fcMountingPoint}
                  receiverUrl={receiverModelUrl}
                  receiverMountingPoint={receiverMountingPoint}
                  assemblySpec={assemblySpec}
                  exploded={explodedAssembly}
                  groundClearance={4}
                  autoRotate={cameraView === "orbit"}
                  cameraView={cameraView}
                  onLoaded={() => {}}
                  resetKey={resetKey}
                  clearedComponents={clearedComponents}
                  debug={showDebugStatus}
                  showFitOverlay={showFitOverlay}
                  fitOverlayStatus={fitOverlayStatus}
                  backgroundColor={backgroundColor}
                />
              </Suspense>
            )}
            {selectedFrame && showFitOverlay && (
              <div className="viewer-fit-legend" role="status">
                <strong>Fit overlay</strong>
                <span>
                  <i className="is-verified" aria-hidden="true" />
                  Verified interface
                  <i className="is-measured" aria-hidden="true" />
                  User-measured
                  <i className="is-conflict" aria-hidden="true" />
                  Conflict
                  <i className="is-awaiting" aria-hidden="true" />
                  Metadata incomplete
                </span>
              </div>
            )}
          </div>
          {explodedAssembly && selectedFrame && (
            <div
              className={`viewer-exploded-note ${
                buildEvidence.geometryFallbackCount ? "has-fallback" : ""
              }`}
              role="status"
            >
              <Layers size={16} aria-hidden="true" />
              <span>
                <strong>Exploded inspection</strong>
                <small>
                  {buildEvidence.selectedCount} selected part{buildEvidence.selectedCount === 1 ? "" : "s"} ·{" "}
                  {Math.max(
                    0,
                    buildEvidence.selectedCount - buildEvidence.geometryFallbackCount,
                  )} catalog geometry ·{" "}
                  {buildEvidence.geometryFallbackCount} generated fallback
                  {buildEvidence.geometryFallbackCount === 1 ? "" : "s"}. Separation
                  clarifies stack and mount relationships; it is not a product-exact
                  fit, wiring, or hardware check.
                </small>
              </span>
              <em>
                {buildEvidence.geometryFallbackCount === 0
                  ? "Catalog geometry"
                  : buildEvidence.geometryFallbackCount === buildEvidence.selectedCount
                    ? "Fallback geometry"
                    : "Mixed geometry"}
              </em>
            </div>
          )}
          {loadingModels && (
            <div className="model-status" role="status">
              <LoaderCircle size={15} className="spin-icon" aria-hidden="true" />
              Loading component models...
            </div>
          )}
          {modelError && !loadingModels && (
            <div className="model-status is-error" role="alert">
              <CircleAlert size={15} aria-hidden="true" />
              {modelError}
            </div>
          )}
          {Object.values(assemblySpec).some(Boolean) && (
            <details className="viewer-placement-audit">
              <summary>
                <Layers size={16} aria-hidden="true" />
                <span>
                  <strong>Viewer placement</strong>
                  <small>Assembly geometry and catalogued interfaces</small>
                </span>
                <em className={
                  viewerPlacementAudit.complete
                    ? "is-complete"
                    : viewerPlacementAudit.conflictCount
                      ? "is-conflict"
                      : viewerPlacementAudit.measuredCount ? "is-measured" : ""
                }>
                  {describeViewerPlacement(viewerPlacementAudit)}
                </em>
              </summary>
              <div className="viewer-placement-audit-body">
                <p>
                  This audits assembled coordinates from catalog and fallback
                  geometry, build-local caliper measurements, and catalogued
                  mount and shaft interfaces. Source confidence stays visible
                  for every check. It does not claim complete product fit,
                  electrical compatibility, or a live aircraft check.
                </p>
                <ul aria-label="Viewer placement checks">
                  {viewerPlacementAudit.checks.map((check) => {
                    const measurementTarget = placementCheckMeasurementTarget(
                      check,
                      assemblySpec,
                    );
                    return (
                      <li
                        key={check.id}
                        className={`is-${check.status}`}
                        aria-label={check.label}
                      >
                        {check.status === "verified"
                          ? <Check size={14} aria-hidden="true" />
                          : check.status === "measured"
                            ? <Ruler size={14} aria-hidden="true" />
                          : check.status === "conflict"
                            ? <CircleAlert size={14} aria-hidden="true" />
                            : <Box size={14} aria-hidden="true" />}
                        <span>
                          <strong>{check.label}</strong>
                          <small>{check.detail}</small>
                        </span>
                        <span className="viewer-check-actions">
                          <em>{
                            check.status === "verified"
                              ? "Verified"
                              : check.status === "measured"
                                ? "Measured"
                              : check.status === "conflict"
                                ? "Conflict"
                                : check.status === "estimated"
                                  ? "Estimated"
                                  : check.status === "fallback"
                                    ? "Fallback"
                                    : "Awaiting"
                          }</em>
                          {measurementTarget && (
                            <button
                              type="button"
                              aria-label={`Measure ${measurementTarget.fieldLabel} for ${check.label}`}
                              onClick={() => requestMeasurement(check)}
                            >
                              <Ruler size={13} aria-hidden="true" />
                              Measure
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          )}
          <AssemblyInterfaceMap
            frame={assemblySpec.frame}
            motor={assemblySpec.motor}
            propeller={assemblySpec.propeller}
            esc={assemblySpec.esc}
            flightController={assemblySpec.flightController}
            battery={assemblySpec.battery}
          />
          <PropRotationMap
            motor={assemblySpec.motor}
            propeller={assemblySpec.propeller}
            direction={assemblyPropellerDirection}
            motorOutputByCorner={
              hardwareReadiness.configured
                ? hardwareReadiness.fcMotorOutputByCorner
                : null
            }
          />
          <AssemblyStackMap
            frame={assemblySpec.frame}
            esc={assemblySpec.esc}
            flightController={assemblySpec.flightController}
            receiver={assemblySpec.receiver}
            battery={assemblySpec.battery}
            motor={assemblySpec.motor}
            propeller={assemblySpec.propeller}
            clearedComponents={clearedComponents}
            onToggleComponent={toggleComponentVisibility}
          />
          <MeasuredGeometryPanel
            parts={measuredGeometryParts}
            overrides={geometryOverrides}
            focusTarget={measurementTarget}
            onChange={(category, partId, field, value) => {
              setGeometryOverrides((current) => setMeasuredGeometryValue(
                current,
                category,
                partId,
                field,
                value,
              ));
            }}
            onReset={(category, partId) => {
              setGeometryOverrides((current) => clearMeasuredGeometry(
                current,
                category,
                partId,
              ));
            }}
          />
        </section>

        <section className="build-form-panel" aria-label="Component selection">
          <div className="build-form-heading">
            <div>
              <h2>Parts manifest</h2>
              <p>Select the required frame, power, and control components.</p>
            </div>
            {canAnalyze && (
              <span className={`ready-chip ${compatibilityConflict ? "is-review" : ""}`}>
                {compatibilityConflict
                  ? <CircleAlert size={14} aria-hidden="true" />
                  : <Check size={14} aria-hidden="true" />}
                {compatibilityConflict ? "Review limits" : "Ready"}
              </span>
            )}
          </div>

          <div className={`physical-fit-summary is-${physicalFitState}`}>
            {physicalFitState === "conflict"
              ? <CircleAlert size={16} aria-hidden="true" />
              : physicalFitState === "measured"
                ? <Ruler size={16} aria-hidden="true" />
              : physicalFitState === "verified"
                ? <Check size={16} aria-hidden="true" />
                : <Box size={16} aria-hidden="true" />}
            <span>
              <strong>
                {physicalFitState === "conflict"
                  ? "Physical fit conflict"
                  : physicalFitState === "measured"
                    ? "Physical fit uses local measurements"
                  : physicalFitState === "verified"
                    ? "Physical fit verified"
                    : "Fit needs manual verification"}
              </strong>
              <small>
                {physicalFitState === "pending"
                  ? "Add a frame, motors, or electronics to check mounting and shaft data."
                  : physicalFit.reason}
              </small>
            </span>
          </div>

          {physicalCheckRows.length > 0 && (
            <details className="physical-fit-details">
              <summary>
                <ChevronRight size={14} aria-hidden="true" />
                <span>Physical fit checks</span>
                <small>
                  {physicalVerifiedCount} verified
                  {physicalMeasuredCount
                    ? ` · ${physicalMeasuredCount} measured`
                    : ""}
                  {physicalMissingCount
                    ? ` · ${physicalMissingCount} awaiting data`
                    : " · no data gaps"}
                </small>
              </summary>
              <ul>
                {physicalCheckRows.map((item) => (
                  <li
                    key={`${item.status}:${item.label}:${item.message}`}
                    className={`is-${item.status}`}
                    aria-label={item.label}
                  >
                    {item.status === "compatible"
                      ? <Check size={14} aria-hidden="true" />
                      : item.status === "measured"
                        ? <Ruler size={14} aria-hidden="true" />
                      : item.status === "conflict"
                        ? <CircleAlert size={14} aria-hidden="true" />
                        : <Box size={14} aria-hidden="true" />}
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.message}</small>
                    </span>
                    <em>
                      {item.status === "compatible"
                        ? "Verified"
                        : item.status === "measured"
                          ? "Measured"
                        : item.status === "conflict"
                          ? "Conflict"
                          : "Awaiting data"}
                    </em>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {(selectedBatteryPart || selectedEscPart) && (
            <section
              className={`power-path-summary is-${powerPath.displayState}`}
              aria-label="Battery to ESC power path"
            >
              <div className="power-path-heading">
                <Zap size={15} aria-hidden="true" />
                <span>
                  <strong>Power path</strong>
                  <small>Battery to ESC termination</small>
                </span>
                <em>{powerPath.label}</em>
              </div>
              <div className="power-path-route">
                <div>
                  <BatteryCharging size={16} aria-hidden="true" />
                  <span>
                    <small>Battery</small>
                    <strong title={powerPath.batteryName}>
                      {powerPath.batteryName}
                    </strong>
                  </span>
                  {powerPath.batteryConnectorSourceUrl ? (
                    <a
                      href={powerPath.batteryConnectorSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open battery connector source for ${powerPath.batteryName}`}
                    >
                      {powerPath.batteryConnector || "Connector source"}
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : (
                    <em>{powerPath.batteryConnector || "Connector missing"}</em>
                  )}
                </div>
                <ChevronRight size={16} aria-hidden="true" />
                <div>
                  <Zap size={16} aria-hidden="true" />
                  <span>
                    <small>ESC</small>
                    <strong title={powerPath.escName}>
                      {powerPath.escName}
                    </strong>
                  </span>
                  {powerPath.escConnectorSourceUrl ? (
                    <a
                      href={powerPath.escConnectorSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ESC power termination source for ${powerPath.escName}`}
                    >
                      {powerPath.escConnector
                        || (powerPath.escTermination === "solder-pads"
                          ? "Solder pads"
                          : powerPath.escTermination === "supplied-cable"
                            ? "Termination unspecified"
                            : "Connector source")}
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : (
                    <em>
                      {powerPath.escConnector
                        || (powerPath.escTermination === "solder-pads"
                          ? "Solder pads"
                          : powerPath.escTermination === "supplied-cable"
                            ? "Termination unspecified"
                            : "Connector missing")}
                    </em>
                  )}
                </div>
              </div>
              <p>{powerPath.message}</p>
            </section>
          )}

          {(selectedFramePart
            || selectedMotorPart
            || selectedPropellerPart
            || selectedBatteryPart
            || selectedEscPart
            || selectedFlightControllerPart) && (
            <details className="physical-fit-details electrical-fit-details">
              <summary>
                <ChevronRight size={14} aria-hidden="true" />
                <span>Electrical limits</span>
                <small>
                  {electricalConflictCount
                    ? `${electricalConflictCount} conflict${electricalConflictCount === 1 ? "" : "s"}`
                    : `${electricalVerifiedCount} verified`}
                  {electricalMissingCount
                    ? ` · ${electricalMissingCount} awaiting data`
                    : " · no data gaps"}
                </small>
              </summary>
              <ul>
                {electricalCheckRows.map((item) => (
                  <li
                    key={`${item.status}:${item.label}:${item.message}`}
                    className={`is-${item.status}`}
                    aria-label={item.label}
                  >
                    {item.status === "compatible"
                      ? <Check size={14} aria-hidden="true" />
                      : item.status === "conflict"
                        ? <CircleAlert size={14} aria-hidden="true" />
                        : <Box size={14} aria-hidden="true" />}
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.message}</small>
                    </span>
                    <em>
                      {item.status === "compatible"
                        ? "Verified"
                        : item.status === "conflict"
                          ? "Conflict"
                          : "Awaiting data"}
                    </em>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="platform-preset-picker">
            <label htmlFor="platform-preset">Starter platform</label>
            <select
              id="platform-preset"
              value={selectedPresetId}
              onChange={(event) => applyPlatformPreset(event.target.value)}
            >
              <option value="">Choose a source-backed platform</option>
              {PLATFORM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            {selectedPresetId && (
              <small>{getPlatformPreset(selectedPresetId)?.description}</small>
            )}
          </div>

      {/* Frame Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><Box size={17} aria-hidden="true" />Frame</h3>
        <PartPicker
          category="frames"
          parts={componentsData.frames}
          value={selectedFrame}
          onChange={setSelectedFrame}
          compatibility={compatibility.frames}
          placeholder="Choose a frame"
        />
      </div>

      {/* Motor Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><Cog size={17} aria-hidden="true" />Motors</h3>
        <PartPicker
          category="motors"
          parts={componentsData.motors}
          value={selectedMotor}
          onChange={setSelectedMotor}
          compatibility={compatibility.motors}
          placeholder="Choose four matching motors"
        />
      </div>

      {/* Propeller Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><Fan size={17} aria-hidden="true" />Propellers</h3>
        <PartPicker
          category="propellers"
          parts={componentsData.propellers}
          value={selectedPropeller}
          onChange={setSelectedPropeller}
          compatibility={compatibility.propellers}
          placeholder="Choose a propeller set"
        />
      </div>

      {/* ESC Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><Zap size={17} aria-hidden="true" />ESC</h3>
        <PartPicker
          category="escs"
          parts={componentsData.escs}
          value={selectedESC}
          onChange={setSelectedESC}
          compatibility={compatibility.escs}
          placeholder="Choose an ESC"
        />
      </div>

      {/* Flight Controller Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><Cpu size={17} aria-hidden="true" />Flight controller</h3>
        <PartPicker
          category="flight_controllers"
          parts={componentsData.flight_controllers}
          value={selectedFC}
          onChange={setSelectedFC}
          compatibility={compatibility.flight_controllers}
          placeholder="Choose a flight controller"
        />
      </div>

      {/* Battery Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><BatteryCharging size={17} aria-hidden="true" />Battery</h3>
        <PartPicker
          category="batteries"
          parts={componentsData.batteries}
          value={selectedBattery}
          onChange={setSelectedBattery}
          compatibility={compatibility.batteries}
          placeholder="Choose a battery"
        />
      </div>

      {/* Receiver Selection */}
      <div className="component-fieldset">
        <h3 className="section-title"><Radio size={17} aria-hidden="true" />Receiver <span>Optional</span></h3>
        <PartPicker
          category="receivers"
          parts={componentsData.receivers}
          value={selectedReceiver}
          onChange={setSelectedReceiver}
          compatibility={compatibility.receivers}
          placeholder="Choose a receiver"
        />
      </div>

      {buildEvidence.selectedCount > 0 && (
        <details className="build-evidence-panel">
          <summary>
            <FileCheck2 size={17} aria-hidden="true" />
            <span>
              <strong>Build provenance</strong>
              <small>
                {buildEvidence.sourceBackedCount}/{buildEvidence.selectedCount} source-backed
                {buildEvidence.estimatedFieldCount
                  ? ` · ${buildEvidence.estimatedFieldCount} estimated fields`
                  : ""}
                {buildEvidence.measuredFieldCount
                  ? ` · ${buildEvidence.measuredFieldCount} measured fields`
                  : ""}
                {buildEvidence.geometryFallbackCount
                  ? ` · ${buildEvidence.geometryFallbackCount} geometry fallbacks`
                  : ""}
              </small>
            </span>
          </summary>
          <div className="build-note-field">
            <label htmlFor="build-notes">Build notes</label>
            <textarea
              id="build-notes"
              aria-describedby="build-notes-help"
              rows="3"
              maxLength="600"
              value={buildNote}
              placeholder="Record substitutions, inspection steps, or questions for this build."
              onChange={(event) => setBuildNote(event.target.value)}
            />
            <small id="build-notes-help">
              {buildNote.length}/600 · Build-local context; included in saves and exports, not hardware verification.
            </small>
          </div>
          <div className="build-evidence-actions">
            <button type="button" onClick={copyBuildBriefing}>
              <Clipboard size={15} aria-hidden="true" />
              Copy briefing
            </button>
            <button type="button" onClick={copyBuildShareLink}>
              <Clipboard size={15} aria-hidden="true" />
              Copy share link
            </button>
            <button type="button" onClick={exportBuildSheet}>
              <Download size={15} aria-hidden="true" />
              Export build sheet
            </button>
            <button type="button" onClick={exportBuildBom}>
              <Download size={15} aria-hidden="true" />
              Export BOM CSV
            </button>
            <span>Draft JSON · no analysis or hardware verification claim</span>
          </div>
          <div className="build-evidence-list">
            {buildEvidence.parts.map((part) => (
              <div key={part.key} className="build-evidence-row">
                <div className="build-evidence-part">
                  <span>{part.label}</span>
                  <strong>{part.name}</strong>
                </div>
                <div className="build-evidence-tags">
                  <span className={part.sourceBacked ? "is-source" : "is-legacy"}>
                    {part.sourceBacked ? "Source-backed" : "Legacy catalog"}
                  </span>
                  <span className={part.geometryFallback ? "is-fallback" : "is-model"}>
                    {part.geometryFallback
                      ? "Generated geometry"
                      : part.modelContractStatus === "legacy-unverified"
                        ? "Catalog GLB · legacy contract"
                        : "Catalog GLB"}
                  </span>
                  {part.estimatedFields.length > 0 && (
                    <span>{part.estimatedFields.length} estimated</span>
                  )}
                  {part.measuredFields.length > 0 && (
                    <span>{part.measuredFields.length} measured</span>
                  )}
                </div>
                <div className="build-evidence-links">
                  {part.sourceUrl && (
                    <a href={part.sourceUrl} target="_blank" rel="noreferrer">
                      Product source <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  {part.priceSourceUrl && (
                    <a href={part.priceSourceUrl} target="_blank" rel="noreferrer">
                      Price source <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  {part.connectorSourceUrl && (
                    <a href={part.connectorSourceUrl} target="_blank" rel="noreferrer">
                      Connector source <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  {!part.sourceUrl && !part.priceSourceUrl && !part.connectorSourceUrl && (
                    <span>No source URL in catalog</span>
                  )}
                </div>
                {part.estimatedFields.length > 0 && (
                  <p>
                    Estimated: {humanizeProvenanceFields(part.estimatedFields).join(", ")}
                  </p>
                )}
                {part.measuredFields.length > 0 && (
                  <p>
                    Measured locally: {humanizeProvenanceFields(part.measuredFields).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Info Message */}
      {!canAnalyze && (
        <div className="requirement-note">
          <CircleAlert size={17} aria-hidden="true" />
          Select Frame, Motors, Propellers, and Battery to run an analysis.
        </div>
      )}
          <div className="build-setup-cta" id="hardware-setup">
            <div>
              <strong>
                Flight controller and radio
                <span className={`build-setup-status is-${hardwareReadiness.status}`}>
                  {hardwareReadiness.label}
                </span>
              </strong>
              <span>
                {selectedFlightControllerPart
                  ? `${selectedFlightControllerPart.name}${selectedReceiverPart ? ` / ${selectedReceiverPart.name}` : " / No receiver"}`
                  : "Plan receiver wiring, channel roles, firmware profile, and the link."}
              </span>
              {selectedFlightControllerPart && (
                <>
                  <small>
                    {hardwareReadiness.firmwareLabel} · {hardwareReadiness.protocolLabel} ·{" "}
                    {hardwareReadiness.receiverUart} / {hardwareReadiness.receiverBaud} baud ·{" "}
                    {hardwareReadiness.wiringStatus === "documented"
                      ? "Pins documented"
                      : "Verify pins"}
                  </small>
                  <small>
                    Board map: {hardwareReadiness.fcBoardName || "Not mapped"} ·{" "}
                    {hardwareReadiness.fcBoardDocumented
                      ? "documented"
                      : "custom mapping"}
                  </small>
                  <small>
                    Radio host: {hardwareReadiness.radioHostTransportLabel} ·{" "}
                    {hardwareReadiness.radioHostDocumented
                      ? "Transport documented"
                      : "Verify transport"}
                  </small>
                  {hardwareReadiness.radioHostTransport === "module-bay" && (
                    <small>
                      Handset bay: {hardwareReadiness.radioHostBayLabel} ·{" "}
                      {hardwareReadiness.radioHostBayCompatible
                        ? "supported"
                        : "mismatch"}
                    </small>
                  )}
                  {hardwareReadiness.fcMotorOrder && (
                    <small>
                      Motor order: {hardwareReadiness.fcMotorDirectionLabel} ·{" "}
                      {hardwareReadiness.fcMotorOrder}
                    </small>
                  )}
                  {hardwareReadiness.fcServoOutputs?.length > 0 && (
                    <small>
                      Servo outputs: {hardwareReadiness.fcServoOutputs
                        .map((servo) => (
                          `${servo.output} ${servo.reversed ? "reversed" : "normal"}`
                          + ` · trim ${servo.trimUs} µs · travel ${servo.travelUs} µs`
                        ))
                        .join(" / ")}
                    </small>
                  )}
                  {navigationSafetyLabel && (
                    <small>
                      Navigation safety: {navigationSafetyLabel}
                    </small>
                  )}
                  {missionControlsLabel && (
                    <small>
                      Mission controls: {missionControlsLabel}
                    </small>
                  )}
                  {hardwareReadiness.radioRegulatoryRegionLabel && (
                    <small>
                      RF limit: {hardwareReadiness.radioRegulatoryRegionLabel}
                      {hardwareReadiness.radioRegulatoryMaxDbm != null
                        ? ` · ${hardwareReadiness.radioPowerDbm ?? "unset"} / ${hardwareReadiness.radioRegulatoryMaxDbm} dBm`
                        : " · verify regional variant"}
                      {hardwareReadiness.radioPowerCapStatus === "over"
                        ? " · over cap"
                        : ""}
                    </small>
                  )}
                  {hardwareReadiness.radioReceiverBands.length > 0 && (
                    <small>
                      Receiver RF: {hardwareReadiness.radioReceiverBands.join(" / ")} ·{" "}
                      {hardwareReadiness.radioReceiverBandStatus === "compatible"
                        ? `shared with TX: ${hardwareReadiness.radioSharedBands.join(" / ")}`
                        : hardwareReadiness.radioReceiverBandStatus === "conflict"
                          ? "no shared documented band"
                          : "target band unverified"}
                    </small>
                  )}
                </>
              )}
            </div>
            <button type="button" onClick={openHardwareSetup}>
              <Settings2 size={16} aria-hidden="true" />
              {hardwareReadiness.configured ? "Review setup" : "Open setup"}
            </button>
          </div>
        </section>
      </div>

      <div className="bottom-buttons">
        <button
          className="action-btn reset-action"
          aria-label="Reset all components"
          onClick={() => {
            // Clear all selections and trigger viewer reset
            setSelectedFrame("");
            setSelectedMotor("");
            setSelectedPropeller("");
            setSelectedESC("");
            setSelectedFC("");
            setSelectedBattery("");
            setSelectedReceiver("");
            setCameraView("orbit");
            setExplodedAssembly(false);
            setShowFitOverlay(false);
            setBuildNote("");
            setGeometryOverrides(normalizeGeometryOverrides(null));
            setSelectedPresetId("");
            // Clear all model URL states immediately so viewer sees empty set
            setModelUrls([]);
            setMotorModelUrl(null);
            setBatteryModelUrl(null);
            setPropellerModelUrl(null);
            setPropellerCWModelUrl(null);
            setPropellerCCWModelUrl(null);
            setEscModelUrl(null);
            setFcModelUrl(null);
            setReceiverModelUrl(null);
            setClearedComponents([]);
            setResetKey(k => k + 1);
            setMessage({ type: "info", text: "Build reset." });
            setTimeout(() => setMessage({ type: "", text: "" }), 1500);
          }}
        >
          <RotateCcw size={18} aria-hidden="true" />
          <span className="action-label-full">Reset all</span>
        </button>
        <button
          className="action-btn save"
          onClick={handleSave}
          disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
          title={canSave ? "Save & go Home" : "Select Frame, Motor, Propeller, Battery first"}
          aria-label="Save and go home"
        >
          <Save size={18} aria-hidden="true" />
          <span className="action-label-full">Save &amp; home</span>
          <span className="action-label-compact" aria-hidden="true">Save</span>
        </button>

        <button
          className="action-btn analysis"
          disabled={!canAnalyze}
          onClick={handleAnalyze}
          style={{ opacity: canAnalyze ? 1 : 0.5 }}
        >
          <ChartNoAxesCombined size={18} aria-hidden="true" />
          Analyze
        </button>
      </div>

    </div>
  );
}
