import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CircleStop,
  Clipboard,
  Cpu,
  Download,
  Play,
  RadioTower,
  ShieldAlert,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { useBuild } from "../context/BuildContext";
import componentsData from "../data/components.json";
import {
  createDefaultFlightControllerConfig,
  getAerialKitControlRoles,
  getBoardProfile,
  validateFlightControllerConfig,
} from "../data/flightControllerProfiles";
import {
  DEFAULT_RADIO_CONFIG,
  applyFlightControllerChannelMap,
  buildChannelMappingWarnings,
  buildRadioWarnings,
  getRadioChannelRoles,
  getRadioTarget,
  normalizeRadioConfig,
  sanitizeRadioChannelMap,
} from "../data/radioProfiles";
import FlightControllerSetup from "./FlightControllerSetup";
import RadioLinkSetup from "./RadioLinkSetup";
import BenchRunbook from "./BenchRunbook";
import WebSerialCapture from "./WebSerialCapture";
import {
  createCombinedHardwarePlan,
  parseCombinedHardwarePlanJson,
  summarizeHardwarePlanImportChanges,
} from "../utils/hardwarePlanTransfer";
import { createHardwarePlanBriefing } from "../utils/hardwarePlanBriefing";
import { buildBenchRunbook } from "../utils/benchRunbook";
import { getBindingIdentity } from "../utils/elrsBinding";
import { createBenchEvidenceScope } from "../utils/benchEvidenceAttachment";
import "../styles/setup-page.css";

function findPart(category, id) {
  if (!id) return null;
  return componentsData[category]?.find((part) => part.id === id) || null;
}

function readStoredPlan(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (!stored || typeof stored !== "object") return fallback;
    if (stored.planVersion !== fallback.planVersion) return fallback;
    for (const identityKey of ["selectedFlightControllerId", "selectedReceiverId"]) {
      if (
        Object.hasOwn(fallback, identityKey) &&
        stored[identityKey] !== fallback[identityKey]
      ) {
        return fallback;
      }
    }
    return { ...fallback, ...stored };
  } catch {
    return fallback;
  }
}

function createRadioDraft(config, channelLimit, controlRoles) {
  return {
    ...config,
    bindingPhrase: "",
    uid: "",
    channelMap: sanitizeRadioChannelMap(config.channelMap, {
      channelLimit,
      controlRoles,
    }),
  };
}

