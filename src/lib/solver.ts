import type { AIMove, GameBoard } from "@/types";
import { buildConstraints, extractCertainMoves, simplifyConstraints } from "./constraints";
import { flagCell, revealCell } from "./minesweeper";
import { getBestProbabilityMove } from "./probability";

export function getNextMove(
  board: GameBoard,
): { move: AIMove; phase: "constraint" | "probability" } | null {
  if (board.status !== "playing") {
    return null;
  }

  const constraints = simplifyConstraints(buildConstraints(board));
  const certainMoves = extractCertainMoves(constraints);

  if (certainMoves.length > 0) {
    return {
      move: certainMoves[0],
      phase: "constraint",
    };
  }

  const probabilityMove = getBestProbabilityMove(board, constraints);
  if (probabilityMove) {
    return {
      move: probabilityMove,
      phase: "probability",
    };
  }

  return null;
}

export function applyMove(board: GameBoard, move: AIMove): GameBoard {
  if (move.type === "reveal") {
    return revealCell(board, move.cellId);
  }

  return flagCell(board, move.cellId);
}

export function getConstraintCount(board: GameBoard): number {
  return simplifyConstraints(buildConstraints(board)).length;
}
