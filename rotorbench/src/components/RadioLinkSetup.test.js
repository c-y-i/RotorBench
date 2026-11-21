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
});

test("can switch role and save a local plan", () => {
  render(<RadioLinkSetup />);
  fireEvent.click(screen.getByRole("button", { name: /receiver/i }));
  expect(screen.getByRole("button", { name: /receiver/i })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: /save plan/i }));
  expect(localStorage.getItem(RADIO_STORAGE_KEY)).toContain('"role":"rx"');
  expect(screen.getByRole("status")).toHaveTextContent(/No hardware settings were changed/i);
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
      selectedReceiver={{ id: "rx-elrs", name: "ELRS 2.4G RX", protocol: "CRSF" }}
    />,
  );
  expect(screen.getAllByText("ELRS 2.4G RX").length).toBeGreaterThan(0);
  expect(screen.getByText(/Settings match; RF is still unverified|Profile is not a hardware pass/))
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
