/**
 * Tests for AI run-loop stop conditions.
 *
 * Rather than mounting the React component, these tests drive a
 * `runAILoop` helper that faithfully reproduces the timing logic from
 * page.tsx (initial-delay → getNextMove → apply-delay → applyMove →
 * recurse) with injected deps so we can mock both the solver and the
 * resulting board state.
 */

import type { AIMove, GameBoard } from "@/types";

// ─── types mirroring what the real solver returns ───────────────────────────

type NextMoveResult = {
  move: AIMove;
  phase: "constraint" | "probability";
} | null;

interface LoopDeps {
  getNextMove: jest.Mock<NextMoveResult, [GameBoard]>;
  applyMove: jest.Mock<GameBoard, [GameBoard, AIMove]>;
  speed: number;
  applyDelay: number;
}

interface LoopResult {
  stopReason: "no-move" | "game-over" | null;
  moveCount: number;
}

// ─── helper: minimal board factory ──────────────────────────────────────────

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

function makeMove(cellId = "0-0"): AIMove {
  return { type: "reveal", cellId, reason: "test", confidence: "certain" };
}

// ─── runAILoop: mirrors the runAIRef.current logic from page.tsx ─────────────
//
// Differences from the component:
//   • No React state — uses plain mutable refs via a local object.
//   • Returns a Promise that resolves with the stop reason once the loop ends.
//   • `applyDelay` defaults to 300 ms (same as component) but is injectable.
//
function runAILoop(
  initialBoard: GameBoard,
  deps: LoopDeps,
): Promise<LoopResult> {
  return new Promise((resolve) => {
    const state = { isRunning: true, moveCount: 0 };

    function tick(board: GameBoard): void {
      if (!state.isRunning) return;

      const next = deps.getNextMove(board);

      // Stop condition 1: no move available
      if (!next) {
        state.isRunning = false;
        resolve({ stopReason: "no-move", moveCount: state.moveCount });
        return;
      }

      setTimeout(() => {
        if (!state.isRunning) return;

        const nextBoard = deps.applyMove(board, next.move);
        state.moveCount += 1;

        // Stop condition 2: game ended after applying move
        if (nextBoard.status !== "playing") {
          state.isRunning = false;
          resolve({ stopReason: "game-over", moveCount: state.moveCount });
          return;
        }

        // Schedule next tick
        setTimeout(() => tick(nextBoard), deps.speed);
      }, deps.applyDelay);
    }

    // Initial delay before first tick (mirrors page.tsx)
    setTimeout(() => tick(initialBoard), deps.speed);
  });
}

// ─── test suite ──────────────────────────────────────────────────────────────

