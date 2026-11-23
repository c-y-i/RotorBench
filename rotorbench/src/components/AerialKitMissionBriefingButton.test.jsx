import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AerialKitMissionBriefingButton from "./AerialKitMissionBriefingButton";
import { buildAerialKitWaypointInventory } from "../utils/aerialKitWaypoints";

const inventory = buildAerialKitWaypointInventory([
  { name: "wp_count", value: "2" },
  { name: "wp0_lat", value: "37.6774" },
  { name: "wp0_lon", value: "-122.4194" },
  { name: "wp1_lat", value: "37.701" },
  { name: "wp1_lon", value: "-122.402" },
]);

const mission = {
  status: "ok",
  active: true,
  index: 1,
  count: 2,
};

const proximity = {
  status: "ok",
  waypoint: { index: 1, lat: 37.701, lon: -122.402 },
  position: { lat: 37.69, lon: -122.414, gpsFixType: 3 },
  positionSource: "status",
  ageMs: 100,
  distanceM: 1250,
};

test("copies the validated mission briefing without a hardware claim", async () => {
  const originalClipboard = navigator.clipboard;
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<AerialKitMissionBriefingButton
    mission={mission}
    inventory={inventory}
    proximity={proximity}
  />);
  await userEvent.click(screen.getByRole("button", {
    name: "Copy mission briefing",
  }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  expect(writeText.mock.calls[0][0]).toContain(
    "Active target: WP 1 (37.7010000, -122.4020000)",
  );
  expect(await screen.findByText(
    "Mission briefing copied. Nothing was sent to hardware.",
  )).toBeInTheDocument();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: originalClipboard,
  });
});

test("omits the action without a fresh active target", () => {
  const { container } = render(<AerialKitMissionBriefingButton
    mission={{ ...mission, active: false }}
    inventory={inventory}
    proximity={proximity}
  />);
  expect(container).toBeEmptyDOMElement();
});
