# Team Onboarding v6 - Continuation Update

This file continues from `doc/teamonboarding-v5.md` without modifying previous versions.

## 1) What Changed Since v5

Newly updated:
- `src/app/page.tsx` (rewritten orchestrator flow)
- `src/components/StatsPanel.tsx` (new API and debugger-style analytics layout)

This update focuses on making the main page logic match the academic demo flow more closely, especially around AI move timing, pending move visualization, and control-state coordination.

## 2) Main Orchestrator Update (`src/app/page.tsx`)

The page now manages all critical runtime state from one place using `useState`, `useRef`, `useEffect`, and `useCallback`.

### Core state tracked in page
- `board: GameBoard`
- `aiState: AIState`
- `highlightedCell: string | null`
- `difficulty: Difficulty`
- `pendingMove: AIMove | null`

Additional internal runtime state:
- `pendingPhase` to track move source (`constraint` / `probability`) before apply
- timeout refs for safe cleanup and cancellation

### Flow changes implemented

1. **Game initialization**
- Board is created from selected difficulty.
- Difficulty change resets board and AI runtime state.
- First reveal places mines with a safe zone before reveal.

2. **Manual play constraints**
- Left-click reveal follows first-move-safe behavior.
- Right-click toggles flags via board handlers.
- Manual interactions are blocked while AI is running.

3. **AI loop behavior**
- AI runs only when `isRunning` and board status is `playing`.
- Uses speed-based timeout ticks.
- On each tick:
  - gets next move from solver
  - highlights the target cell
  - waits 300ms
  - applies move
  - updates history, phase, totals, and certain-move accuracy metric
- Stops and returns to idle if no move is available.

4. **Auto-start on AI run**
- If board is idle and AI start is pressed:
  - random safe cell is selected
  - mines are placed
  - first reveal is applied
  - AI run begins automatically

5. **Timeout safety**
- All queued timers are cleared on:
  - stop action
  - reset action
  - effect cleanup
  - component unmount

## 3) Stats Panel Update (`src/components/StatsPanel.tsx`)

The panel now follows the same dark technical style used in `AIPanel`.

### API change
- Old props were replaced with:
  - `aiState: AIState`
  - `board: GameBoard`

### New displayed sections

1. **Game Stats**
- Mines remaining
- Revealed safe cells ratio
- Color-coded current status

2. **AI Performance**
- Total move count
- Certain vs probable ratio
- Visual ratio bar
- Certainty percentage (`X% certain`)
- Current phase label

3. **How It Works** (collapsible)
- Constraint solver explanation
- Subset reduction rule (`A ⊆ B -> B-A`)
- Probability fallback explanation

## 4) Layout/Presentation State

Current `page.tsx` layout now uses:
- dark background
- title: `Minesweeper AI`
- subtitle: `Constraint Propagation + Probability Solver`
- responsive split:
  - control/analysis panels on left (or top on small screens)
  - board area on right (or below on small screens)

## 5) Validation

After these updates:
- `npm run lint` passes with no ESLint warnings or errors.

Automated tests are still pending.

## 6) Suggested Next Step

Recommended next improvement for demo quality:
- Add a lightweight session timeline panel (start time, move rate, phase switches).
- Add regression tests for:
  - AI run-loop stop conditions
  - pending highlight -> apply timing behavior
  - auto-start from idle board

