import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FcParameterSnapshot, { groupFcParameters } from "./FcParameterSnapshot";
import { getA11yViolations } from "../test/a11y";

const values = {
  arm_channel: 5,
  rc_min: 172,
  mode_channel: 6,
  launch_channel: 7,
  launch_throttle: 0.7,
  vbat_cells: 6,
  fence_radius_m: 100,
  custom_threshold: 42,
};

test("groups imported FC parameters without changing their values", () => {
  const groups = groupFcParameters(values);
  expect(groups.map((group) => group.id)).toEqual([
    "arming",
    "channels",
    "launch",
    "power",
    "navigation",
    "other",
  ]);
  expect(groups.find((group) => group.id === "arming").entries)
    .toEqual([
      { name: "arm_channel", value: "5" },
      { name: "rc_min", value: "172" },
    ]);
  expect(groups.find((group) => group.id === "other").entries)
    .toEqual([{ name: "custom_threshold", value: "42" }]);
});

test("groups ArduPilot receiver and serial parameters with the receiver plan", () => {
  const groups = groupFcParameters({
    brd_alt_config: "1",
    serial7_protocol: "23",
    serial7_baud: "57",
    rssi_type: "3",
  });

  expect(groups).toHaveLength(1);
  expect(groups[0]).toMatchObject({
    id: "arming",
    label: "Arming and receiver",
    entries: [
      { name: "brd_alt_config", value: "1" },
      { name: "rssi_type", value: "3" },
      { name: "serial7_baud", value: "57" },
      { name: "serial7_protocol", value: "23" },
    ],
  });
});

test("filters the snapshot and states the read-only boundary", async () => {
  render(<FcParameterSnapshot values={values} />);

  await userEvent.click(screen.getByText("Observed parameter snapshot"));
  expect(screen.getByText(/did not write, save, or re-read/i)).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Arming and receiver parameters" }))
    .toHaveTextContent("rc_min");

  await userEvent.type(
    screen.getByPlaceholderText("Filter parameter names or values"),
    "custom_threshold",
  );
  const other = screen.getByRole("region", { name: "Other observed parameters" });
  expect(within(other).getByText("42")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Arming and receiver parameters" }))
    .not.toBeInTheDocument();

  await userEvent.clear(screen.getByPlaceholderText("Filter parameter names or values"));
  await userEvent.type(
    screen.getByPlaceholderText("Filter parameter names or values"),
    "missing",
  );
  expect(screen.getByText(/No observed parameters match/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Clear filter" }));
  expect(screen.getByRole("region", { name: "Arming and receiver parameters" }))
    .toBeInTheDocument();
});

test("identifies plan matches and differences inline", async () => {
  const { container } = render(
    <FcParameterSnapshot
      values={values}
      checks={[
        { id: "fc-param-arm-channel", status: "pass" },
        { id: "fc-param-rc-min", status: "fail" },
        { id: "fc-param-mode-channel", status: "unverified" },
        { id: "fc-param-serial7-protocol", status: "unverified" },
      ]}
    />,
  );

  await userEvent.click(screen.getByText("Observed parameter snapshot"));
  const arming = screen.getByRole("region", {
    name: "Arming and receiver parameters",
  });
  expect(within(arming).getByText("Matches plan")).toBeInTheDocument();
  expect(within(arming).getByText("Differs")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Modes and channels parameters",
  })).getByText("Unverified")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Hand launch parameters",
  })).getByText("Observed")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Needs review · 3" }))
    .toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Needs review · 3",
  }));
  expect(within(screen.getByRole("region", {
    name: "Arming and receiver parameters",
  })).getByText("rc_min")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Modes and channels parameters",
  })).getByText("mode_channel")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Arming and receiver parameters",
  })).getByText("serial7_protocol")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Arming and receiver parameters",
  })).getByText("Not in snapshot")).toBeInTheDocument();
  expect(screen.queryByText("arm_channel")).not.toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Parameter group"), "channels");
  expect(within(screen.getByRole("region", {
    name: "Modes and channels parameters",
  })).getByText("mode_channel")).toBeInTheDocument();
  expect(screen.queryByRole("region", {
    name: "Arming and receiver parameters",
  })).not.toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Parameter group"), "all");
  await userEvent.click(screen.getByRole("button", {
    name: "Differences · 1",
  }));
  expect(within(screen.getByRole("region", {
    name: "Arming and receiver parameters",
  })).getByText("rc_min")).toBeInTheDocument();
  expect(screen.queryByText("arm_channel")).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Modes and channels parameters" }))
    .not.toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("shows the accepted parameter snapshot format", async () => {
  render(
    <FcParameterSnapshot
      values={{ brd_alt_config: "1" }}
      format="mission-planner"
    />,
  );

  expect(screen.getByText(/Mission Planner/)).toBeInTheDocument();
});
