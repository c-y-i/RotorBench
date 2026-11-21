import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BenchRunbook from "./BenchRunbook";
import { buildBenchRunbook } from "../utils/benchRunbook";
import { createDefaultFlightControllerConfig } from "../data/flightControllerProfiles";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";

const runbook = buildBenchRunbook(
  createDefaultFlightControllerConfig(),
  DEFAULT_RADIO_CONFIG,
);

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
});

test("shows a copy-only source-backed bench runbook", async () => {
  render(<BenchRunbook runbook={runbook} />);
  expect(screen.getByText("Bench runbook")).toBeInTheDocument();
  expect(screen.getByText("Not executed")).toBeInTheDocument();

  await userEvent.click(screen.getByText("Bench runbook"));
  expect(screen.getByText("Read identity before changing anything")).toBeInTheDocument();
  expect(screen.getAllByText("Changes hardware")).toHaveLength(1);
  expect(screen.getByText(/RF remains NOT TESTED/i)).toBeInTheDocument();
  expect(screen.getByText(/never exports staged binding material/i)).toBeInTheDocument();
  expect(screen.getByText(new RegExp(runbook.source.artifact))).toBeInTheDocument();

  const fullCopy = screen.getByRole("button", { name: "Copy full runbook" });
  expect(fullCopy).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Copy discovery" }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(runbook.readOnlyCopyText);
  expect(runbook.readOnlyCopyText).not.toContain("--write");
  expect(screen.getByText(/RF acceptance evidence/i)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent(/Read-only discovery copied/i);
  });
  await userEvent.click(screen.getByRole("checkbox", { name: /I reviewed the props-off setup/i }));
  expect(fullCopy).toBeEnabled();
  await userEvent.click(fullCopy);
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(runbook.copyText);
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent(/Full runbook copied/i);
  });
});
