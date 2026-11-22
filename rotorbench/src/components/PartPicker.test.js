import { fireEvent, render, screen, within } from "@testing-library/react";
import PartPicker from "./PartPicker";
import { getA11yViolations } from "../test/a11y";

const parts = [
  {
    id: "frame-a",
    name: "Frame A",
    size: 220,
    weight: 95,
    maxPropSize: 5,
    price: 55,
    sourceUrl: "https://example.com/frame-a",
    model: "frame-a.glb",
    modelStatus: "available",
  },
  {
    id: "frame-b",
    name: "Frame B",
    size: 230,
    weight: 110,
    maxPropSize: 4,
    price: 20,
    modelStatus: "not_available",
    estimatedFields: ["motor positions"],
  },
];

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  }
});

beforeEach(() => {
  localStorage.clear();
});

test("filters catalog results by compatibility and model availability", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => ({ ok: part.id === "frame-a", reason: "Wrong prop size" })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const results = screen.getByRole("listbox", { name: "Frame options" });
  expect(within(results).getAllByRole("option")).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: "No known conflict" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "3D ready" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();
});

test("wing frames expose wingspan and motor count instead of wheelbase copy", () => {
  render(
    <PartPicker
      category="frames"
      parts={[{
        id: "frame-heewing-t1-ranger",
        name: "HeeWing T1 Ranger 730mm Wing",
        size: 730,
        weight: 205,
        motorCount: 2,
        airframeShape: "wing",
        maxPropSize: 3.8,
        flightEnvelope: {
          takeoffWeightG: [350, 500],
          minSpeedKmh: 25,
          pnpThrustToWeightMax: 1.71,
        },
        price: 87.9,
        sourceUrl: "https://www.heewing.com/products/t1-ranger-kit",
      }]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Review." })}
      placeholder="Choose a frame"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  expect(screen.getByText(
    "730 mm wingspan · 2 motors · 205 g · up to 3.8\" props · min 25 km/h",
  )).toBeInTheDocument();
});

test("verified physical checks are distinct from missing fit data", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => part.id === "frame-a"
        ? { ok: true, verified: true, reason: "Stack pattern matches." }
        : { ok: true, verified: false, reason: "Stack pattern is not catalogued." }}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  expect(screen.getByText("Compatible and physically checked")).toBeInTheDocument();
  expect(screen.getByText("Stack pattern is not catalogued.")).toBeInTheDocument();
});

test("ESC metadata exposes a published planform without implying thickness", () => {
  render(
    <PartPicker
      category="escs"
      parts={[{
        id: "esc-planform",
        name: "Tekko32 F4 Metal 65A",
        currentRating: 65,
        burstCurrent: 75,
        weight: 15.8,
        planformMm: [43, 44],
        powerConnection: "solder-pads",
        price: 94.99,
        sourceUrl: "https://example.com/tekko",
      }]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Review." })}
      placeholder="Choose an ESC"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose an esc/i }));
  expect(screen.getByText(/43 × 44 mm footprint/)).toBeInTheDocument();
  expect(screen.queryByText(/mm thick/i)).not.toBeInTheDocument();
});

test("ESC metadata derives a footprint from a complete catalog envelope", () => {
  render(
    <PartPicker
      category="escs"
      parts={[{
        id: "esc-envelope",
        name: "Tekko32 F4 4-in-1 50A",
        currentRating: 50,
        burstCurrent: 60,
        weight: 13.8,
        dimensionsMm: [48, 6, 37],
        price: 62.99,
        sourceUrl: "https://example.com/tekko32-50a",
      }]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Review." })}
      placeholder="Choose an ESC"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose an esc/i }));
  expect(screen.getByText(/48 × 37 mm footprint/)).toBeInTheDocument();
});

test("recently selected parts are available through an explicit filter", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const results = () => screen.getByRole("listbox", { name: "Frame options" });
  fireEvent.click(within(results()).getByRole("option", { name: /Frame A/ }));
  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.click(screen.getByRole("button", { name: "Recent" }));

  expect(within(results()).getAllByRole("option")).toHaveLength(1);
  expect(screen.getByText(/Recent · Source-backed/)).toBeInTheDocument();
});

