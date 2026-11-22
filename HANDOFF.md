# RotorBench handoff

## How to use this document

Read this file before changing the project. Inspect `git status --short --branch` and `git log -1 --oneline`; do not assume a stale worktree or commit from this document. Preserve unrelated existing changes unless you have a clear reason to replace a specific part of them.

`PRODUCT.md` and `DESIGN.md` are now the durable Impeccable product and visual-system context. `DESIGN.md` records the incumbent Flight Bench world, exact color/type/spacing tokens, responsive layout, component rules, and machine-readable frontmatter. `.impeccable/design.json` is its component/token sidecar. Preserve these files when modernizing the interface.

The product is RotorBench, an FPV drone build configurator and performance analysis tool. The active goal has been to make the catalog useful and to make the 3D preview behave like an actual quad assembly rather than a collection of unrelated models.

## Latest session checkpoint (2026-11-22)

The UI and Aerial Kit-inspired configuration work now reaches the planning/evidence boundary directly:

* Setup has a hardware claim ledger that keeps `Requested`, `Echoed`, `Applied`, and `Persisted` separate. Importing a reviewed device identity or parameter snapshot updates the `Echoed` fact; RotorBench still leaves application and persistence unestablished.
* Evidence review accepts a read-only Aerial Kit identity report containing `protocol: "akp"`, protocol version, product, parameter count, changed count, capability word, and configuration hash. `features: null` is rendered as an older firmware that cannot report its capability word; `features: 0` is rendered as a reported word with no known bits. The HELLO `version` is labelled as the protocol version, not a firmware release.
* The capability panel names the compiled bits (`PARAM_INFO`, `APPLIES_ON_WRITE`, `GATES_ON_ARMED`, `RC_CHANNELS`, `PREFLIGHT`, and the rest), preserves unknown bits, and states that a capability claim does not prove a command was sent, applied, or persisted.
* Flight-controller feature chips now name unavailable board-profile features in place, with visible reasons and accessible descriptions, instead of relying on hover titles.
* The Build desktop command bar is in document flow rather than covering the canvas/manifest; its phone layout remains sticky above the bottom navigation.
* The phone starter-platform filters scroll in one row so the first real source build is visible in the initial viewport.
* Empty Analysis now uses the same open workbench header as Compare instead of a detached white utility band.
* Radio warnings now say when a dual-band receiver has only one of its documented bands configured by the selected transmitter, even when some shared coverage exists.

Verification at this checkpoint: `66` frontend suites and `677` tests pass, the production build succeeds, and the Impeccable mechanical detector reports no findings. Latest relevant commits are `74f8e8d`, `e2dca58`, `3ce1b5f`, `716da97`, `860d8b2`, and `8bb7e28`.

The next highest-value feature remains an explicit, opt-in, read-only Aerial Kit FC session for HELLO/STATUS/RC polling with stale-state handling. Do not fold that into the current local-plan or CRSF capture components, and do not add writes, arming, flashing, or RF-pass claims until the separate capability-gated session layer and hardware evidence support them.

## Current product state

The frontend is a React 18 app under `rotorbench/`. The backend is FastAPI under `backend/`. The runtime component catalog is `rotorbench/src/data/components.json`, and the backend reads that same file through `backend/utils/component_data.py`.

The catalog now has 92 unique components:

| Category | Count |
| --- | ---: |
| Frames | 12 |
| Motors | 17 |
| Propellers | 12 |
| Batteries | 11 |
| ESCs | 9 |
| Flight controllers | 12 |
| Receivers | 19 |

The catalog began at 25 items. Sixty-seven component entries have been added across multiple passes, including a complete AOS 3.5 V5.1 / T-Motor F1404 / Gemfan 3520 / Tattu 850 / SpeedyBee 20×20 stack platform. Recent passes add an expanded ExpressLRS receiver set, F1404 KV variants, iFlight XING2 2207 1855KV/2755KV options, Tattu and CNHL 6S packs, Holybro Tekko32 F4 50A/65A, iFlight BLITZ E55, Holybro Kakute F722 and H7 V2, SpeedyBee F405 V5 and OX32 55A, a higher-pitch Gemfan 51499 propeller, a FlyFishRC Volador II VX5 frame, the Adafruit Feather STM32F405 Express, Matek H743-WING V3, and a complete HeeWing T1 Ranger wing platform. New entries include source URLs, price source URLs where available, dimensions, mounting metadata where known, and explicit `modelStatus: "not_available"` when the repository has no matching mesh. Derived values such as fallback mounting offsets, estimated receiver current draw or channel count, estimated thrust curves, and estimated discharge curves are listed in `estimatedFields`.

The latest receiver entry is the RadioMaster XR4 Gemini Xrossband, adding a dual-band, true-diversity form factor rather than another RP-series variant. Published 1.7 g weight, 22×18×4 mm envelope, dual LR1121 RF chips, 2.4 GHz/Sub-G 900 MHz support, 100 mW telemetry, refresh-rate range, 4.5–8.4 V input, ExpressLRS 3.5.1 firmware, CRSF interface, and $34.99 price are retained. Current draw, channel count, and mounting offset remain explicitly estimated because the manufacturer page does not publish them. The receiver picker surfaces the dual bands and telemetry power, and stacks price beneath the catalog copy at phone widths so long model names no longer force horizontal scrolling.

The remaining legacy `rx-elrs-24g` placeholder is now identified from its bundled STEP product metadata as the JHEMCU EP24S ExpressLRS Receiver. The catalog records the sourced 2.4 GHz band, CRSF protocol, 0.5 g weight without antenna, 11×11×3 mm envelope, GetFPV product/price source, and the existing catalog GLB binding. Current draw, channel count, and mounting offset remain estimated. A catalog invariant now requires every receiver to provide protocol, at least one RF band, and an HTTPS source URL; all fourteen entries satisfy it. The long JHEMCU name rendered cleanly in the receiver picker at 390×844 without horizontal overflow and remains source-backed with explicit estimated fields.

The receiver catalog now includes the RadioMaster Bandit BR3 and BR1 ExpressLRS 900MHz receivers. Official product data supplies the `Sub-G 900 MHz` band, CRSF interface, Semtech SX1276 RF chip, and Wi-Fi updates for both. The BR3 records 500 mW adjustable telemetry, 4.5–8.4 V input, a 24×14.2 mm planform, 5.5 g with two T antennas, and $24.99. The compact BR1 records 50 mW / 17 dBm telemetry, 5 V input, an 18×13.8 mm planform, 2.9 g with its T antenna, and $19.99. Current draw, channel count, and mounting offset remain explicitly estimated. Both receivers share a normalized sub-GHz band with all three Bandit transmitter profiles and the dual-band XR4, so the radio/configuration flow can validate a complete 900 MHz link without treating product-name similarity as evidence.

The receiver catalog also includes the RadioMaster ER6 and ER8 2.4GHz ELRS PWM receivers. RadioMaster documents six or eight PWM outputs, CRSF and SBUS serial output, 4.5–8.4 V input, a 4.0–35 V telemetry sensing range, 100 mW telemetry, 2.4 GHz operation, ExpressLRS 3.3.0, dual 20 cm antennas, Wi-Fi/WebUI updates, and 43×15 mm planforms. The ER6 records 25 mm depth, 14.5 g, and $24.99; the ER8 records 30 mm depth, 16.5 g, and $34.99. Serial channel count, current draw, and mounting offset remain explicitly estimated. The receiver picker and source-backed assembly notes expose PWM output count separately from the estimated sixteen-channel serial capability.

The receiver catalog now also includes the compact RadioMaster ER3C-i, ER5C-i, and ER4 PWM receivers. Official storefront data supplies three, five, or four PWM outputs; 4.2 g / 26.1×18.5×13 mm, 5.0 g / 30×18.5×13 mm, and 3.0 g / 30×15×5 mm respectively; 4.5–8.4 V input; 4.0–35 V telemetry sensing; 10 mW telemetry; ExpressLRS 3.3.0; Wi-Fi/WebUI updates; and $16.99, $19.99, and $14.99. Current draw, serial channel count, and mounting offsets remain explicitly estimated. These three products are marked `outputMode: "pwm"` because their official pages publish PWM outputs but no serial route. Wiring now reports `PWM outputs only · no serial route published` and does not invent a CRSF UART, pin map, or baud for them. A saved PWM-only receiver plan retains a topology review item, so it cannot report as a clear serial setup. The status propagates through Build, Saved, Compare, Analysis, hardware readiness, and briefings while the ER6/ER8 remain serial-plus-PWM products. The backend Receiver schema now retains frequency bands, PWM outputs, output mode, RF chips, telemetry power, voltage ranges, firmware, antenna, serial protocols, and Wi-Fi capability instead of dropping those fields during hydration.

The receiver catalog now includes the RadioMaster ER5A 2.4GHz ELRS PWM Receiver. The official product page supplies five PWM outputs, 4.5–8.4 V input, 6.6 g weight, 37×19×13 mm dimensions, a supplied T antenna plus spare long antenna, ExpressLRS 2.0 pre-installed with five proportional channels on ExpressLRS 3.x, CRSF, and $19.99. It is classified as PWM-only because the page publishes no serial route. Current draw, serial-channel count, and mounting offset remain explicitly estimated; telemetry power and serial protocols are absent rather than inferred. The receiver picker shows `5 PWM outputs · PWM-only topology` and includes it in the `PWM only` facet with 44 px controls, no overflow, and zero axe violations at 390×844.

The Flight Controller setup now reflects that topology directly. For a PWM-only receiver, the Control path shows the documented PWM channel count instead of a serial route. The Receiver and serial section removes Protocol, Receiver UART, and Line rate controls and replaces them with a ruled warning that no serial pins or baud were inferred. The expandable wiring checklist uses PWM-specific steps and never emits a CRSF TX/RX route. The rendered state passed axe at 390×844 and 1440×900 with no page overflow.

The receiver picker now separates `PWM outputs` from `PWM only`. The latter facet matches `outputMode: "pwm"` and card metadata explicitly names `PWM-only topology`; serial-plus-PWM ER6/ER8 products remain in the broader PWM-capable filter. The expanded five-option radio facet row rendered without overflow or axe violations at both target widths.

The receiver catalog also includes the RadioMaster RP4TD-M ExpressLRS Mini Diversity receiver. The official product page documents 1.0 g without antennas, an 18.1×16.0 mm board, two SX1281 RF chips, 2.4 GHz operation, 2×10 mW telemetry, 500 Hz/F1000 Hz maximum refresh, 5 V input, ExpressLRS 3.4.3 firmware, two 65 mm T antennas, CRSF, Wi-Fi updates, and $19.99. The uninstructed 4 mm board height, current draw, channel count, and mounting offset remain explicitly estimated. The part picker now allows long product names to wrap to two lines instead of truncating them while preserving the existing no-overflow mobile layout. It also names the estimated fields directly, such as `current draw`, `channels`, and `mounting offset`, instead of showing only an opaque count.

The part picker now has a source-review view beside its search field. It lists the products in the current filtered result set with product, price, and connector-source links where available, so a builder can inspect manufacturer evidence before selecting or changing a part. The source view remains usable on touch and keyboard, uses labelled 44 px links, keeps the dialog scrollable, and provides an explicit empty state with a way back to catalog parts when filters produce no references. It does not turn a price-only reference into a product-source-backed claim.

The picker also offers an `Evidence: strongest` sort. It ranks a catalogued product source ahead of a legacy entry, then ranks fewer estimated fields ahead of more, with name as the final tie-breaker. This ordering never hides conflicts or changes compatibility status. A zero-result catalog or source view now includes a 44 px `Reset search and filters` action. The empty state lives outside the listbox role so its button does not become an invalid listbox child. Both states rendered at 390×844 and 1440×900 with zero axe WCAG A/AA violations and no horizontal overflow.

Flight-controller picker rows now distinguish `Documented setup map` from `Custom mapping required` before selection. The status comes from the same catalog-to-board profile resolver used by Setup, so a controller with a documented UART/pin map is discoverable without opening Setup first. The eleven-controller catalog reports eleven documented setup maps and exposes each profile's motor and servo output budget before selection. A catalog invariant now fails if any flight controller lacks a profile or if two profiles claim the same catalog ID.

Category-aware catalog facets now make the larger hardware set usable without adding more undifferentiated chips. Flight controllers can be filtered by Aerial Kit, Betaflight, INAV, or ArduPilot before selection. Receivers can be filtered by 2.4 GHz, Sub-G 900 MHz, dual band, or PWM outputs. Facets compose with search, compatibility, source, geometry, and sort state, including the source-review view. The six-row picker layout was corrected so the facet row receives its own grid track instead of clipping into results. The firmware and radio states rendered at 390×844 and 1440×900 with all controls visible, 44 px targets, no horizontal page overflow, and zero axe WCAG A/AA violations.

Starter-platform cards now summarize the same five catalogued physical interfaces used by the Build walkthrough: frame-to-motor mount, motor-shaft-to-prop bore, FC-to-frame stack, ESC-to-frame stack, and battery-to-ESC power termination. Cards report `5 joints matched`, a mixed `4 matched · 1 verify`, or a conflict count before launch. The summary is derived by the shared compatibility helpers rather than duplicated UI logic, and the accessible description states that these are catalogued interfaces rather than a physical inspection. The full starter gallery rendered at 390×844 and 1440×900 with the new state visible, no horizontal overflow, and zero axe violations.

The Build power path now converts connector mismatches into an actionable plan. A conflict such as XT30 battery to XT60 ESC reports `XT30-to-XT60 adapter`, offers adapter-or-retermination guidance, and requires connector-gender confirmation. Every populated battery/ESC path also keeps a separate `Polarity and connector gender` inspection row stating that red/black polarity must be verified against the ESC markings before first power. This guidance is derived from catalog connector state and remains a manual physical check; it does not claim adapter fit, polarity, or wiring was verified.

The external Claude worktree at `.claude/worktrees/physical-compat` was audited against current `main`. Its catalog, picker, physical-check, exploded-view, camera, saved-build, comparison, and build-sheet directions are already represented in the current implementation, while `main` has since expanded the catalog to 82 products and added the Aerial Kit configuration work. No unintegrated Claude patch was applied.

The frame catalog now includes the AOS 5 V5. AOS publishes 5.3-inch prop support and 30.5×30.5, 25.5×25.5, and 20×20 mm stack interfaces plus 16×16 and 19×19 mm motor interfaces. The official iFlight frame-kit page documents the 228 mm wheelbase, 180×140×34 mm envelope, 6 mm arms, 20 mm maximum stack height, 129 g AOS frame weight, and $79 price. Motor coordinates are derived from the square 228 mm wheelbase and remain explicitly estimated, as does the assembly stack height. The picker exposes the new frame at both target widths with no horizontal overflow or WCAG A/AA violations; its H5 motor-pattern mismatch is surfaced before selection.

The first non-quad assembly platform is the HeeWing T1 Ranger. HeeWing documents the 730 mm wingspan, 645 mm length, 140 mm height, 205 g KIT weight, EPP construction, 350–500 g takeoff range, dual-motor power system, recommended FX1406-3150KV motors, FX-20A ESCs, FX-3830 propellers, and 2–4S/1300–5000 mAh battery range. RotorBench adds the frame with explicit two-position motor coordinates and a wing fallback shape, plus the FX1406, FX-3830, and a two-ESC set modeled as one selectable set. Motor mount positions, stack height, motor weight/current/shaft/mechanics, propeller weight/blade count/mechanics, the per-propeller allocation of the ten-piece prop pack, ESC burst/weight/envelope, and thrust curves are explicitly estimated where the manufacturer page does not publish a normalized value. The original starter preset uses the CNHL 4S 1500 pack and Matek F405-WMN/INAV board; all five electrical checks pass while mount/power details that remain missing are surfaced as manual review. A second `source-t1-ranger-h743` starter keeps the same T1 airframe, twin motors, propellers, ESC set, battery, and RP4TD-M receiver while substituting the Matek H743-WING V3 and its documented ArduPilot output map. The transform contract now consumes a frame's ordered `motorPositionsMm`, so the viewer places exactly two motors and two props instead of forcing a quad layout. The wing state rendered with two visible prop stations, left/right prop-direction mapping, no horizontal overflow at 390×844 or 1440×900, and the same planning-not-verification boundary.

Analysis now surfaces the official T1 Ranger flight envelope: `350–500 g takeoff`, `25 km/h minimum`, and a `PNP 1.71:1 T/W reference`, with the explicit boundary that the PNP figure is not a RotorBench build estimate. It also compares the planning weight against the published takeoff range and reports the exact over/under difference. Planning weight is now consistent across Analysis, Saved, Compare, and the comparison export: `456 g` of catalogued parts plus the existing disclosed `50 g` allowance for wiring, fasteners, and camera hardware. The current source-backed T1 build estimates `506 g`, so it renders `+6 g over 500 g envelope` as a compact Saved/Compare state and `6 g over the 500 g published maximum` in the detailed caution treatment while retaining `verify with a scale`; this is not a measured takeoff weight or flight sign-off. The API envelope schema exposes only the envelope fields, and the rendered state passed axe WCAG A/AA with no horizontal overflow at both target widths.

The Build manifest now shows live planning totals as components change: catalog parts plus the disclosed `50 g` allowance, catalog price, selected-part count, and any published takeoff-envelope fit. The T1 starter renders `506 g`, `$297.89`, and `+6 g over 500 g envelope`. Saved and shared build objects now persist the computed planning weight instead of a placeholder `0`. Backend analysis now prices propellers by the frame's motor count as well, so the live T1 API returns the same `506 g` and `$297.89` as Build, Saved, and Compare; it previously hard-coded four propellers and reported `$298.41`. The Home starter cards and telemetry now call the value planning weight and disclose the `50 g` allowance instead of presenting it as measured all-up mass. The two-column ledger keeps weight and price together and spans the envelope across the full rail width; it rendered without overflow and with zero axe WCAG A/AA violations at 390×844 and 1440×900.

Portable exports now carry the same planning posture. The human-readable Build briefing includes planning weight, catalog price, and any published takeoff-envelope fit in a dedicated section. The versioned analysis report includes a machine-readable `planning` object with catalog weight, allowance, total weight, price, published range, status, and long/short labels, explicitly scoped as catalog planning rather than measured takeoff mass. Focused export and Build tests cover the T1 `506 g` / `$297.89` / `+6 g over 500 g envelope` path.

Build-sheet exports now include the same machine-readable planning object, and importing a build sheet recomputes `totalWeight` from its catalog selections instead of restoring the previous placeholder `0`. The T1 build sheet reports `456 g` catalog parts, the disclosed `50 g` allowance, `506 g` total, `$297.89`, and `+6 g over 500 g envelope`.

Combined hardware-plan import now stages a validated file for review instead of applying it immediately. The review lists every changed flight-controller and radio field with before/after values, excludes binding/UID material, states that nothing was sent or saved, and provides explicit Apply and Cancel actions. The diff covers nested feature flags and radio channel maps. The review renders as a single bordered staging panel, keeps its scroll region keyboard-focusable, and passed axe WCAG A/AA at 390×844 and 1440×900. A fresh audit of the external Claude `feat/physical-compat` worktree found no commits newer than 2026-11-19; its work remains represented in current `main`.

Read-only CRSF observation now states `Armed state unknown` whenever the decoded-observation panel is open. The warning explains that serial capture cannot establish a disarmed aircraft and directs props-off handling; it does not infer arming from channel frames, flight-mode telemetry, link statistics, or a successful USB read.

The generated T1 wing fallback now uses a smooth elliptical planform scaled to the published 730×645 mm envelope rather than a rectangular box. It keeps the central fuselage, motor nacelles, estimated servo locations, prop stations, front orientation, and generated-fallback disclosure. This remains a proportion and placement aid, not a product-exact mesh; no catalog GLB status is claimed.

Generated frame, motor, and servo fallbacks now use a lighter instrument palette so their silhouettes remain legible on the dark preview without disappearing on the light background choices. The frame tone has at least 3.14:1 contrast against the default dark-blue and black backgrounds and 4.26:1 against white; motor caps, propeller blades, battery, and board colors still differentiate the remaining component roles. The T1 top view now makes the wing, fuselage, twin prop stations, and central hardware stack visible together. These colors clarify generated geometry and do not present the fallback as a product-exact model.

Saved Aerial Kit wing plans now carry their ordered motor outputs into Build. For the twin-motor elevon-wing mixer, Hardware readiness exposes `1 Left pusher CCW`, `2 Right pusher CW`, and derives the matching props-out default without pretending those are quad corners. The T1 prop map renders `OUT 1` on the left and `OUT 2` on the right, includes the wing mixer outputs in the accessible description and copied map, and retains the boundary that the mapping is not wiring or direction verification. The mapped wing state rendered at both target widths with no horizontal overflow and zero axe violations.

