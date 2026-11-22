import {
  BENCH_EVIDENCE_ATTACHMENT_SCHEMA,
  BENCH_EVIDENCE_HISTORY_LIMIT,
  appendBenchEvidenceAttachmentHistory,
  benchEvidenceDomainScopeMatches,
  benchEvidenceStorageKey,
  benchEvidenceScopeMatches,
  clearBenchEvidenceAttachmentHistory,
  compareBenchEvidenceRuns,
  copyBenchEvidenceAttachment,
  createBenchEvidenceScope,
  createBenchEvidenceAttachment,
  readCurrentBenchEvidenceScope,
  readBenchEvidenceAttachment,
  readBenchEvidenceAttachmentHistory,
  removeBenchEvidenceAttachment,
  saveBenchEvidenceAttachment,
  summarizeBenchEvidenceAttachment,
} from "./benchEvidenceAttachment";

const review = {
  schema: "rotorbench.bench-evidence-review.v1",
  kind: "pair",
  fileOverall: "PASS",
  importTrust: "locally selected file; authenticity not independently verified",
  rfReportedPass: true,
  rfEvidenceComplete: true,
  integrityClean: true,
  txUid: "10:73:A1:1F:A8:0F",
  rxUid: "10:73:A1:1F:A8:0F",
  planUid: "10:73:A1:1F:A8:0F",
  planContext: { role: null, targetName: "Aerial Kit ELRS USB TX Rev A3" },
  reportedBaud: 400000,
  bundle: { complete: true, settingsComplete: true },
  checks: [
    { label: "Receiver RC frames", status: "pass" },
    { label: "Current plan identity", status: "pass" },
    { label: "Drive exit disarmed", status: "unverified" },
    { label: "Module max power", status: "fail" },
  ],
};

const scope = createBenchEvidenceScope({
  build: {
    componentIds: {
      frameId: "frame-a",
      motorId: "motor-a",
      propellerId: "prop-a",
      batteryId: "battery-a",
      escId: "esc-a",
      flightControllerId: "fc-a",
      receiverId: "rx-a",
    },
  },
  flightControllerPlan: {
    planVersion: 3,
    firmwareFamily: "aerialkit",
    profileId: "esp32dev",
    receiverUart: "UART2",
    receiverBaud: 420000,
    armChannel: 5,
    modeChannel: 6,
    rcMin: 172,
    rcMid: 992,
    rcMax: 1811,
    rcDeadband: 0.02,
    features: { telemetry: true, gps: true },
  },
  radioPlan: {
    planVersion: 3,
    targetId: "aerialkit-elrs-rev-a3",
    role: "tx",
    packetRateMode: "250",
    powerDbm: -18,
    channelMap: { arm: 5, flightMode: 6 },
  },
});

test("attaches only a sanitized bench evidence summary", () => {
  const attachment = createBenchEvidenceAttachment(
    review,
    "2026-11-20T12:00:00.000Z",
  );

  expect(attachment).toMatchObject({
    schema: BENCH_EVIDENCE_ATTACHMENT_SCHEMA,
    attachedAt: "2026-11-20T12:00:00.000Z",
    hardwareVerifiedByRotorBench: false,
    hasImportedUids: true,
    uidPairMatches: true,
    currentPlanUidMatch: true,
    checkCounts: { pass: 2, fail: 1, unverified: 1 },
    failedChecks: ["Module max power"],
    unverifiedChecks: ["Drive exit disarmed"],
  }, undefined, scope);
  expect(JSON.stringify(attachment)).not.toContain("/dev/tty");
  expect(JSON.stringify(attachment)).not.toContain("bindingPhrase");
  expect(JSON.stringify(attachment)).not.toMatch(/10:73:a1:1f:a8:0f/i);
  expect(JSON.stringify(attachment)).not.toContain("1073a11fa80f");
  expect(attachment.txUidFingerprint).toMatch(/^fnv1a-/);
  expect(attachment).not.toHaveProperty("txUid");
  expect(attachment).not.toHaveProperty("rxUid");
  expect(attachment).not.toHaveProperty("planUid");
});

