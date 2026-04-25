import type { AIMove, Constraint, GameBoard } from "@/types";
import { enumerateMineProbs } from "./constraints";

// ---------------------------------------------------------------------------
// Probability calculation
//
// Frontier cells (cells referenced by at least one constraint) get their
// probabilities from CSP enumeration — the exact fraction of valid mine
// assignments in which they are mines.
//
// Non-frontier cells get a global baseline: the expected remaining mines
// after subtracting the frontier's expected mine count, divided by the
// number of non-frontier hidden cells.
// ---------------------------------------------------------------------------

export function calculateProbabilities(
  board: GameBoard,
  constraints: Constraint[],
): Map<string, number> {
  const hiddenCells = board.cells.flat().filter((c) => c.state === "hidden");
  if (hiddenCells.length === 0) return new Map();

  const remainingMines = board.totalMines - board.flaggedCount;

  // Exact probabilities for frontier cells via CSP enumeration
  const enumProbs = enumerateMineProbs(constraints);

  // Frontier = every cell that appears in at least one constraint
  const frontierIds = new Set<string>();
  for (const c of constraints) for (const id of c.cellIds) frontierIds.add(id);

  const nonFrontierCells = hiddenCells.filter((c) => !frontierIds.has(c.id));

  // Expected mines already accounted for by the frontier
  let expectedFrontierMines = 0;
  for (const p of enumProbs.values()) expectedFrontierMines += p;

  // Remaining mines spread uniformly over non-frontier hidden cells
  const remainingForNonFrontier = Math.max(0, remainingMines - expectedFrontierMines);
  const nonFrontierBaseline =
    nonFrontierCells.length > 0
      ? Math.min(1, remainingForNonFrontier / nonFrontierCells.length)
      : 0;

  const result = new Map<string, number>();
  for (const cell of hiddenCells) {
    result.set(
      cell.id,
      enumProbs.has(cell.id) ? enumProbs.get(cell.id)! : nonFrontierBaseline,
    );
  }
  return result;
}

export function getBestProbabilityMove(
  board: GameBoard,
  constraints: Constraint[],
): AIMove | null {
  const probs = calculateProbabilities(board, constraints);
  if (probs.size === 0) return null;

  let safestId: string | null = null;
  let safestProb = Infinity;
  let mostDangerousId: string | null = null;
  let mostDangerousProb = -Infinity;

  for (const [id, p] of probs) {
    if (p < safestProb) { safestProb = p; safestId = id; }
    if (p > mostDangerousProb) { mostDangerousProb = p; mostDangerousId = id; }
  }

  if (!safestId) return null;

  // Flag a cell we're highly confident is a mine
  if (mostDangerousId && mostDangerousProb >= 0.85) {
    return {
      type: "flag",
      cellId: mostDangerousId,
      reason: `Probability: ${(mostDangerousProb * 100).toFixed(1)}% mine`,
      confidence: "probable",
    };
  }

  return {
    type: "reveal",
    cellId: safestId,
    reason: `Probability: ${(safestProb * 100).toFixed(1)}% mine risk`,
    confidence: "probable",
  };
}
