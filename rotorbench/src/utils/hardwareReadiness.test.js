import {
  describeMissionControls,
  describeNavigationSafety,
  sanitizeHardwareReadiness,
  summarizeHardwareReadiness,
} from "./hardwareReadiness";

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
    fcBoardProfile: "custom-board",
    fcBoardName: "Test FC",
    fcBoardDocumented: false,
    fcMotorOrder: "1 RR CW · 2 FR CCW · 3 RL CCW · 4 FL CW",
    fcMotorLayoutSource: "Betaflight",
    fcPropellerDirection: "props-in",
    radioPlanConfigured: false,
    radioReceiverBandStatus: "unconfigured",
    radioReceiverBands: ["2.4 GHz"],
    radioSharedBands: [],
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

test("saved radio plans retain simultaneous versus selectable band mode", () => {
  const selectedReceiver = {
    id: "rx-dual-audit",
    name: "Dual-band receiver",
    protocol: "CRSF",
    frequencyBands: ["2.4 GHz", "Sub-G 900 MHz"],
  };
  const readMode = (targetId) => {
    const buildId = `build-${targetId}`;
    const base = `rotorbench:hardware-plan:${buildId}`;
    return summarizeHardwareReadiness({
      buildId,
      flightController: fc,
      receiver: selectedReceiver,
      storage: memoryStorage({
        [`${base}:fc`]: JSON.stringify({
          planVersion: 3,
          selectedFlightControllerId: fc.id,
          selectedReceiverId: selectedReceiver.id,
          receiverProtocol: "crsf",
        }),
        [`${base}:radio`]: JSON.stringify({
          planVersion: 3,
          selectedReceiverId: selectedReceiver.id,
          targetId,
        }),
      }),
    });
  };

  const simultaneous = readMode("radiomaster-gx12-gemini-xrossband-tx");
  expect(simultaneous).toMatchObject({
    radioReceiverBandStatus: "compatible",
    radioReceiverBands: ["2.4 GHz", "Sub-G 900 MHz"],
    radioReceiverBandMode: "simultaneous",
    radioReceiverBandsSimultaneous: true,
  });
  expect(sanitizeHardwareReadiness(simultaneous)).toMatchObject({
    radioReceiverBandMode: "simultaneous",
    radioReceiverBandsSimultaneous: true,
  });

  const selectable = readMode("radiomaster-tx15-max-elrs-xrossband-tx");
  expect(selectable).toMatchObject({
    radioReceiverBandStatus: "compatible",
    radioReceiverBandMode: "selectable",
    radioReceiverBandsSimultaneous: false,
  });
});

test("workspace system-ID parameters survive sanitized readiness", () => {
  const base = "rotorbench:hardware-plan:build-sysid";
  const readiness = summarizeHardwareReadiness({
    buildId: "build-sysid",
    flightController: fc,
    receiver,
    storage: memoryStorage({
      [`${base}:fc`]: JSON.stringify({
        planVersion: 3,
        selectedFlightControllerId: fc.id,
        selectedReceiverId: receiver.id,
        firmwareFamily: "aerialkit",
        profileId: "weact-f405",
        receiverProtocol: "crsf",
        sysidChannel: 8,
        sysidAxis: 2,
        sysidPattern: 1,
        sysidAmplitude: 0.08,
        sysidDurationMs: 7500,
      }),
    }),
  });

  expect(readiness).toMatchObject({
    fcSysidChannel: 8,
    fcSysidAxis: 2,
    fcSysidPattern: 1,
    fcSysidAmplitude: 0.08,
    fcSysidDurationMs: 7500,
  });
  expect(sanitizeHardwareReadiness(readiness)).toMatchObject({
    fcSysidChannel: 8,
    fcSysidAxis: 2,
    fcSysidPattern: 1,
    fcSysidAmplitude: 0.08,
    fcSysidDurationMs: 7500,
  });
});

