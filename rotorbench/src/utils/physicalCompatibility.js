function asPattern(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [first, second] = value.map(Number);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return [first, second].sort((a, b) => a - b);
}

function patternsFor(value, groupedKey) {
  const grouped = value?.[groupedKey];
  if (Array.isArray(grouped) && grouped.length > 0) {
    return grouped.map(asPattern).filter(Boolean);
  }
  const single = asPattern(value?.mountingPatternMm);
  return single ? [single] : [];
}

function samePattern(left, right) {
  const a = asPattern(left);
  const b = asPattern(right);
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) <= 0.15 && Math.abs(a[1] - b[1]) <= 0.15;
}

function check(status, message, label) {
  return { status, message, label };
}

function usesMeasuredField(part, fields) {
  const measuredFields = Array.isArray(part?.measuredFields)
    ? part.measuredFields
    : [];
  return fields.some((field) => measuredFields.includes(field));
}

export function checkBoardStack(part, frame) {
  const boardPattern = asPattern(part?.mountingPatternMm);
  const framePatterns = patternsFor(frame, "stackMountPatternsMm");
  if (!boardPattern) {
    return check(
      "unknown",
      `${part?.name || "Board"} mounting pattern is not catalogued.`,
      `${part?.name || "Board"} stack mount`,
    );
  }
  if (framePatterns.length === 0) {
    return check(
      "unknown",
      `${frame?.name || "Frame"} stack patterns are not catalogued.`,
      `${part?.name || "Board"} stack mount`,
    );
  }
  if (framePatterns.some((pattern) => samePattern(pattern, boardPattern))) {
    return check(
      "compatible",
      `${boardPattern[0]} × ${boardPattern[1]} mm stack pattern matches the frame.`,
      `${part.name} stack mount`,
    );
  }
  const supported = framePatterns
    .map(([width, height]) => `${width} × ${height} mm`)
    .join(", ");
  return check(
    "conflict",
    `${part.name} uses ${boardPattern[0]} × ${boardPattern[1]} mm, but the frame lists ${supported}.`,
    `${part.name} stack mount`,
  );
}

export function checkBoardFootprint(part, frame) {
  const planform = asPattern(part?.planformMm);
  if (!planform) return null;

  const frameDimensions = frame?.dimensionsMm;
  const frameFootprint = Array.isArray(frameDimensions)
    && frameDimensions.length === 3
    && frameDimensions[0] > 0
    && frameDimensions[2] > 0
      ? [Number(frameDimensions[0]), Number(frameDimensions[2])].sort((a, b) => a - b)
      : null;
  if (!frameFootprint) return null;

  const impossible =
    planform[0] > frameFootprint[0]
    || planform[1] > frameFootprint[1];
  if (impossible) {
    return check(
      "conflict",
      `${part.name}'s ${planform[0]} × ${planform[1]} mm footprint exceeds the ${frame.name}'s overall ${frameFootprint[0]} × ${frameFootprint[1]} mm envelope.`,
      `${part.name} board footprint`,
    );
  }

  // Staying inside the overall frame envelope does not prove usable stack-deck
  // clearance. Leave that positive state unreported until a deck is measured.
  return null;
}

export function checkMotorMount(motor, frame) {
  const motorPattern = asPattern(motor?.mountingPatternMm);
  const framePatterns = patternsFor(frame, "motorMountPatternsMm");
  if (!motorPattern) {
    return check(
      "unknown",
      `${motor?.name || "Motor"} mounting pattern is not catalogued.`,
      `${motor?.name || "Motor"} mount`,
    );
  }
  if (framePatterns.length === 0) {
    return check(
      "unknown",
      `${frame?.name || "Frame"} motor-mount patterns are not catalogued.`,
      `${motor?.name || "Motor"} mount`,
    );
  }
  if (framePatterns.some((pattern) => samePattern(pattern, motorPattern))) {
    return check(
      usesMeasuredField(motor, ["mountingPatternMm"]) ? "measured" : "compatible",
      `${motorPattern[0]} × ${motorPattern[1]} mm motor pattern fits the frame mount range.`,
      `${motor.name} mount`,
    );
  }
  const supported = framePatterns
    .map(([width, height]) => `${width} × ${height} mm`)
    .join(", ");
  return check(
    "conflict",
    `${motor.name} uses ${motorPattern[0]} × ${motorPattern[1]} mm, but the frame lists ${supported}.`,
    `${motor.name} mount`,
  );
}

