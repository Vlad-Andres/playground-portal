"use client";

import { useState } from "react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const KEY_COUNT = 600;

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

export function HashSpreadLab() {
  const [bucketCount, setBucketCount] = useState(10);
  const [step, setStep] = useState(2);

  const counts = Array.from({ length: bucketCount }, () => 0);
  for (let index = 1; index <= KEY_COUNT; index += 1) counts[(index * step) % bucketCount] += 1;

  const usedBuckets = counts.filter((count) => count > 0).length;
  const fullest = Math.max(...counts);
  const ideal = KEY_COUNT / bucketCount;
  const sharedFactor = greatestCommonDivisor(bucketCount, step);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <RangeField
          label="Number of buckets B"
          value={bucketCount}
          min={2}
          max={20}
          display={`B = ${bucketCount}`}
          hint="h(x) = x mod B"
          onChange={setBucketCount}
        />
        <RangeField
          label="Population of hash-keys"
          value={step}
          min={1}
          max={12}
          display={`multiples of ${step}`}
          hint={`${KEY_COUNT} keys: ${step}, ${2 * step}, ${3 * step}, …`}
          onChange={setStep}
        />
      </div>

      <div className="flex h-40 items-end gap-1 rounded-xl border border-line bg-sunken px-3 pt-3 pb-1">
        {counts.map((count, bucket) => (
          <div key={bucket} className="flex h-full flex-1 flex-col items-center gap-1">
            <div className="relative w-full flex-1">
              <div
                className={cn("absolute inset-x-0 bottom-0 rounded-t-md", count === 0 ? "bg-line" : "bg-brand/70")}
                style={{ height: `${Math.max((count / fullest) * 100, 2)}%` }}
                title={`bucket ${bucket}: ${count} keys`}
              />
            </div>
            <span className="font-mono text-[10px] text-faint">{bucket}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Buckets used" value={`${usedBuckets} / ${bucketCount}`} tone={usedBuckets === bucketCount ? "positive" : "warning"} />
        <Stat label="Fullest bucket" value={String(fullest)} hint={`ideal ≈ ${ideal.toFixed(0)}`} />
        <Stat label="gcd(B, c)" value={String(sharedFactor)} hint="shared factor of B and the keys" tone={sharedFactor === 1 ? "positive" : "warning"} />
        <Stat label="Verdict" value={sharedFactor === 1 ? "uniform" : "skewed"} tone={sharedFactor === 1 ? "positive" : "warning"} />
      </div>

      <p className="text-sm text-muted">
        With even keys and B = 10 only the even buckets ever fill — the book&apos;s Example 1.5. Move B to 11 and every
        bucket gets its share. Only 1 bucket in gcd(B, c) can ever be reached, which is why a prime B is the safe
        default.
      </p>
    </div>
  );
}
