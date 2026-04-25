"use client";

interface StatsPanelProps {
  status: string;
  mines: number;
  flags: number;
  revealed: number;
  constraintCount: number;
  totalMoves: number;
  correctMoves: number;
}

export default function StatsPanel({
  status,
  mines,
  flags,
  revealed,
  constraintCount,
  totalMoves,
  correctMoves,
}: StatsPanelProps) {
  const accuracy = totalMoves > 0 ? ((correctMoves / totalMoves) * 100).toFixed(1) : "0.0";

  return (
    <section className="w-full rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">Stats</h2>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded bg-zinc-100 px-2 py-1">Status: {status}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">Mines: {mines}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">Flags: {flags}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">Revealed: {revealed}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">Constraints: {constraintCount}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">AI Moves: {totalMoves}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">Correct: {correctMoves}</div>
        <div className="rounded bg-zinc-100 px-2 py-1">Accuracy: {accuracy}%</div>
      </div>
    </section>
  );
}
