import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BenchEvidenceReview from "./BenchEvidenceReview";
import {
  appendBenchEvidenceAttachmentHistory,
  createBenchEvidenceScope,
} from "../utils/benchEvidenceAttachment";

const pairEvidence = {
  expected_uid: "10:73:A1:1F:A8:0F",
  tx_uid: "10:73:A1:1F:A8:0F",
  rx_uid: "10:73:A1:1F:A8:0F",
  uids_match: true,
  overall: "PASS",
  bench: {
    overall: "PASS",
    requirements: {
      rx_rc_capture: "PASS",
      tx_link_statistics: "PASS",
      rx_link_statistics: "PASS",
      rf_link: "PASS",
    },
    tx: {
      frames_sent: 2250,
      actual_hz: 150,
      disarmed_at_end: true,
      telemetry: {},
    },
    rx: {
      frames: 120,
      rc_frames: 96,
      rc_cadence_hz: 150,
      link_statistics_frames: 8,
      channels: Array.from({ length: 16 }, () => 992),
      missed_intervals: 0,
      crc_errors: 0,
      resyncs: 0,
      framing_errors: 0,
    },
  },
};

const txBoot = {
  logical_baud: 400000,
  fields: {
    role: "tx",
    uid: "10:73:A1:1F:A8:0F",
    seed: "0xa80fa80d",
    domain: "ISM_2400",
    rate_enum: "27",
    fhss0: "42",
    freq: "2400000000",
    conn: "3",
    txen: "0",
    rxen: "0",
  },
};

const rxBoot = {
  logical_baud: 420000,
  fields: {
    role: "rx",
    uid: "10:73:A1:1F:A8:0F",
    seed: "0xa80fa80d",
    domain: "ISM_2400",
    rate_enum: "5",
    fhss0: "42",
    freq: "2400000000",
    conn: "2",
    txen: "0",
    rxen: "1",
  },
};

const txParametersText = [
  "  1 Packet Rate      3                text_selection",
  "  2 Telem Ratio      0                text_selection",
  "  3 Switch Mode      0                text_selection",
  "  4 Link Mode        0                text_selection",
  "  5 Max Power        0                text_selection",
  "  6 Dynamic          0                text_selection",
  "  7 Model Match      0                text_selection",
].join("\n");

const fcStatusEvidence = {
  identity: "protocol=akp product=aerialkit-f405 firmware=46 parameters=46 changed=0",
  state: {
    armed: 0,
    link_live: 1,
    roll_deg: 0.1,
    pitch_deg: -0.2,
    yaw_deg: 0.3,
    gps_fix_type: 3,
    gps_satellites: 9,
    motors: [0, 0, 0, 0],
  },
};

const fcPreflightText = [
  "console verdict=1 console attached to the board's own port",
  "clock verdict=1 clock on the crystal",
  "tick verdict=1 tick advanced after 41250 spins",
  "outputs verdict=1 outputs: 4 motors, 2 servos",
  "configuration verdict=1 saved configuration: none stored",
  "fault verdict=1 no fault recorded since power on",
  "imu verdict=2 imu: icm42688p",
  "receiver verdict=2 receiver: 8412 bytes, 401 frames",
  "arm verdict=2 arm: ready",
].join("\n");

const radioStatusEvidence = {
  path: "/dev/ttyACM0",
  usb_serial: "SER123",
  logical_baud: 400000,
  role: "tx",
  product: "Aerial Kit Rev A3",
  origin: 238,
  destination: 234,
  firmware_version: 262400,
  firmware_string: "4.1.0",
  parameter_count: 12,
  parameter_version: 0,
  device_serial: 305419896,
  hardware_version: 1,
};

function evidenceFile(value, name = "pair.json") {
  return {
    name,
    text: async () => JSON.stringify(value),
  };
}

