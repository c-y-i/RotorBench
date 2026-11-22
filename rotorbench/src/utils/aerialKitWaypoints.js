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

export function buildAerialKitRouteSketch(inventory, currentPosition = null) {
  if (!inventory || typeof inventory !== "object") {
    throw new Error("Read a waypoint inventory before sketching route geometry.");
  }
  if (inventory.status !== "ok" || inventory.complete !== true) {
    return {
      status: "unavailable",
      reason: inventory.reason || inventory.status || "inventory-incomplete",
      points: [],
      bounds: null,
      projection: "local-equirectangular",
      northUp: true,
    };
  }
  const slots = inventory.slots;
  if (slots.length === 0) {
    return {
      status: "empty",
      reason: "no-waypoints",
      points: [],
      bounds: null,
      projection: "local-equirectangular",
      northUp: true,
    };
  }
  const latitudes = slots.map((slot) => slot.lat);
  const longitudes = slots.map((slot) => slot.lon);
  const bounds = {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLon: Math.min(...longitudes),
    maxLon: Math.max(...longitudes),
  };
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;
  const longitudeScale = Math.cos(radians(centerLat));
  const local = slots.map((slot) => ({
    index: slot.index,
    x: (slot.lon - centerLon) * longitudeScale,
    y: slot.lat - centerLat,
  }));
  const minX = Math.min(...local.map((point) => point.x));
  const maxX = Math.max(...local.map((point) => point.x));
  const minY = Math.min(...local.map((point) => point.y));
  const maxY = Math.max(...local.map((point) => point.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const drawableSpan = 76;
  const scale = Math.min(
    spanX > 0 ? drawableSpan / spanX : Number.POSITIVE_INFINITY,
    spanY > 0 ? drawableSpan / spanY : Number.POSITIVE_INFINITY,
  );
  const finiteScale = Number.isFinite(scale) ? scale : 1;
  const points = local.map((point) => ({
    index: point.index,
    x: 50 + (point.x - (minX + maxX) / 2) * finiteScale,
    y: 50 - (point.y - (minY + maxY) / 2) * finiteScale,
  }));
  const projectedPosition = currentPosition
    && Number.isFinite(currentPosition.lat)
    && Number.isFinite(currentPosition.lon)
    ? (() => {
        const x = 50
          + ((currentPosition.lon - centerLon) * longitudeScale
            - (minX + maxX) / 2) * finiteScale;
        const y = 50
          - (currentPosition.lat - centerLat
            - (minY + maxY) / 2) * finiteScale;
        return {
          lat: currentPosition.lat,
          lon: currentPosition.lon,
          x,
          y,
          insideExtent: x >= 2 && x <= 98 && y >= 2 && y <= 98,
        };
      })()
    : null;
  return {
    status: "ok",
    reason: null,
    points,
    bounds,
    currentPosition: projectedPosition,
    projection: "local-equirectangular",
    northUp: true,
  };
}

export function buildAerialKitMissionProximity({
  position = null,
  positionObservedAtMs = null,
  positionSource = null,
  mission = null,
  inventory = null,
  nowMs = Date.now(),
  staleAfterMs = 2000,
} = {}) {
  const ageMs = Number.isFinite(positionObservedAtMs)
    ? Math.max(0, nowMs - positionObservedAtMs)
    : null;
  const base = {
    evaluatedAtMs: nowMs,
    ageMs,
    positionSource,
    position: position
      ? {
          lat: Number.isFinite(position.lat) ? position.lat : null,
          lon: Number.isFinite(position.lon) ? position.lon : null,
          gpsFixType: Number.isInteger(position.gpsFixType)
            ? position.gpsFixType
            : null,
        }
      : null,
    waypoint: null,
    distanceM: null,
    boundaries: {
      horizontalGreatCircleOnly: true,
      terrainNotConsidered: true,
      crossTrackNotAssessed: true,
      flightReadinessClaimed: false,
    },
  };
  if (!mission || mission.active !== true || mission.index == null) {
    return {
      ...base,
      status: "unavailable",
      reason: "no-active-waypoint",
    };
  }
  if (
    !position
    || !Number.isFinite(position.lat)
    || !Number.isFinite(position.lon)
    || !Number.isInteger(position.gpsFixType)
  ) {
    return {
      ...base,
      status: "unavailable",
      reason: "position-missing",
    };
  }
  if (![2, 3, 4].includes(position.gpsFixType)) {
    return {
      ...base,
      status: "unavailable",
      reason: "position-fix-unavailable",
    };
  }
  if (ageMs == null || ageMs > staleAfterMs) {
    return {
      ...base,
      status: "unavailable",
      reason: "position-stale",
    };
  }
  if (!inventory || inventory.status !== "ok" || inventory.complete !== true) {
    return {
      ...base,
      status: "unavailable",
      reason: "waypoint-inventory-unavailable",
    };
  }
  const waypoint = inventory.slots.find(
    (slot) => slot.index === mission.index && slot.complete,
  );
  if (!waypoint) {
    return {
      ...base,
      status: "unavailable",
      reason: "active-waypoint-missing",
    };
  }
  return {
    ...base,
    status: "ok",
    reason: null,
    waypoint: {
      index: waypoint.index,
      lat: waypoint.lat,
      lon: waypoint.lon,
    },
    distanceM: greatCircleDistanceM(
      position.lat,
      position.lon,
      waypoint.lat,
      waypoint.lon,
    ),
  };
}

export function buildAerialKitMissionRouteProgress({
  proximity = null,
  inventory = null,
} = {}) {
  const base = {
    activeWaypointIndex: null,
    distanceToActiveM: null,
    plannedAfterActiveM: null,
    totalRemainingM: null,
    remainingLegs: [],
    remainingWaypointCount: null,
    boundaries: {
      geometricEstimate: true,
      terrainNotConsidered: true,
      flownProgressNotObserved: true,
      returnToHomeIncluded: false,
    },
  };
  if (!proximity || proximity.status !== "ok" || !Number.isFinite(proximity.distanceM)) {
    return {
      ...base,
      status: "unavailable",
      reason: "proximity-unavailable",
    };
  }
  if (!inventory || inventory.status !== "ok" || inventory.complete !== true) {
    return {
      ...base,
      status: "unavailable",
      reason: "waypoint-inventory-unavailable",
    };
  }
  const activeWaypointIndex = proximity.waypoint?.index;
  const activeSlotIndex = inventory.slots.findIndex(
    (slot) => slot.index === activeWaypointIndex && slot.complete,
  );
  if (activeSlotIndex < 0) {
    return {
      ...base,
      status: "unavailable",
      reason: "active-waypoint-missing",
    };
  }
  const remainingLegs = inventory.slots
    .slice(activeSlotIndex + 1)
    .map((slot, offset) => {
      const from = inventory.slots[activeSlotIndex + offset];
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
  const plannedAfterActiveM = remainingLegs.reduce(
    (total, leg) => total + leg.distanceM,
    0,
  );
  return {
    ...base,
    status: "ok",
    reason: null,
    activeWaypointIndex,
    distanceToActiveM: proximity.distanceM,
    plannedAfterActiveM,
    totalRemainingM: proximity.distanceM + plannedAfterActiveM,
    remainingLegs,
    remainingWaypointCount: remainingLegs.length,
  };
}
