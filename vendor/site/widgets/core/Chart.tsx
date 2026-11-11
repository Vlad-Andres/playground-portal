"use client";

import { useEffect, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import type { ChartProps } from "@core/widgets";
import { useTheme } from "@site/hooks/useTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const SERIES_VARS = ["--brand", "--accent", "--positive", "--info"];

interface Palette {
  series: string[];
  text: string;
  grid: string;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    series: SERIES_VARS.map((name) => read(name, "#4f46e5")),
    text: read("--muted", "#555"),
    grid: read("--line", "#ddd"),
  };
}

/** Bar or line chart from JSON numbers, with the data also available as a table. */
export function Chart({ type, title, xLabel, yLabel, labels, series }: ChartProps) {
  const { theme } = useTheme();
  const [palette, setPalette] = useState<Palette | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- colours come from CSS variables in the browser
    setPalette(readPalette());
  }, [theme]);

  const data = {
    labels,
    datasets: series.map((item, index) => {
      const color = palette?.series[index % SERIES_VARS.length] ?? "#4f46e5";
      return {
        label: item.name,
        data: item.values,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.25,
      };
    }),
  };
  const axis = (label?: string) => ({
    title: { display: Boolean(label), text: label ?? "", color: palette?.text },
    grid: { color: palette?.grid },
    ticks: { color: palette?.text },
  });
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: { legend: { display: series.length > 1, labels: { color: palette?.text } } },
    scales: { x: axis(xLabel), y: axis(yLabel) },
  };

  return (
    <figure className="grid gap-2">
      {title ? <figcaption className="text-sm font-semibold text-ink">{title}</figcaption> : null}
      <div className="relative h-64 w-full sm:h-72">
        {palette ? type === "bar" ? <Bar data={data} options={options} /> : <Line data={data} options={options} /> : null}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Show the numbers</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 font-semibold text-ink">{xLabel ?? ""}</th>
                {series.map((item) => (
                  <th key={item.name} className="px-2 py-1 font-semibold text-ink">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, row) => (
                <tr key={`${label}-${row}`} className="border-t border-line">
                  <td className="px-2 py-1 text-ink">{label}</td>
                  {series.map((item) => (
                    <td key={item.name} className="px-2 py-1 font-mono text-muted tabular-nums">
                      {item.values[row]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
