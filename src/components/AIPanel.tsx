"use client";

import type { AIMove, AIState, Difficulty, GameBoard } from "@/types";
import { DIFFICULTIES } from "@/types";

interface AIPanelProps {
  aiState: AIState;
  difficulty: Difficulty;
  gameStatus: GameBoard["status"];
  canStep: boolean;
  canStart: boolean;
  onDifficultyChange: (d: Difficulty) => void;
  onSpeedChange: (ms: number) => void;
  onStart: () => void;
  onStop: () => void;
  onStep: () => void;
  onReset: () => void;
}

function cellLabel(cellId: string): string {
  const [r, c] = cellId.split("-").map(Number);
  if (r === undefined || c === undefined || Number.isNaN(r) || Number.isNaN(c)) return cellId;
  return `r${r + 1}, c${c + 1}`;
}

function phasePill(phase: AIState["phase"]) {
  if (phase === "constraint") {
    return { label: "Constraint Solving", cls: "border-blue-400/50 bg-blue-500/20 text-blue-200" };
  }
  if (phase === "probability") {
    return { label: "Probability Guess", cls: "border-orange-400/50 bg-orange-500/20 text-orange-200" };
  }
  return { label: "Idle", cls: "border-zinc-500/60 bg-zinc-700/60 text-zinc-300" };
}

function moveRowClass(move: AIMove): string {
  if (move.confidence === "probable") return "border-orange-400/40 bg-orange-500/10 text-orange-100";
  if (move.type === "flag")           return "border-red-400/40 bg-red-500/10 text-red-100";
  return "border-green-400/40 bg-green-500/10 text-green-100";
}

function gameStatusBanner(status: GameBoard["status"]) {
  if (status === "won")  return { text: "Game Won!", cls: "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" };
  if (status === "lost") return { text: "Game Lost", cls: "border-red-400/60 bg-red-500/15 text-red-200" };
  return null;
}

export default function AIPanel({
  aiState,
  difficulty,
  gameStatus,
  canStep,
  canStart,
  onDifficultyChange,
  onSpeedChange,
  onStart,
  onStop,
  onStep,
  onReset,
}: AIPanelProps) {
  const recentMoves = aiState.moveHistory.slice(-8).reverse();
  const phase       = phasePill(aiState.phase);
  const lastMove    = aiState.moveHistory.at(-1);
  const banner      = gameStatusBanner(gameStatus);

  return (
    <section className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-xl sm:p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-wide">AI Solver</h2>

      {/* Game-over banner */}
      {banner && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-center text-sm font-semibold ${banner.cls}`}>
          {banner.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* --- Algorithm status --- */}
        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Algorithm Status
          </h3>
          <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${phase.cls}`}>
            {phase.label}
          </span>
          <p className="text-sm leading-snug text-zinc-200">
            {aiState.lastReason || "Awaiting first move…"}
          </p>
          <p className="text-sm text-zinc-400">
            Confidence:{" "}
            <span className="font-semibold text-zinc-100">
              {lastMove
                ? lastMove.confidence === "certain"
                  ? "Certain ✓"
                  : "Probable ~"
                : "N/A"}
            </span>
          </p>
          <p className="text-sm text-zinc-400">
            Active constraints:{" "}
            <span className="font-semibold text-cyan-300">{aiState.constraintCount}</span>
          </p>
        </div>

        {/* --- Controls --- */}
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Controls</h3>

          {/* Run / Stop / Step / Reset */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aiState.isRunning ? onStop : onStart}
              disabled={!aiState.isRunning && !canStart}
              className="rounded border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {aiState.isRunning ? "Stop" : "Run AI"}
            </button>
            <button
              type="button"
              onClick={onStep}
              disabled={!canStep}
              className="rounded border border-zinc-500 bg-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
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

          {/* Speed slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>Slow</span>
              <span className="text-zinc-300">{aiState.speed} ms / move</span>
              <span>Fast</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={aiState.speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Difficulty buttons */}
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => {
              const selected = d.name === difficulty.name;
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => onDifficultyChange(d)}
                  disabled={aiState.isRunning}
                  className={`rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                      : "border-zinc-500 bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                  }`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- Move log --- */}
      <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Move Log
        </h3>
        <div className="max-h-52 space-y-1 overflow-y-auto rounded border border-zinc-700 bg-zinc-950/70 p-2 font-mono text-xs">
          {recentMoves.length === 0 ? (
            <p className="text-zinc-500">No moves yet.</p>
          ) : (
            recentMoves.map((move, i) => {
              const stepNum = aiState.moveHistory.length - i;
              return (
                <div
                  key={`${move.cellId}-${move.type}-${stepNum}`}
                  className={`rounded border px-2 py-0.5 ${moveRowClass(move)}`}
                >
                  <span className="mr-2 text-zinc-400">#{stepNum}</span>
                  <span className="mr-2 uppercase">{move.type}</span>
                  <span className="mr-2">{cellLabel(move.cellId)}</span>
                  <span className="text-zinc-300">— {move.reason}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