The T1 frame now carries its source-backed control-surface hardware package. HeeWing documents the 7 g digital metal-gear servo, 180 mm aileron and 400 mm tail variants, and $10 unit price. RotorBench models three servos as one frame-recommended set: 21 g and $30 total, with the inferred two-short/one-long cable allocation labeled estimated. Build exposes a `Control-surface hardware` card with the source, weight, price, voltage, allocation, and planning boundary; the 3D wing includes three estimated servo bodies with a `Servos` visibility toggle. Frame add-on weight and price now flow into starter totals, saved comparisons, backend analysis, and portable BOM rows without pretending the servos are separate picker selections. Servo placement, dimensions, voltage, and cable allocation remain manual estimates; direction and travel remain the saved flight-controller plan. The hardware state rendered at 390×844 and 1440×900 without overflow and zero axe violations.

Control-surface hardware now reports saved firmware output coverage instead of treating every catalogued servo as mapped. Hardware readiness compares the frame's servo quantity with the flight-controller plan's servo outputs and distinguishes `Servo map not saved`, `Servo map unavailable`, `2/3 outputs mapped`, complete coverage, and extra outputs. The T1's Aerial Kit elevon plan therefore exposes a review state with one catalogued servo output still unassigned. This state flows into Build, the catalog-backed saved summaries, hardware-plan sanitization, and the portable readiness data; it does not infer what the third servo controls or invent a missing mixer output. The review state rendered at both target widths with no horizontal overflow and zero axe violations.

Servo-output coverage now follows the build outside Setup and Build as well. Saved cards render the `2/3 outputs mapped` review chip, Compare has a dedicated `Servo output coverage` row, and copied build briefings retain the explanation that one catalogued servo output remains unassigned by the saved mixer. Hardware-plan sanitization also preserves the count, status, label, and detail while still excluding binding material and raw capture data. Saved rendered the coverage chip at 390×844 and 1440×900 without horizontal overflow.

The same coverage check is now part of Setup validation. Setup carries the selected frame's catalogued servo quantity into the flight-controller planner; an Aerial Kit mixer with fewer servo outputs produces a `Catalogued servo hardware exceeds this mixer` review item and a warning in the plan summary. The item focuses the Servo outputs heading, which is now programmatically focusable. The T1 therefore reports that the selected frame carries three control-surface servos while the planned twin-motor elevon mixer exposes two. The Setup state rendered at both target widths with no horizontal overflow and zero axe violations.

Fixed-wing analysis now fails closed by airframe shape rather than relying accidentally on a missing propeller thrust curve. The backend still returns catalog weight, component cost, compatibility checks, and warnings, but deliberately sets multirotor thrust-to-weight, power, hover, speed, range, endurance, discharge, and throttle-profile outputs unavailable for `airframeShape: "wing"`. The response carries a fixed-wing-specific explanation that the current performance engine is multirotor-only, and validates a warning to the same effect. This prevents a future wing thrust curve from silently activating formulas that were not modeled for fixed-wing flight.

Analysis now shows the full T1 hardware context rather than only the seven picker categories. The selected-components section includes the frame-integrated `HeeWing FX-7G Digital Metal Gear Servo Set` with its three-servo count, weight, and metal gears, while the hardware facts include control-surface hardware and saved servo-output coverage. The live T1 analysis rendered at 390×844 and 1440×900 with the fixed-wing performance-unavailable verdict, source-backed servo row, `Servo map not saved` state, total weight, and total cost, with no horizontal overflow.

The frame catalog now also includes the FlyFishRC Volador II VX5 O4. FlyFishRC documents the 225 mm wheelbase, 177×165 mm footprint, 177.4 g weight with TPU parts, 5–5.1-inch prop support, 16×16 mm motor mounts, 20×20 and 30.5×30.5 mm stack mounts, integrated XT60 tail connection, and $69.90 price. The vertical envelope, stack height, and motor coordinates remain explicitly estimated because the manufacturer page does not publish all three for the assembly model. The corresponding 51499 starter build loads four motors, four propellers, the FC/ESC stack, battery, and receiver with five verified electrical checks and an explicit manual-verification note for the soldered ESC pads.

The flight-controller catalog now includes the SpeedyBee F405 V5. SpeedyBee documents STM32F405, ICM42688P, 3–6S input, 16 MB onboard blackbox, Type-C USB, Bluetooth tuning and firmware upgrade, six UARTs, 30.5×30.5 mm mounting, 39×39×4.9 mm dimensions, and 8.1 g weight. RaceDayQuads records the $73.99 FC-only price. Only the fallback mounting point is estimated. The ten-option flight-controller picker renders the new controller with clean wrapping, no horizontal overflow, zero axe WCAG A/AA violations, 44 px controls, and explicit source provenance.

The flight-controller catalog now includes the Holybro Kakute F722. Holybro documents STM32F722, ICM42688P, BMP280 or SPA06 barometer, AT7456E OSD, 16 MB blackbox, 3S–8S input, 9 V/3 A and 5 V/2 A BECs, 35×35 mm planform, 30.5×30.5 mm mounting, six motor outputs, five UARTs, and a $79 price. The official manual maps the receiver connector to UART2 pin 3 RX / pin 4 TX and UART4 R4 to ESC telemetry; UART1, UART3, and UART6 remain documented serial pads without an invented peripheral assignment. RotorBench keeps GPS unassigned and requires an external SBUS inverter because the manual does not claim built-in inversion. Only the fallback mounting point remains estimated.

The flight-controller catalog now includes the Adafruit Feather STM32F405 Express as a public Aerial Kit board. Adafruit documents the STM32F405, USB-C, microSD/SDIO, 2 MB SPI flash, 52×23×10 mm board envelope, 6.2 g weight, and $39.95 price. RotorBench binds this product to the existing `feather-f405` profile: USART3 receiver pins PB10/PB11, two motor plus two servo outputs, internal flash and retained-RAM logging, no onboard GPS, barometer, or rangefinder, and the single-motor elevon-wing default. The optional LSM6DSO/BNO055 IMU, physical mounting point, and 5.5 V catalog voltage ceiling remain labeled estimates. Selecting the board now opens the wing-oriented configurator directly, including servo plumbing, hand-launch controls, command preview, and arm-gate planning. The rendered single-motor state uses singular copy, has no horizontal overflow at 390×844 or 1440×900, and remains a local plan rather than a hardware claim.

The existing Matek F405-WMN catalog entry now has documented INAV and ArduPilot board profiles instead of falling back to a custom map. Matek documents STM32F405RGT6, ICM42688-P, SPL06 barometer, AT7456E OSD, 16 MB blackbox, 2S–6S input, a 5 V/6 V servo BEC, 22×22 Φ2 mm mounting, twelve shared PWM pads, five UARTs, and a built-in UART2 RX inverter for SBUS. RotorBench maps UART2 to the receiver and exposes UART1/UART3/UART4/UART5 in the serial map; INAV stages UART4 as a GPS-capable route, while ArduPilot selects UART5 as GPS1 and leaves UART4 as GPS2. The board facts show `12 shared PWM pads`, and validation treats the outputs as a shared ceiling rather than allowing twelve motors plus twelve servos. Switching the firmware family preserves the Matek board identity and updates the documented serial roles. The rendered INAV and ArduPilot states had no horizontal overflow at 390×844 or 1440×900 and expose their source, UART assignments, blackbox, and unresolved channel mapping honestly.

The flight-controller catalog now includes the Matek H743-WING V3. Matek documents STM32H743VIT6, the V3 ICM42688P gyro, DPS310 barometer, OSD, 9–36 V input, 30.5×30.5 mm mounting, 54×36×13 mm dimensions, 30 g weight, seven UARTs, thirteen shared PWM outputs, CAN, dual I2C, microSD logging, and separate peripheral/video/servo BECs; GetFPV supplies the $141.99 price reference. RotorBench adds an ArduPilot-only documented profile rather than guessing INAV or Betaflight mappings: UART7/UART1/UART2/UART3/UART8/UART4/UART6 correspond to ArduPilot SERIAL1–7, GPS1 is UART2, GPS2 is UART3, and CRSF/ELRS receiver use on UART6 explicitly requires `BRD_ALT_CONFIG=1` plus a true UART RX path. The plan defaults to a two-motor elevon wing with thirteen shared PWM outputs. Firmware-family changes now prefer a map bound to the selected board before falling back, preventing a selected Matek from silently becoming another controller profile.

Documented ArduPilot receiver requirements now live in the board profile data rather than inside the evidence parser. H743 exposes `BRD_ALT_CONFIG=1` and `SERIAL7_PROTOCOL=23`; F405-WMN exposes `SERIAL6_PROTOCOL=23` for CRSF/ELRS on UART2. Flight Controller Setup renders these values under an `ArduPilot parameter plan` with an explicit read-only boundary, while imported Mission Planner, QGroundControl, or Aerial Kit-compatible snapshots compare against the same profile requirements. The card links back to the ArduPilot, hwdef, and Matek board references that supply those requirements. `Copy ArduPilot parameter plan` emits the board identity, exact runtime values, accepted snapshot formats, and a no-write/no-save boundary; `Review imported parameters` opens Bench tools and the bench runbook, scrolls to the evidence review, and focuses it in one action. The flight-controller summary includes the same names and values. The shared hardware-readiness model now retains the requirements through Build, Compare, build briefings, and sanitized analysis reports, so the receiver settings remain visible after leaving Setup without claiming they were observed or written. Build shows the exact values with `verify with imported snapshot`; Compare adds a dedicated ArduPilot-parameters row. The combined hardware-plan JSON also carries a first-class `flightController.parameterRequirements` array so portable-plan consumers do not need to infer receiver settings from nested profile data. Requirement derivation returns cloned objects, so editing an exported plan cannot mutate the board-profile source. Import re-derives those requirements from the selected profile and rejects stale, tampered, malformed, or unknown-profile metadata with an instruction to export a fresh plan; Setup surfaces that recovery message and does not stage the rejected file. The H743 mobile plan rendered with 44 px actions and source links, no overflow, and zero axe WCAG A/AA violations.

Two seeded H743 builds rendered with the documented parameter chip on Saved and the dedicated parameter row in Compare at 390×844. Saved used a compact wrapped chip; Compare retained its intended internal horizontal table scroll without page overflow. Both states passed axe WCAG A/AA, and focused UI tests now cover each view directly.

The Holybro Kakute H7 V2 catalog entry now resolves to a documented Betaflight profile. Holybro and ArduPilot document STM32H743, BMI270, BMP280, AT7456E OSD, 128 MB flash, 2S–8S input, 9 V VTX power, hardware inversion on every UART, eight motor outputs across two ESC connectors, and a separate LED PWM output. RotorBench maps UART6 to RC/receiver input, UART4 to GPS, UART7 to ESC telemetry, UART1 to VTX/user serial, UART2 to internal Bluetooth tuning, and UART3 to the default SmartAudio VTX port. The profile records that the board has no internal current sensor and warns against enabling the VTX pit switch with a DJI FPV remote controller. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and exposed all six UART roles, the 128 MB log, source references, and the unresolved flight-mode mapping honestly.

The Kakute F7 AIO catalog entry was corrected against ArduPilot and the official Betaflight target and now resolves to a documented `KAKUTEF7` profile. The catalog now records STM32F745 and either ICM20689 or MPU6000 instead of the legacy STM32F722/MPU6000 values. RotorBench maps UART1/UART2 telemetry, UART3 GPS, UART4 user serial, UART6 receiver, and UART7 ESC telemetry; all UARTs support hardware inversion. Six shared PWM pads, the AIO current sensor, microSD logging, and the ArduPilot `BRD_ALT_CONFIG=1`/`SERIAL6_PROTOCOL=23` requirement for a true R6 UART receive path are retained. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and exposed six UART roles, SPI4/IMU details, source references, and the unresolved flight-mode mapping honestly.

The MAMBA F722 MK2 catalog entry now resolves to a planning profile for the official `MAMBAF722_I2C` Betaflight target. The target documents six UARTs, four motor outputs, I2C, OSD, barometer support, 16 MB flash, and an SPI1 gyro at `CW180_DEG`, but it does not compile a default receiver or GPS UART. RotorBench therefore stages UART5 on the dedicated FPort/receiver pad as an editable receiver route and UART6 as a proposed GPS route, with explicit copy saying these are plan choices. The serial map records all six port pins, the profile keeps the target's MPU6000/MPU6500 gyro variants, and validation no longer treats the receiver-labelled UART5 as a conflicting peripheral. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and retains the unresolved flight-mode mapping honestly.

The iFlight Borg 5S RX catalog entry now resolves to the official `IFLIGHT_BLITZ_ATF435` Betaflight target. iFlight documents AT32F435RGT7, ICM42688, 4S–8S input, four motor outputs, 16 MB blackbox flash, a switched 12 V VTX BEC, UART1 VTX, UART2 ESC telemetry, UART4 built-in ELRS/SBUS receiver, and UART5 GPS/external serial. The catalog now records the official 6.8 g default weight and $39.99 source price. Receiver routing remains editable so UART5 can host an external receiver when it is not used for GPS, while unsupported barometer and exposed-I2C capabilities stay unavailable. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and exposed the four UART roles, integrated receiver, 16 MB log, source references, and unresolved flight-mode mapping honestly.

The SpeedyBee F405 Mini catalog entry now resolves to its official `SPEEDYBEEF405MINI` Betaflight target. The manufacturer documents UART1 DJI/VTX, UART2 receiver, UART4 Bluetooth MSP at 115200, UART5 ESC telemetry, UART6 GPS, and UART3 as the remaining user serial port, plus an 8 MB blackbox and 5 V/9 V BECs. The Betaflight target fixes `SERIALRX_UART` to USART2 and `MSP_UART` to UART4, with the ICM42688P on SPI1 at `CW270_DEG`. RotorBench maps the corresponding RX/TX pins for every port, keeps the Mini's four motor outputs explicit, and conservatively requires an external SBUS inverter because the product table does not claim one. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and exposed all six UART roles, the 8 MB log, source references, and the unresolved flight-mode mapping honestly.

The SpeedyBee F405 V3 catalog entry was corrected against the manufacturer source and now resolves to its official `SPEEDYBEEF405V3` Betaflight target. The catalog now records BMI270, 9.6 g, 30.5×30.5 mm mounting, and the 41.6×39.4×7.8 mm envelope, replacing the previous ICM42688P and 6.2 g values. SpeedyBee and the Betaflight target document UART2 receiver/SBUS, UART4 Bluetooth MSP, UART5 ESC telemetry, UART6 GPS, UART1 DJI/VTX, and UART3 user serial, plus eight motor outputs and S9. RotorBench records the exact pins, microSD requirements, and the conservative external SBUS-inverter check. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and exposed six UART roles, BMI270/SPI1, the 4 GB-recognized log limit, source references, and the unresolved flight-mode mapping honestly.

The SpeedyBee F405 V4 catalog entry now resolves to the official `SPEEDYBEEF405V4` Betaflight target. Betaflight documents UART2 as the default receiver/SBUS port, UART4 as onboard Bluetooth MSP at 115200, UART5 as RX-only ESC telemetry, UART6 as the GPS/compass port, UART1 as DJI/VTX, and UART3 as user serial. RotorBench records the exact pads, eight motor outputs plus S9, the SD-card blackbox requirements, and the absence of a hardware inverter. It also warns that the DJI harness SBUS wire must be removed or insulated when an external SBUS receiver is used. The rendered selected state had no horizontal overflow at 390×844 or 1440×900 and exposed all six UART roles, the microSD log requirement, source references, and the unresolved flight-mode mapping honestly.

The ESC catalog now includes the matching SpeedyBee OX32 55A 4-in-1. Published data covers 55 A continuous and 70 A burst per channel, 3–6S input, DShot300/600, current sensing, ESC telemetry, TVS protection, 30.5×30.5 mm mounting, 40.9×44.9×8 mm dimensions, 19.1 g weight, an included XT60 lead, and $73.99. Only the fallback mounting point is estimated. The eight-option ESC picker renders the new ESC with zero axe WCAG A/AA violations, no horizontal overflow, and 44 px controls.

The battery catalog now includes the Tattu R-Line V6 6S 1480mAh 160C pack. Gens Ace Tattu documents 22.2 V, 160C, 220 g, a 69.5×42×36.5 mm envelope, and XT60 termination at $39.99. The mounting point and simulation discharge curve remain explicitly estimated. The picker marks the pack compatible and physically checked with the AOS 5 V5/SpeedyBee power path while naming its estimated fields; it rendered cleanly at both target widths.

The battery catalog now also includes the CNHL Black Series V2.0 6S 1300mAh 130C pack. CNHL documents 22.2 V, 260C burst, 209 g, an 82×39×35.5 mm envelope, XT60 termination, 12 AWG wire, and a 5C maximum charge rate. The listing sells a two-pack for $37.98, so RotorBench uses a derived $18.99 per-pack price and labels `price allocation` as estimated alongside the mounting position and simulation discharge curve. The battery picker shows 11 options with the new pack rendered at both target widths, zero axe WCAG A/AA violations, no horizontal overflow, and no undersized controls.

The motor catalog now includes the AOS Supernova 2207 1980KV. AOS’s official datasheet documents 12N14P construction, 4 mm hollow internal shaft, 27.6×19.5 mm motor envelope, 31 g weight with 2 cm wires, 5–6S input, 61 A maximum, 45 mΩ resistance, 1456 W continuous rating at 5S, and prop-specific performance tables. The M5/5 mm external prop mount and 16×16 M3 motor mounting pattern are retained with a separate prop-mount source. Only the mounting point is estimated; RotorBench retains the datasheet source and explicitly marks its prop-specific tables as published but not normalized into the single-curve analysis model. The motor picker surfaces that limitation before selection, and the motor is presented as compatible and physically checked with the AOS 5 V5 frame and HQProp 5037.

`rotorbench.model-manifest.v1` binds 23 original catalog IDs directly to usable GLB files under `backend/assets`, including paired CW/CCW propeller files. These assets are labeled `legacy-unverified` because file and catalog identity are known while their normalization contract has not been revalidated. `motor-2207-1850kv` has no matching file, and `fc-speedybee-f405-v3.glb` contains no geometry, so both remain on generated fallback. Home, Build, Part Picker, build evidence, and the assembly profile all consume one shared resolver rather than guessing from filename prefixes or scanning `/api/models/list`.

The 7-inch catalog depth pass adds the AOS 7 EVO V1.2 frame, iFlight XING 2806.5 1300KV motor, and Gemfan Flash 7040 three-blade propeller from manufacturer pages. Published frame wheelbase, weight, dimensions, 19×19 motor mounting, motor dimensions, weight, current, 5 mm shaft, propeller diameter, pitch, weight, and hub dimensions are retained; estimated stack height, stack-mount pattern, motor positions, mounting offset, and 6S voltage range are explicitly labeled. The selected propeller has no published or reviewed thrust curve, so analysis reports thrust and flight performance as unavailable rather than inventing a curve.

The compact catalog depth pass adds the AOS Cine25 V5 frame and Gemfan Hurricane 2520 three-blade propeller. Published 120 mm wheelbase, 58 g frame weight, 171×147×34 mm envelope, 20×20 and 25.5×25.5 stack mounts, 9×9 motor mounts, 64 mm propeller disk, 5.5 mm hub, and 1.5 mm shaft are retained. Motor positions and stack height remain explicitly estimated, and the propeller has no published thrust curve.

The propeller catalog now includes the Gemfan Hurricane 51499 three-blade. Gemfan documents 5.1-inch diameter, 4.99-inch pitch, 4.96 g weight, 7 mm hub thickness, 5 mm bore, and a 128.8 mm disk. The catalog keeps the GetFPV set-of-four price as a derived $1.25 per propeller and labels `price allocation` as estimated. No thrust table is published, so the picker shows `Thrust data unavailable` and the analysis path does not invent a curve. The 11-option propeller picker rendered at both target widths with zero axe WCAG A/AA violations, no horizontal overflow, and no undersized controls.

The AOS 7 and Cine25 frames render in the part picker with their source provenance, dimensions, price, and explicit estimated field names. The Cine25 preset verifies four motor mounts, four propeller hubs, the 20×20 stack, XT30 power lead, voltage limits, and propeller clearance while retaining an unavailable-performance state.

