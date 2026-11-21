import { fireEvent, render, screen, within } from "@testing-library/react";
import RadioLinkSetup from "./RadioLinkSetup";
import { DEFAULT_RADIO_CONFIG, RADIO_STORAGE_KEY } from "../data/radioProfiles";

beforeEach(() => {
  localStorage.clear();
});

test("renders the radio plan without claiming a hardware connection", () => {
  render(<RadioLinkSetup receiverName="ELRS 2.4G RX" />);
  expect(screen.getByRole("heading", { name: "Radio transceiver" })).toBeInTheDocument();
  expect(screen.getByText("Not hardware-verified")).toBeInTheDocument();
  expect(screen.getByText("ELRS 2.4G RX")).toBeInTheDocument();
  expect(screen.getByText(/Radio · .*checks? before deployment/i)).toBeInTheDocument();
  expect(screen.getByText("Std (1:64)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Summary" })).toBeInTheDocument();
});

test("jumps from the section strip to the radio plan summary", () => {
  render(<RadioLinkSetup />);

  fireEvent.click(screen.getByRole("button", { name: "Summary" }));

  expect(screen.getByRole("heading", { name: "Not hardware-verified" }))
    .toHaveFocus();
});

test("can switch role and save a local plan", () => {
  render(<RadioLinkSetup />);
  fireEvent.click(screen.getByRole("button", { name: /receiver/i }));
  expect(screen.getByRole("button", { name: /receiver/i })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: /save plan/i }));
  expect(localStorage.getItem(RADIO_STORAGE_KEY)).toContain('"role":"rx"');
  expect(screen.getByRole("status")).toHaveTextContent(/No hardware settings were changed/i);
});

test("Rev A3 separates native USB and host UART from the RX-to-FC path", () => {
  render(<RadioLinkSetup />);
  expect(screen.getByLabelText("Host transport")).toHaveValue("native-usb");
  fireEvent.click(screen.getByText("Endpoint checklist"));
  let checklist = screen.getByRole("list", {
    name: "Radio endpoint checklist",
  });
  expect(within(checklist).getByText("Use the target's native USB data port"))
    .toBeInTheDocument();
  expect(within(checklist).getByText(/Native USB ignores the logical host UART baud/i))
    .toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Host transport"), {
    target: { value: "uart" },
  });
  checklist = screen.getByRole("list", {
    name: "Radio endpoint checklist",
  });
  expect(within(checklist).getByText(/J3\.4\/GPIO44 host TX.*400000 baud/i))
    .toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /receiver/i }));
  checklist = screen.getByRole("list", {
    name: "Radio endpoint checklist",
  });
  expect(within(checklist).getByText(/receiver-to-flight-controller.*420000 baud/i))
    .toBeInTheDocument();
});

test("generic radio targets require transport verification", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "generic-elrs-24-tx" },
  });
  expect(screen.getByLabelText("Host transport")).toHaveValue("unspecified");
  fireEvent.click(screen.getByText("Endpoint checklist"));
  const checklist = screen.getByRole("list", {
    name: "Radio endpoint checklist",
  });
  expect(within(checklist).getByText("Verify the host transport"))
    .toBeInTheDocument();
  expect(screen.getByText("Verify target")).toBeInTheDocument();
});

