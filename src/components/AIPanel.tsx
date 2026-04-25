"use client";

import type { AIMove, AIState, Difficulty } from "@/types";

interface AIPanelProps {
  aiState: AIState;
  onStart: () => void;
  onStop: () => void;
  onStep: () => void;
  onSpeedChange: (ms: number) => void;
  onReset: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
}

const DIFFICULTY_OPTIONS: Difficulty[] = [
  { name: "Beginner", rows: 9, cols: 9, mines: 10 },
  { name: "Intermediate", rows: 16, cols: 16, mines: 40 },
  { name: "Expert", rows: 16, cols: 30, mines: 99 },
];

function parseCellId(cellId: string): string {
  const [rowRaw, colRaw] = cellId.split("-");
  const row = Number.parseInt(rowRaw ?? "", 10);
  const col = Number.parseInt(colRaw ?? "", 10);
  if (Number.isNaN(row) || Number.isNaN(col)) {
    return cellId;
  }
  return `r${row + 1}, c${col + 1}`;
}

function getPhasePill(phase: AIState["phase"]) {
  if (phase === "constraint") {
    return {
      label: "Constraint Solving",
      className: "border-blue-400/50 bg-blue-500/20 text-blue-200",
    };
  }
  if (phase === "probability") {
    return {
      label: "Probability Guess",
      className: "border-orange-400/50 bg-orange-500/20 text-orange-200",
    };
  }
  return {
    label: "Idle",
    className: "border-zinc-500/60 bg-zinc-700/60 text-zinc-300",
  };
}

function getMoveClass(move: AIMove): string {
  if (move.confidence === "probable") {
    return "border-red-400/50 bg-red-500/10 text-red-200";
  }
  if (move.type === "flag") {
    return "border-orange-400/50 bg-orange-500/10 text-orange-100";
  }
  return "border-green-400/50 bg-green-500/10 text-green-100";
}

export default function AIPanel({
  aiState,
  onStart,
  onStop,
  onStep,
  onSpeedChange,
  onReset,
  difficulty,
  onDifficultyChange,
}: AIPanelProps) {
  const recentMoves = aiState.moveHistory.slice(-8).reverse();
  const phase = getPhasePill(aiState.phase);
  const lastMove = aiState.moveHistory[aiState.moveHistory.length - 1];

  return (
    <section className="w-full max-w-5xl rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-xl sm:p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-wide text-zinc-100">AI Debug Panel</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Algorithm Status
          </h3>
          <span
            className={`inline-flex rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${phase.className}`}
          >
            {phase.label}
          </span>
          <p className="text-sm text-zinc-200">
            {aiState.lastReason || "No move yet. Awaiting first deduction."}
          </p>
          <p className="text-sm text-zinc-300">
            Confidence:{" "}
            <span className="font-semibold text-zinc-100">
              {lastMove ? (lastMove.confidence === "certain" ? "Certain ✓" : "Probable ~") : "N/A"}
            </span>
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Controls</h3>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aiState.isRunning ? onStop : onStart}
              className="rounded border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35"
            >
              {aiState.isRunning ? "Stop" : "Start"}
            </button>
            <button
              type="button"
              onClick={onStep}
              disabled={aiState.isRunning}
              className="rounded border border-zinc-500 bg-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Step
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded border border-zinc-500 bg-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600"
            >
              Reset
            </button>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
              <span>Slow</span>
              <span>Fast</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={aiState.speed}
              onChange={(event) => onSpeedChange(Number(event.target.value))}
              className="w-full accent-cyan-400"
            />
            <p className="mt-1 text-xs text-zinc-400">Current speed: {aiState.speed}ms</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((option) => {
              const selected = option.name === difficulty.name;
              return (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => onDifficultyChange(option)}
                  className={`rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                    selected
                      ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                      : "border-zinc-500 bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                  }`}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Constraint Count
        </h3>
        <p className="mt-1 text-lg font-semibold text-zinc-100">
          Active Constraints: <span className="text-cyan-300">{aiState.constraintCount}</span>
        </p>
        <p className="text-sm text-zinc-400">Logical deductions from revealed numbers</p>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Move Log</h3>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-zinc-700 bg-zinc-950/70 p-2 font-mono text-xs">
          {recentMoves.length === 0 ? (
            <p className="text-zinc-500">No AI moves recorded.</p>
          ) : (
            recentMoves.map((move, index) => {
              const stepNumber = aiState.moveHistory.length - index;
              return (
                <div
                  key={`${move.cellId}-${move.type}-${stepNumber}`}
                  className={`rounded border px-2 py-1 ${getMoveClass(move)}`}
                >
                  <span className="mr-2 text-zinc-300">#{stepNumber}</span>
                  <span className="mr-2 uppercase">{move.type}</span>
                  <span className="mr-2">{parseCellId(move.cellId)}</span>
                  <span className="text-zinc-200">- {move.reason}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