function observationEvidence(role, name) {
  return evidenceFile({
    schema: "rotorbench.crsf-observation.v1",
    generatedAt: "2026-11-20T12:00:15.000Z",
    status: "frames-observed",
    baudRate: role === "tx" ? 400000 : 420000,
    expectedBaud: role === "tx" ? 400000 : 420000,
    captureStatus: "stopped",
    captureStartedAt: "2026-11-20T12:00:00.000Z",
    captureEndedAt: "2026-11-20T12:00:15.000Z",
    plan: {
      role,
      targetName: "Aerial Kit ELRS USB TX Rev A3",
    },
    channelsObserved: role === "rx",
    linkStatisticsObserved: true,
    lastFrameAgeMs: 300,
    rcCadenceMs: role === "rx" ? 6.67 : null,
    diagnostics: {
      validFrames: 20,
      crcErrors: 0,
      resyncs: 0,
      framingErrors: 0,
      bytesReceived: 800,
      pendingBytes: 0,
    },
    channels: role === "rx" ? Array.from({ length: 16 }, () => 992) : null,
    link: {
      uplinkLinkQuality: 98,
      downlinkLinkQuality: 92,
    },
  }, name);
}

function textEvidenceFile(value, name) {
  return {
    name,
    text: async () => value,
  };
}

beforeEach(() => {
  localStorage.clear();
});

test("reviews a complete pair file without claiming RotorBench observed hardware", async () => {
  render(
    <BenchEvidenceReview expectedUid="10:73:a1:1f:a8:0f" />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile(pairEvidence),
  );

  expect(await screen.findByText("Required RF gates are present in the file"))
    .toBeInTheDocument();
  expect(screen.getByText(/authenticity not independently verified/i))
    .toBeInTheDocument();
  expect(screen.getByText(/2250/)).toBeInTheDocument();
  expect(screen.getByText(/96/)).toBeInTheDocument();
  expect(screen.getAllByText("Pass in file")).toHaveLength(8);
  expect(screen.getByRole("status")).toHaveTextContent(/not yet attached/i);
  expect(screen.getByText(/Only a sanitized summary is saved/i)).toBeInTheDocument();
});

test("a plan UID mismatch is shown as a failed check", async () => {
  render(<BenchEvidenceReview expectedUid="aa:bb:cc:dd:ee:ff" />);

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile(pairEvidence),
  );

  await waitFor(() => {
    expect(screen.getByText(/do not match the staged plan UID/i)).toBeInTheDocument();
  });
  expect(screen.getByText(/required evidence is incomplete/i)).toBeInTheDocument();
  expect(screen.getByText("Fail in file")).toBeInTheDocument();
});

test("correlates one report with TX and RX boot diagnostics", async () => {
  render(
    <BenchEvidenceReview
      expectedUid="10:73:a1:1f:a8:0f"
      expectedBauds={{ tx: 400000, rx: 420000 }}
      expectedSettings={{
        packetRateMode: "250",
        powerDbm: -18,
        telemetryRatio: "std",
        switchMode: "wide",
        linkMode: "normal",
        dynamicPower: "off",
        modelMatch: false,
      }}
      targetName="Aerial Kit ELRS USB TX Rev A3"
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile(pairEvidence, "pair.json"),
      evidenceFile(txBoot, "tx-boot.json"),
      evidenceFile(rxBoot, "rx-boot.json"),
      textEvidenceFile(txParametersText, "tx-params.txt"),
    ],
  );

  expect(await screen.findByText("RF gates, diagnostics, and module settings correlate"))
    .toBeInTheDocument();
  expect(screen.getByText(/Both endpoint boot diagnostics agree/i))
    .toBeInTheDocument();
  expect(screen.getByText(/The TX module settings match the current plan/i))
    .toBeInTheDocument();
  expect(screen.getByText(/4 evidence files reviewed locally/i)).toBeInTheDocument();
  expect(screen.getByText("TX boot report")).toBeInTheDocument();
  expect(screen.getByText("RX boot report")).toBeInTheDocument();
  expect(screen.getAllByText("Module packet rate")).toHaveLength(2);
  expect(screen.getAllByText("Module max power")).toHaveLength(2);
  expect(screen.getByText(/TX boot diagnostics/i)).toBeInTheDocument();
  expect(screen.getByText(/TX\/RX boot identity correlation/i)).toBeInTheDocument();
  expect(screen.getByText(/FHSS seed correlation/i)).toBeInTheDocument();
  expect(screen.getByText(/FHSS initial channel/i)).toBeInTheDocument();
  expect(screen.getByText("Boot frequency")).toBeInTheDocument();
  expect(screen.getByText("2.400 GHz")).toBeInTheDocument();
});

