"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, RotateCcw, ScrollText, Zap } from "lucide-react";
import { cn } from "@site/lib/cn";

type CoordinatorState = "Initial" | "Collecting" | "Committing" | "Aborted" | "Done" | "Crashed";
type AgentState = "Waiting" | "Prepared" | "Committed" | "Aborted" | "Crashed";

interface Step {
  title: string;
  coordinator: CoordinatorState;
  agents: AgentState[];
  messages: (string | null)[];
  direction: "down" | "up" | null;
  log: string | null;
  note: string;
  blocked?: boolean;
}

const AGENTS = ["A1", "A2", "A3", "A4"];

const START: Step = {
  title: "End of transaction",
  coordinator: "Initial",
  agents: ["Waiting", "Waiting", "Waiting", "Waiting"],
  messages: [null, null, null, null],
  direction: null,
  log: null,
  note: "The transaction has run on all four agents. Now it has to end atomically: either every agent persists the changes, or every agent discards them.",
};

const PREPARE: Step = {
  title: "Phase 1 — the coordinator sends PREPARE",
  coordinator: "Collecting",
  agents: ["Waiting", "Waiting", "Waiting", "Waiting"],
  messages: ["PREPARE", "PREPARE", "PREPARE", "PREPARE"],
  direction: "down",
  log: null,
  note: "The coordinator asks every agent whether it is able to commit. Nothing is decided yet.",
};

