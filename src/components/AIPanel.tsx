"use client";

import type { AIMove, AIState, Difficulty, GameBoard, PlayMode } from "@/types";
import { DIFFICULTIES } from "@/types";

interface AIPanelProps {
  aiState: AIState;
  difficulty: Difficulty;
  gameStatus: GameBoard["status"];
  canStep: boolean;
  canStart: boolean;
  mode: PlayMode;
  onModeChange: (m: PlayMode) => void;
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
  mode,
  onModeChange,
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
  const aiControlsEnabled = mode === "ai";

  return (
    <section className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-xl sm:p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-wide">AI Solver</h2>

      {/* Mode toggle: Human vs AI */}
      <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Player
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(["human", "ai"] as const).map((m) => {
            const selected = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                disabled={aiState.isRunning && m !== mode}
                className={`rounded border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? m === "human"
                      ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                      : "border-cyan-400/70 bg-cyan-500/20 text-cyan-100"
                    : "border-zinc-500 bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                }`}
              >
                {m === "human" ? "👤 Human" : "🤖 AI"}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {mode === "human"
            ? "Left-click to reveal, right-click to flag."
            : "AI plays automatically. Use the controls below."}
        </p>
      </div>

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
              disabled={!aiControlsEnabled || (!aiState.isRunning && !canStart)}
              className="rounded border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {aiState.isRunning ? "Stop" : "Run AI"}
            </button>
            <button
              type="button"
              onClick={onStep}
              disabled={!aiControlsEnabled || !canStep}
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
              title="AI move speed in milliseconds"
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

      {/* --- CSP Algorithm Showcase --- */}
      <CSPShowcase phase={aiState.phase} hasHistory={aiState.moveHistory.length > 0} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// CSP Algorithm Showcase
// ---------------------------------------------------------------------------

type CodeLine = {
  code: string;
  comment: string;
  // Which phase(s) make this line "active"
  activeOn: Array<AIState["phase"] | "any">;
  // indent level (0 = top, 1 = one level, 2 = two levels)
  indent: number;
  // visual group separator above this line
  group?: string;
};

const CSP_LINES: CodeLine[] = [
  // ── Phase 1: build constraints ──────────────────────────────────────────
  {
    group: "Step 1 — Build Constraints",
    code: "for (cell of revealedCells) {",
    comment: "scan every revealed number",
    activeOn: ["constraint"],
    indent: 0,
  },
  {
    code: "  hidden = neighbours(cell)",
    comment: "collect unrevealed neighbours",
    activeOn: ["constraint"],
    indent: 1,
  },
  {
    code: "    .filter(n => n !== 'flagged');",
    comment: "flags already accounted for",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "  constraints.push({",
    comment: "record linear constraint",
    activeOn: ["constraint"],
    indent: 1,
  },
  {
    code: "    cells: hidden,",
    comment: "unknown frontier cells",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "    mines: cell.adj − flagged",
    comment: "remaining mine budget",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "  });",
    comment: "",
    activeOn: ["constraint"],
    indent: 1,
  },
  {
    code: "}",
    comment: "",
    activeOn: ["constraint"],
    indent: 0,
  },
  // ── Phase 2: simplify ───────────────────────────────────────────────────
  {
    group: "Step 2 — Subset Reduction",
    code: "while (changed) {",
    comment: "repeat until stable",
    activeOn: ["constraint"],
    indent: 0,
  },
  {
    code: "  for ([A, B] of pairs(constraints))",
    comment: "compare every pair",
    activeOn: ["constraint"],
    indent: 1,
  },
  {
    code: "    if (A.cells ⊆ B.cells) {",
    comment: "A is a subset of B",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "      add({ cells: B∖A,",
    comment: "derive tighter constraint",
    activeOn: ["constraint"],
    indent: 3,
  },
  {
    code: "           mines: B.mines − A.mines });",
    comment: "",
    activeOn: ["constraint"],
    indent: 3,
  },
  {
    code: "    }",
    comment: "",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "}",
    comment: "",
    activeOn: ["constraint"],
    indent: 0,
  },
  // ── Phase 3: extract certain moves ──────────────────────────────────────
  {
    group: "Step 3 — Extract Certain Moves",
    code: "for (c of constraints) {",
    comment: "check each simplified constraint",
    activeOn: ["constraint"],
    indent: 0,
  },
  {
    code: "  if (c.mines === 0)",
    comment: "zero mines → all cells safe",
    activeOn: ["constraint"],
    indent: 1,
  },
  {
    code: "    reveal(c.cells);        // ✓ certain",
    comment: "",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "  if (c.mines === c.cells.size)",
    comment: "all cells are mines",
    activeOn: ["constraint"],
    indent: 1,
  },
  {
    code: "    flag(c.cells);          // ⚑ certain",
    comment: "",
    activeOn: ["constraint"],
    indent: 2,
  },
  {
    code: "}",
    comment: "",
    activeOn: ["constraint"],
    indent: 0,
  },
  // ── Phase 4: probability fallback ───────────────────────────────────────
  {
    group: "Step 4 — Probability Fallback",
    code: "components = partition(constraints);",
    comment: "connected frontier groups",
    activeOn: ["probability"],
    indent: 0,
  },
  {
    code: "for (comp of components) {",
    comment: "independent sub-problems",
    activeOn: ["probability"],
    indent: 0,
  },
  {
    code: "  backtrack(cells, assignment={})",
    comment: "enumerate valid placements",
    activeOn: ["probability"],
    indent: 1,
  },
  {
    code: "    → count mine freq per cell",
    comment: "tally across valid states",
    activeOn: ["probability"],
    indent: 2,
  },
  {
    code: "}",
    comment: "",
    activeOn: ["probability"],
    indent: 0,
  },
  {
    code: "P(cell) = freq / totalValid;",
    comment: "posterior mine probability",
    activeOn: ["probability"],
    indent: 0,
  },
  {
    code: "reveal argmin P(cell);   // ~ guess",
    comment: "safest available cell",
    activeOn: ["probability"],
    indent: 0,
  },
];

function CSPShowcase({
  phase,
  hasHistory,
}: {
  phase: AIState["phase"];
  hasHistory: boolean;
}) {
  const isIdle = phase === "idle" || !hasHistory;

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          CSP Algorithm
        </h3>
        {!isIdle && (
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              phase === "constraint"
                ? "border-blue-400/50 bg-blue-500/20 text-blue-300"
                : "border-orange-400/50 bg-orange-500/20 text-orange-300"
            }`}
          >
            {phase === "constraint" ? "Steps 1–3 active" : "Step 4 active"}
          </span>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto rounded border border-zinc-700 bg-zinc-950/80 p-2">
        <pre className="font-mono text-[11px] leading-relaxed">
          {CSP_LINES.map((line, i) => {
            const active =
              !isIdle &&
              (line.activeOn.includes("any") || line.activeOn.includes(phase));

            return (
              <div key={i}>
                {/* Group header */}
                {line.group && (
                  <div className="mt-2 mb-0.5 first:mt-0 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 select-none">
                    {"// ── "}{line.group}{" ──"}
                  </div>
                )}

                <div
                  className={`flex gap-2 rounded px-1 py-px transition-colors ${
                    active
                      ? phase === "constraint"
                        ? "bg-blue-500/10 text-blue-100"
                        : "bg-orange-500/10 text-orange-100"
                      : "text-zinc-500"
                  }`}
                >
                  {/* Active indicator */}
                  <span
                    className={`w-1 shrink-0 rounded-full self-stretch ${
                      active
                        ? phase === "constraint"
                          ? "bg-blue-400"
                          : "bg-orange-400"
                        : "bg-transparent"
                    }`}
                  />

                  {/* Code token */}
                  <span
                    className={`flex-1 whitespace-pre ${
                      active ? "font-semibold" : "font-normal"
                    }`}
                  >
                    {"  ".repeat(line.indent)}{line.code}
                  </span>

                  {/* Inline comment */}
                  {line.comment && (
                    <span
                      className={`shrink-0 text-right text-[10px] leading-loose ${
                        active
                          ? phase === "constraint"
                            ? "text-blue-400/70"
                            : "text-orange-400/70"
                          : "text-zinc-600"
                      }`}
                    >
                      {`// ${line.comment}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </pre>
      </div>

      {isIdle && (
        <p className="mt-1.5 text-center text-[10px] text-zinc-600">
          Lines highlight as the AI executes each phase.
        </p>
      )}
    </div>
  );
}
