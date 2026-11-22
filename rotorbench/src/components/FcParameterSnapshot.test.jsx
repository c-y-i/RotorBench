import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FcParameterSnapshot, { groupFcParameters } from "./FcParameterSnapshot";

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
  render(
    <FcParameterSnapshot
      values={values}
      checks={[
        { id: "fc-param-arm-channel", status: "pass" },
        { id: "fc-param-rc-min", status: "fail" },
        { id: "fc-param-mode-channel", status: "unverified" },
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

  await userEvent.click(screen.getByRole("button", {
    name: /Differences only · 1/,
  }));
  expect(within(screen.getByRole("region", {
    name: "Arming and receiver parameters",
  })).getByText("rc_min")).toBeInTheDocument();
  expect(screen.queryByText("arm_channel")).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Modes and channels parameters" }))
    .not.toBeInTheDocument();
});