The Build page offers nineteen validated starter presets: the complete 2.5-inch AOS Cine25 build, 3.5-inch 3800KV build, alternate 3.5-inch 4600KV build, 5-inch TBS Source One V5 build, 5-inch AOS 5 V5 XING2 builds using either Kakute H7 V2 or Kakute F722, a 5-inch F722 build with the Bandit BR3 900 MHz receiver, a 5-inch F722 build with the DBR4 Gemini Xrossband receiver, two 5-inch AOS Supernova 6S builds using either HQProp 5037 or Gemfan 51499, a Volador II VX5 51499 build, a Volador F405 V5/OX32 stack build, 5.5-inch SpeedyBee build, 5.5-inch diversity build using Kakute H7 V2 and RP4TD, 5.5-inch 6S XING2 build, 5.5-inch 4S XING2 build, 7-inch AOS 7 EVO build, and two HeeWing T1 Ranger wing builds using either the F405-WMN/INAV or H743-WING/ArduPilot controller. The empty Overview exposes all nineteen as direct launch actions. Deep links such as `/build?preset=source-25`, `/build?preset=source-35`, `/build?preset=source-35-4600`, `/build?preset=source-5`, `/build?preset=source-5-aos-v5`, `/build?preset=source-5-aos-f722`, `/build?preset=source-5-aos-f722-900`, `/build?preset=source-5-aos-f722-xrossband`, `/build?preset=source-5-aos-supernova`, `/build?preset=source-5-aos-supernova-51499`, `/build?preset=source-5-volador-51499`, `/build?preset=source-5-volador-f405v5`, `/build?preset=source-55`, `/build?preset=source-55-diversity`, `/build?preset=source-55-xing2`, `/build?preset=source-55-xing2-4s`, `/build?preset=source-7-inch`, `/build?preset=source-t1-ranger`, and `/build?preset=source-t1-ranger-h743` fill all seven component slots, consume the query after applying it, and keep saving and analysis behind the normal required-part and review gates. The preset indicator clears automatically if any selected component diverges from the preset. The Supernova platforms pair the 61 A motor limit with the 65 A Tekko ESC and V6 pack; their bare-pad ESC termination correctly reports `Fit review` rather than a verified power connector. The new F722 platforms pair the documented UART2 receiver route with an XT60-matched SpeedyBee BL32 and V6 pack; all five electrical checks and the catalogued physical interfaces verify with either RP4TD-M or Bandit BR3 receivers. The new F405 V5/OX32 platform also verifies five electrical checks with no data gaps. The 51499 platforms retain explicit `Thrust data unavailable` before analysis.

The starter gallery now filters by frame size while retaining the full set behind `All builds`. Controls are ordered numerically as 2.5, 3.5, 5, 5.5, 730 mm wing, and 7 inches, show matching build counts, use 44 px targets, expose pressed state to assistive technology, and keep every resulting card as a direct preset-launch action. A second `Verified only` filter can be combined with size to show only thirteen fit-verified or fit-measured plans. The gallery sorts numeric sizes before names, and the filtered header reports the visible count against all 19 source builds. It rendered with clean wrapping at 390×844 and 1440×900, zero axe WCAG A/AA violations, and no horizontal overflow.

Filter counts now inherit the full foreground color instead of reducing their opacity. This restores AA text contrast for small counts such as `Verified only 12`; the exact 390×844 browser audit reports zero WCAG A/AA violations.

The starter gallery search matches build names, descriptions, and every selected component name, so users can find a platform by controller, receiver, frame, ESC, motor, propeller, or battery. Multi-term queries are token-based, so a search such as `F722 900` can combine a controller and receiver term across fields. Search, frame size, verified-only state, and sort mode are encoded as `q`, `size`, `fit=verified`, and `sort` URL parameters so a filtered gallery survives refresh/back and can be shared directly. Sort modes cover frame size, name, total catalog weight, and catalog total price, with missing summary values ordered last. The gallery reports its filtered count, provides explicit clear/reset states, and retains 44 px controls at both target widths.

Each Overview starter card now reports propulsion data, fit state, rounded build weight, and catalog total price before opening the build. Presets with a modeled thrust curve are labeled `Estimated thrust data`, while the 7-inch, 2.5-inch, and 5-inch HQProp presets explicitly read `Thrust data unavailable`. Fully checked presets show `Fit verified`; the 5-inch Source One build shows `Fit review` because its published frame page does not document motor-mount spacing, and the Supernova build shows `Fit review` because the Tekko ESC requires soldered power termination. Weight and price remain catalog-derived planning totals, not live retailer quotes or measured aircraft mass.

Starter cards now also report 3D geometry coverage from the shared model resolver: all-catalog presets say `<n> catalog models`, all-fallback presets say `<n> fallback meshes`, and mixed presets say `<catalog>/<total> catalog models`. Every card exposes a screen-reader description combining thrust data, fit state, and geometry coverage. The rendered gallery showed all 19 source presets as `7 fallback meshes`, making the existing mesh gap visible before a build is opened, with no horizontal overflow at 390×844 or 1440×900.

Build comparison carries the same propulsion-data state as a per-build status chip and a dedicated `Propeller thrust data` row. Two builds can therefore share verified fit and electrical limits while still showing that one has an estimated curve and the other has no performance curve available.

Each Build page owns a stable working identity, including unsaved drafts. Opening Setup carries that identity plus the currently selected FC and receiver, so local hardware plans created before the build is saved remain attached when it is later saved or analyzed. The Build hardware card summarizes firmware family, receiver protocol, UART/line rate, and saved-plan review state without claiming hardware readiness.

Setup’s `Edit build` action carries that same draft object back to Build, preserving the selected component set and working identity through the round trip.

Setup now preserves unsaved flight-controller and radio edits under build-scoped `:fc:draft` and `:radio:draft` keys. Drafts are written only when a plan differs from its last saved baseline, so opening the page does not manufacture a false recovery state. Reloading or navigating back restores the edited arm, mode, radio, and other plan values and shows `Recovered an unsaved local setup draft`. Binding phrases and direct UIDs are stripped when writing and again when loading a radio draft; a seeded draft containing those fields cannot restore them. Explicit saves remove that plan's draft and clear only its recovery state. While a working plan differs from its saved baseline, the affected tab receives a visible warning dot and a status block names the unsaved `flight-controller plan`, `radio plan`, or both. A top-level `Save changed plans` action persists only the dirty plans, validates radio binding identity before writing, stores the sanitized radio plan, removes the corresponding drafts, and leaves the page without dirty tab markers. The dedicated radio save and combined save now use one shared phrase/UID validator; an integration test confirms conflicting binding material blocks the combined write. The rendered H743 recovery state restored `CH5`/`CH7`, kept the UID unset, had no horizontal overflow, and passed axe WCAG A/AA at 390×844 and 1440×900. The live unsaved state and the 44 px top-level action also rendered at both widths with no overflow and zero axe violations; activating it wrote the edited arm value, removed the draft, and cleared the dirty state.

The shared hardware-readiness model now also retains the resolved board profile ID, board target name, and whether that target is documented or custom. Build renders a compact `Board map` line such as `SPEEDYBEEF405V5 · documented`, Analysis adds a `Board map` fact beside UART and receiver wiring, Saved adds a documented/custom board chip, and Compare adds a dedicated `Board map` row. The values use the same profile resolver as Setup and survive sanitized hardware readiness and comparison exports, so saved and analyzed builds continue to identify the actual board target rather than only the commercial controller name.

Build selections are also written to `rotorbench:build-draft:v1` and recovered after refresh or ordinary navigation, with a visible restoration notice. Route build state and starter-platform deep links remain authoritative. New Build actions use `/build?new=1`, which ignores the stored draft, consumes the query, and starts clean. The reset also works when New Build is clicked while already on the Build route: it creates a fresh identity and clears current selections rather than only changing the URL. Saving a build clears the recovered draft.

Build provenance now includes a 600-character build-local note field. Notes are recovered with drafts, included in save and Analysis handoffs, displayed on Saved cards, rendered as a note strip on Analysis, and carried in `rotorbench.build-sheet.v1` and `rotorbench.analysis-report.v1` exports. The field is explicitly described as build context, not hardware verification.

The provenance panel can copy a concise `rotorbench.build-briefing.v1` plain-text handoff. It summarizes parts, the build note, placement confidence counts, measured fields, power path, saved hardware-plan status, receiver wiring state, radio host transport, and an explicit planning-only boundary. It does not include binding phrases, direct UIDs, raw evidence, or hardware-readiness claims.

The BOM export now closes the selected power path into a purchase requirement. A catalogued connector mismatch adds a derived `XT60-to-XT30`-style adapter row, while a solder-pad ESC adds a battery-to-bare-wire lead row. Derived rows have no invented price or source URL, carry a verification prompt for current rating, wire gauge, and polarity, and are excluded from the catalog subtotal.

Recovered drafts are validated against the current catalog. Unknown or removed component IDs are discarded, and completion, save, and analysis gates count only parts that still exist in the catalog.

Do not remove those labels or present estimated data as manufacturer data.

## What works now

### Navigation and visual system

The old app shell forced every page into a 420 px phone frame. It now has:

* a persistent desktop sidebar and a mobile bottom navigation;
* a dedicated `Setup` destination for flight-controller and radio planning;
* labelled controls and active-page states;
* a responsive workbench layout instead of a fixed phone frame;
* a matte-black preview surface with signal-lime status and actions;
* a searchable part catalog dialog;
* accessible focus, disabled, empty, loading, error, and selected states;
* consistent Lucide icons in place of emoji controls.

Route-level lazy loading now uses a workbench-shaped skeleton instead of a generic loading card. It shows the expected title, preview stage, and side-rail structure with neutral placeholder surfaces, while a single signal-lime mark carries the live loading state. The skeleton is hidden from assistive technology and the surrounding status region announces `Loading workspace` with `aria-busy`. It collapses to one column on phones, adds its own page gutter because the mobile route stage has none, honors reduced-motion, and rendered at 390×844 and 1440×900 with no horizontal overflow or axe WCAG A/AA violations.

Temporary status banners are non-interactive and click-through. Preset confirmations dismiss automatically, and the banner leaves sticky positioning on mobile so it cannot cover controls during work. On Overview at phone width, the New Build and View Analysis actions now sit in the document flow after the summary rather than covering the preview.

The Build assembly controls now wrap into complete rows at phone widths instead of hiding inspection and visibility actions in an unlabeled horizontal scroller. At 390×844, Orbit, 3/4, Top, Side, Front, Exploded, Fit overlay, and every selected-component toggle stay visible within the 390 px page width. Orbit auto-rotation in both Build and Overview now yields to `prefers-reduced-motion`; the Orbit state and manual camera presets remain available. The camera-fit path now raises or lowers the radius bounds before assigning the fitted radius, so a previous scene's zoom limit cannot clamp the next assembly's framing. A settled T1 Ranger H743 render showed the two-motor wing and all seven selected components in frame at both target widths with zero axe WCAG A/AA violations and no horizontal overflow.

The Saved mobile toolbar now restores the search field as a full-width first row and lays the three actions out beneath it without truncation. Profile registration actions now stay in the form flow rather than floating over Preferences; Cancel is a neutral secondary action and Log out has a separate danger treatment.

The visual direction is a flight-bench dashboard, not a generic SaaS dashboard. The decision is recorded in the code rather than in a `DESIGN.md` file.

### Hardware setup

The `/setup` route now combines two local configuration planners:

* **Flight controller:** firmware family, documented or custom board profile, airframe, DShot rate, receiver protocol, UART and baud, channel preset, arm/failsafe values, and feature toggles.
* **Radio transceiver:** TX/RX role, Aerial Kit Rev A3, RadioMaster Ranger/Bandit modules, RadioMaster Pocket internal ELRS, or generic ExpressLRS target, packet rate, target-local drive power, telemetry ratio, switch mode, link mode, model match, binding phrase or UID staging, and channel mapping.

The form starts from the flight controller and receiver selected in the active RotorBench build. It infers a commercial board's first listed firmware family and uses the documented Betaflight bench mapping when appropriate. Receiver changes and protocol/profile changes synchronize the line rate and SBUS input-only telemetry rule.

Both long Setup panels now use the shared `SetupSectionNav` jump strip. The flight-controller navigator exposes Board, Receiver, Sensor when the selected firmware is Aerial Kit, Arming, Channels, and Summary; the radio navigator exposes Device, Link, Binding, Channels, and Summary. The Summary entry jumps directly to each planner's readiness checks and actions, so phone users do not have to traverse the full form to find blockers or save locally. Selecting an item scrolls the owning section to the viewport center, makes its heading programmatically focusable, and moves focus there without a second scroll. Smooth motion yields to `prefers-reduced-motion`, each control is at least 44px high, and phone layouts use a balanced two-column grid with an odd final item spanning the full row. The navigator passed axe WCAG A/AA with no horizontal overflow on both panels at 390×844 and 1440×900.

The FC planner now also shows a source-backed `Control path` strip: selected radio endpoint → receiver UART/pins/baud → planned airframe motor/servo count → DShot output rate. It reports `Pins documented` only when both a build receiver and a non-placeholder board pin mapping exist; otherwise it remains `Mapping incomplete`.

Documented board profiles now expose a collapsible `Serial allocation` map instead of leaving receiver and GPS as the only visible UART assignments. SpeedyBee F405 V5 lists UART1 Bluetooth tuning, UART2 receiver, UART3 DJI VTX, UART4 GPS, UART5 ESC telemetry, and UART6 receiver; the documented Aerial Kit profiles list their receiver, GPS, and console ports. The UI marks the current receiver and enabled GPS routes as local-plan assignments and updates immediately when the receiver UART changes. Selecting a mapped port documented for another peripheral produces a specific review warning, and an unmapped port name produces a resource-mapping warning instead of passing silently. Alternate receiver UART6 does not inherit UART2's pad route: it reports `Pins not mapped for UART6`, keeps the wiring checklist at `Verify pins`, and adds a pad-mapping review item until the resource and solder pads are verified. Profiles without a bundled serial map omit the panel rather than generating a generic port list. This is documentation and planning state only: no UART, peripheral, continuity, or hardware behavior is verified. The open map rendered at 390×844 and 1440×900 without horizontal overflow, all controls remain at least 44px high, and the expanded state passes axe WCAG A/AA.

The same serial allocation is now a shared portable-plan line. Flight-controller summaries and hardware-plan briefings list every documented UART role and mark the currently staged receiver and GPS routes, while profiles without a serial map omit the line. The expanded UI also provides a 44px `Copy serial allocation` action that emits board identity, receiver/GPS routes, every port role and pin note, and an explicit planning-only boundary. This keeps DJI, Bluetooth, GPS, receiver, and ESC-telemetry ownership visible after export or copy without turning documentation into a hardware-verification claim.

The board section now renders a source-backed `Motor output map`. Aerial Kit uses its mixer order and public airframe geometry for Quad X, clockwise-numbered Quad X, Quad +, Y4, V-tail, tri, and both wing layouts. Y4 outputs sharing the rear position are separated only for legibility. Betaflight exposes its officially documented normal QUAD X order and a `Motor direction` choice between normal props-in and reversed props-out; reversing flips the displayed spin directions while retaining the same output numbers. Other Betaflight mixers show an explicit unavailable-map note. INAV, ArduPilot, and PX4 likewise show that no verified map is bundled instead of borrowing another firmware's order. Servo-equipped layouts explicitly retain unresolved servo-direction checks. The map communicates planned output order, not verified motor spin, prop orientation, or physical wiring. Aerial Kit and Betaflight summaries and hardware-plan briefings include the output order and Betaflight direction mode as text for portable handoff. Hardware-plan import rejects unknown motor-direction values.

The receiver section now expands into a board-specific `Receiver wiring` checklist. Documented profiles name the UART, pins, protocol, and baud; custom or placeholder mappings stay `Verify pins`. CRSF adds the telemetry return path, SBUS adds input-only and external-inverter steps when documented, and every plan includes common-ground, receiver-supply, and pre-power continuity checks. The checklist is copy-only and explicitly records that RotorBench has not tested continuity, polarity, receiver supply, or hardware readiness.

The radio planner now separates host transport from the RF path. A `Host transport` field distinguishes native USB CDC, target-specific host UART, a handset module bay, and an explicitly unverified generic transport. Rev A3’s documented host UART is 400000 baud, 8N1, non-inverted and full duplex on J3.4/GPIO44 host TX and J3.3/GPIO43 host RX; the RX-to-FC CRSF UART remains 420000 baud. An `Endpoint checklist` covers role/image selection, antenna or RF load, host transport, the separate FC UART for RX role, and the requirement to observe receiver RC plus link statistics before claiming RF success.

Shared hardware readiness now also carries the selected radio host transport, its display label, and whether that transport is documented. Build shows the host path beneath the receiver route; Analysis includes a Radio host fact; Saved includes the host chip; Compare adds a radio-host row; sanitized hardware plans retain the same fields. None of these fields imply USB, UART, or RF verification.

Hardware readiness also carries the selected handset bay, its label, and target compatibility. Build, Analysis, Saved, Compare, build briefings, build sheets, and analysis reports retain that state, so a module-bay mismatch remains visible outside Setup. Compatible labels still mean physical fit only; they do not verify the handset pinout, CRSF path, or RF link.

The radio planner now also identifies common handsets. RadioMaster Boxer, TX16S MKII, and TX12 MKII profiles are backed by their official EdgeTX manuals, which document an external JR-compatible module bay. The RadioMaster Pocket profile documents a Nano-compatible external bay instead. Selecting a handset reveals a mismatch when the staged module requires a different bay, links both the manufacturer page and manual, and records the handset name/status in the radio summary and portable hardware readiness. A `Verify handset` profile remains the default, so RotorBench never guesses the physical controller from the module type.

Unsaved radio plans no longer generate receiver-band conflicts against a fallback transmitter profile. When only a receiver or flight-controller plan is available, Build, Analysis, Compare, and briefings show the receiver's documented bands with `save a radio plan to compare TX band` or `no radio plan`. Radio warnings and cross-plan mapping warnings are only produced when the corresponding saved radio plan exists, so missing configuration is not mislabeled as incompatible hardware.

When a saved radio target and selected receiver have no shared band, Setup now offers an explicit `Use target` recovery action naming a source-backed compatible transmitter. The suggestion does not auto-apply; clicking it changes only the local plan and recalculates packet-rate, bay, power, and receiver-band state through the normal target update path.

Hardware readiness also carries the selected flight-controller airframe, motor-direction label, source-backed output order, and firmware layout source. Build and Analysis show the order, Saved and Compare retain a compact direction/order state, and build briefings include the full sequence. Aerial Kit and Betaflight QUAD X therefore remain distinguishable outside Setup; unsupported mixer maps remain explicitly unavailable rather than disappearing.

Radio regulatory state also propagates through hardware readiness: planned dBm, selected FCC/CE region, regional maximum in dBm/mW, and `within`/`verify`/`over` cap status. Build and Analysis show planned versus maximum power, Saved retains a compact ceiling chip, Compare adds an RF-limit row, and build briefings include the over-cap state. These are plan checks only and do not establish regional compliance or delivered RF power.

Radio target and receiver frequency bands are now explicit data. Setup shows the selected receiver's bands and shared-band status, and rejects a selected receiver with no documented band shared by the transmitter. The Build receiver picker explains a compatible shared band, a conflict, or missing metadata before selection. Build and Analysis show receiver bands plus shared-band status, Compare adds a receiver-band row, and both build and hardware-plan briefings preserve the result. Missing band metadata remains `unverified`; RotorBench does not infer a shared band from a product name alone.

For a saved plan with a supported four-corner output map, the Build viewer and prop-rotation map derive props-in or props-out from the front-left spin assignment and use that handedness. This covers Betaflight QUAD X and Aerial Kit Quad X/clockwise-numbered Quad X. Both handedness profiles swap the same corner CW/CCW assignments without moving any motor or propeller mount. Unsaved builds and layouts without a supported corner map retain the assembly's props-out default. This is still a planning visualization; physical propeller markings, motor wiring, and spin tests remain unverified.

The prop-rotation map also accepts the saved plan's corner-to-output mapping for conventional FL/FR/RR/RL layouts. It labels `OUT 1` through `OUT 4` on the matching physical corners in the accessible description and visible SVG. Non-corner mixer families omit output numbers rather than forcing their labels onto an X-frame diagram.

The expanded prop map can copy a portable handoff containing the selected motor and propeller, handedness profile, each physical corner's CW/CCW direction, mapped output number/role when available, and the explicit requirement to verify wiring and propeller direction before flight. This is copy-only and does not persist or send hardware state.

The shared hardware-readiness model now carries `receiverPins`, `wiringStatus`, and the planning-only `wiringScope`. Build’s hardware card shows `Pins documented` or `Verify pins`; Analysis adds a wiring fact; Saved adds a wiring chip; Compare adds a wiring row; build sheets and analysis reports retain the sanitized fields. A documented pin route therefore remains visible across routes without becoming an electrical verification claim.

Documented board profiles lock their compiled receiver UART and baud. Custom boards leave those fields editable. The preferred Aerial Kit with ExpressLRS preset uses arm channel 5 and flight-mode channel 6; a separate legacy preset preserves the firmware's arm 6 / mode 5 defaults.

