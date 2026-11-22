import React from "react";

const RAD_TO_DEG = 180 / Math.PI;

function bounded(value, limit) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-limit, Math.min(limit, value));
}

export default function SerialAttitudeIndicator({
  rollRad,
  pitchRad,
  yawRad,
}) {
  const rollDeg = Number.isFinite(rollRad) ? rollRad * RAD_TO_DEG : 0;
  const pitchDeg = Number.isFinite(pitchRad) ? pitchRad * RAD_TO_DEG : 0;
  const yawDeg = Number.isFinite(yawRad) ? yawRad * RAD_TO_DEG : 0;
  const visualRoll = bounded(rollDeg, 60);
  const visualPitch = bounded(pitchDeg, 35) * 0.7;

  return (
    <div className="serial-attitude-observation">
      <div
        className="serial-attitude-instrument"
        role="img"
        aria-label={`Observed serial attitude. Roll ${rollDeg.toFixed(1)} degrees, pitch ${pitchDeg.toFixed(1)} degrees, yaw ${yawDeg.toFixed(1)} degrees. Read-only observation, not flight verification.`}
      >
        <div
          className="serial-attitude-horizon"
          aria-hidden="true"
          style={{
            "--attitude-roll": `${-visualRoll}deg`,
            "--attitude-pitch": `${visualPitch}px`,
          }}
        >
          <span className="serial-attitude-sky" />
          <span className="serial-attitude-ground" />
          <span className="serial-attitude-line" />
        </div>
        <span className="serial-attitude-reticle" aria-hidden="true" />
        <span className="serial-attitude-scale" aria-hidden="true">0</span>
      </div>
      <div className="serial-attitude-readout">
        <dl>
          <div><dt>Roll</dt><dd>{rollDeg.toFixed(1)}°</dd></div>
          <div><dt>Pitch</dt><dd>{pitchDeg.toFixed(1)}°</dd></div>
          <div><dt>Yaw</dt><dd>{yawDeg.toFixed(1)}°</dd></div>
        </dl>
        <p>
          Read-only CRSF observation. This does not calibrate the IMU or verify
          flight readiness.
        </p>
      </div>
    </div>
  );
}
