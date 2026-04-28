# Minesweeper AutoSolve

An interactive Minesweeper game with a built-in AI solver, built with Next.js 14, React 18, TypeScript, and Tailwind CSS.

## Features

- **Playable Minesweeper** — three difficulty presets: Beginner (9×9), Intermediate (16×16), Expert (16×30)
- **AI Solver** — two-phase strategy:
  1. **Constraint solving** — derives certain moves (safe reveals and definite mines) from numbered cell constraints via subset reduction
  2. **Probability fallback** — when no certain move exists, uses CSP enumeration to pick the lowest-probability mine cell to reveal (or flags cells above 85% mine probability)
- **Real-time AI debug panel** — shows current phase, constraint count, move confidence, and a scrollable move history log
- **Session timeline** — visual history of game events per session
- **Adjustable speed** — control AI step interval from 100 ms to 2000 ms
- **Step mode** — advance the AI one move at a time for inspection
- **Safe first move** — board is generated after the first click to guarantee a non-mine start

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS |
| Animations | Framer Motion |
| Language | TypeScript 5 |
| Testing | Jest + ts-jest |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/            # Next.js App Router pages and layout
├── components/
│   ├── Board.tsx         # Minesweeper grid rendering
│   ├── Cell.tsx          # Individual cell with state/animation
│   ├── AIPanel.tsx       # AI controls and move log console
│   ├── StatsPanel.tsx    # Live game stats display
│   └── SessionTimeline.tsx
├── lib/
│   ├── minesweeper.ts    # Board generation and game logic
│   ├── solver.ts         # AI entry point (getNextMove, applyMove)
│   ├── constraints.ts    # Constraint building and subset reduction
│   └── probability.ts    # CSP-based mine probability estimation
└── types/index.ts        # Shared types and difficulty presets
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
npm test         # Jest test suite
```
