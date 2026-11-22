import { buildAerialKitWaypointInventory } from "./aerialKitWaypoints";

test("builds ordered waypoint coordinates from advertised parameters", () => {
  expect(buildAerialKitWaypointInventory([
    { name: "wp_count", value: "2" },
    { name: "wp0_lat", value: "37.6774000" },
    { name: "wp0_lon", value: "-122.4194000" },
    { name: "wp1_lat", value: "37.7000000" },
    { name: "wp1_lon", value: "-122.4000000" },
    { name: "wp2_lat", value: "0.0000000" },
    { name: "wp2_lon", value: "0.0000000" },
  ])).toEqual({
    status: "ok",
    reason: null,
    count: 2,
    availableSlots: 3,
    complete: true,
    slots: [
      {
        index: 0,
        lat: 37.6774,
        lon: -122.4194,
        rawLat: "37.6774000",
        rawLon: "-122.4194000",
        complete: true,
        errors: [],
      },
      {
        index: 1,
        lat: 37.7,
        lon: -122.4,
        rawLat: "37.7000000",
        rawLon: "-122.4000000",
        complete: true,
        errors: [],
      },
    ],
  });
});

test("keeps zero waypoints distinct from a missing waypoint table", () => {
  expect(buildAerialKitWaypointInventory([
    { name: "wp_count", value: "0" },
    { name: "wp0_lat", value: "0.0000000" },
    { name: "wp0_lon", value: "0.0000000" },
  ])).toMatchObject({
    status: "ok",
    count: 0,
    availableSlots: 1,
    slots: [],
    complete: true,
  });
  expect(buildAerialKitWaypointInventory([
    { name: "rate_kp_roll", value: "0.25" },
  ])).toMatchObject({
    status: "unavailable",
    reason: "missing-count",
    count: null,
  });
});

test("marks missing, out-of-range, and over-count waypoint slots incomplete", () => {
  expect(buildAerialKitWaypointInventory([
    { name: "wp_count", value: "2" },
    { name: "wp0_lat", value: "91" },
    { name: "wp0_lon", value: "0" },
    { name: "wp1_lat", value: "10" },
  ])).toMatchObject({
    status: "incomplete",
    reason: "invalid-coordinate",
    complete: false,
    slots: [
      {
        index: 0,
        errors: ["latitude outside -90 to 90"],
      },
      {
        index: 1,
        errors: ["missing or invalid longitude"],
      },
    ],
  });
  expect(buildAerialKitWaypointInventory([
    { name: "wp_count", value: "3" },
    { name: "wp0_lat", value: "0" },
    { name: "wp0_lon", value: "0" },
  ])).toMatchObject({
    status: "incomplete",
    reason: "count-exceeds-slots",
    complete: false,
  });
});
