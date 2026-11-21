import axe from "axe-core";

export async function getA11yViolations(container) {
  const results = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
    rules: {
      // jsdom has no layout engine, so colour contrast remains a rendered-browser check.
      "color-contrast": { enabled: false },
    },
  });
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target),
  }));
}
