"use client";

import type { AIState, GameBoard } from "@/types";

interface StatsPanelProps {
  aiState: AIState;
  board: GameBoard;
}

function getStatusMeta(status: GameBoard["status"]) {
  if (status === "won") {
    return { label: "Won", className: "text-emerald-300" };
  }
  if (status === "lost") {
    return { label: "Lost", className: "text-red-300" };
  }
  if (status === "playing") {
    return { label: "Playing", className: "text-cyan-300" };
  }
  return { label: "Idle", className: "text-zinc-300" };
}

function getPhaseLabel(phase: AIState["phase"]): string {
  if (phase === "constraint") {
    return "Constraint Solving";
  }
  if (phase === "probability") {
    return "Probability Guess";
  }
  return "Idle";
}

export default function StatsPanel({ aiState, board }: StatsPanelProps) {
  const minesRemaining = board.totalMines - board.flaggedCount;
  const totalSafeCells = board.rows * board.cols - board.totalMines;
  const statusMeta = getStatusMeta(board.status);

  const certainMoves = aiState.moveHistory.filter((move) => move.confidence === "certain").length;
  const probableMoves = aiState.moveHistory.filter((move) => move.confidence === "probable").length;
  const certainRatio = aiState.totalMoves > 0 ? (certainMoves / aiState.totalMoves) * 100 : 0;
  const probableRatio = aiState.totalMoves > 0 ? (probableMoves / aiState.totalMoves) * 100 : 0;
  const certaintyScore = aiState.totalMoves > 0 ? ((certainMoves / aiState.totalMoves) * 100).toFixed(1) : "0.0";

  return (
    <section className="w-full max-w-5xl rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-xl sm:p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-wide text-zinc-100">Stats Panel</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Game Stats</h3>
          <p className="text-sm text-zinc-200">
            Mines remaining: <span className="font-semibold text-zinc-100">{minesRemaining}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Cells revealed:{" "}
            <span className="font-semibold text-zinc-100">
              {board.revealedCount} / {totalSafeCells}
            </span>
          </p>
          <p className="text-sm">
            Status: <span className={`font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            AI Performance
          </h3>
          <p className="text-sm text-zinc-200">
            Total moves made: <span className="font-semibold text-zinc-100">{aiState.totalMoves}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Certain vs Probable:{" "}
            <span className="font-semibold text-zinc-100">
              {certainMoves}:{probableMoves}
            </span>
          </p>
          <div className="flex h-2 overflow-hidden rounded bg-zinc-700">
            <div className="h-full bg-cyan-400" style={{ width: `${certainRatio}%` }} />
            <div className="h-full bg-orange-400" style={{ width: `${probableRatio}%` }} />
          </div>
          <p className="text-sm text-zinc-200">
            Accuracy: <span className="font-semibold text-cyan-300">{certaintyScore}% certain</span>
          </p>
          <p className="text-sm text-zinc-200">
            Current phase:{" "}
            <span className="font-semibold text-zinc-100">{getPhaseLabel(aiState.phase)}</span>
          </p>
        </div>
      </div>

      <details className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
          How It Works
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-200">
          <li>
            Constraint solver: Uses numbered cells to deduce mine locations with 100% certainty
          </li>
          <li>Subset reduction: If constraint A ⊆ B, infers new constraint B-A</li>
          <li>Probability fallback: When stuck, picks lowest mine-probability cell</li>
        </ul>
      </details>
    </section>
  );
}
