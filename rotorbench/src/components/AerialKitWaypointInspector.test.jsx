import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AerialKitWaypointInspector from "./AerialKitWaypointInspector";
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

test("keeps all waypoints visible and inspects adjacent legs locally", async () => {
  render(<AerialKitWaypointInspector
    inventory={inventory}
    activeWaypointIndex={1}
  />);
  expect(screen.getByRole("region", {
    name: "Validated waypoint inspector",
  })).toBeInTheDocument();
  expect(screen.getByText("37.6774000, -122.4194000")).toBeInTheDocument();
  expect(screen.getByText("37.7010000, -122.4020000")).toBeInTheDocument();
  expect(screen.getByText("37.6820000, -122.3900000")).toBeInTheDocument();
  expect(screen.getByText("Selected WP 1")).toBeInTheDocument();
  expect(screen.getByText("Observed active target")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /WP 1 Active/ }))
    .toHaveAttribute("aria-pressed", "true");

  await userEvent.click(screen.getByRole("button", { name: /WP 0/ }));
  expect(screen.getByText("Selected WP 0")).toBeInTheDocument();
  expect(screen.getByText("Local inspection")).toBeInTheDocument();
  expect(screen.getByText("Start")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /WP 2/ }));
  expect(screen.getByText("Selected WP 2")).toBeInTheDocument();
  expect(screen.getByText("Final")).toBeInTheDocument();
  expect(screen.getByText(/local inspection only/i)).toBeInTheDocument();
});

test("defaults to the first validated waypoint when no target is active", () => {
  render(<AerialKitWaypointInspector inventory={inventory} />);
  expect(screen.getByText("Selected WP 0")).toBeInTheDocument();
  expect(screen.getByText("Start")).toBeInTheDocument();
});