export default function SetupPage() {
  const { currentBuild } = useBuild();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const build = location.state?.build || currentBuild;
  const selectedFlightController = findPart(
    "flight_controllers",
    build?.componentIds?.flightControllerId,
  );
  const selectedReceiver = findPart("receivers", build?.componentIds?.receiverId);
  const selectedFrame = findPart("frames", build?.componentIds?.frameId);
  const [fcPlan, setFcPlan] = useState(() =>
    createDefaultFlightControllerConfig(selectedFlightController, selectedReceiver),
  );
  const [radioPlan, setRadioPlan] = useState(DEFAULT_RADIO_CONFIG);
  const [message, setMessage] = useState("");
  const [pendingPlanImport, setPendingPlanImport] = useState(null);
  const [captureStatuses, setCaptureStatuses] = useState({});
  const [captureMessage, setCaptureMessage] = useState("");
  const [captureCommandPending, setCaptureCommandPending] = useState(false);
  const [setupBenchToolsOpen, setSetupBenchToolsOpen] = useState(false);
  const [benchRunbookOpen, setBenchRunbookOpen] = useState(false);
  const [focusBenchEvidence, setFocusBenchEvidence] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState({
    fc: false,
    radio: false,
  });
  const importInputRef = useRef(null);
  const captureRefs = useRef({});
  const captureCommandPendingRef = useRef(false);
  const fcBaselineRef = useRef(null);
  const radioBaselineRef = useRef(null);
  const activeTab = searchParams.get("tab") === "radio" ? "radio" : "flight-controller";
  const setupStorageBase = build?.id
    ? `rotorbench:hardware-plan:${build.id}`
    : "rotorbench:hardware-plan:standalone";
  const fcStorageKey = `${setupStorageBase}:fc`;
  const radioStorageKey = `${setupStorageBase}:radio`;
  const fcDraftKey = `${setupStorageBase}:fc:draft`;
  const radioDraftKey = `${setupStorageBase}:radio:draft`;

  const openEvidenceReview = () => {
    setSetupBenchToolsOpen(true);
    setBenchRunbookOpen(true);
    setFocusBenchEvidence(true);
  };

  useEffect(() => {
    if (!benchRunbookOpen || !focusBenchEvidence) return undefined;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById("bench-evidence-review");
      if (!target) return;
      const reducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      )?.matches;
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      target.focus({ preventScroll: true });
      setFocusBenchEvidence(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [benchRunbookOpen, focusBenchEvidence]);

  useEffect(() => {
    setPlansLoaded(false);
    const fallback = createDefaultFlightControllerConfig(
      selectedFlightController,
      selectedReceiver,
    );
    const savedFcPlan = readStoredPlan(fcStorageKey, fallback);
    const hasFcDraft = Boolean(localStorage.getItem(fcDraftKey));
    const nextFcPlan = readStoredPlan(
      hasFcDraft ? fcDraftKey : fcStorageKey,
      fallback,
    );
    setFcPlan(nextFcPlan);
    fcBaselineRef.current = JSON.stringify(savedFcPlan);
    const radioFallback = {
      ...DEFAULT_RADIO_CONFIG,
      selectedReceiverId: selectedReceiver?.id || null,
      channelMap: {
        ...DEFAULT_RADIO_CONFIG.channelMap,
        flightMode: fallback.modeChannel ?? null,
        arm: fallback.armChannel ?? null,
        beeper: fallback.beeperChannel ?? null,
        velocity: fallback.velocityChannel ?? null,
        mission: fallback.missionChannel ?? null,
        launch: fallback.launchChannel ?? null,
      },
    };
    const savedRadioPlan = readStoredPlan(radioStorageKey, radioFallback);
    const hasRadioDraft = Boolean(localStorage.getItem(radioDraftKey));
    const nextRadioPlan = hasRadioDraft
      ? {
          ...readStoredPlan(radioDraftKey, radioFallback),
          bindingPhrase: "",
          uid: "",
        }
      : readStoredPlan(radioStorageKey, radioFallback);
    setRadioPlan(nextRadioPlan);
    const savedProfile = getBoardProfile(
      savedFcPlan.profileId,
      selectedFlightController,
    );
    const savedChannelLimit = savedFcPlan.firmwareFamily === "aerialkit" ? 8 : 16;
    const savedControlRoles = savedFcPlan.firmwareFamily === "aerialkit"
      ? getAerialKitControlRoles(savedProfile).map((role) => role.key)
      : null;
    radioBaselineRef.current = JSON.stringify(createRadioDraft(
      savedRadioPlan,
      savedChannelLimit,
      savedControlRoles,
    ));
    setRecoveredDraft({
      fc: Boolean(
        hasFcDraft && JSON.stringify(nextFcPlan) !== fcBaselineRef.current,
      ),
      radio: Boolean(
        hasRadioDraft
        && JSON.stringify(createRadioDraft(
          nextRadioPlan,
          savedChannelLimit,
          savedControlRoles,
        )) !== radioBaselineRef.current,
      ),
    });
    setPlansLoaded(true);
  }, [
    build?.id,
    fcDraftKey,
    fcStorageKey,
    radioDraftKey,
    radioStorageKey,
    selectedFlightController,
    selectedReceiver,
  ]);

  const fcProfile = useMemo(
    () => getBoardProfile(fcPlan.profileId, selectedFlightController),
    [fcPlan.profileId, selectedFlightController],
  );
  const radioChannelLimit = fcPlan.firmwareFamily === "aerialkit" ? 8 : 16;
  const radioControlRoles = useMemo(
    () => fcPlan.firmwareFamily === "aerialkit"
      ? getAerialKitControlRoles(fcProfile).map((role) => role.key)
      : null,
    [fcPlan.firmwareFamily, fcProfile],
  );
  useEffect(() => {
    if (!plansLoaded) return;
    try {
      const fcDraft = JSON.stringify(fcPlan);
      if (fcDraft === fcBaselineRef.current) {
        localStorage.removeItem(fcDraftKey);
      } else {
        localStorage.setItem(fcDraftKey, fcDraft);
      }
      const radioDraft = JSON.stringify(createRadioDraft(
        radioPlan,
        radioChannelLimit,
        radioControlRoles,
      ));
      if (radioDraft === radioBaselineRef.current) {
        localStorage.removeItem(radioDraftKey);
      } else {
        localStorage.setItem(radioDraftKey, radioDraft);
      }
    } catch {
      // Draft persistence is best-effort; explicit saves still report failures.
    }
  }, [
    fcDraftKey,
    fcPlan,
    plansLoaded,
    radioChannelLimit,
    radioControlRoles,
    radioDraftKey,
    radioPlan,
  ]);
  const radioRoleOptions = useMemo(() => ({
    channelLimit: radioChannelLimit,
    controlRoles: radioControlRoles,
  }), [radioChannelLimit, radioControlRoles]);
  const fcHasUnsavedChanges = Boolean(
    plansLoaded
    && fcBaselineRef.current != null
    && JSON.stringify(fcPlan) !== fcBaselineRef.current,
  );
  const radioHasUnsavedChanges = Boolean(
    plansLoaded
    && radioBaselineRef.current != null
    && JSON.stringify(createRadioDraft(
      radioPlan,
      radioChannelLimit,
      radioControlRoles,
    )) !== radioBaselineRef.current,
  );
  const unsavedPlanLabels = [
    fcHasUnsavedChanges ? "flight-controller plan" : null,
    radioHasUnsavedChanges ? "radio plan" : null,
  ].filter(Boolean);
  const radioRoleKeys = new Set(
    getRadioChannelRoles(radioChannelLimit, radioControlRoles)
      .map((role) => role.key),
  );
  const fcIssues = useMemo(
    () => validateFlightControllerConfig(fcPlan, fcProfile, {
      buildMotorCount: selectedFrame?.motorCount ?? null,
    }),
    [fcPlan, fcProfile, selectedFrame],
  );
  const radioWarnings = useMemo(
    () => buildRadioWarnings(radioPlan, {
      ...radioRoleOptions,
      receiver: selectedReceiver,
    }),
    [radioPlan, radioRoleOptions, selectedReceiver],
  );
  const mappingWarnings = useMemo(
    () => buildChannelMappingWarnings(fcPlan, radioPlan, radioRoleOptions),
    [fcPlan, radioPlan, radioRoleOptions],
  );
  const benchRunbook = useMemo(
    () => buildBenchRunbook(fcPlan, radioPlan),
    [fcPlan, radioPlan],
  );
  const radioTarget = getRadioTarget(radioPlan.targetId);
  const captureRoles = radioTarget.roles.includes("tx")
    && radioTarget.roles.includes("rx")
    ? ["tx", "rx"]
    : [radioPlan.role];
  const newCaptureSessionId = useCallback(
    () => `capture-${
      window.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }`,
    [],
  );
  const [captureSessionId, setCaptureSessionId] = useState(newCaptureSessionId);
  const captureTargetRef = useRef(radioTarget.id);
  const dualCapture = captureRoles.length > 1;
  const selectedCaptureRoles = captureRoles.filter(
    (captureRole) => captureStatuses[captureRole] === "port-selected",
  );
  const activeCaptureRoles = captureRoles.filter((captureRole) => (
    ["starting", "capturing", "stopping"].includes(captureStatuses[captureRole])
  ));
  const captureStarting = captureRoles.some(
    (captureRole) => captureStatuses[captureRole] === "starting",
  );
  const captureStopping = captureRoles.some(
    (captureRole) => captureStatuses[captureRole] === "stopping",
  );
  const captureTransitionBusy = captureCommandPending
    || captureStarting
    || captureStopping;
  const captureReadyToStart = dualCapture
    && selectedCaptureRoles.length === 2;
  const captureSessionActive = activeCaptureRoles.length > 0;
  const captureBusy = Object.values(captureStatuses).some(
    (status) => [
      "selecting",
      "starting",
      "capturing",
      "stopping",
    ].includes(status),
  ) || captureCommandPending;
  useEffect(() => {
    if (captureTargetRef.current === radioTarget.id) return;
    captureTargetRef.current = radioTarget.id;
    setCaptureStatuses({});
    setCaptureSessionId(newCaptureSessionId());
    setCaptureMessage("");
  }, [newCaptureSessionId, radioTarget.id]);
  const expectedBenchUid = useMemo(() => {
    const identity = getBindingIdentity(radioPlan);
    return identity.unbound ? null : identity.uid;
  }, [radioPlan]);
  const evidenceScope = useMemo(
    () => createBenchEvidenceScope({
      build,
      flightControllerPlan: fcPlan,
      radioPlan,
      pairingUid: expectedBenchUid,
    }),
    [build, expectedBenchUid, fcPlan, radioPlan],
  );
  const fcErrors = fcIssues.filter((issue) => issue.severity === "error").length;
  const radioIssueCount = radioWarnings.length + mappingWarnings.length;
  const issueCount = fcIssues.length + radioIssueCount;
  const setupReady = issueCount === 0;
  const readinessLabel = issueCount
    ? [
        `${issueCount} combined check${issueCount === 1 ? "" : "s"}`,
        fcErrors
          ? `${fcErrors} blocker${fcErrors === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean).join(" · ")
    : "Combined plan clear";

  const switchTab = (tab) => {
    setMessage("");
    setSearchParams({ tab });
  };

  const adoptObservedPlanPatch = useCallback(({ source, values, count }) => {
    if (source === "fc") {
      setFcPlan((current) => ({ ...current, ...values }));
    } else if (source === "radio") {
      setRadioPlan((current) => normalizeRadioConfig({
        ...current,
        ...values,
      }));
    } else {
      return;
    }
    setMessage(
      `Adopted ${count} observed ${source === "fc" ? "flight-controller" : "radio"} value${count === 1 ? "" : "s"} into the local plan. Nothing was saved or sent to hardware; previews and the runbook were regenerated.`,
    );
  }, []);

  const copyCaptureProcedure = async () => {
    const procedure = [
      "# RotorBench endpoint capture session",
      `Session: ${captureSessionId}`,
      `Target: ${radioTarget.name}`,
      ...captureRoles.map((captureRole) => (
        `${captureRole.toUpperCase()} logical baud: ${
          captureRole === "tx" ? radioTarget.serial.txBaud : radioTarget.serial.rxBaud
        }`
      )),
      "",
      "1. Use a props-off aircraft and fit antennas or RF loads.",
      "2. Select each endpoint's port explicitly in the capture deck.",
      "3. Use Start together so TX and RX receive the same session command and keep their windows overlapping.",
      "4. Download both observations and import them together in Review evidence.",
      "",
      "Read-only observation only. This does not prove RF range, performance, or flight readiness.",
    ].join("\n");
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(procedure);
      setMessage("Capture session procedure copied. Nothing was sent to hardware.");
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  const startSynchronizedCapture = async () => {
    if (captureCommandPendingRef.current) return;
    const refs = captureRoles.map((captureRole) => (
      captureRefs.current[captureRole]
    ));
    if (!captureReadyToStart || refs.some((captureRef) => !captureRef)) return;
    captureCommandPendingRef.current = true;
    setCaptureCommandPending(true);
    setCaptureMessage("Opening both selected ports from one session action.");
    try {
      const results = await Promise.allSettled(
        refs.map((captureRef) => captureRef.startCapture()),
      );
      const failed = results.some(
        (result) => result.status === "rejected" || result.value !== true,
      );
      if (failed) {
        await Promise.allSettled(
          refs.map((captureRef) => captureRef.stopCapture()),
        );
        setCaptureMessage(
          "Both ports did not open. Select the ports again; RotorBench is not presenting these windows as aligned.",
        );
        return;
      }
      setCaptureMessage(
        "Both selected ports received the same start action. Compare their recorded start times before relying on overlap.",
      );
    } finally {
      captureCommandPendingRef.current = false;
      setCaptureCommandPending(false);
    }
  };

  const stopSynchronizedCapture = async () => {
    if (captureCommandPendingRef.current) return;
    const refs = captureRoles.map((captureRole) => (
      captureRefs.current[captureRole]
    ));
    captureCommandPendingRef.current = true;
    setCaptureCommandPending(true);
    setCaptureMessage("Stop requested for both endpoint captures.");
    try {
      await Promise.allSettled(
        refs.filter(Boolean).map((captureRef) => captureRef.stopCapture()),
      );
    } finally {
      captureCommandPendingRef.current = false;
      setCaptureCommandPending(false);
    }
  };

  const handleTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = activeTab === "flight-controller" ? "radio" : "flight-controller";
    const target = event.key === "Home"
      ? "flight-controller"
      : event.key === "End"
        ? "radio"
        : next;
    switchTab(target);
    requestAnimationFrame(() => {
      document.getElementById(`setup-tab-${target}`)?.focus();
    });
  };

  const saveFcPlan = () => {
    try {
      localStorage.setItem(fcStorageKey, JSON.stringify(fcPlan));
      localStorage.removeItem(fcDraftKey);
      fcBaselineRef.current = JSON.stringify(fcPlan);
      setRecoveredDraft((current) => ({ ...current, fc: false }));
      setMessage("Flight-controller plan saved locally.");
    } catch {
      setMessage("The browser could not save the flight-controller plan.");
    }
  };

  const saveRadioPlan = () => {
    localStorage.removeItem(radioDraftKey);
    radioBaselineRef.current = JSON.stringify(createRadioDraft(
      radioPlan,
      radioChannelLimit,
      radioControlRoles,
    ));
    setRecoveredDraft((current) => ({ ...current, radio: false }));
    setMessage("Radio plan saved locally. Binding material was not persisted.");
  };

  const copyFcChannelsToRadio = () => {
    setRadioPlan((current) => applyFlightControllerChannelMap(
      current,
      fcPlan,
      radioRoleOptions,
    ));
    setMessage("Radio channel roles now follow the flight-controller plan.");
  };

  const copyRadioChannelsToFc = () => {
    const mapped = radioPlan.channelMap || {};
    const validChannel = (value) => Number.isInteger(value) ? value : null;
    setFcPlan((current) => ({
      ...current,
      armChannel: radioRoleKeys.has("arm") ? validChannel(mapped.arm) : null,
      modeChannel: radioRoleKeys.has("flightMode") ? validChannel(mapped.flightMode) : null,
      beeperChannel: radioRoleKeys.has("beeper") ? validChannel(mapped.beeper) : null,
      velocityChannel: radioRoleKeys.has("velocity") ? validChannel(mapped.velocity) : null,
      manualChannel: radioRoleKeys.has("manual") ? validChannel(mapped.manual) : null,
      ctrlChannel: radioRoleKeys.has("control") ? validChannel(mapped.control) : null,
      sysidChannel: radioRoleKeys.has("systemId") ? validChannel(mapped.systemId) : null,
    }));
    setMessage("Flight-controller channel roles now follow the radio plan.");
  };

  const exportCombinedPlan = () => {
    const payload = createCombinedHardwarePlan({
      build,
      flightController: {
        config: fcPlan,
        profile: fcProfile,
        issues: fcIssues,
      },
      radio: radioPlan,
      receiver: selectedReceiver,
      channelLimit: radioChannelLimit,
      controlRoles: radioControlRoles,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rotorbench-hardware-plan-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("Combined hardware plan exported.");
  };

  const copyHardwarePlanBriefing = async () => {
    const briefing = createHardwarePlanBriefing({
      build,
      flightController: selectedFlightController,
      receiver: selectedReceiver,
      fcPlan,
      fcProfile,
      fcIssues,
      radioPlan,
      channelLimit: radioChannelLimit,
      controlRoles: radioControlRoles,
      radioWarnings,
      mappingWarnings,
    });
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(briefing.text);
      setMessage(
        "Hardware plan summary copied. Binding material was excluded and nothing was sent to hardware.",
      );
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  const importCombinedPlan = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseCombinedHardwarePlanJson(await file.text());
      if (
        selectedFlightController?.id &&
        imported.fcPlan.selectedFlightControllerId &&
        imported.fcPlan.selectedFlightControllerId !== selectedFlightController.id
      ) {
        throw new Error("This hardware plan belongs to a different flight controller.");
      }
      if (
        selectedReceiver?.id &&
        imported.radioPlan.selectedReceiverId &&
        imported.radioPlan.selectedReceiverId !== selectedReceiver.id
      ) {
        throw new Error("This hardware plan belongs to a different receiver.");
      }
      const nextFcPlan = {
        ...imported.fcPlan,
        selectedFlightControllerId:
          imported.fcPlan.selectedFlightControllerId || selectedFlightController?.id || null,
        selectedReceiverId:
          imported.fcPlan.selectedReceiverId || selectedReceiver?.id || null,
      };
      const nextRadioPlan = {
        ...imported.radioPlan,
        selectedReceiverId:
          imported.radioPlan.selectedReceiverId || selectedReceiver?.id || null,
      };
      const changes = summarizeHardwarePlanImportChanges(
        fcPlan,
        nextFcPlan,
        radioPlan,
        nextRadioPlan,
      );
      setPendingPlanImport({
        fileName: file.name,
        fcPlan: nextFcPlan,
        radioPlan: nextRadioPlan,
        changes,
      });
      setMessage(
        `Hardware plan staged from ${file.name}. Review ${changes.length} change${changes.length === 1 ? "" : "s"} before applying it.`,
      );
    } catch (error) {
      setMessage(`Could not import hardware plan: ${error.message}`);
    }
  };

  const applyPendingPlanImport = () => {
    if (!pendingPlanImport) return;
    setFcPlan(pendingPlanImport.fcPlan);
    setRadioPlan(pendingPlanImport.radioPlan);
    setMessage(
      `Hardware plan applied from ${pendingPlanImport.fileName}. Binding material and hardware state were not imported.`,
    );
    setPendingPlanImport(null);
  };

  const cancelPendingPlanImport = () => {
    setPendingPlanImport(null);
    setMessage("Hardware plan import canceled. The current plan was not changed.");
  };

  return (
    <div className="setup-page">
      <header className="setup-page-header">
        <div>
          <h1>Hardware setup</h1>
          <p>
            Plan the flight-controller and radio link for this airframe. Nothing here
            connects to, flashes, or arms hardware.
          </p>
        </div>
        <div className={`setup-readiness ${setupReady ? "is-ready" : "needs-review"}`}>
          {setupReady ? <Check size={17} aria-hidden="true" /> : <ShieldAlert size={17} aria-hidden="true" />}
          <span>
            <strong>{readinessLabel}</strong>
            <small>
              {build ? "Flight controller + radio · linked build" : "Flight controller + radio · standalone"}
            </small>
          </span>
        </div>
      </header>

      <section className="setup-context" aria-label="Hardware plan context">
        <div>
          <span>Build controller</span>
          <strong>{selectedFlightController?.name || "No controller selected"}</strong>
        </div>
        <div>
          <span>Build receiver</span>
          <strong>{selectedReceiver?.name || "No receiver selected"}</strong>
        </div>
        <div>
          <span>Current airframe</span>
          <strong>{build?.name || "Standalone plan"}</strong>
        </div>
        <Link
          to="/build"
          state={build ? { build } : undefined}
          className="setup-context-link"
        >
          Edit build <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      <div className="setup-tabs">
        <div
          className="setup-tab-list"
          role="tablist"
          aria-label="Hardware setup section"
          onKeyDown={handleTabKeyDown}
        >
          <button
            type="button"
            role="tab"
            id="setup-tab-flight-controller"
            aria-selected={activeTab === "flight-controller"}
            aria-controls="setup-panel-flight-controller"
            aria-describedby={fcHasUnsavedChanges ? "setup-unsaved-status" : undefined}
            className={[
              activeTab === "flight-controller" ? "is-active" : "",
              fcHasUnsavedChanges ? "has-unsaved" : "",
            ].filter(Boolean).join(" ")}
            tabIndex={activeTab === "flight-controller" ? 0 : -1}
            onClick={() => switchTab("flight-controller")}
          >
            <Cpu size={18} aria-hidden="true" />
            Flight controller
          </button>
          <button
            type="button"
            role="tab"
            id="setup-tab-radio"
            aria-selected={activeTab === "radio"}
            aria-controls="setup-panel-radio"
            aria-describedby={radioHasUnsavedChanges ? "setup-unsaved-status" : undefined}
            className={[
              activeTab === "radio" ? "is-active" : "",
              radioHasUnsavedChanges ? "has-unsaved" : "",
            ].filter(Boolean).join(" ")}
            tabIndex={activeTab === "radio" ? 0 : -1}
            onClick={() => switchTab("radio")}
          >
            <RadioTower size={18} aria-hidden="true" />
            Radio link
          </button>
        </div>
        <div className="setup-plan-transfer">
          <button
            type="button"
            className="setup-export"
            onClick={copyHardwarePlanBriefing}
          >
            <Clipboard size={17} aria-hidden="true" />
            Copy summary
          </button>
          <button
            type="button"
            className="setup-export"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={17} aria-hidden="true" />
            Import plan
          </button>
          <button type="button" className="setup-export" onClick={exportCombinedPlan}>
            <Download size={17} aria-hidden="true" />
            Export combined plan
          </button>
          <input
            ref={importInputRef}
            className="setup-import-input"
            type="file"
            accept="application/json,.json"
            aria-label="Import combined hardware plan"
            onChange={importCombinedPlan}
          />
        </div>
      </div>

      {pendingPlanImport && (
        <section
          className="setup-import-review"
          aria-label="Review imported hardware plan"
        >
          <div className="setup-import-review-heading">
            <Upload size={18} aria-hidden="true" />
            <span>
              <strong>Review imported plan</strong>
              <small>
                {pendingPlanImport.fileName} · staged only, nothing sent or saved
              </small>
            </span>
            <em>
              {pendingPlanImport.changes.length} change
              {pendingPlanImport.changes.length === 1 ? "" : "s"}
            </em>
          </div>
          {pendingPlanImport.changes.length > 0 ? (
            <ul
              className="setup-import-review-changes"
              aria-label="Imported plan changes"
              tabIndex={0}
            >
              {pendingPlanImport.changes.map((change) => (
                <li key={`${change.section}:${change.field}`}>
                  <span>{change.section}</span>
                  <strong>{change.label}</strong>
                  <small>
                    {change.from} → {change.to}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No effective configuration differences were found.</p>
          )}
          <div className="setup-import-review-actions">
            <button type="button" onClick={applyPendingPlanImport}>
              <Check size={16} aria-hidden="true" />
              Apply imported plan
            </button>
            <button type="button" onClick={cancelPendingPlanImport}>
              <X size={16} aria-hidden="true" />
              Cancel import
            </button>
          </div>
        </section>
      )}

      {message && <div className="setup-message" role="status">{message}</div>}
      {(recoveredDraft.fc || recoveredDraft.radio) && !message && (
        <div
          id="setup-unsaved-status"
          className="setup-message"
          role="status"
        >
          Recovered an unsaved local setup draft. Binding phrase and direct UID
          are not retained in drafts.
        </div>
      )}
      {unsavedPlanLabels.length > 0
        && (message || (!recoveredDraft.fc && !recoveredDraft.radio)) && (
        <div
          id="setup-unsaved-status"
          className="setup-message setup-unsaved-message"
          role="status"
        >
          <strong>Unsaved local changes</strong>
          <span>
            {unsavedPlanLabels.join(" and ")} differ
            {unsavedPlanLabels.length === 1 ? "s" : ""} from the saved plan.
            The working values stay in this browser as a draft; use each
            section's save action to confirm them.
          </span>
        </div>
      )}
      {mappingWarnings.length > 0 && (
        <div className="setup-mapping-warning" role="status">
          <ShieldAlert size={17} aria-hidden="true" />
          <div>
            <strong>Channel mappings differ</strong>
            <ul>
              {mappingWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
            <div className="setup-mapping-actions">
              <button type="button" onClick={copyFcChannelsToRadio}>
                Use flight-controller mapping
              </button>
              <button type="button" onClick={copyRadioChannelsToFc}>
                Use radio mapping
              </button>
            </div>
          </div>
        </div>
      )}

      <details
        className="setup-bench-tools"
        data-testid="setup-bench-tools"
        open={setupBenchToolsOpen}
        onToggle={(event) => setSetupBenchToolsOpen(event.currentTarget.open)}
      >
        <summary>
          <Wrench size={18} aria-hidden="true" />
          <span>
            <strong>Bench tools</strong>
            <small>Copy-only runbook and read-only serial evidence</small>
          </span>
          <em>Nothing sent</em>
        </summary>
        <div className="setup-bench-tools-body">
          <button
            type="button"
            className="setup-bench-evidence-jump"
            onClick={openEvidenceReview}
          >
            <span>
              <strong>Review imported evidence</strong>
              <small>FC status, parameters, radio snapshots, and observations</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <BenchRunbook
            runbook={benchRunbook}
            expectedUid={expectedBenchUid}
            buildId={build?.id}
            evidenceScope={evidenceScope}
            expectedFc={{
              firmwareFamily: fcPlan.firmwareFamily,
              plan: fcPlan,
              targetName: selectedFlightController?.name || fcProfile.label,
              boardName: fcProfile.board,
            }}
            expectedRadio={{
              role: radioPlan.role,
              txBaud: radioTarget.serial.txBaud,
              rxBaud: radioTarget.serial.rxBaud,
              targetName: radioTarget.name,
              firmwareVersion: radioTarget.firmwareVersion,
              plan: radioPlan,
            }}
            onAdoptPlanPatch={adoptObservedPlanPatch}
            open={benchRunbookOpen}
            onOpenChange={setBenchRunbookOpen}
          />
          <div className="serial-capture-deck">
            <div className="serial-capture-deck-header">
              <div>
                <strong>Endpoint capture session</strong>
                <span>…{captureSessionId.slice(-12)}</span>
                <em
                  className={`serial-capture-session-state is-${
                    captureSessionActive
                      ? "active"
                      : captureReadyToStart ? "ready" : "waiting"
                  }`}
                >
                  {captureSessionActive
                    ? captureStopping
                      ? `Stopping ${activeCaptureRoles.length}/${captureRoles.length}`
                      : captureStarting
                        ? `Opening ${activeCaptureRoles.length}/${captureRoles.length}`
                        : `${activeCaptureRoles.length}/${captureRoles.length} capturing`
                    : captureReadyToStart
                      ? "Both ports ready"
                      : `${selectedCaptureRoles.length}/2 ports selected`}
                </em>
              </div>
              <div className="serial-capture-deck-actions">
                {dualCapture && (
                  <button
                    type="button"
                    className={`serial-capture-session-action ${
                      captureSessionActive ? "is-stop" : ""
                    }`}
                    disabled={
                      captureTransitionBusy
                      || (!captureSessionActive && !captureReadyToStart)
                    }
                    onClick={captureSessionActive
                      ? stopSynchronizedCapture
                      : startSynchronizedCapture}
                  >
                    {captureStopping
                      ? <CircleStop size={15} aria-hidden="true" />
                      : captureStarting
                        ? <Play size={15} aria-hidden="true" />
                        : captureSessionActive
                          ? <CircleStop size={15} aria-hidden="true" />
                          : <Play size={15} aria-hidden="true" />}
                    {captureStopping
                      ? "Stopping…"
                      : captureStarting
                        ? "Opening ports…"
                        : captureSessionActive
                          ? "Stop together"
                      : captureReadyToStart
                        ? "Start together"
                        : selectedCaptureRoles.length
                          ? "Select remaining port"
                          : "Select both ports"}
                  </button>
                )}
                <button type="button" onClick={copyCaptureProcedure}>
                  Copy session procedure
                </button>
                <button
                  type="button"
                  disabled={captureBusy}
                  onClick={() => {
                    setCaptureStatuses({});
                    setCaptureSessionId(newCaptureSessionId());
                    setCaptureMessage("");
                  }}
                >
                  New capture session
                </button>
              </div>
            </div>
            <p>
              {captureRoles.length > 1
                ? "Select each endpoint explicitly, then use Start together so both descriptors open from one session action. Opening delays are recorded per endpoint; keep the window open long enough for actual overlap."
                : "Open the selected endpoint explicitly. Its downloaded observation can be reviewed with a matching endpoint file from another host."}
            </p>
            {captureMessage && (
              <p className="serial-capture-session-message" role="status">
                {captureMessage}
              </p>
            )}
            <div className="serial-capture-deck-grid">
              {captureRoles.map((captureRole) => (
                <WebSerialCapture
                  key={`${captureRole}-${radioTarget.id}-${captureSessionId}`}
                  ref={(captureRef) => {
                    captureRefs.current[captureRole] = captureRef;
                  }}
                  expectedBaud={captureRole === "tx"
                    ? radioTarget.serial.txBaud
                    : radioTarget.serial.rxBaud}
                  role={captureRole}
                  targetName={radioTarget.name}
                  channelMap={radioPlan.channelMap}
                  receiverCalibration={{
                    min: fcPlan.rcMin,
                    mid: fcPlan.rcMid,
                    max: fcPlan.rcMax,
                    deadband: fcPlan.rcDeadband,
                  }}
                  endpointLabel={`${captureRole.toUpperCase()} endpoint`}
                  captureSessionId={captureSessionId}
                  syncMode={dualCapture}
                  onCaptureStateChange={(status) => {
                    if (["selecting", "port-selected"].includes(status)) {
                      setCaptureMessage("");
                    }
                    setCaptureStatuses(
                      (current) => current[captureRole] === status
                        ? current
                        : { ...current, [captureRole]: status },
                    );
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </details>

      {activeTab === "flight-controller" ? (
        <div
          role="tabpanel"
          id="setup-panel-flight-controller"
          aria-labelledby="setup-tab-flight-controller"
        >
          <FlightControllerSetup
            key={`${build?.id || "standalone"}:flight-controller`}
            value={fcPlan}
            onChange={setFcPlan}
            onSave={saveFcPlan}
            selectedFlightController={selectedFlightController}
            selectedReceiver={selectedReceiver}
            buildMotorCount={selectedFrame?.motorCount ?? null}
            buildServoCount={selectedFrame?.servoHardware?.quantity ?? null}
            storageKey={fcStorageKey}
            onOpenEvidenceReview={openEvidenceReview}
          />
        </div>
      ) : (
        <div role="tabpanel" id="setup-panel-radio" aria-labelledby="setup-tab-radio">
          <RadioLinkSetup
            key={`${build?.id || "standalone"}:radio`}
            value={radioPlan}
            receiverName={selectedReceiver?.name || ""}
            selectedReceiver={selectedReceiver}
            flightControllerName={selectedFlightController?.name || ""}
            channelLimit={radioChannelLimit}
            controlRoles={radioControlRoles}
            onChange={setRadioPlan}
            onSave={saveRadioPlan}
            storageKey={radioStorageKey}
          />
        </div>
      )}
    </div>
  );
}
