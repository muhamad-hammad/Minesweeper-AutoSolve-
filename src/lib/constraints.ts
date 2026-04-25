import type { AIMove, Constraint, GameBoard } from "@/types";

const NEIGHBOR_OFFSETS: Array<{ dr: number; dc: number }> = [
  { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
  { dr:  0, dc: -1 },                     { dr:  0, dc: 1 },
  { dr:  1, dc: -1 }, { dr:  1, dc: 0 }, { dr:  1, dc: 1 },
];

function inBounds(board: GameBoard, row: number, col: number): boolean {
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols;
}

function constraintKey(c: Constraint): string {
  return `${c.mineCount}|${Array.from(c.cellIds).sort().join(",")}`;
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size > b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function differenceSet(bigger: Set<string>, smaller: Set<string>): Set<string> {
  const diff = new Set<string>();
  for (const v of bigger) if (!smaller.has(v)) diff.add(v);
  return diff;
}

// ---------------------------------------------------------------------------
// Step 1 — Build raw constraints from the board
// ---------------------------------------------------------------------------

export function buildConstraints(board: GameBoard): Constraint[] {
  const constraints: Constraint[] = [];

  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.state !== "revealed" || cell.adjacentMines <= 0) continue;

      const hidden = new Set<string>();
      let flagged = 0;

      for (const { dr, dc } of NEIGHBOR_OFFSETS) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (!inBounds(board, nr, nc)) continue;
        const nb = board.cells[nr][nc];
        if (nb.state === "flagged") flagged++;
        else if (nb.state === "hidden") hidden.add(nb.id);
      }

      if (hidden.size === 0) continue;
      constraints.push({ cellIds: hidden, mineCount: cell.adjacentMines - flagged });
    }
  }

  return constraints;
}

// ---------------------------------------------------------------------------
// Step 2 — Simplify via subset reduction  (A ⊆ B  →  new constraint B \ A)
// ---------------------------------------------------------------------------

export function simplifyConstraints(constraints: Constraint[]): Constraint[] {
  const map = new Map<string, Constraint>();

  for (const c of constraints) {
    if (c.cellIds.size === 0) continue;
    const norm: Constraint = { cellIds: new Set(c.cellIds), mineCount: c.mineCount };
    map.set(constraintKey(norm), norm);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const snap = Array.from(map.values());

    for (let i = 0; i < snap.length; i++) {
      for (let j = 0; j < snap.length; j++) {
        if (i === j) continue;
        const a = snap[i]!;
        const b = snap[j]!;
        if (!isSubset(a.cellIds, b.cellIds)) continue;

        const reducedCells = differenceSet(b.cellIds, a.cellIds);
        const reducedMines = b.mineCount - a.mineCount;
        if (reducedCells.size === 0) continue;

        const reduced: Constraint = { cellIds: reducedCells, mineCount: reducedMines };
        const key = constraintKey(reduced);
        if (!map.has(key)) {
          map.set(key, reduced);
          changed = true;
        }
      }
    }
  }

  return Array.from(map.values()).filter((c) => c.cellIds.size > 0);
}

// ---------------------------------------------------------------------------
// Step 3 — Extract moves that are logically certain
// ---------------------------------------------------------------------------

export function extractCertainMoves(constraints: Constraint[]): AIMove[] {
  const moves = new Map<string, AIMove>();

  for (const c of constraints) {
    if (c.cellIds.size === 0) continue;

    if (c.mineCount === 0) {
      const reason = `CSP: 0 mines among ${c.cellIds.size} cell${c.cellIds.size > 1 ? "s" : ""} — all safe`;
      for (const id of c.cellIds) {
        moves.set(id, { type: "reveal", cellId: id, reason, confidence: "certain" });
      }
    } else if (c.mineCount === c.cellIds.size) {
      const reason = `CSP: all ${c.cellIds.size} cell${c.cellIds.size > 1 ? "s" : ""} are mines`;
      for (const id of c.cellIds) {
        moves.set(id, { type: "flag", cellId: id, reason, confidence: "certain" });
      }
    }
  }

  return Array.from(moves.values());
}

// ---------------------------------------------------------------------------
// Step 4 — CSP enumeration for probability estimation
//
// Algorithm:
//   1. Partition constraints into connected components (constraints sharing
//      at least one cell belong to the same component).
//   2. For each component, backtrack through all valid mine assignments.
//      Branches are pruned early via the partial-violation check.
//   3. P(cell is mine) = frequency across valid assignments / total valid.
//   4. Components with > 22 frontier cells fall back to a per-constraint
//      local estimate to keep worst-case runtime bounded.
// ---------------------------------------------------------------------------

function findConnectedComponents(constraints: Constraint[]): Constraint[][] {
  const n = constraints.length;
  const visited = new Set<number>();
  const components: Constraint[][] = [];

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;
    const component: Constraint[] = [];
    const stack = [i];
    visited.add(i);

    while (stack.length > 0) {
      const idx = stack.pop()!;
      component.push(constraints[idx]!);

      for (let j = 0; j < n; j++) {
        if (visited.has(j)) continue;
        for (const id of constraints[idx]!.cellIds) {
          if (constraints[j]!.cellIds.has(id)) {
            visited.add(j);
            stack.push(j);
            break;
          }
        }
      }
    }
    components.push(component);
  }

  return components;
}

// True if the partial assignment already makes any constraint unsatisfiable.
function isPartiallyViolated(
  constraints: Constraint[],
  assignment: Map<string, boolean>,
): boolean {
  for (const c of constraints) {
    let mines = 0;
    let unassigned = 0;
    for (const id of c.cellIds) {
      const val = assignment.get(id);
      if (val === undefined) unassigned++;
      else if (val) mines++;
    }
    if (mines > c.mineCount) return true;
    if (mines + unassigned < c.mineCount) return true;
  }
  return false;
}

export function enumerateMineProbs(constraints: Constraint[]): Map<string, number> {
  if (constraints.length === 0) return new Map();

  const components = findConnectedComponents(constraints);
  const result = new Map<string, number>();

  for (const component of components) {
    const cellSet = new Set<string>();
    for (const c of component) for (const id of c.cellIds) cellSet.add(id);
    const cells = Array.from(cellSet);

    // Large components: fall back to per-constraint local estimate
    if (cells.length > 22) {
      for (const c of component) {
        const p = c.mineCount / c.cellIds.size;
        for (const id of c.cellIds) {
          const cur = result.get(id);
          result.set(id, cur === undefined ? p : Math.max(cur, p));
        }
      }
      continue;
    }

    const mineFreq = new Map<string, number>(cells.map((id) => [id, 0]));
    let totalValid = 0;
    const assignment = new Map<string, boolean>();

    function backtrack(idx: number): void {
      if (isPartiallyViolated(component, assignment)) return;

      if (idx === cells.length) {
        totalValid++;
        for (const [id, val] of assignment) {
          if (val) mineFreq.set(id, (mineFreq.get(id) ?? 0) + 1);
        }
        return;
      }

      const cell = cells[idx]!;

      assignment.set(cell, false);
      backtrack(idx + 1);

      assignment.set(cell, true);
      backtrack(idx + 1);

      assignment.delete(cell);
    }

    backtrack(0);

    if (totalValid > 0) {
      for (const [id, freq] of mineFreq) {
        result.set(id, freq / totalValid);
      }
    }
  }

  return result;
}
