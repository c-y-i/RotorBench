import { render, screen } from "@testing-library/react";
import TwoDViewer from "./TwoDViewer";

jest.mock("@babylonjs/core", () => ({
  Engine: jest.fn(),
  Scene: jest.fn(),
  ArcRotateCamera: jest.fn(),
  Vector3: jest.fn(),
  HemisphericLight: jest.fn(),
  SceneLoader: { ImportMeshAsync: jest.fn() },
  TransformNode: jest.fn(),
}));
jest.mock("@babylonjs/loaders/glTF", () => ({}));

beforeEach(() => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("2D viewer reports unavailable WebGL instead of throwing", async () => {
  render(<TwoDViewer modelUrl="/sample.glb" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /2D preview unavailable/i,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(/needs WebGL/i);
});