test("stores and reads evidence by build identity", () => {
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); },
  };
  const saved = saveBenchEvidenceAttachment("build-1", review, storage);

  expect(saved).toMatchObject({ schema: BENCH_EVIDENCE_ATTACHMENT_SCHEMA });
  expect(readBenchEvidenceAttachment("build-1", storage)).toMatchObject({
    kind: "pair",
    rfEvidenceComplete: true,
  });
  expect(readBenchEvidenceAttachmentHistory("build-1", storage)).toHaveLength(1);
  expect(benchEvidenceStorageKey("build-1")).toBe(
    "rotorbench:bench-evidence:build-1:v1",
  );
});

test("migrates legacy raw binding identifiers out of a stored attachment", () => {
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); },
  };
  storage.setItem(
    "rotorbench:bench-evidence:build-legacy:v1",
    JSON.stringify({
      ...createBenchEvidenceAttachment(review),
      txUid: "10:73:A1:1F:A8:0F",
      rxUid: "10:73:A1:1F:A8:0F",
      planUid: "10:73:A1:1F:A8:0F",
    }),
  );

  const migrated = readBenchEvidenceAttachment("build-legacy", storage);
  expect(migrated).toMatchObject({
    hasImportedUids: true,
    uidPairMatches: true,
    currentPlanUidMatch: true,
  });
  expect(migrated.txUidFingerprint).toMatch(/^fnv1a-/);
  expect(JSON.stringify(migrated)).not.toMatch(/10:73:a1:1f:a8:0f/i);
  expect(storage.getItem("rotorbench:bench-evidence:build-legacy:v1"))
    .not.toMatch(/10:73:a1:1f:a8:0f/i);
});

test("summaries keep imported evidence separate from hardware verification", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    bundle: { complete: true, settingsComplete: false },
  }, undefined, scope);
  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "settings-mismatch",
    label: "Imported settings mismatch",
    hardwareVerified: false,
  });
});

test("copies an imported evidence summary to a duplicated build", () => {
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); },
  };
  saveBenchEvidenceAttachment("build-source", review, storage, scope);

  expect(copyBenchEvidenceAttachment("build-source", "build-copy", storage)).toBe(true);
  expect(readBenchEvidenceAttachment("build-copy", storage)).toMatchObject({
    schema: BENCH_EVIDENCE_ATTACHMENT_SCHEMA,
    attachedAt: expect.any(String),
    rfEvidenceComplete: true,
    hardwareVerifiedByRotorBench: false,
    scope,
  });
});

test("removes an imported evidence summary from one build", () => {
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); },
  };
  saveBenchEvidenceAttachment("build-1", review, storage);

  expect(removeBenchEvidenceAttachment("build-1", storage)).toBe(true);
  expect(readBenchEvidenceAttachment("build-1", storage)).toBeNull();
});

test("marks evidence stale when the current build or plan scope changes", () => {
  const attachment = createBenchEvidenceAttachment(
    review,
    "2026-11-20T12:00:00.000Z",
    scope,
  );
  const changedScope = createBenchEvidenceScope({
    build: { componentIds: { ...scope.componentIds, motorId: "motor-b" } },
    flightControllerPlan: scope.flightController,
    radioPlan: scope.radio,
  });

  expect(benchEvidenceScopeMatches(scope, changedScope)).toBe(false);
  expect(summarizeBenchEvidenceAttachment(attachment, changedScope)).toMatchObject({
    status: "stale",
    label: "Imported evidence · build or plan changed",
    scopeStatus: "stale",
    hardwareVerified: false,
  });
});

test("reads the current evidence scope from saved hardware plans", () => {
  const build = {
    id: "build-current",
    componentIds: scope.componentIds,
  };
  const storage = {
    values: new Map([
      [
        "rotorbench:hardware-plan:build-current:fc",
        JSON.stringify(scope.flightController),
      ],
      [
        "rotorbench:hardware-plan:build-current:radio",
        JSON.stringify(scope.radio),
      ],
    ]),
    getItem(key) { return this.values.get(key) ?? null; },
    removeItem(key) { this.values.delete(key); },
  };

  expect(readCurrentBenchEvidenceScope(build, storage)).toEqual(scope);
});