test("receiver metadata exposes published dual-band and telemetry details", () => {
  render(
    <PartPicker
      category="receivers"
      parts={[{
        id: "rx-xr4",
        name: "RadioMaster XR4 Gemini Xrossband",
        protocol: "CRSF",
        frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
        telemetryPowerMw: 100,
        channels: 16,
        weight: 1.7,
        price: 34.99,
        sourceUrl: "https://example.com/xr4",
        modelStatus: "not_available",
        estimatedFields: ["currentDraw", "channels", "mounting_point"],
      }]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({
        ok: true,
        verified: false,
        reason: "No known conflict; fit data is incomplete.",
      })}
      placeholder="Choose a receiver"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a receiver/i }));
  expect(screen.getByText(
    "CRSF · 2.4 GHz / Sub-G 900 MHz · 100 mW telemetry · 16 channels · 1.7 g",
  )).toBeInTheDocument();
  expect(screen.getByText(
    "Estimated: current draw · channels · mounting offset",
  )).toBeInTheDocument();
});

test("receiver metadata distinguishes PWM-capable outputs", () => {
  render(
    <PartPicker
      category="receivers"
      parts={[{
        id: "rx-er6",
        name: "RadioMaster ER6",
        protocol: "CRSF",
        frequencyBands: ["2.4 GHz"],
        channels: 16,
        pwmOutputs: 6,
        telemetryPowerMw: 100,
        weight: 14.5,
        price: 24.99,
        sourceUrl: "https://example.com/er6",
      }]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Review." })}
      placeholder="Choose a receiver"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a receiver/i }));
  expect(screen.getByText(/6 PWM outputs/)).toBeInTheDocument();
  expect(screen.getByText(/16 channels/)).toBeInTheDocument();
});

test("flight-controller metadata distinguishes documented and custom mappings", () => {
  render(
    <PartPicker
      category="flight_controllers"
      parts={[
        {
          id: "fc-speedybee-f405-v5",
          name: "SpeedyBee F405 V5",
          processor: "STM32F405",
          imu: "ICM42688P",
          weight: 8.1,
          price: 73.99,
        },
        {
          id: "fc-custom",
          name: "Custom controller",
          processor: "STM32F405",
          imu: "Unknown",
          weight: 9,
          price: 40,
        },
      ]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({
        ok: true,
        verified: false,
        reason: "Board map not checked.",
      })}
      placeholder="Choose a flight controller"
    />,
  );

  fireEvent.click(screen.getByRole("button", {
    name: /choose a flight controller/i,
  }));

  expect(screen.getByText(/Documented setup map/)).toBeInTheDocument();
  expect(screen.getByText(/Custom mapping required/)).toBeInTheDocument();
});

test("flight-controller firmware facets expose output budgets before selection", async () => {
  const { container } = render(
    <PartPicker
      category="flight_controllers"
      parts={[
        {
          id: "fc-adafruit-feather-f405",
          name: "Adafruit Feather STM32F405 Express",
          processor: "STM32F405",
          imu: "External LSM6DSO or BNO055",
          firmware: ["Aerial Kit"],
          weight: 6.2,
          dimensionsMm: [52, 10, 23],
          price: 39.95,
          sourceUrl: "https://www.adafruit.com/product/4382",
        },
        {
          id: "fc-speedybee-f405-v5",
          name: "SpeedyBee F405 V5",
          processor: "STM32F405",
          imu: "ICM42688P",
          firmware: ["Betaflight"],
          weight: 8.1,
          dimensionsMm: [39, 4.9, 39],
          price: 73.99,
          sourceUrl: "https://www.speedybee.com/speedybee-f405-v5-55a-stack/",
        },
      ]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({
        ok: true,
        verified: false,
        reason: "Board map selected.",
      })}
      placeholder="Choose a flight controller"
    />,
  );

  fireEvent.click(screen.getByRole("button", {
    name: /choose a flight controller/i,
  }));
  const facets = screen.getByRole("group", {
    name: "Filter flight controllers by firmware",
  });
  fireEvent.click(within(facets).getByRole("button", {
    name: "Aerial Kit",
  }));

  const results = screen.getByRole("listbox", {
    name: "Flight controller options",
  });
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Adafruit Feather STM32F405 Express"))
    .toBeInTheDocument();
  expect(within(results).getByText(/2 motors \/ 2 servos/)).toBeInTheDocument();
  expect(within(results).getByText(/Documented setup map/)).toBeInTheDocument();
  expect(await getA11yViolations(container)).toEqual([]);
});

