import { buildAerialKitMissionRouteExport } from "./aerialKitMissionRouteExport";
import {
  aerialKitMissionRouteEvidenceChecks,
  parseAerialKitMissionRouteEvidence,
} from "./aerialKitMissionRouteEvidence";
import { buildAerialKitWaypointInventory } from "./aerialKitWaypoints";

const generatedAtMs = 1760000000000;
const inventory = buildAerialKitWaypointInventory([
  { name: "wp_count", value: "3" },
  { name: "wp0_lat", value: "37.6774" },
  { name: "wp0_lon", value: "-122.4194" },
  { name: "wp1_lat", value: "37.701" },
  { name: "wp1_lon", value: "-122.402" },
  { name: "wp2_lat", value: "37.682" },
  { name: "wp2_lon", value: "-122.39" },
]);
const mission = {
  status: "ok",
  active: true,
  requested: true,
  index: 1,
  count: 3,
  countCapped: false,
  channel: 7,
  reached: 1,
  started: 2,
  cancelled: 0,
  holdAltMm: 120000,
};
const proximity = {
  status: "ok",
  waypoint: { index: 1, lat: 37.701, lon: -122.402 },
  position: { lat: 37.69, lon: -122.414, gpsFixType: 3 },
  positionSource: "telemetry",
  ageMs: 250,
  distanceM: 1250,
};

function artifact() {
  return buildAerialKitMissionRouteExport({
    mission,
    inventory,
    proximity,
    nowMs: generatedAtMs,
  }).artifact;
}

test("recomputes route geometry and observation freshness on import", () => {
  const route = parseAerialKitMissionRouteEvidence(artifact(), {
    nowMs: generatedAtMs + 500,
  });
  expect(route).toMatchObject({
    kind: "fc-mission-route",
    staleOnImport: false,
    importAgeMs: 750,
    activeTarget: { index: 1 },
    route: { waypointCount: 3 },
    progress: { remainingWaypointCount: 1 },
    geometryRecomputed: true,
    hardwareVerifiedByRotorBench: false,
  });
  expect(route.inventory.slots).toHaveLength(3);
  expect(route.legs).toHaveLength(2);
  expect(route.progress.remainingLegs).toHaveLength(1);
  const checks = aerialKitMissionRouteEvidenceChecks(route);
  expect(checks.map((check) => check.id)).toEqual([
    "fc-mission-route-geometry",
    "fc-mission-route-freshness",
    "fc-mission-route-authenticity",
  ]);
  expect(checks[2].status).toBe("unverified");
});

test("marks a late import historical without discarding its geometry", () => {
  const route = parseAerialKitMissionRouteEvidence(artifact(), {
    nowMs: generatedAtMs + 5000,
  });
  expect(route.staleOnImport).toBe(true);
  expect(route.inventory.status).toBe("ok");
  expect(aerialKitMissionRouteEvidenceChecks(route)[1].status)
    .toBe("unverified");
});

test("rejects contradictory legs, progress, active targets, and boundaries", () => {
  const badLeg = artifact();
  badLeg.route.legs[0].distanceM += 100;
  expect(() => parseAerialKitMissionRouteEvidence(badLeg, {
    nowMs: generatedAtMs,
  })).toThrow(/leg 1 is inconsistent/i);

  const badProgress = artifact();
  badProgress.progress.totalRemainingM += 100;
  expect(() => parseAerialKitMissionRouteEvidence(badProgress, {
    nowMs: generatedAtMs,
  })).toThrow(/remaining distance is inconsistent/i);

  const badTarget = artifact();
  badTarget.activeTarget.lat += 0.01;
  expect(() => parseAerialKitMissionRouteEvidence(badTarget, {
    nowMs: generatedAtMs,
  })).toThrow(/active target does not match/i);

  const badBoundary = artifact();
  badBoundary.boundaries.writesPerformed = true;
  expect(() => parseAerialKitMissionRouteEvidence(badBoundary, {
    nowMs: generatedAtMs,
  })).toThrow(/boundary writesPerformed is not false/i);
});

test("rejects a stale-at-export observation and future generation time", () => {
  const stale = artifact();
  stale.observation.ageMs = 2500;
  expect(() => parseAerialKitMissionRouteEvidence(stale, {
    nowMs: generatedAtMs,
  })).toThrow(/not fresh when exported/i);

  const future = artifact();
  expect(() => parseAerialKitMissionRouteEvidence(future, {
    nowMs: generatedAtMs - 120000,
  })).toThrow(/generation time is in the future/i);
});
