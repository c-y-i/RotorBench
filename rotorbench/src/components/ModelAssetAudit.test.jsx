import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ModelAssetAudit, { createModelSourceReport } from "./ModelAssetAudit";
import { getA11yViolations } from "../test/a11y";

test("separates catalog GLBs from generated fallback geometry", async () => {
  const { container } = render(<ModelAssetAudit parts={{
    frame: { id: "frame-aos-35-v51", name: "AOS 3.5 V5.1" },
    flightController: {
      id: "fc-holybro-kakute-f7",
      name: "Kakute F7 AIO",
    },
  }} />);

  expect(screen.getByText("Model sources")).toBeInTheDocument();
  expect(screen.getByText("1 catalog / 1 fallback")).toBeInTheDocument();
  const list = screen.getByRole("list", {
    name: "Selected component model sources",
  });
  const frame = within(list).getByLabelText("Frame model source");
  const controller = within(list).getByLabelText("Flight controller model source");
  expect(frame).toHaveTextContent("Generated fallback");
  expect(controller).toHaveTextContent("Catalog GLB");
  expect(controller).toHaveTextContent("legacy normalization unverified");
  await expect(getA11yViolations(container)).resolves.toEqual([]);
});

test("omits the audit when no modeled parts are selected", () => {
  const { container } = render(<ModelAssetAudit parts={{}} />);
  expect(container).toBeEmptyDOMElement();
});

test("copies a portable model-source report without promoting fallback geometry", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const parts = {
    frame: { id: "frame-aos-35-v51", name: "AOS 3.5 V5.1" },
    flightController: {
      id: "fc-holybro-kakute-f7",
      name: "Kakute F7 AIO",
    },
  };
  render(<ModelAssetAudit parts={parts} />);

  fireEvent.click(screen.getByRole("button", { name: "Copy model sources" }));

  expect(writeText).toHaveBeenCalledWith(createModelSourceReport(parts));
  const report = writeText.mock.calls[0][0];
  expect(report).toContain("Catalog GLBs: 1");
  expect(report).toContain("Generated fallbacks: 1");
  expect(report).toContain("Frame: AOS 3.5 V5.1 | Generated fallback geometry");
  expect(report).toContain("legacy normalization unverified");
  expect(report).toContain("No hardware verification is claimed");
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Planning geometry metadata only; no hardware verification.",
  );
});
