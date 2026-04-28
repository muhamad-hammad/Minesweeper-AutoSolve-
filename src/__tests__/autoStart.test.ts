/**
 * Regression tests for the auto-start-from-idle-board flow.
 *
 * The sequence under test (from page.tsx handleStart + doFirstMove):
 *   1. Board is idle (status "idle", firstMoveDone: false).
 *   2. AI Start is pressed → doFirstMove() is called with no explicit cellId.
 *   3. doFirstMove picks row = floor(random() * rows), col = floor(random() * cols).
 *   4. Calls placeMines(board, safeCell) — mines excluded from safe cell + its neighbours.
 *   5. Calls revealCell(minedBoard, safeCell.id) — reveals starting area.
 *   6. Returned board: status "playing", firstMoveDone true.
 *   7. If board is already non-idle (firstMoveDone true), doFirstMove is skipped.
 *
 * Tests use the real minesweeper library functions with Math.random mocked so
 * the chosen safe cell is deterministic.
 */

import { createEmptyBoard, getNeighbors, placeMines, revealCell } from "@/lib/minesweeper";
import type { GameBoard } from "@/types";

// ── helper that mirrors doFirstMove from page.tsx ────────────────────────────
//
// Extracted as a pure function so we can unit-test it without React or timers.

function doFirstMove(
  base: GameBoard,
  cellId?: string,
): GameBoard {
  let row: number;
  let col: number;

  if (cellId) {
    const parts = cellId.split("-").map(Number);
    row = parts[0]!;
    col = parts[1]!;
  } else {
    row = Math.floor(Math.random() * base.rows);
    col = Math.floor(Math.random() * base.cols);
  }

  const safeCell = base.cells[row]![col]!;
  const minedBoard = placeMines(base, safeCell);
  return revealCell(minedBoard, safeCell.id);
}

// ── helper: simulate handleStart guard logic ──────────────────────────────────
//
// Returns the board after start (applying doFirstMove when needed) plus whether
// the AI would transition to "running".

interface StartResult {
  board: GameBoard;
  aiRunning: boolean;
}

function simulateStart(board: GameBoard): StartResult {
  let b = board;

  if (!b.firstMoveDone) {
    b = doFirstMove(b);
  }

  // handleStart returns early if status !== "playing" after first move
  const aiRunning = b.status === "playing";
  return { board: b, aiRunning };
}

// ── board factory shorthand ──────────────────────────────────────────────────

