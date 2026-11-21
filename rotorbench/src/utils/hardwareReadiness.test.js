import { summarizeHardwareReadiness } from "./hardwareReadiness";

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
  };
}

const fc = {
  id: "fc-test",
  name: "Test FC",
  processor: "STM32F405",
  imu: "ICM42688",
  firmware: ["Betaflight"],
};
const receiver = {
  id: "rx-test",
  name: "ELRS RX",
  protocol: "CRSF",
  frequencyBands: ["2.4 GHz"],
};

test("an unsaved hardware plan is identified without claiming hardware readiness", () => {
  const readiness = summarizeHardwareReadiness({
    buildId: "build-test",
    flightController: fc,
    receiver,
    storage: memoryStorage(),
  });

  expect(readiness).toMatchObject({
    status: "empty",
    label: "Plan not saved",
    configured: false,
    complete: false,
    hardwareVerified: false,
    receiverUart: "UART1",
    receiverBaud: 420000,
    receiverPins: "Not mapped",
    wiringStatus: "unverified",
    radioHostTransport: "native-usb",
    radioHostTransportLabel: "Native USB CDC",
    radioHostDocumented: true,
    radioHostBay: "native-usb",
    radioHostBayLabel: "Native USB",
    radioHostBayCompatible: true,
    fcMotorDirection: "props-in",
    fcMotorDirectionLabel: "Normal · props in",
    fcMotorOrder: "1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
    fcMotorLayoutSource: "Betaflight",
    fcPropellerDirection: "props-in",
    radioReceiverBandStatus: "compatible",
    radioReceiverBands: ["2.4 GHz"],
    radioSharedBands: ["2.4 GHz"],
    fcMotorOutputByCorner: {
      upperLeft: { output: 4, label: "FL", spin: "CW" },
      upperRight: { output: 2, label: "FR", spin: "CCW" },
      lowerRight: { output: 1, label: "RR", spin: "CW" },
      lowerLeft: { output: 3, label: "RL", spin: "CCW" },
    },
  });
  expect(readiness.firmwareLabel).toBe("Betaflight");
  expect(readiness.protocolLabel).toBe("CRSF / ExpressLRS");
});

test("saved plans report review items and local completion independently", () => {
  const base = "rotorbench:hardware-plan:build-test";
  const storage = memoryStorage({
    [`${base}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: fc.id,
      selectedReceiverId: receiver.id,
      firmwareFamily: "betaflight",
      profileId: "custom-board",
      armChannel: 5,
      modeChannel: null,
      beeperChannel: 9,
      velocityChannel: null,
      receiverProtocol: "crsf",
      receiverUart: "UART1",
      receiverBaud: 420000,
    }),
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: receiver.id,
      channelMap: {
        arm: 5,
        flightMode: null,
        beeper: 9,
      },
    }),
  });

  const readiness = summarizeHardwareReadiness({
    buildId: "build-test",
    flightController: fc,
    receiver,
    storage,
  });

  expect(readiness.complete).toBe(true);
  expect(readiness.configured).toBe(true);
  expect(["review", "blocked"]).toContain(readiness.status);
  expect(readiness.issueCount).toBeGreaterThan(0);
  expect(readiness.fcPlan.receiverBaud).toBe(420000);
  expect(readiness.hardwareVerified).toBe(false);
});

test("documented board profiles expose a documented wiring readiness state", () => {
  const base = "rotorbench:hardware-plan:build-wiring";
  const storage = memoryStorage({
    [`${base}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: fc.id,
      selectedReceiverId: receiver.id,
      firmwareFamily: "aerialkit",
      profileId: "esp32dev",
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
    }),
  });
  const readiness = summarizeHardwareReadiness({
    buildId: "build-wiring",
    flightController: fc,
    receiver,
    storage,
  });

  expect(readiness).toMatchObject({
    receiverPins: "GPIO17 TX / GPIO16 RX",
    wiringStatus: "documented",
    wiringScope: "planning continuity checklist; hardware not tested",
  });
});

