import type { AIMove, Constraint, GameBoard } from "@/types";

const NEIGHBOR_OFFSETS: Array<{ dr: number; dc: number }> = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
];

function inBounds(board: GameBoard, row: number, col: number): boolean {
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols;
}

function constraintKey(constraint: Constraint): string {
  const sortedIds = Array.from(constraint.cellIds).sort();
  return `${constraint.mineCount}|${sortedIds.join(",")}`;
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size > b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function differenceSet(bigger: Set<string>, smaller: Set<string>): Set<string> {
  const diff = new Set<string>();
  for (const value of bigger) {
    if (!smaller.has(value)) {
      diff.add(value);
    }
  }
  return diff;
}

export function buildConstraints(board: GameBoard): Constraint[] {
  const constraints: Constraint[] = [];

  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.state !== "revealed" || cell.adjacentMines <= 0) {
        continue;
      }

      const hiddenUnflaggedNeighbors = new Set<string>();
      let flaggedNeighbors = 0;

      for (const { dr, dc } of NEIGHBOR_OFFSETS) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (!inBounds(board, nr, nc)) {
          continue;
        }

        const neighbor = board.cells[nr][nc];
        if (neighbor.state === "flagged") {
          flaggedNeighbors += 1;
        } else if (neighbor.state === "hidden") {
          hiddenUnflaggedNeighbors.add(neighbor.id);
        }
      }

      if (hiddenUnflaggedNeighbors.size === 0) {
        continue;
      }

      constraints.push({
        cellIds: hiddenUnflaggedNeighbors,
        mineCount: cell.adjacentMines - flaggedNeighbors,
      });
    }
  }

  return constraints;
}

export function simplifyConstraints(constraints: Constraint[]): Constraint[] {
  const map = new Map<string, Constraint>();

  for (const constraint of constraints) {
    if (constraint.cellIds.size === 0) {
      continue;
    }
    const normalized: Constraint = {
      cellIds: new Set(constraint.cellIds),
      mineCount: constraint.mineCount,
    };
    map.set(constraintKey(normalized), normalized);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const snapshot = Array.from(map.values());

    for (let i = 0; i < snapshot.length; i += 1) {
      for (let j = 0; j < snapshot.length; j += 1) {
        if (i === j) {
          continue;
        }

        const a = snapshot[i];
        const b = snapshot[j];

        if (!isSubset(a.cellIds, b.cellIds)) {
          continue;
        }

        const reducedCellIds = differenceSet(b.cellIds, a.cellIds);
        const reducedMineCount = b.mineCount - a.mineCount;

        if (reducedCellIds.size === 0) {
          continue;
        }

        const reduced: Constraint = {
          cellIds: reducedCellIds,
          mineCount: reducedMineCount,
        };

        const key = constraintKey(reduced);
        if (!map.has(key)) {
          map.set(key, reduced);
          changed = true;
        }
      }
    }
  }

  return Array.from(map.values()).filter((constraint) => constraint.cellIds.size > 0);
}

export function extractCertainMoves(constraints: Constraint[]): AIMove[] {
  const moveByCell = new Map<string, AIMove>();

  for (const constraint of constraints) {
    const cellCount = constraint.cellIds.size;
    if (cellCount === 0) {
      continue;
    }

    if (constraint.mineCount === 0) {
      const reason = `Constraint: 0 mines among ${cellCount} cells`;
      for (const cellId of constraint.cellIds) {
        moveByCell.set(cellId, {
          type: "reveal",
          cellId,
          reason,
          confidence: "certain",
        });
      }
      continue;
    }

    if (constraint.mineCount === cellCount) {
      const reason = `Constraint: all ${cellCount} cells are mines`;
      for (const cellId of constraint.cellIds) {
        moveByCell.set(cellId, {
          type: "flag",
          cellId,
          reason,
          confidence: "certain",
        });
      }
    }
  }

  return Array.from(moveByCell.values());
}
