import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BuildProvider, useBuild } from "./BuildContext";

function ContextProbe() {
  const { currentBuild, analysisResults } = useBuild();
  return (
    <div>
      <span>{currentBuild?.name || "No build"}</span>
      <span>{analysisResults?.status || "No analysis"}</span>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

test("loads valid persisted build context", () => {
  localStorage.setItem("currentBuild", JSON.stringify({ id: "b1", name: "Saved quad" }));
  localStorage.setItem("analysisResults", JSON.stringify({ status: "valid" }));
  render(
    <BuildProvider>
      <ContextProbe />
    </BuildProvider>,
  );
  expect(screen.getByText("Saved quad")).toBeInTheDocument();
  expect(screen.getByText("valid")).toBeInTheDocument();
});

test("discards malformed persisted state without logging errors", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.setItem("currentBuild", "{");
  localStorage.setItem("analysisResults", "not-json");
  render(
    <BuildProvider>
      <ContextProbe />
    </BuildProvider>,
  );
  expect(screen.getByText("No build")).toBeInTheDocument();
  expect(screen.getByText("No analysis")).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem("currentBuild")).toBeNull());
  await waitFor(() => expect(localStorage.getItem("analysisResults")).toBeNull());
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
