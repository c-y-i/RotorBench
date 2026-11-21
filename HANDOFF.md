# RotorBench handoff

## How to use this document

Read this file before changing the project. Inspect `git status --short --branch` and `git log -1 --oneline`; do not assume a stale worktree or commit from this document. Preserve unrelated existing changes unless you have a clear reason to replace a specific part of them.

`PRODUCT.md` and `DESIGN.md` are now the durable Impeccable product and visual-system context. `DESIGN.md` records the incumbent Flight Bench world, exact color/type/spacing tokens, responsive layout, component rules, and machine-readable frontmatter. `.impeccable/design.json` is its component/token sidecar. Preserve these files when modernizing the interface.

The product is RotorBench, an FPV drone build configurator and performance analysis tool. The active goal has been to make the catalog useful and to make the 3D preview behave like an actual quad assembly rather than a collection of unrelated models.

## Current product state

The frontend is a React 18 app under `rotorbench/`. The backend is FastAPI under `backend/`. The runtime component catalog is `rotorbench/src/data/components.json`, and the backend reads that same file through `backend/utils/component_data.py`.

The catalog now has 67 unique components:

| Category | Count |
| --- | ---: |
| Frames | 9 |
| Motors | 15 |
| Propellers | 10 |
| Batteries | 9 |
| ESCs | 7 |
| Flight controllers | 8 |
| Receivers | 9 |

The catalog began at 25 items. Forty source-backed components have been added across multiple passes, including a complete AOS 3.5 V5.1 / T-Motor F1404 / Gemfan 3520 / Tattu 850 / SpeedyBee 20×20 stack platform. Recent passes add an expanded ExpressLRS receiver set, F1404 KV variants, iFlight XING2 2207 1855KV/2755KV options, a Tattu 6S 1050mAh R-Line pack, Holybro Tekko32 F4 65A, iFlight BLITZ E55, and Holybro Kakute H7 V2. New entries include source URLs, price source URLs where available, dimensions, mounting metadata where known, and explicit `modelStatus: "not_available"` when the repository has no matching mesh. Derived values such as fallback mounting offsets, estimated receiver current draw or channel count, estimated thrust curves, and estimated discharge curves are listed in `estimatedFields`.

The latest receiver entry is the RadioMaster XR4 Gemini Xrossband, adding a dual-band, true-diversity form factor rather than another RP-series variant. Published 1.7 g weight, 22×18×4 mm envelope, dual LR1121 RF chips, 2.4 GHz/Sub-G 900 MHz support, 100 mW telemetry, refresh-rate range, 4.5–8.4 V input, ExpressLRS 3.5.1 firmware, CRSF interface, and $34.99 price are retained. Current draw, channel count, and mounting offset remain explicitly estimated because the manufacturer page does not publish them. The receiver picker surfaces the dual bands and telemetry power, and stacks price beneath the catalog copy at phone widths so long model names no longer force horizontal scrolling.

`rotorbench.model-manifest.v1` binds 23 original catalog IDs directly to usable GLB files under `backend/assets`, including paired CW/CCW propeller files. These assets are labeled `legacy-unverified` because file and catalog identity are known while their normalization contract has not been revalidated. `motor-2207-1850kv` has no matching file, and `fc-speedybee-f405-v3.glb` contains no geometry, so both remain on generated fallback. Home, Build, Part Picker, build evidence, and the assembly profile all consume one shared resolver rather than guessing from filename prefixes or scanning `/api/models/list`.

The 7-inch catalog depth pass adds the AOS 7 EVO V1.2 frame, iFlight XING 2806.5 1300KV motor, and Gemfan Flash 7040 three-blade propeller from manufacturer pages. Published frame wheelbase, weight, dimensions, 19×19 motor mounting, motor dimensions, weight, current, 5 mm shaft, propeller diameter, pitch, weight, and hub dimensions are retained; estimated stack height, stack-mount pattern, motor positions, mounting offset, and 6S voltage range are explicitly labeled. The selected propeller has no published or reviewed thrust curve, so analysis reports thrust and flight performance as unavailable rather than inventing a curve.

