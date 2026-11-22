import React from "react";
import { render, screen } from "@testing-library/react";
import AerialKitRouteSketch from "./AerialKitRouteSketch";
import { buildAerialKitWaypointInventory } from "../utils/aerialKitWaypoints";

const inventory = buildAerialKitWaypointInventory([
  { name: "wp_count", value: "2" },
  { name: "wp0_lat", value: "37.6774" },
  { name: "wp0_lon", value: "-122.4194" },
  { name: "wp1_lat", value: "37.7" },
  { name: "wp1_lon", value: "-122.4" },
]);

test("marks the active waypoint relative to a fresh board position", () => {
  const { container } = render(<AerialKitRouteSketch
    inventory={inventory}
    currentPosition={{ lat: 37.69, lon: -122.41 }}
    activeWaypointIndex={1}
  />);
  expect(screen.getByRole("img", {
    name: "Local north-up sketch of waypoint coordinates with fresh board position and active target WP 1",
  })).toBeInTheDocument();
  expect(screen.getByText("Board")).toBeInTheDocument();
  expect(screen.getByText(/Fresh board position shown/i)).toBeInTheDocument();
  expect(screen.getByText(/WP 1 is the active target/i)).toBeInTheDocument();
  expect(screen.getByText(/dashed link is an observation/i)).toBeInTheDocument();
  expect(container.querySelector(".route-active-ring")).toBeInTheDocument();
  expect(container.querySelector(".route-observation-line")).toBeInTheDocument();
  expect(screen.queryByText(/outside this sketch extent/i)).not.toBeInTheDocument();
});

test("does not compress the route when the board position is far outside", () => {
  const { container } = render(<AerialKitRouteSketch
    inventory={inventory}
    currentPosition={{ lat: 0, lon: 0 }}
    activeWaypointIndex={1}
  />);
  expect(screen.queryByText("Board")).not.toBeInTheDocument();
  expect(container.querySelector(".route-observation-line")).not.toBeInTheDocument();
  expect(container.querySelector(".route-active-ring")).toBeInTheDocument();
  expect(screen.getByText(/Fresh board position lies outside this sketch extent/i))
    .toBeInTheDocument();
});
