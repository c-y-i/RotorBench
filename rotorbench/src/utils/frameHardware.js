function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function position(value) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => Number.isFinite(Number(entry)))
      ? value.map(Number)
      : null;
}

export function getFrameServoHardware(frame) {
  const hardware = frame?.servoHardware;
  if (!hardware?.name) return null;
  const quantity = positiveNumber(hardware.quantity);
  const weight = positiveNumber(hardware.weight);
  const price = Number(hardware.price);
  const positions = Array.isArray(hardware.positionsMm)
    ? hardware.positionsMm.map(position).filter(Boolean)
    : [];
  if (!quantity || !weight || !Number.isFinite(price) || price < 0) return null;
  return {
    ...hardware,
    quantity,
    weight,
    price,
    positionsMm: positions,
  };
}

export function getFrameServoPositionsMm(frame) {
  return getFrameServoHardware(frame)?.positionsMm || [];
}

export function createFrameHardwareBomRows(frame) {
  const hardware = getFrameServoHardware(frame);
  if (!hardware) return [];
  return [{
    category: "Servos",
    quantity: hardware.quantity,
    product: hardware.name,
    unitPrice: Number(hardware.unitPrice) || 0,
    extendedPrice: hardware.price,
    sourceUrl: hardware.sourceUrl || "",
    dataStatus: hardware.sourceUrl
      ? "source-backed frame hardware package with estimated allocation/placement"
      : "estimated frame hardware package",
    estimatedFieldCount: Array.isArray(hardware.estimatedFields)
      ? hardware.estimatedFields.length
      : 0,
    catalogItem: true,
  }];
}
