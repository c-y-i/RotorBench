import { fireEvent, render, screen } from "@testing-library/react";
import TwoDViewer, {
  buildSchematicExportMetadata,
  buildSchematicModel,
  createStandaloneSchematicSvg,
} from "./TwoDViewer";
import { getA11yViolations } from "../test/a11y";

const WING_ASSEMBLY_SPEC = {
  frame: {
    id: "frame-wing",
    name: "Twin wing",
    motorCount: 2,
    dimensionsMm: [730, 140, 645],
    motorPositionsMm: [[-230, 4.75, -240], [230, 4.75, -240]],
  },
  motor: {
    id: "motor-wing",
    name: "Wing motor",
    size: "1406",
  },
  propeller: {
    id: "prop-wing",
    name: "Wing propeller",
    size: 3.83,
    bladeCount: 2,
  },
  battery: {
    id: "battery-wing",
    name: "Wing pack",
    dimensionsMm: [75, 32, 36],
  },
};

test("renders the sample top view with four motors and three-blade propellers", async () => {
  const { container } = render(<TwoDViewer />);

  expect(screen.getByRole("img", {
    name: /Top view of sample assembly.*4 motors.*3-blade propellers.*props-out/i,
  })).toBeInTheDocument();
  expect(screen.getAllByText(/^M[1-4]/)).toHaveLength(4);
  expect(screen.getByText("X 155.6 mm")).toBeInTheDocument();
  expect(screen.getByText("Z 155.6 mm")).toBeInTheDocument();
  expect(screen.getByText("CG EST.")).toBeInTheDocument();
  expect(container.querySelector(".assembly-plan-cg")).toBeInTheDocument();
  expect(screen.getByText(/CG X 0 \/ Z -/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download SVG" })).toBeInTheDocument();
  await expect(getA11yViolations(container)).resolves.toEqual([]);
});

test("uses selected frame mounts and respects hidden component groups", () => {
  const { container, rerender } = render(
    <TwoDViewer
      assemblySpec={WING_ASSEMBLY_SPEC}
      propellerDirection="props-in"
    />,
  );

  expect(screen.getByRole("img", {
    name: /Top view of selected assembly.*2 motors.*2-blade propellers.*props-in/i,
  })).toBeInTheDocument();
  expect(screen.getByText("M1 CW")).toBeInTheDocument();
  expect(screen.getByText("M2 CCW")).toBeInTheDocument();
  expect(screen.getByText("X 460 mm")).toBeInTheDocument();
  expect(screen.getByText("BATT")).toBeInTheDocument();
  expect(screen.queryByText(/^Z /)).not.toBeInTheDocument();
  expect(container.querySelectorAll(".assembly-plan-propeller")).toHaveLength(2);
  expect(container.querySelector(".assembly-plan-frame")).toBeInTheDocument();
  expect(container.querySelector(".assembly-plan-battery")).toBeInTheDocument();

  rerender(
    <TwoDViewer
      assemblySpec={WING_ASSEMBLY_SPEC}
      propellerDirection="props-in"
      clearedComponents={["propeller", "motor", "frame", "battery"]}
    />,
  );
  expect(screen.queryByText("M1 CW")).not.toBeInTheDocument();
  expect(screen.queryByText(/^X /)).not.toBeInTheDocument();
  expect(container.querySelector(".assembly-plan-frame")).not.toBeInTheDocument();
  expect(container.querySelector(".assembly-plan-battery")).not.toBeInTheDocument();
  expect(container.querySelectorAll(".assembly-plan-propeller")).toHaveLength(0);
  expect(screen.getByRole("img", {
    name: /no propellers visible.*props-in/i,
  })).toBeInTheDocument();
});

test("plots a recorded measured CG separately from the estimate", () => {
  const { container } = render(
    <TwoDViewer
      assemblySpec={WING_ASSEMBLY_SPEC}
      measuredCg={[-4.5, -12.25]}
      propellerDirection="props-in"
    />,
  );

  expect(container.querySelector(".assembly-plan-measured-cg"))
    .toBeInTheDocument();
  expect(screen.getByText("MEASURED CG")).toBeInTheDocument();
  expect(screen.getByText(/measured X -4.5 \/ Z -12.2 mm/))
    .toBeInTheDocument();
  expect(screen.getByRole("img", {
    name: /Measured balance point X -4.5 millimetres, Z -12.2 millimetres/i,
  })).toBeInTheDocument();
});

test("exports a self-contained standalone SVG with source mount coordinates", () => {
  const model = buildSchematicModel({
    assemblySpec: WING_ASSEMBLY_SPEC,
    propellerDirection: "props-in",
    clearedComponents: ["battery"],
    measuredCg: [-4.5, -12.25],
  });
  const { container } = render(
    <TwoDViewer
      assemblySpec={WING_ASSEMBLY_SPEC}
      propellerDirection="props-in"
      clearedComponents={["battery"]}
      measuredCg={[-4.5, -12.25]}
    />,
  );
  const metadata = buildSchematicExportMetadata(
    model,
    "2026-11-22T08:00:00.000Z",
  );
  const exported = createStandaloneSchematicSvg(
    container.querySelector(".assembly-plan-view > svg"),
    metadata,
  );

  expect(exported).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(exported).toContain('width="100%"');
  expect(exported).toContain('height="100%"');
  expect(exported).toContain("<style>");
  expect(exported).toContain('"schema": "rotorbench.assembly-schematic.v1"');
  expect(exported).toContain('"source": "selected-build"');
  expect(exported).toContain('"units": "mm"');
  expect(exported).toContain('"front": "-Z"');
  expect(exported).toContain('"centerOfGravity"');
  expect(exported).toContain('"measuredCenterOfGravity"');
  expect(exported).toContain('"lateralMm": -4.5');
  expect(exported).toContain('"longitudinalMm": -12.25');
  expect(exported).toContain("MEASURED CG");
  expect(exported).toContain('"status": "unavailable"');
  expect(exported).toContain('"motorStationSource": "frame.motorPositionsMm"');
  expect(exported).toContain('"leftToRight": 460');
  expect(exported).toContain('"frontToRear": 0');
  expect(exported).toContain("X 460 mm");
  expect(exported).toContain('"x": -230');
  expect(exported).toContain('"y": 4.75');
  expect(exported).toContain('"z": -240');
  expect(exported).toContain('"propellerHandedness": "CW"');
  expect(exported).toContain('"propellerHandedness": "CCW"');
  expect(exported).toContain('"planningSchematic": true');
  expect(exported).toContain('"hardwareReady": false');
  expect(exported).toContain("NOT PRODUCT-EXACT OR HARDWARE-READY");
  expect(exported).not.toContain('"hardwareReady": true');
});

test("downloads the schematic without implying hardware verification", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const createObjectURL = jest.fn(() => "blob:assembly-schematic");
  const revokeObjectURL = jest.fn();
  let downloadedAnchor = null;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function captureAnchor() {
      downloadedAnchor = this;
    });

  try {
    render(<TwoDViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Download SVG" }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(downloadedAnchor.download).toMatch(
      /^rotorbench-assembly-schematic-\d+\.svg$/,
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:assembly-schematic");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Planning view only; not hardware verification.",
    );
  } finally {
    click.mockRestore();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  }
});
