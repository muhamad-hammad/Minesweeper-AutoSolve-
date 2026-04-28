# Team Onboarding v7 - Continuation Update

This file continues from `doc/teamonboarding-v6.md` without modifying previous versions.

## 1) What Changed Since v6

Newly updated:
- `src/app/page.tsx` (homepage view, How to Play modal, view-state routing)
- `src/components/AIPanel.tsx` (CSP algorithm showcase section)

This update adds a landing experience before the game and an in-panel educational code viewer that visualises which CSP steps the AI is currently executing.

---

## 2) Homepage & How to Play (`src/app/page.tsx`)

### View-state routing

`page.tsx` now manages a `view` state (`"home" | "game"`) to conditionally render either the landing page or the game screen — no Next.js router change required. All game state is initialised on mount and persists across view switches; navigating home and back does not reset the board.

```ts
const [view, setView] = useState<"home" | "game">("home");
const [showHowToPlay, setShowHowToPlay] = useState(false);
```

### `HomePage` component

Rendered when `view === "home"`. Contains:
- Decorative mine/flag emoji icon row.
- Large gradient `Minesweeper AI` heading.
- One-paragraph description of the CSP + probability strategy.
- `Start Game →` button — sets `view` to `"game"`.
- `How to Play` button — sets `showHowToPlay` to `true`.
- Build-stack credits line at the bottom.

### `HowToPlay` component

A fixed-position modal overlay (`z-50`, `backdrop-blur-sm`) rendered when `showHowToPlay === true`. Dismissible via a `Close ✕` button. Scrollable to fit all content on small screens.

Sections inside the modal:

| Section | Content |
|---|---|
| Game Rules | Reveal safe cells, numbered adjacency, auto-expand on blanks, right-click to flag |
| Controls | Key/button reference table (left-click, right-click, R key, Run AI, Step, Stop, Reset, Speed slider) |
| How the AI Works | Constraint phase (CSP subset reduction) and Probability phase (backtracking enumeration) explanations with inline code examples |
| Difficulty | Table of all `DIFFICULTIES` entries with rows × cols and mine count |

The modal is accessible from both the homepage and the in-game header.

### In-game header update

When `view === "game"` the header row is now a `flex` row containing the title/subtitle on the left and two buttons on the right:
- `How to Play` — opens the `HowToPlay` modal without leaving the game.
- `← Home` — calls `handleStop()` to safely cancel any running AI loop, then sets `view` to `"home"`.

---

## 3) CSP Algorithm Showcase (`src/components/AIPanel.tsx`)

A new `CSPShowcase` component is appended below the move log inside `AIPanel`. It receives `phase` and `hasHistory` as props (no additional prop drilling into `AIPanelProps` was needed — both values already existed on `aiState`).

### `CSP_LINES` data structure

An array of `CodeLine` objects describes each pseudocode line:

```ts
type CodeLine = {
  code: string;           // pseudocode token shown in the block
  comment: string;        // inline // comment shown to the right
  activeOn: Array<AIState["phase"] | "any">;  // which phase activates this line
  indent: number;         // 0–3 indent level (rendered as "  ".repeat(indent))
  group?: string;         // optional group header printed above the line
};
```

The 28 lines are divided into four labelled groups that directly mirror the real implementation in `src/lib/constraints.ts` and `src/lib/solver.ts`:

| Group | Lines | Active phase |
|---|---|---|
| Step 1 — Build Constraints | `for (cell of revealedCells)` loop collecting hidden neighbours and pushing constraints | `constraint` |
| Step 2 — Subset Reduction | `while (changed)` pair-comparison loop, `A ⊆ B → B∖A` derivation | `constraint` |
| Step 3 — Extract Certain Moves | `c.mines === 0 → reveal`, `c.mines === c.cells.size → flag` | `constraint` |
| Step 4 — Probability Fallback | `partition → backtrack → freq/totalValid → reveal argmin P` | `probability` |

### Highlighting behaviour

| State | Appearance |
|---|---|
| `phase === "idle"` or no move history | All lines neutral `text-zinc-500`; hint text shown below block |
| `phase === "constraint"` | Steps 1–3 lines: blue tint (`bg-blue-500/10`, `text-blue-100`), bold, left blue bar; Step 4 dimmed |
| `phase === "probability"` | Step 4 lines: orange tint (`bg-orange-500/10`, `text-orange-100`), bold, left orange bar; Steps 1–3 dimmed |

A phase badge (`Steps 1–3 active` or `Step 4 active`) appears in the section header when the AI is not idle.

### Layout

- Scrollable `max-h-72` container with `bg-zinc-950/80` background.
- `font-mono text-[11px]` for compact sidebar fit.
- Group headers rendered as `text-[10px] text-zinc-500` comment lines above each section.
- Inline comments right-aligned at `text-[10px]`, colour-shifted to match active phase.

---

## 4) Updated Current Structure

```
src/app/page.tsx               — view-state routing, HomePage, HowToPlay
src/components/AIPanel.tsx     — CSPShowcase, CSP_LINES data, CodeLine type
src/components/Board.tsx
src/components/Cell.tsx
src/components/StatsPanel.tsx
src/components/SessionTimeline.tsx
src/lib/constraints.ts
src/lib/minesweeper.ts
src/lib/probability.ts
src/lib/solver.ts
src/types/index.ts
doc/teamonboarding.md
doc/teamonboarding-v2.md
doc/teamonboarding-v3.md
doc/teamonboarding-v4.md
doc/teamonboarding-v5.md
doc/teamonboarding-v6.md
doc/teamonboarding-v7.md
```

---

## 5) Validation

After these updates:
- `npx tsc --noEmit` passes with zero errors.
- `npm run lint` passes with no ESLint warnings or errors.

Automated tests are still pending.

---

## 6) Suggested Next Step

Recommended next improvements:
- Add unit tests for `CSP_LINES` phase mapping (assert correct `activeOn` tags).
- Add regression test: navigating home and back preserves `aiState.moveHistory`.
- Consider extracting `HowToPlay` and `HomePage` to `src/components/` as the file grows.
- Wire `SessionTimeline` data into the How to Play modal's AI explanation section for live context.
