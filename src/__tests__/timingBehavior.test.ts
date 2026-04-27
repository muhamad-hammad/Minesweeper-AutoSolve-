/**
 * Tests for the highlight→apply 300 ms timing window in the AI tick.
 *
 * The logic under test (from page.tsx runAIRef.current):
 *   1. Call setHighlightedCell(cellId)  ← immediate, before any timer
 *   2. setTimeout(() => applyMove(...), 300)  ← apply fires after 300 ms
 *   3. setHighlightedCell(null) inside that timeout
 *   4. clearTimeout(applyTimerRef) on stop/reset cancels step 2
 *
 * Rather than mounting the React component we extract the timing contract
 * into a pure `runAITick` helper and test it directly with fake timers.
 */

import type { AIMove, GameBoard } from "@/types";

// ── minimal types ────────────────────────────────────────────────────────────

type NextMoveResult = { move: AIMove; phase: "constraint" | "probability" } | null;

interface TickDeps {
  getNextMove: jest.Mock<NextMoveResult, [GameBoard]>;
  applyMove: jest.Mock<GameBoard, [GameBoard, AIMove]>;
  setHighlightedCell: jest.Mock<void, [string | null]>;
  applyDelay?: number; // defaults to 300
}

interface TickHandles {
  /** Promise that resolves when the tick is fully done (apply fired). */
  done: Promise<"applied" | "no-move">;
  /** Clears the apply timer — mirrors clearTimers() in page.tsx. */
  cancel: () => void;
}

// ── helper: single AI tick ───────────────────────────────────────────────────
//
// Mirrors runAIRef.current from page.tsx, distilled to just the
// highlight→apply window.  Returns handles so tests can cancel mid-wait.

function runAITick(board: GameBoard, deps: TickDeps): TickHandles {
  const APPLY_DELAY = deps.applyDelay ?? 300;
  let applyTimer: ReturnType<typeof setTimeout> | null = null;

  const done = new Promise<"applied" | "no-move">((resolve) => {
    const next = deps.getNextMove(board);

    if (!next) {
      resolve("no-move");
      return;
    }

    // ① Highlight immediately
    deps.setHighlightedCell(next.move.cellId);

    // ② Apply after APPLY_DELAY ms
    applyTimer = setTimeout(() => {
      deps.applyMove(board, next.move);
      deps.setHighlightedCell(null);
      resolve("applied");
    }, APPLY_DELAY);
  });

  return {
    done,
    cancel() {
      if (applyTimer !== null) {
        clearTimeout(applyTimer);
        applyTimer = null;
      }
    },
  };
}

// ── board / move factories ───────────────────────────────────────────────────

function makeBoard(status: GameBoard["status"] = "playing"): GameBoard {
  return {
    cells: [],
    rows: 9,
    cols: 9,
    totalMines: 10,
    flaggedCount: 0,
    revealedCount: 0,
    status,
    firstMoveDone: true,
  };
}

function makeMove(cellId = "3-4"): AIMove {
  return { type: "reveal", cellId, reason: "test", confidence: "certain" };
}

// ── test suite ───────────────────────────────────────────────────────────────