The compact catalog depth pass adds the AOS Cine25 V5 frame and Gemfan Hurricane 2520 three-blade propeller. Published 120 mm wheelbase, 58 g frame weight, 171×147×34 mm envelope, 20×20 and 25.5×25.5 stack mounts, 9×9 motor mounts, 64 mm propeller disk, 5.5 mm hub, and 1.5 mm shaft are retained. Motor positions and stack height remain explicitly estimated, and the propeller has no published thrust curve.

The AOS 7 and Cine25 frames render in the part picker with their source provenance, dimensions, price, and explicit estimated-field counts. The Cine25 preset verifies four motor mounts, four propeller hubs, the 20×20 stack, XT30 power lead, voltage limits, and propeller clearance while retaining an unavailable-performance state.

The Build page offers nine validated starter presets: the complete 2.5-inch AOS Cine25 build, 3.5-inch 3800KV build, alternate 3.5-inch 4600KV build, 5-inch TBS Source One V5 build, 5.5-inch SpeedyBee build, 5.5-inch diversity build using Kakute H7 V2 and RP4TD, 5.5-inch 6S XING2 build, 5.5-inch 4S XING2 build, and 7-inch AOS 7 EVO build. The empty Overview exposes all nine as direct launch actions. Deep links such as `/build?preset=source-25`, `/build?preset=source-35`, `/build?preset=source-35-4600`, `/build?preset=source-5`, `/build?preset=source-55`, `/build?preset=source-55-diversity`, `/build?preset=source-55-xing2`, `/build?preset=source-55-xing2-4s`, and `/build?preset=source-7-inch` fill all seven component slots, consume the query after applying it, and keep saving and analysis behind the normal required-part and review gates. The preset indicator clears automatically if any selected component diverges from the preset.

Each Overview starter card now reports both propulsion-data and fit state before opening the build. Presets with a modeled thrust curve are labeled `Estimated thrust data`, while the 7-inch, 2.5-inch, and 5-inch HQProp presets explicitly read `Thrust data unavailable`. Fully checked presets show `Fit verified`; the 5-inch Source One build shows `Fit review` because its published frame page does not document motor-mount spacing.

Build comparison carries the same propulsion-data state as a per-build status chip and a dedicated `Propeller thrust data` row. Two builds can therefore share verified fit and electrical limits while still showing that one has an estimated curve and the other has no performance curve available.

Each Build page owns a stable working identity, including unsaved drafts. Opening Setup carries that identity plus the currently selected FC and receiver, so local hardware plans created before the build is saved remain attached when it is later saved or analyzed. The Build hardware card summarizes firmware family, receiver protocol, UART/line rate, and saved-plan review state without claiming hardware readiness.

Setup’s `Edit build` action carries that same draft object back to Build, preserving the selected component set and working identity through the round trip.

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

Temporary status banners are non-interactive and click-through. Preset confirmations dismiss automatically, and the banner leaves sticky positioning on mobile so it cannot cover controls during work. On Overview at phone width, the New Build and View Analysis actions now sit in the document flow after the summary rather than covering the preview.

The Saved mobile toolbar now restores the search field as a full-width first row and lays the three actions out beneath it without truncation. Profile registration actions now stay in the form flow rather than floating over Preferences; Cancel is a neutral secondary action and Log out has a separate danger treatment.

The visual direction is a flight-bench dashboard, not a generic SaaS dashboard. The decision is recorded in the code rather than in a `DESIGN.md` file.

### Hardware setup

The `/setup` route now combines two local configuration planners:

* **Flight controller:** firmware family, documented or custom board profile, airframe, DShot rate, receiver protocol, UART and baud, channel preset, arm/failsafe values, and feature toggles.
* **Radio transceiver:** TX/RX role, Aerial Kit Rev A3, RadioMaster Ranger Nano, or generic ExpressLRS target, packet rate, target-local drive power, telemetry ratio, switch mode, link mode, model match, binding phrase or UID staging, and channel mapping.

The form starts from the flight controller and receiver selected in the active RotorBench build. It infers a commercial board's first listed firmware family and uses the documented Betaflight bench mapping when appropriate. Receiver changes and protocol/profile changes synchronize the line rate and SBUS input-only telemetry rule.

The FC planner now also shows a source-backed `Control path` strip: selected radio endpoint → receiver UART/pins/baud → planned airframe motor/servo count → DShot output rate. It reports `Pins documented` only when both a build receiver and a non-placeholder board pin mapping exist; otherwise it remains `Mapping incomplete`.

