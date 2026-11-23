import { render, screen } from "@testing-library/react";
import AerialKitMissionRouteProgress from "./AerialKitMissionRouteProgress";
import { buildAerialKitWaypointInventory } from "../utils/aerialKitWaypoints";

const inventory = buildAerialKitWaypointInventory([
  { name: "wp_count", value: "3" },
  { name: "wp0_lat", value: "37.6774" },
  { name: "wp0_lon", value: "-122.4194" },
  { name: "wp1_lat", value: "37.701" },
  { name: "wp1_lon", value: "-122.402" },
  { name: "wp2_lat", value: "37.682" },
  { name: "wp2_lon", value: "-122.39" },
]);

test("shows current, onward, and total remaining mission distance", () => {
  render(<AerialKitMissionRouteProgress
    inventory={inventory}
    proximity={{
      status: "ok",
      waypoint: { index: 1, lat: 37.701, lon: -122.402 },
      distanceM: 1250,
    }}
  />);
  expect(screen.getByText("Mission progress")).toBeInTheDocument();
  expect(screen.getByText("Active target WP 1")).toBeInTheDocument();
  expect(screen.getByText("To active")).toBeInTheDocument();
  expect(screen.getByText("1.250 km")).toBeInTheDocument();
  expect(screen.getByText("After target")).toBeInTheDocument();
  expect(screen.getByText(/planned great-circle leg after WP 1/i))
    .toBeInTheDocument();
  expect(screen.getByText(/flown progress.*not included/i)).toBeInTheDocument();
});

test("omits progress when proximity is unavailable", () => {
  const { container } = render(<AerialKitMissionRouteProgress
    inventory={inventory}
    proximity={{ status: "unavailable", reason: "position-stale" }}
  />);
  expect(container).toBeEmptyDOMElement();
});
