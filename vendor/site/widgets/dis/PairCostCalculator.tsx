"use client";

import { useState } from "react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";

const RECORD_EXPONENTS = [3, 4, 5, 6, 7, 8, 9];

function formatCount(value: number) {
  if (value < 1000) return value.toFixed(0);
  return value.toExponential(2).replace("e+", " × 10^");
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86_400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 31_557_600) return `${(seconds / 86_400).toFixed(1)} days`;
  return `${(seconds / 31_557_600).toFixed(1)} years`;
}

export function PairCostCalculator() {
  const [exponent, setExponent] = useState(6);
  const [rateExponent, setRateExponent] = useState(6);

  const records = 10 ** exponent;
  const rate = 10 ** rateExponent;
  const pairs = (records * (records - 1)) / 2;
  const seconds = pairs / rate;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <RangeField
          label="Records to deduplicate"
          value={exponent}
          min={RECORD_EXPONENTS[0]}
          max={RECORD_EXPONENTS[RECORD_EXPONENTS.length - 1]}
          display={`10^${exponent}`}
          hint={`${records.toLocaleString("en-US")} records`}
          onChange={setExponent}
        />
        <RangeField
          label="Comparisons per second"
          value={rateExponent}
          min={4}
          max={9}
          display={`10^${rateExponent}`}
          hint="A single machine scoring record pairs"
          onChange={setRateExponent}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pairs to score" value={formatCount(pairs)} hint="N(N−1)/2" tone="brand" />
        <Stat
          label="Wall-clock time"
          value={formatDuration(seconds)}
          hint="Brute force, all pairs"
          tone={seconds > 86_400 ? "warning" : "neutral"}
        />
        <Stat
          label="Growth factor"
          value={`×${(10 ** 2).toFixed(0)}`}
          hint="Cost per 10× more records"
        />
      </div>

      <p className="text-sm text-muted">
        Ten times more records means a hundred times more comparisons. This quadratic wall is the
        reason every step that follows — shingling, minhashing, banding — exists.
      </p>
    </div>
  );
}
