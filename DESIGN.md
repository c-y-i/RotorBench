---
name: RotorBench
description: A source-backed FPV build and hardware bench workbench.
colors:
  muted-shell: "#d9ddd6"
  cool-mist: "#cbd7cd"
  warm-sand: "#ead7c1"
  work-surface: "#f6f4ed"
  soft-surface: "#e9e8e0"
  raised-surface: "#fcfbf6"
  instrument-ink: "#101816"
  secondary-ink: "#4a5a55"
  faint-ink: "#5d6c67"
  quiet-line: "#c4cac3"
  strong-line: "#98a49d"
  bench-teal: "#08736a"
  deep-teal: "#044e49"
  pale-teal: "#d2e9e3"
  signal-lime: "#d5ff4f"
  signal-lime-deep: "#b7e52d"
  signal-ink: "#10150e"
  flight-orange: "#e95418"
  flight-orange-soft: "#ffeadf"
  pass-green: "#086b45"
  caution-orange: "#91400a"
  failure-red: "#aa252b"
  sidebar-black: "#0a100f"
  sidebar-raised: "#17211e"
  sidebar-text: "#f7f8f1"
  sidebar-muted: "#91a29d"
typography:
  display:
    fontFamily: "Archivo, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "Archivo, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.045em"
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 600
rounded:
  control: "7px"
  card: "10px"
  panel: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.instrument-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.instrument-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  panel:
    backgroundColor: "{colors.work-surface}"
    textColor: "{colors.instrument-ink}"
    rounded: "{rounded.panel}"
---

# Design System: RotorBench

## Overview

**Creative North Star: "The Flight Bench"**

RotorBench should feel like a well-organized workbench for planning, assembling, and reviewing an FPV aircraft. Instrument panels, compact measurements, and explicit state labels carry the personality. The interface is dense where operators compare data and generous where they must avoid a mistaken hardware action.

The world is matte, technical, and legible rather than decorative. Dark instrument surfaces establish the work area; warm neutral pages keep long forms readable; teal carries configuration identity; signal-lime is reserved for primary action and confirmed active state. Warnings, failures, and imported evidence remain visibly distinct from verified hardware.

**Key Characteristics:**
- Source-backed data with visible uncertainty
- Matte flight-bench surfaces and signal-lime actions
- Archivo for interface voice and IBM Plex Mono for measurements
- Compact instrument panels, clear sections, and explicit safety boundaries
- Responsive workbench layouts rather than a fixed phone shell

## Colors

The palette combines warm workshop neutrals with a dark instrument sidebar, restrained teal structure, and a high-visibility lime action signal.

### Primary
- **Signal Lime** (`#d5ff4f`): Primary actions, active navigation, and deliberate high-attention controls.
- **Bench Teal** (`#08736a`): Configuration icons, secondary emphasis, and technical section identity.

### Secondary
- **Flight Orange** (`#e95418`): Review and caution-adjacent emphasis, never the default success color.

### Neutral
- **Muted Shell** (`#d9ddd6`): Page background.
- **Work Surface** (`#f6f4ed`): Panels and content surfaces.
- **Raised Surface** (`#fcfbf6`): Inputs, elevated rows, and readable controls.
- **Instrument Ink** (`#101816`): Primary text and dark instrument panels.
- **Secondary Ink** (`#4a5a55`): Explanations and metadata.
- **Quiet Line** (`#c4cac3`): Standard divider and border.
- **Sidebar Black** (`#0a100f`): Persistent navigation surface.

**The Signal Rule.** Lime marks action or active state; it is not a decorative accent for every card.

## Typography

**Display Font:** Archivo with Segoe UI fallback  
**Body Font:** Archivo with Segoe UI fallback  
**Label/Mono Font:** IBM Plex Mono with system monospace fallback

**Character:** Archivo gives the workbench a compact, contemporary voice. IBM Plex Mono is reserved for measurements, identifiers, command text, parser state, and tabular data.

### Hierarchy
- **Display** (700, 36px, 1.08): Page titles and operational headings.
- **Title** (650, 18px, 1.25): Sections and panel headings.
- **Body** (400, 16px, 1.5): Long explanations and form copy.
- **Meta** (400, 13px, 1.5): Secondary descriptions.
- **Label** (600, 11px, uppercase, 0.045em): Instrument labels and compact status keys.

