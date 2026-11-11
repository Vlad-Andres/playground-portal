"use client";

import { QuorumLab } from "@site/widgets/dis/QuorumLab";

const REPLICAS = [
  { id: "N1", weight: 1, value: 1000, version: 1 },
  { id: "N2", weight: 1, value: 1000, version: 1 },
  { id: "N3", weight: 1, value: 1000, version: 1 },
];

export function ReplicaQuorumLab() {
  return (
    <QuorumLab
      initialSites={REPLICAS}
      initialReadQuorum={2}
      initialWriteQuorum={2}
      instructions="Replication factor N = 3, so Qw is the book's W and Qr its R. With W = 2 and R = 2, write to two replicas and read from any two: you always see the latest version. Then set W = 1 and R = 1, write to N1 only and read from N2 — a stale read. With W = 1 you need R = 3."
    />
  );
}
