import { buildFlightControllerSummary } from "../data/flightControllerProfiles";
import {
  RADIO_DYNAMIC_POWER,
  RADIO_HOST_TRANSPORTS,
  RADIO_LINK_MODES,
  RADIO_PACKET_RATES,
  RADIO_POWER_LEVELS,
  RADIO_SWITCH_MODES,
  RADIO_TELEMETRY_RATIOS,
  getRadioChannelRoles,
  getRadioHostBay,
  getRadioPacketIntervalMs,
  getRadioRegulatoryLimit,
  getRadioRegulatoryOptions,
  getRadioReceiverBandCompatibility,
  getRadioTarget,
} from "../data/radioProfiles";

function selectedLabel(items, value, fallback = "Not set") {
  return items.find((item) => item.value === value)?.label || fallback;
}

export function createHardwarePlanBriefing({
  build = null,
  flightController = null,
  receiver = null,
  fcPlan,
  fcProfile,
  fcIssues = [],
  radioPlan,
  channelLimit = 16,
  controlRoles = null,
  radioWarnings = [],
  mappingWarnings = [],
  timingWarnings = [],
}) {
  const radioTarget = getRadioTarget(radioPlan?.targetId);
  const fcSummary = buildFlightControllerSummary(fcPlan, fcProfile);
  const channelRoles = getRadioChannelRoles(channelLimit, controlRoles);
  const mappedChannels = channelRoles.flatMap((role) => {
    const channel = radioPlan?.channelMap?.[role.key];
    return Number.isInteger(channel)
      ? [`- ${role.label}: CH${channel}`]
      : [];
  });
  const targetPower = getRadioTarget(radioPlan?.targetId)?.id === "aerialkit-elrs-rev-a3"
    ? RADIO_POWER_LEVELS.find((level) => level.value === radioPlan?.powerDbm)
    : null;
  const regulatoryOptions = getRadioRegulatoryOptions(radioTarget.id);
  const regulatoryLimit = getRadioRegulatoryLimit(
    radioTarget.id,
    radioPlan?.regulatoryRegion,
  );
  const receiverBands = getRadioReceiverBandCompatibility(
    radioTarget.id,
    receiver,
  );
  const controlIntervalMs = getRadioPacketIntervalMs(radioPlan?.packetRateMode);
  const reviewItems = [
    ...fcIssues.map((issue) => `- FC ${issue.severity || "review"}: ${issue.message}`),
    ...radioWarnings.map((warning) => `- Radio: ${warning}`),
    ...mappingWarnings.map((warning) => `- Mapping: ${warning}`),
    ...timingWarnings.map((warning) => `- Timing: ${warning}`),
  ];
  const lines = [
    "# RotorBench hardware plan briefing",
    "# Local plan only. This is not a hardware-verification record.",
    "",
    `Build: ${build?.name || "Standalone hardware plan"}`,
    `Flight controller: ${flightController?.name || "Not selected"}`,
    `Receiver: ${receiver?.name || "Not selected"}`,
    `Target: ${radioTarget.name}`,
    "",
    "## Flight-controller plan",
    ...fcSummary.map((line) => `- ${line}`),
    `- Review items: ${fcIssues.length}`,
    "",
    "## Radio plan",
    `- Role: ${radioPlan?.role?.toUpperCase() || "Not set"}`,
    `- Frequency/firmware: ${radioTarget.frequency || "Not catalogued"} · ${
      radioTarget.firmwareVersion || "Target-local"
    }`,
    ...(regulatoryOptions.length
      ? [
          `- RF region: ${regulatoryLimit
            ? `${regulatoryLimit.label} · ${regulatoryLimit.dbm} dBm / ${regulatoryLimit.mw} mW maximum`
            : "Verify FCC or CE module variant"}`,
        ]
      : []),
    `- Host transport: ${
      selectedLabel(RADIO_HOST_TRANSPORTS, radioPlan?.hostTransport)
    }`,
    ...(radioPlan?.hostTransport === "module-bay"
      ? [`- Handset bay: ${getRadioHostBay(radioPlan?.hostBay).label}`]
      : []),
    ...(receiver?.id
      ? [
          `- Receiver RF bands: ${
            receiverBands.receiverBandLabels.join(" / ") || "not catalogued"
          } · ${receiverBands.status}${
            receiverBands.sharedBandLabels.length
              ? ` · shared with TX: ${receiverBands.sharedBandLabels.join(" / ")}`
              : ""
          }`,
        ]
      : []),
    `- Packet rate: ${
      selectedLabel(RADIO_PACKET_RATES, radioPlan?.packetRateMode)
    }`,
    `- Control cadence: ${
      controlIntervalMs == null
        ? "Not estimated"
        : `${controlIntervalMs.toFixed(controlIntervalMs < 10 ? 1 : 0)} ms nominal`
    }`,
    `- RF setting: ${
      targetPower?.label || `${radioPlan?.powerDbm ?? "Not set"} dBm (target-local)`
    }`,
    `- Telemetry: ${
      selectedLabel(RADIO_TELEMETRY_RATIOS, radioPlan?.telemetryRatio)
    }`,
    `- Switch mode: ${
      selectedLabel(RADIO_SWITCH_MODES, radioPlan?.switchMode)
    }`,
    `- Link mode: ${
      selectedLabel(RADIO_LINK_MODES, radioPlan?.linkMode)
    }`,
    `- Dynamic power: ${
      selectedLabel(RADIO_DYNAMIC_POWER, radioPlan?.dynamicPower)
    }`,
    `- Model Match: ${radioPlan?.modelMatch ? "enabled" : "disabled"}`,
    "",
    "## Mapped channels",
    ...(mappedChannels.length ? mappedChannels : ["- No control channels mapped"]),
    "",
    "## Review items",
    ...(reviewItems.length ? reviewItems : ["- No local plan warnings"]),
    "",
    "## Boundary",
    "- RotorBench generated this from local plan state only.",
    "- Nothing was connected, written, flashed, calibrated, or armed.",
    "- RF remains unverified until receiver RC and link statistics are observed.",
    "- Binding phrase and direct UID are intentionally excluded.",
  ];

  return {
    schema: "rotorbench.hardware-plan-briefing.v1",
    text: lines.join("\n"),
    fcIssueCount: fcIssues.length,
    radioIssueCount:
      radioWarnings.length + mappingWarnings.length + timingWarnings.length,
  };
}
