
function number(value, digits = 0) {
  return value == null ? "—" : Number(value).toFixed(digits);
}

function vector(values, unit) {
  if (!Array.isArray(values) || values.length !== 3) return "—";
  return `${values.map((value) => number(value)).join(" / ")} ${unit}`;
}

function readingRows(sensor) {
  const body = sensor.body;
  if (!body) return [];
  if (sensor.topic === 0) {
    return [
      ["Acceleration", vector(body.accelMg, "mg")],
      ["Angular rate", vector(body.gyroMradS, "mrad/s")],
      ["Alignment", vector(body.alignDeg, "°")],
      ["Samples / errors", `${number(body.samples)} / ${number(body.errors)}`],
      [
        "Sensor state",
        body.absent === 0
          ? "Configured"
          : body.absentReason || `Absent reason ${number(body.absent)}`,
      ],
    ];
  }
  if (sensor.topic === 1) {
    return [
      ["Pressure", `${number(body.pressurePa)} Pa`],
      ["Temperature", `${number(body.temperatureC, 2)} °C`],
      [
        "Height above reference",
        body.haveReference ? `${number(body.heightCm / 100, 2)} m` : "No reference",
      ],
      [
        "Fused height",
        body.haveGpsReference ? `${number(body.fusedCm / 100, 2)} m` : "No GPS reference",
      ],
      ["Samples / errors / fails", `${number(body.samples)} / ${number(body.errors)} / ${number(body.fails)}`],
    ];
  }
  if (sensor.topic === 2) {
    return [
      [
        "Distance",
        body.distanceMm < 0 ? "Out of range" : `${number(body.distanceMm)} mm`,
      ],
      ["Maximum range", `${number(body.maxMm)} mm`],
      ["Reading age", `${number(body.ageMs)} ms`],
      ["Samples", number(body.samples)],
      [
        "Out of range / rejected",
        `${number(body.outOfRange)} / ${number(body.rejected)}`,
      ],
    ];
  }
  if (sensor.topic === 3) {
    return [
      [
        "Pack",
        body.haveReading
          ? `${number(body.cells)} cells · ${number(body.volts, 2)} V · ${number(body.voltsPerCell, 2)} V/cell`
          : "No pack reading",
      ],
      [
        "Battery state",
        body.stateName || `State ${number(body.state)}`,
      ],
      [
        "Sense pin",
        body.pinMv < 0 ? "No pin reading" : `${number(body.pinMv)} mV`,
      ],
      [
        "Warn / critical",
        `${number(body.warnCellV, 2)} / ${number(body.criticalCellV, 2)} V per cell`,
      ],
      ["Samples / rejected", `${number(body.samples)} / ${number(body.rejected)}`],
    ];
  }
  if (sensor.topic === 4) {
    return [
      ["Fix", body.haveFix ? body.fixName || `Fix type ${number(body.fixType)}` : "No position fix"],
      ["Satellites", number(body.satellites)],
      [
        "Position",
        body.haveFix
          ? `${number(body.lat, 7)}, ${number(body.lon, 7)}`
          : "Not shown without a fix",
      ],
      [
        "Altitude / ground speed",
        body.haveFix
          ? `${number(body.altMslMm / 1000, 2)} m · ${number(body.speedMmS / 1000, 2)} m/s`
          : "Not shown without a fix",
      ],
      [
        "Home",
        body.haveHome
          ? `${number(body.homeDistanceM)} m · ${number(body.homeBearingDeg, 1)}°`
          : "No home recorded",
      ],
    ];
  }
  return [];
}

export default function AerialKitSensorReadings({ sensor }) {
  const rows = readingRows(sensor);
  if (!rows.length) return null;
  return (
    <dl
      className="aerial-kit-sensor-readings"
      aria-label={`${sensor.topicName || `Topic ${sensor.topic}`} reported readings`}
    >
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
