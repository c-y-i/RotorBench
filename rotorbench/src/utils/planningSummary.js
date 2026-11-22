import componentsData from "../data/components.json";
import { applyMeasuredGeometry } from "./buildGeometry";
import { summarizeTakeoffWeight } from "./flightEnvelope";
import { getFrameServoHardware } from "./frameHardware";

export const BUILD_WEIGHT_ALLOWANCE_G = 50;

const partDefinitions = [
  { key: "frameId", category: "frames" },
  { key: "motorId", category: "motors" },
  { key: "propellerId", category: "propellers" },
  { key: "batteryId", category: "batteries" },
  { key: "escId", category: "escs" },
  { key: "flightControllerId", category: "flight_controllers" },
  { key: "receiverId", category: "receivers" },
];

export function summarizeBuildPlanning(build, { catalog = componentsData } = {}) {
  const ids = build?.componentIds || {};
  const parts = partDefinitions.map((definition) => {
    const part = catalog[definition.category]?.find(
      (candidate) => candidate.id === ids[definition.key],
    );
    return {
      ...definition,
      part: applyMeasuredGeometry(
        definition.category,
        part || null,
        build?.geometryOverrides,
      ),
    };
  });
  const byCategory = Object.fromEntries(
    parts.map(({ category, part }) => [category, part]),
  );
  const selectedCount = parts.filter(({ part }) => part).length;
  const motorCount = Number(byCategory.frames?.motorCount) || 4;
  const quantity = {
    frames: 1,
    motors: motorCount,
    propellers: motorCount,
    batteries: 1,
    escs: 1,
    flight_controllers: 1,
    receivers: 1,
  };
  const frameServoHardware = getFrameServoHardware(byCategory.frames);
  const catalogWeight = parts.reduce(
    (total, { category, part }) =>
      total + (Number(part?.weight) || 0) * (quantity[category] || 1),
    0,
  ) + (Number(frameServoHardware?.weight) || 0);
  const totalPrice = parts.reduce(
    (total, { category, part }) =>
      total + (Number(part?.price) || 0) * (quantity[category] || 1),
    0,
  ) + (Number(frameServoHardware?.price) || 0);
  const planningAllowanceG = selectedCount > 0 ? BUILD_WEIGHT_ALLOWANCE_G : 0;
  const totalWeight = catalogWeight + planningAllowanceG;
  const takeoffEnvelope = summarizeTakeoffWeight(
    totalWeight,
    byCategory.frames?.flightEnvelope,
  );

  return {
    selectedCount,
    motorCount,
    frameServoHardware,
    catalogWeight,
    planningAllowanceG,
    totalWeight,
    totalPrice,
    publishedTakeoffRangeG:
      byCategory.frames?.flightEnvelope?.takeoffWeightG || null,
    takeoffEnvelopeStatus: takeoffEnvelope?.status || "unavailable",
    takeoffEnvelopeShortLabel:
      takeoffEnvelope?.shortLabel || "No published envelope",
    takeoffEnvelopeLabel:
      takeoffEnvelope?.label || "No published takeoff envelope",
  };
}
