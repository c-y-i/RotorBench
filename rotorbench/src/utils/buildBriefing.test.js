import { createBuildBriefing } from "./buildBriefing";

test("creates a concise human-readable briefing without binding material", () => {
  const briefing = createBuildBriefing({
    build: {
      name: "Bench quad",
      note: "Check props-off setup.",
      geometryOverrides: {
        schema: "rotorbench.measured-geometry.v1",
        categories: {
          motors: {
            "motor-test": { propShaftMm: 5 },
          },
        },
      },
    },
    assemblySpec: {
      frame: { id: "frame-test", name: "Frame test" },
      motor: { id: "motor-test", name: "Motor test" },
      propeller: { id: "prop-test", name: "Prop test", shaftMm: 5 },
      battery: { id: "battery-test", name: "Battery test", dischargeConnector: "XT60" },
      esc: {
        id: "esc-test",
        name: "ESC test",
        includedPowerConnector: "XT60",
        powerConnection: "connector",
      },
    },
    viewerPlacement: {
      checks: new Array(8).fill(null),
      verifiedCount: 4,
      measuredCount: 1,
      estimatedCount: 2,
      fallbackCount: 0,
      awaitingCount: 1,
      conflictCount: 0,
    },
    hardwareReadiness: {
      configured: true,
      label: "2 checks open",
      receiverUart: "UART2",
      receiverBaud: 420000,
      wiringStatus: "documented",
      radioHostTransportLabel: "Native USB CDC",
      radioHostDocumented: true,
      radioPlan: { bindingPhrase: "must-not-export", uid: "10:73:a1:1f:a8:0f" },
    },
    generatedAt: "2026-11-21T00:00:00.000Z",
  });

  expect(briefing.text).toContain("# RotorBench briefing: Bench quad");
  expect(briefing.text).toContain("Check props-off setup.");
  expect(briefing.text).toContain("Motor test");
  expect(briefing.text).toContain("XT60 match");
  expect(briefing.text).toContain("Receiver wiring: pins documented");
  expect(briefing.text).toContain("Radio host: Native USB CDC / documented");
  expect(briefing.text).toContain("readiness are not verified");
  expect(briefing.text).not.toContain("must-not-export");
  expect(briefing.text).not.toContain("10:73:a1:1f:a8:0f");
});

test("briefs a module-bay handset fit without claiming hardware verification", () => {
  const briefing = createBuildBriefing({
    build: { name: "Ranger bench" },
    assemblySpec: {},
    hardwareReadiness: {
      configured: true,
      label: "1 check open",
      receiverUart: "UART1",
      receiverBaud: 420000,
      wiringStatus: "unverified",
      radioHostTransport: "module-bay",
      radioHostTransportLabel: "Handset module bay",
      radioHostDocumented: true,
      radioHostBayLabel: "Nano 8-pin bay",
      radioHostBayCompatible: false,
      fcMotorDirectionLabel: "Normal · props in",
      fcMotorOrder: "1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
    },
  });

  expect(briefing.text).toContain(
    "Handset bay: Nano 8-pin bay / mismatch",
  );
  expect(briefing.text).toContain(
    "Motor order: Normal · props in / 1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
  );
  expect(briefing.text).toContain("readiness are not verified");
});
