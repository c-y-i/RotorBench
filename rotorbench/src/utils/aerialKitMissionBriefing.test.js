import { buildAerialKitMissionBriefing } from "./aerialKitMissionBriefing";
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
  index: 1,
  count: 3,
};

const proximity = {
  status: "ok",
  waypoint: { index: 1, lat: 37.701, lon: -122.402 },
  position: { lat: 37.69, lon: -122.414, gpsFixType: 3 },
  positionSource: "telemetry",
  ageMs: 250,
  distanceM: 1250,
};

test("builds a read-only mission briefing from validated geometry", () => {
  const briefing = buildAerialKitMissionBriefing({
    mission,
    inventory,
    proximity,
  });
  expect(briefing).toMatchObject({
    status: "ok",
    progress: {
      status: "ok",
      activeWaypointIndex: 1,
      distanceToActiveM: 1250,
    },
  });
  expect(briefing.text).toContain("RotorBench Aerial Kit mission briefing");
  expect(briefing.text).toContain("Mission: active");
  expect(briefing.text).toContain(
    "Active target: WP 1 (37.7010000, -122.4020000)",
  );
  expect(briefing.text).toContain("Position source: TELEMETRY");
  expect(briefing.text).toContain("GPS fix: 3");
  expect(briefing.text).toContain("Observation age: 0.25 s");
  expect(briefing.text).toContain("Distance to active target: 1.250 km");
  expect(briefing.text).toContain("Configured waypoints: 3");
  expect(briefing.text).toContain("Remaining targets after active: 1");
  expect(briefing.text).toContain(
    "Nothing in this briefing was sent to hardware",
  );
});

test("does not brief an inactive mission or unavailable position", () => {
  expect(buildAerialKitMissionBriefing({
    mission: { ...mission, active: false },
    inventory,
    proximity,
  })).toMatchObject({
    status: "unavailable",
    text: "",
  });
  expect(buildAerialKitMissionBriefing({
    mission,
    inventory,
    proximity: { status: "unavailable", reason: "position-stale" },
  })).toMatchObject({
    status: "unavailable",
    reason: "proximity-unavailable",
  });
});
