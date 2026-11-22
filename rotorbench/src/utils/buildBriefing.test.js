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
      fcParameterRequirements: [
        {
          name: "BRD_ALT_CONFIG",
          value: "1",
          description: "true UART RX on UART6",
        },
        {
          name: "SERIAL7_PROTOCOL",
          value: "23",
          description: "CRSF/ELRS on SERIAL7",
        },
      ],
      radioPlan: { bindingPhrase: "must-not-export", uid: "10:73:a1:1f:a8:0f" },
    },
    generatedAt: "2026-11-21T00:00:00.000Z",
  });

  expect(briefing.text).toContain("# RotorBench briefing: Bench quad");
  expect(briefing.text).toContain("Check props-off setup.");
  expect(briefing.text).toContain("Motor test");
  expect(briefing.text).toContain("XT60 match");
  expect(briefing.text).toContain("Receiver wiring: Pins documented");
  expect(briefing.text).toContain("Radio host: Native USB CDC / documented");
  expect(briefing.text).toContain(
    "ArduPilot receiver parameters: BRD_ALT_CONFIG=1, SERIAL7_PROTOCOL=23 / no writes performed",
  );
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
      servoOutputCoverageLabel: "2/3 outputs mapped",
      servoOutputCoverageDetail: "1 catalogued servo output remains unassigned by the saved firmware mixer.",
      fcFenceEnabled: true,
      fcFenceRadiusM: 250,
      fcFenceCeilingM: 120,
      fcRthMinAltM: 30,
      fcGpsMinSats: 8,
      fcBatteryRthEnabled: true,
      fcAirframe: "elevonwing",
      fcMissionChannel: 7,
      fcLaunchChannel: 8,
      fcLaunchThrottle: 0.65,
      fcLaunchClimbDeg: 20,
      fcLaunchTimeoutS: 6,
      radioPowerDbm: 25,
      radioRegulatoryRegionLabel: "CE",
      radioRegulatoryMaxDbm: 20,
      radioPowerCapStatus: "over",
      radioReceiverBands: ["2.4 GHz", "Sub-G 900 MHz"],
      radioReceiverBandStatus: "compatible",
      radioSharedBands: ["2.4 GHz"],
    },
  });

  expect(briefing.text).toContain(
    "Handset bay: Nano 8-pin bay / mismatch",
  );
  expect(briefing.text).toContain(
    "Motor order: Normal · props in / 1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
  );
  expect(briefing.text).toContain(
    "Servo output coverage: 2/3 outputs mapped / 1 catalogued servo output remains unassigned by the saved firmware mixer.",
  );
  expect(briefing.text).toContain(
    "Navigation safety: Fence 250 m / 120 m ceiling · Floor 30 m · GPS 8 sats · Pack RTH on",
  );
  expect(briefing.text).toContain(
    "Mission controls: Mission CH7 · Launch CH8 · 65% · 20° · 6 s",
  );
  expect(briefing.text).toContain(
    "RF limit: CE / 25 planned / 20 dBm max / OVER CAP",
  );
  expect(briefing.text).toContain(
    "Receiver RF bands: 2.4 GHz / Sub-G 900 MHz / compatible / shared with TX: 2.4 GHz",
  );
  expect(briefing.text).toContain("readiness are not verified");
});

test("briefs planning weight and a published takeoff-envelope fit", () => {
  const briefing = createBuildBriefing({
    build: {
      name: "T1 Ranger",
      componentIds: {
        frameId: "frame-heewing-t1-ranger",
        motorId: "motor-heewing-fx1406-3150kv",
        propellerId: "prop-heewing-fx3830-2",
        escId: "esc-heewing-fx20a-bls-twin",
        flightControllerId: "fc-matek-f405-wmn",
        batteryId: "battery-cnhl-black-4s-1500-100c",
        receiverId: "rx-radiomaster-rp4td-m",
      },
    },
    assemblySpec: {
      frame: { name: "HeeWing T1 Ranger 730mm Wing" },
      motor: { name: "HeeWing FX1406 3150KV" },
      propeller: { name: "HeeWing FX-3830 2-Blade" },
    },
    generatedAt: "2026-11-21T00:00:00.000Z",
  });

  expect(briefing.text).toContain(
    "Planning weight: 506 g (456 g catalog parts + 50 g allowance; not measured)",
  );
  expect(briefing.text).toContain("Catalog price: $297.89");
  expect(briefing.text).toContain(
    "Published takeoff envelope: 350–500 g / +6 g over 500 g envelope / verify with a scale",
  );
});