Stored plans use schema version 3 so older inferred channel maps are discarded instead of being silently mixed with current defaults. The combined Setup page owns the radio plan; changing tabs no longer lets standalone radio storage override the parent's build-aware state. Cross-plan warnings can copy either the FC or radio channel map explicitly.

The Rev A3 power selector stores the SX1280 drive value in dBm and shows the corresponding ExpressLRS menu label. Those labels are not calibrated radiated-power measurements. A 250 Hz / 25 mW plan is labeled only as a documented bench-setting match; the summary always reports RF as unverified because RotorBench does not observe link statistics.

Public Aerial Kit firmware registers arm, flight mode, and an optional velocity switch. The workspace-source WeAct and GHF435 profiles instead expose manual, control, and system-ID switches. RotorBench no longer presents unsupported beeper or controller fields as Aerial Kit runtime parameters. Arm, mode, and profile-specific control switches are limited to CH5–8, and the radio planner exposes only roles the selected FC route can actually decode. Hidden stale roles are excluded from validation, summaries, and mapping-copy actions. Packet-rate/switch-mode and MAVLink forcing rules come from the pinned ExpressLRS 4.1.0 source; MAVLink uses Hybrid for normal-width rates and 16ch Rate/2 for 100 Full and 333 Full. Generic ExpressLRS targets do not inherit the Rev A3 power menu and expose a target-local dBm input instead.

The radio target library now includes transmitter-only RadioMaster Ranger Nano, Ranger Micro, and full-size Ranger 2.4 GHz ELRS modules. Their profiles are sourced from the official RadioMaster product pages and user manuals. They record Nano 8-pin, JR-style micro 5-pin, or included JR/Nano adapter interfaces; a 100 mW / 20 dBm default; and region-dependent maxima of 30 dBm / 1000 mW (FCC) and 20 dBm / 100 mW (CE). The planner uses a handset-module-bay transport and free dBm field because the manufacturer does not publish a RotorBench-manageable USB CDC contract, Lua menu table, or host baud here. A `Handset bay` selector records the actual Nano 8-pin, JR micro, or JR standard module bay; incompatible selections receive a specific warning and imported plans reject them. The full-size Ranger can use either included JR or Nano adapter. An explicit `RF region` selector records the fitted FCC or CE variant rather than inferring it from locale; the default remains `Verify fitted module`. Plans, imports, evidence briefings, and warnings use the selected ceiling. Import validation rejects unsupported bays, unsupported regions, incompatible host transports, power above the selected regional ceiling, and power above the published absolute maximum.

The radio target library now also includes the RadioMaster Bandit sub-GHz family from the official product pages and manuals. Bandit Nano uses a Nano 8-pin bay, Bandit Micro uses a JR-style micro 5-pin bay, and the full-size Bandit includes JR standard and Nano adapters. Their profiles expose 25/50/100 Full/150/200 Hz packet modes, 915/868 MHz operation represented as `Sub-G 900 MHz` for receiver-band matching, CRSF module-bay wiring, 6–16.8 V XT30 supply, and a 30 dBm / 1000 mW FCC ceiling without inventing a default power or menu table. Nanos and Micros document receiver repurposing through UART solder pads, so both roles are available while the full-size profile remains transmitter-only. Selecting the Bandit family now chooses a supported packet rate automatically instead of retaining an incompatible 2.4 GHz mode.

The radio target library now includes the RadioMaster Pocket ELRS edition as a standalone internal-RF handset rather than forcing it through an external module-bay profile. RadioMaster documents the internal ELRS 2.4 GHz option, 288 g handset weight, EdgeTX firmware, and Nano-compatible external bay; the profile keeps that external bay available through the separate module-oriented Pocket handset entry. The internal-RF target uses a dedicated `Internal RF module` transport, 25/50/100 Full/150/250/500 Hz modes, no invented host baud, and a source-backed LBT/CE limit of 20 dBm / 100 mW. The default drive level and FCC maximum remain unstated and the plan requires a finite target-local power value. Endpoint guidance says the handset's built-in ELRS module is configured in EdgeTX and that neither UI state nor a USB configuration action proves transmission or aircraft reception. Hardware-plan export/import preserves the internal-RF target and transport. The Pocket state rendered at 390×844 and 1440×900 without a handset-bay selector for the internal target, with no horizontal overflow and zero axe violations.

The radio target library now also includes the RadioMaster TX16S Mark II internal ELRS 2.4 GHz transmitter. The official comparison chart documents the SX1280 internal module, EdgeTX firmware, 6.6–8.4 V supply, and 450–530 mA ELRS working current; the product page documents the FCC/LBT firmware editions and 100 mW LBT limit. The profile uses internal-RF transport, 25/50/100 Full/150/250/500 Hz modes, no host baud or module bay, and no invented default drive or FCC maximum. The selected state renders explicitly as a local plan and does not treat USB/SD configuration as transmission or aircraft reception. It passed the radio profile and UI suites plus rendered axe checks at 390×844 and 1440×900.

The TX12 Mark II internal ELRS 2.4 GHz transmitter is now a separate endpoint from the existing TX12 module-bay handset profile. RadioMaster documents the internal SX1280 module, EdgeTX firmware, 6.6–8.4 V supply, 310–350 mA ELRS working current, and 100 mW LBT edition. The plan uses internal-RF transport and the same 25/50/100 Full/150/250/500 Hz modes without inventing a host baud, module bay, default drive, or FCC maximum. The rendered state passed axe at both target widths.

The RadioMaster Nomad Gemini Xrossband is now a first-class dual-band transmitter target. Its official page documents two Semtech LR1121 transceivers, simultaneous 2.4 GHz and 868/900 MHz Gemini Xrossband transmission, a Micro 5-pin module socket, an included Nano 8-pin adapter, XT30 input at 6–16.8 V, 87.2 g with antenna, and 80×45×40 mm without antenna. RotorBench groups it separately as `Dual-band module bay`, maps both RF bands to compatible XR4/DBR4/900 MHz receivers, and exposes the documented `X100 Full`, `X150`, `Sub-G 200 Full`, and `Sub-G 250` packet modes alongside the shared rates. Full-resolution X modes follow the same switch-mode constraints as other full-resolution rates. Host baud, default RF power, and the target's regulatory-domain-specific power menu remain unresolved because the product page does not publish them; when no standard telemetry mapping is documented, the plan says `Std · target mapping not bundled`. The selected Nomad plan rendered at 390×844 and 1440×900 with `SHARED 2.4 GHZ / SUB-G 900 MHZ`, module-bay guidance, explicit local-only boundaries, no page overflow, and zero axe WCAG A/AA violations.

The RadioMaster DBR4 Gemini Xrossband receiver now completes that endpoint in the catalog. RadioMaster documents dual LR1121 receivers, simultaneous 2.4 GHz and 903.5–926.9 MHz reception, four supplied wire antennas, 20×20 mm mounting, 4.5–8.4 V input, 2.7 g without antennas, 50–500 Hz receiver refresh, 100 mW telemetry, ExpressLRS 3.3.2, CRSF, a 27.2×27.2 mm planform, and $29.99. Current draw, serial-channel count, and mounting offset remain explicitly estimated; the unpublished thickness uses generated footprint-only geometry rather than a claimed product envelope. The rendered Nomad–DBR4 pair reports `SHARED 2.4 GHZ / SUB-G 900 MHZ`, identifies the receiver by product name, remains local-only, has no page overflow, and passes axe at 390×844 and 1440×900.

Radio receiver-band suggestions now distinguish partial from complete coverage. A dual-band receiver beside a 2.4 GHz-only target reports `Partial 2.4 GHz` and recommends the Nomad in one explicit `Use target` action; the Nomad then reports complete shared coverage across both bands. Single-band 2.4 GHz receivers continue to keep their current compatible target, and 900 MHz receivers continue to prefer a single-band Bandit profile before the dual-band module. The rendered DBR4 suggestion rendered at 390×844 and 1440×900 with no overflow and zero axe WCAG A/AA violations.

The radio device selector now groups endpoints by documented transport and band instead of presenting one flat list: `Internal RF handset`, `USB serial device`, `2.4 GHz module bay`, `Dual-band module bay`, `Sub-G 900 MHz module bay`, and `Generic / verify`. Selection, validation, and power behavior remain unchanged. The grouped control contains 12 transmitter endpoints, rendered without overflow and with zero axe WCAG A/AA violations at both target widths.

Saved builds now support sort options alongside search and status filtering: recently updated, name, planning weight low/high, and catalog price low/high. The sort uses the shared planning summary, so values match Build, Compare, Analysis, and exports. Status filtering also includes `Outside takeoff envelope`, isolating builds whose planning weight is above or below a frame's published range. The populated toolbar and two-build list rendered without overlap, truncating the selected envelope label, or page overflow, and passed axe WCAG A/AA at 390×844 and 1440×900.

Documented Aerial Kit boards now show their internal flight log as a read-only capability with the correct backing, such as internal flash or the ESP32 `aerialkit` partition, plus retained RAM. The Aerial Kit bench discovery stage includes the read-only `ak fc logs` command. The generic Blackbox checkbox remains unavailable for Aerial Kit because it refers to an external configurable logging feature; it no longer implies that the internal aircraft log is absent.

The FC planner includes an Aerial Kit arm-gate preview mapped to the firmware's actual enum. It separates three plan-resolvable checks (output mix, receiver transport, and control-role mapping) from nine live gates: output mix, usable IMU, receiver link, failsafe latch, arm request, released arm switch, throttle-low, attitude convergence, and level. Every live gate remains `Not observed`; a local plan must never be presented as a live preflight pass. The prior invented `AK_ARM_CONTROLLER` state has been removed.

Betaflight plans now expose the source-backed `failsafe_throttle` setting as `Stage 2 landing throttle`. Values are whole PWM values from 1000 to 2000, with 1000 meaning throttle off. The help copy comes from Betaflight's official [Failsafe guide](https://betaflight.com/docs/wiki/guides/current/Failsafe): this value applies only when Stage 2 uses Landing Mode, and the selected Stage 2 procedure still has to be confirmed on the board. The value is validated, persisted in the local plan, included in summaries and combined-plan imports, and invalidates attached evidence when changed. Switching back to Aerial Kit clears the Betaflight-only value. The command preview reads it and emits exactly one source-backed write, `ak fc set failsafe_throttle <value> --port /dev/ttyACM0 --write`; every other Betaflight setting remains exact-name gated.

FC plan issues now include a `Review` action that scrolls to and focuses the owning field or feature, using the user's reduced-motion preference. This turns blocker and review counts into direct recovery paths instead of requiring a manual search through the long mobile form.

The Aerial Kit receiver panel now includes the firmware’s saved `rc_min`, `rc_mid`, `rc_max`, and `rc_deadband` calibration values. Defaults are 172 / 992 / 1811 / 0.02, with firmware-backed ranges and a required low < centre < high ordering. These values are included in the copy-only command preview. The UI labels them as a plan and requires live RC-channel verification rather than claiming calibration was performed.

Setup now has an Aerial Kit `Sensor and power` section. Its board-alignment plan exposes `align_roll_deg`, `align_pitch_deg`, and `align_yaw_deg` as rotations about the airframe X, Y, and Z axes, with the firmware's roll-then-pitch-then-yaw order shown explicitly. Defaults are zero, the accepted range is -180° to 180°, and the copy directs the user to verify the sign by tilting the aircraft and watching live attitude. The values flow through plan validation, the copy-only command preview, hardware readiness, read-only `ak fc get` discovery, parameter-snapshot comparison, and explicit observed-value adoption. RotorBench does not claim that the mounting orientation or sensor signs were physically verified. The combined sensor-and-power section rendered with zero axe WCAG A/AA violations and no horizontal overflow at 390×844 and 1440×900.

The Aerial Kit board plan also exposes `gyro_rate_hz` and `pid_denom`. The first is a 0–8000 Hz request where zero keeps the board driver's initial rate; the second selects one control pass every 1–32 gyro samples. A live readout derives the requested loop frequency and period from those values, for example 3200 Hz ÷ 2 = 1600 Hz / 625 µs, while explicitly labeling the result `Request only`. The note preserves the firmware behavior that the IMU may take a lower supported sample rate and that actual loop timing or scheduler drops need live flight-controller evidence. Both values flow through validation, command preview, hardware readiness, read-only discovery, parameter comparison, and observed-value adoption. The readout rendered with zero axe WCAG A/AA violations and no horizontal overflow at 390×844 and 1440×900.

Aerial Kit elevon-wing plans now expose the firmware's per-servo output plumbing: `servo1_reverse`/`servo2_reverse`, centre trim at -200 to 200 µs from neutral, and travel at 100 to 900 µs with a 500 µs default. The section appears only for airframes with servo outputs, adds a `Servos` section jump, and makes each validation Review action focus the affected servo field. Invalid servo plumbing now blocks the arm-gate output-mix check instead of leaving it green. The values flow through the local plan, command preview, saved hardware-plan round trip, Setup and Build summaries, sanitized hardware-readiness state, read-only runbook discovery, parameter-snapshot checks, and typed observed-value adoption. This plans output polarity and pulse geometry only; horn centring, surface direction, mechanical endpoints, linkage clearance, and live servo motion remain physical checks. The wing section rendered at 390×844 and 1440×900 without horizontal overflow, with 44px controls, and passes axe WCAG A/AA.

The Aerial Kit flight-controller plan now includes firmware-backed battery telemetry parameters: `vbat_ratio`, `vbat_cells`, `vbat_warn_cell`, and `vbat_min_cell`. Defaults are an 11:1 divider, automatic cell detection, 3.50 V/cell warning, and 3.30 V/cell minimum. The UI enforces the firmware’s documented ranges, rejects a minimum threshold at or above the warning threshold, and directs the user to verify the ADC divider against a measured pack. The values flow through plan validation, the copy-only console preview, hardware readiness, read-only `ak fc get` discovery, parameter-snapshot comparison, and explicit observed-value adoption. They remain planned settings; no pack voltage, divider calibration, or firmware write is claimed. The battery section rendered with zero axe WCAG A/AA violations and no horizontal overflow at 390×844 and 1440×900.

The battery plan also exposes the separate `battery_rth` safety behavior, disabled by default. Enabling it requires the GPS feature and a documented GPS UART. The UI preserves the firmware’s actual behavior: a critical pack with a valid position fix starts a return, the return latches until landing or disarm, and stick movement does not cancel it. The flag flows through validation, command preview, hardware readiness, read-only discovery, parameter comparison, and observed-value adoption. It does not claim that GPS, navigation, or the return behavior was tested. The enabled row rendered with zero axe WCAG A/AA violations and no horizontal overflow at both target widths.

The arming plan now includes a `Navigation safety plan` with Aerial Kit’s optional geofence, `rth_min_alt_m` return floor, and `gps_min_sats` navigation gate. The fence uses `fence_enable`, `fence_radius_m`, and `fence_ceiling_m`; it is off by default, and enabling it requires GPS, a documented GPS UART, and a radius above zero. The ceiling is 0–5000 m above home and uses zero for no lid. The return floor is 0–500 m above home and uses zero for no floor. GPS navigation requires a 3D fix meeting a 5–10 satellite floor; the firmware default is 6. The UI explains the firmware behavior rather than presenting a passive boundary: crossing the radius or ceiling hands control to the return, control comes back once the aircraft is inside again, the radius should exceed the aircraft’s turn circle, and the navigator holds 10 m below a configured ceiling. The floor uses the fused altitude estimate rather than GPS alone. All five values flow through validation, command preview, hardware readiness, read-only discovery, parameter comparison, and observed-value adoption. The enabled fence, floor, and GPS gate rendered with zero axe WCAG A/AA violations and no horizontal overflow at 390×844 and 1440×900.

The navigation plan now exposes Aerial Kit’s optional `mission_channel` switch. It is off by default; a configured CH5–8 high transition requests the stored mission, and switching low ends it. The help copy follows `aerial-kit/firmware/docs/14-navigation.md`: a fence or critical-pack return outranks the mission, and disarming ends it. The channel participates in duplicate/range validation, the FC summary and channel map, the radio channel role list, cross-plan mapping warnings and one-click mapping copy, command preview, read-only runbook discovery, imported parameter checks, and observed-value adoption. It is a local mission-switch mapping only; RotorBench does not configure waypoints, start a mission, or claim mission readiness. The configured and mapped states rendered at both target widths with zero axe WCAG A/AA violations and no page or section overflow.

Elevon-wing plans now expose Aerial Kit’s optional hand-launch block. The switch maps to `launch_channel` (off by default), with `launch_throttle` 0–1, `launch_climb_deg` 0–45°, and `launch_timeout_s` 0–60 seconds. Defaults come from the firmware and its INAV attribution: 0.70 throttle, 18° climb, and 5 seconds. The block is hidden for non-wing airframes, clears the launch channel when the airframe changes to a quad, and rejects imported or retained launch channels on those airframes. A roll, pitch, or yaw stick past one-fifteenth of travel ends a launch; the throttle stick does not. Switch-low, timeout, disarm, fence return, and failsafe also end it. The switch and three values participate in radio role mapping and warnings, command preview, runbook discovery, parameter checks, observed-value adoption, and evidence-scope invalidation. This is output planning only; RotorBench does not start a launch or claim that motor/elevon directions were physically tested. The configured and mapped wing states rendered at 390×844 and 1440×900 with zero axe WCAG A/AA violations and no page or section overflow.

Saved local plans now normalize and retain mission-control context outside Setup. Build, Saved, Compare, Analysis, build briefings, build sheets, and analysis reports carry a shared descriptor such as `Mission CH7 · Launch CH8 · 65% · 20° · 6 s`; quad plans show `Launch N/A`, and an imported launch channel on an incompatible airframe is labeled `airframe mismatch`. Compare has a dedicated `Mission controls` row. The Build hardware card rendered the mission descriptor with clean wrapping and zero axe WCAG A/AA findings at both target widths. This remains local plan state and does not claim a mission, launch, RF link, or flight-controller write occurred.

Hardware-plan readiness outside Setup now includes the selected frame's catalogued motor count. Home, Build, Analysis, Saved, and comparison summaries therefore reject a stale four-motor plan against a two-motor wing airframe instead of treating receiver identity alone as sufficient. A rendered mismatch reported three blockers and `Mission CH7 · Launch off` on the Build hardware card, with no overflow or axe violations. The count is a plan-resolvable catalog check; it does not replace visual inspection of motor positions or physical outputs.

Saved navigation safety now remains visible after leaving Setup. Build’s hardware card shows a compact `Navigation safety` line, Analysis adds a matching hardware fact, Saved adds the same descriptor to each build, Compare adds a `Navigation safety` row, and copied build briefings include it. A shared descriptor reports fence radius/ceiling, return floor, GPS satellite gate, and critical-pack return state so these values cannot drift between routes. The saved Build card rendered `Fence 250 m / 120 m ceiling · Floor 30 m · GPS 8 sats · Pack RTH on` with zero axe WCAG A/AA violations and no horizontal overflow at both target widths.

The radio planner filters packet rates by target, exposes the source-backed Standard telemetry ratio for the chosen rate, and disables switch modes that cannot work with that rate or with MAVLink. Unsupported Rev A3 power or packet-rate values fail closed instead of being displayed as a different known setting. At 250 Hz, for example, Standard resolves to 1:64, while 100 Full and 333 Full require a fixed 8-channel, 12-channel mixed, or 16-channel Rate/2 switch mode. Rev A3's page also includes a source-backed GPIO4 and LED legend: TX is GPIO4 high with one blue boot pulse; RX is GPIO4 low with two green boot pulses. It preserves the warning that the first prototype's physical label disagreed with GPIO4.

The radio channel map now includes a compact CH1–8/CH1–16 assignment strip. It uses the actual FC route limit and labels every mapped control role, making arm/mode/velocity placement scannable without opening each select. The runbook and live-capture disclosures share one secondary `Bench tools` disclosure so the configurator remains the primary task. Setup readiness is labeled by scope: the page reports `combined checks`, the FC panel reports `FC` review items, and the radio panel reports `Radio` checks.

Bench tools now includes a direct `Review imported evidence` action. It opens the nested bench runbook, scrolls to the evidence review, and moves keyboard focus to the review region, so imported FC or radio evidence no longer requires discovering two separate disclosures. The action names the evidence types it reaches and does not connect to hardware. At 390×844 the runbook opened, the review was visible and focused, and axe reported zero WCAG A/AA violations.

