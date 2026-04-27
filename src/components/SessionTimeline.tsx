"use client";

import { useEffect, useRef, useState } from "react";
import type { AIState, GameBoard } from "@/types";

interface SessionTimelineProps {
  aiState: AIState;
  board: GameBoard;
}

export default function SessionTimeline({ aiState, board }: SessionTimelineProps) {
  const startTimeRef = useRef<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Reset start time when board resets (status goes back to idle or firstMoveDone resets)
  const prevMoveCount = useRef(0);
  useEffect(() => {
    if (aiState.totalMoves === 0 && prevMoveCount.current > 0) {
      startTimeRef.current = null;
    }
    prevMoveCount.current = aiState.totalMoves;
  }, [aiState.totalMoves]);

  // Set start time on first AI move
  useEffect(() => {
    if (aiState.totalMoves > 0 && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, [aiState.totalMoves]);

  // Tick every second while AI is running or has moves
  useEffect(() => {
    if (aiState.totalMoves === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [aiState.totalMoves]);

  const startTime = startTimeRef.current;
  const elapsedMs = startTime !== null ? now - startTime : 0;
  const elapsedSec = elapsedMs / 1000;
  const elapsedMin = elapsedSec / 60;

  const moveRate =
    elapsedMin > 0 ? (aiState.totalMoves / elapsedMin).toFixed(1) : "—";

  const constraintSwitches = aiState.moveHistory.filter(
    (m) => m.confidence === "certain"
  ).length;
  const probabilitySwitches = aiState.moveHistory.filter(
    (m) => m.confidence === "probable"
  ).length;

  function formatDuration(ms: number): string {
    if (ms === 0) return "—";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
  }

  function formatStart(ts: number | null): string {
    if (ts === null) return "—";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  const isActive = board.status === "playing" || aiState.totalMoves > 0;

  return (
    <details className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-widest text-zinc-300">
        Session Timeline
      </summary>
      <div className="mt-3 space-y-1.5">
        <p className="text-sm text-zinc-200">
          Started:{" "}
          <span className="font-semibold text-zinc-100">{formatStart(startTime)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Duration:{" "}
          <span className="font-semibold text-zinc-100">{formatDuration(elapsedMs)}</span>
        </p>
        <p className="text-sm text-zinc-200">
          Move rate:{" "}
          <span className="font-semibold text-cyan-300">{moveRate}</span>
          {isActive && moveRate !== "—" && (
            <span className="text-zinc-500"> moves/min</span>
          )}
        </p>
        <p className="text-sm text-zinc-200">
          Phases:{" "}
          <span className="font-semibold text-cyan-400">{constraintSwitches} constraint</span>
          <span className="text-zinc-500"> / </span>
          <span className="font-semibold text-orange-400">{probabilitySwitches} probability</span>
        </p>
      </div>
    </details>
  );
}
