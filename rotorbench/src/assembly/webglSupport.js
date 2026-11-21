export function supportsWebGL(canvas) {
  if (!canvas || typeof canvas.getContext !== "function") return false;
  try {
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
