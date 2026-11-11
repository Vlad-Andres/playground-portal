"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

export interface Site {
  id: string;
  weight: number;
  value: number;
  version: number;
}

const INITIAL_SITES: Site[] = [
  { id: "S1", weight: 3, value: 1000, version: 1 },
  { id: "S2", weight: 1, value: 1000, version: 1 },
  { id: "S3", weight: 2, value: 1000, version: 1 },
  { id: "S4", weight: 2, value: 1000, version: 1 },
];

interface QuorumLabProps {
  initialSites?: Site[];
  initialReadQuorum?: number;
  initialWriteQuorum?: number;
  instructions?: ReactNode;
}

export function QuorumLab({
  initialSites = INITIAL_SITES,
  initialReadQuorum = 4,
  initialWriteQuorum = 5,
  instructions,
}: QuorumLabProps) {
  const totalWeight = initialSites.reduce((sum, site) => sum + site.weight, 0);
  const [sites, setSites] = useState(initialSites);
  const [readQuorum, setReadQuorum] = useState(initialReadQuorum);
  const [writeQuorum, setWriteQuorum] = useState(initialWriteQuorum);
  const [mode, setMode] = useState<"read" | "write">("write");
  const [locked, setLocked] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);

  const overlapHolds = readQuorum + writeQuorum > totalWeight;
  const writeHolds = 2 * writeQuorum > totalWeight;
  const configValid = overlapHolds && writeHolds;

  const lockedWeight = sites
    .filter((site) => locked.includes(site.id))
    .reduce((sum, site) => sum + site.weight, 0);
  const required = mode === "read" ? readQuorum : writeQuorum;
  const quorumReached = lockedWeight >= required;

  const latestVersion = useMemo(
    () => Math.max(...sites.map((site) => site.version)),
    [sites],
  );

  const toggle = (id: string) => {
    setOutcome(null);
    setLocked((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );
  };

  const execute = () => {
    if (!quorumReached) return;

    if (mode === "write") {
      const nextVersion = latestVersion + 1;
      setSites((previous) =>
        previous.map((site) =>
          locked.includes(site.id)
            ? { ...site, value: site.value + 100, version: nextVersion }
            : site,
        ),
      );
      setOutcome(`Wrote version ${nextVersion} to ${locked.join(", ")}.`);
    } else {
      const lockedSites = sites.filter((site) => locked.includes(site.id));
      const best = lockedSites.reduce((a, b) => (b.version > a.version ? b : a));
      const isLatest = best.version === latestVersion;
      setOutcome(
        isLatest
          ? `Read ${best.value} from ${best.id} (version ${best.version}) — the latest write.`
          : `Read a stale ${best.value} (version ${best.version}); the latest is version ${latestVersion}. The read quorum missed the write.`,
      );
    }
    setLocked([]);
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <RangeField
          label="Read quorum Qr"
          value={readQuorum}
          min={1}
          max={totalWeight}
          display={`Qr = ${readQuorum}`}
          onChange={(value) => {
            setReadQuorum(value);
            setOutcome(null);
          }}
        />
        <RangeField
          label="Write quorum Qw"
          value={writeQuorum}
          min={1}
          max={totalWeight}
          display={`Qw = ${writeQuorum}`}
          onChange={(value) => {
            setWriteQuorum(value);
            setOutcome(null);
          }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { label: "Qr + Qw > W", detail: `${readQuorum} + ${writeQuorum} > ${totalWeight}`, met: overlapHolds, why: "every read overlaps the latest write" },
          { label: "2 · Qw > W", detail: `${2 * writeQuorum} > ${totalWeight}`, met: writeHolds, why: "two writes can never proceed at once" },
        ].map((rule) => (
          <div
            key={rule.label}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs",
              rule.met ? "border-positive/35 bg-positive-soft/50" : "border-danger/35 bg-danger-soft/50",
            )}
          >
            {rule.met ? (
              <Check size={14} className="mt-0.5 shrink-0 text-positive" aria-hidden />
            ) : (
              <X size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            )}
            <span className="grid gap-0.5">
              <span className="font-mono font-medium text-ink">
                {rule.label} → {rule.detail}
              </span>
              <span className="text-faint">{rule.why}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Lock sites for a</span>
          {(["read", "write"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setLocked([]);
                setOutcome(null);
              }}
              className={cn(
                "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
                mode === value
                  ? "border-brand/50 bg-brand-soft text-brand-strong"
                  : "border-line bg-surface text-muted hover:border-brand/40",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sites.map((site) => {
            const isLocked = locked.includes(site.id);
            const isStale = site.version < latestVersion;

            return (
              <button
                key={site.id}
                type="button"
                onClick={() => toggle(site.id)}
                aria-pressed={isLocked}
                className={cn(
                  "grid gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  isLocked
                    ? "border-brand/50 bg-brand-soft"
                    : "border-line bg-surface hover:border-brand/40",
                )}
              >
                <span className="flex items-center justify-between text-sm font-semibold text-ink">
                  {site.id}
                  <span className="font-mono text-xs text-faint">w = {site.weight}</span>
                </span>
                <span className="font-mono text-xs text-muted">value {site.value}</span>
                <span className={cn("font-mono text-xs", isStale ? "text-warning" : "text-positive")}>
                  version {site.version}
                  {isStale ? " (stale)" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total weight W" value={String(totalWeight)} />
        <Stat
          label="Locked weight"
          value={`${lockedWeight} / ${required}`}
          hint={`needed for a ${mode}`}
          tone={quorumReached ? "positive" : "warning"}
        />
        <Stat
          label="Configuration"
          value={configValid ? "strong" : "eventual"}
          hint={configValid ? "reads always see the latest write" : "reads may miss a write"}
          tone={configValid ? "positive" : "warning"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={execute}
          disabled={!quorumReached}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Execute {mode}
        </button>
        <button
          type="button"
          onClick={() => {
            setSites(initialSites);
            setLocked([]);
            setOutcome(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={14} aria-hidden />
          Reset sites
        </button>
      </div>

      {outcome ? (
        <p
          className={cn(
            "animate-rise rounded-xl border px-4 py-3 text-sm",
            outcome.includes("stale")
              ? "border-warning/35 bg-warning-soft/50 text-ink"
              : "border-positive/35 bg-positive-soft/50 text-ink",
          )}
        >
          {outcome}
        </p>
      ) : (
        <p className="text-sm text-muted">
          {instructions ?? (
            <>
              Set Qr = 4 and Qw = 5 for the lecture example. Then try Qr = 2 with Qw = 3: the rules break,
              and you can write to S1 and S3 and afterwards read a stale value from S2 and S4.
            </>
          )}
        </p>
      )}
    </div>
  );
}
