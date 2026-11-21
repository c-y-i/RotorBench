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
  });
});
