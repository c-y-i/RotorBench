import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RadioParameterSnapshot, {
  groupRadioParameters,
} from "./RadioParameterSnapshot";

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
