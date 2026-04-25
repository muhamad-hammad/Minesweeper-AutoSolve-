"use client";

import { motion } from "framer-motion";
import Cell from "./Cell";
import type { GameBoard } from "@/types";

interface BoardProps {
  board: GameBoard;
  highlightedCell: string | null;
  revealOriginCell: string | null;
  onCellClick: (cellId: string) => void;
  onCellRightClick: (cellId: string) => void;
}

function cellPixelSize(board: GameBoard): number {
  const max = Math.max(board.rows, board.cols);
  if (max >= 30) return 22;
  if (max >= 20) return 26;
  if (max >= 16) return 30;
  return 34;
}

function parseCellId(id: string | null): { row: number; col: number } | null {
  if (!id) return null;
  const [r, c] = id.split("-").map(Number);
  if (r === undefined || c === undefined || Number.isNaN(r) || Number.isNaN(c)) return null;
  return { row: r, col: c };
}

export default function Board({
  board,
  highlightedCell,
  revealOriginCell,
  onCellClick,
  onCellRightClick,
}: BoardProps) {
  const size   = cellPixelSize(board);
  const width  = board.cols * size + (board.cols - 1) * 3;
  const origin = parseCellId(revealOriginCell);

  const mineOrder = new Map<string, number>();
  board.cells
    .flat()
    .filter((c) => c.isMine && c.state === "revealed")
    .forEach((c, i) => mineOrder.set(c.id, i));

  const animState =
    board.status === "won" ? "won" : board.status === "lost" ? "lost" : "idle";

  return (
    <div className="flex w-full justify-center overflow-x-auto px-2 py-3">
      <motion.div
        animate={animState}
        variants={{
          idle: { scale: 1, x: 0, y: 0, boxShadow: "0 0 0px rgba(34,197,94,0)" },
          won: {
            scale: [1, 1.03, 1],
            y: [0, -4, 0],
            boxShadow: [
              "0 0 0px rgba(34,197,94,0)",
              "0 0 32px rgba(34,197,94,0.55)",
              "0 0 12px rgba(34,197,94,0.3)",
            ],
            transition: { duration: 0.7, ease: "easeOut" },
          },
          lost: {
            x: [0, -8, 8, -6, 6, -3, 3, 0],
            boxShadow: [
              "0 0 0px rgba(239,68,68,0)",
              "0 0 28px rgba(239,68,68,0.65)",
              "0 0 0px rgba(239,68,68,0)",
            ],
            transition: { duration: 0.55, ease: "easeInOut" },
          },
        }}
        className="rounded-lg bg-zinc-300/70 p-2 shadow-md"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
      >
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}
        >
          {board.cells.flat().map((cell) => {
            const dist = origin
              ? Math.hypot(cell.row - origin.row, cell.col - origin.col)
              : 0;
            const revealDelayMs     = Math.min(220, Math.round(dist * 18));
            const mineRevealDelayMs = (mineOrder.get(cell.id) ?? 0) * 50;

            return (
              <div key={cell.id} style={{ width: `${size}px` }}>
                <Cell
                  cell={cell}
                  isHighlighted={highlightedCell === cell.id}
                  revealDelayMs={revealDelayMs}
                  mineRevealDelayMs={mineRevealDelayMs}
                  isLossState={board.status === "lost"}
                  onClick={() => onCellClick(cell.id)}
                  onRightClick={() => onCellRightClick(cell.id)}
                />
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
