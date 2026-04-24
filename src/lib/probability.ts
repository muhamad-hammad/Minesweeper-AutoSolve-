import type { AIMove, Constraint, GameBoard } from "@/types";

function clampProbability(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function getHiddenUnflaggedCellIds(board: GameBoard): string[] {
  return board.cells
    .flat()
    .filter((cell) => cell.state === "hidden")
    .map((cell) => cell.id);
}

export function calculateProbabilities(board: GameBoard, constraints: Constraint[]): Map<string, number> {
  const hiddenUnflaggedIds = getHiddenUnflaggedCellIds(board);
  const totalHiddenUnflaggedCells = hiddenUnflaggedIds.length;

  if (totalHiddenUnflaggedCells === 0) {
    return new Map<string, number>();
  }

  const remainingMines = board.totalMines - board.flaggedCount;
  const baseline = clampProbability(remainingMines / totalHiddenUnflaggedCells);

  const probabilities = new Map<string, number>();
  for (const cellId of hiddenUnflaggedIds) {
    probabilities.set(cellId, baseline);
  }

  for (const constraint of constraints) {
    if (constraint.cellIds.size === 0) {
      continue;
    }

    const localProbability = clampProbability(constraint.mineCount / constraint.cellIds.size);

    for (const cellId of constraint.cellIds) {
      const current = probabilities.get(cellId);
      if (current === undefined) {
        continue;
      }
      probabilities.set(cellId, Math.max(current, localProbability));
    }
  }

  return probabilities;
}

export function getBestProbabilityMove(board: GameBoard, constraints: Constraint[]): AIMove | null {
  const probabilities = calculateProbabilities(board, constraints);
  if (probabilities.size === 0) {
    return null;
  }

  let lowestCellId: string | null = null;
  let lowestProbability = Number.POSITIVE_INFINITY;
  let highestCellId: string | null = null;
  let highestProbability = Number.NEGATIVE_INFINITY;

  for (const [cellId, probability] of probabilities.entries()) {
    if (probability < lowestProbability) {
      lowestProbability = probability;
      lowestCellId = cellId;
    }

    if (probability > highestProbability) {
      highestProbability = probability;
      highestCellId = cellId;
    }
  }

  if (!lowestCellId) {
    return null;
  }

  if (lowestProbability > 0.85 && highestCellId && highestProbability > 0.85) {
    return {
      type: "flag",
      cellId: highestCellId,
      reason: `Probability guess: ${(highestProbability * 100).toFixed(1)}% mine chance`,
      confidence: "probable",
    };
  }

  return {
    type: "reveal",
    cellId: lowestCellId,
    reason: `Probability guess: ${(lowestProbability * 100).toFixed(1)}% mine chance`,
    confidence: "probable",
  };
}