export function checkPropellerFit(propeller, motor) {
  if (!propeller || !motor) {
    return check(
      "unknown",
      "Select both a motor and propeller to check shaft and bell fit.",
      "Propeller hub fit",
    );
  }
  const shaftMismatch =
    Number.isFinite(Number(propeller.shaftMm)) &&
    Number.isFinite(Number(motor.propShaftMm)) &&
    Number(propeller.shaftMm) !== Number(motor.propShaftMm);
  if (shaftMismatch) {
    return check(
      "conflict",
      `${propeller.name} uses a ${propeller.shaftMm} mm prop bore; ${motor.name} lists a ${motor.propShaftMm} mm prop shaft.`,
      `${propeller.name} hub fit`,
    );
  }

  const hubDiameter = Number(propeller.hubDiameterMm);
  const bellDiameter = Number(motor.bellDiameterMm);
  let measuredComparison =
    usesMeasuredField(propeller, ["hubDiameterMm"])
    || usesMeasuredField(motor, ["bellDiameterMm"]);
  if (
    Number.isFinite(hubDiameter) &&
    Number.isFinite(bellDiameter) &&
    hubDiameter > bellDiameter
  ) {
    return check(
      "conflict",
      `${propeller.name} has a ${hubDiameter} mm hub, larger than the ${bellDiameter} mm motor bell.`,
      `${propeller.name} hub fit`,
    );
  }

  if (
    Number.isFinite(Number(propeller.shaftMm)) &&
    Number.isFinite(Number(motor.propShaftMm))
  ) {
    measuredComparison = measuredComparison
      || usesMeasuredField(propeller, ["shaftMm"])
      || usesMeasuredField(motor, ["propShaftMm"]);
    return check(
      measuredComparison ? "measured" : "compatible",
      `${propeller.shaftMm} mm prop mounting matches the motor shaft.`,
      `${propeller.name} hub fit`,
    );
  }
  return check(
    "unknown",
    "Motor shaft or propeller bore data is incomplete.",
    `${propeller.name} hub fit`,
  );
}

export function checkPowerConnector(battery, esc) {
  if (!battery || !esc) {
    return check(
      "unknown",
      "Select both a battery and ESC to verify the power connector path.",
      "Battery to ESC connector",
    );
  }
  const batteryConnector = String(battery.dischargeConnector || "").trim().toUpperCase();
  const escConnector = String(esc.includedPowerConnector || "").trim().toUpperCase();
  const batteryLead = batteryConnector
    ? `${battery.name} uses ${batteryConnector}`
    : `${battery.name}'s connector is not catalogued`;
  if (esc.powerConnection === "solder-pads") {
    return check(
      "unknown",
      `${batteryLead}, and ${esc.name} supplies bare power pads. Solder the battery lead, then verify polarity and wire gauge.`,
      "Battery to ESC connector",
    );
  }
  if (esc.powerConnection === "supplied-cable") {
    return check(
      "unknown",
      `${batteryLead}; ${esc.name} supplies a power cable but does not publish its connector type. Verify the delivered termination before connecting.`,
      "Battery to ESC connector",
    );
  }
  if (!batteryConnector) {
    return check(
      "unknown",
      `${battery.name} discharge connector is not catalogued.`,
      "Battery to ESC connector",
    );
  }
  if (!escConnector) {
    return check(
      "unknown",
      `${esc.name} supplied power lead is not catalogued.`,
      "Battery to ESC connector",
    );
  }
  if (batteryConnector === escConnector) {
    return check(
      "compatible",
      `${batteryConnector} battery connector matches the ${escConnector} lead supplied with the ESC.`,
      "Battery to ESC connector",
    );
  }
  return check(
    "conflict",
    `${battery.name} uses ${batteryConnector}, but ${esc.name} supplies ${escConnector}. Add the required adapter or replace the lead.`,
    "Battery to ESC connector",
  );
}

export function summarizePowerPath(battery, esc) {
  const check = checkPowerConnector(battery, esc);
  const batteryConnector = String(battery?.dischargeConnector || "").trim().toUpperCase();
  const escConnector = String(esc?.includedPowerConnector || "").trim().toUpperCase();
  let displayState = "pending";
  let label;

  if (!battery) {
    label = "Select battery";
  } else if (!esc) {
    label = "Select ESC";
  } else if (esc.powerConnection === "solder-pads") {
    displayState = "manual";
    label = "Solder lead";
  } else if (esc.powerConnection === "supplied-cable") {
    displayState = "review";
    label = "Verify termination";
  } else if (check.status === "compatible") {
    displayState = "verified";
    label = `${escConnector} match`;
  } else if (check.status === "conflict") {
    displayState = "conflict";
    label = "Adapter required";
  } else {
    displayState = "unknown";
    label = "Awaiting connector data";
  }

  return {
    ...check,
    displayState,
    label,
    adapterLabel: check.status === "conflict"
      ? `${batteryConnector}-to-${escConnector} adapter`
      : null,
    polarityNote:
      "Verify red/black polarity and connector gender against the ESC markings before first power.",
    batteryName: battery?.name || "Battery not selected",
    escName: esc?.name || "ESC not selected",
    batteryConnector: batteryConnector || null,
    escConnector: escConnector || null,
    escTermination: esc?.powerConnection || null,
    batteryConnectorSourceUrl: battery?.connectorSourceUrl || battery?.sourceUrl || null,
    escConnectorSourceUrl: esc?.connectorSourceUrl || esc?.sourceUrl || null,
  };
}

