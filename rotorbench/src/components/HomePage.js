import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBuild } from "../context/BuildContext";
import "../styles/home.css";
import componentsData from "../data/components.json";
import { summarizeHardwareReadiness } from "../utils/hardwareReadiness";
import { summarizeBuild } from "../utils/buildComparison";
import { summarizeAssemblyInterfaces } from "../utils/physicalCompatibility";
import { getFrameMountPointsMm } from "../assembly/assemblyTransforms";
import { getFrameServoHardware } from "../utils/frameHardware";
import {
  hasCatalogModel,
  resolveModelForComponent,
  resolvePropellerModelPair,
} from "../utils/modelAssets";
import {
  BatteryCharging,
  Box,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Cog,
  Cpu,
  Edit3,
  Eye,
  EyeOff,
  Fan,
  Radio,
  Scale,
  Search,
  Settings2,
  X,
  Zap,
} from "lucide-react";
import { PLATFORM_PRESETS } from "../data/platformPresets";
const sampleAssembly = process.env.PUBLIC_URL + "/assets/sample_assembly.glb";
const BabylonViewer = lazy(() => import("./BabylonViewer"));
const TwoDViewer = lazy(() => import("./TwoDViewer"));
const PLATFORM_FIT_LABELS = {
  verified: "Fit verified",
  measured: "Fit measured",
  unverified: "Fit review",
  conflict: "Fit conflict",
  pending: "Fit unchecked",
};
const PLATFORM_SORT_MODES = new Set(["size", "name", "weight", "price"]);
const PLATFORM_COMPONENT_CATEGORIES = {
  frameId: "frames",
  motorId: "motors",
  propellerId: "propellers",
  escId: "escs",
  flightControllerId: "flight_controllers",
  batteryId: "batteries",
  receiverId: "receivers",
};

function starterPlatformSearchText(preset) {
  const componentNames = Object.entries(PLATFORM_COMPONENT_CATEGORIES).flatMap(
    ([key, category]) => {
      const id = preset.componentIds?.[key];
      return componentsData[category]?.find((part) => part.id === id)?.name || [];
    },
  );
  return [
    preset.name,
    preset.description,
    ...componentNames,
  ].filter(Boolean).join(" ").toLowerCase();
}

function platformGeometryCoverage(preset) {
  const parts = Object.entries(preset.componentIds || {})
    .map(([key, id]) => {
      const category = PLATFORM_COMPONENT_CATEGORIES[key];
      const part = componentsData[category]?.find((item) => item.id === id);
      return part ? { category, part } : null;
    })
    .filter(Boolean);
  const catalogModelCount = parts.filter(({ category, part }) => (
    hasCatalogModel(part, category)
  )).length;
  return {
    total: parts.length,
    catalogModelCount,
    fallbackCount: parts.length - catalogModelCount,
  };
}

