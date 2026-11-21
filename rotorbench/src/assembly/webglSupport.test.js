import { supportsWebGL } from "./webglSupport";

test("detects a usable WebGL context without throwing", () => {
  expect(supportsWebGL({ getContext: (type) => type === "webgl2" ? {} : null }))
    .toBe(true);
  expect(supportsWebGL({ getContext: () => null })).toBe(false);
  expect(supportsWebGL({ getContext: () => { throw new Error("blocked"); } }))
    .toBe(false);
  expect(supportsWebGL(null)).toBe(false);
});
