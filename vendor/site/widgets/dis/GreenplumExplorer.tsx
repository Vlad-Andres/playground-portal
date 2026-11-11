"use client";

import { useMemo, useState } from "react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

interface SaleRow {
  transId: number;
  date: string;
  amount: string;
  region: "europe" | "asia" | "usa";
}

const SALES: SaleRow[] = [
  { transId: 1, date: "2008-01-05", amount: "120.00", region: "europe" },
  { transId: 2, date: "2008-01-17", amount: "45.50", region: "asia" },
  { transId: 3, date: "2008-01-28", amount: "310.00", region: "usa" },
  { transId: 4, date: "2008-02-02", amount: "88.25", region: "europe" },
  { transId: 5, date: "2008-02-14", amount: "15.00", region: "usa" },
  { transId: 6, date: "2008-02-21", amount: "225.75", region: "asia" },
  { transId: 7, date: "2008-03-03", amount: "64.00", region: "europe" },
  { transId: 8, date: "2008-03-11", amount: "140.40", region: "usa" },
  { transId: 9, date: "2008-03-19", amount: "99.99", region: "asia" },
  { transId: 10, date: "2008-01-09", amount: "52.10", region: "usa" },
  { transId: 11, date: "2008-02-27", amount: "78.00", region: "europe" },
  { transId: 12, date: "2008-03-30", amount: "410.00", region: "asia" },
];

const SEGMENTS = [0, 1, 2];
const PARTITIONS = [
  { id: "jan08", label: "jan08", month: "01" },
  { id: "feb08", label: "feb08", month: "02" },
  { id: "mar08", label: "mar08", month: "03" },
];
const REGIONS: SaleRow["region"][] = ["europe", "asia", "usa"];

export function GreenplumExplorer() {
  const [distribution, setDistribution] = useState<"hash" | "random">("hash");
  const [segment, setSegment] = useState(0);

  const bySegment = useMemo(() => {
    const buckets: SaleRow[][] = [[], [], []];
    SALES.forEach((row, index) => {
      const target = distribution === "hash" ? row.transId % SEGMENTS.length : index % SEGMENTS.length;
      buckets[target].push(row);
    });
    return buckets;
  }, [distribution]);

  const rows = bySegment[segment];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["hash", "random"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setDistribution(value)}
            aria-pressed={distribution === value}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
              distribution === value
                ? "border-brand/50 bg-brand-soft text-brand-strong"
                : "border-line bg-surface text-muted hover:border-brand/40",
            )}
          >
            {value === "hash" ? "DISTRIBUTED BY (trans_id)" : "DISTRIBUTED RANDOMLY"}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">
          Segment nodes — this is the sharding decision. Click one to open it.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SEGMENTS.map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSegment(index)}
              aria-pressed={segment === index}
              className={cn(
                "grid gap-1.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                segment === index
                  ? "border-brand/50 bg-brand-soft"
                  : "border-line bg-surface hover:border-brand/40",
              )}
            >
              <span className="flex items-center justify-between">
                <span className={cn("text-sm font-semibold", segment === index ? "text-brand-strong" : "text-ink")}>
                  seg{index}
                </span>
                <span className="font-mono text-xs text-faint">{bySegment[index].length} rows</span>
              </span>
              <span className="flex flex-wrap gap-1">
                {bySegment[index].map((row) => (
                  <span
                    key={row.transId}
                    className="rounded border border-line bg-sunken px-1.5 font-mono text-[10px] text-muted"
                  >
                    {row.transId}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">
          Inside seg{segment} — this is the partitioning decision, local to the segment
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {PARTITIONS.map((partition) => {
            const partitionRows = rows.filter((row) => row.date.slice(5, 7) === partition.month);

            return (
              <div key={partition.id} className="grid content-start gap-2 rounded-xl border border-line bg-surface p-3">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-brand">{partition.label}</span>
                  <span className="text-[10px] text-faint">RANGE on date</span>
                </p>

                {partitionRows.length === 0 ? (
                  <p className="text-xs text-faint">empty in this segment</p>
                ) : (
                  <div className="grid gap-1.5">
                    {REGIONS.map((region) => {
                      const regionRows = partitionRows.filter((row) => row.region === region);
                      if (regionRows.length === 0) return null;

                      return (
                        <div key={region} className="rounded-lg border border-accent/25 bg-accent-soft/40 px-2.5 py-1.5">
                          <p className="flex items-baseline justify-between gap-2">
                            <span className="font-mono text-[11px] font-medium text-accent">{region}</span>
                            <span className="text-[10px] text-faint">LIST on region</span>
                          </p>
                          {regionRows.map((row) => (
                            <p key={row.transId} className="font-mono text-[11px] text-muted">
                              #{row.transId} · {row.date} · {row.amount}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rows total" value={String(SALES.length)} />
        <Stat label="Segments" value={String(SEGMENTS.length)} hint="DISTRIBUTED BY" tone="brand" />
        <Stat label="Partitions each" value={String(PARTITIONS.length)} hint="PARTITION BY RANGE" />
        <Stat label="Subpartitions" value={String(REGIONS.length)} hint="SUBPARTITION BY LIST" />
      </div>

      <p className="text-sm text-muted">
        Switching to <span className="font-mono">DISTRIBUTED RANDOMLY</span> spreads the rows evenly
        by round robin, but a query filtering on <span className="font-mono">trans_id</span> can no
        longer be answered by a single segment — and a join on it stops being co-located.
      </p>
    </div>
  );
}
