import React, { useState } from "react";
import { Copy } from "lucide-react";
import { buildAerialKitMissionBriefing } from "../utils/aerialKitMissionBriefing";

export default function AerialKitMissionBriefingButton({
  mission,
  inventory,
  proximity,
}) {
  const [message, setMessage] = useState("");
  const briefing = buildAerialKitMissionBriefing({
    mission,
    inventory,
    proximity,
  });
  if (briefing.status !== "ok") return null;

  const copyBriefing = async () => {
    if (!navigator.clipboard?.writeText) {
      setMessage("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(briefing.text);
      setMessage("Mission briefing copied. Nothing was sent to hardware.");
    } catch {
      setMessage("The browser refused clipboard access.");
    }
  };

  return (
    <div className="aerial-kit-mission-briefing">
      <button type="button" onClick={copyBriefing}>
        <Copy size={15} aria-hidden="true" />
        Copy mission briefing
      </button>
      <span role="status" aria-live="polite">{message}</span>
    </div>
  );
}