test("downloads a sanitized portable review summary", async () => {
  render(<BenchEvidenceReview expectedUid="10:73:a1:1f:a8:0f" />);
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile(pairEvidence),
  );
  await screen.findByText("Required RF gates are present in the file");

  const createObjectURL = jest.fn(() => "blob:bench-review");
  const revokeObjectURL = jest.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  await userEvent.click(screen.getByRole("button", { name: "Download review" }));

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect(click).toHaveBeenCalledTimes(1);
  const exportedBlob = createObjectURL.mock.calls[0][0];
  const exportedText = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(exportedBlob);
  });
  expect(exportedText).not.toMatch(/10:73:a1:1f:a8:0f/i);
  expect(exportedText).toContain("[UID redacted]");
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:bench-review");
  expect(screen.getByRole("status")).toHaveTextContent(
    /without raw files, serial paths, or direct binding identifiers/i,
  );
  click.mockRestore();
});

test("explicitly attaches a sanitized evidence summary to the current build", async () => {
  const evidenceScope = createBenchEvidenceScope({
    build: { componentIds: { flightControllerId: "fc-a", receiverId: "rx-a" } },
    radioPlan: { planVersion: 3, targetId: "aerialkit-elrs-rev-a3" },
  });
  render(
    <BenchEvidenceReview
      buildId="evidence-build"
      expectedUid="10:73:a1:1f:a8:0f"
      evidenceScope={evidenceScope}
    />,
  );
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile(pairEvidence),
  );
  await screen.findByText("Required RF gates are present in the file");

  await userEvent.click(screen.getByRole("button", { name: "Attach to build" }));

  expect(screen.getByRole("region", { name: "Evidence attached to this build" }))
    .toHaveTextContent("Evidence attached to this build");
  expect(screen.getByRole("button", { name: "Attached to build" })).toBeDisabled();
  const stored = JSON.parse(
    localStorage.getItem("rotorbench:bench-evidence:evidence-build:v1"),
  );
  expect(stored).toMatchObject({
    schema: "rotorbench.build-bench-evidence.v1",
    rfEvidenceComplete: true,
    hardwareVerifiedByRotorBench: false,
    scope: evidenceScope,
  });
  expect(screen.getByRole("status")).toHaveTextContent(/Hardware remains unverified/i);
});