test("Ranger Nano selects its documented module bay and regional power bounds", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "radiomaster-ranger-nano-elrs-24-tx" },
  });

  expect(screen.getByLabelText("Host transport")).toHaveValue("module-bay");
  expect(screen.getByLabelText("Handset bay")).toHaveValue("nano-8");
  expect(screen.getByLabelText("RF region")).toHaveValue("verify");
  expect(screen.getByRole("spinbutton", { name: /TX power \(dBm\)/i })).toHaveValue(20);
  expect(screen.getByText(/Official default: 20 dBm \/ 100 mW/i)).toBeInTheDocument();
  expect(screen.getByText(/FCC 30 dBm, CE 20 dBm/i)).toBeInTheDocument();
  expect(screen.getByText("Published max")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open manufacturer source" }))
    .toHaveAttribute("href", "https://radiomasterrc.com/products/ranger-nano-2-4ghz-elrs-module");

  fireEvent.click(screen.getByText("Endpoint checklist"));
  const checklist = screen.getByRole("list", {
    name: "Radio endpoint checklist",
  });
  expect(within(checklist).getByText("Verify the handset module-bay interface"))
    .toBeInTheDocument();
  expect(within(checklist).getByText(/Nano 8-pin: CRSF, GND, 5-12 V/i))
    .toBeInTheDocument();
  expect(within(checklist).queryByText(/baud/i)).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("RF region"), {
    target: { value: "ce" },
  });
  expect(screen.getByText(/Selected ceiling: 20 dBm/i)).toBeInTheDocument();
  expect(screen.getByText("CE · 20 dBm")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Handset bay"), {
    target: { value: "jr-standard-5" },
  });
  expect(screen.getByLabelText("Handset bay")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText(/requires Nano 8-pin bay/i)).toBeInTheDocument();
  expect(screen.getByText("JR standard 5-pin bay · mismatch")).toBeInTheDocument();
});

test("Ranger Micro uses its documented JR micro-bay profile", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "radiomaster-ranger-micro-elrs-24-tx" },
  });

  expect(screen.getByLabelText("Host transport")).toHaveValue("module-bay");
  expect(screen.getByLabelText("Handset bay")).toHaveValue("jr-micro-5");
  expect(screen.getByLabelText("RF region")).toHaveValue("verify");
  expect(screen.getByRole("spinbutton", { name: /TX power \(dBm\)/i })).toHaveValue(20);
  expect(screen.getByText(/JR-style micro module bay/i)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Endpoint checklist"));
  expect(screen.getByText(/JR-style micro 5-pin: NC, NC, 5-12 V, GND, CRSF/i))
    .toBeInTheDocument();
});

test("full-size Ranger can use either included JR or Nano adapter", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "radiomaster-ranger-elrs-24-tx" },
  });
  expect(screen.getByLabelText("Handset bay")).toHaveValue("jr-standard-5");
  fireEvent.change(screen.getByLabelText("Handset bay"), {
    target: { value: "nano-8" },
  });
  expect(screen.queryByText(/requires .* bay/i)).not.toBeInTheDocument();
  expect(screen.getByText("Nano 8-pin bay · supported")).toBeInTheDocument();
});

test("Bandit Nano exposes its sub-GHz packet range and Nano bay", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "radiomaster-bandit-nano-915-tx" },
  });

  expect(screen.getByLabelText("Handset bay")).toHaveValue("nano-8");
  expect(screen.getByLabelText("Packet rate")).toHaveValue("200");
  const powerInput = screen.getByRole("spinbutton", {
    name: /TX power \(dBm\)/i,
  });
  expect(powerInput).toHaveValue(null);
  expect(powerInput).toHaveAccessibleDescription(
    /Manufacturer default not published.*FCC 30 dBm/i,
  );
  expect(screen.getByText("Default power unpublished")).toBeInTheDocument();
  expect(screen.queryByText(/null dBm/i)).not.toBeInTheDocument();
  expect(screen.getByText(/915\/868 MHz \(Sub-G\)/i)).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /^25 Hz/ })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /^200 Hz/ })).toBeInTheDocument();
  expect(screen.getByText(/Nano 8-pin: CRSF, GND, 5-12 V/i))
    .toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Handset"), {
    target: { value: "radiomaster-pocket" },
  });
  expect(screen.getByLabelText("Handset bay")).toHaveAttribute(
    "aria-invalid",
    "false",
  );
  expect(screen.getByText(/RadioMaster Pocket · Nano 8-pin bay · supported/i))
    .toBeInTheDocument();
});

