import React, { useMemo } from "react";
import { Activity, Clock3, RadioTower } from "lucide-react";
import {
  buildRadioLinkTiming,
  formatRadioTimingInterval,
} from "../utils/radioLinkTiming";
import "../styles/radio-setup.css";

export default function RadioLinkTiming({
  packetRateMode,
  telemetryRatio,
  receiverTimeoutMs,
}) {
  const timing = useMemo(
    () => buildRadioLinkTiming(
      { packetRateMode, telemetryRatio },
      { receiverTimeoutMs },
    ),
    [packetRateMode, receiverTimeoutMs, telemetryRatio],
  );

  return (
    <section
      className={`radio-timing-plan ${timing.reviewRequired ? "is-review" : ""}`}
      aria-labelledby="radio-timing-title"
    >
      <div className="radio-timing-heading">
        <Activity size={17} aria-hidden="true" />
        <span>
          <strong id="radio-timing-title">Link timing</strong>
          <small>Nominal planning cadence · RF delivery unverified</small>
        </span>
        <em>{timing.reviewRequired ? "Review timeout" : "Plan only"}</em>
      </div>
      <dl>
        <div>
          <dt>Control frame</dt>
          <dd>{formatRadioTimingInterval(timing.controlIntervalMs)}</dd>
        </div>
        <div>
          <dt>Telemetry slot</dt>
          <dd>
            {timing.telemetryIntervalMs != null
              ? formatRadioTimingInterval(timing.telemetryIntervalMs)
              : timing.telemetryRatioStatus === "off"
                ? "Off"
                : "Target-specific"}
          </dd>
        </div>
        <div>
          <dt>Timeout window</dt>
          <dd>
            {timing.timeoutFrames != null
              ? `${timing.timeoutFrames.toFixed(2)} frames`
              : "Not configured"}
          </dd>
        </div>
      </dl>
      <p>
        {timing.reviewRequired
          ? `The staged ${timing.receiverTimeoutMs} ms receiver timeout spans fewer than two nominal control frames. Review loss handling before deployment.`
          : "This compares staged timing values only. It does not measure airtime, RF delivery, frame loss, or receiver timeout behavior."}
      </p>
      <span className="radio-timing-source">
        <Clock3 size={13} aria-hidden="true" />
        <RadioTower size={13} aria-hidden="true" />
        Control {timing.packetRateMode} · telemetry {timing.telemetryRatio || timing.telemetryRatioStatus}
      </span>
    </section>
  );
}
