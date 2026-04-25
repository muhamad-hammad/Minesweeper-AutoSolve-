"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AIPanel from "@/components/AIPanel";
import Board from "@/components/Board";
import GameControls from "@/components/GameControls";
import StatsPanel from "@/components/StatsPanel";
import { createEmptyBoard, flagCell, placeMines, revealCell } from "@/lib/minesweeper";
import { applyMove, getConstraintCount, getNextMove } from "@/lib/solver";
import type { AIMove, AIState, Difficulty, GameBoard } from "@/types";
import { DIFFICULTIES } from "@/types";

const DEFAULT_DIFFICULTY = DIFFICULTIES[0];

function createBoard(difficulty: Difficulty): GameBoard {
  return createEmptyBoard(difficulty.rows, difficulty.cols, difficulty.mines);
}

function createAIState(): AIState {
  return {
    isRunning: false,
    speed: 700,
    moveHistory: [],
    lastReason: "",
    phase: "idle",
    constraintCount: 0,
    correctMoves: 0,
    totalMoves: 0,
  };
}

export default function Home() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [board, setBoard] = useState<GameBoard>(() => createBoard(DEFAULT_DIFFICULTY));
  const [aiState, setAiState] = useState<AIState>(() => createAIState());
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<AIMove | null>(null);
  const [pendingPhase, setPendingPhase] = useState<"constraint" | "probability" | null>(null);
  const timerRef = useRef<number | null>(null);
  const applyTimerRef = useRef<number | null>(null);
  const latestBoardRef = useRef<GameBoard>(board);

  const constraintCount = useMemo(() => getConstraintCount(board), [board]);

  useEffect(() => {
    latestBoardRef.current = board;
  }, [board]);

  useEffect(() => {
    setBoard(createBoard(difficulty));
    setAiState((prev) => ({
      ...createAIState(),
      speed: prev.speed,
    }));
    setHighlightedCell(null);
    setPendingMove(null);
    setPendingPhase(null);
  }, [difficulty]);

  const revealFromCell = useCallback((cellId: string) => {
    setBoard((current) => {
      if (aiState.isRunning) {
        return current;
      }
      let nextBoard = current;
      if (!current.firstMoveDone) {
        const safeCell = current.cells.flat().find((cell) => cell.id === cellId);
        if (!safeCell) {
          return current;
        }
        nextBoard = placeMines(current, safeCell);
      }
      return revealCell(nextBoard, cellId);
    });
  }, [aiState.isRunning]);

  const runSingleAIMove = useCallback((baseBoard: GameBoard) => {
    const next = getNextMove(baseBoard);
    if (!next) {
      setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
      setHighlightedCell(null);
      setPendingMove(null);
      setPendingPhase(null);
      return false;
    }

    setPendingMove(next.move);
    setPendingPhase(next.phase);
    setHighlightedCell(next.move.cellId);

    if (applyTimerRef.current) {
      window.clearTimeout(applyTimerRef.current);
    }

    applyTimerRef.current = window.setTimeout(() => {
      setBoard((current) => applyMove(current, next.move));
      setAiState((prev) => ({
        ...prev,
        phase: next.phase,
        lastReason: next.move.reason,
        moveHistory: [...prev.moveHistory, next.move],
        totalMoves: prev.totalMoves + 1,
        correctMoves: prev.correctMoves + (next.move.confidence === "certain" ? 1 : 0),
      }));
      setPendingMove(null);
      setPendingPhase(null);
      setHighlightedCell(null);
    }, 300);

    return true;
  }, []);

  const handleCellClick = (cellId: string) => {
    if (aiState.isRunning) {
      return;
    }
    revealFromCell(cellId);
  };

  const handleCellRightClick = (cellId: string) => {
    if (aiState.isRunning) {
      return;
    }
    setBoard((current) => flagCell(current, cellId));
  };

  const handleAIStep = () => {
    if (aiState.isRunning) {
      return;
    }
    const currentBoard = latestBoardRef.current;
    if (currentBoard.status !== "playing") {
      return;
    }
    runSingleAIMove(currentBoard);
  };

  const handleReset = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (applyTimerRef.current) {
      window.clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
    setBoard(createBoard(difficulty));
    setAiState((prev) => ({ ...createAIState(), speed: prev.speed }));
    setHighlightedCell(null);
    setPendingMove(null);
    setPendingPhase(null);
  };

  const handleStart = () => {
    setBoard((current) => {
      if (current.status !== "idle" || current.firstMoveDone) {
        return current;
      }
      const randomRow = Math.floor(Math.random() * current.rows);
      const randomCol = Math.floor(Math.random() * current.cols);
      const safeCell = current.cells[randomRow][randomCol];
      const withMines = placeMines(current, safeCell);
      return revealCell(withMines, safeCell.id);
    });

    setAiState((prev) => ({
      ...prev,
      isRunning: true,
      phase: prev.phase === "idle" ? "constraint" : prev.phase,
    }));
  };

  const handleStop = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (applyTimerRef.current) {
      window.clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
    setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
    setHighlightedCell(null);
    setPendingMove(null);
    setPendingPhase(null);
  };

  const handleDifficultyNameChange = (name: string) => {
    const nextDifficulty = DIFFICULTIES.find((item) => item.name === name);
    if (!nextDifficulty) {
      return;
    }
    setDifficulty(nextDifficulty);
  };

  const handleDifficultyChange = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty);
  };

  useEffect(() => {
    if (!aiState.isRunning || board.status !== "playing") {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const currentBoard = latestBoardRef.current;
      if (currentBoard.status !== "playing") {
        setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
        return;
      }
      runSingleAIMove(currentBoard);
    }, aiState.speed);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [aiState.isRunning, aiState.speed, board.status, runSingleAIMove]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (applyTimerRef.current) {
        window.clearTimeout(applyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setAiState((prev) => {
      const nextPhase = prev.isRunning ? (pendingPhase ?? prev.phase) : "idle";
      if (prev.constraintCount === constraintCount && prev.phase === nextPhase) {
        return prev;
      }
      return {
        ...prev,
        constraintCount,
        phase: nextPhase,
      };
    });
  }, [constraintCount, pendingPhase]);

  const runToggle = () => {
    if (aiState.isRunning) {
      handleStop();
    } else {
      handleStart();
    }
  };
  const isMovePending = pendingMove !== null;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-6 text-zinc-100">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 text-center lg:text-left">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Minesweeper AI</h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">
            Constraint Propagation + Probability Solver
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
          <section className="space-y-4">
            <GameControls
              difficulties={DIFFICULTIES}
              selectedDifficulty={difficulty.name}
              speed={aiState.speed}
              isRunning={aiState.isRunning}
              canStep={board.status === "playing" && !isMovePending}
              onDifficultyChange={handleDifficultyNameChange}
              onSpeedChange={(speed) => setAiState((prev) => ({ ...prev, speed }))}
              onReset={handleReset}
              onStep={handleAIStep}
              onToggleRun={runToggle}
            />
            <AIPanel
              aiState={aiState}
              onStart={handleStart}
              onStop={handleStop}
              onStep={handleAIStep}
              onSpeedChange={(ms) => setAiState((prev) => ({ ...prev, speed: ms }))}
              onReset={handleReset}
              difficulty={difficulty}
              onDifficultyChange={handleDifficultyChange}
            />
            <StatsPanel aiState={aiState} board={board} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
            <Board
              board={board}
              highlightedCell={highlightedCell}
              onCellClick={handleCellClick}
              onCellRightClick={handleCellRightClick}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