test("handset profiles expose source-backed bay mismatches before power", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "radiomaster-ranger-elrs-24-tx" },
  });
  expect(screen.getByLabelText("Handset")).toHaveValue("verify");
  expect(within(screen.getByLabelText("Handset")).getByRole("option", {
    name: "RadioMaster Pocket",
  })).toBeInTheDocument();
  expect(within(screen.getByLabelText("Handset")).getByRole("option", {
    name: "RadioMaster TX12 MKII",
  })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Handset"), {
    target: { value: "radiomaster-boxer" },
  });

  expect(screen.getByText(/official manual identifies the external module bay as JR compatible/i))
    .toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open manual" }))
    .toHaveAttribute("href", expect.stringContaining("BOXER_A1.9.pdf"));
  expect(screen.getByLabelText("Handset bay")).toHaveValue("jr-standard-5");
  expect(screen.getByLabelText("Handset bay")).toHaveAttribute("aria-invalid", "false");

  fireEvent.change(screen.getByLabelText("Handset bay"), {
    target: { value: "nano-8" },
  });
  expect(screen.getByLabelText("Handset bay")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getAllByText(
    /RadioMaster Boxer is documented with JR standard 5-pin bay/i,
  )).toHaveLength(2);
  expect(screen.getByText(/not the selected Nano 8-pin bay/i))
    .toBeInTheDocument();
  expect(screen.getByText(/RadioMaster Boxer · Nano 8-pin bay · mismatch/i))
    .toBeInTheDocument();
});

test("Pocket fills an unverified bay with its documented Nano interface", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "generic-elrs-24-tx" },
  });
  fireEvent.change(screen.getByLabelText("Host transport"), {
    target: { value: "module-bay" },
  });
  expect(screen.getByLabelText("Handset bay")).toHaveValue("verify");

  fireEvent.change(screen.getByLabelText("Handset"), {
    target: { value: "radiomaster-pocket" },
  });
  expect(screen.getByLabelText("Handset bay")).toHaveValue("nano-8");
  expect(screen.getByText(/external module bay as Nano compatible/i))
    .toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open manual" }))
    .toHaveAttribute("href", expect.stringContaining("Pocket_A1.8.pdf"));
});

test("binding material is not written to local storage", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Binding phrase"), {
    target: { value: "private-bench-phrase" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

  const saved = localStorage.getItem(RADIO_STORAGE_KEY);
  expect(saved).not.toContain("private-bench-phrase");
  expect(JSON.parse(saved)).toMatchObject({ bindingPhrase: "", uid: "" });
});

test("binding phrase shows the exact ExpressLRS-derived UID", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Binding phrase"), {
    target: { value: "local-test-phrase" },
  });
  expect(screen.getByText("Phrase-derived UID")).toBeInTheDocument();
  expect(screen.getByText("83:63:42:33:50:ab")).toBeInTheDocument();
  expect(screen.getByText("17/48 UTF-8 bytes")).toBeInTheDocument();
});

test("switching roles keeps the target able to represent that endpoint", () => {
  render(<RadioLinkSetup />);
  fireEvent.click(screen.getByRole("button", { name: /receiver/i }));
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "generic-elrs-24-rx" },
  });
  expect(screen.getByLabelText("Device")).toHaveValue("generic-elrs-24-rx");

  fireEvent.click(screen.getByRole("button", { name: /transmitter/i }));
  expect(screen.getByLabelText("Device")).toHaveValue("aerialkit-elrs-rev-a3");
});

