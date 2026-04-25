import type { AIMove, GameBoard } from "@/types";
import { buildConstraints, extractCertainMoves, simplifyConstraints } from "./constraints";
import { flagCell, revealCell } from "./minesweeper";
import { getBestProbabilityMove } from "./probability";

// ---------------------------------------------------------------------------
// Main solver entry point
//
// Strategy:
//   1. Build constraints from all revealed numbered cells.
//   2. Simplify via subset reduction to discover implied constraints.
//   3. Extract certain moves (mineCount == 0 → reveal all; mineCount ==
//      cellCount → flag all).
//   4. If no certain moves remain, fall back to CSP-enumeration probability
//      and pick the cell with the lowest mine probability to reveal (or flag
//      the cell with the highest probability when > 85 %).
// ---------------------------------------------------------------------------

export function getNextMove(
  board: GameBoard,
): { move: AIMove; phase: "constraint" | "probability" } | null {
  if (board.status !== "playing") return null;

  const constraints = simplifyConstraints(buildConstraints(board));
  const certain = extractCertainMoves(constraints);

  if (certain.length > 0) {
    return { move: certain[0]!, phase: "constraint" };
  }

  const probMove = getBestProbabilityMove(board, constraints);
  if (probMove) {
    return { move: probMove, phase: "probability" };
  }

  return null;
}

export function applyMove(board: GameBoard, move: AIMove): GameBoard {
  return move.type === "reveal"
    ? revealCell(board, move.cellId)
    : flagCell(board, move.cellId);
}

export function getConstraintCount(board: GameBoard): number {
  return simplifyConstraints(buildConstraints(board)).length;
}
