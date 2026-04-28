# Implementation Plan for Minesweeper AI Project

This document outlines the detailed implementation plan for remaining features in the Minesweeper AI project, a Next.js 14 application with TypeScript, Tailwind CSS, and an AI solver. The plan is based on team onboarding docs (v1-v6) and focuses on enhancing demo quality, UI, and testing.

## Overview
- **Current State**: Functional game with AI solver (constraint propagation + probability), UI components, and orchestrator.
- **Goals**: Add session analytics, regression tests, homepage/how-to-play, and CSP code showcase.
- **Total Estimated Effort**: 20-30 hours.
- **Prioritization**: Start with analytics/tests for stability, then UI for polish.

## Phase 1: Add Lightweight Session Timeline Panel (4-6 hours)
**Tasks**:
- Create `src/components/SessionTimeline.tsx` to display session analytics.
- Track and display: start time, total duration, move rate (moves per minute), phase switches (counts of constraint vs. probability phases).
- Integrate into `StatsPanel.tsx` as a collapsible section; update in real-time using `aiState` history/metrics.
- Reset on new game/session.

**Dependencies**: `AIState` interface supports history; existing `StatsPanel.tsx` layout.

**Success Criteria**: Panel shows accurate, updating stats; integrates without layout breaks; no performance impact.

**Detailed Prompt for AI Implementation**:
```
You are implementing a session timeline panel for a Minesweeper AI demo app built with Next.js 14, TypeScript, and Tailwind CSS. The app has a game board, AI solver (constraint + probability phases), and stats panel.

Current codebase context:
- `src/types/index.ts` defines `AIState` with history, phase, and metrics.
- `src/components/StatsPanel.tsx` displays game/AI stats in a dark technical style.
- `src/app/page.tsx` manages board and AI state, including move history.

Task: Add a lightweight session timeline panel.
- Create `src/components/SessionTimeline.tsx` as a new component.
- Track: session start time (timestamp), total duration (elapsed time), move rate (moves per minute, calculated from history length and duration), phase switches (count of 'constraint' vs 'probability' phases from history).
- Display in a collapsible section within `StatsPanel.tsx` (e.g., using a details/summary element).
- Update in real-time: pass `aiState` as prop; compute metrics on render.
- Reset on game reset: clear start time and counters when board resets.
- Style: Match dark theme (Tailwind classes like bg-gray-800, text-white); keep compact (e.g., 3-4 lines of text).
- No external dependencies; use React hooks (useState, useEffect) for timing.

Implementation steps:
1. Define component props: { aiState: AIState, board: GameBoard }.
2. In component: Track start time with useRef; compute duration/rate/switches from aiState.history.
3. Render: Collapsible section with labels like "Session: Started at X, Duration: Y mins, Rate: Z moves/min, Phases: A constraint / B probability".
4. Integrate: Import and add to StatsPanel.tsx layout.
5. Test: Ensure updates on AI moves; resets on new game.

Output: Complete, runnable code for the new component and updated StatsPanel. Ensure TypeScript strict compliance and no lint errors.
```

## Phase 2: Add Regression Tests (6-10 hours total)
**Tasks**: Add automated tests for the three specified behaviors. Use a testing framework (e.g., Jest/Vitest) integrated into the project.

**Dependencies**: Unit/integration test setup; existing AI/UI logic.

**Success Criteria**: Tests pass reliably; cover edge cases; integrate into CI.

### Sub-Phase 2.1: AI Run-Loop Stop Conditions (2-3 hours)
**Tasks**:
- Test AI stops when `getNextMove` returns null (solved board).
- Test AI stops on game won/lost.
- Mock `getNextMove` returning null; verify loop halts without errors.

