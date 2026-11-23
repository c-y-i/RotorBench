import { useState } from "react";
import { Download } from "lucide-react";
import { buildAerialKitMissionRouteExport } from "../utils/aerialKitMissionRouteExport";

export default function AerialKitMissionRouteDownloadButton({
  mission,
  inventory,
  proximity,
}) {
  const [message, setMessage] = useState("");
  const result = buildAerialKitMissionRouteExport({
    mission,
    inventory,
    proximity,
  });
  if (result.status !== "ok") return null;

  const downloadRoute = () => {
    try {
      const blob = new Blob(
        [JSON.stringify(result.artifact, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rotorbench-aerial-kit-mission-route-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Mission route downloaded. Nothing was sent to hardware.");
    } catch {
      setMessage("The browser could not create the mission-route file.");
    }
  };

  return (
    <div className="aerial-kit-mission-action">
      <button type="button" onClick={downloadRoute}>
        <Download size={15} aria-hidden="true" />
        Download mission route
      </button>
      <span role="status" aria-live="polite">{message}</span>
    </div>
  );
}
