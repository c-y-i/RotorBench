# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

FPV builders, bench operators, and reviewers who need to plan a multirotor from source-backed parts, inspect a believable 3D assembly, configure a flight controller and ExpressLRS radio, and evaluate test evidence before touching hardware.

<!-- inferred from the repository, product copy, workflows, and HANDOFF.md; not a new user interview -->

## Product Purpose

RotorBench turns a collection of parts into a reviewable aircraft configuration. It combines catalog provenance, fit and electrical checks, estimated performance, 3D placement, hardware plans, copy-only commands, and read-only evidence review so users can find mismatches before a bench or flight session.

Success means the user can distinguish three states without ambiguity: a catalog-compatible build, a locally valid hardware plan, and evidence observed from or reported by real hardware.

## Positioning

RotorBench is a flight-bench workbench rather than a generic parts shopping cart. Its differentiator is the chain from a selected component set to a physically placed assembly, an Aerial Kit-inspired configuration plan, and traceable evidence that never silently upgrades a local plan into a hardware verification.

## Operating Context

Users work across Build, Setup, Saved, Compare, and Analysis. Hardware workflows happen props-off and may involve two Aerial Kit or ExpressLRS endpoints, a flight controller, serial adapters, internal logs, CRSF evidence, and `ak` command output. Imported files are selected locally and are not authenticity-verified.

RotorBench does not flash, arm, or mutate hardware. Live Web Serial requires explicit port selection: CRSF capture is receive-only, while the Aerial Kit status session sends only `HELLO`, `STATUS`, and `RC_CHANNELS` query frames.

## Capabilities and Constraints

- The frontend is React 18 and the backend is FastAPI. The runtime catalog is the shared `rotorbench/src/data/components.json`.
- Catalog entries must preserve published versus estimated fields, provenance URLs, dimensions, mounting metadata, and honest unavailable-model states.
- The assembly contract places four motors and propellers at frame mounts, stacks electronics in a defined order, and supports exploded inspection and measured fallbacks.
- Setup provides Aerial Kit-inspired flight-controller and radio planners, firmware-backed limits, channel mapping, binding identity previews, copy-only runbooks, read-only CRSF observation, and a separate opt-in AKP status session for identity, fresh armed state, and RC readback.
- Evidence review supports CRSF observations, pair/bench/capture files, FC status and preflight, radio device status, endpoint diagnostics, TX parameters, calibration extrema, revision scopes, and attachment summaries.
- Imported or live evidence never changes hardware readiness, never becomes flight authorization, and must remain visibly distinct from observed RF behavior.
- Binding phrases and direct UIDs must not be persisted. A stable identity fingerprint may be stored for scope comparison.
- Missing or uncertain compatibility data remains unverified rather than becoming a pass.

## Brand Commitments

The product name is RotorBench. Its voice is direct, technical, and safety-conscious. Source-backed truth, visible uncertainty, and the distinction between planning and hardware observation are binding commitments.

## Evidence on Hand

- Product state and workflow details: `HANDOFF.md`
- Catalog and source metadata: `rotorbench/src/data/components.json`
- Assembly and viewer logic: `rotorbench/src/assembly/`, `rotorbench/src/components/BabylonViewer.jsx`
- Hardware planning: `rotorbench/src/data/flightControllerProfiles.js`, `rotorbench/src/data/radioProfiles.js`, `rotorbench/src/components/SetupPage.js`
- Evidence review: `rotorbench/src/utils/benchEvidence.js`, `rotorbench/src/utils/fcEvidence.js`, `rotorbench/src/utils/radioDeviceEvidence.js`, `rotorbench/src/utils/crsfCapture.js`
- Aerial Kit source used during review: `/home/cy/Projects/aerial-kit`

No claim of physical hardware qualification, flight readiness, RF range, or authenticity should be invented.

## Product Principles

1. Preserve provenance and uncertainty at every layer.
2. Make the physical assembly auditable, not merely illustrative.
3. Keep planning, imported reports, live observations, and verified hardware states visibly separate.
4. Prefer fail-closed validation over coercing incomplete data into a green state.
5. Give every warning a clear review or recovery action.

## Accessibility & Inclusion

The web interface targets WCAG AA, keyboard operation, visible focus, reduced-motion support, responsive layouts, and explicit text labels for status rather than color alone.