The board section now renders a source-backed `Motor output map`. Aerial Kit uses its mixer order and public airframe geometry for Quad X, clockwise-numbered Quad X, Quad +, Y4, V-tail, tri, and both wing layouts. Y4 outputs sharing the rear position are separated only for legibility. Betaflight exposes its officially documented normal QUAD X order and a `Motor direction` choice between normal props-in and reversed props-out; reversing flips the displayed spin directions while retaining the same output numbers. Other Betaflight mixers show an explicit unavailable-map note. INAV, ArduPilot, and PX4 likewise show that no verified map is bundled instead of borrowing another firmware's order. Servo-equipped layouts explicitly retain unresolved servo-direction checks. The map communicates planned output order, not verified motor spin, prop orientation, or physical wiring. Aerial Kit and Betaflight summaries and hardware-plan briefings include the output order and Betaflight direction mode as text for portable handoff. Hardware-plan import rejects unknown motor-direction values.

The receiver section now expands into a board-specific `Receiver wiring` checklist. Documented profiles name the UART, pins, protocol, and baud; custom or placeholder mappings stay `Verify pins`. CRSF adds the telemetry return path, SBUS adds input-only and external-inverter steps when documented, and every plan includes common-ground, receiver-supply, and pre-power continuity checks. The checklist is copy-only and explicitly records that RotorBench has not tested continuity, polarity, receiver supply, or hardware readiness.

The radio planner now separates host transport from the RF path. A `Host transport` field distinguishes native USB CDC, target-specific host UART, a handset module bay, and an explicitly unverified generic transport. Rev A3’s documented host UART is 400000 baud, 8N1, non-inverted and full duplex on J3.4/GPIO44 host TX and J3.3/GPIO43 host RX; the RX-to-FC CRSF UART remains 420000 baud. An `Endpoint checklist` covers role/image selection, antenna or RF load, host transport, the separate FC UART for RX role, and the requirement to observe receiver RC plus link statistics before claiming RF success.

Shared hardware readiness now also carries the selected radio host transport, its display label, and whether that transport is documented. Build shows the host path beneath the receiver route; Analysis includes a Radio host fact; Saved includes the host chip; Compare adds a radio-host row; sanitized hardware plans retain the same fields. None of these fields imply USB, UART, or RF verification.

Hardware readiness also carries the selected handset bay, its label, and target compatibility. Build, Analysis, Saved, Compare, build briefings, build sheets, and analysis reports retain that state, so a module-bay mismatch remains visible outside Setup. Compatible labels still mean physical fit only; they do not verify the handset pinout, CRSF path, or RF link.

Hardware readiness also carries the selected flight-controller airframe, motor-direction label, source-backed output order, and firmware layout source. Build and Analysis show the order, Saved and Compare retain a compact direction/order state, and build briefings include the full sequence. Aerial Kit and Betaflight QUAD X therefore remain distinguishable outside Setup; unsupported mixer maps remain explicitly unavailable rather than disappearing.

Radio regulatory state also propagates through hardware readiness: planned dBm, selected FCC/CE region, regional maximum in dBm/mW, and `within`/`verify`/`over` cap status. Build and Analysis show planned versus maximum power, Saved retains a compact ceiling chip, Compare adds an RF-limit row, and build briefings include the over-cap state. These are plan checks only and do not establish regional compliance or delivered RF power.

Radio target and receiver frequency bands are now explicit data. Setup rejects a selected receiver with no documented band shared by the transmitter, Build and Analysis show receiver bands plus shared-band status, Compare adds a receiver-band row, and build briefings preserve the result. Missing band metadata remains `unverified`; RotorBench does not infer a shared band from a product name alone.

For a saved plan with a supported four-corner output map, the Build viewer and prop-rotation map derive props-in or props-out from the front-left spin assignment and use that handedness. This covers Betaflight QUAD X and Aerial Kit Quad X/clockwise-numbered Quad X. Both handedness profiles swap the same corner CW/CCW assignments without moving any motor or propeller mount. Unsaved builds and layouts without a supported corner map retain the assembly's props-out default. This is still a planning visualization; physical propeller markings, motor wiring, and spin tests remain unverified.

