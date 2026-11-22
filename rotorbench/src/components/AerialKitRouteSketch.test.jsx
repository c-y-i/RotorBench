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

test("plots a fresh board position inside the route extent", () => {
  render(<AerialKitRouteSketch
    inventory={inventory}
    currentPosition={{ lat: 37.69, lon: -122.41 }}
  />);
  expect(screen.getByRole("img", {
    name: "Local north-up sketch of waypoint coordinates with fresh board position",
  })).toBeInTheDocument();
  expect(screen.getByText("Board")).toBeInTheDocument();
  expect(screen.getByText(/Fresh board position shown/i)).toBeInTheDocument();
  expect(screen.queryByText(/outside this sketch extent/i)).not.toBeInTheDocument();
});

test("does not compress the route when the board position is far outside", () => {
  render(<AerialKitRouteSketch
    inventory={inventory}
    currentPosition={{ lat: 0, lon: 0 }}
  />);
  expect(screen.queryByText("Board")).not.toBeInTheDocument();
  expect(screen.getByText(/Fresh board position lies outside this sketch extent/i))
    .toBeInTheDocument();
});