export function checkBatteryEnvelope(battery, frame) {
  const frameDimensions = frame?.dimensionsMm;
  const batteryDimensions = battery?.dimensionsMm;
  const measuredDeck = Array.isArray(frame?.batteryDeckDimensionsMm)
    && frame.batteryDeckDimensionsMm.length === 2
    && frame.batteryDeckDimensionsMm.every((value) => Number(value) > 0)
    ? frame.batteryDeckDimensionsMm.map(Number).sort((a, b) => a - b)
    : null;
  const hasFrameDimensions = Array.isArray(frameDimensions)
    && frameDimensions.length === 3
    && frameDimensions.every((value) => Number(value) > 0);
  const hasBatteryDimensions = Array.isArray(batteryDimensions)
    && batteryDimensions.length === 3
    && batteryDimensions.every((value) => Number(value) > 0);
  if (!hasBatteryDimensions || (!measuredDeck && !hasFrameDimensions)) {
    return null;
  }

  const frameFootprint = hasFrameDimensions
    ? [Number(frameDimensions[0]), Number(frameDimensions[2])]
      .sort((a, b) => a - b)
    : null;
  const availableFootprint = measuredDeck || frameFootprint;
  const bestBatteryFootprint = batteryDimensions
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 2);
  const impossible =
    bestBatteryFootprint[0] > availableFootprint[0]
    || bestBatteryFootprint[1] > availableFootprint[1];
  const measured = (Boolean(measuredDeck)
    && usesMeasuredField(frame, ["batteryDeckDimensionsMm"]))
    || usesMeasuredField(battery, ["dimensionsMm"])
    || usesMeasuredField(frame, ["dimensionsMm"]);
  if (!impossible && !measuredDeck) return null;
  if (!impossible) {
    return check(
      measured ? "measured" : "compatible",
      `${battery.name} fits the ${measured ? "measured " : ""}usable battery deck of ${availableFootprint[0]} × ${availableFootprint[1]} mm in at least one orientation.`,
      "Battery deck footprint",
    );
  }

  return check(
    "conflict",
    measuredDeck
      ? `${battery.name} cannot fit the measured usable battery deck of ${availableFootprint[0]} × ${availableFootprint[1]} mm, even in its best-case orientation.`
      : `${battery.name} cannot fit within the ${frame.name}'s overall ${availableFootprint[0]} × ${availableFootprint[1]} mm frame footprint, even in its best-case orientation.`,
    "Battery deck footprint",
  );
}

export function physicalChecksFor(category, part, selected = {}) {
  const checks = [];
  if (category === "motors") {
    checks.push(checkMotorMount(part, selected.frame));
    checks.push(checkPropellerFit(selected.propeller, part));
  }
  if (category === "propellers") {
    checks.push(checkPropellerFit(part, selected.motor));
  }
  if (category === "escs" || category === "flight_controllers") {
    checks.push(checkBoardStack(part, selected.frame));
    checks.push(checkBoardFootprint(part, selected.frame));
  }
  if (category === "batteries") {
    checks.push(checkPowerConnector(part, selected.esc));
    checks.push(checkBatteryEnvelope(part, selected.frame));
  }
  if (category === "escs") {
    checks.push(checkPowerConnector(selected.battery, part));
  }
  return checks.filter(Boolean);
}

export function summarizeAssemblyInterfaces(selected = {}) {
  const checks = [];
  if (selected.frame?.id && selected.motor?.id) {
    checks.push(checkMotorMount(selected.motor, selected.frame));
  }
  if (selected.motor?.id && selected.propeller?.id) {
    checks.push(checkPropellerFit(selected.propeller, selected.motor));
  }
  for (const board of [selected.flightController, selected.esc]) {
    if (selected.frame?.id && board?.id) {
      checks.push(checkBoardStack(board, selected.frame));
    }
  }
  if (selected.battery?.id && selected.esc?.id) {
    checks.push(checkPowerConnector(selected.battery, selected.esc));
  }

  const conflictCount = checks.filter((item) => item.status === "conflict").length;
  const unknownCount = checks.filter((item) => item.status === "unknown").length;
  const matchedCount = checks.length - conflictCount - unknownCount;
  return {
    totalCount: checks.length,
    matchedCount,
    unknownCount,
    conflictCount,
    complete: checks.length > 0 && conflictCount === 0 && unknownCount === 0,
  };
}

export function summarizePhysicalChecks(checks) {
  const uniqueChecks = Array.from(
    new Map(
      checks.map((item) => [`${item.status}:${item.message}`, item]),
    ).values(),
  );
  const conflict = uniqueChecks.find((item) => item.status === "conflict");
  if (conflict) {
    return { ok: false, verified: false, measured: 0, reason: conflict.message };
  }
  const compatible = uniqueChecks.filter((item) => item.status === "compatible");
  const measured = uniqueChecks.filter((item) => item.status === "measured");
  const unknown = uniqueChecks.filter((item) => item.status === "unknown");
  if (unknown.length === 0 && compatible.length + measured.length > 0) {
    return {
      ok: true,
      verified: measured.length === 0,
      measured: measured.length,
      reason: [...compatible, ...measured].map((item) => item.message).join(" "),
    };
  }
  return {
    ok: true,
    verified: false,
    measured: measured.length,
    reason:
      [...compatible, ...measured, ...unknown]
        .map((item) => item.message)
        .slice(0, 2)
        .join(" ") || "No physical-fit checks apply to this selection.",
  };
}
