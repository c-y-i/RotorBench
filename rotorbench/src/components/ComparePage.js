import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Check,
  CircleAlert,
  Download,
  FileCheck2,
  Link2,
  ListFilter,
  Printer,
  Scale,
  Settings2,
} from "lucide-react";
import {
  comparisonReportFilename,
  comparisonRows,
  createComparisonReport,
  summarizeBuild,
} from "../utils/buildComparison";
import {
  createBuildShareToken,
  parseBuildShareToken,
} from "../utils/buildLink";
import "../styles/compare.css";

const physicalFitLabels = {
  verified: "Physical fit verified",
  measured: "Physical fit uses local measurements",
  unverified: "Fit needs review",
  conflict: "Physical fit conflict",
  pending: "Fit not checked",
};

const electricalFitLabels = {
  verified: "Electrical limits verified",
  unverified: "Electrical limits need review",
  conflict: "Electrical limit conflict",
  pending: "Electrical limits not checked",
};

const thrustDataLabels = {
  estimated: "Estimated thrust data",
  available: "Thrust data available",
  unavailable: "Thrust data unavailable",
  "not-selected": "Thrust data not selected",
};

export default function ComparePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [changesOnly, setChangesOnly] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const leftToken = searchParams.get("left") || "";
  const rightToken = searchParams.get("right") || "";
  const sharedComparison = useMemo(() => {
    if (!leftToken || !rightToken) return { builds: [], error: "" };
    try {
      const decode = (token, index) => {
        const parsed = parseBuildShareToken(token);
        return {
          id: `shared-build-${index + 1}`,
          name: `Shared build ${index === 0 ? "A" : "B"}`,
          componentIds: parsed.componentIds,
          geometryOverrides: parsed.geometryOverrides,
        };
      };
      return {
        builds: [
          decode(leftToken, 0),
          decode(rightToken, 1),
        ],
        error: "",
      };
    } catch (error) {
      return {
        builds: [],
        error: `Could not load shared comparison: ${error.message}`,
      };
    }
  }, [leftToken, rightToken]);
  const builds = location.state?.builds || sharedComparison.builds;

  if (builds.length < 2) {
    return (
      <div className="compare-page">
        <header className="compare-page-header">
          <div>
            <h1>Compare builds</h1>
            <p>Select two saved builds from the Saved page to compare them.</p>
          </div>
        </header>
        <div className="compare-empty">
          <p>
            {sharedComparison.error
              || "Two build configurations are required for this view."}
          </p>
          <button type="button" className="action-btn save" onClick={() => navigate("/saved")}>
            <ArrowLeft size={17} aria-hidden="true" />
            Back to saved builds
          </button>
        </div>
      </div>
    );
  }

  const left = summarizeBuild(builds[0]);
  const right = summarizeBuild(builds[1]);
  const rows = comparisonRows(left, right);
  const changedRows = rows.filter((row) => row.changed);
  const visibleRows = changesOnly ? changedRows : rows;

  const exportComparison = () => {
    const report = createComparisonReport(left, right, rows);
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = comparisonReportFilename(left, right);
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareComparison = async () => {
    try {
      const url = new URL("/compare", window.location.origin);
      url.searchParams.set("left", createBuildShareToken({
        componentIds: builds[0].componentIds,
        geometryOverrides: builds[0].geometryOverrides,
      }));
      url.searchParams.set("right", createBuildShareToken({
        componentIds: builds[1].componentIds,
        geometryOverrides: builds[1].geometryOverrides,
      }));
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard access is unavailable");
      }
      await navigator.clipboard.writeText(url.toString());
      setShareMessage("Comparison link copied · catalog configurations only");
      setTimeout(() => setShareMessage(""), 4000);
    } catch (error) {
      setShareMessage(`Could not copy comparison link: ${error.message}`);
    }
  };

  const valueFor = (row, side) => {
    const value = row[side];
    if (row.format) return row.format(value);
    if (!value) return "Not selected";
    return value.name || String(value);
  };

  const advantage = (row) => {
    if (!row.lowerIsBetter || typeof row.left !== "number" || typeof row.right !== "number") {
      return null;
    }
    if (row.left === row.right) return "tie";
    return row.left < row.right ? "left" : "right";
  };

  return (
    <div className="compare-page">
      <header className="compare-page-header">
        <div>
          <h1>Compare builds</h1>
          <p>
            Catalog-level comparison of two saved configurations. Performance values
            require a separate analysis run.
          </p>
        </div>
        <div className="compare-header-actions">
          <span className="compare-change-summary">
            {changedRows.length
              ? `${changedRows.length} difference${changedRows.length === 1 ? "" : "s"}`
              : "No catalog differences"}
          </span>
          <button
            type="button"
            className="compare-filter"
            aria-pressed={changesOnly}
            disabled={changedRows.length === 0}
            onClick={() => setChangesOnly((current) => !current)}
          >
            <ListFilter size={16} aria-hidden="true" />
            {changesOnly ? "Show all" : "Changed only"}
          </button>
          <button type="button" className="compare-export" onClick={exportComparison}>
            <Download size={17} aria-hidden="true" />
            Export comparison
          </button>
          <button type="button" className="compare-export" onClick={shareComparison}>
            <Link2 size={17} aria-hidden="true" />
            Share comparison
          </button>
          <button type="button" className="compare-print" onClick={() => window.print()}>
            <Printer size={17} aria-hidden="true" />
            Print
          </button>
          {shareMessage && (
            <span className="compare-change-summary" role="status">
              {shareMessage}
            </span>
          )}
        </div>
      </header>

      <div className="compare-build-headings">
        {[left, right].map((build) => (
          <section key={build.id}>
            <span>{build.selectedCount}/7 parts</span>
            <h2>{build.name}</h2>
            {build.note && <p>{build.note}</p>}
            <div className="compare-build-statuses">
              <span className={`is-${build.physicalFitStatus}`}>
                {build.physicalFitStatus === "verified"
                  ? <Check size={13} aria-hidden="true" />
                  : <CircleAlert size={13} aria-hidden="true" />}
                {physicalFitLabels[build.physicalFitStatus]}
              </span>
              <span className={`is-${build.electricalFitStatus}`}>
                {build.electricalFitStatus === "verified"
                  ? <Check size={13} aria-hidden="true" />
                  : <CircleAlert size={13} aria-hidden="true" />}
                {electricalFitLabels[build.electricalFitStatus]}
              </span>
              <span>
                <FileCheck2 size={13} aria-hidden="true" />
                {build.sourceBackedCount}/{build.selectedCount} sourced
              </span>
              <span className={`is-performance-${build.thrustDataStatus}`}>
                <ChartNoAxesCombined size={13} aria-hidden="true" />
                {thrustDataLabels[build.thrustDataStatus]}
              </span>
              <span className={`is-plan-${build.hardwareReadinessStatus}`}>
                <Settings2 size={13} aria-hidden="true" />
                {build.hardwarePlanStatus === "not-configured" && !build.hasHardwareParts
                  ? "No hardware plan"
                  : build.hardwareReadinessLabel}
              </span>
              {build.takeoffEnvelopeStatus !== "unavailable" && (
                <span className={`is-envelope-${build.takeoffEnvelopeStatus}`}>
                  <Scale size={13} aria-hidden="true" />
                  {build.takeoffEnvelopeShortLabel}
                </span>
              )}
            </div>
            <div>
              <button type="button" onClick={() => navigate("/analysis", { state: { build: builds.find((item) => item.id === build.id) } })}>
                <ChartNoAxesCombined size={16} aria-hidden="true" />
                Analyze
              </button>
              <button type="button" onClick={() => navigate("/setup", { state: { build: builds.find((item) => item.id === build.id) } })}>
                <Settings2 size={16} aria-hidden="true" />
                Hardware
              </button>
            </div>
          </section>
        ))}
      </div>

      <p className="compare-scroll-hint">Scroll the table horizontally to see both builds.</p>
      <div
        className="compare-table-wrap"
        role="region"
        aria-label="Build comparison table"
        tabIndex={0}
      >
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Specification</th>
              <th scope="col">{left.name}</th>
              <th scope="col">{right.name}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const winner = advantage(row);
              return (
                <tr key={row.id} className={row.changed ? "is-changed" : ""}>
                  <th scope="row">
                    <span>{row.label}</span>
                    {row.changed && <small>Changed</small>}
                  </th>
                  <td className={winner === "left" ? "is-better" : ""}>{valueFor(row, "left")}</td>
                  <td className={winner === "right" ? "is-better" : ""}>{valueFor(row, "right")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="compare-footnote">
        Weight uses catalog parts plus a 50 g planning allowance for wiring, fasteners,
        and camera hardware; this is not a measured takeoff weight. Motor and propeller
        quantities follow the selected frame's motor count. Price uses catalog values.
        Fit status reports only catalogued checks, and saved hardware plans remain local
        drafts. This comparison does not replace a full analysis.
      </p>
    </div>
  );
}
