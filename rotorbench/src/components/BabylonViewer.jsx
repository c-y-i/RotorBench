import React, { useEffect, useRef, useState } from "react";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, SceneLoader, TransformNode, Color3 } from "@babylonjs/core";
import "@babylonjs/loaders"; // glTF/GLB loaders

const FIXED_UNIT_SCALE = 0.001; // 1 mm -> 0.001 Babylon units (meters)

/**
 * BabylonViewer component
 * Props:
 *  - modelUrl: string (single model to load)
 *  - modelUrls: string[] (multiple models to load)
 *  - autoRotate: boolean (auto spin models)
 *  - onLoaded: (count: number) => void callback after models loaded
 *  - frameCornerPositions: array of 4 Vector3-like objects [{x,y,z},...] for motor placement
 *  - motorUrl: string (source model for a single motor; cloned to 4 corners)
 *  - motorMountingPoint: [x,y,z] offset from motor model origin to mounting point
 *  - batteryUrl, fcUrl, escUrl, receiverUrl: optional individual component URLs (center stacked)
 *  - propellerUrl + propellerMountingPoint: optional prop mesh + offset for proper alignment
 */
const BabylonViewer = ({
  modelUrl,
  modelUrls = [],
  autoRotate = true,
  onLoaded,
  frameCornerPositions = [], // array of 4 corner positions from frame data
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
  propellerMountingPoint = [0, 0, 0], // offset from prop origin to mounting plane
  groundClearance = 2, // millimeters to lift lowest point above ground
  resetKey = 0,
  debug = false,
  clearedComponents = [], // array of component type strings to remove (e.g. ['frame','motor'])
  backgroundColor = "#2d2d44" // hex color for scene background
}) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const cameraRef = useRef(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const normalizeTimerRef = useRef(null);
  const [loadStatuses, setLoadStatuses] = useState({});
  const previousUrlsRef = useRef(null);
  const pendingLoadsRef = useRef(0);
  const [cameraStatus, setCameraStatus] = useState({ alpha: 0, beta: 0, radius: 0 });
  const sampleAssemblyActiveRef = useRef(false);
  const onLoadedRef = useRef(onLoaded);
  const previousModelUrlsRef = useRef([]);
  const frameLoadPromiseRef = useRef(Promise.resolve());
  const previousClearedComponentsRef = useRef([]);
  const unitScaleRef = useRef(FIXED_UNIT_SCALE);

  const SAMPLE_CAMERA = { alpha: 7.85, beta: 1.2, radius: 460 };

  const isSampleAssemblyUrl = (url) => typeof url === 'string' && url.toLowerCase().includes('sample_assembly');
  const waitForFrameReady = async () => {
    if (!frameLoadPromiseRef.current) return;
    try {
      await frameLoadPromiseRef.current;
    } catch (err) {
      console.warn('[BabylonViewer] Frame load promise rejected:', err);
    }
  };

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

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    // Set background color
    const bgColor = Color3.FromHexString(backgroundColor);
    scene.clearColor = bgColor.toColor4(1.0);
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

    // Lighting - brighter and more directional for better visibility
    const hemiLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.8;
    const hemiLight2 = new HemisphericLight("hemi2", new Vector3(0, -1, 0.5), scene);
    hemiLight2.intensity = 0.5; // Fill light from below/side

    // Render loop
    engine.runRenderLoop(() => {
      if (autoRotate && scene.meshes) {
        scene.meshes.forEach(m => { if (m.metadata?.autoSpin) m.rotation.y += 0.002; });
      }
      setCameraStatus({ alpha: camera.alpha, beta: camera.beta, radius: camera.radius });
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (normalizeTimerRef.current) {
        clearTimeout(normalizeTimerRef.current);
        normalizeTimerRef.current = null;
      }
      scene.dispose();
      engine.dispose();
    };
  }, [autoRotate]);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  // Convert frame corner positions to Vector3 and apply motor mounting point offset
  const computeMotorPositions = (cornerPositions, mountingPoint) => {
    if (!cornerPositions || cornerPositions.length !== 4) return [];

    // mountingPoint is the offset from motor origin to its mounting hole
    // We need to subtract this offset so the mounting hole aligns with frame corner
    const offset = new Vector3(-mountingPoint[0], -mountingPoint[1], -mountingPoint[2]);

    return cornerPositions.map(corner => {
      const framePos = new Vector3(corner[0], corner[1], corner[2]);
      return framePos.add(offset);
    });
  };
  const getMountOffsetVector = (mountingPoint, unitScale) => {
    if (!Array.isArray(mountingPoint) || mountingPoint.length !== 3) return Vector3.Zero();
    return new Vector3(
      -mountingPoint[0] * unitScale,
      -mountingPoint[1] * unitScale,
      -mountingPoint[2] * unitScale
    );
  };
  const setMeshesRootPosition = (meshes, positionVec) => {
    const applied = new Set();
    meshes.forEach(mesh => {
      if (!mesh || mesh.name.startsWith("__")) return;
      const root = getRootNode(mesh);
      const target = root && !root.name.startsWith("__") ? root : mesh;
      if (applied.has(target)) return;
      if (!target.position) target.position = Vector3.Zero();
      target.position.x = positionVec.x;
      target.position.y = positionVec.y;
      target.position.z = positionVec.z;
      applied.add(target);
    });
  };
  const getMeshesTopWorldY = (meshes) => {
    let maxY = Number.NEGATIVE_INFINITY;
    meshes.forEach(mesh => {
      if (!mesh || typeof mesh.getBoundingInfo !== 'function') return;
      mesh.computeWorldMatrix(true);
      const info = mesh.getBoundingInfo();
      if (!info) return;
      const current = info.boundingBox.maximumWorld.y;
      if (Number.isFinite(current)) {
        maxY = Math.max(maxY, current);
      }
    });
    return maxY === Number.NEGATIVE_INFINITY ? null : maxY;
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
      fitCameraToScene();

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
        console.log(`[BabylonViewer] Clearing component: ${t} (mesh: ${m.name})`);
        m.dispose();
      }
    });
    // Also dispose transform nodes (used for motors, propellers)
    (scene.transformNodes || []).forEach(n => {
      const t = n.metadata?.componentType;
      if (t && clearedComponents.includes(t)) {
        console.log(`[BabylonViewer] Clearing component: ${t} (transform: ${n.name})`);
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
          console.log(`[BabylonViewer] URL changed for ${key}: ${previousUrls[key]} -> ${currentUrls[key]}`);
          // Map key to a normalized component type
          const keyToType = {
            motorUrl: 'motor',
            batteryUrl: 'battery',
            fcUrl: 'flight_controller',
            escUrl: 'esc',
            receiverUrl: 'receiver',
            propellerUrl: 'propeller',
            frameUrl: 'frame',
            sampleUrl: 'sample'
          };
          const componentType = keyToType[key] || key.replace('Url', '');

          // Dispose meshes tagged with this component type; fallback to name heuristic
          scene.meshes.forEach(m => {
            const tagged = m.metadata?.componentType === componentType;
            const byName = m.name.toLowerCase().includes(componentType) || m.name.startsWith(`${componentType}_`);
            if (!m.name.startsWith("__") && (tagged || byName)) {
              console.log(`[BabylonViewer] Disposing ${m.name} due to ${key} change`);
              m.dispose();
            }
          });
          // Also dispose transform roots for this component type
          (scene.transformNodes || []).forEach(n => {
            if (n.metadata?.componentType === componentType) {
              console.log(`[BabylonViewer] Disposing transform root ${n.name} for ${componentType}`);
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
    const previousModelUrls = previousModelUrlsRef.current;
    const previousModelUrlSet = new Set(previousModelUrls);
    const previousCleared = previousClearedComponentsRef.current || [];

    // Check if frame or sample was unhidden
    const frameUnhidden = previousCleared.includes('frame') && !clearedComponents.includes('frame');
    const sampleUnhidden = previousCleared.includes('sample') && !clearedComponents.includes('sample');

    const dynamicUrlsToLoad = resetTriggered
      ? dynamicUrls
      : dynamicUrls.filter(url => {
        // If URL is new, load it
        if (!previousModelUrlSet.has(url)) return true;
        // If it's the frame URL and frame was just unhidden, reload it
        if (frameUnhidden && url === currentUrls.frameUrl) return true;
        // If it's sample and sample was unhidden
        if (sampleUnhidden && (url === currentUrls.sampleUrl || isSampleAssemblyUrl(url))) return true;
        return false;
      });

    const activeUrls = new Set([
      ...dynamicUrls,
      motorUrl,
      batteryUrl,
      fcUrl,
      escUrl,
      receiverUrl,
      propellerUrl,
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
    const noComponentUrls = !motorUrl && !batteryUrl && !fcUrl && !escUrl && !receiverUrl && !propellerUrl && dynamicUrls.length === 0 && !includeSampleUrl;
    if (noComponentUrls) {
      previousModelUrlsRef.current = [];
      fitCameraToScene(); // optional small camera reset
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

    // Load non-motor components first (centered) - skip if in clearedComponents
    const frameUrlToLoad = dynamicUrlsToLoad.find(url => url === currentUrls.frameUrl && url);
    const handleFrameLoaded = async () => {
      if (frameCornerPositions.length !== 4) return;
      unitScaleRef.current = FIXED_UNIT_SCALE;
    };
    if (frameUrlToLoad && !clearedComponents.includes('frame')) {
      frameLoadPromiseRef.current = loadSingle(frameUrlToLoad, handleFrameLoaded, 'frame');
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

    // Dynamic vertical stacking: compress gaps when some components missing
    // Stack FC, ESC, and receiver in center (battery is mounted on bottom plate separately)
    const stackSpacing = 3; // mm spacing between stacked components
    const stackEntries = [
      { url: fcUrl, type: 'flight_controller', mountingPoint: fcMountingPoint },
      { url: escUrl, type: 'esc', mountingPoint: escMountingPoint },
      { url: receiverUrl, type: 'receiver', mountingPoint: receiverMountingPoint }
    ];
    const loadStackComponents = async () => {
      const sceneInstance = sceneRef.current;
      if (!sceneInstance || sceneInstance.isDisposed) return;
      const unitScale = unitScaleRef.current || FIXED_UNIT_SCALE;
      const spacingSceneUnits = stackSpacing * unitScale;

      const activeEntries = stackEntries.filter(entry => entry.url && !clearedComponents.includes(entry.type));
      if (!activeEntries.length) {
        sceneInstance.__stackBaseType = null;
        return;
      }

      const currentBaseType = sceneInstance.__stackBaseType;
      if (!currentBaseType || !activeEntries.some(entry => entry.type === currentBaseType)) {
        sceneInstance.__stackBaseType = activeEntries[0].type;
      }

      const orderedEntries = [
        ...activeEntries.filter(entry => entry.type === sceneInstance.__stackBaseType),
        ...activeEntries.filter(entry => entry.type !== sceneInstance.__stackBaseType)
      ];

      // Remove old stack components so we can rebuild cleanly
      orderedEntries.forEach(entry => disposeComponentType(entry.type));

      let stackTopY = null;
      let basePosition = null;

      for (const entry of orderedEntries) {
        await loadSingle(entry.url, (meshes) => {
          const shift = sceneInstance.__groundShift || 0;
          const mountVec = getMountOffsetVector(entry.mountingPoint, unitScale);
          const isBase = entry.type === sceneInstance.__stackBaseType;
          const placementY = isBase
            ? shift + mountVec.y
            : ((stackTopY ?? (basePosition ? basePosition.y : shift)) + spacingSceneUnits);
          const placement = new Vector3(
            isBase ? mountVec.x : (basePosition ? basePosition.x : 0),
            placementY,
            isBase ? mountVec.z : (basePosition ? basePosition.z : 0)
          );
          setMeshesRootPosition(meshes, placement);
          const topY = getMeshesTopWorldY(meshes);
          stackTopY = Number.isFinite(topY) ? topY : placementY;
          if (isBase) {
            basePosition = placement.clone();
          }
        }, entry.type);
      }
    };
    loadStackComponents();

    // Battery is mounted on bottom plate of frame, not stacked in center
    if (batteryUrl && !clearedComponents.includes('battery')) {
      loadSingle(batteryUrl, (meshes) => {
        const unitScale = unitScaleRef.current || FIXED_UNIT_SCALE;
        const batteryDropScene = -10 * unitScale;
        const batteryOffsetVec = getMountOffsetVector(batteryMountingPoint, unitScale);
        const shift = scene.__groundShift || 0;
        const placement = new Vector3(
          batteryOffsetVec.x,
          batteryDropScene + shift + batteryOffsetVec.y,
          batteryOffsetVec.z
        );
        setMeshesRootPosition(meshes, placement);
      }, 'battery');
    }

    // Load motors at frame corner positions with mounting point alignment
    const motorPositions = computeMotorPositions(frameCornerPositions, motorMountingPoint);
    console.log('[BabylonViewer] Motor positions computed:', motorPositions.map(p => `(${p.x}, ${p.y}, ${p.z})`));
    console.log('[BabylonViewer] Frame corners:', frameCornerPositions);
    console.log('[BabylonViewer] Mounting point:', motorMountingPoint);
    console.log('[BabylonViewer] motorUrl:', motorUrl);
    console.log('[BabylonViewer] Will load motors?', motorUrl && motorPositions.length === 4 && !clearedComponents.includes('motor'));
    if (motorUrl && motorPositions.length === 4 && !clearedComponents.includes('motor')) {
      disposeComponentType('motor');
      loadSingle(motorUrl, async (loadedMeshes) => {
        await waitForFrameReady();
        const meshesToUse = loadedMeshes.filter(m => !m.name.startsWith("__"));
        console.log('[BabylonViewer] Motor meshes loaded:', meshesToUse.length);
        if (meshesToUse.length === 0) return;

        // Determine unit scale between mm (corner data) and scene units (GLB)
        const unitScale = unitScaleRef.current || FIXED_UNIT_SCALE;
        const scaledPositions = motorPositions.map(p => p.scale(unitScale));

        // Create a TransformNode per motor instance and parent all meshes to it
        const createMotorInstance = (idx, position) => {
          const root = new TransformNode(`motor_${idx}_root`, scene);
          root.position = position.clone();
          const shift = scene.__groundShift || 0;
          if (shift) {
            root.position.y += shift;
          }
          root.metadata = { componentType: 'motor' };

          meshesToUse.forEach((mesh) => {
            const inst = idx === 0 ? mesh : mesh.clone(`motor_${idx}_${mesh.name}`);
            if (!inst) {
              console.error(`[BabylonViewer] Failed to instantiate motor ${idx} from ${mesh.name}`);
              return;
            }
            inst.parent = root;
            inst.metadata = { ...(inst.metadata || {}), componentType: 'motor' };
            if (idx > 0) {
              console.log(`[BabylonViewer] Cloned motor ${idx} mesh: ${inst.name}`);
            }
          });

          return root;
        };

        // First instance uses original meshes
        const firstRoot = createMotorInstance(0, scaledPositions[0]);
        console.log('[BabylonViewer] Positioned first motor at:', firstRoot.position);

        // Remaining instances clone meshes under separate roots
        for (let i = 1; i < scaledPositions.length; i++) {
          createMotorInstance(i, scaledPositions[i]);
        }

        setTimeout(() => {
          const allMotorRoots = (scene.transformNodes || []).filter(n => n.name.includes('motor_') && n.metadata?.componentType === 'motor');
          console.log(`[BabylonViewer] Total motor roots in scene: ${allMotorRoots.length}`);
          allMotorRoots.forEach(n => {
            console.log(`  - ${n.name} at (${n.position.x.toFixed(2)}, ${n.position.y.toFixed(2)}, ${n.position.z.toFixed(2)})`);
          });
        }, 400);
      }, 'motor');
    }

    // Load propellers: clone to four corners, positioned above motors (or frame corners if motors absent)
    if (propellerUrl && frameCornerPositions.length === 4 && !clearedComponents.includes('propeller')) {
      disposeComponentType('propeller');
      loadSingle(propellerUrl, async (loadedMeshes) => {
        await waitForFrameReady();
        const meshesToUse = loadedMeshes.filter(m => !m.name.startsWith("__"));
        if (meshesToUse.length === 0) return;

        // Infer unit scale and compute base positions
        const unitScale = unitScaleRef.current || FIXED_UNIT_SCALE;
        const motorRoots = (scene.transformNodes || []).filter(n => n.metadata?.componentType === 'motor')
          .sort((a, b) => a.name.localeCompare(b.name));

        const propLiftMm = 6; // ~6mm above motor origin as a safe default
        const lift = unitScale * propLiftMm;

        const propOffsetMm = new Vector3(-propellerMountingPoint[0], -propellerMountingPoint[1], -propellerMountingPoint[2]);
        const propOffsetScene = propOffsetMm.scale(unitScale);
        let basePositions;
        if (motorRoots.length >= 4) {
          basePositions = motorRoots.slice(0, 4).map(r => new Vector3(r.position.x, r.position.y, r.position.z));
        } else {
          // Fallback to frame corners (scaled) if motors not present
          basePositions = frameCornerPositions.map(c => new Vector3(c[0] * unitScale, c[1] * unitScale, c[2] * unitScale));
        }

        const propPositions = basePositions.map(pos => {
          const adjusted = pos.clone().add(propOffsetScene);
          adjusted.y += lift;
          return adjusted;
        });

        const createPropInstance = (idx, position) => {
          const root = new TransformNode(`prop_${idx}_root`, scene);
          root.position = position.clone();
          const shift = scene.__groundShift || 0;
          if (shift) {
            root.position.y += shift;
          }
          root.metadata = { componentType: 'propeller' };
          meshesToUse.forEach((mesh) => {
            const inst = idx === 0 ? mesh : mesh.clone(`prop_${idx}_${mesh.name}`);
            if (!inst) return;
            inst.parent = root;
            inst.metadata = { ...(inst.metadata || {}), componentType: 'propeller' };
          });
          return root;
        };

        const firstRoot = createPropInstance(0, propPositions[0]);
        for (let i = 1; i < 4; i++) {
          createPropInstance(i, propPositions[i]);
        }
      }, 'propeller');
    }

    if (includeSampleUrl && !clearedComponents.includes('sample')) {
      loadSingle(modelUrl, null, 'sample');
    }

    previousClearedComponentsRef.current = clearedComponents;
  }, [modelUrl, modelUrls, frameCornerPositions, motorUrl, motorMountingPoint, batteryUrl, batteryMountingPoint, fcUrl, fcMountingPoint, escUrl, escMountingPoint, receiverUrl, receiverMountingPoint, propellerUrl, propellerMountingPoint, groundClearance, resetKey, clearedComponents]);

  return (
    <div style={{ width: "100%", height: "400px", border: "1px solid #222", borderRadius: 8, overflow: "hidden", background: "#111", position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
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
          </div>
        </div>
      )}
    </div>
  );
};

export default BabylonViewer;
