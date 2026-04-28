import type { Cell, GameBoard } from "@/types";

type Position = { row: number; col: number };

const DIRECTIONS: Array<{ dr: number; dc: number }> = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
];

function toCellId(row: number, col: number): string {
  return `${row}-${col}`;
}

function inBounds(board: GameBoard, row: number, col: number): boolean {
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols;
}

function cloneCells(board: GameBoard): Cell[][] {
  return board.cells.map((row) => row.map((cell) => ({ ...cell })));
}

function countFlagged(cells: Cell[][]): number {
  return cells.flat().filter((cell) => cell.state === "flagged").length;
}

function countRevealed(cells: Cell[][]): number {
  return cells.flat().filter((cell) => cell.state === "revealed").length;
}

function parseCellId(cellId: string): Position | null {
  const [rowRaw, colRaw] = cellId.split("-");
  const row = Number(rowRaw);
  const col = Number(colRaw);
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }
  return { row, col };
}

function getCellById(board: GameBoard, cellId: string): Cell | null {
  const pos = parseCellId(cellId);
  if (!pos || !inBounds(board, pos.row, pos.col)) {
    return null;
  }
  return board.cells[pos.row][pos.col];
}

function buildBoard(board: GameBoard, cells: Cell[][], status: GameBoard["status"]): GameBoard {
  return {
    ...board,
    cells,
    status,
    flaggedCount: countFlagged(cells),
    revealedCount: countRevealed(cells),
  };
}

export function createEmptyBoard(rows: number, cols: number, totalMines: number): GameBoard {
  const cells: Cell[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      id: toCellId(row, col),
      row,
      col,
      isMine: false,
      state: "hidden",
      adjacentMines: 0,
    })),
  );

  return {
    cells,
    rows,
    cols,
    totalMines,
    flaggedCount: 0,
    revealedCount: 0,
    status: "idle",
    firstMoveDone: false,
  };
}

export function getNeighbors(board: GameBoard, cell: Cell): Cell[] {
  const neighbors: Cell[] = [];
  for (const { dr, dc } of DIRECTIONS) {
    const nextRow = cell.row + dr;
    const nextCol = cell.col + dc;
    if (inBounds(board, nextRow, nextCol)) {
      neighbors.push(board.cells[nextRow][nextCol]);
    }
  }
  return neighbors;
}



export function placeMines(board: GameBoard, safeCell: Cell): GameBoard {
  const excluded = new Set<string>([safeCell.id, ...getNeighbors(board, safeCell).map((c) => c.id)]);
  const candidates = board.cells.flat().filter((cell) => !excluded.has(cell.id));

  if (board.totalMines > candidates.length) {
    throw new Error("Not enough valid cells to place all mines.");
  }

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const mineIds = new Set(shuffled.slice(0, board.totalMines).map((cell) => cell.id));
  const cells = cloneCells(board).map((row) =>
    row.map((cell) => ({
      ...cell,
      isMine: mineIds.has(cell.id),
    })),
  );

  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      const current = cells[row][col];
      const adjacentMines = DIRECTIONS.reduce((count, { dr, dc }) => {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(board, nr, nc)) {
          return count;
        }
        return count + (cells[nr][nc].isMine ? 1 : 0);
      }, 0);
      current.adjacentMines = adjacentMines;
    }
  }

  return {
    ...board,
    cells,
    firstMoveDone: true,
  };
}

export function revealCell(board: GameBoard, cellId: string): GameBoard {
  if (board.status === "lost" || board.status === "won") {
    return board;
  }

  const selected = getCellById(board, cellId);
  if (!selected || selected.state === "flagged" || selected.state === "revealed") {
    return board;
  }

  const cells = cloneCells(board);
  const selectedClone = cells[selected.row][selected.col];

  if (selectedClone.isMine) {
    const minesRevealed: Cell[][] = cells.map((row) =>
      row.map((cell) => (cell.isMine ? { ...cell, state: "revealed" as const } : cell)),
    );
    return buildBoard(board, minesRevealed, "lost");
  }

  const queue: Position[] = [{ row: selectedClone.row, col: selectedClone.col }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const key = toCellId(current.row, current.col);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const currentCell = cells[current.row][current.col];
    if (currentCell.state === "flagged" || currentCell.state === "revealed" || currentCell.isMine) {
      continue;
    }

    currentCell.state = "revealed";

    if (currentCell.adjacentMines === 0) {
      for (const { dr, dc } of DIRECTIONS) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        if (inBounds(board, nr, nc)) {
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  const revealedCount = countRevealed(cells);
  const safeCells = board.rows * board.cols - board.totalMines;
  const status: GameBoard["status"] = revealedCount === safeCells ? "won" : "playing";

  return {
    ...board,
    cells,
    status,
    revealedCount,
    flaggedCount: countFlagged(cells),
  };
}

export function flagCell(board: GameBoard, cellId: string): GameBoard {
  if (board.status === "lost" || board.status === "won") {
    return board;
  }

  const target = getCellById(board, cellId);
  if (!target || target.state === "revealed") {
    return board;
  }

  const cells = cloneCells(board);
  const targetClone = cells[target.row][target.col];
  targetClone.state = targetClone.state === "flagged" ? "hidden" : "flagged";

  return {
    ...board,
    cells,
    flaggedCount: countFlagged(cells),
  };
}