test("summarizes correlated endpoint observations without claiming RF verification", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    kind: "observation-pair",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    observationCorrelationComplete: true,
    bundle: { complete: false, settingsComplete: null },
  }, undefined, scope);

  expect(attachment).toMatchObject({
    observationCorrelationComplete: true,
    hardwareVerifiedByRotorBench: false,
  });
  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "observation-pair",
    label: "Two-endpoint observations correlated",
    hardwareVerified: false,
  });
});

test("tracks the staged pairing identity without storing the UID", () => {
  const attachedScope = createBenchEvidenceScope({
    build: { componentIds: scope.componentIds },
    flightControllerPlan: scope.flightController,
    radioPlan: scope.radio,
    pairingUid: "10:73:A1:1F:A8:0F",
  });
  const sameIdentity = createBenchEvidenceScope({
    build: { componentIds: scope.componentIds },
    flightControllerPlan: scope.flightController,
    radioPlan: scope.radio,
    pairingUid: "10:73:a1:1f:a8:0f",
  });
  const changedIdentity = createBenchEvidenceScope({
    build: { componentIds: scope.componentIds },
    flightControllerPlan: scope.flightController,
    radioPlan: scope.radio,
    pairingUid: "AA:BB:CC:DD:EE:FF",
  });
  const attachment = createBenchEvidenceAttachment(
    review,
    "2026-11-20T12:00:00.000Z",
    attachedScope,
  );

  expect(JSON.stringify(attachedScope)).not.toContain("1073a11fa80f");
  expect(benchEvidenceScopeMatches(attachedScope, sameIdentity)).toBe(true);
  expect(summarizeBenchEvidenceAttachment(attachment, sameIdentity)).toMatchObject({
    status: "correlated",
    identityStatus: "matched",
  });
  expect(summarizeBenchEvidenceAttachment(attachment, changedIdentity)).toMatchObject({
    status: "identity-mismatch",
    label: "Imported evidence · staged UID changed",
    identityStatus: "mismatch",
  });
  expect(summarizeBenchEvidenceAttachment(attachment, null)).toMatchObject({
    status: "identity-unstaged",
    label: "Imported evidence · UID not currently staged",
    identityStatus: "not-staged",
  });
});

test("matches flight-controller and radio adoption scopes independently", () => {
  const changedFc = createBenchEvidenceScope({
    build: {
      componentIds: {
        ...scope.componentIds,
        flightControllerId: "fc-b",
      },
    },
    flightControllerPlan: {
      ...scope.flightController,
      armHoldMs: 750,
    },
    radioPlan: scope.radio,
  });
  const changedRadio = createBenchEvidenceScope({
    build: { componentIds: scope.componentIds },
    flightControllerPlan: scope.flightController,
    radioPlan: {
      ...scope.radio,
      packetRateMode: "100-full",
    },
  });

  expect(benchEvidenceDomainScopeMatches(
    scope,
    changedFc,
    "radio",
  )).toBe(true);
  expect(benchEvidenceDomainScopeMatches(
    scope,
    changedFc,
    "flightController",
  )).toBe(false);
  expect(benchEvidenceDomainScopeMatches(
    scope,
    changedRadio,
    "flightController",
  )).toBe(true);
  expect(benchEvidenceDomainScopeMatches(
    scope,
    changedRadio,
    "radio",
  )).toBe(false);
});

test("summarizes complete FC status and preflight evidence as read-only", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    kind: "fc-evidence",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    fcEvidence: { evidenceComplete: true },
  }, undefined, scope);

  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "fc-evidence",
    label: "FC status and preflight reviewed",
    hardwareVerified: false,
  });
});

test("summarizes radio device identity evidence as read-only", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    kind: "radio-status-evidence",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    radioDeviceEvidence: { evidenceComplete: true },
  }, undefined, scope);

  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "radio-evidence",
    label: "Radio device status reviewed",
    hardwareVerified: false,
  });
});

test("summarizes matching FC parameter snapshots as read-only evidence", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    kind: "fc-parameters",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    checks: [
      { id: "fc-param-arm-channel", label: "FC parameter arm_channel", status: "pass" },
    ],
    fcEvidence: { parameters: { values: { arm_channel: "5" } } },
  }, undefined, scope);

  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "fc-parameters",
    label: "FC parameter snapshot matched",
    hardwareVerified: false,
  });
});

