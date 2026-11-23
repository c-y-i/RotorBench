
function measuredValue(value, suffix) {
  return value == null ? "Not reported" : `${value}${suffix}`;
}

export default function AerialKitMotorTelemetryReadings({ telemetry }) {
  if (!telemetry || telemetry.status !== "ok" || !telemetry.motors.length) {
    return null;
  }
  return (
    <ol
      className="aerial-kit-motor-readings"
      aria-label="Board-reported ESC telemetry"
    >
      {telemetry.motors.map((motor) => (
        <li
          key={motor.index}
          className={motor.measured ? "is-measured" : "is-unheard"}
        >
          <div>
            <strong>Motor {motor.index + 1}</strong>
            <em>{motor.measured ? "Answering" : "Not heard"}</em>
          </div>
          {motor.measured ? (
            <dl>
              <div>
                <dt>Electrical speed</dt>
                <dd>{motor.erpm} eRPM</dd>
              </div>
              <div>
                <dt>Mechanical speed</dt>
                <dd>{measuredValue(motor.rpm, " RPM")}</dd>
              </div>
              <div>
                <dt>Temperature / session max</dt>
                <dd>
                  {motor.temperature == null
                    ? "Not reported"
                    : `${motor.temperature} / ${motor.maxTemperature} °C`}
                </dd>
              </div>
              <div>
                <dt>Voltage / current</dt>
                <dd>
                  {motor.millivolts == null ? "Voltage not reported" : `${motor.millivolts} mV`}
                  {" · "}
                  {motor.milliamps == null ? "current not reported" : `${motor.milliamps} mA`}
                </dd>
              </div>
              <div>
                <dt>Window packets / invalid</dt>
                <dd>{motor.packets} / {motor.invalid}</dd>
              </div>
            </dl>
          ) : (
            <p>
              No ESC telemetry in this window. Window counts: {motor.packets} packets,{" "}
              {motor.invalid} invalid.
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