The prop-rotation map also accepts the saved plan's corner-to-output mapping for conventional FL/FR/RR/RL layouts. It labels `OUT 1` through `OUT 4` on the matching physical corners in the accessible description and visible SVG. Non-corner mixer families omit output numbers rather than forcing their labels onto an X-frame diagram.

The expanded prop map can copy a portable handoff containing the selected motor and propeller, handedness profile, each physical corner's CW/CCW direction, mapped output number/role when available, and the explicit requirement to verify wiring and propeller direction before flight. This is copy-only and does not persist or send hardware state.

The shared hardware-readiness model now carries `receiverPins`, `wiringStatus`, and the planning-only `wiringScope`. Build’s hardware card shows `Pins documented` or `Verify pins`; Analysis adds a wiring fact; Saved adds a wiring chip; Compare adds a wiring row; build sheets and analysis reports retain the sanitized fields. A documented pin route therefore remains visible across routes without becoming an electrical verification claim.

Documented board profiles lock their compiled receiver UART and baud. Custom boards leave those fields editable. The preferred Aerial Kit with ExpressLRS preset uses arm channel 5 and flight-mode channel 6; a separate legacy preset preserves the firmware's arm 6 / mode 5 defaults.

Stored plans use schema version 3 so older inferred channel maps are discarded instead of being silently mixed with current defaults. The combined Setup page owns the radio plan; changing tabs no longer lets standalone radio storage override the parent's build-aware state. Cross-plan warnings can copy either the FC or radio channel map explicitly.

The Rev A3 power selector stores the SX1280 drive value in dBm and shows the corresponding ExpressLRS menu label. Those labels are not calibrated radiated-power measurements. A 250 Hz / 25 mW plan is labeled only as a documented bench-setting match; the summary always reports RF as unverified because RotorBench does not observe link statistics.

Public Aerial Kit firmware registers arm, flight mode, and an optional velocity switch. The workspace-source WeAct and GHF435 profiles instead expose manual, control, and system-ID switches. RotorBench no longer presents unsupported beeper or controller fields as Aerial Kit runtime parameters. Arm, mode, and profile-specific control switches are limited to CH5–8, and the radio planner exposes only roles the selected FC route can actually decode. Hidden stale roles are excluded from validation, summaries, and mapping-copy actions. Packet-rate/switch-mode and MAVLink forcing rules come from the pinned ExpressLRS 4.1.0 source; MAVLink uses Hybrid for normal-width rates and 16ch Rate/2 for 100 Full and 333 Full. Generic ExpressLRS targets do not inherit the Rev A3 power menu and expose a target-local dBm input instead.

The radio target library now includes transmitter-only RadioMaster Ranger Nano, Ranger Micro, and full-size Ranger 2.4 GHz ELRS modules. Their profiles are sourced from the official RadioMaster product pages and user manuals. They record Nano 8-pin, JR-style micro 5-pin, or included JR/Nano adapter interfaces; a 100 mW / 20 dBm default; and region-dependent maxima of 30 dBm / 1000 mW (FCC) and 20 dBm / 100 mW (CE). The planner uses a handset-module-bay transport and free dBm field because the manufacturer does not publish a RotorBench-manageable USB CDC contract, Lua menu table, or host baud here. A `Handset bay` selector records the actual Nano 8-pin, JR micro, or JR standard module bay; incompatible selections receive a specific warning and imported plans reject them. The full-size Ranger can use either included JR or Nano adapter. An explicit `RF region` selector records the fitted FCC or CE variant rather than inferring it from locale; the default remains `Verify fitted module`. Plans, imports, evidence briefings, and warnings use the selected ceiling. Import validation rejects unsupported bays, unsupported regions, incompatible host transports, power above the selected regional ceiling, and power above the published absolute maximum.

Documented Aerial Kit boards now show their internal flight log as a read-only capability with the correct backing, such as internal flash or the ESP32 `aerialkit` partition, plus retained RAM. The Aerial Kit bench discovery stage includes the read-only `ak fc logs` command. The generic Blackbox checkbox remains unavailable for Aerial Kit because it refers to an external configurable logging feature; it no longer implies that the internal aircraft log is absent.