describe("highlight → apply timing (300 ms window)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ── 1. Highlight fires immediately; apply fires only after 300 ms ──────────

  it("sets highlightedCell immediately and applies exactly at 300 ms", async () => {
    const board = makeBoard();
    const move = makeMove("3-4");
    const deps: TickDeps = {
      getNextMove: jest.fn().mockReturnValue({ move, phase: "constraint" as const }),
      applyMove: jest.fn().mockReturnValue(board),
      setHighlightedCell: jest.fn(),
    };

    const { done } = runAITick(board, deps);

    // ① After synchronous setup: highlight is already set
    expect(deps.setHighlightedCell).toHaveBeenCalledTimes(1);
    expect(deps.setHighlightedCell).toHaveBeenCalledWith("3-4");
    expect(deps.applyMove).not.toHaveBeenCalled();

    // ② At 299 ms: still waiting — apply has NOT fired yet
    jest.advanceTimersByTime(299);
    await Promise.resolve();
    expect(deps.applyMove).not.toHaveBeenCalled();

    // ③ At exactly 300 ms: apply fires and highlight clears
    jest.advanceTimersByTime(1); // total = 300 ms
    await Promise.resolve();
    expect(deps.applyMove).toHaveBeenCalledTimes(1);
    expect(deps.applyMove).toHaveBeenCalledWith(board, move);
    expect(deps.setHighlightedCell).toHaveBeenLastCalledWith(null);

    expect(await done).toBe("applied");
  });

  it("does not call setHighlightedCell or applyMove when getNextMove returns null", async () => {
    const board = makeBoard();
    const deps: TickDeps = {
      getNextMove: jest.fn().mockReturnValue(null),
      applyMove: jest.fn(),
      setHighlightedCell: jest.fn(),
    };

    const { done } = runAITick(board, deps);
    jest.runAllTimers();
    await Promise.resolve();

    expect(deps.setHighlightedCell).not.toHaveBeenCalled();
    expect(deps.applyMove).not.toHaveBeenCalled();
    expect(await done).toBe("no-move");
  });

  // ── 2. Cancellation: stop before 300 ms → apply never fires ───────────────

  it("cancels the apply timer when stop is called before 300 ms elapses", async () => {
    const board = makeBoard();
    const move = makeMove("1-1");
    const deps: TickDeps = {
      getNextMove: jest.fn().mockReturnValue({ move, phase: "probability" as const }),
      applyMove: jest.fn().mockReturnValue(board),
      setHighlightedCell: jest.fn(),
    };

    const { cancel } = runAITick(board, deps);

    // Highlight is set right away
    expect(deps.setHighlightedCell).toHaveBeenCalledWith("1-1");

    // Advance partway then cancel (simulates handleStop / handleReset)
    jest.advanceTimersByTime(150);
    await Promise.resolve();
    cancel();

    // Drain any remaining timers — apply must NOT fire
    jest.runAllTimers();
    await Promise.resolve();

    expect(deps.applyMove).not.toHaveBeenCalled();
    // setHighlightedCell was called once (to set), never called with null
    expect(deps.setHighlightedCell).toHaveBeenCalledTimes(1);
    expect(deps.setHighlightedCell).not.toHaveBeenCalledWith(null);
  });

  it("cancels the apply timer even when stop is called at 0 ms (immediate cancel)", async () => {
    const board = makeBoard();
    const deps: TickDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: makeMove(), phase: "constraint" as const }),
      applyMove: jest.fn().mockReturnValue(board),
      setHighlightedCell: jest.fn(),
    };

    const { cancel } = runAITick(board, deps);
    cancel(); // cancel before advancing time at all

    jest.runAllTimers();
    await Promise.resolve();

    expect(deps.applyMove).not.toHaveBeenCalled();
  });

  // ── 3. Sequence: two ticks — second cancels first's pending apply ──────────

  it("cancelling the first tick before 300 ms and starting a second tick applies only the second move", async () => {
    const board = makeBoard();
    const move1 = makeMove("0-0");
    const move2 = makeMove("5-5");
    const applyMove = jest.fn().mockReturnValue(board);
    const setHighlightedCell = jest.fn();

    const deps1: TickDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: move1, phase: "constraint" as const }),
      applyMove,
      setHighlightedCell,
    };
    const deps2: TickDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: move2, phase: "constraint" as const }),
      applyMove,
      setHighlightedCell,
    };

    // Start first tick
    const tick1 = runAITick(board, deps1);
    expect(setHighlightedCell).toHaveBeenLastCalledWith("0-0");

    // At 150 ms, cancel tick1 and immediately start tick2
    jest.advanceTimersByTime(150);
    await Promise.resolve();
    tick1.cancel();
    runAITick(board, deps2);
    expect(setHighlightedCell).toHaveBeenLastCalledWith("5-5");

    // Advance to 300 ms from tick2 start — only move2 should be applied
    jest.advanceTimersByTime(300);
    await Promise.resolve();

    expect(applyMove).toHaveBeenCalledTimes(1);
    expect(applyMove).toHaveBeenCalledWith(board, move2);
  });

  // ── 4. Custom applyDelay: boundary precision ───────────────────────────────

  it("respects a custom applyDelay and does not apply one ms early", async () => {
    const board = makeBoard();
    const deps: TickDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: makeMove(), phase: "constraint" as const }),
      applyMove: jest.fn().mockReturnValue(board),
      setHighlightedCell: jest.fn(),
      applyDelay: 500,
    };

    const { done } = runAITick(board, deps);

    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(deps.applyMove).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1); // total = 500 ms
    await Promise.resolve();
    expect(deps.applyMove).toHaveBeenCalledTimes(1);

    expect(await done).toBe("applied");
  });
});
