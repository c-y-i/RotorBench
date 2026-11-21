export const CAMERA_VIEWS = {
  orbit: {
    id: "orbit",
    label: "Orbit",
    alpha: Math.PI * 0.25,
    beta: Math.PI * 0.36,
    autoRotate: true,
  },
  threeQuarter: {
    id: "threeQuarter",
    label: "3/4",
    alpha: Math.PI * 0.28,
    beta: Math.PI * 0.35,
    autoRotate: false,
  },
  top: {
    id: "top",
    label: "Top",
    alpha: Math.PI * 0.5,
    beta: 0.12,
    autoRotate: false,
  },
  side: {
    id: "side",
    label: "Side",
    alpha: Math.PI * 0.5,
    beta: Math.PI * 0.5,
    autoRotate: false,
  },
  front: {
    id: "front",
    label: "Front",
    alpha: 0,
    beta: Math.PI * 0.5,
    autoRotate: false,
  },
};

export const CAMERA_VIEW_IDS = Object.keys(CAMERA_VIEWS);

export function getCameraView(id) {
  return CAMERA_VIEWS[id] || CAMERA_VIEWS.threeQuarter;
}
