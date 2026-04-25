"use client";

import { motion } from "framer-motion";
import type { Cell as CellType } from "@/types";

interface CellProps {
  cell: CellType;
  isHighlighted: boolean;
  onClick: () => void;
  onRightClick: () => void;
}

const numberColors: Record<number, string> = {
  1: "text-blue-600",
  2: "text-green-600",
  3: "text-red-600",
  4: "text-blue-900",
  5: "text-red-900",
  6: "text-teal-600",
  7: "text-black",
  8: "text-gray-600",
};

export default function Cell({ cell, isHighlighted, onClick, onRightClick }: CellProps) {
  const baseClasses =
    "relative flex aspect-square w-full select-none items-center justify-center rounded-md border text-sm font-bold transition-all duration-150 sm:text-base";

  const highlightClasses = isHighlighted
    ? "animate-pulse border-yellow-400 ring-2 ring-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.6)]"
    : "";

  const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onRightClick();
  };

  if (cell.state === "hidden") {
    return (
      <button
        type="button"
        aria-label={`Hidden cell ${cell.id}`}
        className={`${baseClasses} ${highlightClasses} border-zinc-600 bg-zinc-700 text-zinc-100 hover:bg-zinc-600`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      />
    );
  }

  if (cell.state === "flagged") {
    return (
      <button
        type="button"
        aria-label={`Flagged cell ${cell.id}`}
        className={`${baseClasses} ${highlightClasses} border-zinc-600 bg-zinc-700 text-orange-500 hover:bg-zinc-600`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        🚩
      </button>
    );
  }

  const content = cell.isMine ? "💣" : cell.adjacentMines > 0 ? cell.adjacentMines : "";
  const numberClass = cell.isMine ? "text-black" : numberColors[cell.adjacentMines] ?? "text-zinc-700";

  return (
    <motion.button
      type="button"
      aria-label={`Revealed cell ${cell.id}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`${baseClasses} ${highlightClasses} ${numberClass} cursor-default border-zinc-400 bg-zinc-200`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      {content}
    </motion.button>
  );
}
