"use client";

import type { AIState, GameBoard } from "@/types";

interface StatsPanelProps {
  aiState: AIState;
  board: GameBoard;
}

function statusMeta(s: GameBoard["status"]) {
  if (s === "won")     return { label: "Won",     cls: "text-emerald-300" };
  if (s === "lost")    return { label: "Lost",    cls: "text-red-300" };
  if (s === "playing") return { label: "Playing", cls: "text-cyan-300" };
  return                      { label: "Idle",    cls: "text-zinc-400" };
}

function phaseLabel(p: AIState["phase"]): string {
  if (p === "constraint") return "Constraint Solving";
  if (p === "probability") return "Probability Guess";
  return "Idle";
}

export default function StatsPanel({ aiState, board }: StatsPanelProps) {
  const minesLeft   = board.totalMines - board.flaggedCount;
  const totalSafe   = board.rows * board.cols - board.totalMines;
  const status      = statusMeta(board.status);

  const certainMoves  = aiState.moveHistory.filter((m) => m.confidence === "certain").length;
  const probableMoves = aiState.moveHistory.filter((m) => m.confidence === "probable").length;
  const certainPct    = aiState.totalMoves > 0 ? (certainMoves / aiState.totalMoves) * 100 : 0;
  const probablePct   = aiState.totalMoves > 0 ? (probableMoves / aiState.totalMoves) * 100 : 0;

  return (
    <section className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-xl sm:p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-wide">Stats</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Game stats */}
        <div className="space-y-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Game</h3>
          <p className="text-sm text-zinc-200">
            Status:{" "}
            <span className={`font-semibold ${status.cls}`}>{status.label}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Mines left:{" "}
            <span className="font-semibold text-zinc-100">{minesLeft}</span>
            <span className="text-zinc-500"> / {board.totalMines}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Revealed:{" "}
            <span className="font-semibold text-zinc-100">{board.revealedCount}</span>
            <span className="text-zinc-500"> / {totalSafe}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Grid:{" "}
            <span className="font-semibold text-zinc-100">
              {board.rows} × {board.cols}
            </span>
          </p>
        </div>

        {/* AI performance */}
        <div className="space-y-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">AI Performance</h3>
          <p className="text-sm text-zinc-200">
            Phase:{" "}
            <span className="font-semibold text-zinc-100">{phaseLabel(aiState.phase)}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Total moves:{" "}
            <span className="font-semibold text-zinc-100">{aiState.totalMoves}</span>
          </p>
          <p className="text-sm text-zinc-200">
            Certain / Probable:{" "}
            <span className="font-semibold text-zinc-100">
              {certainMoves} / {probableMoves}
            </span>
          </p>
          {/* Mini bar chart */}
          <div className="flex h-2 overflow-hidden rounded bg-zinc-700">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${certainPct}%` }} />
            <div className="h-full bg-orange-400 transition-all" style={{ width: `${probablePct}%` }} />
          </div>
          <p className="text-xs text-zinc-400">
            <span className="text-cyan-400">■</span> Certain &nbsp;
            <span className="text-orange-400">■</span> Probable
          </p>
        </div>
      </div>

      {/* How it works */}
      <details className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-widest text-zinc-300">
          How the CSP Solver Works
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-300">
          <li>
            <span className="font-semibold text-zinc-100">Constraint building</span> — every
            revealed number cell generates a constraint: the set of its hidden neighbours
            contains exactly N mines.
          </li>
          <li>
            <span className="font-semibold text-zinc-100">Subset reduction</span> — if
            constraint A ⊆ B, a new constraint B \ A is derived. Repeated until no new
            constraints are found.
          </li>
          <li>
            <span className="font-semibold text-zinc-100">Certain moves</span> — if a
            constraint has 0 mines → reveal all; if mines == cells → flag all.
          </li>
          <li>
            <span className="font-semibold text-zinc-100">CSP enumeration</span> — when no
            certain move exists, connected constraint components are enumerated via
            backtracking to compute exact mine probabilities for every frontier cell.
          </li>
          <li>
            <span className="font-semibold text-zinc-100">Probability fallback</span> — the
            cell with the lowest mine probability is revealed; cells above 85 % are flagged.
          </li>
        </ul>
      </details>
    </section>
  );
}