The FC planner includes an Aerial Kit arm-gate preview mapped to the firmware's actual enum. It separates three plan-resolvable checks (output mix, receiver transport, and control-role mapping) from nine live gates: output mix, usable IMU, receiver link, failsafe latch, arm request, released arm switch, throttle-low, attitude convergence, and level. Every live gate remains `Not observed`; a local plan must never be presented as a live preflight pass. The prior invented `AK_ARM_CONTROLLER` state has been removed.

FC plan issues now include a `Review` action that scrolls to and focuses the owning field or feature, using the user's reduced-motion preference. This turns blocker and review counts into direct recovery paths instead of requiring a manual search through the long mobile form.

The Aerial Kit receiver panel now includes the firmware’s saved `rc_min`, `rc_mid`, `rc_max`, and `rc_deadband` calibration values. Defaults are 172 / 992 / 1811 / 0.02, with firmware-backed ranges and a required low < centre < high ordering. These values are included in the copy-only command preview. The UI labels them as a plan and requires live RC-channel verification rather than claiming calibration was performed.

The radio planner filters packet rates by target, exposes the source-backed Standard telemetry ratio for the chosen rate, and disables switch modes that cannot work with that rate or with MAVLink. Unsupported Rev A3 power or packet-rate values fail closed instead of being displayed as a different known setting. At 250 Hz, for example, Standard resolves to 1:64, while 100 Full and 333 Full require a fixed 8-channel, 12-channel mixed, or 16-channel Rate/2 switch mode. Rev A3's page also includes a source-backed GPIO4 and LED legend: TX is GPIO4 high with one blue boot pulse; RX is GPIO4 low with two green boot pulses. It preserves the warning that the first prototype's physical label disagreed with GPIO4.

The radio channel map now includes a compact CH1–8/CH1–16 assignment strip. It uses the actual FC route limit and labels every mapped control role, making arm/mode/velocity placement scannable without opening each select. The runbook and live-capture disclosures share one secondary `Bench tools` disclosure so the configurator remains the primary task. Setup readiness is labeled by scope: the page reports `combined checks`, the FC panel reports `FC` review items, and the radio panel reports `Radio` checks.

The Aerial Kit flight-controller plan exports a copy-only console command preview using the current runtime parameter names. It intentionally omits `save` and never sends commands. The preview is suppressed when blockers exist and never serializes missing or non-numeric values as zero or `NaN`; a blank public velocity channel is emitted explicitly as `0`. Integer-only firmware fields, baud, and control channels reject decimals. Betaflight receives read-only discovery commands using exact setting names; INAV does not inherit that Betaflight-specific settings client and shows an unsupported-preview explanation. ArduPilot and PX4 also show explicit unsupported-preview explanations.

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

The mobile picker sheet now declares five grid rows for its five children (header, search, filters, results, footer). Previously the filter row collapsed behind the results because the grid declared only four rows.

The checks remain non-blocking and only run when both products carry usable data. Connector evidence currently covers source-backed battery plugs, four ESCs with included XT30/XT60 leads, one ESC with bare solder pads, and one ESC with an unspecified supplied cable. A conservative battery-envelope conflict is available from overall frame/battery dimensions; users can replace it with a measured usable deck footprint. Wire routing and board clearance still need catalog or build-local evidence before they can be verified.

The Parts Manifest also promotes that relationship into a compact `Power path` block as soon as a battery or ESC is selected. It names the battery, ESC, and known connector/termination on both ends, then uses a source-aware state: `XT30/XT60 match`, `Adapter required`, `Solder lead`, `Verify termination`, or `Awaiting connector data`. Known battery and ESC connector evidence links directly to its catalogued source. The route is horizontal on desktop and vertical on mobile; it is a planning relationship, not a wiring or polarity verification claim.

Power-path state now propagates into Saved as a state chip, Compare as a battery-power-path row, Analysis as a hardware fact, and both build sheets and analysis reports as a named summary. These surfaces retain the same label, battery/ESC names, connector fields, message, and explicit verification boundary.

The build also exposes a collapsible provenance panel. For every selected part it shows whether the catalog is source-backed or legacy, which fields are estimated, whether geometry is a fallback, and separate product, price, and connector source links.

The provenance panel can export a portable `rotorbench.build-sheet.v1` JSON draft. It includes selected IDs, physical-fit state, electrical-limit state, both sets of individual check rows, provenance counts and parts, and explicitly records that analysis and hardware verification are not included.

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