const SCENARIOS: { id: string; label: string; steps: Step[] }[] = [
  {
    id: "commit",
    label: "Everyone commits",
    steps: [
      START,
      PREPARE,
      {
        title: "Agents vote READY",
        coordinator: "Collecting",
        agents: ["Prepared", "Prepared", "Prepared", "Prepared"],
        messages: ["READY", "READY", "READY", "READY"],
        direction: "up",
        log: "each agent forces its log records to disk, then writes ready",
        note: "An agent that answers READY has given up its right to decide: in Prepared it may neither commit nor abort on its own.",
      },
      {
        title: "Phase 2 — the coordinator decides COMMIT",
        coordinator: "Committing",
        agents: ["Prepared", "Prepared", "Prepared", "Prepared"],
        messages: ["COMMIT", "COMMIT", "COMMIT", "COMMIT"],
        direction: "down",
        log: "commit into the coordinator's log",
        note: "Every vote was READY. The decisive action is writing the commit record to the log before sending a single message — after this point the outcome survives any crash.",
      },
      {
        title: "Agents commit and acknowledge",
        coordinator: "Committing",
        agents: ["Committed", "Committed", "Committed", "Committed"],
        messages: ["ACK", "ACK", "ACK", "ACK"],
        direction: "up",
        log: "commit into each agent's log",
        note: "Each agent makes the changes durable, releases its locks and acknowledges.",
      },
      {
        title: "Done",
        coordinator: "Done",
        agents: ["Committed", "Committed", "Committed", "Committed"],
        messages: [null, null, null, null],
        direction: null,
        log: null,
        note: "All ACKs collected. The distributed transaction committed atomically.",
      },
    ],
  },
  {
    id: "failed",
    label: "One agent votes FAILED",
    steps: [
      START,
      PREPARE,
      {
        title: "A3 cannot commit",
        coordinator: "Collecting",
        agents: ["Prepared", "Prepared", "Aborted", "Prepared"],
        messages: ["READY", "READY", "FAILED", "READY"],
        direction: "up",
        log: "A3 writes abort; the others write ready",
        note: "A local error or a violated constraint. A3 may abort unilaterally precisely because it never promised anything — it answers FAILED instead of READY.",
      },
      {
        title: "Phase 2 — the coordinator decides ABORT",
        coordinator: "Aborted",
        agents: ["Prepared", "Prepared", "Aborted", "Prepared"],
        messages: ["ABORT", "ABORT", "ABORT", "ABORT"],
        direction: "down",
        log: "abort into the coordinator's log",
        note: "A single FAILED vote is enough. The abort record goes to the log first, then the decision is broadcast.",
      },
      {
        title: "Agents abort and acknowledge",
        coordinator: "Aborted",
        agents: ["Aborted", "Aborted", "Aborted", "Aborted"],
        messages: ["ACK", "ACK", "ACK", "ACK"],
        direction: "up",
        log: "abort into each agent's log",
        note: "The prepared agents undo their work and release their locks.",
      },
      {
        title: "Done",
        coordinator: "Done",
        agents: ["Aborted", "Aborted", "Aborted", "Aborted"],
        messages: [null, null, null, null],
        direction: null,
        log: null,
        note: "The transaction was undone everywhere — atomicity preserved in the other direction.",
      },
    ],
  },
  {
    id: "coordinator-crash",
    label: "Coordinator crashes after the votes",
    steps: [
      START,
      PREPARE,
      {
        title: "Agents vote READY",
        coordinator: "Collecting",
        agents: ["Prepared", "Prepared", "Prepared", "Prepared"],
        messages: ["READY", "READY", "READY", "READY"],
        direction: "up",
        log: "ready into each agent's log",
        note: "All four agents are now in Prepared, holding their locks and waiting for the decision.",
      },
      {
        title: "The coordinator crashes",
        coordinator: "Crashed",
        agents: ["Prepared", "Prepared", "Prepared", "Prepared"],
        messages: [null, null, null, null],
        direction: null,
        log: null,
        blocked: true,
        note: "The votes were collected but no decision was written or sent. Every agent is blocked: it may not commit, may not abort, and keeps its locks until the coordinator comes back. This is why 2PC is called a blocking protocol.",
      },
      {
        title: "Recovery reads the log",
        coordinator: "Aborted",
        agents: ["Prepared", "Prepared", "Prepared", "Prepared"],
        messages: ["ABORT", "ABORT", "ABORT", "ABORT"],
        direction: "down",
        log: "no commit record found → abort",
        note: "There is no commit record, so under presumed abort the coordinator aborts globally. Had it crashed after writing commit, recovery would have resent COMMIT instead — but either way the agents were stuck for the whole outage.",
      },
      {
        title: "Done",
        coordinator: "Done",
        agents: ["Aborted", "Aborted", "Aborted", "Aborted"],
        messages: ["ACK", "ACK", "ACK", "ACK"],
        direction: "up",
        log: "abort into each agent's log",
        note: "Three-phase commit adds a pre-commit round to remove this blocking; Paxos and Raft instead replicate the coordinator so its crash stops nothing.",
      },
    ],
  },
  {
    id: "agent-crash",
    label: "An agent dies before voting",
    steps: [
      START,
      PREPARE,
      {
        title: "A2 never answers",
        coordinator: "Collecting",
        agents: ["Prepared", "Crashed", "Prepared", "Prepared"],
        messages: ["READY", null, "READY", "READY"],
        direction: "up",
        log: "ready into the log of A1, A3 and A4",
        note: "A2 is gone before it could vote. The coordinator is still waiting on one answer.",
      },
      {
        title: "The coordinator times out",
        coordinator: "Aborted",
        agents: ["Prepared", "Crashed", "Prepared", "Prepared"],
        messages: ["ABORT", null, "ABORT", "ABORT"],
        direction: "down",
        log: "abort into the coordinator's log",
        note: "A timeout is treated exactly like a FAILED vote. Nothing is blocked here — the agent crashed before it promised anything, so the coordinator is free to decide.",
      },
      {
        title: "Agents abort",
        coordinator: "Aborted",
        agents: ["Aborted", "Crashed", "Aborted", "Aborted"],
        messages: ["ACK", null, "ACK", "ACK"],
        direction: "up",
        log: "abort into each surviving agent's log",
        note: "When A2 restarts it finds no ready record in its log and aborts locally too, so the outcome is consistent.",
      },
      {
        title: "Done",
        coordinator: "Done",
        agents: ["Aborted", "Crashed", "Aborted", "Aborted"],
        messages: [null, null, null, null],
        direction: null,
        log: null,
        note: "Compare this with the coordinator crash: an agent failing is survivable, the coordinator failing is not.",
      },
    ],
  },
];

