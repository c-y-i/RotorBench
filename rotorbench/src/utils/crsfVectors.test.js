import vectors from "./__fixtures__/aerialKitCrsfVectors.json";
import {
  CrsfStreamParser,
  decodeCrsfFrame,
} from "./crsfCapture";

function decodeVector(testCase) {
  const parser = new CrsfStreamParser();
  const frames = parser.feed(Uint8Array.from(Buffer.from(testCase.raw_hex, "hex")));

  expect(frames).toHaveLength(1);
  expect(parser.pendingBytes).toBe(0);
  expect(parser.crcErrors).toBe(0);
  expect(frames[0]).toMatchObject({
    address: testCase.address,
    frameType: testCase.frame_type,
  });
  expect(Buffer.from(frames[0].payload).toString("hex")).toBe(testCase.payload_hex);
  return decodeCrsfFrame(frames[0]);
}

test("shared Aerial Kit CRSF vectors match the browser decoder", () => {
  expect(vectors).toMatchObject({
    protocol: "crsf",
    schema_version: 1,
    reviewed_commit: "fa65372",
  });
  const cases = Object.fromEntries(
    vectors.cases.map((testCase) => [testCase.name, testCase]),
  );

  const centre = decodeVector(cases.rc_channels_centre);
  expect(centre).toEqual({
    kind: "rc",
    channels: cases.rc_channels_centre.decoded.channels,
  });
  expect(decodeVector(cases.rc_channels_extremes)).toEqual({
    kind: "rc",
    channels: cases.rc_channels_extremes.decoded.channels,
  });

  expect(decodeVector(cases.attitude)).toEqual({
    kind: "attitude",
    telemetry: {
      pitchRad: cases.attitude.decoded.pitch_rad,
      rollRad: cases.attitude.decoded.roll_rad,
      yawRad: cases.attitude.decoded.yaw_rad,
    },
  });
  expect(decodeVector(cases.battery)).toEqual({
    kind: "battery",
    telemetry: {
      voltageV: cases.battery.decoded.voltage_v,
      currentA: cases.battery.decoded.current_a,
      capacityMah: cases.battery.decoded.capacity_mah,
      remainingPercent: cases.battery.decoded.remaining_percent,
    },
  });
  expect(decodeVector(cases.gps)).toEqual({
    kind: "gps",
    telemetry: {
      latitudeDeg: cases.gps.decoded.latitude_deg,
      longitudeDeg: cases.gps.decoded.longitude_deg,
      groundspeedMps: cases.gps.decoded.groundspeed_mps,
      headingDeg: cases.gps.decoded.heading_deg,
      altitudeM: cases.gps.decoded.altitude_m,
      satellites: cases.gps.decoded.satellites,
    },
  });
  expect(decodeVector(cases.barometer)).toEqual({
    kind: "barometer",
    telemetry: {
      altitudeM: cases.barometer.decoded.altitude_m,
      verticalSpeedMps: cases.barometer.decoded.vertical_speed_mps,
    },
  });
  expect(decodeVector(cases.link_statistics)).toEqual({
    kind: "link",
    link: {
      uplinkRssi1Dbm: cases.link_statistics.decoded.uplink_rssi_1_dbm,
      uplinkRssi2Dbm: cases.link_statistics.decoded.uplink_rssi_2_dbm,
      uplinkLinkQuality: cases.link_statistics.decoded.uplink_link_quality,
      uplinkSnrDb: cases.link_statistics.decoded.uplink_snr_db,
      activeAntenna: cases.link_statistics.decoded.active_antenna,
      rfMode: cases.link_statistics.decoded.rf_mode,
      uplinkTxPowerRaw: cases.link_statistics.decoded.uplink_tx_power,
      downlinkRssiDbm: cases.link_statistics.decoded.downlink_rssi_dbm,
      downlinkLinkQuality: cases.link_statistics.decoded.downlink_link_quality,
      downlinkSnrDb: cases.link_statistics.decoded.downlink_snr_db,
    },
  });
  expect(decodeVector(cases.flight_mode)).toEqual({
    kind: "flightMode",
    telemetry: { mode: cases.flight_mode.decoded.mode },
  });
});