test("shows and removes a previously attached evidence summary", async () => {
  const evidenceScope = createBenchEvidenceScope({
    build: { componentIds: { flightControllerId: "fc-a", receiverId: "rx-a" } },
    radioPlan: { planVersion: 3, targetId: "aerialkit-elrs-rev-a3" },
  });
  localStorage.setItem(
    "rotorbench:bench-evidence:evidence-build:v1",
    JSON.stringify({
      schema: "rotorbench.build-bench-evidence.v1",
      attachedAt: "2026-11-20T12:00:00.000Z",
      rfReportedPass: true,
      rfEvidenceComplete: true,
      diagnosticsComplete: true,
      settingsComplete: true,
      hardwareVerifiedByRotorBench: false,
      checkCounts: { pass: 8, fail: 0, unverified: 2 },
      failedChecks: [],
      unverifiedChecks: ["Data freshness"],
      scope: evidenceScope,
    }),
  );
  render(
    <BenchEvidenceReview
      buildId="evidence-build"
      evidenceScope={evidenceScope}
    />,
  );

  expect(screen.getByRole("region", { name: "Evidence attached to this build" }))
    .toHaveTextContent("Imported evidence correlated");
  expect(screen.getByText(/8 pass · 0 fail · 2 open/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Remove from build" }));

  expect(
    localStorage.getItem("rotorbench:bench-evidence:evidence-build:v1"),
  ).toBeNull();
  expect(screen.queryByRole("region", { name: "Evidence attached to this build" }))
    .not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(/not retained/i);
});

test("shows local evidence history and compares it with the current run", async () => {
  const evidenceScope = createBenchEvidenceScope({
    build: { componentIds: { flightControllerId: "fc-a", receiverId: "rx-a" } },
    radioPlan: { planVersion: 3, targetId: "aerialkit-elrs-rev-a3" },
  });
  const current = {
    schema: "rotorbench.build-bench-evidence.v1",
    attachedAt: "2026-11-20T12:10:00.000Z",
    kind: "pair",
    fileOverall: "PASS",
    rfReportedPass: true,
    rfEvidenceComplete: true,
    diagnosticsComplete: true,
    settingsComplete: true,
    checkSetFingerprint: "fnv1a-history",
    hardwareVerifiedByRotorBench: false,
    checkCounts: { pass: 8, fail: 0, unverified: 2 },
    failedChecks: [],
    unverifiedChecks: ["Data freshness"],
    scope: evidenceScope,
  };
  const previous = {
    ...current,
    attachedAt: "2026-11-20T12:00:00.000Z",
    checkCounts: { pass: 7, fail: 1, unverified: 2 },
    failedChecks: ["Link quality"],
    rfEvidenceComplete: false,
  };
  localStorage.setItem(
    "rotorbench:bench-evidence:evidence-history-build:v1",
    JSON.stringify(current),
  );
  appendBenchEvidenceAttachmentHistory(
    "evidence-history-build",
    previous,
    localStorage,
  );

  render(
    <BenchEvidenceReview
      buildId="evidence-history-build"
      evidenceScope={evidenceScope}
    />,
  );

  expect(screen.getByRole("region", { name: "Evidence attached to this build" }))
    .toBeInTheDocument();
  expect(screen.getByText("Evidence run history")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Choose evidence files" })
      .compareDocumentPosition(screen.getByRole("group", {
        name: "Evidence run history",
      }))
    & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  await userEvent.click(screen.getByText("Evidence run history"));
  expect(screen.getByText("Review improved")).toBeInTheDocument();
  expect(screen.getByText(/\+1 pass · -1 fail/i)).toBeInTheDocument();
  expect(within(screen.getByRole("group", { name: "Evidence run history" }))
    .getByText("Imported RF claim only")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Clear history" }));
  expect(screen.queryByText("Evidence run history")).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Evidence attached to this build" }))
    .toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(/current attachment was kept/i);
});

test("invalid JSON is rejected without retaining prior evidence", async () => {
  render(<BenchEvidenceReview />);
  const input = screen.getByLabelText("Choose hardware evidence files");

  userEvent.upload(input, {
    name: "bad.json",
    text: async () => "{",
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(/not valid JSON/i);
  expect(screen.queryByLabelText("Imported evidence review")).not.toBeInTheDocument();
});

test("native CRSF observation reports expose timing and integrity diagnostics", async () => {
  render(<BenchEvidenceReview />);
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile({
      schema: "rotorbench.crsf-observation.v1",
      status: "frames-observed",
      baudRate: 420000,
      plan: { role: "rx", targetName: "Aerial Kit ELRS USB TX Rev A3" },
      channelsObserved: true,
      linkStatisticsObserved: true,
      lastFrameAgeMs: 1200,
      rcCadenceMs: 6.67,
      diagnostics: {
        validFrames: 12,
        crcErrors: 0,
        resyncs: 0,
        framingErrors: 0,
        bytesReceived: 520,
        pendingBytes: 0,
      },
      channels: Array.from({ length: 16 }, () => 992),
      channelRanges: [
        {
          channel: 1,
          samples: 24,
          min: 172,
          max: 1811,
          calibrationStatus: "full",
        },
        {
          channel: 2,
          samples: 20,
          min: 990,
          max: 994,
          calibrationStatus: "narrow",
        },
      ],
      receiverCalibration: {
        min: 172,
        mid: 992,
        max: 1811,
        deadband: 0.02,
      },
      link: { uplinkLinkQuality: 100, downlinkLinkQuality: 80 },
    }, "observation.json"),
  );

  expect(await screen.findByText("Native CRSF observation")).toBeInTheDocument();
  expect(screen.getByText(/Parser and interval integrity/i)).toBeInTheDocument();
  expect(screen.getAllByText(/149\.9 Hz/)).toHaveLength(2);
  expect(screen.getByText(/1\.2 seconds since the last valid frame/i))
    .toBeInTheDocument();
  expect(screen.getByText(/No two-endpoint RF PASS is established/i))
    .toBeInTheDocument();
  const ranges = screen.getByRole("region", {
    name: "Imported receiver channel ranges",
  });
  expect(within(ranges).getByText("CH 1")).toBeInTheDocument();
  expect(within(ranges).getByText("172–1811")).toBeInTheDocument();
  expect(within(ranges).getByText("Full planned range")).toBeInTheDocument();
  expect(within(ranges).getByText(/not applied to the controller/i))
    .toBeInTheDocument();
});

test("correlates matching TX and RX observations without claiming RF", async () => {
  render(
    <BenchEvidenceReview targetName="Aerial Kit ELRS USB TX Rev A3" />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      observationEvidence("tx", "tx-observation.json"),
      observationEvidence("rx", "rx-observation.json"),
    ],
  );

  expect(await screen.findByText(
    "TX and RX observations correlate; RF remains unverified",
  )).toBeInTheDocument();
  const pair = screen.getByRole("region", {
    name: "Native observation correlation",
  });
  expect(pair).toHaveTextContent("Same target · 15.0 s overlap");
  expect(pair).toHaveTextContent("TX observation");
  expect(pair).toHaveTextContent("RX observation");
  expect(pair).toHaveTextContent(/cannot prove endpoint UID pairing/i);
  expect(screen.getByText("TX + RX native observations")).toBeInTheDocument();
});

test("reviews imported flight-controller status and preflight evidence", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ firmwareFamily: "aerialkit" }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile(fcStatusEvidence, "fc-status.json"),
      textEvidenceFile(fcPreflightText, "fc-preflight.txt"),
    ],
  );

  expect(await screen.findByText(
    "FC status and preflight are complete; hardware remains unverified",
  )).toBeInTheDocument();
  const fcEvidence = screen.getByRole("region", {
    name: "Flight controller status and preflight evidence",
  });
  expect(fcEvidence).toHaveTextContent("AKP · aerialkit-f405 · 6 pass · 0 fail · 3 fact");
  expect(fcEvidence).toHaveTextContent("outputs");
  expect(fcEvidence).toHaveTextContent("outputs: 4 motors, 2 servos");
  expect(fcEvidence).toHaveTextContent(/do not arm, fly, or authorize/i);
  expect(screen.getByText("Flight-controller status + preflight")).toBeInTheDocument();
});