The Aerial Kit flight-controller plan exports a copy-only console command preview using the current runtime parameter names. It intentionally omits `save` and never sends commands. The preview is suppressed when blockers exist and never serializes missing or non-numeric values as zero or `NaN`; a blank public velocity channel is emitted explicitly as `0`. Integer-only firmware fields, baud, and control channels reject decimals. Betaflight receives read-only discovery commands using exact setting names plus the validated `failsafe_throttle` read/write pair; INAV does not inherit that Betaflight-specific settings client and shows an unsupported-preview explanation. ArduPilot and PX4 also show explicit unsupported-preview explanations. The command text is a keyboard-focusable, labelled scroll region so every line remains reachable without a pointing device.

These pages produce a local plan. They do not connect to, flash, calibrate, arm, or test hardware. The interface states that boundary in several visible places. Binding phrases and direct UIDs remain in component memory and are deliberately excluded from local storage and exported summaries. RotorBench derives the first six MD5 bytes from a phrase exactly as ExpressLRS/Aerial Kit does and previews the effective UID plus the required write, reconnect, exact-readback, and RF-observation sequence. Binding phrases are checked against ExpressLRS's 48 UTF-8-byte limit, while numeric safety limits reject missing and non-numeric values rather than coercing them to zero.

Combined FC/radio plans can be exported and imported as `rotorbench.hardware-plan.v1`. Import validates schema, target versions, role, target support, channel-map shape, power, packet rate, telemetry ratio, switch mode, link mode, and dynamic-power enums; merges partial plans over safe defaults; rejects plans for a different selected FC/receiver; restores current build IDs when an older partial plan omitted them; and never imports binding material or hardware state.

Portable hardware plans also include a sanitized selected-receiver record and the receiver-frequency compatibility result in the radio summary. Import rejects a payload whose embedded receiver ID disagrees with the selected radio receiver, so an exported XR4 dual-band plan cannot silently be reassigned to a different receiver identity.

The Setup toolbar can copy a concise `rotorbench.hardware-plan-briefing.v1` text handoff. It summarizes the selected build, FC and receiver, flight-controller settings, radio target and RF plan, mapped channels, and local review items. Binding phrases and direct UIDs are excluded, and the text explicitly states that no connection, write, flash, calibration, arm action, or RF verification occurred.

Standalone FC-plan exports and combined hardware-plan exports include the derived receiver `wiring` checklist with its documented/unverified state, UART, pins, baud, ordered continuity steps, and explicit `wiringVerified: false` boundary. The checklist is regenerated from the imported configuration rather than trusted as hardware evidence.

When the active build has a frame, the FC planner compares the frame's catalogued motor count with the selected firmware airframe and reports a blocker on mismatch. This prevents a quad frame from silently carrying a single-motor wing configuration.

Plans are stored per build under:

```text
rotorbench:hardware-plan:<build-id>:fc
rotorbench:hardware-plan:<build-id>:radio
```

The Setup page also flags cross-plan channel mismatches for arm, flight mode, velocity, and any other explicitly configured planning roles.

### Pinned Aerial Kit truth

The current Aerial Kit integration pin is `main` at `a2f25c1` after merged PR #74, package `0.4.6`. The tested Rev A3 firmware artifact remains SHA-256 `9b48f01f522783d872b72f36c69c7171bcc851e2fcbfe5f60cb717efcb0331b4`. The merged CLI emits machine-readable FC status, preflight, parameters, RC, and related operations while preserving protocol-specific semantics, and exposes the complete top-level command surface including bounded `ak radio teleop`.

* Rev A3 TX host link: 400000 baud, 8N1, non-inverted, full duplex.
* Rev A3 RX-to-FC link: 420000 baud, 8N1, non-inverted.
* Public Aerial Kit decodes CH1–8 only and registers arm, mode, and optional velocity as its control switches. The reviewed workspace profiles expose manual, control, and system-ID roles instead.
* Firmware default is arm CH6 / mode CH5; the recommended Aerial Kit + ExpressLRS profile is arm CH5 / mode CH6.
* ExpressLRS 2.4 GHz defaults to 250 Hz. Rev A3 power menu values are 10/25/50/100/250 mW; underlying SX1280 drive values are -18/-14/-10/-6/+5 dBm and are not calibrated delivered power.
* The recorded 250 Hz / 25 mW result is a settings match, not proof that another plan will link. RF passes only with observed two-endpoint RC and link statistics.
* Phrase pairing must derive one six-byte UID, reconnect, and verify exact readback. RotorBench's local preview uses the same `-DMY_BINDING_PHRASE="<phrase>"` MD5 prefix and first-six-bytes rule, but does not write or persist the phrase. Explicit bind is separate and remains unconfirmed until observed.
* `ak fc` auto-detects Aerial Kit AKP or Betaflight MSP and gates writes on `--write` plus a fresh disarmed-state check. RotorBench previews commands but does not connect or write. Its typed settings client is Betaflight-specific; INAV parameter groups are not represented by the same preview.

### Bench runbook

The Setup page includes a collapsible, source-backed `Bench runbook`. It converts the current local plan into human-run `ak` commands for:

* stable `/dev/serial/by-id/` discovery, machine-readable FC status/preflight/RC, radio device information, and TX/RX boot identity with explicit 400000/420000 logical baud roles;
* UID, TX monitor, and TX parameter-tree reads before any mutation, including the module settings needed to attribute a later RF run to the planned packet rate, power, telemetry, switch, dynamic-power, and Model Match values;
* one explicitly hardware-changing `ak radio pair` stage that writes a placeholder phrase, verifies both endpoint UIDs, and runs the bounded two-board TX/RX bench with the current arm, mode, and optional velocity channel overrides.
* an optional Rev A3-only `ak radio teleop` acceptance stage after pairing, generated with `--write --confirm-arm` and the current channel map. The stage carries Aerial Kit's low-throttle arm hold, panic, Ctrl-C, and timeout checks but is never executed by RotorBench.

The pair command drives TX and observes RX concurrently, so the runbook does not ask the user to start a separate sequential capture after the drive has ended. It requires both endpoints to read back the same non-zero UID and never marks RF as verified unless receiver RC frames and link statistics are observed. The UI offers a write-free discovery copy at any time, while copying the full write-capable runbook requires an explicit props-off/restraint/antenna/role/channel/panic review acknowledgement. The live-input stage remains copy-only and requires `disarmed_at_end=true` for panic, Ctrl-C, and timeout paths; a sent arm request is not presented as proof that the controller armed. It never inserts the user's staged phrase or UID. PX4/ArduPilot omit the unsupported `ak fc` commands; generic ELRS targets use baud placeholders rather than guessed serial values, and no Rev A3-specific pair or teleop command is emitted for them.

When the current plan uses Rev A3 with Betaflight, the runbook also shows the 2026-11-20 Aerial Kit real-vehicle reference bench as reference-only context. It lists the observed receiver acquisition, live changing MSP RC, three-second minimum-throttle arm on AUX1/channel 5, automatic disarm, and beeper on AUX5/channel 9 with the 1950-2050 range and `play_sound 4: ARMING`. It also lists flight behavior, range or attenuation, power cycles, and production readiness as not tested, and explicitly states that another aircraft's observation is not evidence for the current plan. The full copied runbook includes this reference block; the read-only discovery copy does not.

The runbook footer displays the pinned tested artifact SHA-256 alongside package and firmware versions.

The runbook can also import `pair.json`, `bench.json`, `capture.json`, `tx-boot.json`, `rx-boot.json`, `tx-params.txt`, or its own `rotorbench.crsf-observation.v1` evidence. A review accepts one report or one TX plus one RX native observation, optional TX/RX boot diagnostics, and a TX parameter snapshot, enforces a 1 MB UTF-8 limit per file, extracts no serial paths, and compares imported UIDs with the current staged plan UID when one exists. UID parsing matches the Python client’s separator rules and rejects prose, invalid separators, or garbage around otherwise valid hex digits. Boot diagnostics are correlated against the report and each other for role, UID, baud, regulatory domain, FHSS seed, initial channel, frequency, and packet-rate state. Mismatched seeds or initial FHSS channels fail the bundle; frequency or rate differences remain unverified because a searching RX may cycle. The parameter snapshot correlates the module’s reported packet rate, Max Power, telemetry ratio, switch mode, dynamic power, and Model Match with the current plan. The parser separates file-reported gates from RotorBench-observed state: even a complete bundle is labeled as locally selected, not authenticity-verified, and never changes the hardware-readiness badge. A file-reported RF pass cannot make the review complete when parser integrity, RC cadence, frame freshness, or observed link quality contains a failed check. The review checks UID readback, current-plan identity, receiver RC, TX/RX link statistics, disarm-at-exit, parser integrity, RC cadence, frame freshness, and observed link quality. Native observation evidence is endpoint-direction aware: an RX capture cannot satisfy TX link statistics and a TX capture cannot satisfy receiver RC. A single-endpoint capture can never establish a two-endpoint RF pass. One TX and one RX observation can be correlated only when both identify the same target, their capture windows overlap, the RX file contains receiver RC and link statistics, the TX file contains TX link statistics, and parser/freshness quality checks pass on both. That state is labeled `TX and RX observations correlate; RF remains unverified`; it does not establish UID pairing, authenticity, RF performance, or hardware readiness. Duplicate endpoint roles are rejected. A sanitized `rotorbench.bench-evidence-summary.v1` review can be downloaded without raw files, serial paths, or binding material.

Both observation files must also match the target of the currently selected radio plan when that target is supplied.

The TX parameter snapshot now also compares the module’s `Link Mode` value with the current Normal or MAVLink plan. A MAVLink plan cannot satisfy the settings review while the module still reports Normal.

Read-only FC evidence from `ak fc status --json`, `ak fc preflight --json`, and `ak fc rc --json` can be imported together. RotorBench removes serial paths, checks the reported AKP or Betaflight protocol against the selected firmware family, requires `armed=0` and a protocol-appropriate receiver observation, and reviews console, clock, tick, output, saved-configuration, and fault lines. Both the older text preflight shape and the merged CLI's JSON checklist/summary shape are accepted. Betaflight MSP status does not expose receiver-link state, so its unconditional `link_live` shim value cannot satisfy the link check. A fresh MSP RC report can establish that plausible channel values were observed only when its timestamp is under ten minutes old and at least four plausible channels span at least two values; it still does not prove RF. The arming-disable word is decoded into source-backed names; either failsafe bit and a failed reported preflight verdict block completeness. Facts such as IMU, receiver, GPS, and arm remain facts rather than passes. A complete FC evidence review is labeled `FC status and preflight are complete; hardware remains unverified`; it is never flight-ready authorization.

Standalone `ak fc rc --json` is recognized as `fc-rc` evidence. It shows the protocol, observation time, flags, and every sampled channel, with the explicit boundary that channel presence does not prove RF range or transmitter identity. A stale or flat sample remains inconclusive.

Imported evidence checks have an accessible `All checks / Review items` filter. `Review items` shows only failed or unverified checks, which keeps long FC and radio reports workable on mobile; the empty state explicitly says when no failed or unverified item remains.

Observed FC and TX-radio values can be adopted into the local plan through a two-stage, explicit workflow. The review lists current versus observed values, lets the user select individual differences, and requires an `Adopt selected … values` action. FC and radio scope checks are independent: changing the FC plan does not block a still-valid radio patch and vice versa, but each domain blocks after its own plan or component changes. Radio adoption also requires matching radio device-status evidence so a parameter snapshot can be attributed to the selected target. Adoption mutates React plan state only; it does not save, export, send, flash, or configure hardware. Dependent command previews and the runbook regenerate from the adopted local plan, and the previously attached evidence immediately becomes scope-stale.

Read-only `ak fc get` snapshots can be imported as one text file with `name=value status=...` lines. RotorBench compares all plan-relevant Aerial Kit runtime parameters against the staged airframe, DShot rate, receiver protocol, control channels, arm timing and tilt limits, throttle and timeout gates, receiver calibration, and RTH flag. Planned parameters missing from the file are emitted as `Unverified`, so a one-line partial snapshot cannot be summarized as a plan match. Parameter mismatches block complete FC evidence and are listed individually; matching or mismatching them never writes or saves parameters. The review shows observed coverage as `covered / required`.

The same read-only importer now accepts Mission Planner `.param` files as `NAME,VALUE` rows and QGroundControl `.params` files in their documented `vehicle component name value type` format. Comments are ignored, names are normalized only for lookup, and values are displayed exactly as imported. Evidence copy now refers to hardware files rather than assuming Aerial Kit only. The explorer summary names the detected format as `Aerial Kit`, `Mission Planner`, or `QGroundControl`, making the accepted evidence source explicit. A real H743 Setup path accepted a Mission Planner export, showed `Mission Planner · 2 matches · 0 differ`, checked `BRD_ALT_CONFIG=1` for the true UART6 RX path and `SERIAL7_PROTOCOL=23` for CRSF/ELRS, and did not demand unrelated Aerial Kit runtime names from the ArduPilot table. The imported three-parameter state rendered at 390×844 with zero axe WCAG A/AA violations and no overflow.

Evidence provenance now follows the device under review. An FC status, RC, or parameter file names the selected flight controller and board as `Plan target` instead of borrowing the radio endpoint name. Radio observations continue to name the selected radio target, while combined evidence emits separate `FC plan target` and `Radio plan target` facts. The rendered H743 Mission Planner state reports `Matek H743-WING V3 · MATEKH743`, keeps the radio target out of the FC-only facts, and reports the parameter explorer format through an accessible detail-group name. The 390×844 and 1440×900 states have no horizontal overflow and zero axe WCAG A/AA violations.

The imported snapshot is also available through an expandable read-only parameter explorer. It groups observed values into arming and receiver, modes and channels, airframe and control loop, hand launch, power and battery, navigation and return, and an explicit `Other observed` bucket so unsupported names stay visible. A local name/value filter handles larger snapshots, and the empty state provides a reset action. Values are displayed exactly as parsed, without converting them into a plan match or claiming they survived a controller restart. The expanded explorer rendered with 16 imported parameters at both target widths, with no horizontal overflow and zero axe WCAG A/AA violations.

Each observed FC value now carries its plan state inline: `Matches plan`, `Differs`, `Unverified`, or `Observed` for fields outside the recognized plan comparison. The summary counts matches, differences, and unverified values. `All`, `Needs review`, and `Differences` filters isolate imported rows without altering the values or adoption selection. A group selector with per-group counts composes with those filters, so a larger Mission Planner file can be narrowed to arming, power, navigation, or another parameter family before review. Plan checks missing from the import are now rendered as `Not in snapshot` rows inside their normal parameter group, so a partial H743 snapshot exposes both the mismatched `BRD_ALT_CONFIG=0` value and the absent `SERIAL7_PROTOCOL` requirement under `Needs review`. The filtered state rendered with 44 px controls, no page overflow, and zero axe WCAG A/AA violations at 390×844 and 1440×900.

Imported ExpressLRS TX snapshots receive the same read-only inspection path. The TX explorer groups RF link controls, power controls, endpoint identity, and unknown firmware fields while preserving every module-reported name and value. It remains separate from the existing plan comparison and adoption actions: opening or filtering the snapshot never changes the local radio plan. The expanded eight-value snapshot rendered at both target widths with no page overflow and zero axe WCAG A/AA violations.

TX values now carry the same inline plan states as FC parameters: `Matches plan`, `Differs`, `Unverified`, or `Observed`, followed by match, difference, and unverified totals and the same three status filters. The radio explorer also has its own counted group selector, so RF link, power, endpoint identity, and unrecognized menu fields can be isolated without changing the module plan. Missing plan settings are shown as `Not in snapshot` instead of disappearing from review. A real Setup-state capture with the documented Rev A3 menu reported seven matches and one outside-plan field without changing the radio plan. The expanded mobile state remained free of overflow and axe WCAG A/AA violations. The same pass cleared the remaining test-only Testing Library and conditional-expect lint violations, so the documented full ESLint command now passes.

Attached parameter-only evidence is summarized as `FC parameter snapshot matched` when every compared value agrees, while any failed comparison keeps the attachment in the review state. Saved, Compare, Analysis, and exported analysis reports therefore retain the parameter evidence context rather than collapsing it into a generic observation.

The Aerial Kit discovery runbook now emits a read-only shell loop that calls `ak fc get` for those runtime names and writes `fc-params.txt`, so the expected snapshot file is produced by the same reviewed workflow that generates the status, preflight, and radio evidence.

The runbook now asks discovery to save `tx-status.json` and `rx-status.json` from `ak radio status`. Imported radio status is checked for TX/RX role, logical baud, ExpressLRS firmware version, and the pinned Rev A3 product identity. Ports, USB serial numbers, and CRSF device serial values are removed before review or attachment. A matching report is labeled `Radio identity matches the selected endpoint; RF remains unverified`; a role/baud/firmware mismatch is named directly as `Radio identity does not match the selected endpoint`. It proves only that the endpoint answered.

An explicit `Attach to build` action stores only the sanitized review under `rotorbench:bench-evidence:<build-id>:v1`. The attachment block shows its current review label, attachment time, and pass/fail/open counts, and can be removed without retaining the imported files. The attachment records a sanitized scope of the seven component IDs, flight-controller plan, radio plan, and channel map. Saved, comparison, Setup, and Analysis compare that scope with the current build and plans: later part or plan changes downgrade the label to `Imported evidence · build or plan changed` instead of leaving stale evidence correlated. Attachments created before scope tracking remain visible as `build revision not recorded`. Duplicating a build copies the sanitized attachment with its plans and reports evidence separately from hardware plans in the success message. Imported evidence remains locally selected, never authenticity-verified, never changes hardware readiness, and is not counted as a hardware plan.

Each attachment also appends a sanitized summary to a bounded, newest-first local history under `rotorbench:bench-evidence-history:<build-id>:v1`; up to eight runs are retained. The Setup review compares the current run with the previous run only when evidence type, check-set fingerprint, build/plan scope, and staged identity agree. Compatible runs report improved, regressed, unchanged, or `coverage changed` when newly visible failures coincide with fewer open checks; unlike evidence sets report `Not comparable`. History contains no raw bytes, serial paths, binding phrase, or direct UID. Clearing history leaves the current attachment in place. Duplicating a build seeds the copied build’s history with the copied current summary rather than copying the source history wholesale.

When a binding phrase or direct UID is staged, the attachment stores only a stable fingerprint of the effective six-byte pairing identity. It never stores the phrase or UID. Setup reports a changed identity as `Imported evidence · staged UID changed`; Analysis and Saved, where binding identity is intentionally not persisted, report `Imported evidence · UID not currently staged` rather than pretending the identity was rechecked.

Attachment summaries now store only one-way TX, RX, and plan UID fingerprints plus match booleans. Reading a legacy attachment that contains raw UID fields rewrites it in the sanitized form, and history reads migrate the stored summaries the same way. The explicit review download recursively replaces direct UID forms with `[UID redacted]`; raw files and serial paths remain excluded.

### Read-only Web Serial capture

The Setup page now has a capability-gated `Live serial capture` disclosure. On Chromium it requests a port only after an explicit button press, opens the chosen logical baud, and displays bounded hexadecimal chunks of received data. It never requests a writable stream and cannot send commands, flash, arm, or mutate a device. Single-role targets retain the standalone `Open port` and `Stop capture` controls.

The same receive-only stream now runs through a CRSF parser adapted from Aerial Kit's codec. It resynchronizes after noise, validates CRC-8/DVB-S2, survives split frames, decodes all sixteen 11-bit RC channels, and decodes link statistics with the wire's signed SNR and negated RSSI semantics. It also decodes flight mode, attitude, battery voltage/current/capacity/remaining, barometric altitude/vertical speed, and GPS position/speed/satellite count. The UI reports these observations without converting them into an RF pass.

The observed attitude now renders as a compact horizon instrument beside exact roll, pitch, and yaw readouts. Its visual roll and pitch are bounded so extreme frames stay legible, while the numeric values remain unmodified. The instrument's accessible label names all three observed angles and states `Read-only observation, not flight verification`; its visible note says the view does not calibrate the IMU or verify flight readiness. It rendered in an expanded, mocked capture at 390×844 and 1440×900 with zero axe WCAG A/AA violations and no page overflow.

After valid frames are observed, `Download evidence` creates `rotorbench.crsf-observation.v1` JSON. It includes the selected logical baud, parser health, every observed channel's raw/protocol-normalized value, cumulative per-channel sample/min/max ranges, the latest link statistics, and latest decoded telemetry. It excludes raw bytes, serial port identity, and binding material, and explicitly records `rfPathVerified: false`.

The observation view also shows a stage ladder: port opened, valid frames, RC observed, link statistics observed, telemetry observed, and RF path not verified. A frame-age display reports seconds since the last valid frame; after two seconds it says no new frame has arrived without claiming that a firmware failsafe or RF failure occurred.

