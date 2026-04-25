"use client";

import type { AIMove, AIState } from "@/types";

interface AIPanelProps {
  aiState: AIState;
}

function formatMove(move: AIMove): string {
  return `${move.type.toUpperCase()} ${move.cellId} (${move.confidence})`;
}

export default function AIPanel({ aiState }: AIPanelProps) {
  const recentMoves = aiState.moveHistory.slice(-8).reverse();

  return (
    <section className="w-full rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">AI Reasoning</h2>
      <div className="mb-3 space-y-1 text-sm">
        <p>
          <span className="font-medium">Running:</span> {aiState.isRunning ? "Yes" : "No"}
        </p>
        <p>
          <span className="font-medium">Phase:</span> {aiState.phase}
        </p>
        <p>
          <span className="font-medium">Last reason:</span> {aiState.lastReason || "No moves yet"}
        </p>
      </div>

      <div className="max-h-44 space-y-1 overflow-auto rounded border border-zinc-200 p-2 text-sm">
        {recentMoves.length === 0 ? (
          <p className="text-zinc-500">No AI moves yet.</p>
        ) : (
          recentMoves.map((move, index) => (
            <p key={`${move.cellId}-${move.type}-${index}`} className="rounded bg-zinc-100 px-2 py-1">
              {formatMove(move)}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
