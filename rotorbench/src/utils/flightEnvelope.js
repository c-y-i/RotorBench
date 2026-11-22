function formatGrams(value) {
  return `${value} g`;
}

function roundTenths(value) {
  return Math.round(value * 10) / 10;
}

export function summarizeTakeoffWeight(weightG, flightEnvelope) {
  const weight = roundTenths(Number(weightG));
  const range = flightEnvelope?.takeoffWeightG;

  if (
    !Number.isFinite(weight)
    || weight <= 0
    || !Array.isArray(range)
    || range.length !== 2
  ) {
    return null;
  }

  const [minimum, maximum] = range.map((value) => roundTenths(Number(value)));
  if (
    !Number.isFinite(minimum)
    || !Number.isFinite(maximum)
    || minimum <= 0
    || maximum < minimum
  ) {
    return null;
  }

  const publishedRange = minimum === maximum
    ? formatGrams(minimum)
    : `${minimum}–${formatGrams(maximum)}`;
  let status = "within";
  let difference = "";

  if (weight < minimum) {
    status = "below";
    difference = `${formatGrams(roundTenths(minimum - weight))} below the ${formatGrams(minimum)} published minimum`;
  } else if (weight > maximum) {
    status = "above";
    difference = `${formatGrams(roundTenths(weight - maximum))} over the ${formatGrams(maximum)} published maximum`;
  } else {
    difference = `within the ${publishedRange} published envelope`;
  }

  return {
    status,
    weightG: weight,
    minimumG: minimum,
    maximumG: maximum,
    label: `${formatGrams(weight)} catalog estimate · ${difference} · verify with a scale`,
  };
}
