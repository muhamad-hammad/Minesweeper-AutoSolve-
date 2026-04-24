# Team Onboarding v2 - Current Project Progress

This is an updated onboarding snapshot.  
The original `doc/teamonboarding.md` is preserved for history.

## 1) Project Status (As of This Update)

The project is a `Next.js 14` + `TypeScript (strict)` + `Tailwind CSS` app for a Minesweeper game with AI solving logic.

Implemented foundations so far:
- Project scaffolding and tooling setup
- Shared domain types
- Core game engine logic (board + reveal/flag mechanics)
- Core AI constraint logic
- Team onboarding docs

## 2) Current Structure

### Present files
- `src/app/layout.tsx`
- `src/app/page.tsx` (still starter boilerplate)
- `src/app/globals.css`
- `src/types/index.ts`
- `src/lib/minesweeper.ts`
- `src/lib/constraints.ts`
- `doc/teamonboarding.md` (original)
- `doc/teamonboarding-v2.md` (this file)

### Planned but not yet created
- `src/components/Board.tsx`
- `src/components/Cell.tsx`
- `src/components/AIPanel.tsx`
- `src/components/StatsPanel.tsx`
- `src/components/GameControls.tsx`
- `src/lib/solver.ts`
- `src/lib/probability.ts`

## 3) Shared Types (`src/types/index.ts`)

Defined and ready for use:
- Cell model: `CellState`, `Cell`
- Board model: `GameBoard`
- AI model: `Constraint`, `AIMove`, `AIState`
- Difficulty model: `Difficulty`, `DIFFICULTIES`

Important constants:
- Beginner: `9 x 9`, `10` mines
- Intermediate: `16 x 16`, `40` mines
- Expert: `16 x 30`, `99` mines

## 4) Game Engine (`src/lib/minesweeper.ts`)

This module is pure logic (no React and no external side effects), using immutable board returns.

Implemented functions:
- `createEmptyBoard(rows, cols, totalMines)`
  - Builds hidden board with no mines yet
  - Sets `firstMoveDone: false`
- `placeMines(board, safeCell)`
  - Random mine placement, excluding clicked cell + 8 neighbors
  - Computes all `adjacentMines`
  - Sets `firstMoveDone: true`
- `revealCell(board, cellId)`
  - Handles mine hit (loss + reveal mines)
  - Handles numbered reveal
  - Handles zero-cell BFS flood fill
  - Applies win check after reveal
- `flagCell(board, cellId)`
  - Toggles flag on hidden cells
- `getNeighbors(board, cell)`
- `getHiddenNeighbors(board, cell)`
- `getUnflaggedHiddenNeighbors(board, cell)`

## 5) Constraint Engine (`src/lib/constraints.ts`)

This is the current core AI reasoning layer.

Implemented functions:
- `buildConstraints(board)`
  - Scans revealed numbered cells
  - Builds constraints from hidden + unflagged neighbors
  - Adjusts mine counts by flagged neighbors
- `simplifyConstraints(constraints)`
  - Repeated subset reduction:
    - if `A ⊆ B`, derive `B - A`
  - Deduplicates and removes empty constraints
- `extractCertainMoves(constraints)`
  - If `mineCount === 0` => reveal moves
  - If `mineCount === cellIds.size` => flag moves
  - Deduplicates by `cellId`
  - Marks confidence as `certain`

## 6) Validation

Current checks run after implementation:
- `npm run lint` passes cleanly.

No automated unit tests are added yet.

## 7) Notes for New Team Members

- Domain types are stable enough to start UI integration.
- Minesweeper board logic and constraint logic are isolated in `src/lib`.
- `src/app/page.tsx` is not yet connected to game state.
- AI orchestration layer (`solver.ts`) is the next major logic piece.