test("competing binding identities explain the conflict and block saving", () => {
  render(<RadioLinkSetup />);
  fireEvent.change(screen.getByLabelText("Binding phrase"), {
    target: { value: "shared phrase" },
  });
  fireEvent.change(screen.getByLabelText("Direct UID"), {
    target: { value: "10:73:a1:1f:a8:0f" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

  expect(screen.getByRole("status")).toHaveTextContent(/either a binding phrase or a direct UID/i);
  expect(localStorage.getItem(RADIO_STORAGE_KEY)).toBeNull();
});

test("an overlong binding phrase is blocked before local storage", () => {
  render(<RadioLinkSetup />);
  const phrase = screen.getByLabelText("Binding phrase");
  fireEvent.change(phrase, { target: { value: "x".repeat(49) } });
  expect(phrase).toHaveAttribute("aria-invalid", "true");
  fireEvent.click(screen.getByRole("button", { name: /save plan/i }));
  expect(screen.getByRole("status")).toHaveTextContent(/48 UTF-8 bytes/i);
  expect(localStorage.getItem(RADIO_STORAGE_KEY)).toBeNull();
});

test("the selected build receiver is carried into the plan summary", () => {
  render(
    <RadioLinkSetup
      selectedReceiver={{
        id: "rx-xr4",
        name: "RadioMaster XR4 Gemini Xrossband",
        protocol: "CRSF",
        frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
      }}
    />,
  );
  expect(screen.getAllByText("RadioMaster XR4 Gemini Xrossband").length)
    .toBeGreaterThan(0);
  expect(screen.getByText("Receiver RF bands")).toBeInTheDocument();
  expect(screen.getByText("2.4 GHz / Sub-G 900 MHz")).toBeInTheDocument();
  expect(screen.getByText("Shared 2.4 GHz")).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Radio transceiver sections" }))
    .toBeInTheDocument();
  expect(screen.getByText(/Settings match; RF is still unverified|Profile is not a hardware pass/))
    .toBeInTheDocument();
});

test("a receiver with no shared transmitter band is called out in Setup", () => {
  render(
    <RadioLinkSetup
      selectedReceiver={{
        id: "rx-900",
        name: "900 MHz receiver",
        protocol: "CRSF",
        frequencyBands: ["Sub-G 900 MHz"],
      }}
    />,
  );
  expect(screen.getByText("No shared band")).toBeInTheDocument();
  expect(screen.getByText(/does not share a documented RF band/i))
    .toBeInTheDocument();
});

test("Aerial Kit routes expose only the eight channels the FC decodes", () => {
  render(<RadioLinkSetup channelLimit={8} />);
  expect(screen.getByText(/decodes CH1–8/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Beeper / AUX5 channel")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Velocity mode channel")).toBeInTheDocument();
  const overview = screen.getByRole("list", {
    name: "Channel assignment overview",
  });
  expect(within(overview).getByLabelText("Channel 5: Flight mode")).toHaveTextContent(
    "Flight mode",
  );
  expect(within(overview).getByLabelText("Channel 6: Arm")).toHaveTextContent("Arm");
  expect(within(overview).getByLabelText("Channel 7: open")).toHaveTextContent("Open");
  expect(within(overview).getAllByRole("listitem")).toHaveLength(8);
});

test("packet-type and MAVLink rules update dependent link settings", () => {
  render(<RadioLinkSetup />);
  expect(screen.getByText(/Standard resolves to 1:64 at 250 Hz/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Packet rate"), {
    target: { value: "100-full" },
  });
  expect(screen.getByLabelText("Switch mode")).toHaveValue("8ch-rate2");
  expect(screen.getByRole("option", { name: /Dynamic: Wide.*not available/i }))
    .toBeDisabled();
  expect(screen.getByText(/Standard resolves to 1:32 at 100 Hz Full/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Packet rate"), {
    target: { value: "250" },
  });
  expect(screen.getByLabelText("Switch mode")).toHaveValue("wide");
  expect(screen.getByRole("option", { name: /8ch Rate\/2.*not available/i }))
    .toBeDisabled();

  fireEvent.change(screen.getByLabelText("Link mode"), {
    target: { value: "mavlink" },
  });
  expect(screen.getByLabelText("Telemetry ratio")).toHaveValue("1:2");
  expect(screen.getByLabelText("Switch mode")).toHaveValue("hybrid");
  expect(screen.getByRole("option", { name: /Dynamic: Wide.*not available/i }))
    .toBeDisabled();
  expect(screen.getByRole("option", { name: /Dynamic: Hybrid/i })).toBeEnabled();

  fireEvent.change(screen.getByLabelText("Packet rate"), {
    target: { value: "100-full" },
  });
  expect(screen.getByLabelText("Switch mode")).toHaveValue("16ch-rate2");
  expect(screen.getByText(/MAVLink with 100 Full or 333 Full uses 16ch Rate\/2/i))
    .toBeInTheDocument();
});

test("generic ExpressLRS targets do not inherit the Rev A3 power table", () => {
  render(<RadioLinkSetup />);
  fireEvent.click(screen.getByRole("button", { name: /receiver/i }));
  fireEvent.change(screen.getByLabelText("Device"), {
    target: { value: "generic-elrs-24-rx" },
  });
  expect(screen.queryByRole("combobox", { name: "TX power" })).not.toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: /TX power \(dBm\)/i })).toHaveValue(-18);
  expect(screen.getByText(/No verified power menu is bundled/i)).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Dynamic power" })).not.toBeInTheDocument();
  expect(screen.getByText("Target-specific")).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: /GPIO4 role checked/i })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("spinbutton", { name: /TX power \(dBm\)/i }), {
    target: { value: "" },
  });
  expect(screen.getByText("Not set")).toBeInTheDocument();
  expect(screen.getByText(/finite TX power value/i)).toBeInTheDocument();
});

