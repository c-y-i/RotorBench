import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AerialKitPlanComparisonEvidence from "./AerialKitPlanComparisonEvidence";
import { getA11yViolations } from "../test/a11y";

const comparison = {
  target: { name: "SpeedyBee F405 V5" },
  generatedAt: "2026-11-22T12:01:00.000Z",
  currentPlanMatches: true,
  summary: {
    compared: 2,
    matched: 0,
    differing: 1,
    notObserved: 1,
  },
  source: {
    statusObservedAt: "2026-11-22T12:00:00.000Z",
  },
  parameters: [
    {
      id: "fc-param-arm-channel",
      parameter: "arm_channel",
      status: "fail",
      expected: "6",
      detail: "Board-reported arm_channel=5; the staged plan expects 6.",
    },
    {
      id: "fc-param-dshot-khz",
      parameter: "dshot_khz",
      status: "unverified",
      expected: "300",
      detail: "The board-reported evidence does not include dshot_khz.",
    },
  ],
};

test("renders validated plan-comparison rows without claiming hardware readiness", async () => {
  const { container } = render(
    <AerialKitPlanComparisonEvidence comparison={comparison} />,
  );

  expect(screen.getByText("Validated plan comparison")).toBeInTheDocument();
  expect(screen.getByText("2 checked · current plan matches")).toBeInTheDocument();
  expect(screen.getByText("Artifact structure and counts validated")).toBeInTheDocument();
  await userEvent.click(screen.getByText("Validated comparison rows"));
  expect(screen.getByRole("listitem", {
    name: /arm_channel: Differs\. Board-reported arm_channel=5/,
  })).toBeInTheDocument();
  expect(screen.getByRole("listitem", {
    name: /dshot_khz: Not observed/,
  })).toBeInTheDocument();
  expect(screen.getByText(/hardware behavior.*RF performance.*flight readiness remain unverified/i))
    .toBeInTheDocument();
  await expect(getA11yViolations(container)).resolves.toEqual([]);
});