function platformAssemblyCoverage(preset) {
  const part = (key, category) => componentsData[category]?.find(
    (item) => item.id === preset.componentIds?.[key],
  ) || null;
  return summarizeAssemblyInterfaces({
    frame: part("frameId", "frames"),
    motor: part("motorId", "motors"),
    propeller: part("propellerId", "propellers"),
    esc: part("escId", "escs"),
    flightController: part("flightControllerId", "flight_controllers"),
    battery: part("batteryId", "batteries"),
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentBuild, analysisResults } = useBuild();

  // Model URLs state
  const [modelUrls, setModelUrls] = useState([]);
  const [motorModelUrl, setMotorModelUrl] = useState(null);
  const [propellerModelUrl, setPropellerModelUrl] = useState(null);
  const [propellerCWModelUrl, setPropellerCWModelUrl] = useState(null);
  const [propellerCCWModelUrl, setPropellerCCWModelUrl] = useState(null);
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
  const [previewInView, setPreviewInView] = useState(false);
  const [starterExpanded, setStarterExpanded] = useState(false);
  const viewerContainerRef = useRef(null);
  const requestedPlatformSize = searchParams.get("size") || "all";
  const platformSize = requestedPlatformSize === "all"
    || /^[\d.]+$/.test(requestedPlatformSize)
    ? requestedPlatformSize
    : "all";
  const verifiedPlatformsOnly = searchParams.get("fit") === "verified";
  const starterQuery = searchParams.get("q") || "";
  const requestedPlatformSort = searchParams.get("sort") || "size";
  const platformSort = PLATFORM_SORT_MODES.has(requestedPlatformSort)
    ? requestedPlatformSort
    : "size";
  const updateStarterFilters = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value == null || value === "" || value === "all" || value === false) {
        next.delete(key);
      } else {
        next.set(key, value === true ? "verified" : value);
      }
    });
    setStarterExpanded(false);
    setSearchParams(next, { replace: true });
  };
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

  useEffect(() => {
    setStarterExpanded(false);
  }, [
    platformSize,
    platformSort,
    starterQuery,
    verifiedPlatformsOnly,
  ]);

  useEffect(() => {
    if (previewInView) return undefined;
    const node = viewerContainerRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver !== "function") {
      setPreviewInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPreviewInView(true);
        observer.disconnect();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [previewInView]);
  const platformSummaries = useMemo(
    () => Object.fromEntries(PLATFORM_PRESETS.map((preset) => [
      preset.id,
      summarizeBuild({ componentIds: preset.componentIds }),
    ])),
    [],
  );
  const platformAssemblySummaries = useMemo(
    () => Object.fromEntries(PLATFORM_PRESETS.map((preset) => [
      preset.id,
      platformAssemblyCoverage(preset),
    ])),
    [],
  );
  const platformSizes = useMemo(() => (
    Array.from(new Set(PLATFORM_PRESETS.map(
      (preset) => preset.name.match(/^[\d.]+/)?.[0] || "—",
    ))).sort((left, right) => (
      (Number.parseFloat(left) || Number.POSITIVE_INFINITY)
      - (Number.parseFloat(right) || Number.POSITIVE_INFINITY)
    ))
  ), []);
  const visiblePlatforms = useMemo(() => {
    const queryTokens = starterQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return PLATFORM_PRESETS
      .filter((preset) => (
        platformSize === "all"
        || preset.name.match(/^[\d.]+/)?.[0] === platformSize
      ))
      .filter((preset) => (
        !verifiedPlatformsOnly
        || ["verified", "measured"].includes(
          platformSummaries[preset.id]?.physicalFitStatus,
        )
      ))
      .filter((preset) => (
        queryTokens.length === 0
        || queryTokens.every((token) => starterPlatformSearchText(preset).includes(token))
      ))
      .sort((left, right) => {
        const sizeComparison =
          (Number.parseFloat(left.name.match(/^[\d.]+/)?.[0]) || 0)
          - (Number.parseFloat(right.name.match(/^[\d.]+/)?.[0]) || 0)
          || left.name.localeCompare(right.name);
        if (platformSort === "name") return left.name.localeCompare(right.name);
        if (platformSort === "weight" || platformSort === "price") {
          const field = platformSort === "weight" ? "totalWeight" : "totalPrice";
          const rawLeft = platformSummaries[left.id]?.[field];
          const rawRight = platformSummaries[right.id]?.[field];
          const normalizedLeft = rawLeft != null && Number.isFinite(Number(rawLeft))
            ? Number(rawLeft)
            : Number.POSITIVE_INFINITY;
          const normalizedRight = rawRight != null && Number.isFinite(Number(rawRight))
            ? Number(rawRight)
            : Number.POSITIVE_INFINITY;
          return normalizedLeft - normalizedRight || sizeComparison;
        }
        return sizeComparison;
      });
  }, [platformSize, platformSort, starterQuery, platformSummaries, verifiedPlatformsOnly]);
  const verifiedPlatformCount = useMemo(() => (
    PLATFORM_PRESETS.filter((preset) => (
      ["verified", "measured"].includes(
        platformSummaries[preset.id]?.physicalFitStatus,
      )
    )).length
  ), [platformSummaries]);
  const hasAnySelection = Boolean(
    currentBuild &&
    currentBuild.componentIds &&
    Object.values(currentBuild.componentIds).some(Boolean)
  );
  const selectedComponentCount = currentBuild?.componentIds
    ? Object.values(currentBuild.componentIds).filter(Boolean).length
    : 0;

  useEffect(() => {
    if (!hasBuild) {
      setModelUrls([]);
      setMotorModelUrl(null);
      setPropellerModelUrl(null);
      setPropellerCWModelUrl(null);
      setPropellerCCWModelUrl(null);
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
    const load = () => {
      const [
        frameUrl,
        motorUrl,
        propellerModels,
        batteryUrl,
        escUrl,
        fcUrl,
        receiverUrl,
      ] = [
        resolveModelForComponent("frames", currentBuild.componentIds?.frameId).modelUrl,
        resolveModelForComponent("motors", currentBuild.componentIds?.motorId).modelUrl,
        resolvePropellerModelPair(currentBuild.componentIds?.propellerId),
        resolveModelForComponent("batteries", currentBuild.componentIds?.batteryId).modelUrl,
        resolveModelForComponent("escs", currentBuild.componentIds?.escId).modelUrl,
        resolveModelForComponent(
          "flight_controllers",
          currentBuild.componentIds?.flightControllerId,
        ).modelUrl,
        resolveModelForComponent("receivers", currentBuild.componentIds?.receiverId).modelUrl,
      ];
      const urls = frameUrl ? [frameUrl] : [];
      const propellerUrl = propellerModels.ccw || propellerModels.cw;

      if (!cancelled) {
        setModelUrls(urls);
        setMotorModelUrl(motorUrl);
        setPropellerModelUrl(propellerUrl);
        setPropellerCWModelUrl(propellerModels.cw);
        setPropellerCCWModelUrl(propellerModels.ccw);
        setBatteryModelUrl(batteryUrl);
        setEscModelUrl(escUrl);
        setFcModelUrl(fcUrl);
        setReceiverModelUrl(receiverUrl);

        // Extract frame corner positions
        if (frame) {
          setFrameCornerPositions(getFrameMountPointsMm(frame));
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
    return () => {
      cancelled = true;
    };
  }, [currentBuild, hasBuild, frame, motor, propeller, battery, esc, fc, receiver]);

  const assemblySpec = useMemo(() => ({
    frame: frame || null,
    motor: motor || null,
    propeller: propeller || null,
    battery: battery || null,
    esc: esc || null,
    flightController: fc || null,
    receiver: receiver || null,
  }), [frame, motor, propeller, battery, esc, fc, receiver]);

  const hardwarePlanState = useMemo(
    () => summarizeHardwareReadiness({
      buildId: currentBuild?.id,
      flightController: fc,
      receiver,
      buildMotorCount: frame?.motorCount ?? null,
      buildServoCount: getFrameServoHardware(frame)?.quantity ?? null,
    }),
    [currentBuild?.id, fc, frame, receiver],
  );
  const assemblyPropellerDirection =
    hasBuild && hardwarePlanState.fcPropellerDirection
      ? hardwarePlanState.fcPropellerDirection
      : "props-out";

  return (
    <div className="app-container">

      <section className="home-intro">
        <div>
          <h1><span>Build</span><span>overview</span></h1>
          <p>Inspect the airframe and the numbers behind your next FPV build.</p>
        </div>
        <div className={`build-status ${hasAnalysis ? "is-ready" : hasBuild ? "is-progress" : "is-empty"}`}>
          <strong>{String(selectedComponentCount).padStart(2, "0")}<span>/07</span></strong>
          <small>{hasAnalysis ? "Analysis ready" : hasBuild ? "Parts selected" : "Sample airframe"}</small>
        </div>
      </section>

      {!hasAnySelection && (
        <section className="starter-platforms" aria-labelledby="starter-platforms-title">
          <div className="starter-platforms-header">
            <div>
              <h2 id="starter-platforms-title">Start with a complete platform</h2>
              <p>Load seven source-backed parts, already aligned in the assembly preview.</p>
            </div>
            <span>
              {starterQuery.trim()
                ? `${visiblePlatforms.length} of ${PLATFORM_PRESETS.length} source builds`
                : platformSize === "all"
                ? verifiedPlatformsOnly
                  ? `${visiblePlatforms.length} fit-verified source builds`
                  : `${PLATFORM_PRESETS.length} source builds`
                : `${visiblePlatforms.length} of ${PLATFORM_PRESETS.length} source builds`}
            </span>
          </div>
          <div className="starter-platform-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search starter builds"
              value={starterQuery}
              onChange={(event) => updateStarterFilters({
                q: event.target.value,
              })}
              placeholder="Search platform, controller, receiver, or frame"
            />
            {starterQuery && (
              <button
                type="button"
                aria-label="Clear starter search"
                onClick={() => updateStarterFilters({ q: null })}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <div
            className="starter-platform-filters"
            role="group"
            aria-label="Filter starter platforms by frame size"
          >
            <span className="starter-platform-filter-label">
              Frame size
              <span
                className="starter-platform-filter-hint"
                aria-hidden="true"
              >
                · swipe
              </span>
            </span>
            {["all", ...platformSizes].map((size) => {
              const count = size === "all"
                ? PLATFORM_PRESETS.length
                : PLATFORM_PRESETS.filter(
                  (preset) => preset.name.match(/^[\d.]+/)?.[0] === size,
                ).length;
              const representative = size === "all"
                ? null
                : PLATFORM_PRESETS.find(
                  (preset) => preset.name.match(/^[\d.]+/)?.[0] === size,
                );
              return (
                <button
                  key={size}
                  type="button"
                  className={`starter-platform-filter ${
                    platformSize === size ? "is-active" : ""
                  }`}
                  aria-pressed={platformSize === size}
                  onClick={() => updateStarterFilters({ size })}
                >
                  {size === "all"
                    ? "All builds"
                    : representative?.airframeShape === "wing"
                      ? `${size} mm wing`
                      : `${size}-inch builds`}
                  <small>{count}</small>
                </button>
              );
            })}
          </div>
          <div
            className="starter-platform-filters starter-platform-evidence-filter"
            role="group"
            aria-label="Filter starter platforms by fit evidence"
          >
            <span className="starter-platform-filter-label">Evidence</span>
            <button
              type="button"
              className={`starter-platform-filter ${
                verifiedPlatformsOnly ? "is-active" : ""
              }`}
              aria-pressed={verifiedPlatformsOnly}
              onClick={() => updateStarterFilters({
                fit: verifiedPlatformsOnly ? null : true,
              })}
            >
              Verified only
              <small>{verifiedPlatformCount}</small>
            </button>
          </div>
          <div className="starter-platform-sort">
            <label htmlFor="starter-platform-sort">Sort</label>
            <select
              id="starter-platform-sort"
              aria-label="Sort starter builds"
              value={platformSort}
              onChange={(event) => updateStarterFilters({
                sort: event.target.value === "size" ? null : event.target.value,
              })}
            >
              <option value="size">Size · ascending</option>
              <option value="name">Name · A–Z</option>
              <option value="weight">Planning weight · low first</option>
              <option value="price">Catalog price · low first</option>
            </select>
          </div>
          <div
            id="starter-platform-list"
            className={`starter-platform-list ${
              starterExpanded ? "is-mobile-expanded" : ""
            }`}
          >
            {visiblePlatforms.length === 0 && (
              <div className="starter-platform-empty" role="status">
                <strong>No starter builds match</strong>
                <span>Try a platform, controller, receiver, or frame name.</span>
                <button
                  type="button"
                  onClick={() => setSearchParams({}, { replace: true })}
                >
                  Reset starter filters
                </button>
              </div>
            )}
            {visiblePlatforms.map((preset) => {
              const size = preset.name.match(/^[\d.]+/)?.[0] || "—";
              const isWing = preset.airframeShape === "wing";
              const platformSummary = platformSummaries[preset.id] || {};
              const propeller = componentsData.propellers.find(
                (part) => part.id === preset.componentIds.propellerId,
              );
              const hasThrustData = (propeller?.thrustData?.length || 0) > 0;
              const estimatedThrust = propeller?.estimatedFields?.includes("thrustData");
              const fitStatus = platformSummaries[preset.id]?.physicalFitStatus || "pending";
              const geometry = platformGeometryCoverage(preset);
              const joints = platformAssemblySummaries[preset.id];
              const thrustLabel = hasThrustData
                ? estimatedThrust
                  ? "Estimated thrust data"
                  : "Thrust data available"
                : "Thrust data unavailable";
              const geometryLabel = geometry.fallbackCount === 0
                ? `${geometry.total} catalog models`
                : geometry.catalogModelCount === 0
                  ? `${geometry.total} fallback meshes`
                  : `${geometry.catalogModelCount}/${geometry.total} catalog models`;
              const jointState = joints.conflictCount
                ? "conflict"
                : joints.unknownCount ? "review" : "verified";
              const jointLabel = joints.conflictCount
                ? `${joints.conflictCount} joint conflict${joints.conflictCount === 1 ? "" : "s"}`
                : joints.unknownCount
                  ? `${joints.matchedCount} matched · ${joints.unknownCount} verify`
                  : `${joints.matchedCount} joints matched`;
              const rawWeight = platformSummary.totalWeight;
              const rawPrice = platformSummary.totalPrice;
              const weightLabel = rawWeight != null && Number.isFinite(Number(rawWeight))
                ? `${Math.round(Number(rawWeight))} g`
                : "weight unavailable";
              const priceLabel = rawPrice != null && Number.isFinite(Number(rawPrice))
                ? `$${Number(rawPrice).toFixed(2)}`
                : "price unavailable";
              const statusId = `starter-platform-status-${preset.id}`;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="starter-platform-option"
                  aria-label={`Open ${preset.name}`}
                  aria-describedby={statusId}
                  onClick={() => navigate(`/build?preset=${encodeURIComponent(preset.id)}`)}
                >
                  <span className="starter-platform-size" aria-hidden="true">
                    <strong>{size}</strong>
                    <small>{isWing ? "MM" : "IN"}</small>
                  </span>
                  <span className="starter-platform-copy">
                    <strong>{preset.name}</strong>
                    <small>{preset.description}</small>
                    <span className="starter-platform-health">
                      <span
                        className={`starter-platform-evidence ${
                          hasThrustData ? "is-estimated" : "is-unavailable"
                        }`}
                      >
                        {thrustLabel}
                      </span>
                      <span className={`starter-platform-fit is-${fitStatus}`}>
                        {PLATFORM_FIT_LABELS[fitStatus]}
                      </span>
                      <span
                        className={`starter-platform-joints is-${jointState}`}
                        title="Catalogued interfaces only; not a physical inspection."
                      >
                        {jointLabel}
                      </span>
                      <span className={`starter-platform-geometry is-${geometry.fallbackCount === 0 ? "catalog" : "fallback"}`}>
                        {geometryLabel}
                      </span>
                      <span className="starter-platform-metric">{weightLabel}</span>
                      <span className="starter-platform-metric">{priceLabel}</span>
                    </span>
                    <span id={statusId} className="visually-hidden">
                      {thrustLabel}. {PLATFORM_FIT_LABELS[fitStatus]}. {jointLabel}.{" "}
                      {geometryLabel}. Planning weight {weightLabel}. Catalog total{" "}
                      {priceLabel}.
                    </span>
                  </span>
                  <span className="starter-platform-action" aria-hidden="true">
                    <span>7 parts</span>
                    <ChevronRight size={16} />
                  </span>
                </button>
              );
            })}
          </div>
          {visiblePlatforms.length > 5 && (
            <button
              type="button"
              className="starter-platform-expand"
              aria-expanded={starterExpanded}
              aria-controls="starter-platform-list"
              onClick={() => setStarterExpanded((current) => !current)}
            >
              <ChevronDown size={16} aria-hidden="true" />
              {starterExpanded
                ? "Show fewer builds"
                : `Show all ${visiblePlatforms.length} builds`}
            </button>
          )}
        </section>
      )}

      <div className="home-workspace">
        <section className="home-preview-panel" aria-label="Build preview">
          <div className="preview-panel-header">
            <div>
              <h2>Airframe preview</h2>
              <p>{hasBuild ? "Your selected components" : "Sample assembly"}</p>
            </div>
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
                    {view}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasBuild && (
            <div className="preview-controls">
              <div className="preview-controls-heading">
                <span>Visible components</span>
                {activeView === "2D" ? (
                  <span className="preview-controls-scroll-hint" aria-hidden="true">
                    Swipe layers →
                  </span>
                ) : (
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
                )}
              </div>
              <div
                className="visibility-chip-row"
                role="group"
                aria-label="Assembly component visibility"
              >
                {[
                  { id: "frame", label: "Frame", Icon: Box },
                  { id: "motor", label: "Motors", Icon: Cog },
                  { id: "propeller", label: "Props", Icon: Fan },
                  { id: "battery", label: "Battery", Icon: BatteryCharging },
                  { id: "flight_controller", label: "FC", Icon: Cpu },
                  { id: "esc", label: "ESC", Icon: Zap },
                  { id: "receiver", label: "RX", Icon: Radio },
                ].map(({ id, label, Icon }) => {
                  const isHidden = clearedComponents.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`visibility-chip ${isHidden ? "is-hidden" : ""}`}
                      aria-pressed={!isHidden}
                      onClick={() => {
                        setClearedComponents((prev) =>
                          isHidden ? prev.filter((c) => c !== id) : [...prev, id],
                        );
                      }}
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

          <div
            className={`viewer-container ${
              previewInView ? "is-preview-ready" : "is-preview-pending"
            }`}
            data-testid="home-preview-viewport"
            data-preview-state={previewInView ? "ready" : "pending"}
            ref={viewerContainerRef}
          >
            {activeView === "3D" && previewInView && (
              <Suspense
                fallback={(
                  <div className="viewer-loading-state" role="status">
                    Loading 3D assembly view
                  </div>
                )}
              >
                <BabylonViewer
                modelUrl={!hasAnySelection ? sampleAssembly : null}
                modelUrls={modelUrls}
                motorUrl={motorModelUrl}
                motorMountingPoint={motorMountingPoint}
                frameCornerPositions={frameCornerPositions}
                propellerUrl={propellerModelUrl}
                propellerCWUrl={propellerCWModelUrl}
                propellerCCWUrl={propellerCCWModelUrl}
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
                assemblySpec={assemblySpec}
                propellerDirection={assemblyPropellerDirection}
                />
              </Suspense>
            )}
            {activeView === "2D" && previewInView && (
              <Suspense
                fallback={(
                  <div className="viewer-loading-state" role="status">
                    Loading 2D assembly view
                  </div>
                )}
              >
                <TwoDViewer
                  assemblySpec={hasAnySelection ? assemblySpec : null}
                  propellerDirection={assemblyPropellerDirection}
                  clearedComponents={clearedComponents}
                />
              </Suspense>
            )}
            {!previewInView && (
              <div className="viewer-loading-state viewer-preview-pending" role="status">
                The interactive preview loads when it reaches the viewport.
              </div>
            )}
          </div>

          <div className="preview-caption">
            <span>{hasBuild ? "Selected component set" : "Explore the sample, then add your own parts."}</span>
            <button type="button" onClick={() => navigate("/build?new=1")}>
              {hasBuild ? "Edit components" : "Start a build"}
            </button>
          </div>
        </section>

        <aside className="home-telemetry" aria-label="Build summary">
          <div className="telemetry-heading">
            <div>
              <h2>Build summary</h2>
              <p>{hasBuild ? "Live selections" : "Waiting for components"}</p>
            </div>
            <Scale size={24} strokeWidth={1.7} aria-hidden="true" />
          </div>

          <div className="telemetry-kpis">
            <div className="telemetry-kpi">
              <span>Thrust / weight</span>
              <strong>{hasAnalysis ? analysisResults.performance.thrustToWeightRatio : "—"}</strong>
              <small>Ratio</small>
            </div>
            <div className="telemetry-kpi">
              <span>Flight time</span>
              <strong>{hasAnalysis ? analysisResults.flightSimulation.estimatedFlightTime : "—"}</strong>
              <small>Minutes</small>
            </div>
            <div className="telemetry-kpi telemetry-kpi-wide">
              <span>Planning weight</span>
              <strong>{hasAnalysis ? analysisResults.performance.totalWeight : "—"}<small>g</small></strong>
              <small>Catalog parts + 50 g allowance</small>
            </div>
          </div>

          <div className="telemetry-list">
            <div className="telemetry-row">
              <span className="spec-icon motor-icon"><Cog size={17} aria-hidden="true" /></span>
              <div><small>Motors</small><strong>{motor?.name || "Not selected"}</strong></div>
            </div>
            <div className="telemetry-row">
              <span className="spec-icon propeller-icon"><Fan size={17} aria-hidden="true" /></span>
              <div><small>Propellers</small><strong>{propeller?.name || "Not selected"}</strong></div>
            </div>
            <div className="telemetry-row">
              <span className="spec-icon battery-icon"><BatteryCharging size={17} aria-hidden="true" /></span>
              <div><small>Battery</small><strong>{battery?.name || "Not selected"}</strong></div>
            </div>
            <div className="telemetry-row">
              <span className="spec-icon fc-icon"><Cpu size={17} aria-hidden="true" /></span>
              <div><small>Flight controller</small><strong>{fc?.name || "Not selected"}</strong></div>
            </div>
          </div>

          <div className="telemetry-battery">
            <div>
              <small>Battery</small>
              <strong>{battery ? `${battery.voltage}V / ${battery.capacity}mAh` : "Select a battery"}</strong>
            </div>
            <div>
              <small>Estimated flight</small>
              <strong>{hasAnalysis ? `${analysisResults.flightSimulation.estimatedFlightTime} min` : "--"}</strong>
            </div>
          </div>

          <div className="telemetry-hardware">
            <div className="telemetry-hardware-copy">
              <small>Hardware setup</small>
              <strong>
                {fc
                  ? `${fc.name}${receiver ? ` / ${receiver.name}` : " / No receiver"}`
                  : "Flight controller and radio not configured"}
              </strong>
              <span className={`hardware-plan-status is-${hardwarePlanState.status}`}>
                {hardwarePlanState.label}
              </span>
            </div>
            <button type="button" onClick={() => navigate("/setup")}>
              <Settings2 size={15} aria-hidden="true" />
              Setup
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom Buttons */}
      <div className="bottom-buttons">
        <button className="action-btn save" onClick={() => navigate("/build?new=1")}>
          {hasBuild ? <Edit3 size={18} aria-hidden="true" /> : <Box size={18} aria-hidden="true" />}
          {hasBuild ? "Edit build" : "New build"}
        </button>
        <button
          className="action-btn analysis"
          disabled={!hasBuild}
          onClick={() => navigate("/analysis", { state: { build: currentBuild } })}
          style={{ opacity: hasBuild ? 1 : 0.5, cursor: hasBuild ? "pointer" : "not-allowed" }}
        >
          <ChartNoAxesCombined size={18} aria-hidden="true" />
          View analysis
        </button>
      </div>

    </div>
  );
}
