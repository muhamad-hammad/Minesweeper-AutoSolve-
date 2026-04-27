"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AIPanel from "@/components/AIPanel";
import Board from "@/components/Board";
import StatsPanel from "@/components/StatsPanel";
import { createEmptyBoard, flagCell, placeMines, revealCell } from "@/lib/minesweeper";
import { applyMove, getConstraintCount, getNextMove } from "@/lib/solver";
import type { AIMove, AIState, Difficulty, GameBoard } from "@/types";
import { DIFFICULTIES } from "@/types";

// ---------------------------------------------------------------------------
// How to Play overlay
// ---------------------------------------------------------------------------
function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
        >
          Close ✕
        </button>

        <h2 className="mb-5 text-2xl font-bold tracking-tight text-zinc-100">How to Play</h2>

        <div className="space-y-5 text-sm leading-relaxed text-zinc-300">
          {/* Game rules */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Game Rules
            </h3>
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-cyan-400">▸</span>
                The board hides mines under covered cells. Your goal is to reveal every safe cell without triggering a mine.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-cyan-400">▸</span>
                Revealed numbered cells show how many of their 8 neighbours are mines.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-cyan-400">▸</span>
                Clicking a blank (zero) cell auto-reveals its entire connected region.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-red-400">⚑</span>
                Right-click (or long-press) a covered cell to place or remove a flag on a suspected mine.
              </li>
            </ul>
          </section>

          {/* Controls */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Controls
            </h3>
            <div className="overflow-hidden rounded-lg border border-zinc-700">
              {[
                ["Left-click", "Reveal a covered cell"],
                ["Right-click", "Flag / unflag a mine suspect"],
                ["R key", "Reset the board"],
                ["Run AI", "Let the solver play continuously"],
                ["Step", "Execute one AI move at a time"],
                ["Stop", "Pause the running AI"],
                ["Reset", "Start a fresh board"],
                ["Speed slider", "Adjust AI move delay (100 – 2000 ms)"],
              ].map(([key, desc], i) => (
                <div
                  key={key}
                  className={`flex gap-3 px-3 py-2 ${i % 2 === 0 ? "bg-zinc-800/40" : ""}`}
                >
                  <span className="w-28 shrink-0 font-mono text-xs font-semibold text-cyan-300">{key}</span>
                  <span className="text-zinc-300">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AI explanation */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              How the AI Works
            </h3>
            <p className="mb-2 text-zinc-400">
              The solver uses a two-phase strategy each turn:
            </p>
            <ol className="space-y-2">
              <li className="flex gap-2">
                <span className="shrink-0 rounded border border-blue-400/50 bg-blue-500/20 px-1.5 py-0.5 text-xs font-semibold text-blue-200">
                  1. Constraint
                </span>
                <span>
                  Builds a set of linear constraints from every revealed number (e.g.{" "}
                  <code className="rounded bg-zinc-800 px-1 text-xs text-cyan-300">{"cells{A,B,C} = 1"}</code>
                  ). Subset reduction simplifies overlapping constraints to deduce certain mines or safe cells.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 rounded border border-orange-400/50 bg-orange-500/20 px-1.5 py-0.5 text-xs font-semibold text-orange-200">
                  2. Probability
                </span>
                <span>
                  When no certain move exists, the solver enumerates consistent mine placements and picks the cell with the lowest mine probability to reveal (or flags a cell if probability exceeds 85 %).
                </span>
              </li>
            </ol>
          </section>

          {/* Difficulty */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Difficulty
            </h3>
            <div className="overflow-hidden rounded-lg border border-zinc-700">
              {DIFFICULTIES.map((d, i) => (
                <div
                  key={d.name}
                  className={`flex items-center gap-3 px-3 py-2 ${i % 2 === 0 ? "bg-zinc-800/40" : ""}`}
                >
                  <span className="w-20 shrink-0 font-semibold capitalize text-emerald-300">{d.name}</span>
                  <span className="text-zinc-400">
                    {d.rows} × {d.cols} — {d.mines} mines
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
function HomePage({ onPlay, onHowToPlay }: { onPlay: () => void; onHowToPlay: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-lg text-center">
        {/* Mine icon grid decoration */}
        <div className="mb-6 flex justify-center gap-2 text-3xl select-none" aria-hidden>
          {["💣", "🚩", "💣", "🔵", "💣"].map((icon, i) => (
            <span
              key={i}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-2xl shadow-inner"
            >
              {icon}
            </span>
          ))}
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Minesweeper{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            AI
          </span>
        </h1>

        <p className="mt-3 text-lg text-zinc-400 sm:text-xl">
          Watch a constraint-solving AI clear the minefield in real time.
        </p>

        <p className="mt-4 mx-auto max-w-sm text-sm leading-relaxed text-zinc-500">
          Uses CSP constraint propagation to deduce safe moves with certainty, then falls back to
          probabilistic reasoning when the board becomes ambiguous.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onPlay}
            className="rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-8 py-3 text-base font-semibold text-cyan-100 shadow-lg transition hover:bg-cyan-500/35 active:scale-95"
          >
            Start Game →
          </button>
          <button
            type="button"
            onClick={onHowToPlay}
            className="rounded-xl border border-zinc-600 bg-zinc-800 px-8 py-3 text-base font-semibold text-zinc-200 transition hover:bg-zinc-700 active:scale-95"
          >
            How to Play
          </button>
        </div>

        <p className="mt-10 text-xs text-zinc-600">
          Built with Next.js 14 · TypeScript · Tailwind CSS
        </p>
      </div>
    </main>
  );
}

const DEFAULT_DIFFICULTY = DIFFICULTIES[0]!;

function newBoard(d: Difficulty): GameBoard {
  return createEmptyBoard(d.rows, d.cols, d.mines);
}

function freshAIState(): AIState {
  return {
    isRunning: false,
    speed: 700,
    moveHistory: [],
    lastReason: "",
    phase: "idle",
    constraintCount: 0,
    totalMoves: 0,
  };
}

export default function Home() {
  const [view, setView] = useState<"home" | "game">("home");
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [board, setBoard] = useState<GameBoard>(() => newBoard(DEFAULT_DIFFICULTY));
  const [aiState, setAiState] = useState<AIState>(freshAIState);
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);
  const [revealOriginCell, setRevealOriginCell] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<AIMove | null>(null);

  // -------------------------------------------------------------------------
  // Refs — values that timers need to read without stale closures
  // -------------------------------------------------------------------------
  const latestBoardRef = useRef<GameBoard>(board);
  const isRunningRef   = useRef(false);
  const speedRef       = useRef(aiState.speed);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state (safe to do during render; refs are only
  // READ inside timers, never during the render phase itself).
  latestBoardRef.current = board;
  isRunningRef.current   = aiState.isRunning;
  speedRef.current       = aiState.speed;

  // -------------------------------------------------------------------------
  // AI step function stored in a ref so it can recurse without circular deps.
  // Re-assigned each render so state-setter closures are always fresh.
  // -------------------------------------------------------------------------
  const runAIRef = useRef<(b: GameBoard) => void>(() => undefined);

  runAIRef.current = (baseBoard: GameBoard) => {
    const next = getNextMove(baseBoard);

    if (!next) {
      isRunningRef.current = false;
      setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
      setHighlightedCell(null);
      setPendingMove(null);
      return;
    }

    // Highlight the chosen cell before applying
    setPendingMove(next.move);
    setHighlightedCell(next.move.cellId);

    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);

    applyTimerRef.current = setTimeout(() => {
      // Always use latestBoardRef so we act on the most recent board state
      const nextBoard = applyMove(latestBoardRef.current, next.move);
      latestBoardRef.current = nextBoard;

      setBoard(nextBoard);
      setRevealOriginCell(next.move.cellId);
      setPendingMove(null);
      setHighlightedCell(null);
      setAiState((prev) => ({
        ...prev,
        phase: next.phase,
        lastReason: next.move.reason,
        moveHistory: [...prev.moveHistory, next.move],
        totalMoves: prev.totalMoves + 1,
      }));

      // Schedule the next move if still running
      if (!isRunningRef.current) return;

      if (nextBoard.status !== "playing") {
        isRunningRef.current = false;
        setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        runAIRef.current(latestBoardRef.current);
      }, speedRef.current);
    }, 300);
  };

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------
  const clearTimers = useCallback(() => {
    if (timerRef.current)      { clearTimeout(timerRef.current);      timerRef.current = null; }
    if (applyTimerRef.current) { clearTimeout(applyTimerRef.current); applyTimerRef.current = null; }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Safe first move: place mines away from the chosen cell, then reveal it.
  const doFirstMove = useCallback((base: GameBoard, cellId?: string): GameBoard => {
    let row: number, col: number;
    if (cellId) {
      const [r, c] = cellId.split("-").map(Number);
      row = r!;
      col = c!;
    } else {
      row = Math.floor(Math.random() * base.rows);
      col = Math.floor(Math.random() * base.cols);
    }
    const safeCell = base.cells[row]![col]!;
    setRevealOriginCell(safeCell.id);
    return revealCell(placeMines(base, safeCell), safeCell.id);
  }, []);

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------
  const handleStart = useCallback(() => {
    if (isRunningRef.current) return;

    let b = latestBoardRef.current;
    if (!b.firstMoveDone) {
      b = doFirstMove(b);
      latestBoardRef.current = b;
      setBoard(b);
    }
    if (b.status !== "playing") return;

    isRunningRef.current = true;
    setAiState((prev) => ({ ...prev, isRunning: true, phase: "constraint" }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runAIRef.current(latestBoardRef.current);
    }, speedRef.current);
  }, [doFirstMove]);

  const handleStop = useCallback(() => {
    clearTimers();
    isRunningRef.current = false;
    setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
    setHighlightedCell(null);
    setPendingMove(null);
  }, [clearTimers]);

  // Manual single-step.
  // First call on an idle board makes the opening move; subsequent calls each
  // run one solver step.
  const handleAIStep = useCallback(() => {
    if (isRunningRef.current || pendingMove !== null) return;

    let b = latestBoardRef.current;
    if (!b.firstMoveDone) {
      b = doFirstMove(b);
      latestBoardRef.current = b;
      setBoard(b);
      return; // show the reveal; next Step press runs the first AI move
    }
    if (b.status !== "playing") return;
    runAIRef.current(b);
  }, [doFirstMove, pendingMove]);

  const handleReset = useCallback(() => {
    clearTimers();
    isRunningRef.current = false;
    const b = newBoard(difficulty);
    latestBoardRef.current = b;
    setBoard(b);
    setAiState((prev) => ({ ...freshAIState(), speed: prev.speed }));
    setHighlightedCell(null);
    setRevealOriginCell(null);
    setPendingMove(null);
  }, [difficulty, clearTimers]);

  const handleCellClick = useCallback((cellId: string) => {
    if (isRunningRef.current) return;
    let b = latestBoardRef.current;
    if (b.status === "won" || b.status === "lost") return;

    if (!b.firstMoveDone) {
      b = doFirstMove(b, cellId);
    } else {
      setRevealOriginCell(cellId);
      b = revealCell(b, cellId);
    }
    latestBoardRef.current = b;
    setBoard(b);
  }, [doFirstMove]);

  const handleCellRightClick = useCallback((cellId: string) => {
    if (isRunningRef.current) return;
    const b = flagCell(latestBoardRef.current, cellId);
    latestBoardRef.current = b;
    setBoard(b);
  }, []);

  const handleDifficultyChange = useCallback((d: Difficulty) => {
    clearTimers();
    isRunningRef.current = false;
    setDifficulty(d);
    const b = newBoard(d);
    latestBoardRef.current = b;
    setBoard(b);
    setAiState((prev) => ({ ...freshAIState(), speed: prev.speed }));
    setHighlightedCell(null);
    setRevealOriginCell(null);
    setPendingMove(null);
  }, [clearTimers]);

  // -------------------------------------------------------------------------
  // Sync constraint count into aiState for display
  // -------------------------------------------------------------------------
  const constraintCount = useMemo(() => getConstraintCount(board), [board]);
  useEffect(() => {
    setAiState((prev) => {
      if (prev.constraintCount === constraintCount) return prev;
      return { ...prev, constraintCount };
    });
  }, [constraintCount]);

  // -------------------------------------------------------------------------
  // Keyboard shortcut: R = reset
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "r") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      handleReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleReset]);

  // -------------------------------------------------------------------------
  // Derived display flags
  // -------------------------------------------------------------------------
  const isMovePending = pendingMove !== null;
  const canStep =
    !aiState.isRunning &&
    !isMovePending &&
    (board.status === "idle" || board.status === "playing");
  const canStart =
    !aiState.isRunning &&
    (board.status === "idle" || board.status === "playing");

  if (view === "home") {
    return (
      <>
        {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
        <HomePage
          onPlay={() => setView("game")}
          onHowToPlay={() => setShowHowToPlay(true)}
        />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-6 text-zinc-100">
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Minesweeper AI
            </h1>
            <p className="mt-1 text-sm text-zinc-400 sm:text-base">
              CSP Constraint Propagation + Probabilistic Fallback
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowHowToPlay(true)}
              className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
            >
              How to Play
            </button>
            <button
              type="button"
              onClick={() => { handleStop(); setView("home"); }}
              className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
            >
              ← Home
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
          <section className="space-y-4">
            <AIPanel
              aiState={aiState}
              difficulty={difficulty}
              gameStatus={board.status}
              canStep={canStep}
              canStart={canStart}
              onDifficultyChange={handleDifficultyChange}
              onSpeedChange={(ms) => setAiState((prev) => ({ ...prev, speed: ms }))}
              onStart={handleStart}
              onStop={handleStop}
              onStep={handleAIStep}
              onReset={handleReset}
            />
            <StatsPanel aiState={aiState} board={board} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
            <Board
              board={board}
              highlightedCell={highlightedCell}
              revealOriginCell={revealOriginCell}
              onCellClick={handleCellClick}
              onCellRightClick={handleCellRightClick}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