The live channel view compares observed extrema with the planned `rc_min` / `rc_mid` / `rc_max` and deadband. Each sampled channel is labeled `Within deadband`, `Partial range`, `Full planned range`, or `Outside plan`; multiple RC frames arriving in the same serial read are folded into the cumulative range rather than replacing earlier samples. The imported-evidence review preserves those ranges and reports sampled, full-range, and outside-plan counts. These are read-only observations, never an applied calibration and never a hardware-readiness change.

Targets that can operate as both TX and RX render a coordinated capture deck with separate explicit port-selection slots. Each slot first records a user-selected `SerialPort` without opening it. Once both are selected, `Start together` opens both descriptors from one session action; a parent-level latch prevents rapid double clicks from invoking either endpoint twice. If either open fails, RotorBench stops both and does not present the windows as aligned. The active deck exposes one `Stop together` action. Per-endpoint start and end timestamps remain in the downloaded evidence so the correlation review can verify actual overlap. The deck copy is explicit that port opening can complete at slightly different times and that a shared start command is not an RF or synchronization guarantee. Single-role targets continue to show one capture slot.

Both capture slots in a deck share a generated `captureSessionId`. Native observation exports preserve that non-secret session identifier. The TX/RX correlation review passes when the identifiers match, fails when both are present and differ, and remains compatible with older files that do not contain one. The UI shows a shortened session suffix with the overlap and target facts. `New capture session` clears and remounts both slots with a fresh identifier; it is disabled while either endpoint is selecting, opening, capturing, or stopping so old observations cannot be relabeled mid-session. Changing the selected radio target also remounts the ports and creates a fresh session identifier.

`Copy session procedure` produces a portable, human-run checklist containing the session identifier, target, endpoint-specific baud rates, explicit port-selection and overlap steps, the two-file import instruction, and the RF/hardware boundary. It never includes serial identities or sends commands.

The panel states that the port may reset a native-USB board and that serial bytes do not prove the intended RF path. It handles unsupported browsers, denied selection, busy ports, read errors, stopping, cleanup on unmount, StrictMode remounts, and the `Not connected`/`Capturing`/`Stopped`/error states. No bytes or serial identities are persisted.

The transport and decoder have been exercised with Aerial Kit's RC-centre and link-statistics vectors, malformed CRC/input cases, a mocked Web Serial port, and Chromium at desktop/mobile widths. No physical serial device has been attached in this session, so the live path remains experimental rather than hardware-qualified.

The browser CRSF decoder now also consumes a self-contained copy of the reviewed Aerial Kit shared protocol vectors at commit `fa65372`. A contract test checks the raw frame bytes, addresses, frame types, payload bytes, RC channel values, attitude, battery, GPS, barometer, flight mode, and link statistics against the shared decoded values, preventing the web codec from drifting from the firmware/Python fixture.

### Build comparison

The Saved page supports selecting two builds and opening `/compare`. The comparison shows all seven component categories, catalog price, estimated catalog weight, selected-part count, physical-fit status, electrical-limit status, source-backed and estimated-field counts, geometry fallbacks, saved hardware-plan state, and direct links to analysis and hardware setup. It does not claim those catalog totals are equivalent to an analysis result.

Saved also exposes `Current build` as one comparison side whenever `currentBuild` contains selections. The current working build receives a dedicated `current-build:` comparison identity, then composes with one saved build through the existing two-selection limit and Compare action. Build now includes a 44 px `Compare` handoff that synchronously writes and publishes the current build before opening `/saved?compareCurrent=1`; Saved preselects that build, consumes the query, and asks for one saved baseline. This avoids a navigation race where Saved previously mounted before `currentBuild` reached storage. Any selected component enables this handoff, matching Saved's partial-build comparison support, while Save and Analyze retain their four-required-part gates. The comparison identifies the side as `<name> · Current`, keeps Analyze and Hardware targeting that exact build object, and updates empty/header copy to describe current-versus-saved and saved-versus-saved comparisons. Saved status messages now participate in page flow instead of using a fixed toast that covered the mobile header. A live current-versus-saved state rendered at 390×844 and 1440×900 with both correct build headings, no page overflow, and zero axe WCAG A/AA violations. The four-action mobile Build footer and in-flow confirmation remained within 390 px with every action at least 44 px high.

Saved cards and comparison headers use the same hardware readiness summary as Overview and Build. A selected FC/receiver without saved plans is labeled `Hardware plan missing`; complete plans show their actual local check count or blocker count instead of a generic “saved” badge. This keeps the FC/radio review state visible without implying that hardware was tested.

The comparison calculates row-level differences, shows the difference count, marks changed rows with an accessible text label, and offers a `Changed only` filter that reduces the table to the differing values. The filter has a disabled state when both builds are identical.

Comparison rows now expose the key reasons two builds differ, not only the selected product names: frame size, motor KV and stator size, propeller size and blade count, battery cell count and capacity, ESC continuous current, FC firmware and processor, receiver protocol, and receiver channel count. These remain catalog/specification comparisons and do not imply analyzed performance equivalence.

Compare can export `rotorbench.build-comparison.v1` JSON. The report contains normalized per-build summary fields and portable specification rows (`id` and `name` rather than full component records), difference count, and explicit `catalogComparisonOnly`, `hardwareVerified: false`, and `performanceAnalyzed: false` boundaries. The filename uses both build IDs and is filesystem-safe.

Saved builds can also be renamed inline or duplicated. Duplication creates a new build identity, preserves component selections, and copies local FC/radio plans plus any sanitized attached-evidence summary to the new build. Saved cards distinguish complete from partial hardware plans and separately show the imported-evidence label. Online and offline storage paths use the same behavior.

Reopening a saved build and choosing Save now updates that build in place. Explicit duplication remains the way to create a copy, preventing accidental duplicate IDs from ordinary edits.

Saved cards provide a direct Edit action that restores the build from route state even when the current build context is empty. Restored builds can then be edited and saved in place.

Saved cards also expose a compact readiness row for physical-fit state, source-backed part count, estimated fields, and geometry fallbacks, so users can triage builds before opening analysis or comparison.

Build and analysis context plus offline saved-build workflows use the shared safe-storage helpers. Malformed JSON is removed and replaced with empty state; unavailable browser storage no longer blocks unrelated save/delete/duplicate/rename behavior.

Saved builds can be filtered by `Fit conflicts`, `Power-path review`, `Hardware plan review`, `Hardware plan clear`, or `Imported evidence` in addition to text search. The status select uses the same sanitized readiness summaries shown on each card, so filtering does not create a second independent verdict.

### Catalog and part selection

`rotorbench/src/components/PartPicker.jsx` provides a searchable dialog for each component category. Each option shows:

* the product name;
* category-specific specifications;
* price;
* whether a viewport model exists or geometry fallback will be used;
* verified compatibility, an explicit fit conflict, or an honest “fit data incomplete” state against the current build.

The current compatibility layer checks:

* propeller size against the selected frame's `maxPropSize`;
* motor voltage against the selected battery voltage;
* battery voltage against motor and ESC ranges;
* ESC current rating against motor maximum current;
* flight-controller voltage against the selected battery.

These electrical checks now have their own collapsible `Electrical limits` checklist beside the physical-fit rows. It reports propeller-to-frame clearance, motor voltage, ESC voltage, ESC current, and FC input voltage independently. A catalog conflict changes the manifest badge from `Ready` to `Review limits` while keeping `Analyze` available so the full analysis can expose the consequences. Unknown measurements stay `Awaiting data` rather than being treated as a pass.

The physical compatibility layer in `rotorbench/src/utils/physicalCompatibility.js` now also checks:

* frame stack pattern against ESC/FC mounting pattern;
* frame motor-mount range against a catalogued motor pattern;
* propeller bore against the motor prop shaft;
* propeller hub diameter against motor bell diameter;
* battery discharge connector against the power lead supplied with the ESC.
* a necessary battery-envelope bound: a battery whose two smallest dimensions exceed the frame’s complete bounding footprint is flagged as impossible in every orientation. A build-local measured `batteryDeckDimensionsMm` footprint replaces that conservative overall-frame bound and produces a measured result without claiming the deck dimensions came from the manufacturer.

The Parts Manifest shows whether physical fit is verified, conflicting, or still awaiting data. A picker must not call an unchecked combination “compatible.”

The manifest also exposes a collapsible `Physical fit checks` list. Each row names the specific component and check, such as the motor mount, propeller hub, board stack, or battery-to-ESC connector, and shows `Verified`, `Conflict`, or `Awaiting data` independently. This makes a green summary auditable instead of hiding which evidence produced it.

Each category picker stores up to five recent part IDs in safe local storage and exposes them through an explicit Recent filter.

Picker results can now be filtered independently by `Verified fit`, `No known conflict`, `Review conflicts`, or `Source-backed`, rather than treating verified, incomplete, and legacy data as the same state. Explicit Best-fit, price, weight, and name sorting keeps uncertain options visible unless the user chooses a stricter filter.

The picker also supports Arrow Down from search into the results, Arrow Up/Down between options, Home/End jumps, and normal Enter activation. Selected receiver cards were darkened where the automated audit found near-threshold contrast.

The receiver category now spans ultralight ceramic-antenna, single-receiver, and true-diversity options. BETAFPV Nano and SuperD metadata comes from BETAFPV product records; RadioMaster RP2 V2, RP3 V2, RP4TD, and related RP metadata comes from RadioMaster. RP2 V2 uses the manufacturer-published 0.55 g weight and 13 × 11 × 7 mm dimensions; RP3 V2 uses its published 4.6 g dual-antenna weight and 22 × 13 × 4 mm dimensions. A 16-channel or current-draw value is labeled estimated where the manufacturer page does not publish it, and every receiver uses CRSF/ExpressLRS semantics.

The motor category now includes the F1404 4600KV 3–4S and 2900KV 4–6S variants from the same source page as the validated 3800KV build motor. Both retain the 9×9 mm mount and 1.5 mm prop shaft and pass physical/electrical checks against the 3.5-inch platform.

The electronics category now includes Holybro Tekko32 F4 Metal 65A and iFlight BLITZ E55 30.5×30.5 ESCs, plus the Holybro Kakute H7 V2 flight controller. Their current, voltage, processor, IMU, weight, and mounting limits come from manufacturer pages. Holybro's official package supplies bare power pads, while iFlight supplies a power cable without publishing its connector type. The catalog records these as explicit `solder-pads` and `supplied-cable` connection modes, so the battery-to-ESC check reports manual termination instead of inventing either a match or mismatch.

The legacy Tekko32 F4 50A entry is now normalized against Holybro's current official product page. It records the correct 13.8 g weight, 48×37×6 mm envelope, 30.5×30.5 mm mounting, 4–6S input, 50 A continuous / 60 A burst ratings, DShot through 1200, MultiShot/OneShot/ProShot/PWM, current sensing, telemetry, AM32, and $62.99 price. The existing GLB remains bound through the model manifest, and only the mounting offset remains estimated. Power termination stays unclaimed because the manufacturer package does not publish a battery connector or supply one.

The mobile picker sheet now declares five grid rows for its five children (header, search, filters, results, footer). Previously the filter row collapsed behind the results because the grid declared only four rows.

The checks remain non-blocking and only run when both products carry usable data. Connector evidence currently covers source-backed battery plugs, four ESCs with included XT30/XT60 leads, one ESC with bare solder pads, and one ESC with an unspecified supplied cable. A conservative battery-envelope conflict is available from overall frame/battery dimensions; users can replace it with a measured usable deck footprint. Wire routing and board clearance still need catalog or build-local evidence before they can be verified.

The Parts Manifest also promotes that relationship into a compact `Power path` block as soon as a battery or ESC is selected. It names the battery, ESC, and known connector/termination on both ends, then uses a source-aware state: `XT30/XT60 match`, `Adapter required`, `Solder lead`, `Verify termination`, or `Awaiting connector data`. Known battery and ESC connector evidence links directly to its catalogued source. The route is horizontal on desktop and vertical on mobile; it is a planning relationship, not a wiring or polarity verification claim.

Power-path state now propagates into Saved as a state chip, Compare as a battery-power-path row, Analysis as a hardware fact, and both build sheets and analysis reports as a named summary. These surfaces retain the same label, battery/ESC names, connector fields, message, and explicit verification boundary.

The build also exposes a collapsible provenance panel. For every selected part it shows whether the catalog is source-backed or legacy, which fields are estimated, whether geometry is a fallback, and separate product, price, and connector source links.

The provenance panel can export a portable `rotorbench.build-sheet.v1` JSON draft. It includes selected IDs, physical-fit state, electrical-limit state, both sets of individual check rows, provenance counts and parts, and explicitly records that analysis and hardware verification are not included.

The expanded Build provenance rows use the same readable field labels as the part picker. Catalog keys such as `dimensionsMm`, `currentDraw`, `mounting_point`, and `dischargeProfile` render as `dimensions`, `current draw`, `mounting offset`, and `discharge curve`; locally measured geometry uses the same treatment. The raw catalog keys remain unchanged in persisted data and exports.

Build can also copy a versioned `/build?share=...` link containing only validated catalog component IDs and selected-part measurement overrides. Saved cards expose the same action. The decoder validates the schema, catalog IDs, token length, and measured values before applying anything. It excludes build notes, hardware plans, binding phrases, UIDs, evidence, serial paths, and local identifiers. Shared links take precedence over stored drafts, are consumed into a normal working build, and retain the usual compatibility and analysis gates.

Completed Analysis reports also expose `Share build link`. It copies only the underlying component and measurement configuration and labels the result `analysis excluded`; analysis results and hardware evidence are not embedded.

Compare exposes `Share comparison` and can reopen `/compare?left=...&right=...` from two validated build-link tokens. Shared comparisons relabel the sides as `Shared build A/B`, reject malformed or stale catalog references explicitly, and still exclude notes, hardware plans, binding material, and evidence.

Build sheets also include the sanitized attached-evidence summary when present: status label, attachment time, scope/identity state, pass/fail/open counts, and explicit `hardwareVerified: false` plus `authenticityVerified: false`. Raw evidence files and full checks are excluded.

Exported build sheets now also preserve the eight-check Viewer placement audit: frame mounts, four motor roots, propeller-to-shaft alignment, electronics stack order, battery-above-electronics clearance, motor mount-pattern interface, propeller hub/shaft interface, and propeller sweep separation. Each check carries verified/estimated/fallback/conflict/awaiting detail plus verified, estimated, fallback, assembled, conflict, and awaiting counts under `viewer-placement` scope. This is geometry and catalogued-interface auditing, not complete physical fit or flight readiness.

The Build provenance panel also exports a portable BOM CSV. It uses the frame motor count as the quantity for motors and propellers, lists catalog unit and extended prices, product source URLs, source-backed/legacy state, and estimated-field counts. A final `Catalog total` row sums component quantity and extended catalog price. Missing categories remain explicit `Not selected` rows with quantity 0 and `missing selection` status so a partial configuration cannot look like a complete order. The CSV is a purchasing aid based on catalog data; it does not imply live retailer pricing or analyzed performance.

The same sheet now carries a sanitized `hardwarePlan` readiness summary, including firmware, receiver transport, UART/baud, radio target, local check counts, and `hardwareVerified: false`. It does not copy binding material, UIDs, or raw FC/radio configuration objects.

Saved builds can import those v1 sheets. Import validates the schema and every referenced catalog ID, rejects unknown components, creates a new build identity, and never overwrites an existing build.

### 3D assembly

The viewer is `rotorbench/src/components/BabylonViewer.jsx`. The pure transform and placement logic is `rotorbench/src/assembly/assemblyTransforms.js`.

Imported catalog GLBs with a complete three-axis catalog envelope are uniformly scaled to that envelope before placement. The scale uses the median ratio across width, height, and depth so model proportions are preserved; matching is skipped for missing, non-positive, or implausible dimensions. Catalogue GLBs with only a planform or no trustworthy full envelope remain unscaled. Source-backed assembly notes label envelope-targeted assets separately from plain legacy-unverified GLBs.

The intended assembly contract is:

1. The selected frame defines four motor mount positions.
2. Motor model origins are normalized to the base-centre mounting anchor.
3. Four motor instances are placed at the frame mounts.
4. Propeller origins are normalized to the hub plane.
5. Four propellers are placed directly above the four motor shafts.
6. Propeller handedness alternates diagonally as CW, CCW, CCW, CW or the inverse according to the corner order.
7. ESC, flight controller, and receiver are stacked in that order with measured vertical separation.
8. The battery is placed above the electronics stack.
9. Available GLB files are preferred over STEP files. STEP remains a fallback path.
10. Components without matching assets use parametric geometry based on catalog dimensions.

The viewer status overlay no longer stays on `Waiting...` after fallback assembly renders. When the assembly pass completes it reports the visible mesh count and generated-fallback count, for example `41 meshes · 41 generated fallback`, alongside the camera and scene-bound diagnostics. Individual source URL load states remain listed separately. The 3.5-inch preset rendered the final success state with no horizontal overflow.

The camera rotates around the whole assembly. It must not rotate individual component meshes, because that separates a build that is already placed in world space.

The Build page exposes Orbit, 3/4, Top, Side, and Front inspection views. Fixed views stop automatic rotation, and Orbit resumes it. Auto-rotation is read through a ref so changing modes does not rebuild the Babylon scene or reload models.

An `Exploded` inspection toggle separates propellers, ESC, FC, receiver, and battery upward along the shared Y axis while leaving frame and motor mount coordinates fixed. The state is reflected as `?exploded=1`, so a reviewer can reopen the same inspection view directly. Toggling it off restores the exact assembled pose. The camera refits for the expanded bounds, and resetting the build returns the viewer to assembled mode.

Exploded inspection also exposes collapsible source-backed assembly notes for every selected part. Each note names the viewer anchor used by that component, shows only catalogued interface and geometry facts, distinguishes local measurements, source-plus-estimate data, source specifications, and catalog-only entries, labels catalog GLBs versus generated fallbacks, and links to the product source when one exists. `Copy notes` produces a plain-text anchor/fact handoff with source URLs and the same explicit boundary; it does not claim wiring, physical-fit, or hardware verification.

Both the 3D and orthographic/2D viewers check for a usable WebGL context before constructing Babylon. Browsers with WebGL disabled or unavailable receive an explicit preview-unavailable message instead of an uncaught runtime error.

Propeller fallback hubs now derive a finite diameter from the prop dimensions when no explicit hub size is catalogued. This fixed a camera-fit regression where missing hub data defaulted to a one-scene-unit mesh and made the entire 3.5-inch assembly appear tiny.

The viewer previously had a temporary `window.__ROTORBENCH_SCENE__` inspection hook. It has been removed. Do not reintroduce a global debug hook unless it is explicitly development-only and removed before completion.

Overview and Build now request all model categories concurrently rather than chaining seven model-list requests. Superseded component changes abort their in-flight model-list requests, and a completed stale Build load cannot overwrite newer model state. Asset matching, fallbacks, and assembly placement are unchanged.

### Analysis and saved builds

The existing build-to-analysis flow still works:

1. Choose a frame, motor, propeller, and battery.
2. Optional electronics can also be selected.
3. The 3D preview assembles available models or generated fallbacks.
4. `Analyze` posts the build to the FastAPI analysis endpoint.
5. The analysis page renders selected components, performance metrics, flight simulation, chart data, warnings, errors, and total cost.

The analysis header offers a print-ready report with dedicated paper layout rules plus a `rotorbench.analysis-report.v1` JSON download. The export includes the build identity, component IDs, complete analysis result, an explicit estimate marker, and `hardwareVerified: false`. It does not alter the existing `rotorbench.build-sheet.v1` format. The final action opens the build-aware hardware setup instead of exposing the previous nonfunctional order button.

Analysis now carries a compact hardware-plan context card showing the selected FC/receiver, firmware, receiver transport, UART/baud, radio target, local review state, and the explicit boundary that hardware was not tested. The JSON report includes the same fields in a sanitized `hardwarePlan` object; configuration objects and binding material are never copied. Analysis-only notices are labeled separately so a clear performance/fit analysis cannot be mistaken for a clear FC/radio plan.

Downloaded analysis reports also include a sanitized `importedEvidence` summary when evidence is attached to the build: status label, attachment time, revision/identity scope state, pass/fail/open counts, failed and unverified check names, and explicit `hardwareVerified: false` plus `authenticityVerified: false`. Raw files, serial paths, binding material, and full imported checks are excluded.

Analysis reports also include the eight-check Viewer placement audit with all geometry-confidence counts and details under `viewer-placement` scope. This is geometry and catalogued-interface auditing, not complete physical-fit or hardware verification.

If the route is refreshed or opened directly, Analysis falls back to the persisted current build and reruns the analysis instead of showing “No build selected.”

