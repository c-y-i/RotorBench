import componentsData from "../data/components.json";
import { summarizePowerPath } from "./physicalCompatibility";
import { createFrameHardwareBomRows } from "./frameHardware";

const categories = [
  { key: "frameId", category: "frames", label: "Frame" },
  { key: "motorId", category: "motors", label: "Motor" },
  { key: "propellerId", category: "propellers", label: "Propeller" },
  { key: "batteryId", category: "batteries", label: "Battery" },
  { key: "escId", category: "escs", label: "ESC" },
  { key: "flightControllerId", category: "flight_controllers", label: "Flight controller" },
  { key: "receiverId", category: "receivers", label: "Receiver" },
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function createDerivedPowerRows(build) {
  const ids = build?.componentIds || {};
  const battery = componentsData.batteries?.find(
    (part) => part.id === ids.batteryId,
  );
  const esc = componentsData.escs?.find((part) => part.id === ids.escId);
  if (!battery || !esc) return [];
  const powerPath = summarizePowerPath(battery, esc);
  if (
    powerPath.displayState === "conflict"
    && powerPath.batteryConnector
    && powerPath.escConnector
  ) {
    return [{
      category: "Power adapter",
      quantity: 1,
      product: `${powerPath.batteryConnector}-to-${powerPath.escConnector} adapter`,
      unitPrice: 0,
      extendedPrice: 0,
      sourceUrl: "",
      dataStatus: "derived connector requirement; verify current rating and polarity",
      estimatedFieldCount: 0,
      catalogItem: false,
    }];
  }
  if (powerPath.displayState === "manual") {
    return [{
      category: "Power lead",
      quantity: 1,
      product: powerPath.batteryConnector
        ? `${powerPath.batteryConnector}-to-bare-wire power lead`
        : "Battery-to-bare-wire power lead",
      unitPrice: 0,
      extendedPrice: 0,
      sourceUrl: "",
      dataStatus: "derived solder-pad requirement; verify wire gauge, polarity, and connector",
      estimatedFieldCount: 0,
      catalogItem: false,
    }];
  }
  return [];
}

export function createBuildBomRows(build) {
  const ids = build?.componentIds || {};
  const frame = componentsData.frames?.find((part) => part.id === ids.frameId);
  const motorCount = Number(frame?.motorCount) || 4;
  return categories.flatMap(({ key, category, label }) => {
    const part = componentsData[category]?.find((candidate) => candidate.id === ids[key]);
    if (!part) {
      return [{
        category: label,
        quantity: 0,
        product: "Not selected",
        unitPrice: 0,
        extendedPrice: 0,
        sourceUrl: "",
        dataStatus: "missing selection",
        estimatedFieldCount: 0,
        catalogItem: true,
      }];
    }
    const quantity = ["motors", "propellers"].includes(category) ? motorCount : 1;
    const unitPrice = Number(part.price) || 0;
    return [{
      category: label,
      quantity,
      product: part.name,
      unitPrice,
      extendedPrice: Number((unitPrice * quantity).toFixed(2)),
      sourceUrl: part.sourceUrl || "",
      dataStatus: part.sourceUrl ? "source-backed" : "legacy",
      estimatedFieldCount: Array.isArray(part.estimatedFields)
        ? part.estimatedFields.length
        : 0,
      catalogItem: true,
    }];
  }).concat(
    createFrameHardwareBomRows(frame),
    createDerivedPowerRows(build),
  );
}

export function createBuildBomCsv(build) {
  const rows = createBuildBomRows(build);
  const catalogRows = rows.filter((row) => row.catalogItem);
  const derivedRows = rows.filter((row) => !row.catalogItem);
  const totalQuantity = catalogRows.reduce(
    (total, row) => total + row.quantity,
    0,
  );
  const totalPrice = catalogRows.reduce(
    (total, row) => total + row.extendedPrice,
    0,
  );
  const header = [
    "Category",
    "Quantity",
    "Product",
    "Catalog unit price USD",
    "Extended price USD",
    "Source URL",
    "Data status",
    "Estimated field count",
  ];
  return [
    header,
    ...rows.map((row) => [
      row.category,
      row.quantity,
      row.product,
      row.unitPrice.toFixed(2),
      row.extendedPrice.toFixed(2),
      row.sourceUrl,
      row.dataStatus,
      row.estimatedFieldCount,
    ]),
    [
      "Catalog total",
      totalQuantity,
      "",
      "",
      totalPrice.toFixed(2),
      "",
      derivedRows.length
        ? `catalog estimate; excludes ${derivedRows.length} derived requirement${
          derivedRows.length === 1 ? "" : "s"
        }`
        : "catalog estimate",
      "",
    ],
  ].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function buildBomFilename(name) {
  const slug = String(name || "rotorbench-build")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "rotorbench-build"}-bom.csv`;
}
