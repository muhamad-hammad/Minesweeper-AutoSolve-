# Team Onboarding v5 - Continuation Update

This file continues from `doc/teamonboarding-v4.md` without modifying previous versions.

## 1) What Changed Since v4

Newly added and integrated:
- `src/components/Cell.tsx`
- `src/components/Board.tsx`
- `src/components/StatsPanel.tsx`
- `src/components/GameControls.tsx`
- `src/components/AIPanel.tsx`
- `src/app/page.tsx` updated from starter boilerplate to full game screen

This update moves the project from logic-only modules to a working UI that renders the game board, accepts player input, and visualizes AI behavior.

## 2) Updated Current Structure

### Present files
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/types/index.ts`
- `src/lib/minesweeper.ts`
- `src/lib/constraints.ts`
- `src/lib/probability.ts`
- `src/lib/solver.ts`
- `src/components/Cell.tsx`
- `src/components/Board.tsx`
- `src/components/StatsPanel.tsx`
- `src/components/GameControls.tsx`
- `src/components/AIPanel.tsx`
- `doc/teamonboarding.md`
- `doc/teamonboarding-v2.md`
- `doc/teamonboarding-v3.md`
- `doc/teamonboarding-v4.md`
- `doc/teamonboarding-v5.md`

## 3) UI Layer Status

### `src/app/page.tsx`

Now acts as the full app orchestrator and state container:
- Initializes board state from selected difficulty.
- Tracks AI runtime state (`isRunning`, `speed`, `phase`, `moveHistory`, metrics).
- Handles user input:
  - left click -> reveal flow (including first-click safe mine placement)
  - right click -> flag toggle
- Handles AI actions:
  - single-step execution
  - timed auto-run loop
  - move highlighting before application
- Computes and updates derived stats:
  - game status label
  - active constraint count
  - AI move correctness metrics

### `src/components/Cell.tsx`

Implements visual behavior for each board cell:
- Hidden cells with hover affordance.
- Flagged state with `🚩`.
- Revealed state with number color coding and mine display (`💣`).
- AI-highlight pulse styling for "next target" visualization.
- Framer Motion reveal animation on revealed cells.

### `src/components/Board.tsx`

Implements board-level rendering and effects:
- Responsive grid rendering for variable board sizes/difficulties.
- Cell sizing adapts to board dimensions.
- Centered layout with horizontal overflow handling on large boards.
- Board animation states:
  - win celebration motion
  - loss shake motion

### `src/components/StatsPanel.tsx`

Displays game/AI statistics in real time, including:
- game status
- total mines
- placed flags
- revealed cells
- active constraints
- AI move totals and accuracy

### `src/components/GameControls.tsx`

Provides gameplay controls:
- difficulty selection
- AI speed control
- AI run toggle
- single-step trigger
- board reset

### `src/components/AIPanel.tsx`

Now implemented as an academic/debugger-style panel:
- Algorithm status section with phase badge and confidence indicator.
- Control section with Start/Stop, Step, speed slider, difficulty selector, reset.
- Constraint section showing `Active Constraints`.
- Scrollable move log (latest 8 moves) with color-coded entries.

## 4) End-to-End Flow (Current)

Current runtime flow is now:
1. User selects difficulty and starts game with first reveal.
2. Mines are placed safely after first click.
3. User and/or AI takes moves.
4. Solver chooses deterministic constraint move first, otherwise probability fallback.
5. Board and panels update after each move.
6. Win/loss state triggers board-level animations and status updates.

## 5) Validation

Validation after this UI integration phase:
- `npm run lint` passes with no ESLint warnings or errors.

Automated tests are still pending.

## 6) Suggested Next Step

Recommended next iteration:
- Add unit tests for:
  - constraint simplification and move extraction
  - probability move selection behavior
  - solver decision priority (`constraint` before `probability`)
- Add integration tests for key UI interactions:
  - first-click safe placement
  - run/step AI controls
  - win/loss transition states

