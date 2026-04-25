"use client";

import { useEffect, useMemo, useState } from "react";
import AIPanel from "@/components/AIPanel";
import Board from "@/components/Board";
import GameControls from "@/components/GameControls";
import StatsPanel from "@/components/StatsPanel";
import { createEmptyBoard, flagCell, placeMines, revealCell } from "@/lib/minesweeper";
import { applyMove, getConstraintCount, getNextMove } from "@/lib/solver";
import type { AIMove, AIState, Difficulty, GameBoard } from "@/types";
import { DIFFICULTIES } from "@/types";

const DEFAULT_DIFFICULTY = DIFFICULTIES[0];

function createBoardFromDifficulty(difficulty: Difficulty): GameBoard {
  return createEmptyBoard(difficulty.rows, difficulty.cols, difficulty.mines);
}

function getDifficultyByName(name: string): Difficulty {
  return DIFFICULTIES.find((difficulty) => difficulty.name === name) ?? DEFAULT_DIFFICULTY;
}

function createInitialAIState(): AIState {
  return {
    isRunning: false,
    speed: 500,
    moveHistory: [],
    lastReason: "",
    phase: "idle",
    constraintCount: 0,
    correctMoves: 0,
    totalMoves: 0,
  };
}

export default function Home() {
  const [selectedDifficulty, setSelectedDifficulty] = useState(DEFAULT_DIFFICULTY.name);
  const [board, setBoard] = useState(() => createBoardFromDifficulty(DEFAULT_DIFFICULTY));
  const [aiState, setAiState] = useState<AIState>(createInitialAIState);
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (board.status === "won") {
      return "You won!";
    }
    if (board.status === "lost") {
      return "Game over";
    }
    if (board.status === "idle") {
      return "Click a cell to start";
    }
    return "Playing";
  }, [board.status]);

  const constraintCount = useMemo(() => getConstraintCount(board), [board]);

  const resetBoard = (difficultyName: string) => {
    const difficulty = getDifficultyByName(difficultyName);
    setBoard(createBoardFromDifficulty(difficulty));
    setHighlightedCell(null);
    setAiState((prev) => ({
      ...createInitialAIState(),
      speed: prev.speed,
    }));
  };

  const handleReset = () => {
    resetBoard(selectedDifficulty);
  };

  const handleCellClick = (cellId: string) => {
    setBoard((current) => {
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
  };

  const handleCellRightClick = (cellId: string) => {
    setBoard((current) => flagCell(current, cellId));
  };

  const performAIMove = (move: AIMove, phase: "constraint" | "probability") => {
    setBoard((current) => {
      const target = current.cells.flat().find((cell) => cell.id === move.cellId);
      const isCorrect = target ? (move.type === "flag" ? target.isMine : !target.isMine) : false;
      const nextBoard = applyMove(current, move);

      setAiState((prev) => ({
        ...prev,
        phase,
        lastReason: move.reason,
        moveHistory: [...prev.moveHistory, move],
        totalMoves: prev.totalMoves + 1,
        correctMoves: prev.correctMoves + (isCorrect ? 1 : 0),
      }));

      return nextBoard;
    });
  };

  const handleAIStep = () => {
    if (board.status !== "playing") {
      return;
    }

    const next = getNextMove(board);
    if (!next) {
      setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
      setHighlightedCell(null);
      return;
    }

    setHighlightedCell(next.move.cellId);
    window.setTimeout(() => {
      performAIMove(next.move, next.phase);
      setHighlightedCell(null);
    }, Math.min(250, Math.max(120, aiState.speed / 2)));
  };

  useEffect(() => {
    if (!aiState.isRunning || board.status !== "playing") {
      return;
    }

    const timer = window.setTimeout(() => {
      const next = getNextMove(board);
      if (!next) {
        setAiState((prev) => ({ ...prev, isRunning: false, phase: "idle" }));
        setHighlightedCell(null);
        return;
      }

      setHighlightedCell(next.move.cellId);
      const applyTimer = window.setTimeout(() => {
        performAIMove(next.move, next.phase);
        setHighlightedCell(null);
      }, 120);

      return () => window.clearTimeout(applyTimer);
    }, aiState.speed);

    return () => window.clearTimeout(timer);
  }, [aiState.isRunning, aiState.speed, board]);

  useEffect(() => {
    setAiState((prev) => ({
      ...prev,
      constraintCount,
      phase: prev.isRunning ? prev.phase : "idle",
    }));
  }, [constraintCount]);

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Minesweeper AI</h1>

        <GameControls
          difficulties={DIFFICULTIES}
          selectedDifficulty={selectedDifficulty}
          speed={aiState.speed}
          isRunning={aiState.isRunning}
          canStep={board.status === "playing"}
          onDifficultyChange={(name) => {
            setSelectedDifficulty(name);
            resetBoard(name);
          }}
          onSpeedChange={(speed) => setAiState((prev) => ({ ...prev, speed }))}
          onReset={handleReset}
          onStep={handleAIStep}
          onToggleRun={() =>
            setAiState((prev) => ({
              ...prev,
              isRunning: !prev.isRunning && board.status === "playing",
            }))
          }
        />

        <Board
          board={board}
          highlightedCell={highlightedCell}
          onCellClick={handleCellClick}
          onCellRightClick={handleCellRightClick}
        />

        <StatsPanel
          status={statusLabel}
          mines={board.totalMines}
          flags={board.flaggedCount}
          revealed={board.revealedCount}
          constraintCount={aiState.constraintCount}
          totalMoves={aiState.totalMoves}
          correctMoves={aiState.correctMoves}
        />

        <AIPanel aiState={aiState} />
      </div>
    </main>
  );
}
