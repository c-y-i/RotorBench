import React, { useEffect, useRef, useState } from "react";
import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import {
  getBatteryPlacementMm,
  getExplodedOffsetMm,
  getFallbackDimensionsMm,
  getFrameMountPointsMm,
  getMotorMountOutlineMm,
  getMotorOriginsMm,
  getPropellerHubDiameterMm,
  getPropellerOriginsMm,
  getPropellerSweepDiameterMm,
  getPropellerVariant,
  getStackLevelsMm,
  getUniformModelScale,
  MM_TO_SCENE,
  toSceneVectorMm,
} from "../assembly/assemblyTransforms";
import { getCameraView } from "../assembly/cameraViews";
import { supportsWebGL } from "../assembly/webglSupport";

const FIXED_UNIT_SCALE = 0.001; // 1 mm -> 0.001 Babylon units (meters)

const createMaterial = (scene, name, hex, emissive = false) => {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hex);
  material.specularColor = new Color3(0.18, 0.2, 0.19);
  if (emissive) {
    material.emissiveColor = Color3.FromHexString(hex).scale(0.16);
  }
  return material;
};

const tagFallbackMeshes = (meshes, componentType, variant = null) => {
  meshes.forEach((mesh) => {
    mesh.metadata = {
      ...(mesh.metadata || {}),
      componentType,
      assemblyFallback: true,
      propellerVariant: variant,
    };
  });
};

const getGroupBounds = (meshes) => {
  let min = new Vector3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  let max = new Vector3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );
  let hasFiniteBounds = false;

  meshes.forEach((mesh) => {
    if (!mesh?.getBoundingInfo) return;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo()?.boundingBox;
    if (!box) return;
    const { minimumWorld, maximumWorld } = box;
    if (
      !Number.isFinite(minimumWorld.x) ||
      !Number.isFinite(minimumWorld.y) ||
      !Number.isFinite(minimumWorld.z) ||
      !Number.isFinite(maximumWorld.x) ||
      !Number.isFinite(maximumWorld.y) ||
      !Number.isFinite(maximumWorld.z)
    ) {
      return;
    }
    min = Vector3.Minimize(min, minimumWorld);
    max = Vector3.Maximize(max, maximumWorld);
    hasFiniteBounds = true;
  });

  return hasFiniteBounds ? { min, max } : null;
};

const alignRootChildrenToBase = (root) => {
  if (!root) return null;
  const children = root.getChildMeshes().filter((mesh) => mesh.parent === root);
  if (!children.length) return null;
  const bounds = getGroupBounds(children);
  if (!bounds) return null;
  const centerX = (bounds.min.x + bounds.max.x) * 0.5;
  const centerZ = (bounds.min.z + bounds.max.z) * 0.5;
  children.forEach((mesh) => {
    mesh.position.x -= centerX;
    mesh.position.y -= bounds.min.y;
    mesh.position.z -= centerZ;
  });
  return {
    height: bounds.max.y - bounds.min.y,
    width: bounds.max.x - bounds.min.x,
    depth: bounds.max.z - bounds.min.z,
  };
};

const createNormalizedInstance = ({
  scene,
  sourceMeshes,
  componentType,
  prefix,
  index,
  position,
  variant = null,
  targetDimensionsMm = null,
}) => {
  const root = new TransformNode(`${prefix}_${index}_root`, scene);
  const rootName = `${prefix}_${index}_root`;
  const clones = sourceMeshes.map((source, meshIndex) => {
    const clone = source.clone(`${rootName}_${meshIndex}_${source.name}`, null);
    if (!clone) return null;
    clone.parent = root;
    clone.isVisible = true;
    return clone;
  }).filter(Boolean);

  if (!clones.length) {
    root.dispose();
    return null;
  }

  alignRootChildrenToBase(root);
  const bounds = getGroupBounds(root.getChildMeshes());
  const actualExtents = bounds
    ? [
        bounds.max.x - bounds.min.x,
        bounds.max.y - bounds.min.y,
        bounds.max.z - bounds.min.z,
      ]
    : null;
  const normalizationScale = getUniformModelScale(
    actualExtents,
    targetDimensionsMm,
  );
  root.scaling = new Vector3(
    normalizationScale,
    normalizationScale,
    normalizationScale,
  );

  const toFinite = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  root.position = new Vector3(
    toFinite(position?.x ?? position?.[0]),
    toFinite(position?.y ?? position?.[1]),
    toFinite(position?.z ?? position?.[2]),
  );
  root.metadata = {
    componentType,
    propellerVariant: variant,
    normalizationScale,
  };
  tagFallbackMeshes(clones, componentType, variant);
  clones.forEach((mesh) => {
    mesh.metadata.assemblyFallback = false;
  });
  return root;
};

const getVisibleTopY = (root, fallbackY) => {
  if (!root) return fallbackY;
  const bounds = getGroupBounds(root.getChildMeshes());
  return bounds ? bounds.max.y : fallbackY;
};

const createFrameFallback = (scene, frame = {}) => {
  const root = new TransformNode("frame_fallback_root", scene);
  const dimensions = getFallbackDimensionsMm("frame", frame).map((value) => value * MM_TO_SCENE);
  const [width, height, depth] = dimensions;
  const mounts = getFrameMountPointsMm(frame).map((point) => toSceneVectorMm(point));
  const carbon = createMaterial(scene, "frame_carbon", "#17201e");
  const edge = createMaterial(scene, "frame_edge", "#53d7c8", true);

  if (frame.airframeShape === "wing") {
    const wing = MeshBuilder.CreateBox("frame_fallback_wing", {
      width: Math.max(width * 0.9, 0.1),
      height: Math.max(height * 0.1, 0.008),
      depth: Math.max(depth * 0.34, 0.12),
    }, scene);
    wing.parent = root;
    wing.position.y = height * 0.55;
    wing.material = carbon;

    const fuselage = MeshBuilder.CreateBox("frame_fallback_fuselage", {
      width: Math.max(width * 0.08, 0.03),
      height: Math.max(height * 0.55, 0.025),
      depth: Math.max(depth * 0.78, 0.2),
    }, scene);
    fuselage.parent = root;
    fuselage.position.y = height * 0.3;
    fuselage.material = carbon;

    const nacelleWidth = Math.max(width * 0.025, 0.014);
    mounts.forEach((mount, index) => {
      const nacelle = MeshBuilder.CreateBox(`frame_fallback_nacelle_${index}`, {
        width: nacelleWidth,
        height: Math.max(height * 0.14, 0.007),
        depth: Math.max(depth * 0.28, 0.08),
      }, scene);
      nacelle.parent = root;
      nacelle.position = new Vector3(
        mount.x,
        Math.max(mount.y, height * 0.16),
        mount.z,
      );
      nacelle.material = edge;
    });

    tagFallbackMeshes(root.getChildMeshes(), "frame");
    root.metadata = {
      componentType: "frame",
      assemblyFallback: true,
      airframeShape: "wing",
    };
    return root;
  }

  const deck = MeshBuilder.CreateBox("frame_fallback_deck", {
    width: Math.min(width * 0.34, 0.08),
    height: Math.max(height * 0.22, 0.004),
    depth: Math.min(depth * 0.4, 0.1),
  }, scene);
  deck.parent = root;
  deck.position.y = height * 0.5;
  deck.material = carbon;

  const armThickness = Math.max(width * 0.045, 0.009);
  mounts.forEach((mount, index) => {
    const dx = mount.x;
    const dz = mount.z;
    const length = Math.hypot(dx, dz);
    const arm = MeshBuilder.CreateBox(`frame_fallback_arm_${index}`, {
      width: length,
      height: Math.max(height * 0.12, 0.0025),
      depth: armThickness,
    }, scene);
    arm.parent = root;
    arm.position = new Vector3(dx * 0.5, Math.max(mount.y, height * 0.15), dz * 0.5);
    arm.rotation.y = -Math.atan2(dz, dx);
    arm.material = carbon;

    const cap = MeshBuilder.CreateCylinder(`frame_fallback_mount_${index}`, {
      height: 0.002,
      diameter: Math.max(armThickness * 1.7, 0.012),
      tessellation: 24,
    }, scene);
    cap.parent = root;
    cap.position = new Vector3(dx, Math.max(mount.y, height * 0.15) + 0.001, dz);
    cap.material = edge;
  });

  tagFallbackMeshes(root.getChildMeshes(), "frame");
  root.metadata = { componentType: "frame", assemblyFallback: true };
  return root;
};