const COORDINATOR_TONE: Record<CoordinatorState, string> = {
  Initial: "border-line bg-surface text-muted",
  Collecting: "border-brand/45 bg-brand-soft text-brand-strong",
  Committing: "border-positive/45 bg-positive-soft text-positive",
  Aborted: "border-danger/45 bg-danger-soft text-danger",
  Done: "border-line bg-sunken text-muted",
  Crashed: "border-danger/60 bg-danger-soft text-danger",
};

const AGENT_TONE: Record<AgentState, string> = {
  Waiting: "border-line bg-surface text-muted",
  Prepared: "border-warning/45 bg-warning-soft text-warning",
  Committed: "border-positive/45 bg-positive-soft text-positive",
  Aborted: "border-danger/45 bg-danger-soft text-danger",
  Crashed: "border-danger/60 bg-danger-soft text-danger",
};

export function TwoPhaseCommitSimulator() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [index, setIndex] = useState(0);

  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0];
  const step = scenario.steps[Math.min(index, scenario.steps.length - 1)];

  const selectScenario = (id: string) => {
    setScenarioId(id);
    setIndex(0);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectScenario(item.id)}
            aria-pressed={item.id === scenarioId}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              item.id === scenarioId
                ? "border-brand/40 bg-brand-soft text-brand-strong"
                : "border-line bg-surface text-muted hover:border-brand/40 hover:text-brand",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(value - 1, 0))}
          disabled={index === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
        >
          <ChevronLeft size={15} aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={() => setIndex((value) => Math.min(value + 1, scenario.steps.length - 1))}
          disabled={index >= scenario.steps.length - 1}
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
        >
          Next
          <ChevronRight size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setIndex(0)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
        <span className="text-xs text-faint">
          Step {index + 1} of {scenario.steps.length}
        </span>
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-sunken p-4">
        <div className="grid justify-items-center gap-2">
          <div
            className={cn(
              "grid w-48 justify-items-center gap-0.5 rounded-xl border px-4 py-2.5 text-center",
              COORDINATOR_TONE[step.coordinator],
            )}
          >
            <span className="text-sm font-semibold">Coordinator</span>
            <span className="font-mono text-xs">{step.coordinator}</span>
          </div>

          {step.direction ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-faint">
              {step.direction === "down" ? (
                <ArrowDown size={14} className="text-brand" aria-hidden />
              ) : (
                <ArrowUp size={14} className="text-brand" aria-hidden />
              )}
              {step.direction === "down" ? "coordinator → agents" : "agents → coordinator"}
            </span>
          ) : (
            <span className="h-4" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AGENTS.map((agent, agentIndex) => (
            <div
              key={agent}
              className={cn(
                "grid justify-items-center gap-1 rounded-xl border px-3 py-2.5 text-center transition-colors",
                AGENT_TONE[step.agents[agentIndex]],
                step.blocked && step.agents[agentIndex] === "Prepared" && "ring-2 ring-danger/40",
              )}
            >
              <span className="text-sm font-semibold">{agent}</span>
              <span className="font-mono text-xs">{step.agents[agentIndex]}</span>
              <span className="font-mono text-[10px] text-faint">
                {step.messages[agentIndex] ?? (step.agents[agentIndex] === "Crashed" ? "no answer" : "—")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-ink">{step.title}</p>
        {step.log ? (
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs text-muted">
            <ScrollText size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
            {step.log}
          </p>
        ) : null}
        <p
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            step.blocked
              ? "border-danger/35 bg-danger-soft/50 text-ink"
              : "border-line bg-surface text-muted",
          )}
        >
          {step.blocked ? (
            <Zap size={14} className="mr-1.5 inline text-danger" aria-hidden />
          ) : null}
          {step.note}
        </p>
      </div>
    </div>
  );
}