test("receiver radio facets isolate bands and PWM-capable outputs", () => {
  render(
    <PartPicker
      category="receivers"
      parts={[
        {
          id: "rx-er6",
          name: "RadioMaster ER6",
          protocol: "CRSF",
          frequencyBands: ["2.4 GHz"],
          channels: 16,
          pwmOutputs: 6,
          weight: 14.5,
          price: 24.99,
          sourceUrl: "https://example.com/er6",
        },
        {
          id: "rx-bandit-br3",
          name: "RadioMaster Bandit BR3",
          protocol: "CRSF",
          frequencyBands: ["Sub-G 900 MHz"],
          channels: 16,
          weight: 5.5,
          price: 24.99,
          sourceUrl: "https://example.com/br3",
        },
        {
          id: "rx-xr4",
          name: "RadioMaster XR4",
          protocol: "CRSF",
          frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
          channels: 16,
          weight: 1.7,
          price: 34.99,
          sourceUrl: "https://example.com/xr4",
        },
      ]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Review." })}
      placeholder="Choose a receiver"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a receiver/i }));
  const facets = screen.getByRole("group", {
    name: "Filter receivers by radio",
  });
  const results = () => screen.getByRole("listbox", {
    name: "Receiver options",
  });

  fireEvent.click(within(facets).getByRole("button", {
    name: "PWM outputs",
  }));
  expect(within(results()).getAllByRole("option")).toHaveLength(1);
  expect(within(results()).getByText("RadioMaster ER6")).toBeInTheDocument();

  fireEvent.click(within(facets).getByRole("button", {
    name: "Dual band",
  }));
  expect(within(results()).getAllByRole("option")).toHaveLength(1);
  expect(within(results()).getByText("RadioMaster XR4")).toBeInTheDocument();
});

test("humanizes estimated field names for catalog review", () => {
  render(
    <PartPicker
      category="receivers"
      parts={[{
        id: "rx-fields",
        name: "Field disclosure receiver",
        protocol: "CRSF",
        frequencyBands: ["2.4 GHz"],
        channels: 16,
        weight: 2,
        price: 24.99,
        sourceUrl: "https://example.com/rx-fields",
        estimatedFields: ["dimensionsMm", "currentDraw", "mounting_point"],
      }]}
      value=""
      onChange={jest.fn()}
      placeholder="Choose a receiver"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a receiver/i }));
  expect(screen.getByText(
    "Estimated: dimensions · current draw · mounting offset",
  )).toBeInTheDocument();
});

test("verified-fit and conflict filters keep evidence states separate", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => part.id === "frame-a"
        ? { ok: true, verified: true, reason: "Stack pattern matches." }
        : { ok: false, verified: false, reason: "Propeller clearance conflict." }}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const results = screen.getByRole("listbox", { name: "Frame options" });
  fireEvent.click(screen.getByRole("button", { name: "Verified fit" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Review conflicts" }));
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame B")).toBeInTheDocument();
});

test("source-backed filtering excludes legacy catalog entries", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.click(screen.getByRole("button", { name: "Source-backed" }));
  const results = screen.getByRole("listbox", { name: "Frame options" });
  expect(within(results).getAllByRole("option")).toHaveLength(1);
  expect(within(results).getByText("Frame A")).toBeInTheDocument();
  expect(within(results).queryByText("Frame B")).not.toBeInTheDocument();
});

test("source review exposes manufacturer links without selecting a part", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.click(screen.getByRole("button", {
    name: "Review catalog sources: 1",
  }));

  const sources = screen.getByRole("region", { name: "Frame sources" });
  expect(within(sources).getByText("Frame A")).toBeInTheDocument();
  expect(within(sources).getByRole("link", {
    name: "Open product source for Frame A",
  })).toHaveAttribute("href", "https://example.com/frame-a");
  expect(screen.queryByRole("listbox", { name: "Frame options" }))
    .not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Recent" }));
  expect(within(sources).getByText("No references in this view")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {
    name: "Reset search and filters",
  }));
  expect(within(sources).getByText("Frame A")).toBeInTheDocument();
  const showParts = screen.getByRole("button", { name: "Show catalog parts" });
  expect(showParts).toBeEnabled();
  fireEvent.click(showParts);
  expect(screen.getByRole("listbox", { name: "Frame options" }))
    .toBeInTheDocument();
});