const createMotorFallback = (scene, motor = {}, position, index) => {
  const dimensions = getFallbackDimensionsMm("motor", motor).map((value) => value * MM_TO_SCENE);
  const root = new TransformNode(`motor_${index}_root`, scene);
  root.position = position;
  const body = MeshBuilder.CreateCylinder(`motor_${index}_fallback_body`, {
    height: Math.max(dimensions[1] * 0.62, 0.012),
    diameter: Math.max(dimensions[0], 0.018),
    tessellation: 28,
  }, scene);
  body.parent = root;
  body.position.y = dimensions[1] * 0.31;
  body.material = createMaterial(scene, `motor_${index}_body_mat`, "#202624");

  const cap = MeshBuilder.CreateCylinder(`motor_${index}_fallback_cap`, {
    height: Math.max(dimensions[1] * 0.18, 0.004),
    diameter: Math.max(dimensions[0] * 0.72, 0.015),
    tessellation: 28,
  }, scene);
  cap.parent = root;
  cap.position.y = dimensions[1] * 0.59;
  cap.material = createMaterial(scene, `motor_${index}_cap_mat`, "#d4b23c");

  const shaft = MeshBuilder.CreateCylinder(`motor_${index}_fallback_shaft`, {
    height: Math.max(dimensions[1] * 0.22, 0.005),
    diameter: 0.004,
    tessellation: 16,
  }, scene);
  shaft.parent = root;
  shaft.position.y = dimensions[1] * 0.8;
  shaft.material = createMaterial(scene, `motor_${index}_shaft_mat`, "#c7d2cc");
  tagFallbackMeshes(root.getChildMeshes(), "motor");
  root.metadata = { componentType: "motor", assemblyFallback: true };
  return root;
};

const createPropellerFallback = (
  scene,
  propeller = {},
  position,
  index,
  propellerDirection = "props-out",
) => {
  const dimensions = getFallbackDimensionsMm("propeller", propeller).map((value) => value * MM_TO_SCENE);
  const variant = getPropellerVariant(index, propellerDirection);
  const root = new TransformNode(`prop_${index}_root`, scene);
  const bladeMaterial = createMaterial(scene, `prop_${index}_blade_mat`, variant === "CW" ? "#f1f3e9" : "#9ce5d8");
  const hubMaterial = createMaterial(scene, `prop_${index}_hub_mat`, "#212a27");

  const hub = MeshBuilder.CreateCylinder(`prop_${index}_fallback_hub`, {
    height: Math.max(dimensions[1] * 0.35, 0.003),
    diameter: Math.max(
      getPropellerHubDiameterMm(propeller) * MM_TO_SCENE,
      0.006,
    ),
    tessellation: 24,
  }, scene);
  hub.parent = root;
  hub.material = hubMaterial;

  const bladeCount = Math.max(Number(propeller.bladeCount) || 3, 2);
  for (let bladeIndex = 0; bladeIndex < bladeCount; bladeIndex += 1) {
    const blade = MeshBuilder.CreateBox(`prop_${index}_fallback_blade_${bladeIndex}`, {
      width: dimensions[0] * 0.44,
      height: Math.max(dimensions[1] * 0.14, 0.0018),
      depth: Math.max(dimensions[0] * 0.065, 0.005),
    }, scene);
    blade.parent = root;
    const angle = (Math.PI * 2 * bladeIndex) / bladeCount + (variant === "CW" ? 0.08 : -0.08);
    blade.position = new Vector3(Math.cos(angle) * dimensions[0] * 0.23, 0.001, Math.sin(angle) * dimensions[0] * 0.23);
    blade.rotation.y = -angle;
    blade.rotation.z = variant === "CW" ? -0.08 : 0.08;
    blade.material = bladeMaterial;
  }

  alignRootChildrenToBase(root);
  root.position = position;
  tagFallbackMeshes(root.getChildMeshes(), "propeller", variant);
  root.metadata = { componentType: "propeller", propellerVariant: variant, assemblyFallback: true };
  return root;
};

const createBoardFallback = (scene, type, part = {}, level, label) => {
  const fallbackType = type === "flight_controller" ? "flight_controller" : type;
  const dimensions = getFallbackDimensionsMm(fallbackType, part).map((value) => value * MM_TO_SCENE);
  const root = new TransformNode(`${type}_fallback_root`, scene);
  root.position.y = level;
  const board = MeshBuilder.CreateBox(`${type}_fallback_board`, {
    width: Math.max(dimensions[0], 0.02),
    height: Math.max(dimensions[1], 0.003),
    depth: Math.max(dimensions[2], 0.02),
  }, scene);
  board.parent = root;
  board.position.y = Math.max(dimensions[1], 0.004) * 0.5;
  const color = type === "esc" ? "#b64313" : type === "receiver" ? "#236f63" : "#1f4037";
  board.material = createMaterial(scene, `${type}_${label}_mat`, color);
  tagFallbackMeshes(root.getChildMeshes(), type);
  root.metadata = { componentType: type, assemblyFallback: true };
  return root;
};

const createBatteryFallback = (scene, battery = {}, placement) => {
  const root = new TransformNode("battery_fallback_root", scene);
  const [originX, originY, originZ] = toSceneVectorMm(placement.origin);
  root.position = new Vector3(originX, originY, originZ);
  const [width, height, depth] = placement.size.map((value) => value * MM_TO_SCENE);
  const body = MeshBuilder.CreateBox("battery_fallback_body", {
    width: Math.max(width, 0.02),
    height: Math.max(height, 0.012),
    depth: Math.max(depth, 0.02),
  }, scene);
  body.parent = root;
  body.position.y = Math.max(height, 0.012) * 0.5;
  body.material = createMaterial(scene, "battery_fallback_mat", "#be4b12");
  tagFallbackMeshes(root.getChildMeshes(), "battery");
  root.metadata = { componentType: "battery", assemblyFallback: true };
  return root;
};

/**
 * BabylonViewer component
 * Props:
 *  - modelUrl: string (single model to load)
 *  - modelUrls: string[] (multiple models to load)
 *  - autoRotate: boolean (auto spin models)
 *  - onLoaded: (count: number) => void callback after models loaded
 *  - frameCornerPositions: array of Vector3-like objects [{x,y,z},...] for motor placement
 *  - motorUrl: string (source model for a single motor; cloned to 4 corners)
 *  - motorMountingPoint: [x,y,z] offset from motor model origin to mounting point
 *  - batteryUrl, fcUrl, escUrl, receiverUrl: optional individual component URLs (center stacked)
 *  - propellerUrl + propellerMountingPoint: optional prop mesh + offset for proper alignment
 *  - exploded: boolean (separate inspection layers without changing X/Z mounts)
 */
