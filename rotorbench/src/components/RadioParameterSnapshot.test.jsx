import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RadioParameterSnapshot, {
  groupRadioParameters,
} from "./RadioParameterSnapshot";
import { getA11yViolations } from "../test/a11y";

const entries = [
  { id: 1, name: "Packet Rate", value: "3", type: "text_selection" },
  { id: 2, name: "Telem Ratio", value: "0", type: "text_selection" },
  { id: 5, name: "Max Power", value: "0", type: "text_selection" },
  { id: 7, name: "Model Match", value: "0", type: "text_selection" },
  { id: 10, name: "Custom Menu", value: "42", type: "uint8" },
];

test("groups imported TX module parameters without changing values", () => {
  const groups = groupRadioParameters(entries);
  expect(groups.map((group) => group.id)).toEqual([
    "link",
    "power",
    "endpoint",
    "other",
  ]);
  expect(groups.find((group) => group.id === "link").entries.map(
    (entry) => entry.name,
  )).toEqual(["Packet Rate", "Telem Ratio"]);
  expect(groups.find((group) => group.id === "other").entries)
    .toEqual([entries[4]]);
});

test("filters TX parameters and preserves the read-only boundary", async () => {
  render(<RadioParameterSnapshot entries={entries} />);

  await userEvent.click(screen.getByText("Observed TX parameter snapshot"));
  expect(screen.getByText(/did not write or save module parameters/i))
    .toBeInTheDocument();
  await userEvent.type(
    screen.getByPlaceholderText("Filter radio names or values"),
    "Custom Menu",
  );
  const other = screen.getByRole("region", {
    name: "Other observed radio parameters",
  });
  expect(within(other).getByText("42")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "RF link radio parameters" }))
    .not.toBeInTheDocument();
});

test("identifies TX plan matches and differences inline", async () => {
  const { container } = render(
    <RadioParameterSnapshot
      entries={entries}
      checks={[
        { id: "settings-packet-rate", status: "pass" },
        { id: "settings-telemetry", status: "fail" },
        { id: "settings-power", status: "unverified" },
        { id: "settings-link-mode", status: "unverified" },
      ]}
    />,
  );

  await userEvent.click(screen.getByText("Observed TX parameter snapshot"));
  const link = screen.getByRole("region", { name: "RF link radio parameters" });
  expect(within(link).getByText("Matches plan")).toBeInTheDocument();
  expect(within(link).getByText("Differs")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Power radio parameters",
  })).getByText("Unverified")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Other observed radio parameters",
  })).getByText("Observed")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Needs review · 3" }))
    .toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", {
    name: "Needs review · 3",
  }));
  expect(within(screen.getByRole("region", {
    name: "RF link radio parameters",
  })).getByText("Telem Ratio")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "Power radio parameters",
  })).getByText("Max Power")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "RF link radio parameters",
  })).getByText("Link Mode")).toBeInTheDocument();
  expect(within(screen.getByRole("region", {
    name: "RF link radio parameters",
  })).getByText("Not in snapshot")).toBeInTheDocument();
  expect(screen.queryByText("Packet Rate")).not.toBeInTheDocument();

  await userEvent.selectOptions(
    screen.getByLabelText("Radio parameter group"),
    "power",
  );
  expect(within(screen.getByRole("region", {
    name: "Power radio parameters",
  })).getByText("Max Power")).toBeInTheDocument();
  expect(screen.queryByRole("region", {
    name: "RF link radio parameters",
  })).not.toBeInTheDocument();

  await userEvent.selectOptions(
    screen.getByLabelText("Radio parameter group"),
    "all",
  );
  await userEvent.click(screen.getByRole("button", {
    name: "Differences · 1",
  }));
  expect(within(screen.getByRole("region", {
    name: "RF link radio parameters",
  })).getByText("Telem Ratio")).toBeInTheDocument();
  expect(screen.queryByText("Packet Rate")).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Power radio parameters" }))
    .not.toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});