**The Measurement Rule.** Monospace is used when the content is data, a command, or a measured value, not as a generic “technical” costume.

## Layout

The app uses a fixed desktop navigation rail and a fluid content stage capped near 1380px. Main workflows commonly split into a primary work area and a supporting telemetry or summary rail, then collapse to one column on tablet and mobile. Mobile navigation moves to a bottom dock.

Spacing follows a 4/8/12/16/24/32/48 rhythm. Panels use 14px radius, internal spacing from 12–24px, and clear section separation. Controls maintain a 44px minimum height.

## Elevation & Depth

Depth is primarily tonal: warm page surfaces, lighter work surfaces, dark instrument areas, and quiet borders. Soft offset shadows are used sparingly for major raised panels. Inline evidence and configuration blocks use borders and surface tint rather than stacked floating cards.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 8px 22px rgba(18, 28, 24, 0.07)`): Major workbench panels.
- **Soft** (`box-shadow: 0 20px 46px rgba(18, 28, 24, 0.12)`): High-level overlays or temporary emphasis.

**The One-Elevation Rule.** A surface declares depth with either a border or a shadow system appropriate to its role; avoid ghost-card combinations that add both without meaning.

## Shapes

Controls use gently squared 7px corners. Cards use 10px and major panels use 14px. Pills and 999px radii are limited to compact status markers, segmented controls, and small chips. Instrument blocks and command surfaces may use tighter 3–5px radii.

## Components

### Buttons
- **Shape:** compact squared controls, 7px radius, at least 44px high.
- **Primary:** signal-lime background with signal ink.
- **Secondary:** raised surface, quiet border, instrument ink.
- **Hover / Focus:** visible border shift and a clear focus ring; disabled actions lose saturation and use a not-allowed cursor.
- **Danger:** failure-red treatment only for destructive or explicitly unsafe actions.

### Chips
- **Style:** compact mono labels with pale tonal backgrounds.
- **State:** lime for active/primary, pale teal for informational, warm tint for review, red tint for failure.

### Cards / Containers
- **Corner Style:** 10–14px.
- **Background:** work or raised surface.
- **Shadow Strategy:** tonal first; card shadow only for major panels.
- **Border:** one quiet line around separated work areas.
- **Internal Padding:** 12–24px based on density.

### Inputs / Fields
- **Style:** raised warm surface, quiet border, 7px radius, mono values where the field is measured data.
- **Focus:** strong visible ring and border shift.
- **Error / Disabled:** explicit text plus tinted state; never color alone.

### Navigation
- **Style:** dark rail on desktop, lime active block, compact muted labels; bottom dock on mobile with icon and text.

### Evidence Review
- **Style:** prominent boundary statement, evidence-stage chips, mono facts, line-by-line checks, and separate imported versus verified states.

### Assembly Viewer
- **Style:** dark instrument stage with controls above or beside the scene and an explicit audit of motor, propeller, stack, and battery placement.

### Measured Geometry
- **Style:** a collapsed workbench ledger with a pale-teal coverage summary, compact part selector, source label on every field, and IBM Plex Mono values.
- **Behavior:** one selected part is editable at a time; measurements remain build-local, show catalog provenance, and export as named records rather than silently replacing catalog data.
- **Controls:** 44px minimum inputs and reset actions, visible focus rings, explicit active-part state, and one-column field layout on narrow screens.

## Do's and Don'ts

### Do:
- **Do** keep planning, imported evidence, live observation, and hardware verification visibly distinct.
- **Do** use IBM Plex Mono for measurements, commands, IDs, and parser facts.
- **Do** retain 44px controls and test 390px and 1440px layouts.
- **Do** use quiet borders and tonal surfaces before adding shadows.

### Don't:
- **Don't** turn every section into an identical rounded card.
- **Don't** use lime as a broad decorative wash.
- **Don't** present estimated or imported data as manufacturer-verified or hardware-ready.
- **Don't** hide missing compatibility with a green badge.
- **Don't** use color without a text label or icon-equivalent cue.