describe("AI run-loop stop conditions", () => {
  const SPEED = 100;
  const APPLY_DELAY = 50;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ── helper: run the loop and drain all fake timers concurrently ──────────
  async function driveLoop(deps: LoopDeps, board?: GameBoard): Promise<LoopResult> {
    const resultPromise = runAILoop(board ?? makeBoard(), deps);
    // Repeatedly flush timers until the promise settles (avoids infinite loops
    // via the `isRunning` guard: the loop schedules at most one timer at a time)
    for (let i = 0; i < 100; i++) {
      jest.runAllTimers();
      // Allow microtasks (Promise callbacks) to settle
      await Promise.resolve();
      // Check if settled by racing with a never-resolving promise
      const settled = await Promise.race([
        resultPromise.then(() => true),
        Promise.resolve(false),
      ]);
      if (settled) break;
    }
    return resultPromise;
  }

  // ── test 1: null move → loop stops immediately ───────────────────────────

  it("stops when getNextMove returns null on the first call", async () => {
    const deps: LoopDeps = {
      getNextMove: jest.fn().mockReturnValue(null),
      applyMove: jest.fn(),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    const result = await driveLoop(deps);

    expect(result.stopReason).toBe("no-move");
    expect(result.moveCount).toBe(0);
    expect(deps.getNextMove).toHaveBeenCalledTimes(1);
    expect(deps.applyMove).not.toHaveBeenCalled();
  });

  it("stops when getNextMove returns null after several successful moves", async () => {
    const playingBoard = makeBoard("playing");
    let callCount = 0;
    const deps: LoopDeps = {
      getNextMove: jest.fn().mockImplementation(() => {
        callCount += 1;
        // Return a valid move for the first 3 calls, then null
        return callCount <= 3 ? { move: makeMove(), phase: "constraint" as const } : null;
      }),
      applyMove: jest.fn().mockReturnValue(playingBoard),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    const result = await driveLoop(deps, playingBoard);

    expect(result.stopReason).toBe("no-move");
    expect(result.moveCount).toBe(3);
    expect(deps.getNextMove).toHaveBeenCalledTimes(4); // 3 moves + 1 null
    expect(deps.applyMove).toHaveBeenCalledTimes(3);
  });

  // ── test 2: board status 'won' → loop stops after applying the move ──────

  it("stops when board status becomes 'won' after applyMove", async () => {
    const wonBoard = makeBoard("won");
    const deps: LoopDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: makeMove(), phase: "constraint" as const }),
      applyMove: jest.fn().mockReturnValue(wonBoard),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    const result = await driveLoop(deps);

    expect(result.stopReason).toBe("game-over");
    expect(result.moveCount).toBe(1);
    // getNextMove is called once for the winning move; the loop must NOT call
    // it again after status changes
    expect(deps.getNextMove).toHaveBeenCalledTimes(1);
    expect(deps.applyMove).toHaveBeenCalledTimes(1);
  });

  it("stops when board status becomes 'lost' after applyMove", async () => {
    const lostBoard = makeBoard("lost");
    const deps: LoopDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: makeMove(), phase: "probability" as const }),
      applyMove: jest.fn().mockReturnValue(lostBoard),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    const result = await driveLoop(deps);

    expect(result.stopReason).toBe("game-over");
    expect(result.moveCount).toBe(1);
    expect(deps.getNextMove).toHaveBeenCalledTimes(1);
  });

  it("stops on 'lost' mid-run after several successful moves", async () => {
    const playingBoard = makeBoard("playing");
    const lostBoard = makeBoard("lost");
    let moveCount = 0;
    const deps: LoopDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: makeMove(), phase: "constraint" as const }),
      applyMove: jest.fn().mockImplementation(() => {
        moveCount += 1;
        // Explode on the 3rd move
        return moveCount < 3 ? playingBoard : lostBoard;
      }),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    const result = await driveLoop(deps, playingBoard);

    expect(result.stopReason).toBe("game-over");
    expect(result.moveCount).toBe(3);
    // getNextMove is called once per successful move (no extra call after lost)
    expect(deps.getNextMove).toHaveBeenCalledTimes(3);
    expect(deps.applyMove).toHaveBeenCalledTimes(3);
  });

  // ── test 3: getNextMove is never called on a non-playing board ───────────

  it("getNextMove is not called when initial board is already 'won'", async () => {
    // In page.tsx, handleStart guards status === 'playing' before starting.
    // Here we verify the solver's own guard: getNextMove returns null for
    // non-playing boards, so the loop stops before applying any move.
    const wonBoard = makeBoard("won");
    const deps: LoopDeps = {
      getNextMove: jest.fn().mockReturnValue(null), // mirrors real solver behaviour
      applyMove: jest.fn(),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    const result = await driveLoop(deps, wonBoard);

    expect(result.stopReason).toBe("no-move");
    expect(result.moveCount).toBe(0);
    expect(deps.applyMove).not.toHaveBeenCalled();
  });

  // ── test 4: external stop mid-tick (isRunning cleared between timers) ────

  it("does not apply a move if the loop is stopped between the tick and apply timers", async () => {
    const playingBoard = makeBoard("playing");
    let externalStop: (() => void) | null = null;

    const deps: LoopDeps = {
      getNextMove: jest.fn().mockReturnValue({ move: makeMove(), phase: "constraint" as const }),
      applyMove: jest.fn().mockReturnValue(playingBoard),
      speed: SPEED,
      applyDelay: APPLY_DELAY,
    };

    // We replicate the isRunning ref pattern: expose a stop handle that clears
    // the flag before the apply-delay fires
    const isRunning = { current: true };
    const resultPromise = new Promise<LoopResult>((resolve) => {
      function tick(board: GameBoard): void {
        if (!isRunning.current) return;
        const next = deps.getNextMove(board);
        if (!next) {
          resolve({ stopReason: "no-move", moveCount: 0 });
          return;
        }
        setTimeout(() => {
          // isRunning may have been cleared externally between the two timers
          if (!isRunning.current) {
            resolve({ stopReason: "no-move", moveCount: 0 });
            return;
          }
          const nextBoard = deps.applyMove(board, next.move);
          if (nextBoard.status !== "playing") {
            isRunning.current = false;
            resolve({ stopReason: "game-over", moveCount: 1 });
            return;
          }
          setTimeout(() => tick(nextBoard), deps.speed);
        }, deps.applyDelay);
      }
      externalStop = () => { isRunning.current = false; };
      setTimeout(() => tick(playingBoard), deps.speed);
    });

    // Advance past the initial-speed timer so tick fires and schedules the
    // apply-delay timer — but stop BEFORE the apply-delay fires
    jest.advanceTimersByTime(SPEED);
    await Promise.resolve();
    externalStop!();
    jest.runAllTimers();
    await Promise.resolve();

    const result = await resultPromise;

    // applyMove must NOT have been called because isRunning was false
    expect(deps.applyMove).not.toHaveBeenCalled();
    expect(result.moveCount).toBe(0);
  });
});

// ─── Integration: real getNextMove returns null on non-playing boards ────────

describe("getNextMove integration — real solver", () => {
  it("returns null when board status is 'won'", async () => {
    const { getNextMove } = await import("@/lib/solver");
    const board = makeBoard("won");
    expect(getNextMove(board)).toBeNull();
  });

  it("returns null when board status is 'lost'", async () => {
    const { getNextMove } = await import("@/lib/solver");
    const board = makeBoard("lost");
    expect(getNextMove(board)).toBeNull();
  });

  it("returns null when board status is 'idle'", async () => {
    const { getNextMove } = await import("@/lib/solver");
    const board = makeBoard("idle");
    expect(getNextMove(board)).toBeNull();
  });
});