test("Aerial Kit battery telemetry remains available outside Setup", () => {
  const base = "rotorbench:hardware-plan:build-battery";
  const storage = memoryStorage({
    [`${base}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: fc.id,
      selectedReceiverId: receiver.id,
      firmwareFamily: "aerialkit",
      profileId: "esp32dev",
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
      vbatRatio: 10.8,
      vbatCells: 4,
      vbatWarnCell: 3.4,
      vbatMinCell: 3.2,
      alignRollDeg: 0.5,
      alignPitchDeg: -1.5,
      alignYawDeg: 90,
    }),
  });
  const readiness = summarizeHardwareReadiness({
    buildId: "build-battery",
    flightController: fc,
    receiver,
    storage,
  });

  expect(readiness).toMatchObject({
    fcBatteryDividerRatio: 10.8,
    fcBatteryCellOverride: 4,
    fcBatteryWarnCellV: 3.4,
    fcBatteryMinCellV: 3.2,
    fcAlignmentRollDeg: 0.5,
    fcAlignmentPitchDeg: -1.5,
    fcAlignmentYawDeg: 90,
  });
});

test("plans for another FC or receiver are ignored", () => {
  const base = "rotorbench:hardware-plan:build-test";
  const storage = memoryStorage({
    [`${base}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "different-fc",
      selectedReceiverId: receiver.id,
    }),
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: "different-fc",
      selectedReceiverId: "different-rx",
    }),
  });

  expect(summarizeHardwareReadiness({
    buildId: "build-test",
    flightController: fc,
    receiver,
    storage,
  }).configured).toBe(false);
});

test("a standalone radio plan is recognized as a partial hardware draft", () => {
  const base = "rotorbench:hardware-plan:build-test";
  const storage = memoryStorage({
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: receiver.id,
      channelMap: {
        arm: 5,
        flightMode: 6,
      },
    }),
  });

  const readiness = summarizeHardwareReadiness({
    buildId: "build-test",
    flightController: fc,
    receiver,
    storage,
  });
  expect(readiness.configured).toBe(true);
  expect(readiness.complete).toBe(false);
  expect(["partial", "review", "blocked"]).toContain(readiness.status);
});

test("saved module-bay plans expose physical fit across hardware readiness", () => {
  const base = "rotorbench:hardware-plan:build-ranger";
  const storage = memoryStorage({
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: receiver.id,
      targetId: "radiomaster-ranger-nano-elrs-24-tx",
      role: "tx",
      hostTransport: "module-bay",
      hostBay: "jr-standard-5",
      powerDbm: 20,
      regulatoryRegion: "fcc",
    }),
  });

  const readiness = summarizeHardwareReadiness({
    buildId: "build-ranger",
    flightController: fc,
    receiver,
    storage,
  });

  expect(readiness).toMatchObject({
    radioTargetName: "RadioMaster Ranger Nano 2.4 GHz ELRS",
    radioHostTransport: "module-bay",
    radioHostBay: "jr-standard-5",
    radioHostBayLabel: "JR standard 5-pin bay",
    radioHostBayCompatible: false,
    radioPowerDbm: 20,
    radioRegulatoryRegion: "fcc",
    radioRegulatoryRegionLabel: "FCC",
    radioRegulatoryMaxDbm: 30,
    radioRegulatoryMaxMw: 1000,
    radioPowerCapStatus: "within",
  });
});

test("Betaflight plan direction and order propagate through readiness", () => {
  const base = "rotorbench:hardware-plan:build-props-out";
  const storage = memoryStorage({
    [`${base}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: fc.id,
      selectedReceiverId: receiver.id,
      firmwareFamily: "betaflight",
      profileId: "custom-board",
      airframe: "quadx",
      motorDirection: "props-out",
    }),
  });

  const readiness = summarizeHardwareReadiness({
    buildId: "build-props-out",
    flightController: fc,
    receiver,
    storage,
  });
  expect(readiness).toMatchObject({
    fcMotorDirection: "props-out",
    fcMotorDirectionLabel: "Reversed · props out",
    fcMotorOrder: "1 RR CCW · 2 FR CW · 3 RL CW · 4 FL CCW",
    fcMotorLayoutSource: "Betaflight",
    fcPropellerDirection: "props-out",
  });
});

test("hardware readiness flags a receiver with no shared transmitter band", () => {
  const base = "rotorbench:hardware-plan:build-rf-conflict";
  const storage = memoryStorage({
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: "rx-900",
      targetId: "aerialkit-elrs-rev-a3",
      role: "tx",
    }),
  });

  const readiness = summarizeHardwareReadiness({
    buildId: "build-rf-conflict",
    flightController: fc,
    receiver: {
      id: "rx-900",
      name: "900 MHz receiver",
      protocol: "CRSF",
      frequencyBands: ["Sub-G 900 MHz"],
    },
    storage,
  });
  expect(readiness).toMatchObject({
    radioReceiverBandStatus: "conflict",
    radioReceiverBands: ["Sub-G 900 MHz"],
    radioSharedBands: [],
  });
});