The camera rotates around the whole assembly. It must not rotate individual component meshes, because that separates a build that is already placed in world space.

The Build page exposes Orbit, 3/4, Top, Side, and Front inspection views. Fixed views stop automatic rotation, and Orbit resumes it. Auto-rotation is read through a ref so changing modes does not rebuild the Babylon scene or reload models.

An `Exploded` inspection toggle separates propellers, ESC, FC, receiver, and battery upward along the shared Y axis while leaving frame and motor mount coordinates fixed. Toggling it off restores the exact assembled pose. The camera refits for the expanded bounds, and resetting the build returns the viewer to assembled mode.

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
| `rotorbench/src/components/PartPicker.jsx` | Searchable part catalog and compatibility display |
| `rotorbench/src/components/SetupPage.js` | Unified flight-controller and radio plan workflow |
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

The latest catalog, BOM, model-manifest, comparison, interactive assembly-profile, hardware-briefing, portable-build-link, and automated accessibility rerun passed 403 frontend tests across 56 suites, the production build, full ESLint, fourteen backend tests, and the Impeccable detector. The long audit inventory below records the preceding 339-test pass; its feature coverage remains valid and the newer focused tests are additive.

`axe-core` is now an explicit development dependency. Reusable jsdom structural checks run against the interactive assembly profile and populated comparison with WCAG 2 A/AA tags; colour contrast remains covered by the rendered-browser checks because jsdom has no layout engine.

The production build compiled successfully. Three hundred thirty-nine frontend tests passed across forty-eight suites covering routing failure recovery, persistent-state recovery, automatic unsaved-build recovery, explicit clean new-build starts including same-route resets, stale draft ID rejection, 60-product catalog integrity, starter-platform state integrity and deep links, assembly transforms, source-aware eight-check viewer placement and interface audit, build-local measured-geometry validation/persistence/export/analysis propagation, estimated/fallback/measured confidence propagation, interactive sweep/mount fit overlay, motor-pattern/hub/sweep conflicts, exploded inspection, prop-hub fallback, 3D/2D WebGL fallback, inspection views, actual Aerial Kit arm gates, receiver calibration planning, captured channel extrema and planned-calibration comparison, multiple RC frames per serial read, documented sensor-fit and internal-flight-log defaults, read-only Aerial Kit log discovery, control-path mapping, issue-to-field review navigation, unsupported control-role and integer-limit validation, workspace/public control-role separation, build-frame motor-count matching, target-specific radio power and fail-closed enum validation, MAVLink full-resolution switching and reported link-mode correlation, hidden-role sanitation, firmware-switch role cleanup, Build-to-Setup and Setup-to-Build draft preservation, hardware readiness across Build, Saved, Compare, and Analysis, direct Analysis refresh recovery, partial-build hardware-state accuracy, conservative battery-envelope failures, plan-aware bench-runbook generation and write-gated copying, Aerial Kit pair/bench/capture import, native CRSF-observation import, FC RC JSON freshness/plausibility parsing, FC preflight JSON parsing, TX and RX native observation correlation, synchronized TX/RX descriptor open and stop, failed-open rollback, double-click command latching, shared capture-session correlation, target-change session reset, current-target, direction-specific baud and capture-window checks, duplicate endpoint rejection, imported FC status and preflight protocol/state/line correlation, Betaflight preflight parsing, Betaflight failsafe bit decoding, protocol-aware receiver-link handling, parameter coverage and partial-snapshot refusal, review-item filtering, explicit FC/radio observed-value adoption, domain-specific adoption scope guards, radio target-status gating, sanitized bounded evidence history and compatible-run comparison, legacy raw-UID migration, redacted review export, sanitized radio status role/baud/firmware/product correlation and mismatch messaging, report-plus-TX/RX-boot bundle correlation, TX parameter-snapshot correlation, FHSS seed/channel correlation, direction-aware endpoint evidence, strict UID validation, parser/cadence/freshness/link-quality checks, quality failures overriding a file-reported RF pass, sanitized build-level evidence attachment, revision and plan scope matching, staged-identity fingerprint matching, stale-evidence downgrade, removal and duplicate propagation, legacy unscoped-evidence labeling, shared Aerial Kit CRSF protocol vectors, sanitized review export, read-only Web Serial lifecycle, CRSF framing/link/telemetry decoding, failed-capture evidence export, Betaflight-only command previews, contextual radio planning and channel overview, phrase-derived UID vectors, binding-phrase byte limits, hardened hardware-plan and radio-enum import validation, verified/conflict/source-backed picker filters, keyboard result navigation, price sorting, recent parts, physical and electrical compatibility, build provenance, portable BOM CSV export with explicit missing selections, sanitized hardware context in build sheets and analysis reports, comparable build diffs and portable comparison export, saved-build upsert, profile action state, and lifecycle actions. Full ESLint passes. The Impeccable source detector reports no findings on the changed UI.