**Detailed Prompt for AI Implementation**:
```
You are adding regression tests for AI run-loop stop conditions in a Minesweeper AI app with Next.js, TypeScript, and AI solver logic.

Current codebase context:
- `src/lib/solver.ts` has `getNextMove` (returns null if no move).
- `src/app/page.tsx` manages AI loop with `isRunning`, timeouts, and `applyMove`.
- AI runs only when board status is 'playing'; stops on no move or status change.

Task: Add tests for AI run-loop stop conditions.
- Test case 1: AI stops when `getNextMove` returns null (e.g., fully solved board).
- Test case 2: AI stops when board status changes to 'won' or 'lost' during loop.
- Use mocks for `getNextMove` and board state.
- Framework: Jest or Vitest (assume setup in package.json).
- File: Create `src/__tests__/aiRunLoop.test.ts` or similar.

Implementation steps:
1. Mock solver and board functions.
2. Simulate AI start; trigger conditions (null move, status change); assert loop stops (e.g., isRunning false, no further calls).
3. Cover edge: Loop running when condition hits mid-tick.
4. Run tests: Ensure no infinite loops or crashes.

Output: Complete test file with passing tests. Ensure mocks are realistic and tests are isolated.
```

### Sub-Phase 2.2: Pending Highlight -> Apply Timing Behavior (2-3 hours)
**Tasks**:
- Test 300ms delay between highlight and apply.
- Test safe cancellation (e.g., stop button clears timeout).
- Mock timeouts; verify sequence: highlight cell -> wait -> apply move.

**Detailed Prompt for AI Implementation**:
```
You are adding regression tests for pending highlight -> apply timing in a Minesweeper AI app with Next.js, TypeScript, and AI loop.

Current codebase context:
- `src/app/page.tsx` AI loop: gets move, highlights cell (sets `highlightedCell`), waits 300ms, applies move.
- Uses `setTimeout` with refs for cleanup on stop/reset.

Task: Add tests for timing behavior.
- Test case 1: Highlight sets for 300ms before apply (mock time; verify sequence).
- Test case 2: Cancellation on stop/reset clears timeout (no apply if stopped mid-wait).
- Framework: Jest/Vitest with fake timers.
- File: Create `src/__tests__/timingBehavior.test.ts`.

Implementation steps:
1. Mock page state and timeouts.
2. Simulate AI tick: Assert highlight set immediately, apply after 300ms.
3. Simulate stop: Assert timeout cleared, no apply.
4. Use fake timers to control time.

Output: Complete test file. Ensure timing is precise and cancellation works.
```

### Sub-Phase 2.3: Auto-Start from Idle Board (2-3 hours)
**Tasks**:
- Test auto-start: From idle board, AI start selects random safe cell, places mines, reveals, begins run.
- Mock random selection; verify sequence and state changes.

**Detailed Prompt for AI Implementation**:
```
You are adding regression tests for auto-start from idle board in a Minesweeper AI app with Next.js, TypeScript.

Current codebase context:
- `src/app/page.tsx`: If idle and AI start pressed, select random safe cell, place mines, reveal, start AI loop.
- Uses `createEmptyBoard`, `placeMines`, `revealCell`.

Task: Add tests for auto-start behavior.
- Test case: Idle board + AI start -> random safe cell selected, mines placed, first reveal applied, AI running.
- Mock random; verify board transitions (idle -> playing), mines placed safely, AI state updates.
- Framework: Jest/Vitest.
- File: Create `src/__tests__/autoStart.test.ts`.

Implementation steps:
1. Mock board creation and random.
2. Simulate idle state + start; assert sequence of calls and state changes.
3. Edge: No safe cells available (should handle gracefully).

Output: Complete test file. Ensure auto-start is reliable.
```

## Phase 3: UI Changes - Add Homepage and How to Play (6-8 hours)
**Tasks**:
- Create a homepage (`src/app/page.tsx` update or new route) with intro, demo link, and navigation.
- Add "How to Play" section explaining Minesweeper rules, AI features, and controls.
- Update layout for better navigation (e.g., routing between homepage and game).
- Style consistently with dark theme.

**Dependencies**: Existing layout and components; add Next.js routing if needed.

