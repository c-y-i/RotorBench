import {
  humanizeProvenanceField,
  humanizeProvenanceFields,
} from "./provenanceLabels";

test("turns catalog field keys into readable provenance labels", () => {
  expect(humanizeProvenanceField("currentDraw")).toBe("current draw");
  expect(humanizeProvenanceField("mounting_point")).toBe("mounting offset");
  expect(humanizeProvenanceField("stackMountPatternsMm")).toBe("stack mount pattern");
  expect(humanizeProvenanceField("batteryDeckDimensionsMm")).toBe(
    "battery deck footprint",
  );
  expect(humanizeProvenanceField("motor positions")).toBe("motor positions");
});

test("preserves field order and drops empty labels", () => {
  expect(humanizeProvenanceFields([
    "dimensionsMm",
    "",
    "dischargeProfile",
    null,
  ])).toEqual(["dimensions", "discharge curve"]);
  expect(humanizeProvenanceFields(null)).toEqual([]);
});