Fifteen backend contract tests independently verify category counts, globally unique IDs, Pydantic hydration of all 67 products, model-manifest file existence and propeller pairing, RP2/RP3/XR4 source-versus-estimated metadata, F1404 mounting/voltage contracts, the AOS 7 / XING 2806.5, Cine25 / Gemfan 2520, and HQProp 5037 field boundaries, measured-geometry round-tripping plus positive-value validation, and the source-backed power-connection modes.

The backend catalog validates through `ComponentDatabase`, and the running `/api/components` endpoint returns all 65 items.

Restart an already-running FastAPI process after schema changes. The current local UI server may hot-reload frontend files, but Uvicorn does not reload backend models unless started with reload enabled.

The backend dependencies are installed in the ignored `backend/.venv`, and the current-code Uvicorn instance is running on `127.0.0.1:8000`. `/api/components` returns all 67 products. Current smoke tests report:

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

On phone widths the Viewer placement summary stacks its long confidence badge below the title instead of forcing the heading into a narrow word column. The title retains the full content width while the badge wraps within the second grid column.

Build also exposes a collapsed `Measured geometry` panel for frame, motor, propeller, battery, ESC, flight controller, and receiver dimensions. Values are entered in millimetres, validated as positive, scoped to one saved build, and never written into `components.json`. The panel focuses one part at a time, reports build-wide measured/missing field coverage, and supports axis-by-axis vector entry. Clearing a value preserves the editable draft until focus leaves the field. The persisted `rotorbench.measured-geometry.v1` override shape feeds the 3D placement audit, physical-fit checks, draft recovery, local/server saves, saved-build comparison, analysis payloads, build-sheet export, analysis-report export, and backend hydration. Build sheets and analysis reports also include a named `rotorbench.measured-geometry-summary.v1` provenance block with part names, field labels, measured values, catalog values, and explicit build-local scope. Fields remain labeled `Catalog`, `Catalog estimated`, `Measured`, or `Missing`; a user measurement is reported as `Measured` and does not turn the build into hardware verification. T-Motor F60 measurement data is used as the coverage example because its catalog entry intentionally lacks shaft and bell dimensions.

Unresolved Viewer placement checks now offer contextual `Measure` actions only when a panel field can actually address the condition. For example, `Propeller hub interface` opens the motor tab and focuses `Prop shaft diameter`; motor-pattern, propeller-sweep, battery-clearance, and missing electronics-dimension gaps map to their corresponding part and field. The action does not offer a misleading target when the blocker is an absent component or unavailable frame mount coordinates.

Frames expose a `Usable battery deck` measurement with an explicit instruction to measure clear flat area excluding arms and standoffs. When supplied, `Battery deck footprint` compares the battery in its best-case orientation against that measured footprint. A fitting battery is reported as `Measured`; an oversized battery is a measured conflict. Without this value, RotorBench falls back to the conservative overall-frame bounding footprint and leaves that broader check unverified.

An optional `Fit overlay` renders those catalogued interfaces directly in the Babylon scene: propeller sweep rings and translucent discs follow each propeller root, while motor mounting-pattern outlines follow each motor root. Lime marks a verified interface, teal marks build-local measurement, orange marks a conflict, and muted grey marks incomplete metadata. The overlay stays attached through exploded inspection and is presented with a compact legend; it remains geometry visualization, not a physical-fit or flight-readiness claim.

The viewer also exposes a `Prop rotation map` derived from the exact same corner-order and handedness constants used to place the 3D propellers. It shows `UL/CCW`, `UR/CW`, `LR/CCW`, and `LL/CW` in a front-oriented schematic. The diagram deliberately labels frame corners rather than vendor motor numbers and directs the user to confirm airframe and propeller markings before wiring or flight.

