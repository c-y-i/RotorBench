import { CAMERA_VIEW_IDS, getCameraView } from "./cameraViews";

test("inspection views provide stable distinct camera angles", () => {
  expect(CAMERA_VIEW_IDS).toEqual([
    "orbit",
    "threeQuarter",
    "top",
    "side",
    "front",
  ]);
  expect(getCameraView("top")).toMatchObject({
    id: "top",
    autoRotate: false,
  });
  expect(getCameraView("side").alpha).not.toBe(getCameraView("front").alpha);
  expect(getCameraView("unknown").id).toBe("threeQuarter");
});
