import {
  createDefaultFlightControllerConfig,
  getBoardProfile,
} from "../data/flightControllerProfiles";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";
import { createHardwarePlanBriefing } from "./hardwarePlanBriefing";

test("creates a concise hardware briefing without binding material", () => {
  const fcPlan = createDefaultFlightControllerConfig();
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
      bindingPhrase: "do-not-export",
      uid: "aa:bb:cc:dd:ee:ff",
    },
    channelLimit: 8,
    controlRoles: ["arm", "flightMode", "velocity"],
    radioWarnings: ["Review the radio target."],
    mappingWarnings: ["Arm channels differ."],
  });

  expect(briefing.schema).toBe("rotorbench.hardware-plan-briefing.v1");
  expect(briefing.fcIssueCount).toBe(1);
  expect(briefing.radioIssueCount).toBe(2);
  expect(briefing.text).toContain("RotorBench hardware plan briefing");
  expect(briefing.text).toContain("Build: Bench quad");
  expect(briefing.text).toContain("Aerial Kit ELRS USB TX Rev A3");
  expect(briefing.text).toContain("- Arm: CH6");
  expect(briefing.text).toContain("- Flight mode: CH5");
  expect(briefing.text).toContain(
    "- Motor order: 1 RR CW, 2 FR CCW, 3 RL CCW, 4 FL CW",
  );
  expect(briefing.text).toContain("-18 dBm / 10 mW menu");
  expect(briefing.text).toContain("FC warning: Custom-board mapping requires review.");
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
});