test("preserves validated mission-route evidence in attached history", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    kind: "fc-mission-route",
    fileOverall: "Mission-route geometry validated as planning evidence",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    checks: [
      { id: "fc-mission-route-geometry", status: "pass" },
      { id: "fc-mission-route-freshness", status: "unverified" },
      { id: "fc-mission-route-authenticity", status: "unverified" },
    ],
    fcEvidence: {
      missionRoute: {
        route: {
          waypointCount: 3,
          totalDistanceM: 5400,
        },
        activeTarget: { index: 1 },
        progress: {
          distanceToActiveM: 1250,
          totalRemainingM: 3612,
        },
        staleOnImport: true,
        geometryRecomputed: true,
      },
    },
  }, undefined, scope);

  expect(attachment).toMatchObject({
    missionRouteComplete: true,
    missionRoute: {
      waypointCount: 3,
      totalDistanceM: 5400,
      activeWaypointIndex: 1,
      distanceToActiveM: 1250,
      remainingDistanceM: 3612,
      staleOnImport: true,
      geometryRecomputed: true,
    },
  });
  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "mission-route",
    label: "Mission route validated · historical observation",
    hardwareVerified: false,
  });
});

function planComparisonAttachment({
  targetName = "SpeedyBee F405 V5",
  expectedArm = "6",
  matched = 2,
  differing = 1,
  notObserved = 3,
} = {}) {
  return createBenchEvidenceAttachment({
    ...review,
    kind: "fc-plan-comparison",
    fileOverall: "Plan comparison validated against the current staged plan",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    checks: [
      { id: "akp-plan-summary", label: "Plan comparison summary", status: "pass" },
      { id: "akp-plan-boundaries", label: "Plan comparison boundaries", status: "pass" },
      { id: "akp-plan-current", label: "Current staged plan", status: "pass" },
    ],
    fcEvidence: {
      planComparison: {
        target: {
          name: targetName,
          firmwareFamily: "aerialkit",
          profileId: "esp32dev",
        },
        generatedAt: "2026-11-22T12:00:00.000Z",
        currentPlanMatches: true,
        stagedPlanParameters: [
          { name: "arm_channel", expected: expectedArm },
          { name: "dshot_khz", expected: "300" },
        ],
        parameters: [
          {
            parameter: "arm_channel",
            status: "fail",
            expected: expectedArm,
          },
        ],
        source: {
          parameterValuesRead: true,
          parameterMetadataRead: true,
        },
        summary: {
          compared: matched + differing + notObserved,
          matched,
          differing,
          notObserved,
        },
      },
    },
  }, undefined, scope);
}

test("stores only sanitized plan-comparison history metadata", () => {
  const attachment = planComparisonAttachment();

  expect(attachment).toMatchObject({
    kind: "fc-plan-comparison",
    planComparisonComplete: true,
    planComparisonReviewed: true,
    planComparison: {
      targetName: "SpeedyBee F405 V5",
      currentPlanMatches: true,
      compared: 6,
      matched: 2,
      differing: 1,
      notObserved: 3,
    },
  });
  expect(attachment.planComparison.planFingerprint).toMatch(/^fnv1a-/);
  expect(JSON.stringify(attachment)).not.toContain('"arm_channel"');
  expect(JSON.stringify(attachment)).not.toContain('"expected":"6"');
  expect(JSON.stringify(attachment)).not.toContain('"parameters":[');
  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "plan-comparison",
    label: "FC plan comparison matched",
    hardwareVerified: false,
  });
});