When there is genuinely no current build, Analysis now uses a task-oriented empty state instead of a red error banner. It offers `Start a build` and `Open saved builds`, explains that analysis converts a complete catalog build into an estimated flight profile, and separates required parts, fit/electrical review, and hardware/evidence boundaries. The state rendered as two workbench panels at 1440×900 and one stacked column at 390×844, with 44px actions and no overflow.

For builds without an FC or receiver, the Analysis hardware card reports `No hardware selected` and `Not selected` instead of presenting fallback firmware, UART, or radio defaults as if they belonged to the build.

A test build using the expanded catalog completed successfully and rendered a real analysis result. The backend currently records component metadata but does not require a matching mesh to analyse a component.

## Key files

### Frontend

| File | Responsibility |
| --- | --- |
| `rotorbench/src/App.js` | Lazy routes, accessible loading state, analytics, scroll reset, app shell |
| `rotorbench/src/components/AppNav.js` | Desktop sidebar and mobile navigation |
| `rotorbench/src/components/RouteErrorBoundary.js` | Lazy route/rendering failure recovery |
| `rotorbench/src/components/HomePage.js` | Build overview, 3D preview, telemetry |
| `rotorbench/src/components/BuildPage.js` | Part selection, model URLs, measured geometry, placement audit, power path, and assembly specification |
| `rotorbench/src/components/AssemblyInterfaceMap.jsx` | Source-backed frame, motor, shaft, stack, and power interface map beside the 3D viewer |
| `rotorbench/src/components/PartPicker.jsx` | Searchable part catalog and compatibility display |
| `rotorbench/src/components/SetupPage.js` | Unified flight-controller and radio plan workflow |
| `rotorbench/src/components/SetupSectionNav.jsx` | Shared keyboard-accessible section jump strip for both configurators |
| `rotorbench/src/components/FlightControllerSetup.jsx` | Flight-controller configuration planner |
| `rotorbench/src/components/RadioLinkSetup.jsx` | ExpressLRS radio and channel planner |
| `rotorbench/src/components/BenchRunbook.jsx` | Copy-only hardware bench workflow |
| `rotorbench/src/components/BenchEvidenceReview.jsx` | Read-only import and review of Aerial Kit JSON evidence |
| `rotorbench/src/components/WebSerialCapture.jsx` | Explicit opt-in read-only serial byte capture |
| `rotorbench/src/components/ComparePage.js` | Two-build catalog comparison |
| `rotorbench/src/data/flightControllerProfiles.js` | Board, firmware, channel, and validation profiles |
| `rotorbench/src/data/radioProfiles.js` | Radio target, link, binding, and channel profiles |
| `rotorbench/src/utils/elrsBinding.js` | Source-compatible phrase byte length and first-six-MD5-byte UID preview |
| `rotorbench/src/data/platformPresets.js` | Six validated 3.5-inch and 5.5-inch starter builds |
| `rotorbench/src/utils/buildComparison.js` | Catalog totals, fit state, evidence, and hardware-plan comparison |
| `rotorbench/src/utils/buildEvidence.js` | Selected-part source, estimate, and fallback summary |
| `rotorbench/src/utils/buildSheet.js` | Portable draft build-sheet generation and validated import |
| `rotorbench/src/utils/buildBom.js` | Quantity-aware catalog BOM and CSV generation |
| `rotorbench/src/utils/analysisReport.js` | Versioned portable analysis report and safe filename |
| `rotorbench/src/utils/storage.js` | Safe local JSON reads/writes with malformed-state recovery |
| `rotorbench/src/utils/savedBuilds.js` | Build clone, rename, and local hardware-plan copy helpers |
| `rotorbench/src/utils/flightControllerCommands.js` | Aerial Kit console command preview |
| `rotorbench/src/utils/receiverWiring.js` | Board-bounded receiver continuity, telemetry, inverter, supply, and polarity checklist |
| `rotorbench/src/utils/radioEndpointPlan.js` | Native USB, host UART, RX-to-FC baud, role, antenna, and RF-observation checklist |
| `rotorbench/src/utils/benchRunbook.js` | Source-backed `ak fc` / `ak radio` runbook generation |
| `rotorbench/src/utils/benchEvidence.js` | Validated pair/bench/capture evidence normalization and gate review |
| `rotorbench/src/utils/fcEvidence.js` | Read-only `ak fc status --json` and `ak fc preflight` normalization and correlation |
| `rotorbench/src/utils/radioDeviceEvidence.js` | Sanitized `ak radio status` identity, role, baud, firmware, and product correlation |
| `rotorbench/src/utils/benchEvidenceAttachment.js` | Sanitized build evidence storage, revision scope, copy, removal, and summaries |
| `rotorbench/src/utils/webSerialCapture.js` | Web Serial capability, byte formatting, and error copy |
| `rotorbench/src/utils/crsfCapture.js` | Incremental CRSF framing, CRC, RC channels, and link statistics decoding |
| `rotorbench/src/utils/hardwarePlanTransfer.js` | Validated combined FC/radio plan export/import |
| `rotorbench/src/utils/hardwareReadiness.js` | Build-to-Setup hardware-plan restoration and readiness summary |
| `rotorbench/src/utils/physicalCompatibility.js` | Stack, mount, shaft, power-path, battery deck, and summary fit checks |
| `rotorbench/src/utils/electricalCompatibility.js` | Prop clearance, voltage, current, and FC input checks |
| `rotorbench/src/components/BabylonViewer.jsx` | Babylon scene, model loading, normalized placement, fallbacks |
| `rotorbench/src/assembly/assemblyTransforms.js` | Millimetre-to-scene transforms and assembly math |
| `rotorbench/src/components/PropRotationMap.jsx` | Front-oriented corner handedness diagram derived from assembly constants |
| `rotorbench/src/assembly/cameraViews.js` | Stable Orbit, 3/4, top, side, and front camera presets |
| `rotorbench/src/components/AnalysisPage.js` | Performance and flight-time analysis |
| `rotorbench/src/styles/analysis.css` | Analysis base layout, print report, loading and error states |
| `rotorbench/src/styles/workbench.css` | Workbench layout and product UI |
| `rotorbench/src/styles/setup-page.css` | Hardware setup page shell and tabs |
| `rotorbench/src/styles/fc-setup.css` | Flight-controller configurator |
| `rotorbench/src/styles/radio-setup.css` | Radio configurator |
| `rotorbench/src/styles/compare.css` | Build comparison and print layout |
| `rotorbench/src/styles/modernization.css` | Analysis, saved-build, and profile refinements |
| `rotorbench/src/index.css` | Global tokens, app shell, responsive navigation |
| `rotorbench/src/data/components.json` | Runtime component catalog |
| `rotorbench/src/types/components.ts` | TypeScript-facing catalog shapes |

### Backend

| File | Responsibility |
| --- | --- |
| `backend/main.py` | FastAPI app and API routes |
| `backend/models/components.py` | Pydantic component and build models |
| `backend/utils/component_data.py` | Reads the frontend catalog, hydrates builds |
| `backend/utils/build_analysis.py` | Performance calculations |
| `backend/utils/model_converter.py` | GLB conversion, caching, fallback placeholder generation |
| `backend/tests/test_catalog.py` | Catalog count, unique ID, Pydantic hydration, and RP2 source/estimate contracts |
| `backend/assets/` | Source GLB and STEP assets |

## Verification already completed

The following checks passed before this handoff was written:

```bash
cd rotorbench
npm run build
CI=true npm test -- --watchAll=false

cd ../backend
.venv/bin/python -m unittest discover -s tests -v
```

The latest catalog, BOM, model-manifest, comparison, interactive assembly-profile, mounting-interface, Setup section navigation, board-alignment, control-loop, battery telemetry, critical-pack return, Aerial Kit mission-channel and hand-launch planning with cross-route control context, frame-aware hardware-plan checks, navigation safety with GPS gate and cross-route portability, Betaflight Stage 2 failsafe throttle, picker source review and evidence sorting, category-aware firmware and radio facets, starter-platform joint summaries, power-path adapter and polarity guidance, grouped and source-backed radio target planning, PWM-only serial-route suppression and topology review, direct PWM setup guidance, saved-build weight/price sorting, Matek H743-WING flight-controller planning, the two-motor HeeWing T1 Ranger wing platform and its H743 starter, saved Aerial Kit wing-output mapping, frame-integrated T1 servo hardware and assembly placement, cross-route and Setup servo-output coverage reporting, fixed-wing performance fail-closed behavior, complete T1 hardware context in Analysis, starter-platform size and fit-evidence filtering, SpeedyBee F405 V5/OX32 hardware depth, RP4TD-M and compact ER PWM receivers, AOS 5 V5 and Volador II VX5 frames, Tattu V6 and CNHL V2 batteries, AOS Supernova motor catalog depth, Gemfan 51499 propeller depth, the public Adafruit Feather F405/Aerial Kit wing path, motor performance-data disclosure, picker and Build provenance estimate-name disclosure, 44 px picker controls, hardware-briefing, portable-build-link, and automated accessibility rerun passed 672 frontend tests across 66 suites, the production build, full ESLint, thirty-two backend tests, and the Impeccable detector. The long audit inventory below records earlier test passes; its feature coverage remains valid and the newer focused tests are additive.

`axe-core` is now an explicit development dependency. Reusable jsdom structural checks run against the interactive assembly profile and populated comparison with WCAG 2 A/AA tags; colour contrast remains covered by the rendered-browser checks because jsdom has no layout engine.

The production build compiled successfully. 672 frontend tests passed across 66 suites covering routing failure recovery, persistent-state recovery, automatic unsaved-build recovery, explicit clean new-build starts including same-route resets, stale draft ID rejection, Setup draft recovery without binding material, 92-product catalog integrity, starter-platform state integrity and deep links, Setup section navigation with reduced motion, assembly transforms, source-aware eight-check viewer placement and mounting-interface checks, build-local measured-geometry validation/persistence/export/analysis propagation, estimated/fallback/measured confidence propagation, interactive sweep/mount fit overlay, motor-pattern/hub/sweep conflicts, exploded inspection, prop-hub fallback, 3D/2D WebGL fallback, inspection views, actual Aerial Kit arm gates, board-alignment, control-loop, receiver calibration, battery-telemetry, critical-pack return, geofence, return-floor, and cross-route navigation-safety planning, public Feather F405 mapping to the wing configurator, category-aware firmware and radio facets, starter-platform catalogued-joint summaries, connectivity adapter and polarity guidance, grouped radio endpoint selection with internal-RF, native-USB, module-bay, sub-GHz, and generic profiles, PWM-only receiver topology without invented serial routes and with retained review items, direct PWM setup guidance, saved-build weight/price sorting, Matek H743-WING ArduPilot UART and output mapping, HeeWing T1 Ranger two-motor transform and H743 starter rendering, saved Aerial Kit wing-output mapping, frame-integrated servo BOM and fallback placement, cross-route and Setup servo-output coverage review, fixed-wing fail-closed performance analysis, complete T1 servo hardware and coverage context in Analysis, output-budget disclosure before controller selection, motor performance-data disclosure, captured channel extrema and planned-calibration comparison, multiple RC frames per serial read, documented sensor-fit and internal-flight-log defaults, read-only Aerial Kit log discovery, control-path mapping, issue-to-field review navigation, unsupported control-role and integer-limit validation, workspace/public control-role separation, build-frame motor-count matching, target-specific radio power and fail-closed enum validation, MAVLink full-resolution switching and reported link-mode correlation, hidden-role sanitation, firmware-switch role cleanup, Build-to-Setup and Setup-to-Build draft preservation, hardware readiness across Build, Saved, Compare, and Analysis, direct Analysis refresh recovery, partial-build hardware-state accuracy, conservative battery-envelope failures, plan-aware bench-runbook generation and write-gated copying, Aerial Kit pair/bench/capture import, native CRSF-observation import, FC RC JSON freshness/plausibility parsing, FC preflight JSON parsing, TX and RX native observation correlation, synchronized TX/RX descriptor open and stop, failed-open rollback, double-click command latching, shared capture-session correlation, target-change session reset, current-target, direction-specific baud and capture-window checks, duplicate endpoint rejection, imported FC status and preflight protocol/state/line correlation, Betaflight preflight parsing, Betaflight failsafe bit decoding, protocol-aware receiver-link handling, parameter coverage and partial-snapshot refusal, review-item filtering, explicit FC/radio observed-value adoption, domain-specific adoption scope guards, radio target-status gating, sanitized bounded evidence history and compatible-run comparison, legacy raw-UID migration, redacted review export, sanitized radio status role/baud/firmware/product correlation and mismatch messaging, report-plus-TX/RX-boot bundle correlation, TX parameter-snapshot correlation, FHSS seed/channel correlation, direction-aware endpoint evidence, strict UID validation, parser/cadence/freshness/link-quality checks, quality failures overriding a file-reported RF pass, sanitized build-level evidence attachment, revision and plan scope matching, staged-identity fingerprint matching, stale-evidence downgrade, removal and duplicate propagation, legacy unscoped-evidence labeling, shared Aerial Kit CRSF protocol vectors, sanitized review export, read-only Web Serial lifecycle, CRSF framing/link/telemetry decoding, failed-capture evidence export, Betaflight-only command previews, contextual radio planning and channel overview, phrase-derived UID vectors, binding-phrase byte limits, hardened hardware-plan and radio-enum import validation, verified/conflict/source-backed picker filters, keyboard result navigation, price sorting, recent parts, physical and electrical compatibility, build provenance, portable BOM CSV export with explicit missing selections, sanitized hardware context in build sheets and analysis reports, comparable build diffs and portable comparison export, saved-build upsert, profile action state, and lifecycle actions. Full ESLint passes. The Impeccable source detector reports no findings on the changed UI.

Thirty-two backend contract tests independently verify category counts, globally unique IDs, Pydantic hydration of all 92 products, model-manifest file existence and propeller pairing, the two-motor T1 Ranger frame binding, Matek H743-WING published specs, Adafruit Feather F405 source metadata, ER3C-i/ER4/ER5A/ER5C-i/ER6/ER8 PWM source metadata, RP2/RP3/RP4TD-M/XR4 source-versus-estimated metadata, AOS 5 V5 and Volador II VX5 interface and estimated-placement boundaries, SpeedyBee F405 V5 controller and OX32 ESC boundaries, Tattu V6 and CNHL V2 pack boundaries, AOS Supernova motor boundaries, F1404 mounting/voltage contracts, the AOS 7 / XING 2806.5, Cine25 / Gemfan 2520, HQProp 5037, and Gemfan 51499 field boundaries, measured-geometry round-tripping plus positive-value validation, and the source-backed power-connection modes.

The backend catalog validates through `ComponentDatabase`, and the running `/api/components` endpoint returns all 92 items.

Restart an already-running FastAPI process after schema changes. The current local UI server may hot-reload frontend files, but Uvicorn does not reload backend models unless started with reload enabled.

The backend dependencies are installed in the ignored `backend/.venv`, and the current-code Uvicorn instance is running on `127.0.0.1:8000`. Restart Uvicorn after catalog changes so `/api/components` reloads all 82 products. Current smoke tests report:

* AOS 3.5 V5.1 platform: 3,340 g thrust, 297.6 g analysis weight, 4.7 minutes estimated flight time, no warnings or errors.
* AOS 5.5 V2 platform: 5,800 g thrust, 563.8 g analysis weight, 3.2 minutes estimated flight time, no warnings or errors.

Automated WCAG A and AA checks passed for the main routes at 390, 768, and 1440 px widths, including both Setup tabs, the comparison empty state, and the open part-picker dialog.

A fresh axe-core 4.14.1 WCAG A/AA run against the updated Overview, deep-linked 3.5-inch Build, flight-controller setup, and radio setup reports zero violations at both 390×844 and 1440×900. The revised FC and radio Setup tabs were re-audited after adding the real arm gates, target-local power input, and Rev A3 role/LED legend, again with zero violations at both widths and no horizontal overflow. The Build hardware-readiness card was rechecked separately after its metadata contrast fix and reports zero violations at both widths. Earlier audits cover all nine route states plus an open part-picker dialog and a populated two-build comparison.

The partial-FC-parameter and collapsed evidence-history states were rendered at 390×844 and 1440×900. The history remains after current evidence actions, expands on demand, reports unlike evidence sets as `Not comparable`, and has no horizontal overflow. Axe reports zero violations at both widths. A live localStorage inspection found no raw staged TX/RX UID after attachment and history creation; the temporary headless Chrome session was stopped after verification.

Seeded Saved and Compare states with one complete hardware plan and one missing plan were rendered at both widths. The new readiness labels fit without overflow, and axe reports zero violations in all four states.

The expanded part picker, including its new filter and sorting controls, was rendered open with the 3.5-inch preset at both widths. The modal remains scrollable without page overflow, and axe reports zero violations.

The eight-platform Overview and `source-35-4600` deep link were rendered at both widths. The new starter loads the 4600KV motor and RP2 with all seven catalog parts; axe reports zero violations at 390×844 and 1440×900.

The `source-25` deep link was rendered at both widths with all seven catalog parts. Its generated 3D assembly places four motors on the 120 mm frame, four 2520 propellers on the 1.5 mm shafts, electronics on the 20×20 stack, and the battery above them. Assembled and exploded views retain the same X/Z alignment. Physical and electrical panels report five verified checks each with no data gaps.

The completed Analysis report was rendered with a saved hardware plan at both widths. The hardware context and open-check count fit without overflow, and axe reports zero violations.

The populated comparison was also audited with one motor changed and `Changed only` active. axe reports zero violations at desktop and mobile widths; the table reduced from 16 rows to seven without horizontal page overflow.

The expanded eight-receiver picker was audited open at desktop and mobile widths with zero axe violations and no page overflow. The mobile filter row now remains visible instead of being covered by the result list.

The 12-motor picker was also checked with all three F1404 variants visible. The new options remain distinguishable by voltage, KV, current, and estimated-field provenance, with zero axe violations and no overflow at either width.

The seven-ESC picker was audited open at both widths with zero violations and no page overflow. It shows the new Tekko32 and BLITZ E55 products with source-backed voltage, current, weight, and mounting metadata.

The expanded `Live serial capture` panel reports zero axe violations at desktop and mobile widths with no page overflow. Chromium exposes Web Serial on the local origin; the mocked lifecycle confirms that opening a chosen port reads bytes while the writable stream is never requested. A mocked two-port render verified that both selected descriptors reach `2/2 capturing` through one `Start together` action, expose `Stop together`, record per-card start/end state, and return to `0/2 ports selected` after stopping. Axe reports zero violations at 390×844 and 1440×900 with no control below 44px or horizontal overflow.

A Betaflight status + preflight + RC bundle was rendered with sixteen channel samples at both widths. The RC channel grid stays readable without overflow, distinguishes a mismatched selected firmware plan as a failure, and retains the visible no-RF-proof boundary. Axe reports zero violations at 390×844 and 1440×900.

The evidence `Review items` filter was rendered with a populated sixteen-check bundle at both widths. The control reports 44px targets, keeps failed and unverified rows visible while removing passes, and has no overflow. Axe reports zero violations at 390×844 and 1440×900.

The observed-value adoption card was rendered at both widths with current/observed FC fields and explicit selection controls. Confirming a three-field patch updated the local plan, regenerated dependent previews, showed the no-hardware boundary, and immediately switched the same-domain card to a scope-change warning. The blocked mobile state has no overflow, 44px actions, and zero axe WCAG A/AA findings.

Saved and Profile were re-rendered at 390 and 1440 widths after the responsive corrections. Saved exposes a full-width search row and untruncated actions; Profile keeps Register/Cancel in document flow with no floating-dock collision. axe reports zero violations on both routes at the tested viewport.

The populated CRSF decoder was also rendered in Chromium with Aerial Kit's RC-centre and link-statistics vectors injected through a mocked port. It showed sixteen raw channel values plus uplink/downlink LQ, RSSI, and SNR, with zero axe violations at desktop and mobile widths and no page overflow.

The evidence action was browser-tested with the populated decoder. It emits `rotorbench.crsf-observation.v1`, excludes raw byte and port fields, and leaves RF explicitly unverified. Evidence export is also available after a stopped or failed capture once bytes or capture state exist, so no-byte, resync-only, and CRC-error observations remain diagnosable. The exported observation includes plan role/target, expected and observed baud, channel labels, parser counters, frame-type counts, and conservative timing information without serial identity or binding material.

A fuller browser render used Aerial Kit's attitude, battery, barometer, GPS, and flight-mode vectors together with RC/link data. Seven valid frames produced `ANGLE`, 16.8 V / 12.3 A, 88% / 1500 mAh, attitude angles, 123.4 m altitude, and GPS/satellite data with zero axe violations at desktop and mobile widths.

The populated observation ladder rendered all six stages, including `RF path not verified`, and showed a 1.2-second frame age in the browser check. axe reports zero violations at desktop and mobile widths.

