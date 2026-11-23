import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AerialKitMissionRouteDownloadButton from "./AerialKitMissionRouteDownloadButton";
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
  requested: true,
  index: 1,
  count: 2,
  channel: 7,
};

const proximity = {
  status: "ok",
  waypoint: { index: 1, lat: 37.701, lon: -122.402 },
  position: { lat: 37.69, lon: -122.414, gpsFixType: 3 },
  positionSource: "status",
  ageMs: 100,
  distanceM: 1250,
};

test("downloads a validated route without sending anything to hardware", async () => {
  const createObjectURL = vi.fn(() => "blob:mission-route");
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  render(<AerialKitMissionRouteDownloadButton
    mission={mission}
    inventory={inventory}
    proximity={proximity}
  />);

  await userEvent.click(screen.getByRole("button", {
    name: "Download mission route",
  }));
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(createObjectURL.mock.calls[0][0].type).toBe("application/json");
  expect(click).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:mission-route");
  expect(await screen.findByText(
    "Mission route downloaded. Nothing was sent to hardware.",
  )).toBeInTheDocument();
  click.mockRestore();
});

test("omits the download when no active validated route is available", () => {
  const { container } = render(<AerialKitMissionRouteDownloadButton
    mission={{ ...mission, active: false }}
    inventory={inventory}
    proximity={proximity}
  />);
  expect(container).toBeEmptyDOMElement();
});