test("Rev A3 discloses the source-backed GPIO4 and LED role legend", () => {
  render(<RadioLinkSetup />);
  expect(screen.getByRole("heading", { name: "GPIO4 selects the RF role" }))
    .toBeInTheDocument();
  expect(screen.getByText("GPIO4 high")).toBeInTheDocument();
  expect(screen.getByText("One blue boot pulse; blue link states.")).toBeInTheDocument();
  expect(screen.getByText("Two green boot pulses; green link states.")).toBeInTheDocument();
  expect(screen.getByText(/printed label|first prototype label/i)).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /GPIO4 role checked/i })).toBeInTheDocument();
});

test("workspace FC roles replace velocity in the radio channel map", () => {
  render(
    <RadioLinkSetup
      channelLimit={8}
      controlRoles={["arm", "flightMode", "manual", "control", "systemId"]}
    />,
  );
  expect(screen.queryByLabelText("Velocity mode channel")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Manual override channel")).toBeInTheDocument();
  expect(screen.getByLabelText("Control mode channel")).toBeInTheDocument();
  expect(screen.getByLabelText("System ID channel")).toBeInTheDocument();
});

test("mission switch appears as an optional Aerial Kit radio role", () => {
  render(
    <RadioLinkSetup
      channelLimit={8}
      controlRoles={["arm", "flightMode", "velocity", "mission", "launch"]}
    />,
  );
  expect(screen.getByLabelText("Mission switch channel")).toBeInTheDocument();
  expect(screen.getByLabelText("Hand launch channel")).toBeInTheDocument();
  expect(screen.getByLabelText("Velocity mode channel")).toBeInTheDocument();
});

test("a parent-owned plan overrides stale standalone radio storage", () => {
  localStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify({
    ...DEFAULT_RADIO_CONFIG,
    role: "tx",
    channelMap: {
      ...DEFAULT_RADIO_CONFIG.channelMap,
      beeper: 9,
    },
  }));
  render(
    <RadioLinkSetup
      value={{
        ...DEFAULT_RADIO_CONFIG,
        channelMap: {
          ...DEFAULT_RADIO_CONFIG.channelMap,
          arm: 5,
          flightMode: 6,
          beeper: null,
        },
      }}
      channelLimit={8}
    />,
  );
  expect(screen.getByLabelText("Arm channel")).toHaveValue("5");
  expect(screen.queryByLabelText("Beeper / AUX5 channel")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Velocity mode channel")).toHaveValue("");
});
