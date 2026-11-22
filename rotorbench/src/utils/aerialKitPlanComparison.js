import { fcParameterPlanEntries } from "./fcEvidence";

const STATUSES = new Set(["pass", "fail", "unverified"]);
const FALSE_BOUNDARIES = [
  "valuesAdopted",
  "valuesWritten",
  "valuesPersisted",
  "hardwareVerified",
  "rfVerified",
  "flightReady",
];

function timestamp(value) {
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
}

function comparisonCheck(id, label, status, detail) {
  return { id, label, status, detail };
}

function parseTimestamp(value, label) {
  if (value == null) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`${label} is not a valid timestamp.`);
  }
  return milliseconds;
}

function normalizedPlanEntries(entries) {
  return entries
    .map((entry) => ({
      name: String(entry.name || entry.runtimeName || "").toLowerCase(),
      expected: String(entry.expected ?? ""),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function createAerialKitPlanComparisonEvidence({
  checks = [],
  plan = null,
  targetName = null,
  statusObservedAtMs = null,
  parameterValuesRead = false,
  parameterMetadataRead = false,
  sessionActive = false,
  nowMs = Date.now(),
} = {}) {
  const planEntries = fcParameterPlanEntries(plan);
  const expectedByName = new Map(
    planEntries.map((entry) => [entry.runtimeName.toLowerCase(), entry]),
  );
  const rows = checks
    .filter((check) => check?.id && STATUSES.has(check.status))
    .map((check) => {
      const parameter = String(check.label || check.id)
        .replace(/^FC parameter /, "");
      const planEntry = expectedByName.get(parameter.toLowerCase()) || null;
      return {
        id: check.id,
        parameter,
        status: check.status,
        expected: planEntry?.expected ?? null,
        requirement: planEntry?.requirement || null,
        detail: String(check.detail || ""),
      };
    });
  const count = (status) => rows.filter((row) => row.status === status).length;

  return {
    schema: "rotorbench.aerial-kit-plan-comparison.v1",
    generatedAt: timestamp(nowMs),
    target: {
      name: targetName || "Selected flight-controller plan",
      firmwareFamily: plan?.firmwareFamily || null,
      profileId: plan?.profileId || null,
    },
    source: {
      transport: "Web Serial / AKP",
      readOnly: true,
      sessionActive: Boolean(sessionActive),
      statusObservedAt: timestamp(statusObservedAtMs),
      parameterValuesRead: Boolean(parameterValuesRead),
      parameterMetadataRead: Boolean(parameterMetadataRead),
    },
    stagedPlanParameters: planEntries.map((entry) => ({
      name: entry.runtimeName,
      expected: entry.expected,
    })),
    summary: {
      compared: rows.length,
      matched: count("pass"),
      differing: count("fail"),
      notObserved: count("unverified"),
    },
    parameters: rows,
    boundaries: {
      valuesAdopted: false,
      valuesWritten: false,
      valuesPersisted: false,
      hardwareVerified: false,
      rfVerified: false,
      flightReady: false,
    },
  };
}

export function parseAerialKitPlanComparisonEvidence(
  payload,
  { expectedPlan = null } = {},
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The plan comparison artifact must be a JSON object.");
  }
  if (payload.schema !== "rotorbench.aerial-kit-plan-comparison.v1") {
    throw new Error("The file is not an Aerial Kit plan comparison artifact.");
  }
  const generatedAtMs = parseTimestamp(payload.generatedAt, "generatedAt");
  if (generatedAtMs == null) {
    throw new Error("The plan comparison artifact has no generatedAt timestamp.");
  }
  if (!payload.target || payload.target.firmwareFamily !== "aerialkit") {
    throw new Error("The plan comparison artifact does not identify an Aerial Kit target.");
  }
  if (typeof payload.target.name !== "string" || !payload.target.name.trim()) {
    throw new Error("The plan comparison artifact has no target name.");
  }
  if (!payload.source || payload.source.readOnly !== true) {
    throw new Error("The plan comparison artifact does not declare a read-only source.");
  }
  for (const key of [
    "sessionActive",
    "parameterValuesRead",
    "parameterMetadataRead",
  ]) {
    if (typeof payload.source[key] !== "boolean") {
      throw new Error(`The plan comparison source.${key} flag is missing or invalid.`);
    }
  }
  const statusObservedAtMs = parseTimestamp(
    payload.source.statusObservedAt,
    "source.statusObservedAt",
  );
  if (statusObservedAtMs != null && statusObservedAtMs > generatedAtMs + 5 * 60 * 1000) {
    throw new Error("The plan comparison status timestamp is after its export time.");
  }

  if (
    !Array.isArray(payload.stagedPlanParameters)
    || payload.stagedPlanParameters.length > 256
  ) {
    throw new Error("The plan comparison has an invalid staged parameter list.");
  }
  const stagedPlanParameters = normalizedPlanEntries(payload.stagedPlanParameters);
  const stagedNames = new Set();
  stagedPlanParameters.forEach((entry) => {
    if (!entry.name || !entry.expected) {
      throw new Error("A staged plan parameter is missing its name or expected value.");
    }
    if (stagedNames.has(entry.name)) {
      throw new Error(`The staged plan repeats parameter ${entry.name}.`);
    }
    stagedNames.add(entry.name);
  });

  if (!Array.isArray(payload.parameters) || payload.parameters.length > 256) {
    throw new Error("The plan comparison has an invalid comparison row list.");
  }
  const rowIds = new Set();
  const parameters = payload.parameters.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`Plan comparison row ${index} is invalid.`);
    }
    const parameter = String(row.parameter || "").toLowerCase();
    const id = String(row.id || "");
    if (!parameter || !id || rowIds.has(id) || !STATUSES.has(row.status)) {
      throw new Error(`Plan comparison row ${index} has an invalid identity or status.`);
    }
    const expected = row.expected == null ? null : String(row.expected);
    const staged = stagedPlanParameters.find((entry) => entry.name === parameter);
    if (expected != null && (!staged || staged.expected !== expected)) {
      throw new Error(`Plan comparison row ${parameter} contradicts the staged expected value.`);
    }
    if (staged && expected == null) {
      throw new Error(`Plan comparison row ${parameter} omits its staged expected value.`);
    }
    rowIds.add(id);
    return {
      id,
      parameter,
      status: row.status,
      expected,
      requirement: typeof row.requirement === "string" ? row.requirement : null,
      detail: String(row.detail || ""),
    };
  });
  const counts = {
    compared: parameters.length,
    matched: parameters.filter((row) => row.status === "pass").length,
    differing: parameters.filter((row) => row.status === "fail").length,
    notObserved: parameters.filter((row) => row.status === "unverified").length,
  };
  for (const key of Object.keys(counts)) {
    if (payload.summary?.[key] !== counts[key]) {
      throw new Error(`The plan comparison summary.${key} does not match its rows.`);
    }
  }
  if (!payload.boundaries || typeof payload.boundaries !== "object") {
    throw new Error("The plan comparison has no evidence boundaries.");
  }
  FALSE_BOUNDARIES.forEach((key) => {
    if (payload.boundaries[key] !== false) {
      throw new Error(`The plan comparison boundary ${key} is not explicitly false.`);
    }
  });

  const currentPlanEntries = expectedPlan
    ? normalizedPlanEntries(fcParameterPlanEntries(expectedPlan))
    : null;
  const currentPlanMatches = currentPlanEntries
    ? JSON.stringify(currentPlanEntries) === JSON.stringify(stagedPlanParameters)
    : null;
  const checks = [
    comparisonCheck(
      "akp-plan-export-time",
      "Plan comparison export time",
      "pass",
      `The local comparison artifact was generated at ${new Date(generatedAtMs).toISOString()}.`,
    ),
    comparisonCheck(
      "akp-plan-summary",
      "Plan comparison summary",
      "pass",
      `${counts.matched} match, ${counts.differing} differ, and ${counts.notObserved} were not observed across ${counts.compared} checked parameters.`,
    ),
    comparisonCheck(
      "akp-plan-expected-values",
      "Staged expected values",
      "pass",
      "Every compared row agrees with the expected values recorded in the artifact.",
    ),
    comparisonCheck(
      "akp-plan-boundaries",
      "Plan comparison boundaries",
      "pass",
      "The artifact explicitly disclaims adoption, writes, persistence, hardware verification, RF verification, and flight readiness.",
    ),
    comparisonCheck(
      "akp-plan-current",
      "Current staged plan",
      currentPlanMatches === null ? "unverified" : currentPlanMatches ? "pass" : "fail",
      currentPlanMatches === null
        ? "No current flight-controller plan was supplied for a plan-identity comparison."
        : currentPlanMatches
          ? "The artifact's staged parameter list matches the current flight-controller plan."
          : "The artifact's staged parameter list differs from the current flight-controller plan.",
    ),
  ];

  return {
    schema: payload.schema,
    generatedAt: new Date(generatedAtMs).toISOString(),
    generatedAtMs,
    target: {
      name: payload.target.name.trim(),
      firmwareFamily: payload.target.firmwareFamily,
      profileId: typeof payload.target.profileId === "string"
        ? payload.target.profileId
        : null,
    },
    source: {
      transport: String(payload.source.transport || "Web Serial / AKP"),
      readOnly: true,
      sessionActive: payload.source.sessionActive,
      statusObservedAt: timestamp(statusObservedAtMs),
      statusObservedAtMs,
      parameterValuesRead: payload.source.parameterValuesRead,
      parameterMetadataRead: payload.source.parameterMetadataRead,
    },
    stagedPlanParameters,
    summary: counts,
    parameters,
    boundaries: Object.fromEntries(FALSE_BOUNDARIES.map((key) => [key, false])),
    currentPlanMatches,
    checks,
  };
}
