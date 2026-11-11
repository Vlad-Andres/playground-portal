"use client";

import { useMemo, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { useTheme } from "@site/hooks/useTheme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const SAMPLE_SIMILARITIES = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

function candidateProbability(similarity: number, rows: number, bands: number) {
  return 1 - (1 - similarity ** rows) ** bands;
}

export function BandTuner() {
  const { theme } = useTheme();
  const [bands, setBands] = useState(20);
  const [rows, setRows] = useState(5);
  const [target, setTarget] = useState(0.8);

  const threshold = (1 / bands) ** (1 / rows);
  const hitRate = candidateProbability(target, rows, bands);

  const palette = useMemo(() => {
    const dark = theme === "dark";
    return {
      line: dark ? "#a5b4fc" : "#4f46e5",
      fill: dark ? "rgba(165,180,252,0.16)" : "rgba(79,70,229,0.12)",
      marker: dark ? "#fbbf24" : "#d97706",
      grid: dark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.18)",
      text: dark ? "#cbd5e1" : "#475569",
    };
  }, [theme]);

  const chartData = useMemo(() => {
    const points = Array.from({ length: 101 }, (_, index) => {
      const similarity = index / 100;
      return { x: similarity, y: candidateProbability(similarity, rows, bands) };
    });

    return {
      datasets: [
        {
          label: `1 − (1 − s^${rows})^${bands}`,
          data: points,
          borderColor: palette.line,
          backgroundColor: palette.fill,
          borderWidth: 2.5,
          pointRadius: 0,
          fill: true,
          tension: 0.1,
        },
        {
          label: `threshold ≈ ${threshold.toFixed(3)}`,
          data: [
            { x: threshold, y: 0 },
            { x: threshold, y: 1 },
          ],
          borderColor: palette.marker,
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [bands, rows, threshold, palette]);

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 1,
          title: { display: true, text: "Jaccard similarity s", color: palette.text },
          grid: { color: palette.grid },
          ticks: { color: palette.text },
        },
        y: {
          min: 0,
          max: 1,
          title: { display: true, text: "P(candidate pair)", color: palette.text },
          grid: { color: palette.grid },
          ticks: { color: palette.text },
        },
      },
      plugins: {
        legend: { labels: { color: palette.text, boxWidth: 12, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (context) =>
              `s = ${Number(context.parsed.x).toFixed(2)} → P = ${Number(context.parsed.y ?? 0).toFixed(4)}`,
          },
        },
      },
    }),
    [palette],
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <RangeField
          label="Bands b"
          value={bands}
          min={1}
          max={50}
          display={`b = ${bands}`}
          onChange={setBands}
        />
        <RangeField
          label="Rows per band r"
          value={rows}
          min={1}
          max={20}
          display={`r = ${rows}`}
          onChange={setRows}
        />
        <RangeField
          label="Inspect similarity"
          value={target}
          min={0}
          max={1}
          step={0.01}
          display={`s = ${target.toFixed(2)}`}
          onChange={setTarget}
        />
      </div>

      <div className="h-64 sm:h-72">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Signature length" value={String(bands * rows)} hint="n = b · r" tone="brand" />
        <Stat label="Threshold" value={threshold.toFixed(3)} hint="≈ (1/b)^(1/r)" />
        <Stat
          label={`P(candidate | s=${target.toFixed(2)})`}
          value={hitRate.toFixed(4)}
          tone={hitRate > 0.5 ? "positive" : "neutral"}
        />
        <Stat
          label="False negatives"
          value={(1 - hitRate).toFixed(4)}
          hint="missed pairs at that similarity"
          tone={1 - hitRate > 0.1 ? "warning" : "neutral"}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-sunken text-xs">
              <th className="px-3 py-2 text-left font-semibold">s</th>
              {SAMPLE_SIMILARITIES.map((similarity) => (
                <th key={similarity} className="px-3 py-2 font-mono font-semibold">
                  {similarity.toFixed(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">P(candidate)</td>
              {SAMPLE_SIMILARITIES.map((similarity) => (
                <td key={similarity} className="px-3 py-2 text-center font-mono text-xs tabular-nums text-muted">
                  {candidateProbability(similarity, rows, bands).toFixed(4)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted">
        Larger <span className="font-mono">r</span> pushes the threshold up and kills false positives;
        larger <span className="font-mono">b</span> pulls it down and rescues false negatives. Keep{" "}
        <span className="font-mono">b · r</span> equal to the signature length you can afford.
      </p>
    </div>
  );
}