test("does not call Betaflight MSP status a receiver-link pass", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ firmwareFamily: "betaflight" }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile({
        identity: "protocol=betaflight product=BTFL firmware=2026.6.1",
        state: { armed: 0, link_live: 1 },
      }, "fc-status.json"),
      textEvidenceFile(
        "armed=0 arming_disable_flags=0x100",
        "fc-preflight.txt",
      ),
    ],
  );

  expect(await screen.findByText(
    "FC status and preflight imported; receiver link not established",
  )).toBeInTheDocument();
  expect(screen.getByText("Not exposed by MSP status")).toBeInTheDocument();
});

test("filters imported evidence to failed and unverified review items", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ firmwareFamily: "betaflight" }}
    />,
  );
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile({
        identity: "protocol=betaflight product=BTFL firmware=2026.6.1",
        state: { armed: 0, link_live: 1 },
      }, "fc-status.json"),
      textEvidenceFile(
        "armed=0 arming_disable_flags=0x100",
        "fc-preflight.txt",
      ),
    ],
  );
  await screen.findByText(
    "FC status and preflight imported; receiver link not established",
  );

  const allChecks = screen.getByRole("button", { name: /All checks/i });
  const reviewItems = screen.getByRole("button", { name: /Review items/i });
  expect(allChecks).toHaveAttribute("aria-pressed", "true");
  expect(within(screen.getByRole("list", { name: "Imported evidence checks" }))
    .queryAllByText("Pass in file").length).toBeGreaterThan(0);

  await userEvent.click(reviewItems);
  const filtered = screen.getByRole("list", { name: "Imported evidence checks" });
  expect(reviewItems).toHaveAttribute("aria-pressed", "true");
  expect(within(filtered).queryAllByText("Pass in file")).toHaveLength(0);
  expect(within(filtered).getAllByText("Unverified").length).toBeGreaterThan(0);

  await userEvent.click(allChecks);
  expect(within(screen.getByRole("list", { name: "Imported evidence checks" }))
    .queryAllByText("Pass in file").length).toBeGreaterThan(0);
});