test("compares plan identity and count changes without raw parameter rows", () => {
  const previous = planComparisonAttachment();
  const current = planComparisonAttachment({
    expectedArm: "7",
    matched: 3,
    differing: 0,
    notObserved: 2,
  });

  expect(compareBenchEvidenceRuns(current, previous)).toMatchObject({
    status: "changed",
    label: "Staged FC plan changed",
    planComparisonComparison: {
      planFingerprintComparable: true,
      planChanged: true,
      matchedDelta: 1,
      differingDelta: -1,
      notObservedDelta: -1,
    },
  });
  expect(compareBenchEvidenceRuns(current, previous).summary)
    .toContain("Staged plan fingerprint changed");

  const retargeted = planComparisonAttachment({ targetName: "Custom board" });
  expect(compareBenchEvidenceRuns(retargeted, previous)).toMatchObject({
    status: "changed",
    label: "Plan comparison target changed",
  });
});

function missionRouteAttachment({
  waypointCount = 3,
  totalDistanceM = 5400,
  activeWaypointIndex = 1,
  remainingDistanceM = 3612,
  staleOnImport = false,
  coordinateOffsetDegrees = 0,
  checks = [
    { id: "fc-mission-route-geometry", status: "pass" },
    { id: "fc-mission-route-freshness", status: "pass" },
    { id: "fc-mission-route-authenticity", status: "unverified" },
  ],
} = {}) {
  return createBenchEvidenceAttachment({
    ...review,
    kind: "fc-mission-route",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    checks,
    fcEvidence: {
      missionRoute: {
        route: { waypointCount, totalDistanceM },
        waypoints: Array.from({ length: waypointCount }, (_, index) => ({
          index,
          lat: index / 100 + coordinateOffsetDegrees,
          lon: index / 100,
        })),
        activeTarget: { index: activeWaypointIndex },
        progress: { distanceToActiveM: 1250, totalRemainingM: remainingDistanceM },
        staleOnImport,
        geometryRecomputed: true,
      },
    },
  });
}

test("compares mission-route geometry without calling changes better or worse", () => {
  const previous = missionRouteAttachment();
  const current = missionRouteAttachment({
    waypointCount: 4,
    totalDistanceM: 6100,
    activeWaypointIndex: 2,
    remainingDistanceM: 4300,
  });

  expect(compareBenchEvidenceRuns(current, previous)).toMatchObject({
    status: "changed",
    label: "Mission route changed",
    missionRouteComparison: {
      waypointCountDelta: 1,
      totalDistanceDeltaM: 700,
      remainingDistanceDeltaM: 688,
      activeTargetChanged: true,
      activeTarget: { previous: 1, current: 2 },
      freshnessChange: "unchanged",
      geometryChanged: true,
    },
  });
  expect(compareBenchEvidenceRuns(current, previous).summary)
    .toContain("WP 1 → WP 2");
});

test("distinguishes an active-target-only change and freshness transitions", () => {
  const previous = missionRouteAttachment();
  const activeChanged = missionRouteAttachment({
    activeWaypointIndex: 2,
    remainingDistanceM: 2362,
  });
  expect(compareBenchEvidenceRuns(activeChanged, previous)).toMatchObject({
    status: "changed",
    label: "Active mission target changed",
  });

  const historical = missionRouteAttachment({ staleOnImport: true });
  const refreshed = compareBenchEvidenceRuns(previous, historical);
  expect(refreshed).toMatchObject({
    status: "improved",
    label: "Mission observation refreshed",
    missionRouteComparison: {
      freshnessChange: "refreshed",
      geometryChanged: false,
    },
  });
  expect(compareBenchEvidenceRuns(historical, previous)).toMatchObject({
    status: "changed",
    label: "Mission observation became historical",
  });
  expect(compareBenchEvidenceRuns(previous, previous)).toMatchObject({
    status: "unchanged",
    label: "Mission route unchanged",
  });
});

test("detects coordinate changes when scalar route totals are unchanged", () => {
  const previous = missionRouteAttachment();
  const current = missionRouteAttachment({ coordinateOffsetDegrees: 0.001 });
  expect(compareBenchEvidenceRuns(current, previous)).toMatchObject({
    status: "changed",
    label: "Mission waypoints changed",
    missionRouteComparison: {
      waypointCountDelta: 0,
      totalDistanceDeltaM: 0,
      remainingDistanceDeltaM: 0,
      coordinatesComparable: true,
      coordinatesChanged: true,
      geometryChanged: true,
    },
  });
  expect(compareBenchEvidenceRuns(current, previous).summary)
    .toContain("Waypoint coordinates changed");
});