const BabylonViewer = ({
  modelUrl,
  modelUrls = [],
  autoRotate = true,
  cameraView = "orbit",
  onLoaded,
  frameCornerPositions = [], // motor mount positions from frame data
  motorUrl,
  motorMountingPoint = [0, 0, 0], // [x,y,z] offset from motor origin to mounting point
  batteryUrl,
  batteryMountingPoint = [0, 0, 0],
  fcUrl,
  fcMountingPoint = [0, 0, 0],
  escUrl,
  escMountingPoint = [0, 0, 0],
  receiverUrl,
  receiverMountingPoint = [0, 0, 0],
  propellerUrl,
  propellerCWUrl,
  propellerCCWUrl,
  propellerDirection = "props-out",
  propellerMountingPoint = [0, 0, 0], // offset from prop origin to mounting plane
  assemblySpec = {},
  exploded = false,
  groundClearance = 2, // millimeters to lift lowest point above ground
  resetKey = 0,
  debug = false,
  showFitOverlay = false,
  fitOverlayStatus = {},
  clearedComponents = [], // array of component type strings to remove (e.g. ['frame','motor'])
  backgroundColor = "#2d2d44" // hex color for scene background
}) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const cameraRef = useRef(null);
  const autoRotateRef = useRef(autoRotate);
  const explodedRef = useRef(exploded);
  const showFitOverlayRef = useRef(showFitOverlay);
  const fitOverlayStatusRef = useRef(fitOverlayStatus);
  const [, setLoadedCount] = useState(0);
  const normalizeTimerRef = useRef(null);
  const [loadStatuses, setLoadStatuses] = useState({});
  const [viewerError, setViewerError] = useState("");
  const previousUrlsRef = useRef(null);
  const pendingLoadsRef = useRef(0);
  const [cameraStatus, setCameraStatus] = useState({ alpha: 0, beta: 0, radius: 0 });
  const [sceneMetrics, setSceneMetrics] = useState({
    meshCount: 0,
    maxDim: 0,
    largest: [],
  });
  const sampleAssemblyActiveRef = useRef(false);
  const onLoadedRef = useRef(onLoaded);
  const previousModelUrlsRef = useRef([]);
  const frameLoadPromiseRef = useRef(Promise.resolve());
  const previousClearedComponentsRef = useRef([]);
  const unitScaleRef = useRef(FIXED_UNIT_SCALE);

  const SAMPLE_CAMERA = { alpha: 7.85, beta: 1.2, radius: 460 };

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const disposeFitOverlay = (scene) => {
    if (!scene) return;
    scene.meshes
      .filter((mesh) => mesh.metadata?.viewerFitOverlay)
      .forEach((mesh) => {
        const material = mesh.material;
        mesh.dispose(false, true);
        material?.dispose?.();
      });
  };

  const applyFitOverlay = (scene, enabled) => {
    if (!scene) return;
    disposeFitOverlay(scene);
    if (!enabled) return;

    const scale = unitScaleRef.current || FIXED_UNIT_SCALE;
    const status = fitOverlayStatusRef.current || {};
    const propellerColor = status.propellerConflict ? "#e95418"
      : status.propellerMeasured ? "#68d8c9"
        : status.propellerKnown ? "#d5ff4f" : "#9aa59f";
    const motorColor = status.motorConflict ? "#e95418"
      : status.motorMeasured ? "#68d8c9"
        : status.motorKnown ? "#d5ff4f" : "#9aa59f";
    const propellerMaterial = createMaterial(
      scene,
      "__fit_overlay_prop_material",
      propellerColor,
      true,
    );
    propellerMaterial.alpha = 0.92;
    propellerMaterial.disableLighting = true;
    propellerMaterial.backFaceCulling = false;
    const sweepMaterial = createMaterial(
      scene,
      "__fit_overlay_sweep_material",
      propellerColor,
      true,
    );
    sweepMaterial.alpha = 0.08;
    sweepMaterial.disableLighting = true;
    sweepMaterial.backFaceCulling = false;

    const sweepDiameter = getPropellerSweepDiameterMm(assemblySpec.propeller || {}) * scale;
    (scene.__propellerRoots || []).forEach((root, index) => {
      const ring = MeshBuilder.CreateTorus(
        `__fit_overlay_prop_${index}`,
        {
          diameter: sweepDiameter,
          thickness: Math.max(sweepDiameter * 0.012, 0.0006),
          tessellation: 72,
        },
        scene,
      );
      ring.parent = root;
      ring.isPickable = false;
      ring.material = propellerMaterial;
      ring.metadata = { viewerFitOverlay: true };

      const sweep = MeshBuilder.CreateDisc(
        `__fit_overlay_sweep_${index}`,
        { radius: sweepDiameter / 2, tessellation: 72 },
        scene,
      );
      sweep.parent = root;
      sweep.rotation.x = Math.PI / 2;
      sweep.position.y = 0.0004;
      sweep.isPickable = false;
      sweep.material = sweepMaterial;
      sweep.metadata = { viewerFitOverlay: true };
    });

    const mountOutline = getMotorMountOutlineMm(assemblySpec.motor || {});
    if (mountOutline) {
      (scene.__motorRoots || []).forEach((root, index) => {
        const outline = MeshBuilder.CreateLines(
          `__fit_overlay_mount_${index}`,
          {
            points: mountOutline.map(
              ([x, y, z]) => new Vector3(x * scale, y * scale, z * scale),
            ),
          },
          scene,
        );
        outline.parent = root;
        outline.color = Color3.FromHexString(motorColor);
        outline.alpha = 0.96;
        outline.isPickable = false;
        outline.metadata = { viewerFitOverlay: true };
      });
    }
  };

  useEffect(() => {
    showFitOverlayRef.current = showFitOverlay;
    fitOverlayStatusRef.current = fitOverlayStatus;
    applyFitOverlay(sceneRef.current, showFitOverlay);
    // Rebuild after selection/toggle changes; the browser renderer owns these meshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFitOverlay, fitOverlayStatus, assemblySpec, resetKey, clearedComponents]);

  const applyExplodedAssembly = (scene, enabled) => {
    if (!scene) return false;
    let changed = false;
    (scene.transformNodes || []).forEach((node) => {
      const componentType = node.metadata?.componentType;
      if (!componentType || !node.position) return;
      if (!Number.isFinite(node.metadata.assembledY)) {
        node.metadata.assembledY = node.position.y;
      }
      const nextY =
        node.metadata.assembledY
        + getExplodedOffsetMm(componentType, enabled) * FIXED_UNIT_SCALE;
      if (Math.abs(node.position.y - nextY) > 1e-7) {
        node.position.y = nextY;
        changed = true;
      }
    });
    return changed;
  };

  useEffect(() => {
    explodedRef.current = exploded;
    const scene = sceneRef.current;
    if (!scene) return;
    const changed = applyExplodedAssembly(scene, exploded);
    if (!changed) return;
    requestAnimationFrame(() => {
      fitCameraToScene(exploded ? 1.8 : 1.5);
    });
    // The helper only mutates the current sketch's transform roots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploded]);

  const isSampleAssemblyUrl = (url) => typeof url === 'string' && url.toLowerCase().includes('sample_assembly');
  const waitForFrameReady = async () => {
    if (!frameLoadPromiseRef.current) return;
    try {
      await frameLoadPromiseRef.current;
    } catch (err) {
      console.warn('[BabylonViewer] Frame load promise rejected:', err);
    }
  };
  const waitForSceneFrame = () => new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
      return;
    }
    setTimeout(resolve, 0);
  });

  /*
  const clearanceToSceneUnits = (clearanceMm) => {
    if (!clearanceMm) return 0;
    const scale = unitScaleRef.current;
    if (Number.isFinite(scale) && scale > 0) {
      return clearanceMm * scale;
    }
    return clearanceMm * 0.001;
  };
  */
  const clearanceToSceneUnits = (clearanceMm) => {
    if (!clearanceMm) return 0;
    const scale = unitScaleRef.current;
    if (Number.isFinite(scale) && scale > 0) {
      return clearanceMm * scale;
    }
    return clearanceMm * FIXED_UNIT_SCALE;
  };

  // Initialize engine + scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!supportsWebGL(canvas)) {
      setViewerError(
        "The 3D preview needs WebGL. Enable hardware acceleration or use a WebGL-capable browser.",
      );
      return;
    }
    setViewerError("");
    let engine;
    try {
      engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    } catch {
      setViewerError(
        "The 3D preview could not start WebGL. Enable hardware acceleration or use a WebGL-capable browser.",
      );
      return;
    }
    const scene = new Scene(engine);
    engineRef.current = engine;
    sceneRef.current = scene;

    // Camera - start very close then auto-fit once models load
    const camera = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 2.4, 2.5, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 0.3;    // Allow reasonably close zoom without clipping
    camera.upperRadiusLimit = 160;   // Allow more room when fitting large models
    camera.wheelPrecision = 80;     // Smooth zoom
    camera.panningSensibility = 75; // Enable panning comfortably
    camera.useNaturalPinchZoom = true;
    camera.minZ = 0.05; // prevent clipping for close radius
    camera.maxZ = 20000;
    cameraRef.current = camera;

    let resumeRotationTimer = null;
    const pauseAutoRotation = () => {
      scene.__userInteracting = true;
      if (resumeRotationTimer) clearTimeout(resumeRotationTimer);
    };
    const resumeAutoRotation = () => {
      if (resumeRotationTimer) clearTimeout(resumeRotationTimer);
      resumeRotationTimer = setTimeout(() => {
        scene.__userInteracting = false;
      }, 1200);
    };
    canvas.addEventListener("pointerdown", pauseAutoRotation);
    canvas.addEventListener("pointerup", resumeAutoRotation);
    canvas.addEventListener("pointercancel", resumeAutoRotation);
    canvas.addEventListener("wheel", pauseAutoRotation, { passive: true });
    canvas.addEventListener("wheel", resumeAutoRotation, { passive: true });

    // Lighting - brighter and more directional for better visibility
    const hemiLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.8;
    const hemiLight2 = new HemisphericLight("hemi2", new Vector3(0, -1, 0.5), scene);
    hemiLight2.intensity = 0.5; // Fill light from below/side

    // Render loop
    engine.runRenderLoop(() => {
      // Orbit the whole model. Rotating each mesh independently tears an
      // assembly apart because every part has a different local origin.
      if (autoRotateRef.current && !scene.__userInteracting) camera.alpha += 0.0014;
      setCameraStatus({ alpha: camera.alpha, beta: camera.beta, radius: camera.radius });
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", pauseAutoRotation);
      canvas.removeEventListener("pointerup", resumeAutoRotation);
      canvas.removeEventListener("pointercancel", resumeAutoRotation);
      canvas.removeEventListener("wheel", pauseAutoRotation);
      canvas.removeEventListener("wheel", resumeAutoRotation);
      if (resumeRotationTimer) clearTimeout(resumeRotationTimer);
      if (normalizeTimerRef.current) {
        clearTimeout(normalizeTimerRef.current);
        normalizeTimerRef.current = null;
      }
      scene.dispose();
      engine.dispose();
    };
    // Scene initialization intentionally runs once. Auto-rotation is read from
    // a ref so toggling inspection modes does not rebuild and reload the scene.
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;
    const view = getCameraView(cameraView);
    camera.alpha = view.alpha;
    camera.beta = view.beta;
    scene.__userInteracting = !view.autoRotate;
  }, [cameraView]);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  // Convert frame corner positions to Vector3 and apply motor mounting point offset
  const computeMotorPositions = (cornerPositions, mountingPoint) => {
    if (!cornerPositions || cornerPositions.length === 0) return [];

    // mountingPoint is the offset from motor origin to its mounting hole
    // We need to subtract this offset so the mounting hole aligns with frame corner
    const offset = new Vector3(-mountingPoint[0], -mountingPoint[1], -mountingPoint[2]);

    return cornerPositions.map(corner => {
      const framePos = new Vector3(corner[0], corner[1], corner[2]);
      return framePos.add(offset);
    });
  };
  // Helper: fit camera to current scene meshes
  const isRenderableMesh = (mesh) => {
    if (!mesh || typeof mesh.getBoundingInfo !== 'function') return false;
    if (!mesh.name) return true;
    const hasMetadata = Boolean(mesh.metadata?.componentType || mesh.metadata?.sourceUrl);
    const isSystemName = mesh.name.startsWith("__");
    if (!isSystemName) return true;
    if (hasMetadata) return true;
    if (mesh.getTotalVertices && mesh.getTotalVertices() > 0) return true;
    return false;
  };

  const fitCameraToScene = (paddingFactor = 1.5) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    const meshes = scene.meshes.filter(m => isRenderableMesh(m) && m.isVisible && m.getBoundingInfo);
    if (!meshes.length) return;

    // 1. Calculate the bounding box of all meshes
    let minVec = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    let maxVec = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

    const meshBounds = [];
    meshes.forEach(m => {
      // Update the mesh world matrix to ensure bounds are accurate
      m.computeWorldMatrix(true);
      const info = m.getBoundingInfo();
      const bmin = info.boundingBox.minimumWorld;
      const bmax = info.boundingBox.maximumWorld;

      minVec.x = Math.min(minVec.x, bmin.x);
      minVec.y = Math.min(minVec.y, bmin.y);
      minVec.z = Math.min(minVec.z, bmin.z);
      maxVec.x = Math.max(maxVec.x, bmax.x);
      maxVec.y = Math.max(maxVec.y, bmax.y);
      maxVec.z = Math.max(maxVec.z, bmax.z);
      meshBounds.push({
        name: m.name || "(unnamed)",
        componentType: m.metadata?.componentType || "",
        maxDim: Math.max(bmax.x - bmin.x, bmax.y - bmin.y, bmax.z - bmin.z),
      });
    });

    const sizeVec = maxVec.subtract(minVec);
    const center = minVec.add(sizeVec.scale(0.5));
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);

    // 2. Center the camera on the object
    camera.target = center;

    // 3. Calculate distance needed to fit object
    // If maxDim is 0.2 (20cm), radius becomes ~0.3
    let desiredRadius = maxDim * paddingFactor;

    // Safety check for "ghost" meshes or empty scenes
    if (desiredRadius < 0.01) desiredRadius = 5;

    camera.radius = desiredRadius;

    // 4. adjust limit dynamically
    // Allow zooming much closer than the object size
    camera.lowerRadiusLimit = desiredRadius * 0.1;
    // Don't allow zooming out to infinity
    camera.upperRadiusLimit = desiredRadius * 10;

    // 5. Fix clipping so it doesn't disappear
    camera.minZ = desiredRadius * 0.01;
    camera.maxZ = desiredRadius * 1000;
    setSceneMetrics({
      meshCount: meshes.length,
      maxDim,
      largest: meshBounds
        .sort((a, b) => b.maxDim - a.maxDim)
        .slice(0, 4),
    });
  };
  const getRootNode = (node) => {
    if (!node) return null;
    let current = node;
    while (current.parent) current = current.parent;
    return current;
  };

  /*
  const shiftSceneBy = (offset) => {
    const scene = sceneRef.current;
    if (!scene || Math.abs(offset) < 1e-3) return;
    const shifted = new Set();
    const shiftNode = (node) => {
      if (!node || shifted.has(node) || !node.position) return;
      node.position.y += offset;
      if (Number.isFinite(node.metadata?.assembledY)) {
        node.metadata.assembledY += offset;
      }
      shifted.add(node);
    };

    scene.meshes.forEach(m => {
      if (!isRenderableMesh(m)) return;
      const root = getRootNode(m);
      shiftNode(root || m);
    });

    (scene.transformNodes || []).forEach(n => {
      if (!n.parent) shiftNode(n);
    });

    scene.__groundShift = (scene.__groundShift || 0) + offset;
  };
  */
  const shiftSceneBy = (offset) => {
    const scene = sceneRef.current;
    if (!scene || Math.abs(offset) < 1e-3) return;
    const shifted = new Set();
    const shiftNode = (node) => {
      if (!node || shifted.has(node) || !node.position) return;
      node.position.y += offset;
      shifted.add(node);
    };

    scene.meshes.forEach(m => {
      if (!isRenderableMesh(m)) return;
      const root = getRootNode(m);
      shiftNode(root || m);
    });

    (scene.transformNodes || []).forEach(n => {
      if (!n.parent) shiftNode(n);
    });

    scene.__groundShift = (scene.__groundShift || 0) + offset;
  };

  // Normalize Y so lowest point sits at ground (y=0) with slight clearance
  /*
  const normalizeSceneY = (clearance = 0) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const meshes = scene.meshes.filter(m => isRenderableMesh(m) && m.isVisible && m.getBoundingInfo);
    if (!meshes.length) return;
    let minY = Number.POSITIVE_INFINITY;
    meshes.forEach(m => {
      const info = m.getBoundingInfo();
      minY = Math.min(minY, info.boundingBox.minimumWorld.y);
    });
    if (minY === Number.POSITIVE_INFINITY) return;
    const offset = -minY + clearance;
    shiftSceneBy(offset);
  };
  */
  const normalizeSceneY = (clearance = 0) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const meshes = scene.meshes.filter(m => isRenderableMesh(m) && m.isVisible && m.getBoundingInfo);
    if (!meshes.length) return;
    let minY = Number.POSITIVE_INFINITY;
    meshes.forEach(m => {
      const info = m.getBoundingInfo();
      minY = Math.min(minY, info.boundingBox.minimumWorld.y);
    });
    if (minY === Number.POSITIVE_INFINITY) return;
    const offset = -minY + clearance;
    shiftSceneBy(offset);
  };

  // Debounce normalization to run after all loads complete
  /*
  const scheduleNormalization = (sessionToken) => {
    if (normalizeTimerRef.current) clearTimeout(normalizeTimerRef.current);
    normalizeTimerRef.current = setTimeout(() => {
      const scene = sceneRef.current;
      if (!scene || scene.__currentLoadSession !== sessionToken) return;
      if (scene.__assemblyInProgress) return;
      const clearanceSceneUnits = clearanceToSceneUnits(groundClearance);
      normalizeSceneY(clearanceSceneUnits);
      fitCameraToScene(); // refit after vertical shift

      if (sampleAssemblyActiveRef.current) {
        const camera = cameraRef.current;
        if (camera) {
          camera.alpha = SAMPLE_CAMERA.alpha;
          camera.beta = SAMPLE_CAMERA.beta;
          camera.radius = SAMPLE_CAMERA.radius;
        }
      }
    }, 120); // small delay to allow subsequent loads/clones
  };
  */
  const scheduleNormalization = (sessionToken) => {
    if (normalizeTimerRef.current) clearTimeout(normalizeTimerRef.current);
    normalizeTimerRef.current = setTimeout(() => {
      const scene = sceneRef.current;
      if (!scene || scene.__currentLoadSession !== sessionToken) return;
      const clearanceSceneUnits = clearanceToSceneUnits(groundClearance);
      normalizeSceneY(clearanceSceneUnits);
      fitCameraToScene(explodedRef.current ? 1.8 : 1.5);

      if (sampleAssemblyActiveRef.current) {
        const camera = cameraRef.current;
        if (camera) {
          camera.alpha = SAMPLE_CAMERA.alpha;
          camera.beta = SAMPLE_CAMERA.beta;
          camera.radius = SAMPLE_CAMERA.radius;
        }
      }
    }, 120);
  };

  // Update background color when it changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const bgColor = Color3.FromHexString(backgroundColor);
    scene.clearColor = bgColor.toColor4(1.0);
  }, [backgroundColor]);

  // Clear components when clearedComponents changes (separate effect to handle toggles)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove meshes and transform nodes for cleared component types
    scene.meshes.forEach(m => {
      const t = m.metadata?.componentType;
      if (t && clearedComponents.includes(t)) {
        m.dispose();
      }
    });
    // Also dispose transform nodes (used for motors, propellers)
    (scene.transformNodes || []).forEach(n => {
      const t = n.metadata?.componentType;
      if (t && clearedComponents.includes(t)) {
        n.dispose();
      }
    });
  }, [clearedComponents]);

  // Load models & layout when dependencies change or reset triggered
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (typeof scene.__groundShift !== 'number') {
      scene.__groundShift = 0;
    }

    if (normalizeTimerRef.current) {
      clearTimeout(normalizeTimerRef.current);
      normalizeTimerRef.current = null;
    }

    const disposeComponentType = (componentType) => {
      if (!componentType) return;
      const meshList = [...scene.meshes];
      meshList.forEach(m => {
        if (!m || m.name.startsWith("__")) return;
        const tagged = m.metadata?.componentType === componentType;
        const byName = m.name.toLowerCase().includes(componentType) || m.name.startsWith(`${componentType}_`);
        if (tagged || byName) {
          m.dispose();
        }
      });
      const nodeList = [...(scene.transformNodes || [])];
      nodeList.forEach(n => {
        if (n.metadata?.componentType === componentType) {
          n.dispose();
        }
      });
    };

    // Each dependency change starts a new load session so late async loads from
    // previous selections can be ignored safely.
    const loadSession = Symbol('loadSession');
    scene.__currentLoadSession = loadSession;
    pendingLoadsRef.current = 0;
    sampleAssemblyActiveRef.current = false;

    // Clear previous non-system meshes only when URLs actually change
    // Track individual component URLs to avoid clearing everything when only positioning changes
    const currentUrls = {
      motorUrl,
      batteryUrl,
      fcUrl,
      escUrl,
      receiverUrl,
      propellerUrl,
      propellerCWUrl,
      propellerCCWUrl,
      frameUrl: modelUrls[0] || null,
      sampleUrl: (!modelUrls.length && modelUrl) ? modelUrl : null
    };

    const previousUrls = previousUrlsRef.current || {};

    // Force dispose if resetKey changed explicitly
    const resetTriggered = resetKey !== (scene.__lastResetKey || 0);
    if (resetTriggered) {
      scene.__lastResetKey = resetKey;
      scene.__groundShift = 0;
    }

    // Only dispose meshes for components whose URLs actually change
    if (resetTriggered) {
      const meshesToDispose = scene.meshes.filter(m => !m.name.startsWith("__"));
      meshesToDispose.forEach(m => m.dispose());
      const nodesToDispose = (scene.transformNodes || []).filter(n => !n.name.startsWith("__"));
      nodesToDispose.forEach(n => n.dispose());
      pendingLoadsRef.current = 0; // drop any stale load bookkeeping on hard reset
      setLoadStatuses({});
    } else {
      // Selective disposal based on which URLs changed
      Object.keys(currentUrls).forEach(key => {
        if (currentUrls[key] !== previousUrls[key]) {
          // Map key to a normalized component type
          const keyToType = {
            motorUrl: 'motor',
            batteryUrl: 'battery',
            fcUrl: 'flight_controller',
            escUrl: 'esc',
            receiverUrl: 'receiver',
            propellerUrl: 'propeller',
            propellerCWUrl: 'propeller',
            propellerCCWUrl: 'propeller',
            frameUrl: 'frame',
            sampleUrl: 'sample'
          };
          const componentType = keyToType[key] || key.replace('Url', '');

          // Dispose meshes tagged with this component type; fallback to name heuristic
          scene.meshes.forEach(m => {
            const tagged = m.metadata?.componentType === componentType;
            const byName = m.name.toLowerCase().includes(componentType) || m.name.startsWith(`${componentType}_`);
            if (!m.name.startsWith("__") && (tagged || byName)) {
              m.dispose();
            }
          });
          // Also dispose transform roots for this component type
          (scene.transformNodes || []).forEach(n => {
            if (n.metadata?.componentType === componentType) {
              n.dispose();
            }
          });
        }
      });
    }

    previousUrlsRef.current = currentUrls;
    setLoadedCount(0);

    const dynamicUrls = [...modelUrls];
    const includeSampleUrl = !dynamicUrls.length && Boolean(modelUrl);

    const dynamicUrlsToLoad = dynamicUrls;

    const activeUrls = new Set([
      ...dynamicUrls,
      motorUrl,
      batteryUrl,
      fcUrl,
      escUrl,
      receiverUrl,
      propellerUrl,
      propellerCWUrl,
      propellerCCWUrl,
      includeSampleUrl ? modelUrl : null
    ].filter(Boolean));
    setLoadStatuses(prev => {
      const next = {};
      Object.entries(prev).forEach(([url, info]) => {
        if (activeUrls.has(url)) next[url] = info;
      });
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });

    const applyGroundShiftToMeshes = (meshList) => {
      const shift = scene.__groundShift || 0;
      if (!shift || !Array.isArray(meshList)) return;
      const adjusted = new Set();
      meshList.forEach(mesh => {
        if (!mesh) return;
        const root = getRootNode(mesh) || mesh;
        if (!root || !root.position || adjusted.has(root)) return;
        root.position.y += shift;
        if (Number.isFinite(root.metadata?.assembledY)) {
          root.metadata.assembledY += shift;
        }
        adjusted.add(root);
      });
    };

    // Remove meshes for cleared component types before any new loads
    if (clearedComponents.length) {
      scene.meshes.forEach(m => {
        const t = m.metadata?.componentType;
        if (t && clearedComponents.includes(t)) {
          m.dispose();
        }
      });
    }

    // If no URLs and all component URLs are null, exit early after ensuring scene cleared
    const hasFallbackAssembly = Boolean(
      assemblySpec.frame ||
      assemblySpec.motor ||
      assemblySpec.propeller ||
      assemblySpec.battery ||
      assemblySpec.esc ||
      assemblySpec.flightController ||
      assemblySpec.receiver
    );
    const noComponentUrls = !motorUrl && !batteryUrl && !fcUrl && !escUrl && !receiverUrl &&
      !propellerUrl && !propellerCWUrl && !propellerCCWUrl &&
      dynamicUrls.length === 0 && !includeSampleUrl && !hasFallbackAssembly;
    if (noComponentUrls) {
      previousModelUrlsRef.current = [];
      scene.__assemblyInProgress = false;
      fitCameraToScene(explodedRef.current ? 1.8 : 1.5);
      return; // nothing to load
    }

    const markStatus = (url, status, info) => {
      if (scene.__currentLoadSession !== loadSession) return;
      setLoadStatuses(prev => ({ ...prev, [url]: { status, info } }));
    };

    const preflight = async (url) => {
      const sceneInstance = sceneRef.current;
      if (!sceneInstance || sceneInstance.isDisposed) return false;
      try {
        const headResp = await fetch(url, { method: 'HEAD' });
        if (!headResp.ok) {
          markStatus(url, 'warn', `HEAD ${headResp.status}; loading anyway`);
          return false;
        }
        markStatus(url, 'pending', 'fetching');
        return true;
      } catch (e) {
        markStatus(url, 'warn', `HEAD failed: ${e.message}; loading anyway`);
        return false;
      }
    };

    // Normalize URL to ensure Babylon.js recognizes it as GLB
    // Replace .step/.stp/.sldprt extensions with .glb in the URL for Babylon.js
    const normalizeModelUrl = (url) => {
      if (!url) return url;
      // Replace file extensions that Babylon.js might misinterpret
      return url.replace(/\.(step|stp|sldprt)(\?|$)/gi, '.glb$2');
    };

    const loadSingle = async (url, cb, componentType) => {
      if (!url) return null;
      const sceneInstance = sceneRef.current;
      if (!sceneInstance || sceneInstance.isDisposed) return null;
      await preflight(url);
      pendingLoadsRef.current += 1;
      const normalizedUrl = normalizeModelUrl(url);

      try {
        if (!sceneInstance || sceneInstance.isDisposed) {
          return null;
        }
        const result = await SceneLoader.ImportMeshAsync(null, "", normalizedUrl, sceneInstance);
        if (scene.__currentLoadSession !== loadSession) {
          result.meshes.forEach(m => {
            if (!m.name.startsWith("__")) m.dispose();
          });
          return null;
        }

        const newMeshes = result.meshes.filter(m => !m.name.startsWith("__"));
        applyGroundShiftToMeshes(newMeshes);
        const isSample = isSampleAssemblyUrl(url);

        newMeshes.forEach(m => {
          const baseMetadata = m.metadata || {};
          const resolvedType = componentType || (isSample ? 'sample' : undefined);
          m.metadata = { ...baseMetadata, autoSpin: true, sourceUrl: url };
          if (resolvedType) m.metadata.componentType = resolvedType;
        });

        setLoadedCount(prev => {
          const next = prev + 1;
          const callback = onLoadedRef.current;
          if (callback) callback(next);
          return next;
        });

        if (newMeshes.length === 0) {
          markStatus(url, 'error', 'No meshes loaded');
        } else {
          markStatus(url, 'success', `${newMeshes.length} mesh(es)`);
          if (isSample) {
            sampleAssemblyActiveRef.current = true;
          }
          scheduleNormalization(loadSession);
        }

        if (cb) await cb(newMeshes);
        return newMeshes;
      } catch (e) {
        console.error("Failed to load model:", normalizedUrl, "(original:", url, ")", e);
        if (scene.__currentLoadSession === loadSession) {
          markStatus(url, 'error', (e && e.message) || 'Load failed');
        }
        return null;
      } finally {
        if (scene.__currentLoadSession === loadSession) {
          pendingLoadsRef.current -= 1;
          if (pendingLoadsRef.current === 0) {
            scheduleNormalization(loadSession);
          }
        }
      }
    };

    const shouldAssemble = Boolean(assemblySpec?.frame);
    if (shouldAssemble) {
      scene.__assemblyInProgress = true;
      ["frame", "motor", "propeller", "battery", "esc", "flight_controller", "receiver"]
        .forEach(disposeComponentType);
    }

    // Load non-motor components first (centered) - skip if in clearedComponents
    const frameUrlToLoad = dynamicUrlsToLoad.find(url => url === currentUrls.frameUrl && url);
    const handleFrameLoaded = async (loadedMeshes) => {
      if (frameCornerPositions.length === 0) return;
      unitScaleRef.current = FIXED_UNIT_SCALE;
      const normalizedRoot = createNormalizedInstance({
        scene,
        sourceMeshes: loadedMeshes || [],
        componentType: "frame",
        prefix: "frame",
        index: 0,
        position: Vector3.Zero(),
        targetDimensionsMm: assemblySpec.frame?.dimensionsMm,
      });
      if (normalizedRoot) {
        scene.__frameRoot = normalizedRoot;
        loadedMeshes.forEach((mesh) => mesh.dispose());
      }
    };
    if (frameUrlToLoad && !clearedComponents.includes('frame')) {
      frameLoadPromiseRef.current = loadSingle(frameUrlToLoad, handleFrameLoaded, 'frame').then((meshes) => {
        if ((!meshes || meshes.length === 0) && assemblySpec.frame) {
          createFrameFallback(scene, assemblySpec.frame);
        }
        return meshes;
      });
    } else if (assemblySpec.frame && !clearedComponents.includes('frame')) {
      disposeComponentType('frame');
      createFrameFallback(scene, assemblySpec.frame);
      unitScaleRef.current = FIXED_UNIT_SCALE;
      frameLoadPromiseRef.current = Promise.resolve();
    } else {
      frameLoadPromiseRef.current = Promise.resolve();
    }

    dynamicUrlsToLoad.forEach(url => {
      if (url === frameUrlToLoad) return;
      const compType = isSampleAssemblyUrl(url) ? 'sample' : (url === currentUrls.frameUrl ? 'frame' : undefined);
      if (!compType || !clearedComponents.includes(compType)) {
        loadSingle(url, null, compType);
      }
    });

    previousModelUrlsRef.current = dynamicUrls;

    const frameSpec = assemblySpec.frame || {};
    const motorSpec = assemblySpec.motor || {};
    const propellerSpec = assemblySpec.propeller || {};
    const batterySpec = assemblySpec.battery || {};
    const escSpec = assemblySpec.esc || {};
    const flightControllerSpec = assemblySpec.flightController || {};
    const receiverSpec = assemblySpec.receiver || {};
    const unitScale = unitScaleRef.current || FIXED_UNIT_SCALE;

    const loadStackComponents = async () => {
      const stackDefinitions = [
        { url: escUrl, fallbackSpec: escSpec, type: "esc", key: "esc" },
        { url: fcUrl, fallbackSpec: flightControllerSpec, type: "flight_controller", key: "flightController" },
        { url: receiverUrl, fallbackSpec: receiverSpec, type: "receiver", key: "receiver" },
      ];
      const levels = getStackLevelsMm(frameSpec, {
        esc: escSpec,
        flightController: flightControllerSpec,
        receiver: receiverSpec,
      });
      const active = stackDefinitions.filter((entry) =>
        !clearedComponents.includes(entry.type) && (entry.url || entry.fallbackSpec?.id)
      );
      active.forEach((entry) => disposeComponentType(entry.type));

      const frameRoot = scene.__frameRoot
        || (scene.transformNodes || []).find((node) => node.name === "frame_fallback_root");
      const frameBounds = frameRoot ? getGroupBounds(frameRoot.getChildMeshes()) : null;
      let nextLevelY = frameBounds?.max.y ?? levels.esc * unitScale;
      nextLevelY += 1 * unitScale;

      for (const entry of active) {
        const mount = entry.key === "esc" ? escMountingPoint : entry.key === "flightController" ? fcMountingPoint : receiverMountingPoint;
        const placement = new Vector3(-mount[0] * unitScale, nextLevelY, -mount[2] * unitScale);
        let root = null;
        if (entry.url) {
          const meshes = await loadSingle(entry.url, null, entry.type);
          if (meshes?.length) {
            root = createNormalizedInstance({
              scene,
              sourceMeshes: meshes,
              componentType: entry.type,
              prefix: entry.key,
              index: 0,
              position: placement,
              targetDimensionsMm: entry.fallbackSpec?.dimensionsMm,
            });
            meshes.forEach((mesh) => mesh.dispose());
          }
        } else if (entry.fallbackSpec?.id) {
          root = createBoardFallback(scene, entry.type, entry.fallbackSpec, nextLevelY, entry.key);
        }
        await waitForSceneFrame();
        const fallbackHeight = getFallbackDimensionsMm(entry.type, entry.fallbackSpec)[1] * unitScale;
        const measuredTop = getVisibleTopY(root, nextLevelY + fallbackHeight);
        nextLevelY = (Number.isFinite(measuredTop) ? measuredTop : nextLevelY + fallbackHeight) + (3.5 * unitScale);
      }
      scene.__stackTopY = Number.isFinite(nextLevelY) ? nextLevelY : frameBounds?.max.y || 0;
    };
    const loadBattery = async () => {
      if (clearedComponents.includes("battery") || (!batteryUrl && !batterySpec?.id)) return;
      disposeComponentType("battery");
      const batteryPlacement = getBatteryPlacementMm(frameSpec, batterySpec, {
        esc: escSpec,
        flightController: flightControllerSpec,
        receiver: receiverSpec,
      });
      const batteryOrigin = toSceneVectorMm(batteryPlacement.origin);
      await waitForSceneFrame();
      const stackMeshes = scene.meshes.filter((mesh) =>
        ["esc", "flight_controller", "receiver"].includes(mesh.metadata?.componentType)
      );
      const stackBounds = getGroupBounds(stackMeshes);
      const supportTop = stackBounds?.max.y ?? scene.__stackTopY ?? 0;
      const supportY = Number.isFinite(supportTop) ? supportTop : 0;
      batteryOrigin[1] = supportY + (1 * unitScale);
      if (batteryUrl) {
        const meshes = await loadSingle(batteryUrl, null, "battery");
        if (meshes?.length) {
          createNormalizedInstance({
            scene,
            sourceMeshes: meshes,
            componentType: "battery",
            prefix: "battery",
            index: 0,
            position: batteryOrigin,
            targetDimensionsMm: batterySpec?.dimensionsMm,
          });
          meshes.forEach((mesh) => mesh.dispose());
        }
      } else {
        createBatteryFallback(scene, batterySpec, {
          ...batteryPlacement,
          origin: [
            batteryOrigin[0] / unitScale,
            batteryOrigin[1] / unitScale,
            batteryOrigin[2] / unitScale,
          ],
        });
      }
    };

    const buildMotors = async () => {
      if (clearedComponents.includes("motor")) return;
      const canBuildFallback = Boolean(motorSpec?.id);
      if (!motorUrl && !canBuildFallback) return;
      await waitForFrameReady();

      const motorOriginsMm = frameSpec?.size || assemblySpec.frame
        ? getMotorOriginsMm(frameSpec, motorSpec)
        : computeMotorPositions(frameCornerPositions, motorMountingPoint).map((p) => [p.x, p.y, p.z]);
      if (motorOriginsMm.length === 0) return;
      disposeComponentType("motor");

      const positions = motorOriginsMm.map((origin) =>
        toSceneVectorMm(origin).reduce((vector, value, index) => {
          if (index === 0) vector.x = value;
          if (index === 1) vector.y = value;
          if (index === 2) vector.z = value;
          return vector;
        }, new Vector3())
      );

      const motorRoots = [];
      if (motorUrl) {
        const meshes = await loadSingle(motorUrl, null, "motor");
        const usable = (meshes || []).filter((mesh) => !mesh.name.startsWith("__"));
        if (usable.length) {
          positions.forEach((position, index) => {
            const root = createNormalizedInstance({
              scene,
              sourceMeshes: usable,
              componentType: "motor",
              prefix: "motor",
              index,
              position,
              targetDimensionsMm: motorSpec?.dimensionsMm,
            });
            if (root) motorRoots.push(root);
          });
          usable.forEach((mesh) => mesh.dispose());
        }
      } else {
        positions.forEach((position, index) => {
          const root = createMotorFallback(scene, motorSpec, position, index);
          if (root) motorRoots.push(root);
        });
      }
      scene.__motorRoots = motorRoots.sort((a, b) => a.name.localeCompare(b.name));
      scene.__motorReady = true;
    };

    const buildPropellers = async (motorAssemblyPromise) => {
      if (clearedComponents.includes("propeller")) return;
      if (!propellerUrl && !propellerCWUrl && !propellerCCWUrl && !propellerSpec?.id) return;
      await motorAssemblyPromise;
      disposeComponentType("propeller");

      const originValues = getPropellerOriginsMm(
        frameSpec,
        motorSpec,
        propellerSpec,
        propellerDirection,
      );
      const sources = {};
      if (propellerCWUrl) sources.CW = (await loadSingle(propellerCWUrl, null, "propeller"))?.filter((mesh) => !mesh.name.startsWith("__")) || [];
      if (propellerCCWUrl) sources.CCW = (await loadSingle(propellerCCWUrl, null, "propeller"))?.filter((mesh) => !mesh.name.startsWith("__")) || [];
      if (!sources.CW?.length && !sources.CCW?.length && propellerUrl) {
        sources.CCW = (await loadSingle(propellerUrl, null, "propeller"))?.filter((mesh) => !mesh.name.startsWith("__")) || [];
      }

      const motorRoots = (scene.__motorRoots || []).sort((a, b) => a.name.localeCompare(b.name));
      await waitForSceneFrame();
      const propellerHeightMm = getFallbackDimensionsMm("propeller", propellerSpec)[1];
      const mountedRoots = [];
      originValues.forEach((origin, index) => {
        const variant = getPropellerVariant(index, propellerDirection);
        const meshes = sources[variant]?.length ? sources[variant] : sources[variant === "CW" ? "CCW" : "CW"] || [];
        const motorRoot = motorRoots[index];
        const motorTopY = getVisibleTopY(
          motorRoot,
          (origin[1] + propellerHeightMm) * unitScale,
        );
        const clearance = 0.65 * unitScale;
        const position = motorRoot
          ? new Vector3(motorRoot.position.x, motorTopY + clearance, motorRoot.position.z)
          : new Vector3(origin[0] * unitScale, origin[1] * unitScale, origin[2] * unitScale);
        if (meshes.length) {
          const root = createNormalizedInstance({
            scene,
            sourceMeshes: meshes,
            componentType: "propeller",
            prefix: "prop",
            index,
            position,
            variant,
            targetDimensionsMm: propellerSpec?.dimensionsMm,
          });
          if (root) mountedRoots.push(root);
        } else {
          const root = createPropellerFallback(
            scene,
            propellerSpec || {},
            position,
            index,
            propellerDirection,
          );
          if (root) mountedRoots.push(root);
        }
      });
      scene.__propellerRoots = mountedRoots.sort((a, b) => a.name.localeCompare(b.name));
      [...(sources.CW || []), ...(sources.CCW || [])].forEach((mesh) => mesh.dispose());
    };

    const assembleComponents = async () => {
      try {
        await waitForFrameReady();
        await loadStackComponents();
        const motorAssemblyPromise = buildMotors();
        await buildPropellers(motorAssemblyPromise);
        await loadBattery();
        applyExplodedAssembly(scene, explodedRef.current);
        applyFitOverlay(scene, showFitOverlayRef.current);
      } finally {
        if (scene.__currentLoadSession === loadSession) {
          scene.__assemblyInProgress = false;
          scheduleNormalization(loadSession);
        }
      }
    };
    assembleComponents();

    if (includeSampleUrl && !clearedComponents.includes('sample')) {
      loadSingle(modelUrl, null, 'sample');
    }

    previousClearedComponentsRef.current = clearedComponents;
    // Assembly helpers are local to this effect and intentionally stable for its lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, modelUrls, frameCornerPositions, motorUrl, motorMountingPoint, batteryUrl, batteryMountingPoint, fcUrl, fcMountingPoint, escUrl, escMountingPoint, receiverUrl, receiverMountingPoint, propellerUrl, propellerCWUrl, propellerCCWUrl, propellerDirection, propellerMountingPoint, assemblySpec, groundClearance, resetKey, clearedComponents]);

  return (
    <div
      style={{
        width: "100%",
        height: "clamp(320px, 52vh, 620px)",
        border: "1px solid #222",
        borderRadius: 8,
        overflow: "hidden",
        background: "#111",
        position: "relative",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {viewerError && (
        <div className="viewer-webgl-fallback" role="alert">
          <strong>3D preview unavailable</strong>
          <span>{viewerError}</span>
        </div>
      )}
      {debug && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', padding: '6px 8px', fontSize: 11, color: '#eee', maxWidth: 260, overflowY: 'auto', maxHeight: 180 }}>
          <div style={{ fontWeight: '600', marginBottom: 4 }}>Model Load Status</div>
          {Object.keys(loadStatuses).length === 0 && <div>Waiting...</div>}
          {Object.entries(loadStatuses).map(([url, info]) => (
            <div key={url} style={{ marginBottom: 4 }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</div>
              <div style={{ color: info.status === 'success' ? '#4caf50' : info.status === 'error' ? '#f44336' : '#ffb300' }}>
                {info.status}: {info.info}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
            <div>Camera α: {cameraStatus.alpha.toFixed(2)}</div>
            <div>Camera β: {cameraStatus.beta.toFixed(2)}</div>
            <div>Radius: {cameraStatus.radius.toFixed(2)}</div>
            <div>Meshes: {sceneMetrics.meshCount} · Max: {sceneMetrics.maxDim.toFixed(3)}</div>
            {sceneMetrics.largest.map((mesh) => (
              <div key={`${mesh.name}-${mesh.maxDim}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mesh.componentType || "mesh"} · {mesh.maxDim.toFixed(3)} · {mesh.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BabylonViewer;
