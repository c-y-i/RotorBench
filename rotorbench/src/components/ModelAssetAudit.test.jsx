import React from "react";
import { render, screen, within } from "@testing-library/react";
import ModelAssetAudit from "./ModelAssetAudit";
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