test("shows fresh FC RC channels without claiming RF verification", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ firmwareFamily: "betaflight" }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile({
        identity: "protocol=betaflight product=BTFL firmware=2026.6.1",
        state: { armed: 0, link_live: 1 },
      }, "fc-status.json"),
      evidenceFile({
        protocol: "betaflight",
        verdict: "pass",
        armed: 0,
        arming_disable_flags: 0,
      }, "fc-preflight.json"),
      evidenceFile({
        protocol: "betaflight",
        link_live: null,
        channels: [172, 992, 1811, 992, 992, 992, 992, 992],
        observed_at: Date.now() / 1000,
      }, "fc-rc.json"),
    ],
  );

  expect(await screen.findByText(
    "FC status and preflight are complete; hardware remains unverified",
  )).toBeInTheDocument();
  const rc = screen.getByRole("region", {
    name: "Flight controller RC observation",
  });
  expect(rc).toHaveTextContent("CH 1");
  expect(rc).toHaveTextContent("172");
  expect(rc).toHaveTextContent(/does not prove RF range/i);
  expect(screen.getByText("Plausible variation")).toBeInTheDocument();
});

test("recognizes a standalone FC RC observation without completing FC evidence", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ firmwareFamily: "betaflight" }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile({
      protocol: "betaflight",
      link_live: null,
      channels: [172, 992, 1811, 992, 992, 992, 992, 992],
      observed_at: Date.now() / 1000,
    }, "fc-rc.json"),
  );

  expect(await screen.findByText(
    "Fresh FC RC channels observed; RF remains unverified",
  )).toBeInTheDocument();
  expect(screen.getByRole("region", {
    name: "Flight controller RC observation",
  })).toBeInTheDocument();
});

test("reviews radio device status without exposing serial identity", async () => {
  render(
    <BenchEvidenceReview
      targetName="Aerial Kit ELRS USB TX Rev A3"
      expectedRadio={{
        role: "tx",
        txBaud: 400000,
        targetName: "Aerial Kit ELRS USB TX Rev A3",
        firmwareVersion: "ExpressLRS 4.1.0",
      }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile(radioStatusEvidence, "tx-status.json"),
  );

  expect(await screen.findByText(
    "Radio identity matches the selected endpoint; RF remains unverified",
  )).toBeInTheDocument();
  expect(screen.getByText("Radio device status")).toBeInTheDocument();
  expect(screen.getByText(/does not prove RF range or performance/i))
    .toBeInTheDocument();
  expect(screen.queryByText(/SER123/)).not.toBeInTheDocument();
});

test("names a radio endpoint mismatch instead of falling back to the generic RF state", async () => {
  render(
    <BenchEvidenceReview
      expectedRadio={{
        role: "rx",
        rxBaud: 420000,
        targetName: "Aerial Kit ELRS USB TX Rev A3",
        firmwareVersion: "ExpressLRS 4.1.0",
      }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    evidenceFile(radioStatusEvidence, "tx-status.json"),
  );

  expect(await screen.findByText(
    "Radio identity does not match the selected endpoint",
  )).toBeInTheDocument();
  expect(screen.queryByText("No two-endpoint RF PASS is established"))
    .not.toBeInTheDocument();
});

test("compares an imported FC parameter snapshot with the staged plan", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ plan: { armChannel: 6, rcMin: 172 } }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    textEvidenceFile(
      "arm_channel=6 status=0\nrc_min=180 status=0",
      "fc-params.txt",
    ),
  );

  expect(await screen.findByText(
    "FC parameters differ from the staged plan",
  )).toBeInTheDocument();
  expect(screen.getByText("FC parameter arm_channel")).toBeInTheDocument();
  expect(screen.getByText(/rc_min=180; the staged plan expects 172/i))
    .toBeInTheDocument();
  expect(screen.getByText("Observed parameter snapshot")).toBeInTheDocument();
  expect(screen.getByText(/2 read-only values from the imported file/i))
    .toHaveTextContent(/1 match · 1 differs/i);
});

