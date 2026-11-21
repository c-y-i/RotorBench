import React from "react";
import "../styles/setup-section-nav.css";

export default function SetupSectionNav({ label, items = [] }) {
  const jumpToSection = (headingId) => {
    const heading = document.getElementById(headingId);
    const section = heading?.closest("section") || heading;
    if (!heading || !section) return;

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    section.scrollIntoView?.({
      block: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  };

  if (items.length === 0) return null;

  return (
    <nav className="setup-section-nav" aria-label={label}>
      <span>Jump to</span>
      <div className="setup-section-nav-items">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => jumpToSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