test("does not summarize a partial FC parameter snapshot as matched", () => {
  const attachment = createBenchEvidenceAttachment({
    ...review,
    kind: "fc-parameters",
    rfReportedPass: false,
    rfEvidenceComplete: false,
    checks: [
      { id: "fc-param-arm-channel", label: "FC parameter arm_channel", status: "pass" },
      { id: "fc-param-mode-channel", label: "FC parameter mode_channel", status: "unverified" },
    ],
    fcEvidence: { parameters: { values: { arm_channel: "5" } } },
  }, undefined, scope);

  expect(attachment.fcParametersComplete).toBe(false);
  expect(summarizeBenchEvidenceAttachment(attachment, scope)).toMatchObject({
    status: "observation",
    label: "Imported observation only",
    hardwareVerified: false,
  });
});

test("keeps a bounded newest-first evidence run history", () => {
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); },
  };
  for (let index = 0; index < BENCH_EVIDENCE_HISTORY_LIMIT + 2; index += 1) {
    const attachment = createBenchEvidenceAttachment(
      review,
      `2026-11-20T12:00:${String(index).padStart(2, "0")}.000Z`,
    );
    appendBenchEvidenceAttachmentHistory("build-history", attachment, storage);
  }

  const history = readBenchEvidenceAttachmentHistory("build-history", storage);
  expect(history).toHaveLength(BENCH_EVIDENCE_HISTORY_LIMIT);
  expect(history[0].attachedAt).toBe("2026-11-20T12:00:09.000Z");
  expect(history.at(-1).attachedAt).toBe("2026-11-20T12:00:02.000Z");
  expect(clearBenchEvidenceAttachmentHistory("build-history", storage)).toBe(true);
  expect(readBenchEvidenceAttachmentHistory("build-history", storage)).toEqual([]);
});

test("compares sanitized evidence runs without claiming hardware verification", () => {
  const previous = createBenchEvidenceAttachment({
    ...review,
    checks: [
      { label: "Receiver RC frames", status: "pass" },
      { label: "Current plan identity", status: "fail" },
      { label: "Module max power", status: "fail" },
      { label: "Drive exit disarmed", status: "unverified" },
    ],
  });
  const current = createBenchEvidenceAttachment(review);

  expect(compareBenchEvidenceRuns(current, previous)).toMatchObject({
    status: "improved",
    label: "Review improved",
    passDelta: 1,
    failDelta: -1,
    unverifiedDelta: 0,
  });
  expect(current.hardwareVerifiedByRotorBench).toBe(false);
});

test("does not call newly visible failures a regression when open checks shrink", () => {
  const previous = createBenchEvidenceAttachment({
    ...review,
    checks: [
      { label: "Receiver RC frames", status: "unverified" },
      { label: "Link quality", status: "unverified" },
      { label: "Frame freshness", status: "unverified" },
    ],
  });
  const current = createBenchEvidenceAttachment({
    ...review,
    checks: [
      { label: "Receiver RC frames", status: "pass" },
      { label: "Link quality", status: "fail" },
      { label: "Frame freshness", status: "pass" },
    ],
  });

  expect(compareBenchEvidenceRuns(current, previous)).toMatchObject({
    status: "mixed",
    label: "Review coverage changed",
    passDelta: 2,
    failDelta: 1,
    unverifiedDelta: -3,
  });
});

test("does not compare different evidence types or check sets", () => {
  const previous = createBenchEvidenceAttachment({
    ...review,
    kind: "fc-parameters",
  });
  const current = createBenchEvidenceAttachment(review);
  expect(compareBenchEvidenceRuns(current, previous)).toMatchObject({
    status: "not-comparable",
    label: "Not comparable",
    summary: "Different evidence types cannot be compared.",
    comparable: false,
  });

  const changedChecks = createBenchEvidenceAttachment({
    ...review,
    checks: [...review.checks, { label: "New evidence gate", status: "pass" }],
  });
  expect(compareBenchEvidenceRuns(changedChecks, current)).toMatchObject({
    status: "not-comparable",
    summary: "The runs cover different checks.",
  });
});