test("H743 readiness retains source-backed ArduPilot receiver parameters", () => {
  const selectedController = {
    id: "fc-matek-h743-wing-v3",
    name: "Matek H743-WING V3",
    processor: "STM32H743VIT6",
    imu: "ICM42688P",
    firmware: ["ArduPilot"],
  };
  const selectedReceiver = {
    id: "rx-h743-test",
    name: "ELRS RX",
    protocol: "CRSF",
    frequencyBands: ["2.4 GHz"],
  };
  const base = "rotorbench:hardware-plan:build-h743";
  const readiness = summarizeHardwareReadiness({
    buildId: "build-h743",
    flightController: selectedController,
    receiver: selectedReceiver,
    storage: memoryStorage({
      [`${base}:fc`]: JSON.stringify({
        planVersion: 3,
        selectedFlightControllerId: selectedController.id,
        selectedReceiverId: selectedReceiver.id,
        firmwareFamily: "ardupilot",
        profileId: "matek-h743-wing-v3-ardupilot",
        receiverProtocol: "crsf",
        receiverUart: "UART6",
      }),
    }),
  });

  expect(readiness.fcParameterRequirements).toEqual([
    {
      name: "BRD_ALT_CONFIG",
      value: "1",
      whenReceiverProtocol: "crsf",
      description: "true UART RX on UART6",
    },
    {
      name: "SERIAL7_PROTOCOL",
      value: "23",
      whenReceiverProtocol: "crsf",
      description: "CRSF/ELRS on SERIAL7",
    },
  ]);
  expect(sanitizeHardwareReadiness(readiness).fcParameterRequirements).toEqual([
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
  ]);
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
    fcBoardProfile: "esp32dev",
    fcBoardName: "ESP32DEV",
    fcBoardDocumented: true,
    receiverPins: "GPIO17 TX / GPIO16 RX",
    wiringStatus: "documented",
    wiringScope: "planning continuity checklist; hardware not tested",
  });
});

test("PWM-only receivers report their output topology instead of serial pins", () => {
  const pwmReceiver = {
    ...receiver,
    id: "rx-er3c-i",
    name: "RadioMaster ER3C-i",
    pwmOutputs: 3,
    outputMode: "pwm",
  };
  const readiness = summarizeHardwareReadiness({
    buildId: "build-pwm",
    flightController: fc,
    receiver: pwmReceiver,
    storage: memoryStorage(),
  });

  expect(readiness).toMatchObject({
    wiringStatus: "pwm-only",
    receiverPins: "3 PWM outputs · no serial route published",
  });
});

