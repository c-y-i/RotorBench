import {
  createDefaultFlightControllerConfig,
  getBoardProfile,
} from "../data/flightControllerProfiles";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";
import { createHardwarePlanBriefing } from "./hardwarePlanBriefing";

test("creates a concise hardware briefing without binding material", () => {
  const fcPlan = {
    ...createDefaultFlightControllerConfig(),
    rcSmooth: 1,
    rateFfdRoll: 0.012,
    rateFfRoll: 0.125,
    itermRelaxHz: 15,
    rateKdMaxRoll: 0.005,
    dMaxGain: 35,
    antiGravityGain: 80,
    antiGravityPGain: 120,
  };
  const fcProfile = getBoardProfile(fcPlan.profileId);
  const briefing = createHardwarePlanBriefing({
    build: { name: "Bench quad" },
    fcPlan,
    fcProfile,
    fcIssues: [{
      severity: "warning",
      message: "Custom-board mapping requires review.",
    }],
    radioPlan: {
      ...DEFAULT_RADIO_CONFIG,
      packetRateMode: "250",
      bindingPhrase: "do-not-export",
      uid: "aa:bb:cc:dd:ee:ff",
    },
    channelLimit: 8,
    controlRoles: ["arm", "flightMode", "velocity"],
    radioWarnings: ["Review the radio target."],
    mappingWarnings: ["Arm channels differ."],
    timingWarnings: ["FC timeout spans fewer than two frames."],
  });

  expect(briefing.schema).toBe("rotorbench.hardware-plan-briefing.v1");
  expect(briefing.fcIssueCount).toBe(1);
  expect(briefing.radioIssueCount).toBe(3);
  expect(briefing.text).toContain("RotorBench hardware plan briefing");
  expect(briefing.text).toContain("Build: Bench quad");
  expect(briefing.text).toContain("Aerial Kit ELRS USB TX Rev A3");
  expect(briefing.text).toContain("- Arm: CH6");
  expect(briefing.text).toContain("- Flight mode: CH5");
  expect(briefing.text).toContain(
    "- Motor order: 1 RR CW, 2 FR CCW, 3 RL CCW, 4 FL CW",
  );
  expect(briefing.text).toContain("propeller plan props-in");
  expect(briefing.text).toContain("-18 dBm / 10 mW menu");
  expect(briefing.text).toContain("FC warning: Custom-board mapping requires review.");
  expect(briefing.text).toContain("Timing: FC timeout spans fewer than two frames.");
  expect(briefing.text).toContain("- Control cadence: 4.0 ms nominal");
  expect(briefing.text).toContain(
    "- RC smoothing: enabled from nominal radio packet rate 250 Hz (250), requested cutoff 93.8 Hz, factor 30",
  );
  expect(briefing.text).toContain(
    "- Stick feed-forward: Roll 0.012; smooth factor 65, nominal 0.35 PT1 coefficient at 250 Hz, jitter factor 7, boost 15, max-rate limit 90",
  );
  expect(briefing.text).toContain(
    "- PID response: static feed-forward Roll 0.125; I-term relax setpoint low-pass 15 Hz",
  );
  expect(briefing.text).toContain(
    "- D response: D_MAX active Roll 0.0025->0.005; gyro boost 35, stick advance 35",
  );
  expect(briefing.text).toContain(
    "- Anti-gravity: enabled, gain 80, throttle-speed cutoff 5 Hz, P share 120% on roll and pitch only",
  );
  expect(briefing.text).toContain("Nothing was connected, written, flashed, calibrated, or armed.");
  expect(briefing.text).not.toContain("do-not-export");
  expect(briefing.text).not.toContain("aa:bb:cc:dd:ee:ff");
});

test("keeps generic target power target-local", () => {
  const fcPlan = createDefaultFlightControllerConfig();
  const fcProfile = getBoardProfile(fcPlan.profileId);
  const briefing = createHardwarePlanBriefing({
    fcPlan,
    fcProfile,
    radioPlan: {
      ...DEFAULT_RADIO_CONFIG,
      targetId: "generic-elrs-24-tx",
      role: "tx",
      powerDbm: 13,
    },
  });

  expect(briefing.text).toContain("13 dBm (target-local)");
  expect(briefing.text).toContain("No local plan warnings");
});

test("briefs the selected radio regulatory ceiling", () => {
  const fcPlan = createDefaultFlightControllerConfig();
  const fcProfile = getBoardProfile(fcPlan.profileId);
  const briefing = createHardwarePlanBriefing({
    fcPlan,
    fcProfile,
    receiver: {
      id: "rx-xr4",
      name: "RadioMaster XR4 Gemini Xrossband",
      frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
    },
    radioPlan: {
      ...DEFAULT_RADIO_CONFIG,
      targetId: "radiomaster-ranger-nano-elrs-24-tx",
      role: "tx",
      hostTransport: "module-bay",
      hostBay: "nano-8",
      powerDbm: 20,
      regulatoryRegion: "fcc",
    },
  });

  expect(briefing.text).toContain(
    "- RF region: FCC · 30 dBm / 1000 mW maximum",
  );
  expect(briefing.text).toContain("- Handset bay: Nano 8-pin bay");
  expect(briefing.text).toContain(
    "- Receiver RF bands: 2.4 GHz / Sub-G 900 MHz · compatible · shared with TX: 2.4 GHz",
  );
});

test("carries the documented serial allocation into the briefing", () => {
  const fcPlan = createDefaultFlightControllerConfig({
    id: "fc-speedybee-f405-v4",
    name: "SpeedyBee F405 V4",
    processor: "STM32F405",
    imu: "ICM42688P",
    firmware: ["Betaflight"],
  });
  const fcProfile = getBoardProfile(fcPlan.profileId);
  const briefing = createHardwarePlanBriefing({
    fcPlan,
    fcProfile,
    radioPlan: DEFAULT_RADIO_CONFIG,
  });

  expect(briefing.text).toContain(
    "- Serial allocation: UART1 DJI / VTX; UART2 Receiver (Receiver); UART3 User serial; UART4 Bluetooth tuning; UART5 ESC telemetry; UART6 GPS (GPS)",
  );
});
