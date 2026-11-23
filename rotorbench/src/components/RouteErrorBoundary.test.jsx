import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RouteErrorBoundary from "./RouteErrorBoundary";

function BrokenView() {
  throw new Error("chunk failed");
}

test("route error boundary explains a failed view and offers reload", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <RouteErrorBoundary resetKey="/build">
      <BrokenView />
    </RouteErrorBoundary>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(/could not load/i);
  expect(screen.getByRole("button", { name: /reload RotorBench/i }))
    .toBeInTheDocument();
  consoleError.mockRestore();
});