A selected-build audit now also covers the complete 3.5-inch preset with the `Physical fit checks` disclosure open. axe reports zero violations at desktop and mobile widths, and the rendered layout has no horizontal overflow.

A second selected-build audit covers the valid 3.5-inch preset with `Electrical limits` open and an induced 6S mismatch against the F1404 motor. Both states report zero axe violations. The mismatch produces one explicit conflict, changes the badge to `Review limits`, and leaves `Analyze` available for diagnosis.

The expanded `Bench runbook` also passes axe at desktop and mobile widths. Its command blocks remain one command per line and are keyboard-focusable horizontal scroll regions, avoiding unsafe soft-wrapping of shell commands.

The assembly was checked by scene bounds and transform inspection for both of these cases:

* a build using the repository's original GLB assets;
* a build using the expanded catalog's generated geometry fallbacks.

The checks confirmed four motor instances, four propeller instances, aligned motor and propeller X/Z positions, propellers above motor tops, non-overlapping ESC/FC/receiver levels, and a battery above the electronics stack. The exploded mode keeps the same X/Z alignment and restores exact assembled Y positions when disabled.

The Build preview now exposes a source-aware eight-check `Viewer placement` audit. Beyond the original mount/root, propeller-axis, stack, and battery-clearance checks, it compares the motor mounting pattern against the frame's listed patterns, the propeller bore against the motor shaft, and resolves minimum propeller-disc separation from the actual corner geometry. Checks are `Verified`, `Estimated`, `Fallback`, `Awaiting`, or `Conflict`; estimated/fallback geometry propagates through dependent placement checks and prevents a false complete state. The AOS 3.5 preset reports `4/8 verified · 4 estimated`, and the AOS 5.5 XING2 preset reports `2/8 verified · 6 estimated`, while interface or sweep mismatches report `Conflict`.

Exploded mode now adds a source-aware inspection strip beneath the 3D stage. It reports selected-part count, catalog geometry count, generated fallback count, and a `Catalog geometry` / `Mixed geometry` / `Fallback geometry` state, then states that separation clarifies stack and mount relationships without proving product-exact fit, wiring, or hardware readiness. The AOS 5 V5 source preset rendered `7 selected parts · 0 catalog geometry · 7 generated fallbacks` at both widths with no horizontal overflow, making the fallback status visible before the placement audit.

On phone widths the Viewer placement summary stacks its long confidence badge below the title instead of forcing the heading into a narrow word column. The title retains the full content width while the badge wraps within the second grid column.

Build also exposes a collapsed `Measured geometry` panel for frame, motor, propeller, battery, ESC, flight controller, and receiver dimensions. Values are entered in millimetres, validated as positive, scoped to one saved build, and never written into `components.json`. The panel focuses one part at a time, reports build-wide measured/missing field coverage, and supports axis-by-axis vector entry. Clearing a value preserves the editable draft until focus leaves the field. The persisted `rotorbench.measured-geometry.v1` override shape feeds the 3D placement audit, physical-fit checks, draft recovery, local/server saves, saved-build comparison, analysis payloads, build-sheet export, analysis-report export, and backend hydration. Build sheets and analysis reports also include a named `rotorbench.measured-geometry-summary.v1` provenance block with part names, field labels, measured values, catalog values, and explicit build-local scope. Fields remain labeled `Catalog`, `Catalog estimated`, `Measured`, or `Missing`; a user measurement is reported as `Measured` and does not turn the build into hardware verification. T-Motor F60 measurement data is used as the coverage example because its catalog entry intentionally lacks shaft and bell dimensions.

Unresolved Viewer placement checks now offer contextual `Measure` actions only when a panel field can actually address the condition. For example, `Propeller hub interface` opens the motor tab and focuses `Prop shaft diameter`; motor-pattern, propeller-sweep, battery-clearance, and missing electronics-dimension gaps map to their corresponding part and field. The action does not offer a misleading target when the blocker is an absent component or unavailable frame mount coordinates.

Frames expose a `Usable battery deck` measurement with an explicit instruction to measure clear flat area excluding arms and standoffs. When supplied, `Battery deck footprint` compares the battery in its best-case orientation against that measured footprint. A fitting battery is reported as `Measured`; an oversized battery is a measured conflict. Without this value, RotorBench falls back to the conservative overall-frame bounding footprint and leaves that broader check unverified.

An optional `Fit overlay` renders those catalogued interfaces directly in the Babylon scene: propeller sweep rings and translucent discs follow each propeller root, while motor mounting-pattern outlines follow each motor root. Lime marks a verified interface, teal marks build-local measurement, orange marks a conflict, and muted grey marks incomplete metadata. The overlay stays attached through exploded inspection and is presented with a compact legend; it remains geometry visualization, not a physical-fit or flight-readiness claim.

The viewer also exposes a `Prop rotation map` derived from the exact same corner-order and handedness constants used to place the 3D propellers. It shows `UL/CCW`, `UR/CW`, `LR/CCW`, and `LL/CW` in a front-oriented schematic. The diagram deliberately labels frame corners rather than vendor motor numbers and directs the user to confirm airframe and propeller markings before wiring or flight.

The Build preview now includes a collapsed `Assembly profile` side view generated from the same transform helpers that place the Babylon components. It orders propellers, motors, battery, receiver, flight controller, ESC, and frame by derived Y position, reports their assembly-coordinate ranges, labels dimensions as source specification, estimated, or measured, and provides per-layer show/hide controls over the 3D scene. The map explicitly identifies an estimated frame stack height and does not replace the placement audit or a physical fit check.

The Build preview now also includes a collapsed `Mounting interfaces` map that shows each selected physical joint as two named endpoints with their catalogued values: frame motor patterns to motor mounts, motor shaft to propeller bore, frame stack patterns to the FC and ESC, and battery connector to ESC termination. Compact statuses distinguish matched, locally measured, conflict, and missing metadata, while the panel states that catalog interface agreement is not a physical inspection. On the 3.5-inch source build, it exposes the AOS 3.5 frame's 9 × 9 and 12 × 12 mm motor patterns, the 1.5 mm motor-shaft/prop-bore match, both 20 × 20 mm stack interfaces, and the XT30 battery lead. The expanded map rendered with zero axe WCAG A/AA violations and no horizontal overflow at 390×844 and 1440×900.

The rendered Impeccable check reports zero findings for Build with the source-aware eight-check placement audit open at 390×844 and 1440×900, with no horizontal overflow. The expanded Setup Bench tools, runbook, and live-capture disclosures pass axe-core WCAG A/AA with zero violations and no horizontal overflow. Analysis, Saved, and Profile report zero rendered detector findings and zero axe violations at both widths after the shared title, action, contrast, and touch-target pass.

A current browser sweep of Overview, the T1 H743 Build, both Setup tabs, Saved, Compare, Profile, Analysis, and Legal reports zero WCAG A/AA violations and no horizontal page overflow at exact 390×844 and 1440×900 viewports.

The ESP32 documented receiver-wiring state was rendered with a `UART2 / GPIO17 TX / GPIO16 RX / 420000 baud` route. The expanded checklist exposed all five signal, telemetry, ground, supply, and continuity steps plus the copy action. It has no horizontal overflow, all controls remain at least 44px high, and axe reports zero WCAG A/AA violations at 390×844 and 1440×900.

The F60 rotation map was rendered at both widths with all four corner labels and `CCW/CW/CCW/CW` visible inside the diagram bounds. The responsive SVG uses the available panel width without page overflow, the corner-order disclaimer remains readable, and axe reports zero WCAG A/AA violations.

The mobile Viewer placement summary was rerendered after the responsive hierarchy fix: the title uses the full 296px content column, the 285px confidence badge sits cleanly beneath it, and axe remains clean with no horizontal overflow.

The Rev A3 Host UART state was rendered with `J3.4/GPIO44 host TX`, `J3.3/GPIO43 host RX`, `400000 baud`, `8N1`, non-inverted full duplex. The checklist kept RF and receiver acquisition explicitly unverified. It reports `Transport documented`, remains free of overflow, keeps 44px controls, and passes axe WCAG A/AA at both widths.

The same saved documented route was rendered on Build as `Pins documented` plus `Radio host: Native USB CDC · Transport documented`, and on Saved as both wiring and host chips. All states retain the `hardware not tested` boundary, remain free of horizontal overflow, and pass axe WCAG A/AA at both widths.

The Build `Fit overlay` was rendered with the complete 3.5-inch source preset. Four propeller sweep envelopes and motor-interface outlines appear in-scene, the legend reports all three interface states, and the 44px toggle remains operable at 390 and 1440 widths. There is no horizontal overflow and axe reports zero WCAG A/AA violations at both sizes.

The Build notes editor was rendered with an 80-character bench note at both widths. The textarea remained 86px high, the character/verification boundary stayed visible, and the widened provenance action row wrapped its caption cleanly below both export buttons. There is no horizontal overflow and axe reports zero WCAG A/AA violations.

The completed Analysis page was rendered with the same note in a labeled `note` region between the report actions and performance summary. The note remains readable at both widths and axe reports zero WCAG A/AA violations.

The three provenance actions (`Copy briefing`, `Export build sheet`, `Export BOM CSV`) were rendered at both widths. Every action remained 44px high, the narrow desktop rail wrapped the third action and verification caption cleanly, and axe reports zero WCAG A/AA violations.

The focused F60 measurement workflow was rendered from a complete saved build at 390×844 and 1440×900. Seven selected parts expose a two-column mobile or four-column desktop selector, only the active part's fields render, and coverage reports measured, missing, and catalog-estimated fields separately. The example build reports `1/14 fields measured`; the viewer summary keeps measured confidence separate from verification. Every visible measurement control remains at least 44px high, there is no horizontal overflow, and axe-core reports zero WCAG A/AA violations at both sizes. The rendered clear-and-replace path held a blank field until replacement input and committed `5.2 mm` on blur.

The contextual repair path was rendered from the F60 build: the `Propeller hub interface` row exposes a 44px `Measure` control, selecting it opens the measurement panel, activates `Motor`, focuses `Prop shaft diameter`, and visually marks the targeted field. The resulting panel and audit remain free of horizontal overflow, and axe reports zero WCAG A/AA violations at 390×844 and 1440×900.

The source-backed solder-pad power path was rendered with a Tattu XT60 pack and the Holybro Tekko32 F4 65A ESC. The physical checks report `Awaiting data` with the explicit instruction to solder the lead and verify polarity and wire gauge; they do not claim a connector mismatch or verified harness. The rendered row remains readable without horizontal overflow, and axe reports zero WCAG A/AA violations at both widths.

The XT60 match state was rendered with 44px battery and ESC source links. Both connector chips retained their source URLs, the power-path summary stayed inside the manifest, Saved showed the same `XT60 match` chip, and axe reports zero WCAG A/AA violations at both widths.

The populated Saved toolbar was rendered at 390×844 and 1440×900 with the full six-option status filter. On mobile the filter takes its own full-width 44px row instead of truncating, the toolbar stays within the viewport, and axe reports zero WCAG A/AA violations.

The same build renders the compact manifest `Power path` with a `Solder lead` state, XT60 battery chip, bare-pad ESC chip, and the full polarity/wire-gauge instruction. The route collapses from a horizontal desktop flow to a vertical mobile flow, all copy stays within the panel, and axe reports zero WCAG A/AA violations at 390×844 and 1440×900.

The measured battery deck was rendered with a `70 × 80 mm` local frame measurement. The panel reported `1/15 fields measured`, and `Battery deck footprint` reported `Measured` for the Tattu 6S pack instead of inheriting overall-frame verification. The help copy, measurement controls, and result remain free of horizontal overflow, stay at least 44px high, and pass axe WCAG A/AA at 390×844 and 1440×900.

Graphify generated a local code graph under `graphify-out/`. That directory is deliberately ignored in `.gitignore`.

### Design authority

`PRODUCT.md` and `DESIGN.md` are the durable Impeccable product and visual-system authority, with `.impeccable/design.json` as the component/token sidecar. The incumbent Flight Bench world uses matte workbench surfaces, dark instrument panels, signal-lime primary states, Archivo for UI copy, and IBM Plex Mono for measurements and control labels. Extend that system rather than replacing it during refinements.

## Known gaps

### Missing product-specific meshes

Most newer source-backed products do not have a matching GLB in `backend/assets`. They intentionally use generated geometry rather than borrowing an unrelated product mesh. This is the largest remaining 3D limitation. Twenty-three original products now load manifest-bound usable GLBs; the remaining 69 catalog products use generated fallback geometry.

The fallbacks communicate proportion and placement, not exact product appearance.

Source-backed 2D board planforms can now feed the shared transform contract when thickness is unpublished. Holybro's Tekko32 F4 Metal 65A supplies a 43 × 44 mm planform, iFlight's Borg 5S RX supplies 34 × 27 mm, and Holybro's Kakute H7 V2 supplies 35 × 35 mm. Generated meshes use that exact footprint with the existing generic board height; the interface labels these parts `Footprint only`, and neither the catalog nor UI presents the fallback height as a manufacturer dimension. Physical fit uses the planform as a conservative conflict guard against the frame's overall envelope. Staying inside that envelope does not claim usable stack-deck clearance, so no positive planform result is reported until a deck is measured.

### Compatibility data still has gaps

Stack, motor, prop-shaft, and prop-hub checks are implemented. The picker still cannot reliably compare:

* routed-clearance volume after arms, standoffs, and electronics are accounted for, plus source-backed usable deck dimensions when users have not measured the airframe;
* connector type for remaining legacy products and the exact delivered termination of iFlight's supplied cable.

Add source-backed connector and frame-envelope metadata before enabling those checks. Keep unverified combinations visibly unverified rather than treating missing data as compatibility.

### Some original components need more explicit geometry metadata

The first-generation catalog entries often have mounting points but no explicit source-backed `dimensionsMm` or source URL. Their GLB identity is now explicit through the model manifest, and the interface distinguishes catalog GLBs from generated fallbacks, but their pivots and source-measured dimensions still require separate normalization and provenance work.

### Bundle size

Route-level lazy loading keeps the app shell at approximately 60 KB gzipped. Babylon.js is isolated in an approximately 1.48 MB chunk. Home now waits until its preview approaches the viewport before mounting either the 3D or 2D renderer, while Build waits until a frame is selected. Setup, Saved, Compare, Profile, Legal, and Analysis never pull the Babylon bundle. The viewer imports only Babylon's glTF loader; unused `@babylonjs/gui` and `@babylonjs/materials` dependencies were removed.

Chromium resource timing confirmed that an initial 1440×900 Overview load has zero canvases and requests neither the Babylon vendor chunk nor a viewer chunk. Scrolling the preview into view then loads the vendor and `BabylonViewer` chunks and creates the canvas. The same deferred state rendered at 390×844 with no horizontal overflow.

## Recommended next work

### Priority 1: Model asset normalization

The best task for a model-focused collaborator is to add properly normalized GLB assets for products that currently use fallback geometry.

Required asset contract:

* metres as the scene unit;
* `+Y` as up;
* consistent forward axis;
* frame pivot at centre-bottom or the deck reference plane;
* motor pivot centred on the base mounting face;
* propeller pivot centred on the hub plane;
* CW and CCW propeller meshes as separate files;
* battery, ESC, FC, and receiver pivots centred on the bottom mounting face;
* no exported cameras, lights, or animation tracks unless explicitly required;
* sensible polycount and file size;
* an explicit `rotorbench.model-manifest.v1` entry mapping each product ID to its model file.

When an asset is added, bind its filename in the manifest, set its contract status only after validating the asset contract, and remove geometry fields from `estimatedFields` only where the asset or source data now proves them.

Do not reuse a mesh from a different product just to remove a fallback.

### Priority 2: Remaining physical compatibility

Stack, motor-mount, prop-shaft, prop-hub, power-termination, measured battery-deck, and conservative overall-frame footprint checks are implemented. Extend the same helper with routed-clearance geometry and source-backed connector metadata for the remaining products.

Add tests for:

* battery connector versus ESC connector;
* battery dimensions versus frame mounting envelope;
* connector adapter and polarity display.

### Priority 3: Optional hardware connection

The Setup page is primarily a plan builder, with a separate read-only Web Serial capture base now present. The next connection phase should follow Aerial Kit's protocol boundaries:

* connect through Web Serial only after an explicit user action;
* identify a board before sending writes;
* distinguish requested, echoed, applied, and persisted values;
* treat stale or unknown armed state as unsafe;
* make read-only support explicit for firmware families whose write semantics are not implemented;
* never show RF success from USB writes alone.

The current capture layer remains experimental and has no physical-device qualification. Do not add flashing or hardware mutation by silently extending it or the local-plan components. Build protocol decoding and mutation as a separate session layer with capability detection and tests.

### Priority 4: More UI capabilities

Potential product-level additions, in a sensible order:

1. Add board-specific parameter groups once a live Aerial Kit connection exists.
2. Add source-backed assembly notes to the exploded inspection view.

Do not add decorative motion to the workbench. Motion should explain assembly, focus, or state.

## Working rules

* Keep the existing product truth and analysis formulas unless a calculation is proven wrong.
* Treat the current visual system as established. Extend it rather than replacing it with another dashboard theme.
* Keep all 3D geometry in metres and preserve the assembly transform contract.
* Prefer `.glb` over `.step` when both exist.
* Do not use a manufacturer product name for a generic fallback without surfacing that the mesh is generated.
* Do not invent compatibility, dimensions, prices, source URLs, or performance figures.
* Use `rg` for repository searches.
* Preserve unrelated worktree changes.

## Local development

Install frontend dependencies:

```bash
cd /home/cy/Projects/RotorBench/rotorbench
npm install
```

Run the backend:

```bash
cd /home/cy/Projects/RotorBench/backend
uv venv --clear .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The environment lacks `ensurepip`, so the standard `python3 -m venv` command does not work; `uv` is installed and is the working fallback. `backend/.venv` is ignored. Do not install backend dependencies globally.

Run the frontend in another terminal:

```bash
cd /home/cy/Projects/RotorBench/rotorbench
BROWSER=none npm start
```

Open `http://localhost:3000`.

Visual and accessibility checks:

```bash
/home/cy/.codex/skills/impeccable/scripts/impeccable shot http://localhost:3000/build --out /tmp/rotorbench-shots --full
/home/cy/.codex/skills/impeccable/scripts/impeccable detect --json --changed
```

The axe CLI needs a matching Chrome/ChromeDriver. The working pair installed during this session is under `/home/cy/.browser-driver-manager/`; pass both `--chrome-path` and `--chromedriver-path` to `npx @axe-core/cli`.

## Fresh-session prompt

You are continuing work on RotorBench, an FPV drone build configurator and analysis tool at `/home/cy/Projects/RotorBench`.

Read `/home/cy/Projects/RotorBench/HANDOFF.md` first. Run `git status --short --branch` and `git log -1 --oneline` before assuming what is committed or uncommitted. Preserve unrelated worktree changes.

The current goal is to keep improving RotorBench without breaking the working build, analysis, 3D assembly, or hardware-planning flows. The catalog has 92 products, including complete 2.5-inch, 3.5-inch, 5-inch, 5.5-inch, 7-inch, and 730 mm twin-motor platforms, twelve frames, twelve propeller choices, nineteen receiver choices, nine ESC choices, twelve flight controllers, three source-backed F1404 KV variants, iFlight XING2 1855KV/2755KV and AOS Supernova options, and Tattu/CNHL 4S/6S packs. Twenty-three original products load explicit manifest-bound usable GLBs; the remaining products use parametric fallbacks because they do not have product-specific assets.

Start by auditing the current worktree and running the documented tests. The highest-value model task remains normalising or producing real GLB assets for fallback products. `rotorbench.model-manifest.v1` is the canonical mapping from catalog IDs to actual model files, and all frontend model resolution goes through `utils/modelAssets.js`. The Setup page provides build-aware local flight-controller and ExpressLRS radio plans with explicit hardware-verification boundaries, actual Aerial Kit arm gates, contextual packet/switch rules, a compact channel overview, a copy-only pair-and-bench runbook, synchronized read-only Web Serial captures, and evidence review with local value adoption. Saved supports two-build comparison; Build supports exploded inspection and the eight-check Viewer placement/interface audit.

You may extend the UI with portable analysis export, richer source-backed assembly notes, more catalog data, and protocol-aware live sessions on top of the read-only capture foundation. Hardware mutation must remain a separate, capability-gated layer, not a cosmetic extension of the local plan.

Do not replace the current worktree, invent specifications, reuse unrelated meshes, rotate individual assembled parts, or remove fallback geometry until a real asset is available. Verify the production build, tests, accessibility, backend schema, and both model-backed and fallback assemblies before reporting completion.
