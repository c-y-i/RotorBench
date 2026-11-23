
const SECTION_LABELS = [
  "IMU",
  "Estimator",
  "PID",
  "Mixer",
  "Output",
];

export default function AerialKitPerformanceReadings({ performance }) {
  if (!performance || performance.status !== "ok") return null;
  return (
    <>
      <dl
        className="aerial-kit-perf-window"
        aria-label="Board-reported loop performance"
      >
        <div>
          <dt>Period last / min / max</dt>
          <dd>
            {performance.periodLastUs} / {performance.periodMinUs} /{" "}
            {performance.periodMaxUs} µs
          </dd>
        </div>
        <div>
          <dt>Nominal period</dt>
          <dd>{performance.nominalUs} µs</dd>
        </div>
        <div>
          <dt>Jitter p50 / p99 / max</dt>
          <dd>
            {performance.jitterP50Us} / {performance.jitterP99Us} /{" "}
            {performance.jitterMaxUs} µs
          </dd>
        </div>
        <div>
          <dt>Late / over budget</dt>
          <dd>
            {performance.late} / {performance.jitterOver}
          </dd>
        </div>
        <div>
          <dt>Timed samples</dt>
          <dd>{performance.samples}</dd>
        </div>
        <div>
          <dt>Instrumented load</dt>
          <dd>
            {(performance.loadPermille / 10).toFixed(1)}% ·{" "}
            {performance.loadPermille}‰
          </dd>
        </div>
      </dl>
      <ol aria-label="Profiled control-loop sections">
        {performance.sectionAvgUsX10.map((average, index) => (
          <li key={SECTION_LABELS[index] || `section-${index}`}>
            <span>{SECTION_LABELS[index] || `Section ${index + 1}`}</span>
            <strong>{(average / 10).toFixed(1)} µs avg</strong>
            <small>{performance.sectionMaxUs[index]} µs max</small>
          </li>
        ))}
      </ol>
    </>
  );
}
