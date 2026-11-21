import { buildBenchRunbook } from "./benchRunbook";
import { createDefaultFlightControllerConfig } from "../data/flightControllerProfiles";
import { DEFAULT_RADIO_CONFIG } from "../data/radioProfiles";

test("Aerial Kit runbook uses read-only discovery and explicit mutations", () => {
  const runbook = buildBenchRunbook(
    createDefaultFlightControllerConfig(),
    {
      ...DEFAULT_RADIO_CONFIG,
      bindingPhrase: "do-not-copy-this-phrase",
      role: "rx",
    },
  );

  expect(runbook.executedByRotorBench).toBe(false);
  expect(runbook.source).toMatchObject({
    commit: "a2f25c1",
    packageVersion: "0.4.6",
  });
  expect(runbook.stages.find((stage) => stage.id === "discovery").commands)
    .toEqual(expect.arrayContaining([
      "ls -l /dev/serial/by-id/",
      "ak fc status --port /dev/ttyACM0 --protocol akp --json fc-status.json",
      "ak fc preflight --port /dev/ttyACM0 --protocol akp --json fc-preflight.json",
      "ak fc rc --port /dev/ttyACM0 --protocol akp --json fc-rc.json",
      "ak fc logs --port /dev/ttyACM0",
      "ak radio status --port /dev/ttyACM1 --baud 400000 --json tx-status.json",
      "ak radio status --port /dev/ttyACM2 --baud 420000 --json rx-status.json",
      "ak radio diag --port /dev/ttyACM1 --baud 400000 --role tx --json tx-boot.json",
      "ak radio diag --port /dev/ttyACM2 --baud 420000 --role rx --json rx-boot.json",
    ]));
  expect(runbook.stages.find((stage) => stage.id === "discovery").commands
    .some((command) => /for name in airframe .*ak fc get .* > fc-params\.txt/.test(command)))
    .toBe(true);
  expect(runbook.stages.find((stage) => stage.id === "discovery").commands
    .some((command) => command.includes("mission_channel")))
    .toBe(true);
  expect(runbook.stages.find((stage) => stage.id === "discovery").commands
    .some((command) => command.includes("launch_channel")))
    .toBe(true);
  expect(runbook.stages.find((stage) => stage.id === "discovery").commands
    .some((command) => command.includes("servo1_reverse")))
    .toBe(true);
  expect(runbook.stages.find((stage) => stage.id === "discovery").commands
    .some((command) => command.includes("servo2_travel_us")))
    .toBe(true);
  expect(runbook.stages.find((stage) => stage.id === "identity").commands)
    .not.toEqual(expect.arrayContaining([expect.stringContaining("ak radio capture")]));
  expect(runbook.stages.find((stage) => stage.id === "identity").commands)
    .toContain(
      "ak radio params --port /dev/ttyACM1 --baud 400000 --role tx > tx-params.txt",
    );
  expect(runbook.stages.find((stage) => stage.id === "pairing")).toMatchObject({
    kind: "mutating",
    commands: [
      expect.stringContaining("--write"),
    ],
  });
  expect(runbook.stages.find((stage) => stage.id === "live-input")).toMatchObject({
    kind: "live-input",
    commands: [
      expect.stringContaining("ak radio teleop"),
    ],
  });
  expect(runbook.stages.map((stage) => stage.id))
    .toEqual(["discovery", "identity", "pairing", "live-input"]);
  const pairingCommand = runbook.stages.find((stage) => stage.id === "pairing").commands[0];
  expect(pairingCommand).toContain("--arm-channel 6");
  expect(pairingCommand).toContain("--mode-channel 5");
  expect(pairingCommand).toContain("--velocity-channel 0");
  expect(pairingCommand).toContain("--profile aerial-kit");
  expect(pairingCommand).toContain("--write");
  expect(pairingCommand).not.toContain("ak radio drive");
  const liveInputCommand = runbook.stages
    .find((stage) => stage.id === "live-input").commands[0];
  expect(liveInputCommand).toContain("--port /dev/ttyACM1");
  expect(liveInputCommand).toContain("--baud 400000");
  expect(liveInputCommand).toContain("--profile aerial-kit");
  expect(liveInputCommand).toContain("--arm-channel 6");
  expect(liveInputCommand).toContain("--mode-channel 5");
  expect(liveInputCommand).toContain("--velocity-channel 0");
  expect(liveInputCommand).toContain("--write");
  expect(liveInputCommand).toContain("--confirm-arm");
  expect(runbook.copyText).not.toContain("ak radio capture");
  expect(runbook.copyText).toContain("ak radio teleop");
  expect(runbook.copyText).toContain("Live input · changes hardware");
  expect(runbook.readOnlyCopyText).not.toContain("--write");
  expect(runbook.readOnlyCopyText).not.toContain("ak radio teleop");
  expect(runbook.readOnlyCopyText).toContain("ak radio status");
  expect(runbook.evidenceRequirements.join(" ")).toMatch(/receiver RC frames and link statistics/i);
  expect(runbook.evidenceRequirements.join(" ")).toMatch(/disarmed_at_end=true/i);
  expect(runbook.warnings.join(" ")).toMatch(/sent arm request is not proof/i);
  expect(runbook.referenceValidation).toBeNull();
  expect(runbook.copyText).toContain("replace-with-your-phrase");
  expect(runbook.copyText).not.toContain("do-not-copy-this-phrase");
  expect(runbook.expectedSettings).toMatchObject({
    targetId: "aerialkit-elrs-rev-a3",
    packetRateMode: "250",
    powerDbm: -18,
    telemetryRatio: "std",
    switchMode: "wide",
    linkMode: "normal",
    dynamicPower: "off",
    modelMatch: false,
  });
});