test("a saved PWM-only receiver plan keeps an explicit topology review item", () => {
  const pwmReceiver = {
    ...receiver,
    id: "rx-er3c-i",
    name: "RadioMaster ER3C-i",
    pwmOutputs: 3,
    outputMode: "pwm",
  };
  const base = "rotorbench:hardware-plan:build-pwm";
  const storage = memoryStorage({
    [`${base}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: fc.id,
      selectedReceiverId: pwmReceiver.id,
      firmwareFamily: "betaflight",
      profileId: "custom-board",
      receiverProtocol: "crsf",
      receiverUart: "UART1",
      receiverBaud: 420000,
    }),
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: pwmReceiver.id,
      channelMap: {
        arm: 5,
        flightMode: 6,
      },
    }),
  });
  const readiness = summarizeHardwareReadiness({
    buildId: "build-pwm",
    flightController: fc,
    receiver: pwmReceiver,
    storage,
  });

  expect(readiness).toMatchObject({
    status: "review",
    wiringStatus: "pwm-only",
    receiverWiringWarnings: [
      expect.stringMatching(/direct PWM topology.*documented CRSF\/SBUS output/i),
    ],
  });
  expect(readiness.issueCount).toBeGreaterThan(0);
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
      batteryRthEnabled: true,
      fenceEnabled: true,
      fenceRadiusM: 250,
      fenceCeilingM: 120,
      rthMinAltM: 30,
      gpsMinSats: 8,
      alignRollDeg: 0.5,
      alignPitchDeg: -1.5,
      alignYawDeg: 90,
      gyroRateHz: 3200,
      pidDenom: 2,
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
    fcBatteryRthEnabled: true,
    fcFenceEnabled: true,
    fcFenceRadiusM: 250,
    fcFenceCeilingM: 120,
    fcRthMinAltM: 30,
    fcGpsMinSats: 8,
    fcAlignmentRollDeg: 0.5,
    fcAlignmentPitchDeg: -1.5,
    fcAlignmentYawDeg: 90,
    fcGyroRateHz: 3200,
    fcPidDenom: 2,
    fcGyroLpf1StaticHz: 250,
    fcGyroLpf1DynMinHz: 250,
    fcGyroLpf1DynMaxHz: 500,
    fcGyroLpf2StaticHz: 500,
    fcDtermLpf1StaticHz: 75,
    fcDtermLpf1DynMinHz: 75,
    fcDtermLpf1DynMaxHz: 150,
    fcDtermLpf2StaticHz: 150,
    fcFilterClampKnown: true,
    fcFilterLoopHz: 1600,
    fcFilterMaxCutoffHz: 400,
    fcFilterClampedCount: 2,
    fcDynNotchCount: 3,
    fcDynNotchQ: 300,
    fcDynNotchMinHz: 100,
    fcDynNotchMaxHz: 600,
    fcDynamicNotchStatus: "loop-gate",
    fcDynamicNotchEligible: false,
    fcDynamicNotchLoopHz: 1600,
    fcDynamicNotchAnalysisRateHz: null,
    fcRcSmooth: 0,
    fcRcSmoothHz: 0,
    fcRcSmoothFactor: 30,
    fcRcSmoothingStatus: "off",
    fcRcSmoothingLinkRateHz: null,
    fcRcSmoothingDerivedCutoffHz: 0,
    fcRcSmoothingAppliedCutoffHz: 0,
    fcRcSmoothingClamped: false,
    fcRateFfdRoll: 0,
    fcRateFfdPitch: 0,
    fcRateFfdYaw: 0,
    fcFfSmoothFactor: 65,
    fcFfJitterFactor: 7,
    fcFfBoost: 15,
    fcFfMaxRateLimit: 90,
    fcFeedForwardStatus: "off",
    fcFeedForwardEnabled: false,
    fcFeedForwardLinkRateHz: null,
    fcFeedForwardTauMs: 7.428571428571429,
    fcFeedForwardFilterK: null,
  });
  expect(describeNavigationSafety(readiness)).toBe(
    "Fence 250 m / 120 m ceiling · Floor 30 m · GPS 8 sats · Pack RTH on",
  );
});

test("aligns saved RC smoothing with the saved radio packet cadence", () => {
  const base = "rotorbench:hardware-plan:build-smoothing";
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
      gyroRateHz: 1000,
      pidDenom: 1,
      rcSmooth: 1,
      rcSmoothHz: 0,
      rcSmoothFactor: 30,
    }),
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: receiver.id,
      packetRateMode: "100-full",
    }),
  });
  const readiness = summarizeHardwareReadiness({
    buildId: "build-smoothing",
    flightController: fc,
    receiver,
    storage,
  });

  expect(readiness).toMatchObject({
    fcRcSmooth: 1,
    fcRcSmoothHz: 0,
    fcRcSmoothFactor: 30,
    fcRcSmoothingStatus: "auto",
    fcRcSmoothingLinkRateHz: 100,
    fcRcSmoothingDerivedCutoffHz: 37.5,
    fcRcSmoothingAppliedCutoffHz: 37.5,
    fcRcSmoothingClamped: false,
    fcFeedForwardStatus: "off",
    fcFeedForwardEnabled: false,
    fcFeedForwardLinkRateHz: 100,
  });
  expect(readiness.fcFeedForwardFilterK).toBeCloseTo(0.5738, 4);
});

test("mission and launch controls remain available outside Setup", () => {
  const buildId = "mission-launch-build";
  const aerialKitFc = {
    ...fc,
    firmware: ["Aerial Kit"],
  };
  const storage = memoryStorage({
    [`rotorbench:hardware-plan:${buildId}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: aerialKitFc.id,
      selectedReceiverId: receiver.id,
      firmwareFamily: "aerialkit",
      profileId: "esp32dev",
      airframe: "elevonwing",
      missionChannel: 7,
      launchChannel: 8,
      launchThrottle: 0.65,
      launchClimbDeg: 20,
      launchTimeoutS: 6,
      servo1Reverse: true,
      servo1TrimUs: 18,
      servo1TravelUs: 460,
      servo2Reverse: false,
      servo2TrimUs: -12,
      servo2TravelUs: 520,
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
    }),
  });
  const readiness = summarizeHardwareReadiness({
    buildId,
    flightController: aerialKitFc,
    receiver,
    buildServoCount: 3,
    storage,
  });

  expect(readiness).toMatchObject({
    fcMissionChannel: 7,
    fcLaunchChannel: 8,
    fcLaunchThrottle: 0.65,
    fcLaunchClimbDeg: 20,
    fcLaunchTimeoutS: 6,
    fcMotorOutputs: [
      { output: 1, label: "Left pusher", spin: "CCW" },
      { output: 2, label: "Right pusher", spin: "CW" },
    ],
    fcPropellerDirection: "props-out",
    buildServoCount: 3,
    fcServoOutputCount: 2,
    servoOutputCoverageStatus: "under-mapped",
    servoOutputCoverageLabel: "2/3 outputs mapped",
    servoOutputCoverageDetail: "1 catalogued servo output remains unassigned by the saved firmware mixer.",
    fcServoOutputs: [
      { output: 1, reversed: true, trimUs: 18, travelUs: 460 },
      { output: 2, reversed: false, trimUs: -12, travelUs: 520 },
    ],
  });
  expect(describeMissionControls(readiness)).toBe(
    "Mission CH7 · Launch CH8 · 65% · 20° · 6 s",
  );
  expect(sanitizeHardwareReadiness(readiness)).toMatchObject({
    fcMissionChannel: 7,
    fcLaunchChannel: 8,
    fcLaunchThrottle: 0.65,
    fcLaunchClimbDeg: 20,
    fcLaunchTimeoutS: 6,
    fcMotorOutputs: [
      { output: 1, label: "Left pusher", spin: "CCW" },
      { output: 2, label: "Right pusher", spin: "CW" },
    ],
    servoOutputCoverageStatus: "under-mapped",
    servoOutputCoverageLabel: "2/3 outputs mapped",
    fcServoOutputs: [
      { output: 1, reversed: true, trimUs: 18, travelUs: 460 },
      { output: 2, reversed: false, trimUs: -12, travelUs: 520 },
    ],
  });
});

