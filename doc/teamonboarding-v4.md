# Team Onboarding v4 - Continuation Update

This file continues from `doc/teamonboarding-v3.md` without modifying previous docs.

## 1) What Changed Since v3

Newly added:
- `src/lib/solver.ts`

This module is the top-level AI decision layer that chooses between deterministic constraint moves and probability fallback moves.

## 2) Updated Current Structure

### Present files
- `src/app/layout.tsx`
- `src/app/page.tsx` (still starter boilerplate)
- `src/app/globals.css`
- `src/types/index.ts`
- `src/lib/minesweeper.ts`
- `src/lib/constraints.ts`
- `src/lib/probability.ts`
- `src/lib/solver.ts`
- `doc/teamonboarding.md`
- `doc/teamonboarding-v2.md`
- `doc/teamonboarding-v3.md`
- `doc/teamonboarding-v4.md`

### Planned but not yet created
- `src/components/Board.tsx`
- `src/components/Cell.tsx`
- `src/components/AIPanel.tsx`
- `src/components/StatsPanel.tsx`
- `src/components/GameControls.tsx`

## 3) Solver Layer (`src/lib/solver.ts`)

Implemented exports:

1. `getNextMove(board): { move: AIMove; phase: 'constraint' | 'probability' } | null`
- Returns `null` when game is not in `playing` state.
- Builds constraints from current board.
- Simplifies constraints.
- Attempts deterministic move extraction first.
- If certain moves exist, returns first move with phase `constraint`.
- Otherwise attempts a probability move.
- If probability move exists, returns it with phase `probability`.
- Returns `null` when no move can be found (solved/stuck state).

2. `applyMove(board, move): GameBoard`
- For `move.type === 'reveal'`, applies `revealCell`.
- For `move.type === 'flag'`, applies `flagCell`.
- Always returns the new board state.

3. `getConstraintCount(board): number`
- Builds and simplifies constraints, then returns count.
- Intended for UI stats/debug display.

## 4) AI Pipeline Status After This Update

Current AI logic stack now includes:
- Constraint construction and reduction: `src/lib/constraints.ts`
- Probability fallback estimation: `src/lib/probability.ts`
- Top-level move selection/orchestration: `src/lib/solver.ts`

Remaining major AI work:
- Integrate solver loop into UI/game state updates.
- Add richer history/metrics tracking using `AIState`.

## 5) Validation

Validation after solver addition:
- `npm run lint` passes with no ESLint warnings or errors.

Automated tests are still pending.

## 6) Next Integration Focus

Recommended next implementation step:
- Replace starter `src/app/page.tsx` with game shell state.
- Use `createEmptyBoard` for board state creation.
- Wire user input (`reveal`/`flag`) to engine functions.
- Add AI step button/loop that uses:
  - `getNextMove`
  - `applyMove`
  - `getConstraintCount`

