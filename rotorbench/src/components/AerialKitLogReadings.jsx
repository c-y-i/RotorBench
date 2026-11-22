import React from "react";
import { Activity } from "lucide-react";

export default function AerialKitLogReadings({
  inventory,
  sample,
  sourceLabels,
}) {
  return (
    <>
      {inventory && (
        <dl
          className="aerial-kit-log-inventory"
          aria-label="Board-reported log sources"
        >
          {inventory.map((entry) => (
            <div key={entry.requestedSource}>
              <dt>{sourceLabels[entry.requestedSource]}</dt>
              <dd>
                {entry.status === "available"
                  ? entry.count
                    ? `${entry.count} record${entry.count === 1 ? "" : "s"}`
                    : "Available · empty"
                  : "Not available on this build"}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {sample?.noStream && (
        <div className="aerial-kit-preflight-empty" role="note">
          <Activity size={16} aria-hidden="true" />
          <span>
            <strong>No frames will be sent</strong>
            <small>
              The board accepted the request with a zero range or rate. That is
              not a completed record stream.
            </small>
          </span>
        </div>
      )}
      {sample?.frames?.length > 0 && (
        <ol
          className="aerial-kit-log-frames"
          aria-label="Bounded flight-log sample"
        >
          {sample.frames.map((frame, frameIndex) => (
            <li
              key={`${frame.status}-${frame.index}-${frameIndex}`}
              className={`is-${frame.status}`}
            >
              {frame.status === "record" ? (
                <>
                  <div>
                    <strong>Record #{frame.index}</strong>
                    <em>v{frame.record.version} · {frame.record.bytes} B</em>
                  </div>
                  <dl>
                    <div>
                      <dt>Time</dt>
                      <dd>{frame.record.timeMs} ms</dd>
                    </div>
                    <div>
                      <dt>Attitude</dt>
                      <dd>
                        {frame.record.rollDeg.toFixed(1)} /{" "}
                        {frame.record.pitchDeg.toFixed(1)} /{" "}
                        {frame.record.yawDeg.toFixed(1)}°
                      </dd>
                    </div>
                    <div>
                      <dt>Altitude</dt>
                      <dd>{frame.record.altMm} mm</dd>
                    </div>
                    <div>
                      <dt>Motors</dt>
                      <dd>{frame.record.motors.join(" / ")}</dd>
                    </div>
                    <div>
                      <dt>Gyro</dt>
                      <dd>{frame.record.gyro.join(" / ")}</dd>
                    </div>
                    <div>
                      <dt>Battery</dt>
                      <dd>
                        {frame.record.vbatMv == null
                          ? "Not recorded"
                          : `${frame.record.vbatMv} mV`}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div>
                  <strong>
                    {frame.status === "done" ? "DONE" : "HOLE"} at #{frame.index}
                  </strong>
                  <em>
                    {frame.status === "done"
                      ? "Range complete"
                      : "Board refused this record"}
                  </em>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