test("does not call a partial FC parameter snapshot a plan match", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{ plan: { armChannel: 5, modeChannel: 6, rcMin: 172 } }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    textEvidenceFile("arm_channel=5 status=0", "fc-params.txt"),
  );

  expect(await screen.findByText(
    "FC parameter snapshot is incomplete",
  )).toBeInTheDocument();
  expect(screen.getByText("FC parameters covered")).toBeInTheDocument();
  expect(screen.getByText("1 / 3")).toBeInTheDocument();
  expect(screen.getByText(/does not include mode_channel/i)).toBeInTheDocument();
});

test("reviews Mission Planner parameters for the documented H743 receiver path", async () => {
  render(
    <BenchEvidenceReview
      expectedFc={{
        firmwareFamily: "ardupilot",
        plan: {
          profileId: "matek-h743-wing-v3-ardupilot",
          receiverProtocol: "crsf",
        },
      }}
    />,
  );

  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    textEvidenceFile(
      "BRD_ALT_CONFIG,1\nSERIAL7_PROTOCOL,23",
      "h743-wing.param",
    ),
  );

  expect(await screen.findByText(
    "FC parameters match the staged plan; hardware remains unverified",
  )).toBeInTheDocument();
  expect(screen.getByText("Observed parameter snapshot")).toBeInTheDocument();
  expect(within(
    screen.getByText("Observed parameter snapshot").closest("summary"),
  ).getByText(/Mission Planner/)).toBeInTheDocument();
  expect(screen.getByText(/true UART RX on UART6/i)).toBeInTheDocument();
  expect(screen.getByText(/CRSF\/ELRS on SERIAL7/i)).toBeInTheDocument();
});

test("adopts only selected observed FC values through an explicit local action", async () => {
  const adopt = jest.fn();
  const evidenceScope = createBenchEvidenceScope({
    build: { componentIds: { flightControllerId: "fc-a" } },
    flightControllerPlan: { planVersion: 3, firmwareFamily: "aerialkit" },
  });
  render(
    <BenchEvidenceReview
      evidenceScope={evidenceScope}
      expectedFc={{
        firmwareFamily: "aerialkit",
        plan: {
          armChannel: 6,
          armHoldMs: 500,
          rcMin: 172,
        },
      }}
      onAdoptPlanPatch={adopt}
    />,
  );
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    textEvidenceFile(
      "arm_channel=5 status=0\narm_hold_ms=750 status=0",
      "fc-params.txt",
    ),
  );

  expect(await screen.findByText("Apply observed flight-controller values"))
    .toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {
    name: "Select all differences",
  }));
  await userEvent.click(screen.getByRole("button", {
    name: "Adopt selected FC values",
  }));

  expect(adopt).toHaveBeenCalledWith({
    source: "fc",
    count: 2,
    values: { armChannel: 5, armHoldMs: 750 },
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    /adopted into the local plan.*Nothing was sent to hardware/i,
  );
});

test("blocks observed-value adoption after the reviewed plan scope changes", async () => {
  const initialScope = createBenchEvidenceScope({
    build: { componentIds: { flightControllerId: "fc-a" } },
    flightControllerPlan: { planVersion: 3, firmwareFamily: "aerialkit" },
  });
  const changedScope = createBenchEvidenceScope({
    build: { componentIds: { flightControllerId: "fc-b" } },
    flightControllerPlan: { planVersion: 3, firmwareFamily: "aerialkit" },
  });
  const expectedFc = {
    firmwareFamily: "aerialkit",
    plan: { armChannel: 6, armHoldMs: 500 },
  };
  const { rerender } = render(
    <BenchEvidenceReview
      evidenceScope={initialScope}
      expectedFc={expectedFc}
      onAdoptPlanPatch={jest.fn()}
    />,
  );
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    textEvidenceFile("arm_channel=5 status=0", "fc-params.txt"),
  );
  await screen.findByText("Apply observed flight-controller values");

  rerender(
    <BenchEvidenceReview
      evidenceScope={changedScope}
      expectedFc={expectedFc}
      onAdoptPlanPatch={jest.fn()}
    />,
  );

  expect(screen.getByText(/local build or plan changed after this evidence was imported/i))
    .toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Adopt selected FC values" }))
    .not.toBeInTheDocument();
});

