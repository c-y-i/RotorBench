import { parseBenchEvidenceBundle } from "./benchEvidence";
import { buildAerialKitMissionRouteExport } from "./aerialKitMissionRouteExport";
import { buildAerialKitWaypointInventory } from "./aerialKitWaypoints";

test("reviews a validated mission-route artifact as planning evidence", () => {
  const inventory = buildAerialKitWaypointInventory([
    { name: "wp_count", value: "2" },
    { name: "wp0_lat", value: "37.6774" },
    { name: "wp0_lon", value: "-122.4194" },
    { name: "wp1_lat", value: "37.701" },
    { name: "wp1_lon", value: "-122.402" },
  ]);
  const artifact = buildAerialKitMissionRouteExport({
    inventory,
    mission: {
      status: "ok",
      active: true,
      requested: true,
      index: 1,
      count: 2,
      countCapped: false,
      channel: 7,
      reached: 1,
      started: 1,
      cancelled: 0,
      holdAltMm: 120000,
    },
    proximity: {
      status: "ok",
      waypoint: { index: 1, lat: 37.701, lon: -122.402 },
      position: { lat: 37.69, lon: -122.414, gpsFixType: 3 },
      positionSource: "telemetry",
      ageMs: 100,
      distanceM: 1250,
    },
  }).artifact;
  const bundle = parseBenchEvidenceBundle([{
    name: "mission-route.json",
    text: JSON.stringify(artifact),
  }]);
  expect(bundle).toMatchObject({
    kind: "fc-mission-route",
    fileOverall: "Mission-route geometry validated as planning evidence",
    hardwareVerifiedByRotorBench: false,
    fcEvidence: {
      missionRoute: {
        kind: "fc-mission-route",
        activeTarget: { index: 1 },
        geometryRecomputed: true,
      },
    },
    bundle: {
      fcEvidenceCount: 1,
    },
  });
  expect(bundle.checks.map((check) => check.id)).toEqual(expect.arrayContaining([
    "fc-mission-route-geometry",
    "fc-mission-route-freshness",
    "fc-mission-route-authenticity",
  ]));
});
