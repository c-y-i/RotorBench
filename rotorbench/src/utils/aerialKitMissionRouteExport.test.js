import {
  AERIAL_KIT_MISSION_ROUTE_SCHEMA,
  buildAerialKitMissionRouteExport,
} from "./aerialKitMissionRouteExport";
import { buildAerialKitWaypointInventory } from "./aerialKitWaypoints";

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

test("exports ordered route, observation, and progress without hardware claims", () => {
  const result = buildAerialKitMissionRouteExport({
    mission,
    inventory,
    proximity,
    nowMs: 1760000000000,
  });
  expect(result.status).toBe("ok");
  expect(result.artifact).toMatchObject({
    schema: AERIAL_KIT_MISSION_ROUTE_SCHEMA,
    generatedAt: "2025-10-09T08:53:20.000Z",
    activeTarget: {
      index: 1,
      lat: 37.701,
      lon: -122.402,
    },
    route: {
      waypointCount: 3,
    },
    observation: {
      positionSource: "telemetry",
      ageMs: 250,
      gpsFixType: 3,
      distanceToActiveM: 1250,
    },
    progress: {
      distanceToActiveM: 1250,
      remainingWaypointCount: 1,
    },
    boundaries: {
      geometricEstimate: true,
      terrainNotConsidered: true,
      flownProgressNotObserved: true,
      returnToHomeIncluded: false,
      writesPerformed: false,
      hardwareVerificationClaimed: false,
      rfVerificationClaimed: false,
      flightReadinessClaimed: false,
    },
  });
  expect(result.artifact.route.waypoints).toHaveLength(3);
  expect(result.artifact.route.legs).toHaveLength(2);
  expect(result.artifact.progress.remainingLegs).toHaveLength(1);
});

test("refuses an inactive mission or unavailable fresh observation", () => {
  expect(buildAerialKitMissionRouteExport({
    mission: { ...mission, active: false },
    inventory,
    proximity,
  })).toMatchObject({
    status: "unavailable",
    artifact: null,
  });
  expect(buildAerialKitMissionRouteExport({
    mission,
    inventory,
    proximity: { status: "unavailable", reason: "position-stale" },
  })).toMatchObject({
    status: "unavailable",
    reason: "proximity-unavailable",
  });
});