test("adopts observed TX radio settings independently from FC evidence", async () => {
  const adopt = jest.fn();
  const evidenceScope = createBenchEvidenceScope({
    build: { componentIds: { receiverId: "rx-a" } },
    radioPlan: { planVersion: 3, targetId: "aerialkit-elrs-rev-a3", role: "tx" },
  });
  render(
    <BenchEvidenceReview
      evidenceScope={evidenceScope}
      targetName="Aerial Kit ELRS USB TX Rev A3"
      expectedRadio={{
        role: "tx",
        txBaud: 400000,
        rxBaud: 420000,
        targetName: "Aerial Kit ELRS USB TX Rev A3",
        firmwareVersion: "ExpressLRS 4.1.0",
        plan: {
          targetId: "aerialkit-elrs-rev-a3",
          packetRateMode: "100-full",
          powerDbm: -14,
          telemetryRatio: "1:128",
          switchMode: "16ch-rate2",
          linkMode: "mavlink",
          dynamicPower: "dynamic",
          modelMatch: true,
        },
      }}
      expectedSettings={{
        packetRateMode: "100-full",
        powerDbm: -14,
        telemetryRatio: "1:128",
        switchMode: "16ch-rate2",
        linkMode: "mavlink",
        dynamicPower: "dynamic",
        modelMatch: true,
      }}
      onAdoptPlanPatch={adopt}
    />,
  );
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile(pairEvidence, "pair.json"),
      textEvidenceFile(txParametersText, "tx-params.txt"),
      evidenceFile(radioStatusEvidence, "tx-status.json"),
    ],
  );

  expect(await screen.findByText("Apply observed TX radio values"))
    .toBeInTheDocument();
  expect(screen.getByText("Observed TX parameter snapshot")).toBeInTheDocument();
  expect(screen.getByText(/7 read-only module values/i))
    .toHaveTextContent(/0 matches · 6 differ/i);
  await userEvent.click(screen.getByRole("button", {
    name: "Select all differences",
  }));
  await userEvent.click(screen.getByRole("button", {
    name: "Adopt selected radio values",
  }));

  expect(adopt).toHaveBeenCalledWith({
    source: "radio",
    count: 7,
    values: {
      packetRateMode: "250",
      powerDbm: -18,
      telemetryRatio: "std",
      switchMode: "wide",
      linkMode: "normal",
      dynamicPower: "off",
      modelMatch: false,
    },
  });
});

test("blocks radio adoption without matching endpoint identity evidence", async () => {
  const evidenceScope = createBenchEvidenceScope({
    build: { componentIds: { receiverId: "rx-a" } },
    radioPlan: { planVersion: 3, targetId: "aerialkit-elrs-rev-a3", role: "tx" },
  });
  render(
    <BenchEvidenceReview
      evidenceScope={evidenceScope}
      targetName="Aerial Kit ELRS USB TX Rev A3"
      expectedRadio={{
        role: "tx",
        txBaud: 400000,
        rxBaud: 420000,
        targetName: "Aerial Kit ELRS USB TX Rev A3",
        firmwareVersion: "ExpressLRS 4.1.0",
        plan: {
          targetId: "aerialkit-elrs-rev-a3",
          packetRateMode: "250",
        },
      }}
      onAdoptPlanPatch={jest.fn()}
    />,
  );
  userEvent.upload(
    screen.getByLabelText("Choose hardware evidence files"),
    [
      evidenceFile(pairEvidence, "pair.json"),
      textEvidenceFile(txParametersText, "tx-params.txt"),
    ],
  );

  expect(await screen.findByText(
    /include matching TX radio device status/i,
  )).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Adopt selected radio values" }))
    .not.toBeInTheDocument();
});
