import React, { useEffect, useRef } from "react";
import {
    Engine,
    Scene,
    ArcRotateCamera,
    Vector3,
    HemisphericLight,
    SceneLoader,
    TransformNode
} from "@babylonjs/core";
import "@babylonjs/loaders";

const TwoDViewer = ({ modelUrl }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        const scene = new Scene(engine);

        // Detect if this is a preset (sample_assembly) or custom build
        const isPreset = modelUrl && typeof modelUrl === 'string' && modelUrl.toLowerCase().includes('sample_assembly');

        const radius = 360;
        let camera;
        
        if (isPreset) {
            // PRESET: Top-down camera view
            // In ArcRotateCamera: alpha = horizontal rotation, beta = vertical angle (0 = top-down)
            camera = new ArcRotateCamera("cam2D", 0, 0, radius, Vector3.Zero(), scene);
            camera.lowerBetaLimit = 0;
            camera.upperBetaLimit = 0;
            camera.beta = 0; // Lock to top-down view
            camera.lowerAlphaLimit = -Infinity;
            camera.upperAlphaLimit = Infinity;
        } else {
            // CUSTOM BUILD: Original side/back view logic
            camera = new ArcRotateCamera("cam2D", Math.PI / 2, 0.0001, radius, Vector3.Zero(), scene);
            camera.lowerBetaLimit = 0.0001;
            camera.upperBetaLimit = 0.0001;
            camera.lowerAlphaLimit = Math.PI / 2;
            camera.upperAlphaLimit = Math.PI / 2;
        }
        
        camera.lowerRadiusLimit = radius;
        camera.upperRadiusLimit = radius;
        camera.attachControl(canvas, false);
        camera.panningSensibility = 0;

        new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);

        let isDragging = false;
        let lastX = 0;
        const rotationStep = 0.05;
        let pivotNode = null;

        const onKey = (e) => {
            if (!pivotNode) return;
            if (e.key === "ArrowLeft") pivotNode.rotation.y -= rotationStep;
            if (e.key === "ArrowRight") pivotNode.rotation.y += rotationStep;
        };

        const onPointerDown = (e) => {
            if (!pivotNode) return;
            isDragging = true;
            lastX = e.clientX;
        };

        const onPointerUp = () => {
            isDragging = false;
        };

        const onPointerMove = (e) => {
            if (!isDragging || !pivotNode) return;
            const deltaX = e.clientX - lastX;
            pivotNode.rotation.y += deltaX * 0.005;
            lastX = e.clientX;
        };

        const attachInputHandlers = () => {
            window.addEventListener("keydown", onKey);
            canvas.addEventListener("pointerdown", onPointerDown);
            window.addEventListener("pointerup", onPointerUp);
            window.addEventListener("pointermove", onPointerMove);
        };

        const detachInputHandlers = () => {
            window.removeEventListener("keydown", onKey);
            canvas.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointermove", onPointerMove);
        };

        const loadModel = async () => {
            if (!modelUrl) return;
            
            // Detect if this is a preset (sample_assembly) or custom build
            const isPreset = modelUrl && typeof modelUrl === 'string' && modelUrl.toLowerCase().includes('sample_assembly');
            
            try {
                const result = await SceneLoader.ImportMeshAsync(null, "", modelUrl, scene);
                const pivot = new TransformNode("pivot", scene);
                result.meshes.forEach(m => {
                    if (!m.name.startsWith("__")) {
                        m.parent = pivot;
                    }
                });
                
                if (isPreset) {
                    // PRESET: Top-down view with -90 degree rotation
                    pivot.rotation.x = 0;
                    pivot.rotation.y = -Math.PI / 2; // -90 degrees counterclockwise
                    pivot.rotation.z = 0;
                } else {
                    // CUSTOM BUILD: Original rotation logic
                    pivot.rotation.x = Math.PI / 2; // Convert Z-up to Y-up
                    pivot.rotation.y = Math.PI; // Flip 180 degrees
                }
                
                pivotNode = pivot;
                attachInputHandlers();
            } catch (err) {
                console.error("[TwoDViewer] Failed to load model", modelUrl, err);
            }
        };

        loadModel();

        engine.runRenderLoop(() => scene.render());
        const onResize = () => {
            engine.resize();
        };
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            detachInputHandlers();
            scene.dispose();
            engine.dispose();
        };
    }, [modelUrl]);

    return (
        <div className="drone-wrapper">
            <canvas ref={canvasRef} className="drone-canvas" style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
    );
};

TwoDViewer.defaultProps = {
    modelUrl: null,
};

export default TwoDViewer;