**Success Criteria**: Homepage loads first; clear instructions; seamless navigation to game.

**Detailed Prompt for AI Implementation**:
```
You are updating the UI for a Minesweeper AI app with Next.js 14, TypeScript, and Tailwind CSS to add a homepage and how-to-play section.

Current codebase context:
- `src/app/page.tsx` is the main game page.
- Layout uses dark theme; responsive split for panels and board.

Task: Add homepage and how to play.
- Create/update `src/app/page.tsx` to include a homepage view (e.g., conditional render based on state or new route like `/` for home, `/game` for play).
- Homepage content: Title "Minesweeper AI", subtitle, brief description, "Start Game" button, links to "How to Play".
- How to Play: Section with rules (mine avoidance, flagging, reveals), AI explanation (constraint/probability), controls (left-click, right-click, AI buttons).
- Navigation: Use Next.js Link or state toggle for routing.
- Style: Dark theme (bg-gray-900, text-white); responsive (mobile-friendly).
- No new dependencies; keep lightweight.

Implementation steps:
1. Modify page.tsx: Add state for view (home/game); render homepage with intro and button to switch to game.
2. Add How to Play: Collapsible or separate section with bullet points/images.
3. Integrate: Ensure game state persists on navigation.
4. Test: Homepage loads; navigation works; content accurate.

Output: Updated page.tsx code. Ensure TypeScript compliance and no lint errors.
```

## Phase 4: Add CSP Code Showcase in Sidebar (4-6 hours)
**Tasks**:
- Add a sidebar section in `AIPanel.tsx` or new component to display CSP algorithm code line-by-line.
- Showcase key functions from `constraints.ts` and `solver.ts` (e.g., buildConstraints, simplifyConstraints).
- Highlight current executing line based on AI phase/state.
- Make it educational/demo-focused.

**Dependencies**: Existing `AIPanel.tsx`; AI state tracking.

**Success Criteria**: Code displays accurately; highlights update with AI progress; enhances academic value.

**Detailed Prompt for AI Implementation**:
```
You are adding a CSP (Constraint Satisfaction Problem) code showcase to the sidebar of a Minesweeper AI app with Next.js 14, TypeScript, and Tailwind CSS.

Current codebase context:
- `src/components/AIPanel.tsx` is the academic panel with status, controls, constraints.
- `src/lib/constraints.ts` and `src/lib/solver.ts` contain CSP logic (buildConstraints, simplifyConstraints, etc.).
- AI phases: 'constraint' or 'probability'.

Task: Add CSP code showcase in sidebar.
- Update `AIPanel.tsx` to include a scrollable code block section.
- Display pseudocode or actual TypeScript snippets for CSP steps (e.g., "Build constraints from revealed cells", "Simplify via subset reduction").
- Highlight current line: Based on `aiState.phase` and history, e.g., bold or color the active step.
- Content: Line-by-line breakdown (e.g., 1. Scan board, 2. Create constraints, 3. Reduce subsets).
- Style: Dark theme; monospace font; compact (fits sidebar).
- No external libraries; use pre-formatted text or code elements.

Implementation steps:
1. Add section to AIPanel: Props include aiState; render code list with conditional highlighting.
2. Map phases to lines (e.g., 'constraint' highlights simplification steps).
3. Integrate: Append to existing layout.
4. Test: Highlights update on AI moves; code is readable.

Output: Updated AIPanel.tsx code. Ensure educational and accurate.
```

## Overall Timeline and Notes
- **Total Effort**: 20-30 hours (previous 10-16 + new 10-14).
- **Order**: Phases 1-2 first (core/demo), then 3-4 (UI polish).
- **Tools**: Assume Jest/Vitest for tests; run `npm run lint` post-implementation.
- **Validation**: All features work; no regressions. Use prompts to guide AI, then review.
- **Risks**: UI changes may require layout tweaks; tests need accurate mocks.
- **Milestones**: Phase 1-2 complete → stable demo; Phase 3-4 → polished product.