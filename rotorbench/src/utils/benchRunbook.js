import { getRadioTarget } from "../data/radioProfiles";

export const BENCH_SOURCE = Object.freeze({
  commit: "a2f25c1",
  packageVersion: "0.4.6",
  firmware: "ExpressLRS 4.1.0",
  artifact: "9b48f01f522783d872b72f36c69c7171bcc851e2fcbfe5f60cb717efcb0331b4",
});

const FC_FAMILIES_WITH_CLI = new Set(["aerialkit", "betaflight"]);
const STAGE_KIND_LABELS = Object.freeze({
  "read-only": "Read-only",
  mutating: "Changes hardware",
  "live-input": "Live input · changes hardware",
});

function commandStage(id, title, kind, commands, note) {
  return {
    id,
    title,
    kind,
    kindLabel: STAGE_KIND_LABELS[kind] || kind,
    commands,
    note,
  };
}

export function buildBenchRunbook(fcPlan, radioPlan) {
  const target = getRadioTarget(radioPlan?.targetId);
  const revA3 = target.id === "aerialkit-elrs-rev-a3";
  const txBaud = revA3 ? target.serial.txBaud : target.serial.txBaud || "<TX_BAUD>";
  const rxBaud = revA3 ? target.serial.rxBaud : target.serial.rxBaud || "<RX_BAUD>";
  const fcCommands = [];
  const warnings = [
    "Replace the example serial ports with the devices shown by your host. USB numbering is not stable.",
    "Use a props-off aircraft and fit an antenna or RF load before powering either radio role.",
    "RotorBench prepared these commands only. It did not connect to, write, flash, or arm hardware.",
    "USB writes and a completed drive do not prove RF. RF remains NOT TESTED by RotorBench until it observes receiver RC and link statistics; imported files are reviewed separately and do not change hardware readiness.",
    "The optional live-input stage can arm through the transmitter. Keep the aircraft restrained with props off; a sent arm request is not proof that the flight controller armed.",
  ];

  if (FC_FAMILIES_WITH_CLI.has(fcPlan?.firmwareFamily)) {
    const fcProtocol = fcPlan?.firmwareFamily === "betaflight"
      ? "betaflight"
      : "akp";
    fcCommands.push(
      `ak fc status --port /dev/ttyACM0 --protocol ${fcProtocol} --json fc-status.json`,
      `ak fc preflight --port /dev/ttyACM0 --protocol ${fcProtocol} --json fc-preflight.json`,
      `ak fc rc --port /dev/ttyACM0 --protocol ${fcProtocol} --json fc-rc.json`,
    );
    if (fcPlan?.firmwareFamily === "aerialkit") {
      fcCommands.push("ak fc logs --port /dev/ttyACM0");
      fcCommands.push(
        "for name in airframe dshot_khz rc_protocol arm_channel mode_channel velocity_channel manual_channel ctrl_channel sysid_channel arm_hold_ms arm_max_tilt_deg throttle_low rc_timeout_ms rc_min rc_mid rc_max rc_deadband rth_enable; do ak fc get \"$name\" --port /dev/ttyACM0; done > fc-params.txt",
      );
    }
  } else {
    warnings.push(
      "The reviewed ak fc workflow covers Aerial Kit AKP and Betaflight MSP. It does not provide a verified INAV, PX4, or ArduPilot configuration path.",
    );
  }

  if (!revA3) {
    warnings.push(
      "The selected radio target is not the documented Rev A3 endpoint. Confirm its UART role, baud rate, and command support before running these examples.",
    );
  }

  const discovery = commandStage(
    "discovery",
    "Read identity before changing anything",
    "read-only",
    [
      "ls -l /dev/serial/by-id/",
      ...fcCommands,
      `ak radio status --port /dev/ttyACM1 --baud ${txBaud} --json tx-status.json`,
      `ak radio status --port /dev/ttyACM2 --baud ${rxBaud} --json rx-status.json`,
      `ak radio diag --port /dev/ttyACM1 --baud ${txBaud} --role tx --json tx-boot.json`,
      `ak radio diag --port /dev/ttyACM2 --baud ${rxBaud} --role rx --json rx-boot.json`,
    ],
    "Use stable paths, then read identity, machine-readable FC status/preflight/RC evidence, internal Aerial Kit log count, radio role, rate, and RF state.",
  );

  const identity = commandStage(
    "identity",
    "Read both endpoint identities",
    "read-only",
    [
      `ak radio uid --port /dev/ttyACM1 --baud ${txBaud} --role tx`,
      `ak radio uid --port /dev/ttyACM2 --baud ${rxBaud} --role rx`,
      `ak radio monitor --port /dev/ttyACM1 --baud ${txBaud} --duration 5 --json monitor.json`,
      `ak radio params --port /dev/ttyACM1 --baud ${txBaud} --role tx > tx-params.txt`,
    ],
    "Both endpoints must report the same non-zero UID before pairing.",
  );

  const channelArgs = [
    Number.isInteger(radioPlan?.channelMap?.arm)
      ? `--arm-channel ${radioPlan.channelMap.arm}`
      : null,
    Number.isInteger(radioPlan?.channelMap?.flightMode)
      ? `--mode-channel ${radioPlan.channelMap.flightMode}`
      : null,
    Number.isInteger(radioPlan?.channelMap?.velocity)
      ? `--velocity-channel ${radioPlan.channelMap.velocity}`
      : null,
  ].filter(Boolean);
  const txProfile = fcPlan?.firmwareFamily === "betaflight"
    ? "betaflight"
    : "aerial-kit";

  if (
    revA3 &&
    txProfile === "aerial-kit" &&
    !channelArgs.some((arg) => arg.startsWith("--velocity-channel"))
  ) {
    channelArgs.push("--velocity-channel 0");
  }

  const pairingCommands = revA3
    ? [[
        "ak radio pair",
        "--tx /dev/ttyACM1",
        "--rx /dev/ttyACM2",
        '--phrase "replace-with-your-phrase"',
        `--profile ${txProfile}`,
        ...channelArgs,
        "--duration 15",
        "--json pair.json",
        "--write",
      ].join(" ")]
    : [];

  const pairing = commandStage(
    "pairing",
    "Pair, transmit, and verify both endpoints",
    "mutating",
    pairingCommands,
    revA3
      ? "Pairs both UIDs and runs the TX/RX bench. Never exports staged binding material."
      : "Pairing is only qualified for Rev A3. Use the generic target's own firmware documentation.",
  );

  const liveInputQualified = revA3 && FC_FAMILIES_WITH_CLI.has(fcPlan?.firmwareFamily);
  const teleopCommand = liveInputQualified
    ? [
        "ak radio teleop",
        "--port /dev/ttyACM1",
        `--baud ${txBaud}`,
        `--profile ${txProfile}`,
        "--duration 30",
        "--hz 150",
        ...channelArgs,
        "--write",
        "--confirm-arm",
        "--json teleop.json",
      ].join(" ")
    : null;
  const liveInput = commandStage(
    "live-input",
    "Exercise bounded live input",
    "live-input",
    teleopCommand ? [teleopCommand] : [],
    liveInputQualified
      ? "Optional Rev A3 stage. Use a restrained aircraft with props off, antennas or RF loads fitted, and minimum RF power. Confirm the receiver is disarmed before Enter; hold throttle low through the arm hold and do not raise it. Use X panic first, then test Ctrl-C and timeout. Require stop_reason=panic and disarmed_at_end=true."
      : revA3
        ? "Live keyboard input is not generated for firmware families without a reviewed Aerial Kit bench path."
        : "Live keyboard input is only qualified for the documented Rev A3 endpoint. Use the selected target's own firmware and bench procedure.",
  );

  const stages = [discovery, identity, pairing, liveInput];
  const readOnlyStages = stages.filter(
    (stage) => stage.kind === "read-only" && stage.commands.length > 0,
  );
  const copyText = [
    "# RotorBench bench runbook — prepared commands, not executed by RotorBench",
    "# Props off. Antennas fitted. Replace example ports and the phrase placeholder.",
    ...stages.flatMap((stage) => [
      "",
      `# ${stage.title} (${stage.kindLabel})`,
      ...stage.commands,
    ]),
    "",
    "# RF PASS requires observed receiver RC and LINK_STATISTICS, not TX output alone.",
  ].join("\n");
  const readOnlyCopyText = [
    "# RotorBench read-only hardware discovery — prepared commands, not executed",
    "# Use stable paths from /dev/serial/by-id/. No write flags are included.",
    ...readOnlyStages.flatMap((stage) => [
      "",
      `# ${stage.title} (read-only)`,
      ...stage.commands,
    ]),
  ].join("\n");
  const evidenceRequirements = [
    "The pair command exits only after both endpoints read back the same non-zero six-byte UID.",
    "The two-board bench must report RF PASS with receiver RC frames and link statistics observed.",
    "USB writes, a matching UID, or TX-only drive output do not prove that RF reached the receiver.",
    "If using the optional live-input stage, panic, Ctrl-C, and timeout must each report disarmed_at_end=true; the panic run must also report stop_reason=panic.",
  ];

  return {
    source: BENCH_SOURCE,
    target: {
      id: target.id,
      name: target.name,
      txBaud,
      rxBaud,
    },
    expectedSettings: {
      targetId: target.id,
      packetRateMode: radioPlan?.packetRateMode || null,
      powerDbm: radioPlan?.powerDbm ?? null,
      telemetryRatio: radioPlan?.telemetryRatio || null,
      switchMode: radioPlan?.switchMode || null,
      linkMode: radioPlan?.linkMode || null,
      dynamicPower: radioPlan?.dynamicPower || null,
      modelMatch: Boolean(radioPlan?.modelMatch),
    },
    executedByRotorBench: false,
    warnings,
    stages,
    copyText,
    readOnlyCopyText,
    evidenceRequirements,
  };
}
