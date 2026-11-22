import componentsData from "../data/components.json";
import {
  createFrameHardwareBomRows,
  getFrameServoHardware,
  getFrameServoPositionsMm,
} from "./frameHardware";

const t1 = componentsData.frames.find(
  (frame) => frame.id === "frame-heewing-t1-ranger",
);

test("T1 servo hardware carries source-backed weight, price, and placement", () => {
  expect(getFrameServoHardware(t1)).toMatchObject({
    name: "HeeWing FX-7G Digital Metal Gear Servo Set",
    quantity: 3,
    weight: 21,
    price: 30,
    cableLengthsMm: [180, 400],
    sourceUrl: "https://www.heewing.com/products/heewing-rc-7g-digital-metal-gear-servo",
  });
  expect(getFrameServoPositionsMm(t1)).toHaveLength(3);
  expect(createFrameHardwareBomRows(t1)).toEqual([
    expect.objectContaining({
      category: "Servos",
      quantity: 3,
      product: "HeeWing FX-7G Digital Metal Gear Servo Set",
      unitPrice: 10,
      extendedPrice: 30,
      catalogItem: true,
    }),
  ]);
});

test("frames without integrated servo hardware add no hidden BOM row", () => {
  expect(getFrameServoHardware(componentsData.frames[0])).toBeNull();
  expect(createFrameHardwareBomRows(componentsData.frames[0])).toEqual([]);
});