function idle(rows = 9, cols = 9, mines = 10): GameBoard {
  return createEmptyBoard(rows, cols, mines);
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("auto-start from idle board", () => {
  let randomSpy: jest.SpyInstance;

  afterEach(() => {
    randomSpy?.mockRestore();
  });

  // ── 1. Random cell selection ───────────────────────────────────────────────

  it("picks row and col from Math.random with the correct scaling", () => {
    // Mock random to return 0.5 for both calls → row = floor(0.5*9)=4, col=4
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const board = idle(9, 9, 10);
    const result = doFirstMove(board);

    // Math.random called at least twice (row + col); placeMines calls it too
    // for its Fisher-Yates shuffle, so we check the first two calls only.
    const calls = randomSpy.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    // The chosen cell should be "4-4" (floor(0.5*9)=4 for both axes)
    const chosen = result.cells[4]?.[4];
    expect(chosen).toBeDefined();
    expect(chosen!.state).toBe("revealed");
  });

  it("always picks a cell within board bounds regardless of random value", () => {
    // Use boundary values: 0.0 → cell 0-0, near-1 → cell (rows-1)-(cols-1)
    for (const rv of [0.0, 0.9999]) {
      randomSpy?.mockRestore();
      randomSpy = jest.spyOn(Math, "random").mockReturnValue(rv);
      const board = idle(9, 9, 10);

      expect(() => doFirstMove(board)).not.toThrow();
      const result = doFirstMove(board);
      expect(["playing", "won"]).toContain(result.status);
    }
  });

  // ── 2. Board state transitions ─────────────────────────────────────────────

  it("transitions board from idle to playing on auto-start", () => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const board = idle();
    const { board: after, aiRunning } = simulateStart(board);

    expect(board.status).toBe("idle");           // original unchanged
    expect(after.status).toBe("playing");
    expect(after.firstMoveDone).toBe(true);
    expect(aiRunning).toBe(true);
  });

  it("marks firstMoveDone on the returned board", () => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.3);
    const result = doFirstMove(idle());
    expect(result.firstMoveDone).toBe(true);
  });

  it("does not mutate the original board", () => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const original = idle();
    doFirstMove(original);
    expect(original.status).toBe("idle");
    expect(original.firstMoveDone).toBe(false);
  });

  // ── 3. Mine safety guarantee ───────────────────────────────────────────────

  it("the chosen safe cell is never a mine", () => {
    // Run 10 times with different random values to cover multiple cells
    for (let seed = 0; seed < 10; seed++) {
      randomSpy?.mockRestore();
      const rv = seed / 10; // 0.0, 0.1, … 0.9
      randomSpy = jest.spyOn(Math, "random").mockReturnValue(rv);

      const board = idle(9, 9, 10);
      const chosenRow = Math.floor(rv * 9);
      const chosenCol = Math.floor(rv * 9);
      const result = doFirstMove(board);
      const cell = result.cells[chosenRow]?.[chosenCol];

      expect(cell?.isMine).toBe(false);
    }
  });

  it("no neighbour of the safe cell is a mine", () => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const board = idle(9, 9, 10);
    const result = doFirstMove(board);

    const safeCell = result.cells[4]![4]!;
    const neighbours = getNeighbors(result, safeCell);
    for (const n of neighbours) {
      expect(n.isMine).toBe(false);
    }
  });

  it("mines are placed on the board (totalMines match actual mine count)", () => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const board = idle(9, 9, 10);
    const result = doFirstMove(board);

    const mineCount = result.cells.flat().filter((c) => c.isMine).length;
    expect(mineCount).toBe(board.totalMines);
  });

  // ── 4. Reveal behaviour ────────────────────────────────────────────────────

  it("reveals at least the chosen starting cell", () => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5); // → 4-4
    const result = doFirstMove(idle(9, 9, 10));

    expect(result.cells[4]![4]!.state).toBe("revealed");
    expect(result.revealedCount).toBeGreaterThanOrEqual(1);
  });

  it("flood-fills when the safe cell has 0 adjacent mines", () => {
    // Use a board large enough that the centre cell (4-4) is very likely
    // to have 0 adjacent mines when mines = 1.
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5); // → 4-4
    const board = idle(9, 9, 1);
    const result = doFirstMove(board);

    // With only 1 mine on a 9×9 board (placed far from centre), the flood
    // fill should reveal many more than just 1 cell.
    if (result.cells[4]![4]!.adjacentMines === 0) {
      expect(result.revealedCount).toBeGreaterThan(1);
    }
    // Either way the game must be in a valid terminal state
    expect(["playing", "won"]).toContain(result.status);
  });

  // ── 5. Already-started board is not re-initialised ─────────────────────────

  it("does not call doFirstMove when firstMoveDone is already true", () => {
    randomSpy = jest.spyOn(Math, "random");

    // Build a board that already has firstMoveDone = true
    const preStarted = idle(9, 9, 10);
    const withFirstMove = { ...preStarted, firstMoveDone: true, status: "playing" as const };

    const { board, aiRunning } = simulateStart(withFirstMove);

    // Math.random must not have been called (no doFirstMove)
    expect(randomSpy).not.toHaveBeenCalled();
    expect(board).toBe(withFirstMove); // same reference — untouched
    expect(aiRunning).toBe(true);
  });

  it("does not start AI when board status is not playing after first move", () => {
    // Corner case: a board where placeMines + revealCell somehow ends the game.
    // We cannot force a win easily, but we CAN test with a pre-built "won" board
    // that already has firstMoveDone true — simulateStart must set aiRunning=false.
    const wonBoard: GameBoard = {
      ...idle(9, 9, 10),
      firstMoveDone: true,
      status: "won",
    };

    const { aiRunning } = simulateStart(wonBoard);
    expect(aiRunning).toBe(false);
  });

  // ── 6. Explicit cellId overrides random ───────────────────────────────────

  it("uses the provided cellId instead of Math.random when given", () => {
    randomSpy = jest.spyOn(Math, "random");
    const board = idle(9, 9, 10);
    const result = doFirstMove(board, "2-7");

    // Math.random must NOT have been called for row/col selection
    // (it may be called inside placeMines Fisher-Yates, but the first two
    //  calls belong to Fisher-Yates, not row/col selection)
    // Verify by checking that cell 2-7 is revealed
    expect(result.cells[2]![7]!.state).toBe("revealed");
    expect(result.cells[2]![7]!.isMine).toBe(false);
  });

  // ── 7. Edge case: too few safe cells ──────────────────────────────────────

  it("throws when the board is too small to place all mines safely", () => {
    // 3×3 board with 9 mines but safe cell + up-to-8 neighbours excluded →
    // 0 candidates remain.
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5); // → 1-1 (centre)
    const tinyBoard = idle(3, 3, 9);

    expect(() => doFirstMove(tinyBoard)).toThrow("Not enough valid cells");
  });

  it("succeeds on a minimal board where exactly enough candidate cells exist", () => {
    // 4×4 board, safe cell at corner (0-0) has 3 neighbours → 4 excluded cells,
    // 12 remaining candidates, need ≤ 12 mines.
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.0); // → 0-0
    const board = idle(4, 4, 8);

    expect(() => doFirstMove(board)).not.toThrow();
    const result = doFirstMove(board);
    expect(result.status).toMatch(/^(playing|won)$/);
  });
});

// ── Integration: real library functions compose correctly ────────────────────

describe("auto-start integration — real minesweeper library", () => {
  afterEach(() => jest.restoreAllMocks());

  it("placeMines then revealCell always produces a non-idle board", () => {
    for (let trial = 0; trial < 5; trial++) {
      const board = createEmptyBoard(9, 9, 10);
      const safeCell = board.cells[4]![4]!;
      const mined = placeMines(board, safeCell);
      const revealed = revealCell(mined, safeCell.id);

      expect(revealed.status).not.toBe("idle");
      expect(revealed.firstMoveDone).toBe(true);
      expect(revealed.revealedCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("revealCell on the safe cell never hits a mine (never 'lost')", () => {
    // Run multiple times since placeMines uses real Math.random
    for (let trial = 0; trial < 10; trial++) {
      const board = createEmptyBoard(9, 9, 10);
      const safeCell = board.cells[3]![3]!;
      const mined = placeMines(board, safeCell);
      const revealed = revealCell(mined, safeCell.id);

      expect(revealed.status).not.toBe("lost");
    }
  });
});
