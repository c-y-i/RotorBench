function finiteCoordinate(value) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildAerialKitWaypointInventory(parameters) {
  if (!Array.isArray(parameters)) {
    throw new Error("Read the parameter table before building a waypoint inventory.");
  }
  const values = new Map();
  parameters.forEach((parameter) => {
    if (parameter && typeof parameter.name === "string") {
      values.set(parameter.name, parameter.value);
    }
  });
  if (!values.has("wp_count")) {
    return {
      status: "unavailable",
      reason: "missing-count",
      count: null,
      slots: [],
      availableSlots: 0,
      complete: false,
    };
  }
  const count = finiteCoordinate(values.get("wp_count"));
  if (!Number.isInteger(count) || count < 0 || count > 255) {
    return {
      status: "incomplete",
      reason: "invalid-count",
      count: null,
      slots: [],
      availableSlots: 0,
      complete: false,
    };
  }

  const slotIndexes = new Set();
  values.forEach((_, name) => {
    const match = name.match(/^wp(\d+)_(?:lat|lon)$/);
    if (match) slotIndexes.add(Number(match[1]));
  });
  const availableSlots = slotIndexes.size
    ? Math.max(...slotIndexes) + 1
    : 0;
  const slots = Array.from({ length: count }, (_, index) => {
    const rawLat = values.get(`wp${index}_lat`);
    const rawLon = values.get(`wp${index}_lon`);
    const lat = finiteCoordinate(rawLat);
    const lon = finiteCoordinate(rawLon);
    const errors = [];
    if (lat == null) errors.push("missing or invalid latitude");
    else if (lat < -90 || lat > 90) errors.push("latitude outside -90 to 90");
    if (lon == null) errors.push("missing or invalid longitude");
    else if (lon < -180 || lon > 180) errors.push("longitude outside -180 to 180");
    return {
      index,
      lat,
      lon,
      rawLat: rawLat ?? null,
      rawLon: rawLon ?? null,
      complete: errors.length === 0,
      errors,
    };
  });
  const complete = count <= availableSlots
    && slots.every((slot) => slot.complete);
  return {
    status: complete ? "ok" : "incomplete",
    reason: complete
      ? null
      : count > availableSlots
        ? "count-exceeds-slots"
        : "invalid-coordinate",
    count,
    availableSlots,
    slots,
    complete,
  };
}

const EARTH_MEAN_RADIUS_M = 6371008.8;

function radians(degrees) {
  return degrees * Math.PI / 180;
}

export function greatCircleDistanceM(lat1, lon1, lat2, lon2) {
  const phi1 = radians(lat1);
  const phi2 = radians(lat2);
  const deltaPhi = radians(lat2 - lat1);
  const deltaLambda = radians(lon2 - lon1);
  const sinPhi = Math.sin(deltaPhi / 2);
  const sinLambda = Math.sin(deltaLambda / 2);
  const a = Math.min(
    1,
    Math.max(
      0,
      sinPhi * sinPhi
        + Math.cos(phi1) * Math.cos(phi2) * sinLambda * sinLambda,
    ),
  );
  const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_MEAN_RADIUS_M * angle;
}

export function buildAerialKitRouteSummary(inventory) {
  if (!inventory || typeof inventory !== "object") {
    throw new Error("Read a waypoint inventory before calculating route geometry.");
  }
  if (inventory.status !== "ok" || inventory.complete !== true) {
    return {
      status: "unavailable",
      reason: inventory.reason || inventory.status || "inventory-incomplete",
      waypointCount: inventory.count ?? null,
      legs: [],
      totalDistanceM: null,
      boundaries: {
        greatCircleEstimate: true,
        terrainNotConsidered: true,
        flownPathNotObserved: true,
        returnToHomeIncluded: false,
      },
    };
  }
  const slots = inventory.slots;
  const legs = slots.slice(1).map((slot, offset) => {
    const from = slots[offset];
    return {
      from: from.index,
      to: slot.index,
      distanceM: greatCircleDistanceM(
        from.lat,
        from.lon,
        slot.lat,
        slot.lon,
      ),
    };
  });
  const totalDistanceM = legs.reduce((total, leg) => total + leg.distanceM, 0);
  return {
    status: "ok",
    reason: null,
    waypointCount: slots.length,
    legs,
    totalDistanceM,
    boundaries: {
      greatCircleEstimate: true,
      terrainNotConsidered: true,
      flownPathNotObserved: true,
      returnToHomeIncluded: false,
    },
  };
}
