"use client";

import { motion } from "framer-motion";
import Cell from "./Cell";
import type { GameBoard } from "@/types";

interface BoardProps {
  board: GameBoard;
  highlightedCell: string | null;
  onCellClick: (cellId: string) => void;
  onCellRightClick: (cellId: string) => void;
}

function getCellPixelSize(board: GameBoard): number {
  const maxDimension = Math.max(board.rows, board.cols);
  if (maxDimension >= 30) {
    return 24;
  }
  if (maxDimension >= 20) {
    return 28;
  }
  if (maxDimension >= 16) {
    return 32;
  }
  return 38;
}

export default function Board({ board, highlightedCell, onCellClick, onCellRightClick }: BoardProps) {
  const cellSize = getCellPixelSize(board);
  const boardWidth = board.cols * cellSize + (board.cols - 1) * 3;

  const animateState =
    board.status === "won" ? "won" : board.status === "lost" ? "lost" : "idle";

  return (
    <div className="flex w-full justify-center overflow-x-auto px-2 py-3">
      <motion.div
        variants={{
          idle: { scale: 1, x: 0, y: 0 },
          won: {
            scale: [1, 1.03, 1],
            y: [0, -4, 0],
            transition: { duration: 0.45, ease: "easeOut" },
          },
          lost: {
            x: [0, -8, 8, -6, 6, -3, 3, 0],
            transition: { duration: 0.45, ease: "easeInOut" },
          },
        }}
        animate={animateState}
        className="rounded-lg bg-zinc-300/70 p-2 shadow-md"
        style={{
          width: `${boardWidth}px`,
          minWidth: `${boardWidth}px`,
        }}
      >
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
          }}
        >
          {board.cells.flat().map((cell) => (
            <div key={cell.id} style={{ width: `${cellSize}px` }}>
              <Cell
                cell={cell}
                isHighlighted={highlightedCell === cell.id}
                onClick={() => onCellClick(cell.id)}
                onRightClick={() => onCellRightClick(cell.id)}
              />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
