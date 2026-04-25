"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AIPanel from "@/components/AIPanel";
import Board from "@/components/Board";
import StatsPanel from "@/components/StatsPanel";
import { createEmptyBoard, flagCell, placeMines, revealCell } from "@/lib/minesweeper";
import { applyMove, getConstraintCount, getNextMove } from "@/lib/solver";
import type { AIMove, AIState, Difficulty, GameBoard } from "@/types";
import { DIFFICULTIES } from "@/types";

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

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-6 text-zinc-100">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Minesweeper AI
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">
            CSP Constraint Propagation + Probabilistic Fallback
          </p>
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