The Build preview now includes a collapsed `Assembly profile` side view generated from the same transform helpers that place the Babylon components. It orders propellers, motors, battery, receiver, flight controller, ESC, and frame by derived Y position, reports their assembly-coordinate ranges, labels dimensions as source specification, estimated, or measured, and provides per-layer show/hide controls over the 3D scene. The map explicitly identifies an estimated frame stack height and does not replace the placement audit or a physical fit check.

The rendered Impeccable check reports zero findings for Build with the source-aware eight-check placement audit open at 390×844 and 1440×900, with no horizontal overflow. The expanded Setup Bench tools, runbook, and live-capture disclosures pass axe-core WCAG A/AA with zero violations and no horizontal overflow. Analysis, Saved, and Profile report zero rendered detector findings and zero axe violations at both widths after the shared title, action, contrast, and touch-target pass.

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

Most newer source-backed products do not have a matching GLB in `backend/assets`. They intentionally use generated geometry rather than borrowing an unrelated product mesh. This is the largest remaining 3D limitation. Twenty-three original products now load manifest-bound usable GLBs; the remaining 44 catalog products use generated fallback geometry.

The fallbacks communicate proportion and placement, not exact product appearance.

### Compatibility data still has gaps

Stack, motor, prop-shaft, and prop-hub checks are implemented. The picker still cannot reliably compare:

* routed-clearance volume after arms, standoffs, and electronics are accounted for, plus source-backed usable deck dimensions when users have not measured the airframe;
* connector type for remaining legacy products and the exact delivered termination of iFlight's supplied cable.

Add source-backed connector and frame-envelope metadata before enabling those checks. Keep unverified combinations visibly unverified rather than treating missing data as compatibility.

### Some original components need more explicit geometry metadata

The first-generation catalog entries often have mounting points but no explicit source-backed `dimensionsMm` or source URL. Their GLB identity is now explicit through the model manifest, and the interface distinguishes catalog GLBs from generated fallbacks, but their pivots and source-measured dimensions still require separate normalization and provenance work.

### Bundle size

Route-level lazy loading keeps the app shell at approximately 60 KB gzipped. Babylon.js is isolated in an approximately 1.48 MB chunk: Home requests it for the sample assembly, while Build waits until a frame is selected. Setup, Saved, Compare, Profile, Legal, and Analysis never pull the Babylon bundle. The viewer imports only Babylon's glTF loader; unused `@babylonjs/gui` and `@babylonjs/materials` dependencies were removed.

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

The current goal is to keep improving RotorBench without breaking the working build, analysis, 3D assembly, or hardware-planning flows. The catalog has 67 products, including complete 2.5-inch, 3.5-inch, 5-inch, 5.5-inch, and 7-inch platforms, nine ExpressLRS receiver choices, seven ESC choices, eight flight controllers, three source-backed F1404 KV variants, iFlight XING2 1855KV/2755KV options, and Tattu 4S/6S R-Line packs. Twenty-three original products load explicit manifest-bound usable GLBs; the remaining products use parametric fallbacks because they do not have product-specific assets.

Start by auditing the current worktree and running the documented tests. The highest-value model task remains normalising or producing real GLB assets for fallback products. `rotorbench.model-manifest.v1` is the canonical mapping from catalog IDs to actual model files, and all frontend model resolution goes through `utils/modelAssets.js`. The Setup page provides build-aware local flight-controller and ExpressLRS radio plans with explicit hardware-verification boundaries, actual Aerial Kit arm gates, contextual packet/switch rules, a compact channel overview, a copy-only pair-and-bench runbook, synchronized read-only Web Serial captures, and evidence review with local value adoption. Saved supports two-build comparison; Build supports exploded inspection and the eight-check Viewer placement/interface audit.

You may extend the UI with portable analysis export, richer source-backed assembly notes, more catalog data, and protocol-aware live sessions on top of the read-only capture foundation. Hardware mutation must remain a separate, capability-gated layer, not a cosmetic extension of the local plan.

Do not replace the current worktree, invent specifications, reuse unrelated meshes, rotate individual assembled parts, or remove fallback geometry until a real asset is available. Verify the production build, tests, accessibility, backend schema, and both model-backed and fallback assemblies before reporting completion.
