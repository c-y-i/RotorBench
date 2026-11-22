import { fcParameterPlanEntries } from "./fcEvidence";

const STATUSES = new Set(["pass", "fail", "unverified"]);

function timestamp(value) {
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
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