test("runbook omits unsupported FC commands and warns for MAVLink families", () => {
  const runbook = buildBenchRunbook(
    {
      ...createDefaultFlightControllerConfig(),
      firmwareFamily: "ardupilot",
    },
    DEFAULT_RADIO_CONFIG,
  );

  expect(runbook.stages.find((stage) => stage.id === "discovery").commands)
    .not.toEqual(expect.arrayContaining([expect.stringMatching(/^ak fc/)]));
  expect(runbook.stages.find((stage) => stage.id === "live-input").commands)
    .toEqual([]);
  expect(runbook.warnings.join(" ")).toMatch(/does not provide a verified INAV, PX4, or ArduPilot configuration path/i);
});

test("Aerial Kit log reads are not generated for a Betaflight MSP board", () => {
  const runbook = buildBenchRunbook(
    {
      ...createDefaultFlightControllerConfig(),
      firmwareFamily: "betaflight",
    },
    DEFAULT_RADIO_CONFIG,
  );
  const commands = runbook.stages.find((stage) => stage.id === "discovery").commands;

  expect(commands).toContain(
    "ak fc status --port /dev/ttyACM0 --protocol betaflight --json fc-status.json",
  );
  expect(commands).toContain(
    "ak fc rc --port /dev/ttyACM0 --protocol betaflight --json fc-rc.json",
  );
  expect(commands).not.toContain("ak fc logs --port /dev/ttyACM0");
  expect(runbook.stages.find((stage) => stage.id === "live-input").commands[0])
    .toContain("--profile betaflight");
  expect(runbook.referenceValidation).toMatchObject({
    id: "aerialkit-rev-a3-betaflight-2026-11-20",
    date: "2026-11-20",
    source: "aerial-kit/docs/evidence/rev-a3-real-drone-bench-2026-11-20.md",
  });
  expect(runbook.referenceValidation.observed.join(" ")).toMatch(/AUX1.*channel 5/i);
  expect(runbook.referenceValidation.observed.join(" ")).toMatch(/AUX5.*channel 9/i);
  expect(runbook.referenceValidation.notTested).toEqual(expect.arrayContaining([
    "Flight behavior",
    "Range or attenuation",
    "Production readiness",
  ]));
  expect(runbook.copyText).toContain("# Reference validation only");
  expect(runbook.copyText).toContain("not evidence for the current RotorBench plan");
  expect(runbook.readOnlyCopyText).not.toContain("Reference validation only");
});

test("generic radio targets use baud placeholders instead of guessing", () => {
  const runbook = buildBenchRunbook(
    createDefaultFlightControllerConfig(),
    {
      ...DEFAULT_RADIO_CONFIG,
      targetId: "generic-elrs-24-tx",
    },
  );

  expect(runbook.target).toMatchObject({
    id: "generic-elrs-24-tx",
    txBaud: 400000,
    rxBaud: "<RX_BAUD>",
  });
  expect(runbook.stages.find((stage) => stage.id === "pairing")).toMatchObject({
    kind: "mutating",
    commands: [],
  });
  expect(runbook.stages.find((stage) => stage.id === "live-input")).toMatchObject({
    kind: "live-input",
    commands: [],
  });
  expect(runbook.warnings.join(" ")).toMatch(/not the documented Rev A3 endpoint/i);
  expect(runbook.referenceValidation).toBeNull();
});
