"use client";

import type { Difficulty } from "@/types";

interface GameControlsProps {
  difficulties: Difficulty[];
  selectedDifficulty: string;
  speed: number;
  isRunning: boolean;
  canStep: boolean;
  onDifficultyChange: (name: string) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onStep: () => void;
  onToggleRun: () => void;
}

export default function GameControls({
  difficulties,
  selectedDifficulty,
  speed,
  isRunning,
  canStep,
  onDifficultyChange,
  onSpeedChange,
  onReset,
  onStep,
  onToggleRun,
}: GameControlsProps) {
  return (
    <section className="w-full rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700" htmlFor="difficulty-select">
          Difficulty
        </label>
        <select
          id="difficulty-select"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          value={selectedDifficulty}
          onChange={(event) => onDifficultyChange(event.target.value)}
        >
          {difficulties.map((difficulty) => (
            <option key={difficulty.name} value={difficulty.name}>
              {difficulty.name} ({difficulty.rows}x{difficulty.cols}, {difficulty.mines} mines)
            </option>
          ))}
        </select>

        <label className="ml-2 text-sm font-medium text-zinc-700" htmlFor="speed-range">
          Speed: {speed}ms
        </label>
        <input
          id="speed-range"
          type="range"
          min={100}
          max={2000}
          step={100}
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
        />

        <button
          type="button"
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          onClick={onReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          disabled={!canStep || isRunning}
          onClick={onStep}
        >
          AI Step
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          onClick={onToggleRun}
        >
          {isRunning ? "Pause AI" : "Run AI"}
        </button>
      </div>
    </section>
  );
}