test("propeller options expose missing thrust data before selection", () => {
  render(
    <PartPicker
      category="propellers"
      parts={[
        {
          id: "prop-no-curve",
          name: "7-inch test prop",
          size: 7,
          pitch: 4,
          bladeCount: 3,
          weight: 7.9,
          price: 7.99,
          performanceDataStatus: "not_published",
          sourceUrl: "https://example.com/prop",
        },
      ]}
      value=""
      onChange={jest.fn()}
      placeholder="Choose a propeller"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a propeller/i }));
  expect(screen.getByText(/Thrust data unavailable/)).toBeInTheDocument();
});

test("motor options disclose prop-specific tests that are not normalized", () => {
  render(
    <PartPicker
      category="motors"
      parts={[
        {
          id: "motor-tested",
          name: "Test 2207",
          kv: 1980,
          size: "2207",
          voltage: { min: 18.5, max: 25.2 },
          weight: 31,
          price: 34.99,
          performanceDataStatus: "published_prop_specific_tables_not_normalized",
          sourceUrl: "https://example.com/motor",
        },
      ]}
      value=""
      onChange={jest.fn()}
      placeholder="Choose a motor"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a motor/i }));
  expect(screen.getByText(/Published prop tests not normalized/i))
    .toBeInTheDocument();
});

test("catalog options can be sorted by price without hiding conflicts", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={(part) => part.id === "frame-a"
        ? { ok: true, verified: true, reason: "Stack pattern matches." }
        : { ok: false, verified: false, reason: "Propeller clearance conflict." }}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.change(screen.getByLabelText("Sort catalog results"), {
    target: { value: "price" },
  });
  const options = within(screen.getByRole("listbox", { name: "Frame options" }))
    .getAllByRole("option");
  expect(options[0]).toHaveTextContent("Frame B");
  expect(options[1]).toHaveTextContent("Frame A");
});

test("evidence sort favors product sources and fewer estimated fields", () => {
  render(
    <PartPicker
      category="frames"
      parts={[
        {
          id: "frame-legacy",
          name: "Legacy Clean",
          size: 220,
          weight: 90,
          maxPropSize: 5,
          price: 20,
        },
        {
          id: "frame-source-estimated",
          name: "Source Estimated",
          size: 220,
          weight: 100,
          maxPropSize: 5,
          price: 30,
          sourceUrl: "https://example.com/estimated",
          estimatedFields: ["dimensionsMm"],
        },
        {
          id: "frame-source-clean",
          name: "Source Clean",
          size: 220,
          weight: 110,
          maxPropSize: 5,
          price: 40,
          sourceUrl: "https://example.com/clean",
        },
      ]}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.change(screen.getByLabelText("Sort catalog results"), {
    target: { value: "evidence" },
  });
  const options = within(screen.getByRole("listbox", { name: "Frame options" }))
    .getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    expect.stringContaining("Source Clean"),
    expect.stringContaining("Source Estimated"),
    expect.stringContaining("Legacy Clean"),
  ]);
});

test("empty catalog results can reset the search and filters in one action", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  fireEvent.change(screen.getByLabelText("Search frames"), {
    target: { value: "no-such-frame" },
  });
  expect(screen.getByText("No matching frames")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {
    name: "Reset search and filters",
  }));
  expect(within(screen.getByRole("listbox", { name: "Frame options" }))
    .getAllByRole("option")).toHaveLength(2);
});

test("keyboard arrows move through catalog options without tabbing through each one", () => {
  render(
    <PartPicker
      category="frames"
      parts={parts}
      value=""
      onChange={jest.fn()}
      compatibility={() => ({ ok: true, verified: false, reason: "Not catalogued." })}
      placeholder="Choose a frame"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /choose a frame/i }));
  const search = screen.getByLabelText("Search frames");
  const listbox = screen.getByRole("listbox", { name: "Frame options" });
  const options = within(listbox).getAllByRole("option");

  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(options[0]).toHaveFocus();
  fireEvent.keyDown(options[0], { key: "ArrowDown" });
  expect(options[1]).toHaveFocus();
  fireEvent.keyDown(options[1], { key: "Home" });
  expect(options[0]).toHaveFocus();
});
