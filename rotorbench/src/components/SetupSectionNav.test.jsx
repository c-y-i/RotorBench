import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SetupSectionNav from "./SetupSectionNav";
import { getA11yViolations } from "../test/a11y";

const originalScrollIntoView = Element.prototype.scrollIntoView;
const originalMatchMedia = window.matchMedia;

function renderTargets() {
  return render(
    <>
      <SetupSectionNav
        label="Test sections"
        items={[
          { id: "section-a-title", label: "Alpha" },
          { id: "section-b-title", label: "Beta" },
        ]}
      />
      <section>
        <h2 id="section-a-title">Alpha section</h2>
      </section>
      <section>
        <h2 id="section-b-title">Beta section</h2>
      </section>
    </>,
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
  });
});

test("jumps to the selected section and focuses its heading", () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => ({ matches: false })),
  });
  renderTargets();

  fireEvent.click(screen.getByRole("button", { name: "Beta" }));

  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    block: "center",
    behavior: "smooth",
  });
  expect(screen.getByRole("heading", { name: "Beta section" })).toHaveFocus();
});

test("uses instant scrolling when reduced motion is requested", () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => ({ matches: true })),
  });
  renderTargets();

  fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    block: "center",
    behavior: "auto",
  });
});

test("has no structural WCAG A or AA violations", async () => {
  const { container } = renderTargets();
  expect(await getA11yViolations(container)).toEqual([]);
});
