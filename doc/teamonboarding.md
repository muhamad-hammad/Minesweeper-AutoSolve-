# Team Onboarding - Minesweeper AI Project

This document explains what has been set up and implemented so far so any new team member can quickly understand the current state of the project.

## 1) Project Overview

This repository is a `Next.js 14` application intended to build a Minesweeper game with an AI solver and reasoning UI.

Current stack:
- Next.js 14 (App Router)
- React 18
- TypeScript (`strict: true`)
- Tailwind CSS
- ESLint (Next.js config)

The project is currently in early foundation stage: data model + core board engine functions are implemented, while UI and AI modules are still to be built.

## 2) Current Folder Structure

Implemented files right now:

- `src/app/layout.tsx` - default Next.js app layout
- `src/app/page.tsx` - default starter page (still boilerplate)
- `src/app/globals.css` - global styles and Tailwind wiring
- `src/types/index.ts` - shared game + AI domain types
- `src/lib/minesweeper.ts` - pure Minesweeper engine functions

Planned but not implemented yet (from original target structure):
- `src/components/Board.tsx`
- `src/components/Cell.tsx`
- `src/components/AIPanel.tsx`
- `src/components/StatsPanel.tsx`
- `src/components/GameControls.tsx`
- `src/lib/solver.ts`
- `src/lib/constraints.ts`
- `src/lib/probability.ts`

## 3) Type System Already Defined

The file `src/types/index.ts` is complete and contains the shared contract for the app:

- `CellState` union: `hidden | revealed | flagged`
- `Cell` interface (coordinates, mine flag, state, adjacent count)
- `GameBoard` interface (2D cells, dimensions, mine counts, game status, first move marker)
- `Constraint` interface (`Set<string>` + `mineCount`) for future solver logic
- `AIMove` union (`reveal` / `flag` with reason and confidence)
- `AIState` interface (run state, speed, history, phase, metrics)
- `Difficulty` interface
- `DIFFICULTIES` constant with:
  - Beginner (9x9, 10 mines)
  - Intermediate (16x16, 40 mines)
  - Expert (16x30, 99 mines)

This file is intended to be the source of truth for all domain-level typing.

## 4) Minesweeper Engine Implemented (`src/lib/minesweeper.ts`)

This file is implemented as a **pure logic module**:
- No React imports
- No side effects on external state
- Uses immutable return patterns (`new board` objects)

### Implemented Public API

1. `createEmptyBoard(rows, cols, totalMines): GameBoard`
- Creates a board with all cells hidden
- No mines are placed yet
- `firstMoveDone` is `false`
- Status starts as `idle`

2. `placeMines(board, safeCell): GameBoard`
- Randomly places mines
- Guaranteed safe zone: `safeCell` + its 8 neighbors
- Computes `adjacentMines` for every cell after mine placement
- Sets `firstMoveDone: true`
- Returns a new board object

3. `revealCell(board, cellId): GameBoard`
- Early exits for invalid operations (already won/lost, invalid cell, flagged/revealed cell)
- If clicked cell is a mine:
  - status becomes `lost`
  - all mines are revealed
- If clicked cell is not a mine:
  - reveal target
  - if it is zero (`adjacentMines === 0`), BFS flood-fill reveals connected zero-area + numbered border
- After reveal flow, checks win condition:
  - if all non-mine cells are revealed, status becomes `won`
  - otherwise status is `playing`

4. `flagCell(board, cellId): GameBoard`
- Toggles flag only on non-revealed cells
- Updates `flaggedCount`
- Returns a new board object

5. `getNeighbors(board, cell): Cell[]`
- Returns all valid neighboring cells (up to 8)

6. `getHiddenNeighbors(board, cell): Cell[]`
- Returns neighbors that are not revealed

7. `getUnflaggedHiddenNeighbors(board, cell): Cell[]`
- Returns neighbors that are hidden and unflagged

### Internal Helpers Included

Key helpers used by the engine:
- `toCellId`, `parseCellId`
- `inBounds`
- `cloneCells`
- `countFlagged`, `countRevealed`
- `getCellById`
- `buildBoard`

These helpers keep the public functions clean and maintain immutable behavior.

## 5) Behavior Notes and Assumptions

- Cell IDs follow format: `"{row}-{col}"`.
- `revealCell` and `flagCell` do nothing if game is already `won` or `lost`.
- Mine placement will throw if `totalMines` exceeds valid candidate cells after safe-zone exclusion.
- Status transitions currently implemented:
  - `idle` -> `playing` / `won` / `lost` via reveals
  - final states are `won` or `lost`

## 6) Validation Status

After implementing `src/lib/minesweeper.ts`, linting was run successfully:
- `npm run lint` passes with no errors.

No automated unit tests are added yet.