test("saved airframe choices are checked against the selected frame motor count", () => {
  const buildId = "airframe-mismatch-build";
  const aerialKitFc = {
    ...fc,
    firmware: ["Aerial Kit"],
  };
  const storage = memoryStorage({
    [`rotorbench:hardware-plan:${buildId}:fc`]: JSON.stringify({
      planVersion: 3,
      selectedFlightControllerId: aerialKitFc.id,
      selectedReceiverId: receiver.id,
      firmwareFamily: "aerialkit",
      profileId: "esp32dev",
      airframe: "elevonwing",
      armChannel: 6,
      modeChannel: 5,
      receiverProtocol: "crsf",
      receiverUart: "UART2",
      receiverBaud: 420000,
    }),
  });
  const readiness = summarizeHardwareReadiness({
    buildId,
    flightController: aerialKitFc,
    receiver,
    buildMotorCount: 4,
    storage,
  });

  expect(readiness.blockerCount).toBeGreaterThan(0);
  expect(readiness.fcIssues).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "build-airframe-mismatch",
      severity: "error",
    }),
  ]));
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

test("saved handset identity exposes a bay mismatch across hardware readiness", () => {
  const base = "rotorbench:hardware-plan:build-boxer";
  const storage = memoryStorage({
    [`${base}:radio`]: JSON.stringify({
      planVersion: 3,
      selectedReceiverId: receiver.id,
      targetId: "radiomaster-ranger-elrs-24-tx",
      role: "tx",
      hostTransport: "module-bay",
      hostBay: "nano-8",
      handsetId: "radiomaster-boxer",
      powerDbm: 20,
      regulatoryRegion: "fcc",
    }),
  });

  const readiness = summarizeHardwareReadiness({
    buildId: "build-boxer",
    flightController: fc,
    receiver,
    storage,
  });

  expect(readiness).toMatchObject({
    radioHostBay: "nano-8",
    radioHostBayCompatible: true,
    radioHandsetId: "radiomaster-boxer",
    radioHandsetName: "RadioMaster Boxer",
    radioHandsetBayStatus: "conflict",
    radioHandsetBayCompatible: false,
    radioHandsetSourceUrl:
      "https://radiomasterrc.com/products/boxer-radio-controller-m2",
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

test("an unsaved sub-GHz radio plan is not reported as a band conflict", () => {
  const readiness = summarizeHardwareReadiness({
    buildId: "build-rf-unconfigured",
    flightController: fc,
    receiver: {
      id: "rx-radiomaster-bandit-br3-900",
      name: "Bandit BR3",
      protocol: "CRSF",
      frequencyBands: ["Sub-G 900 MHz"],
    },
    storage: memoryStorage(),
  });

  expect(readiness).toMatchObject({
    configured: false,
    radioPlanConfigured: false,
    radioReceiverBandStatus: "unconfigured",
    radioReceiverBands: ["Sub-G 900 MHz"],
    radioSharedBands: [],
  });
});
