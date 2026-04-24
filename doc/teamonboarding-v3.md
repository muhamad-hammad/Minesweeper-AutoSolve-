# Team Onboarding v3 - Continuation Update

This file continues from `doc/teamonboarding-v2.md` without modifying historical versions.

## 1) What Changed Since v2

Newly added:
- `src/lib/probability.ts`

This introduces probability-based AI moves when constraint logic has no certain action.

## 2) Updated Current Structure

### Present files
- `src/app/layout.tsx`
- `src/app/page.tsx` (still starter boilerplate)
- `src/app/globals.css`
- `src/types/index.ts`
- `src/lib/minesweeper.ts`
- `src/lib/constraints.ts`
- `src/lib/probability.ts`
- `doc/teamonboarding.md`
- `doc/teamonboarding-v2.md`
- `doc/teamonboarding-v3.md`

### Planned but not yet created
- `src/components/Board.tsx`
- `src/components/Cell.tsx`
- `src/components/AIPanel.tsx`
- `src/components/StatsPanel.tsx`
- `src/components/GameControls.tsx`
- `src/lib/solver.ts`

## 3) Probability Engine (`src/lib/probability.ts`)

Implemented exports:

1. `calculateProbabilities(board, constraints): Map<string, number>`
- Builds a probability map for all hidden+unflagged cells.
- Uses baseline estimate:
  - `remainingMines / totalHiddenUnflaggedCells`
- For each constraint:
  - local estimate = `mineCount / cellIds.size`
  - updates each involved cell with `max(current, local)` for conservative risk handling.

2. `getBestProbabilityMove(board, constraints): AIMove | null`
- Selects lowest-probability hidden+unflagged cell for a reveal move.
- If board is highly risky (`lowest > 0.85`), it instead flags the highest-probability cell (if also `> 0.85`).
- Returns move reason in this format:
  - `Probability guess: XX.X% mine chance`
- Returns `null` if no hidden cells remain.

## 4) AI Logic State After This Update

Current AI foundation now has:
- Deterministic reasoning: `src/lib/constraints.ts`
- Fallback guessing: `src/lib/probability.ts`

Still pending:
- AI orchestration layer in `src/lib/solver.ts` to combine:
  - build constraints
  - simplify constraints
  - extract certain moves
  - fallback to probability move

## 5) Validation

Validation after this addition:
- `npm run lint` passes with no ESLint warnings or errors.

Automated tests are still pending.

